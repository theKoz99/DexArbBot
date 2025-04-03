// scripts/monitor.js
const CONTRACT_ADDRESS = process.env.DEPLOYED_CONTRACT;
const ABI = require("./artifacts/contracts/ArbitrageV1.sol/CrossDEXArbitrage.json").abi;

// Initialize ethers provider
const provider = new ethers.providers.WebSocketProvider(process.env.ARB_ALCHEMY_WS);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
