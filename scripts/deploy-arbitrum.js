const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Arbitrage = await ethers.getContractFactory("CrossDEXArbitrage");
  const arbitrage = await Arbitrage.deploy();
  
  console.log("Contract deployed to:", await arbitrage.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});