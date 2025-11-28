// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title KeyToken
 * @notice Demo ERC20 token for TokenGatedSecret
 * @dev Anyone can mint, no restrictions
 */
contract KeyToken is ERC20 {
    uint256 public constant MINT_AMOUNT = 1000 * 10 ** 18; // 每次 mint 1000 个

    event Minted(address indexed to, uint256 amount);

    constructor() ERC20("Key Token", "KEY") {}

    /**
     * @notice Mint tokens to caller
     */
    function mint() external {
        _mint(msg.sender, MINT_AMOUNT);
        emit Minted(msg.sender, MINT_AMOUNT);
    }

    /**
     * @notice Mint tokens to specified address
     */
    function mintTo(address to) external {
        _mint(to, MINT_AMOUNT);
        emit Minted(to, MINT_AMOUNT);
    }

    /**
     * @notice Mint custom amount (for testing)
     */
    function mintAmount(address to, uint256 amount) external {
        _mint(to, amount);
        emit Minted(to, amount);
    }
}
