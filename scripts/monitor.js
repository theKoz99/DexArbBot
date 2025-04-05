// scripts/monitor.js
const CONTRACT_ADDRESS = process.env.DEPLOYED_CONTRACT;
const ABI = require("./artifacts/contracts/ArbitrageV1.sol/CrossDEXArbitrage.json").abi;
const prom = require('prom-client');
const express = require('express');
const app = express();

// Initialize ethers provider
const provider = new ethers.providers.WebSocketProvider(process.env.ARB_ALCHEMY_WS);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

const profitGauge = new prom.Gauge({
    name: 'arb_bot_profit_usd',
    help: 'Total profit generated in USD',
  });

  // Endpoint for Prometheus to scrape metrics
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', prom.register.contentType);
    res.end(await prom.register.metrics());
  });
  
  app.listen(8000, () => {
    console.log('Metrics server running on port 8000');
  });