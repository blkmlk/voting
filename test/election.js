const { ethers } = require("hardhat");
const { assert } = require("chai");

describe("election", function () {
  let accounts;
  let contract;

  before(async function () {
    accounts = await ethers.getSigners();

    const Election = await ethers.getContractFactory("Election");
    contract = await Election.connect(accounts[0]).deploy(accounts[0].address, 'Test Election');
    await contract.deployed();
  })

  it("should find onwer", async () => {
      let info = await contract.getInfo();
      assert.equal(info.owner, accounts[0].address);
  });

  it("should create candidate", async () => {
    let info = await contract.getInfo();
    assert.equal(info.candidates.length, 0);

    await contract.connect(accounts[0]).addCandidates([
      {
        name: "Name",
        surname: "Surname",
        imageValue: "image value",
        votes: 0,
        active: true,
      }
    ]);

    info = await contract.getInfo();
    assert.equal(info.candidates.length, 1);
  });

  it("should vote and retract", async () => {
      await contract.start(10*60);
      await contract.connect(accounts[0]).vote(0);

      let vote = await contract.connect(accounts[0]).getVote();
      assert.equal(vote.candidateID, 0);
      assert.equal(vote.exists, true);

      await contract.connect(accounts[0]).retract();
  })
});
