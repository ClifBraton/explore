// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title KeyNFT
 * @notice Demo ERC721 NFT for TokenGatedSecret
 * @dev Anyone can mint, on-chain metadata
 */
contract KeyNFT is ERC721 {
    using Strings for uint256;

    uint256 private _tokenIdCounter;
    string public constant IMAGE_CID = "bafkreietvhjzawzy7hmi2aypbbf5e57puywf62bsz3w3wswwpnysl6svzq";

    event Minted(address indexed to, uint256 indexed tokenId);

    constructor() ERC721("Key NFT", "KNFT") {}

    /**
     * @notice Mint NFT to caller
     */
    function mint() external returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _mint(msg.sender, tokenId);
        emit Minted(msg.sender, tokenId);
        return tokenId;
    }

    /**
     * @notice Mint NFT to specified address
     */
    function mintTo(address to) external returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _mint(to, tokenId);
        emit Minted(to, tokenId);
        return tokenId;
    }

    /**
     * @notice Get total minted count
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @notice On-chain metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory json = string(
            abi.encodePacked(
                '{"name":"Key NFT #',
                tokenId.toString(),
                '","description":"Access key for TokenGatedSecret","image":"ipfs://',
                IMAGE_CID,
                '","attributes":[{"trait_type":"Type","value":"Access Key"}]}'
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }
}
