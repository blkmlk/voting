let Crowdfunding = artifacts.require('Crowdfunding');
let Web3 = require('web3');

module.exports = function(_deployer, _network, _accounts) {
    _deployer.deploy(Crowdfunding, "test", Web3.utils.toWei('0.5', 'ether'), _accounts[5]);
};
