const { FlashbotsBundleProvider } = require("@flashbots/ethers-provider-bundle");

const express = require('express');
const app = express();
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.end(await prom.register.metrics());
});
app.listen(8000);

async function executeSafeArbitrage() {
  const flashbotsProvider = await FlashbotsBundleProvider.create(
    ethers.provider,
    ethers.Wallet.createRandom(),
    "https://relay.flashbots.net"
  );
  
  const bundle = [
    {
      transaction: {
        to: "0xYourContractAddress",
        data: "0x...", // Encoded arbitrage call
        gasLimit: 500000
      },
      signer: deployer
    }
  ];

  const signedBundle = await flashbotsProvider.signBundle(bundle);
  const simulation = await flashbotsProvider.simulate(signedBundle, "latest");
  
  if (simulation.success) {
    await flashbotsProvider.sendRawBundle(signedBundle, "latest");
  }
}
