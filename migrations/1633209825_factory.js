let Factory = artifacts.require('Factory');

module.exports = function(_deployer) {
    _deployer.deploy(Factory);
};
