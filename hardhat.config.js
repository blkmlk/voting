require("@nomiclabs/hardhat-ethers");
require("@atixlabs/hardhat-time-n-mine");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.0",
  networks: {
    hardhat: {
      chainId: 1337
    },
  }
};
