const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
  networks: {
    anynet: {
      gasPrice: process.env.GASPRICE,
      gas: process.env.GASLIMIT,
      from: process.env.DEPLOYER_PUB,
      network_id: process.env.NETWORK_ID,
      provider: () => 
        new HDWalletProvider({
          privateKeys: [process.env.DEPLOYER_PRIV],
          providerOrUrl: process.env.PROVIDER_HOST + ":" + process.env.PROVIDER_PORT,
          chainId: process.env.CHAIN_ID,
        }),
    },
  },
  compilers: {
    solc: {
      version: "0.8.15",
      settings: {
        optimizer: {
            enabled: true,
            runs: 200
        },
      }
    },
  },
};
