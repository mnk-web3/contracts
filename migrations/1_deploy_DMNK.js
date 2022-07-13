const fs = require("fs");

const DMNK = artifacts.require("DMNK");
const { getAddress } = require("@harmony-js/crypto");

module.exports = function (deployer, network, _) {
  return deployer.deploy(DMNK).then(function () {
    // Dump needful information to file
    const infoArtifact = JSON.stringify({
      address: getAddress(DMNK.address).raw,
      network: network,
    });
    // // Need this file for pytest suit
    // fs.writeFileSync("./build/info.json", infoArtifact);

    // // Syncing deploy info artifact to the UI src
    // fs.writeFileSync(
    //   "./src/artifacts/deployInfoDMNK.ts",
    //   "export const deployInfo = " + infoArtifact
    // );

    // // Syncing DMNK's build info artifact to the UI src
    // fs.writeFileSync(
    //   "./src/artifacts/buildInfoDMNK.ts",
    //   "export const buildInfo = " +
    //     fs.readFileSync("./build/contracts/DMNK.json")
    // );

    // // Syncing DMNK's build info artifact to the UI src
    // fs.writeFileSync(
    //   "./src/artifacts/buildInfoGameInstance.ts",
    //   "export const buildInfo = " +
    //     fs.readFileSync("./build/contracts/GameInstance.json")
    // );
  });
};
