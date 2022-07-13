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
    fs.writeFileSync("./build/info.json", infoArtifact);
  });
};
