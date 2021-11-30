const { ethers } = require("hardhat");
const { assert } = require("chai");

describe("Factory", function () {
  let accounts;
  let contract;

  before(async function () {
    accounts = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("Factory");
    contract = await Factory.connect(accounts[0]).deploy();
    await contract.deployed();
  })

  it("should create election", async () => {
      await contract.createElection("test");

      let elections = await contract.getElections();
      assert.equal(1, elections.length);

      let el = await ethers.getContractAt('IElection', elections[0])
      let info = await el.getInfo();
      assert.equal('test', info.name);
  })
});
