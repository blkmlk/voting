const { ethers, timeAndMine} = require("hardhat");
const { assert } = require("chai");

describe("Crowdfunding", function () {
  let accounts;
  let contract;

  before(async function() {
    await timeAndMine.mine(1);
    accounts = await ethers.getSigners();

    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    contract = await Crowdfunding.connect(accounts[0]).deploy(
        accounts[0].address,
        "test",
        "test description",
        ethers.utils.parseEther('0.5').toString(),
        accounts[5].address
    );
    await contract.deployed();
  });

  it("should return info", function () {
    return contract.getInfo().then(info => {

      assert.equal(info.owner, accounts[0].address);
      assert.equal(info.targetAmount.toString(), ethers.utils.parseEther('0.5').toString());
      assert.equal(info.target, accounts[5].address);
    })
  });

  it("should reject start", async function () {
    let counter = 0;
    await contract.connect(accounts[1]).start(60).catch(exp => {
      counter++;
      assert.match(exp.toString(), /CF: wrong address/);
    })

    await contract.connect(accounts[0]).start(0).catch(exp => {
      counter++;
      assert.match(exp.toString(), /CF: wrong duration/);
    })

    assert.equal(counter, 2);
  })

  it("should reject donation: not started", async function () {
    await contract.connect(accounts[0]).donate({value: 50}).catch(exp => {
      assert.match(exp.toString(), /CF: not started/);
    })
  })

  it("should start", function () {
    return contract.connect(accounts[0]).start(3600).catch(exp => {
      assert.isTrue(false, exp.toString());
    })
  })

  it("should be started", function () {
    return contract.getInfo().then(info => {
      assert.isTrue(info.expiresAt > 0);
    })
  });

  it("should reject donation: wrong address", async function () {
    await contract.connect(accounts[5]).donate("test", {value: 50}).catch(exp => {
      assert.match(exp.toString(), /CF: wrong address/);
    })
  })

  it("should donate", async function () {
    let value = ethers.utils.parseEther('0.1').toString();
    await contract.connect(accounts[0]).donate("test", {value: value}).catch(exp => {
      assert.isTrue(false, exp.toString());
    })

    let info = await contract.getInfo();
    assert.equal(ethers.utils.parseEther("0.1").toString(), info.currentAmount);
  })

  it("should reject donation: wrong address", async function () {
    await contract.connect(accounts[0]).donate("test", {value: 50}).catch(exp => {
      assert.match(exp.toString(), /CF: already donated/);
    })
  })

  it("should donate with rebate", async function () {
    let value = ethers.utils.parseEther('1').toString();
    let before = await ethers.provider.getBalance(accounts[1].address);

    await contract.connect(accounts[1]).donate("test", {value: value}).catch(exp => {
      assert.isTrue(false, exp.toString());
    })
    let after = await ethers.provider.getBalance(accounts[1].address);

    assert.isTrue(after > before - value)
  })

  it("should be ended", async function () {
    let info = await contract.getInfo();
    assert.equal(info.ended, true);
  })

  it("should return donation", async function () {
    let donation = await contract.connect(accounts[1]).getDonation();
    assert.equal(donation.amount, ethers.utils.parseEther('0.4').toString())
  })

  it("should reject withdraw", async function () {
    await contract.connect(accounts[0]).withdraw().catch(exp => {
      assert.match(exp.toString(), /CF: amount is collected/);
    })
  })

  it("should withdraw", async function () {
    let before = await ethers.provider.getBalance(accounts[5].address);

    await contract.connect(accounts[5]).withdraw().catch(exp => {
      assert.isTrue(false, exp.toString());
    })

    let after = await ethers.provider.getBalance(accounts[5].address);
    assert.isTrue(parseInt(after) > parseInt(before));
  })

  it("should reject donate", async function () {
    let value = ethers.utils.parseEther('0.1').toString();
    await contract.connect(accounts[2]).donate("test", {value: value}).catch(exp => {
      assert.match(exp.toString(), /CF: amount is collected/);
    })
  })
});
