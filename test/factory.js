const factory = artifacts.require("Factory");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("factory", function (accounts) {
  it("should assert true", async function () {
    await factory.deployed();
    return assert.isTrue(true);
  });

  it("should create election", function () {
    let f;

    factory.deployed().then(instance => {
      f = instance;
      return instance.createElection(accounts[0], "test");
    }).then(function () {
      return f.getElections.call();
    }).then(elections => {
      assert.equal(1, elections.length);
      elections[0].getInfo.call().then(function (info) {
        assert.equal('test', info.name);
      })
    })
  })
});
