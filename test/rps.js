const { ethers } = require("hardhat");
const { assert } = require("chai");

describe("RockPaperScissors", function () {
    let accounts;
    let contract;

    before(async function () {
        accounts = await ethers.getSigners();

        const RPS = await ethers.getContractFactory("RockPaperScissors");
        contract = await RPS.connect(accounts[0]).deploy();
        await contract.deployed();
    })
});
