const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

// Metrics data
let metrics = {
    arbitrageOpportunities: 0,
    executedArbitrages: 0,
    failedArbitrages: 0,
    totalProfit: 0,
    lastProfit: 0,
    lastExecutionTime: 0
};

// Parse log file to extract metrics
function updateMetricsFromLogs() {
    try {
        const logFile = path.join(__dirname, 'logs', 'bot.log');
        if (fs.existsSync(logFile)) {
            const logs = fs.readFileSync(logFile, 'utf8').split('\n');
            
            // Reset counters
            metrics.arbitrageOpportunities = 0;
            metrics.executedArbitrages = 0;
            metrics.failedArbitrages = 0;
            
            logs.forEach(log => {
                if (log.includes('Arbitrage opportunity found')) {
                    metrics.arbitrageOpportunities++;
                }
                if (log.includes('Arbitrage executed successfully')) {
                    metrics.executedArbitrages++;
                    metrics.lastExecutionTime = Date.now();
                }
                if (log.includes('Error in monitoring loop')) {
                    metrics.failedArbitrages++;
                }
                
                // Extract profit information
                if (log.includes('Net profit:')) {
                    const profitMatch = log.match(/Net profit: ([\d.]+) ETH/);
                    if (profitMatch && profitMatch[1]) {
                        const profit = parseFloat(profitMatch[1]);
                        metrics.lastProfit = profit;
                        metrics.totalProfit += profit;
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error updating metrics from logs:', error);
    }
}

// Update metrics every minute
setInterval(updateMetricsFromLogs, 60000);
updateMetricsFromLogs(); // Initial update

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
    updateMetricsFromLogs(); // Update on each request
    
    const prometheusMetrics = [
        '# HELP arbitrage_opportunities_total Total number of arbitrage opportunities found',
        '# TYPE arbitrage_opportunities_total counter',
        `arbitrage_opportunities_total ${metrics.arbitrageOpportunities}`,
        
        '# HELP arbitrage_executed_total Total number of executed arbitrages',
        '# TYPE arbitrage_executed_total counter',
        `arbitrage_executed_total ${metrics.executedArbitrages}`,
        
        '# HELP arbitrage_failed_total Total number of failed arbitrages',
        '# TYPE arbitrage_failed_total counter',
        `arbitrage_failed_total ${metrics.failedArbitrages}`,
        
        '# HELP arbitrage_total_profit_eth Total profit in ETH',
        '# TYPE arbitrage_total_profit_eth gauge',
        `arbitrage_total_profit_eth ${metrics.totalProfit}`,
        
        '# HELP arbitrage_last_profit_eth Last arbitrage profit in ETH',
        '# TYPE arbitrage_last_profit_eth gauge',
        `arbitrage_last_profit_eth ${metrics.lastProfit}`,
        
        '# HELP arbitrage_last_execution_timestamp Timestamp of last successful execution',
        '# TYPE arbitrage_last_execution_timestamp gauge',
        `arbitrage_last_execution_timestamp ${metrics.lastExecutionTime}`
    ].join('\n');
    
    res.set('Content-Type', 'text/plain');
    res.send(prometheusMetrics);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(`Metrics server listening on port ${PORT}`);
});
