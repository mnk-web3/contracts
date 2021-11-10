const fs = require("fs");
const DMNK = artifacts.require("DMNK");

const { getAddress } = require("@harmony-js/crypto");
const web3 = require("web3");

module.exports = function (deployer, network, accounts) {
  return deployer.deploy(DMNK).then(function () {
    // Dump needful information to file
    fs.writeFileSync(
      "./build/info.json",
      JSON.stringify({
        address: getAddress(DMNK.address).raw,
        network: network,
      })
    );
    fs.copyFile("./build/info.json", "./public/info.json", (err) => {
      if (err) throw err;
      console.log("Error: failed to copy info.json file.");
    });
    fs.copyFile("./build/contracts/DMNK.json", "./public/DMNK.json", (err) => {
      if (err) throw err;
      console.log("Error: failed to copy DMNK.json file.");
    });
    fs.copyFile(
      "./build/contracts/GameInstance.json",
      "./public/GameInstance.json",
      (err) => {
        if (err) throw err;
        console.log("Error: failed to copy GameInstance.json file.");
      }
    );
  });
};
