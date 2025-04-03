const { ethers } = require("hardhat");

async function main() {
    try {
        const [sender] = await ethers.getSigners();
        const recipient = process.env.DEPLOYED_CONTRACT;
        const amount = ethers.parseEther("0.01");

        // Validate recipient address format
        if (!ethers.isAddress(recipient)) {
            throw new Error(`Invalid recipient address: ${recipient}`);
        }

        // Check sender balance
        const balance = await ethers.provider.getBalance(sender.address);
        console.log(`Sender balance: ${ethers.formatEther(balance)} ETH`);
        
        // Get current gas data
        const feeData = await ethers.provider.getFeeData();
        const gasPrice = feeData.gasPrice;
        
        if (!gasPrice) {
            throw new Error("Failed to fetch gas price");
        }

        // Estimate transaction cost
        const gasEstimate = await ethers.provider.estimateGas({
            from: sender.address,
            to: recipient,
            value: amount
        });

        const totalCost = gasEstimate * gasPrice + amount;
        
        // Validate sufficient funds
        if (balance < totalCost) {
            throw new Error(`Insufficient funds. Needed ${ethers.formatEther(totalCost)} ETH`);
        }

        // Execute transaction
        console.log(`Sending ${ethers.formatEther(amount)} ETH...`);
        const tx = await sender.sendTransaction({
            to: recipient,
            value: amount,
            gasPrice: gasPrice,
            gasLimit: gasEstimate
        });

        console.log(`Transaction hash: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`Confirmed in block ${receipt.blockNumber}`);
    } catch (error) {
        console.error("Transaction failed:", error.message);
        process.exit(1);
    }
}

main();
