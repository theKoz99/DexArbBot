require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");  
require("dotenv").config();

module.exports = {
  solidity: "0.8.17",
  networks: {
    arbitrum: {
      url: process.env.ARB_ALCHEMY_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: process.env.ARBISCAN_KEY
  }
};