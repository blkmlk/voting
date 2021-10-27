const Crowdfunding = artifacts.require("Crowdfunding");
const timeMachine = require('ganache-time-traveler');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

contract("crowdfunding", function (accounts) {
  beforeEach(async function () {
    await timeMachine.advanceTimeAndBlock(10);
  });

  let contract;
  it("should be deployed", async function () {
    await Crowdfunding.deployed().then(instance => {
      contract = instance;
    });
  });

  it("should return info", function () {
    return contract.getInfo.call().then(info => {
      assert.equal(info.owner, accounts[0]);
      assert.equal(info.targetAmount, web3.utils.toWei('0.5', 'ether'));
      assert.equal(info.target, accounts[5]);
    })
  });

  it("should reject start", async function () {
    let counter = 0;
    await contract.start(60, {from: accounts[1]}).catch(exp => {
      counter++;
      assert.match(exp.toString(), /CF: wrong address/);
    })

    await contract.start(0, {from: accounts[0]}).catch(exp => {
      counter++;
      assert.match(exp.toString(), /CF: wrong duration/);
    })

    assert.equal(counter, 2);
  })

  it("should reject donation: not started", async function () {
    await contract.donate({from: accounts[0], value: 50}).catch(exp => {
      assert.match(exp.toString(), /CF: not started/);
    })
  })

  it("should start", function () {
    return contract.start(3600, {from: accounts[0]}).catch(exp => {
      assert.isTrue(false, exp.toString());
    })
  })

  it("should be started", function () {
    return contract.getInfo.call().then(info => {
      assert.isTrue(info.expiresAt > 0);
    })
  });

  it("should reject donation: wrong address", async function () {
    await contract.donate("test", {from: accounts[5], value: 50}).catch(exp => {
      assert.match(exp.toString(), /CF: wrong address/);
    })
  })

  it("should donate", async function () {
    let value = web3.utils.toWei('0.1', 'ether');
    await contract.donate("test", {from: accounts[0], value: value}).catch(exp => {
      assert.isTrue(false, exp.toString());
    })
  })

  it("should reject donation: wrong address", async function () {
    await contract.donate("test", {from: accounts[0], value: 50}).catch(exp => {
      assert.match(exp.toString(), /CF: already donated/);
    })
  })

  it("should donate with rebate", async function () {
    let value = web3.utils.toWei('1', 'ether');
    let before = await web3.eth.getBalance(accounts[1]);

    await contract.donate("test", {from: accounts[1], value: value}).catch(exp => {
      assert.isTrue(false, exp.toString());
    })
    let after = await web3.eth.getBalance(accounts[1]);

    assert.isTrue(after > before - value)
  })

  it("should be ended", async function () {
    let info = await contract.getInfo.call();
    assert.equal(info.ended, true);
  })

  it("should return donation", async function () {
    let donation = await contract.getDonation.call({from: accounts[1]});
    assert.equal(donation.amount, web3.utils.toWei('0.4', 'ether'))
  })

  it("should reject withdraw", async function () {
    await contract.withdraw({from: accounts[0]}).catch(exp => {
      assert.match(exp.toString(), /CF: amount is collected/);
    })
  })

  it("should withdraw", async function () {
    let before = await web3.eth.getBalance(accounts[5]);

    await contract.withdraw({from: accounts[5]}).catch(exp => {
      assert.isTrue(false, exp.toString());
    })

    let after = await web3.eth.getBalance(accounts[5]);
    assert.isTrue(parseInt(after) > parseInt(before));
  })

  it("should reject donate", async function () {
    let value = web3.utils.toWei('0.1', 'ether');
    await contract.donate("test", {from: accounts[2], value: value}).catch(exp => {
      assert.match(exp.toString(), /CF: amount is collected/);
    })
  })
});
