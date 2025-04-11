// scripts/bot.js
require('dotenv').config();
const { ethers } = require("hardhat");
const RiskManager = require('./RiskManager');
const fs = require('fs');
const path = require('path');

// Initialize risk manager
const riskManager = new RiskManager({
    maxPositionSize: process.env.MAX_POSITION_SIZE || 5,
    maxDailyLoss: process.env.MAX_DAILY_LOSS || 1,
    slippageTolerance: process.env.SLIPPAGE_TOLERANCE || 50
});

// Token addresses (example)
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

// DEX addresses
const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const SUSHISWAP_ROUTER = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";

// AAVE Lending Pool address
const LENDING_POOL_ADDRESS = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9";

// Flash loan parameters
const FLASH_LOAN_FEE = process.env.FLASH_LOAN_FEE || 0.0009; // 0.09%

// Setup logging
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

function logToFile(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(path.join(logDir, 'bot.log'), logMessage);
    console.log(message);
}

async function calculateOptimalGasPrice() {
    const gasPrice = await ethers.provider.getGasPrice();
    return gasPrice.mul(110).div(100); // 10% higher than current gas price for faster confirmation
}

async function main() {
    try {
        logToFile("Starting DEX arbitrage bot...");
        
        // Get signer
        const [deployer] = await ethers.getSigners();
        logToFile(`Using account: ${deployer.address}`);
        
        // Deploy flash loan arbitrage contract if not already deployed
        logToFile("Deploying FlashLoanArbitrage contract...");
        const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
        const flashLoanArbitrage = await FlashLoanArbitrage.deploy(LENDING_POOL_ADDRESS);
        await flashLoanArbitrage.deployed();
        logToFile(`FlashLoanArbitrage deployed to: ${flashLoanArbitrage.address}`);
        
        // Start monitoring for arbitrage opportunities
        await monitorArbitrageOpportunities(flashLoanArbitrage, deployer);
    } catch (error) {
        logToFile(`Error in main function: ${error.message}`);
        console.error(error);
    }
}

async function monitorArbitrageOpportunities(flashLoanArbitrage, deployer) {
    logToFile("Monitoring for arbitrage opportunities...");
    
    // Set up token contracts
    const weth = await ethers.getContractAt("IERC20", WETH);
    const dai = await ethers.getContractAt("IERC20", DAI);
    const usdc = await ethers.getContractAt("IERC20", USDC);
    
    // Set up router contracts
    const uniswapRouter = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_ROUTER);
    const sushiswapRouter = await ethers.getContractAt("IUniswapV2Router02", SUSHISWAP_ROUTER);
    
    // Monitor loop
    while (true) {
        try {
            // Check for arbitrage opportunities
            const opportunity = await findArbitrageOpportunity(
                uniswapRouter,
                sushiswapRouter,
                [WETH, DAI],
                ethers.utils.parseEther("10") // 10 ETH flash loan amount
            );
            
            if (opportunity.netProfit > 0) {
                logArbitrageOpportunity(opportunity);
                
                // Check if position size is within limits
                if (riskManager.checkPositionSize(ethers.utils.formatEther(opportunity.amount))) {
                    // Execute arbitrage
                    logToFile("Executing arbitrage...");
                    const tx = await flashLoanArbitrage.executeArbitrage(
                        WETH,
                        opportunity.amount,
                        {
                            gasPrice: await calculateOptimalGasPrice(),
                            gasLimit: 500000
                        }
                    );
                    
                    logToFile(`Transaction sent: ${tx.hash}`);
                    await tx.wait();
                    logToFile("Arbitrage executed successfully");
                    
                    // Record trade result
                    riskManager.recordTrade(parseFloat(opportunity.netProfit));
                } else {
                    logToFile("Position size exceeds limit, skipping arbitrage");
                }
            } else {
                logToFile("No profitable arbitrage opportunity found");
            }
            
            // Wait before next check
            await new Promise(resolve => setTimeout(resolve, 15000)); // 15 seconds
        } catch (error) {
            logToFile(`Error in monitoring loop: ${error.message}`);
            console.error(error);
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
        }
    }
}

async function findArbitrageOpportunity(uniswapRouter, sushiswapRouter, path, amount) {
    // Get prices from Uniswap
    const uniswapAmounts = await uniswapRouter.getAmountsOut(amount, path);
    const uniswapOutput = uniswapAmounts[uniswapAmounts.length - 1];
    
    // Get prices from Sushiswap
    const sushiswapAmounts = await sushiswapRouter.getAmountsOut(amount, path);
    const sushiswapOutput = sushiswapAmounts[sushiswapAmounts.length - 1];
    
    // Calculate potential profit
    let profit = ethers.BigNumber.from(0);
    let buyExchange = "";
    let sellExchange = "";
    
    if (uniswapOutput.gt(sushiswapOutput)) {
        // Buy on Sushiswap, sell on Uniswap
        profit = uniswapOutput.sub(sushiswapOutput);
        buyExchange = "Sushiswap";
        sellExchange = "Uniswap";
    } else {
        // Buy on Uniswap, sell on Sushiswap
        profit = sushiswapOutput.sub(uniswapOutput);
        buyExchange = "Uniswap";
        sellExchange = "Sushiswap";
    }
    
    // Calculate flash loan fee
    const flashLoanFee = amount.mul(Math.floor(FLASH_LOAN_FEE * 10000)).div(10000);
    
    // Calculate gas cost (estimate)
    const gasPrice = await ethers.provider.getGasPrice();
    const estimatedGas = ethers.BigNumber.from(500000); // Estimated gas used
    const gasCost = gasPrice.mul(estimatedGas);
    
    // Calculate net profit
    const netProfit = profit.sub(flashLoanFee).sub(gasCost);
    
    return {
        buyExchange,
        sellExchange,
        tokenPair: `${path[0]}-${path[1]}`,
        amount,
        expectedProfit: ethers.utils.formatEther(profit),
        flashLoanFee: ethers.utils.formatEther(flashLoanFee),
        gasCost: ethers.utils.formatEther(gasCost),
        netProfit: ethers.utils.formatEther(netProfit),
        profitableFlag: netProfit.gt(0)
    };
}

function logArbitrageOpportunity(opportunity) {
    logToFile("Arbitrage opportunity found:");
    logToFile(`  Buy from: ${opportunity.buyExchange}`);
    logToFile(`  Sell to: ${opportunity.sellExchange}`);
    logToFile(`  Token pair: ${opportunity.tokenPair}`);
    logToFile(`  Expected profit: ${opportunity.expectedProfit} ETH`);
    logToFile(`  Flash loan fee: ${opportunity.flashLoanFee} ETH`);
    logToFile(`  Gas cost: ${opportunity.gasCost} ETH`);
    logToFile(`  Net profit: ${opportunity.netProfit} ETH`);
}

// Run the bot if this file is executed directly
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { main };
