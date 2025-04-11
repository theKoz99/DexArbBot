// scripts/RiskManager.js
require('dotenv').config();

class RiskManager {
    constructor(config) {
        this.maxPositionSize = config.maxPositionSize || process.env.MAX_POSITION_SIZE || 5;
        this.maxDailyLoss = config.maxDailyLoss || process.env.MAX_DAILY_LOSS || 1;
        this.currentDailyLoss = 0;
        this.lastResetDate = new Date().setHours(0,0,0,0);
        this.slippageTolerance = config.slippageTolerance || process.env.SLIPPAGE_TOLERANCE || 50; // 0.5%
    }
    
    checkPositionSize(amount) {
        console.log(`Checking position size: ${amount} ETH (max: ${this.maxPositionSize} ETH)`);
        return amount <= this.maxPositionSize;
    }
    
    getSlippageTolerance() {
        return this.slippageTolerance;
    }
    
    recordTrade(profitLoss) {
        // Reset daily counter if it's a new day
        const today = new Date().setHours(0,0,0,0);
        if (today > this.lastResetDate) {
            console.log('Resetting daily loss counter');
            this.currentDailyLoss = 0;
            this.lastResetDate = today;
        }
        
        // Update current loss if trade was negative
        if (profitLoss < 0) {
            this.currentDailyLoss += Math.abs(profitLoss);
            console.log(`Updated daily loss: ${this.currentDailyLoss} ETH (max: ${this.maxDailyLoss} ETH)`);
        }
        
        // Check if we've exceeded daily loss limit
        const isWithinLimit = this.currentDailyLoss <= this.maxDailyLoss;
        if (!isWithinLimit) {
            console.log(`WARNING: Daily loss limit exceeded! Current: ${this.currentDailyLoss} ETH, Max: ${this.maxDailyLoss} ETH`);
        }
        return isWithinLimit;
    }
}

module.exports = RiskManager;
