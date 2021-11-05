const fs = require("fs");
const DMNK = artifacts.require("DMNK");


const { getAddress } = require("@harmony-js/crypto");
const web3 = require('web3');


module.exports = function (deployer, network, accounts) {
    return deployer.deploy(DMNK).then(function () {
        // Dump needful information to file
        fs.writeFileSync(
            "./build/info.json",
            JSON.stringify({
                address: getAddress(DMNK.address).raw,
                network: network,
            })
        )
    });
}
