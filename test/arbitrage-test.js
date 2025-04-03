const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrossDEXArbitrage", function() {
  let arbitrageContract;
  let owner;
  
  beforeEach(async function() {
    [owner] = await ethers.getSigners();
    const Arbitrage = await ethers.getContractFactory("CrossDEXArbitrage");
    arbitrageContract = await Arbitrage.deploy();
  });

  it("Should set the right owner", async function() {
    expect(await arbitrageContract.owner()).to.equal(owner.address);
  });

  it("Should prevent non-owners from withdrawing", async function() {
    const [_, nonOwner] = await ethers.getSigners();
    await expect(
      arbitrageContract.connect(nonOwner).withdrawProfits(ethers.ZeroAddress)
    ).to.be.revertedWith("Unauthorized");
  });
});
