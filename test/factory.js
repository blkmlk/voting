const { ethers } = require("hardhat");
const { assert } = require("chai");

describe("Factory", function () {
  let accounts;
  let electionFactory, rpsFactory;

  before(async function () {
    accounts = await ethers.getSigners();

    const ElectionFactory = await ethers.getContractFactory("ElectionFactory");
    electionFactory = await ElectionFactory.connect(accounts[0]).deploy();
    await electionFactory.deployed();

    const RPSFactory = await ethers.getContractFactory("RockPaperScissorsFactory");
    rpsFactory = await RPSFactory.connect(accounts[0]).deploy();
    await rpsFactory.deployed();
  });

  it("should create election", async () => {
      await electionFactory.createElection("test");

      let elections = await electionFactory.getElections();
      assert.equal(1, elections.length);

      let el = await ethers.getContractAt('Election', elections[0])
      let info = await el.getInfo();
      assert.equal('test', info.name);
  });

  it("should create RPS", async () => {
      await rpsFactory.createRPS("test", {value: 100});

      let rpsList = await rpsFactory.getRPS();
      assert.equal(1, rpsList.length);

      let rps = await ethers.getContractAt('RockPaperScissors', rpsList[0])
      let info = await rps.getInfo();
      assert.equal('test', info.name);
  })
});
