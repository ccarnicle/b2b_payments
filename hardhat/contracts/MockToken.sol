// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("MockToken", "MTK") {
        // Mint a large supply of tokens to the deployer
        _mint(msg.sender, 1_000_000 * 10**18);
    }
}