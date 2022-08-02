const fs = require("fs");


const Gateway = artifacts.require("Gateway");
const { getAddress } = require("@harmony-js/crypto");


module.exports = function (deployer, network, _) {
  return deployer.deploy(Gateway).then(function () {
    const infoArtifact = JSON.stringify({address: getAddress(Gateway.address).raw, network: network});
    fs.writeFileSync("./build/info.json", infoArtifact);
  });
};
