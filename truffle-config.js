const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
  networks: {
    localnet: {
      network_id: "1666700000",
      provider: () => 
        new HDWalletProvider({
          privateKeys: [process.env.DEPLOYER],
          providerOrUrl: "http://127.0.0.1:9000",
        }),
    },
    // testnet: {
    //   network_id: "2",
    //   provider: () => {
    //     const truffleProvider = new TruffleProvider(
    //       process.env.TESTNET_URL,
    //       {},
    //       { shardID: 0, chainId: 2 },
    //       { gasPrice: process.env.GAS_PRICE, gasLimit: "30000000" }
    //     );
    //     const newAcc = truffleProvider.addByPrivateKey(
    //       process.env.TESTNET_PRIVATE_KEY
    //     );
    //     truffleProvider.setSigner(newAcc);
    //     return truffleProvider;
    //   },
    // },
    // mainnet: {
    //   network_id: "1",
    //   provider: () => {
    //     const truffleProvider = new TruffleProvider(
    //       process.env.MAINNET_URL,
    //       {},
    //       { shardID: 0, chainId: 1 },
    //       { gasPrice: process.env.GAS_PRICE }
    //     );
    //     const newAcc = truffleProvider.addByPrivateKey(
    //       process.env.MAINNET_PRIVATE_KEY
    //     );
    //     truffleProvider.setSigner(newAcc);
    //     return truffleProvider;
    //   },
    // },
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.15", // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      // settings: {          // See the solidity docs for advice about optimization and evmVersion
      //  optimizer: {
      //    enabled: false,
      //    runs: 200
      //  },
      //  evmVersion: "byzantium"
      // }
    },
  },
};
