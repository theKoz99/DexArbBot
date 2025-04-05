// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";  // Correct for v5.x
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CrossDEXArbitrage is ReentrancyGuard {
    address public owner;
    mapping(address => bool) public allowedTokens;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Unauthorized");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    receive() external payable {}  // Allows ETH deposits

    // Main arbitrage function (implementation details TBD)
    function executeArbitrage(
        address tokenA,
        address tokenB,
        uint24 feeTier,
        uint256 amountIn
    ) external nonReentrant onlyOwner {
        // Core logic will be implemented here
    }
    
    // Security: Withdraw funds to Trezor wallet
    function withdrawProfits(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(owner, balance);
    }
}