const FavNumber = artifacts.require("FavNumber");


const { getAddress } = require("@harmony-js/crypto");
const web3 = require('web3');


module.exports = function (deployer, network, accounts) {
    return deployer.deploy(FavNumber, 114).then(function () {
      console.log(`FavNumber address: ${FavNumber.address} : ${getAddress(FavNumber.address).bech32}\n`);
      console.log(`   export NETWORK=${network}; export FavNumber=${FavNumber.address}\n`);
    });
}
