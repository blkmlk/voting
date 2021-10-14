const election = artifacts.require("Election");

contract("election", function (accounts) {
  it("should assert true", async function () {
    await election.deployed();
    return assert.isTrue(true);
  });

  it("should find onwer", () => {
    return election.deployed().then(instance => {
      return instance.getInfo.call();
    }).then(result => {
      assert.equal(result.owner, accounts[0]);
    })
  });

  it("should create candidate", () => {
    let el; 
    return election.deployed().then(instance => {
      el = instance;
      return el.getInfo.call();
    }).then(result => {
      // assert.equal(result.candidates.length, 0);
      return el.addCandidates([
        {
          name: "Name",
          surname: "Surname",
          imageValue: "image value",
          votes: 0,
          active: true,
        }
      ], {from: accounts[0]});
    }).then(result => {
      return el.getInfo.call();
    }).then(result => {
      // assert.equal(result.candidates.length, 1);
    })
  });

  it("should vote and retract", () => {
    let el;
    return election.deployed().then(instance => {
      el = instance;
      return el.start(10*60);
    }).then(result => {
      return el.vote(0, {from: accounts[0]});
    }).then(result => {
      return el.getVote.call({from:accounts[0]});
    }).then(result => {
      assert.equal(result.candidateID, 0);
      assert.equal(result.exists, true);
      return el.retract({from: accounts[0]});
    }).then(result => {
      assert.isNotNull(result);
    })
  })
});
