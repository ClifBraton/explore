// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint64, euint256, externalEuint64, externalEuint256} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TokenGatedSecret
 * @notice Encrypted content that can only be accessed by NFT/Token holders
 * @dev Access control based on NFT or ERC20 token holdings
 */
contract TokenGatedSecret is ZamaEthereumConfig {
    // Gate types
    enum GateType {
        NFT_ANY, // Must hold any NFT from collection
        NFT_SPECIFIC, // Must hold specific tokenId
        ERC20_MIN // Must hold minimum ERC20 balance
    }

    struct Secret {
        string title; // Public title
        euint64 secretValue; // Encrypted secret number
        euint256 secretData; // Encrypted secret data
        address gateContract; // NFT or ERC20 contract address
        GateType gateType;
        uint256 gateParam; // tokenId (NFT_SPECIFIC) or minBalance (ERC20_MIN)
        address creator;
        bool exists;
    }

    uint256 private _secretIdCounter;
    mapping(uint256 => Secret) private _secrets;
    mapping(uint256 => mapping(address => bool)) public permanentAccess;

    event SecretCreated(uint256 indexed secretId, string title, address indexed creator, GateType gateType);
    event AccessGranted(uint256 indexed secretId, address indexed user, bool permanent);
    event SecretUpdated(uint256 indexed secretId);

    error SecretNotFound();
    error NotAuthorized();
    error GateRequirementNotMet();
    error InvalidGateContract();

    /**
     * @notice Create a new gated secret
     * @param title Public title for the secret
     * @param secretValue Encrypted secret value (euint64)
     * @param secretData Encrypted secret data (euint256)
     * @param gateContract NFT or ERC20 contract address
     * @param gateType Type of gate (NFT_ANY, NFT_SPECIFIC, ERC20_MIN)
     * @param gateParam tokenId or minBalance depending on gateType
     * @param inputProof FHE input proof
     */
    function createSecret(
        string calldata title,
        externalEuint64 secretValue,
        externalEuint256 secretData,
        address gateContract,
        GateType gateType,
        uint256 gateParam,
        bytes calldata inputProof
    ) external returns (uint256) {
        require(gateContract != address(0), InvalidGateContract());
        require(bytes(title).length > 0, "Title required");

        uint256 secretId = _secretIdCounter++;
        Secret storage secret = _secrets[secretId];

        secret.title = title;
        secret.secretValue = FHE.fromExternal(secretValue, inputProof);
        secret.secretData = FHE.fromExternal(secretData, inputProof);
        secret.gateContract = gateContract;
        secret.gateType = gateType;
        secret.gateParam = gateParam;
        secret.creator = msg.sender;
        secret.exists = true;

        // Allow contract to operate on ciphertexts
        FHE.allowThis(secret.secretValue);
        FHE.allowThis(secret.secretData);

        // Allow creator permanent access
        FHE.allow(secret.secretValue, msg.sender);
        FHE.allow(secret.secretData, msg.sender);
        permanentAccess[secretId][msg.sender] = true;

        emit SecretCreated(secretId, title, msg.sender, gateType);
        return secretId;
    }

    /**
     * @notice Check if user meets gate requirements
     */
    function meetsGateRequirement(uint256 secretId, address user) public view returns (bool) {
        Secret storage secret = _secrets[secretId];
        require(secret.exists, SecretNotFound());

        if (secret.gateType == GateType.NFT_ANY) {
            return IERC721(secret.gateContract).balanceOf(user) > 0;
        } else if (secret.gateType == GateType.NFT_SPECIFIC) {
            return IERC721(secret.gateContract).ownerOf(secret.gateParam) == user;
        } else if (secret.gateType == GateType.ERC20_MIN) {
            return IERC20(secret.gateContract).balanceOf(user) >= secret.gateParam;
        }
        return false;
    }

    /**
     * @notice Request temporary access (valid for current transaction only)
     * @dev Uses allowTransient - access revoked after tx ends
     */
    function requestTransientAccess(uint256 secretId) external {
        Secret storage secret = _secrets[secretId];
        require(secret.exists, SecretNotFound());
        require(meetsGateRequirement(secretId, msg.sender), GateRequirementNotMet());

        FHE.allowTransient(secret.secretValue, msg.sender);
        FHE.allowTransient(secret.secretData, msg.sender);

        emit AccessGranted(secretId, msg.sender, false);
    }

    /**
     * @notice Request permanent access (persists across transactions)
     * @dev Uses allow - once granted, access cannot be revoked (FHEVM limitation)
     */
    function requestPermanentAccess(uint256 secretId) external {
        Secret storage secret = _secrets[secretId];
        require(secret.exists, SecretNotFound());
        require(meetsGateRequirement(secretId, msg.sender), GateRequirementNotMet());

        FHE.allow(secret.secretValue, msg.sender);
        FHE.allow(secret.secretData, msg.sender);
        permanentAccess[secretId][msg.sender] = true;

        emit AccessGranted(secretId, msg.sender, true);
    }

    /**
     * @notice Get encrypted handles (strict mode)
     * @dev Caller must ALWAYS meet gate requirements, even with permanent access
     */
    function getSecretHandles(uint256 secretId) external view returns (bytes32 valueHandle, bytes32 dataHandle) {
        Secret storage secret = _secrets[secretId];
        require(secret.exists, SecretNotFound());
        require(meetsGateRequirement(secretId, msg.sender), GateRequirementNotMet());

        return (euint64.unwrap(secret.secretValue), euint256.unwrap(secret.secretData));
    }

    /**
     * @notice Get public info about a secret
     */
    function getSecretInfo(
        uint256 secretId
    )
        external
        view
        returns (
            string memory title,
            address gateContract,
            GateType gateType,
            uint256 gateParam,
            address creator,
            bool exists
        )
    {
        Secret storage secret = _secrets[secretId];
        return (secret.title, secret.gateContract, secret.gateType, secret.gateParam, secret.creator, secret.exists);
    }

    /**
     * @notice Update gate requirements (creator only)
     */
    function updateGate(uint256 secretId, address gateContract, GateType gateType, uint256 gateParam) external {
        Secret storage secret = _secrets[secretId];
        require(secret.exists, SecretNotFound());
        require(secret.creator == msg.sender, NotAuthorized());
        require(gateContract != address(0), InvalidGateContract());

        secret.gateContract = gateContract;
        secret.gateType = gateType;
        secret.gateParam = gateParam;

        emit SecretUpdated(secretId);
    }

    /**
     * @notice Update secret content (creator only)
     */
    function updateSecret(
        uint256 secretId,
        externalEuint64 secretValue,
        externalEuint256 secretData,
        bytes calldata inputProof
    ) external {
        Secret storage secret = _secrets[secretId];
        require(secret.exists, SecretNotFound());
        require(secret.creator == msg.sender, NotAuthorized());

        secret.secretValue = FHE.fromExternal(secretValue, inputProof);
        secret.secretData = FHE.fromExternal(secretData, inputProof);

        FHE.allowThis(secret.secretValue);
        FHE.allowThis(secret.secretData);
        FHE.allow(secret.secretValue, msg.sender);
        FHE.allow(secret.secretData, msg.sender);

        // Re-authorize users with permanent access
        // Note: In production, consider storing authorized users list

        emit SecretUpdated(secretId);
    }

    /**
     * @notice Check if user has access to secret
     */
    function hasAccess(uint256 secretId, address user) external view returns (bool) {
        if (!_secrets[secretId].exists) return false;
        // Permanent access (creator or authorized users)
        if (permanentAccess[secretId][user]) return true;
        // Gate requirement check
        return meetsGateRequirement(secretId, user);
    }

    /**
     * @notice Get total secrets count
     */
    function getSecretsCount() external view returns (uint256) {
        return _secretIdCounter;
    }

    /**
     * @notice Public info struct for returning secret metadata
     */
    struct SecretPublicInfo {
        uint256 secretId;
        string title;
        address gateContract;
        GateType gateType;
        uint256 gateParam;
        address creator;
    }

    /**
     * @notice Get all secrets public info (anyone can call)
     * @return Array of all secrets with their gate requirements
     */
    function getAllSecrets() external view returns (SecretPublicInfo[] memory) {
        uint256 count = _secretIdCounter;
        SecretPublicInfo[] memory result = new SecretPublicInfo[](count);

        for (uint256 i = 0; i < count; i++) {
            Secret storage secret = _secrets[i];
            if (secret.exists) {
                result[i] = SecretPublicInfo({
                    secretId: i,
                    title: secret.title,
                    gateContract: secret.gateContract,
                    gateType: secret.gateType,
                    gateParam: secret.gateParam,
                    creator: secret.creator
                });
            }
        }
        return result;
    }

    /**
     * @notice Get secrets by creator
     * @param creator Address of the creator
     * @return Array of secrets created by the specified address
     */
    function getSecretsByCreator(address creator) external view returns (SecretPublicInfo[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < _secretIdCounter; i++) {
            if (_secrets[i].exists && _secrets[i].creator == creator) {
                count++;
            }
        }

        SecretPublicInfo[] memory result = new SecretPublicInfo[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < _secretIdCounter; i++) {
            Secret storage secret = _secrets[i];
            if (secret.exists && secret.creator == creator) {
                result[idx++] = SecretPublicInfo({
                    secretId: i,
                    title: secret.title,
                    gateContract: secret.gateContract,
                    gateType: secret.gateType,
                    gateParam: secret.gateParam,
                    creator: secret.creator
                });
            }
        }
        return result;
    }

    /**
     * @notice Get secrets by gate contract (find all secrets requiring specific token/NFT)
     * @param gateContract The token or NFT contract address
     * @return Array of secrets gated by the specified contract
     */
    function getSecretsByGateContract(address gateContract) external view returns (SecretPublicInfo[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < _secretIdCounter; i++) {
            if (_secrets[i].exists && _secrets[i].gateContract == gateContract) {
                count++;
            }
        }

        SecretPublicInfo[] memory result = new SecretPublicInfo[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < _secretIdCounter; i++) {
            Secret storage secret = _secrets[i];
            if (secret.exists && secret.gateContract == gateContract) {
                result[idx++] = SecretPublicInfo({
                    secretId: i,
                    title: secret.title,
                    gateContract: secret.gateContract,
                    gateType: secret.gateType,
                    gateParam: secret.gateParam,
                    creator: secret.creator
                });
            }
        }
        return result;
    }
}
