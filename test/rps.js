const { ethers, timeAndMine} = require("hardhat");
const { assert } = require("chai");

describe("RockPaperScissors", function () {
    let RPS;
    let accounts;
    let contract;
    let bet = ethers.utils.parseEther('1');

    afterEach(async () => {
        await timeAndMine.mine(1);
    })

    before(async function () {
        accounts = await ethers.getSigners();

        RPS = await ethers.getContractFactory("RockPaperScissors");
        contract = await RPS.connect(accounts[0]).deploy(bet, {value: bet});
        await contract.deployed();

        ethers.provider.on({}, log => {
            console.log(log);
        })
    })

    it("should require valid value", async () => {
        await RPS.connect(accounts[0]).deploy(10).catch(exp => {
            assert.match(exp.toString(), /invalid value/);
        })
        await RPS.connect(accounts[0]).deploy(10, {value: 10})
    })

    it("should reject join", async () => {
        await contract.connect(accounts[1]).join({value: 0}).catch(exp => {
            assert.match(exp.toString(), /value does not equal to the bet/);
        });
        await contract.connect(accounts[0]).join({value: bet}).catch(exp => {
            assert.match(exp.toString(), /player already joined the game/);
        });
    })

    it("should join", async () => {
        await contract.connect(accounts[1]).join({value: bet});
    })

    it("should be started", async () => {
        await contract.connect(accounts[2]).join({value: bet}).catch(exp => {
            assert.match(exp.toString(), /no free spot/);
        });
    })

    it("should finish", async () => {
        let moves = [];
        {
            const nonce = Math.floor(Math.random() * 1e10)
            let move = 1;
            let message = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [nonce, nonce]);
            let signature = await signMessage(accounts[0], message);

            moves.push({
                from: accounts[0].address,
                move: move,
                nonce: nonce,
                hash: message,
                signature: signature,
            })
        }

        {
            const nonce = Math.floor(Math.random() * 1e10)
            let move = 2;
            let message = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [nonce, nonce]);
            let signature = await signMessage(accounts[1], message);

            moves.push({
                from: accounts[1].address,
                move: move,
                nonce: nonce,
                hash: message,
                signature: signature,
            })
        }

        await contract.connect(accounts[0]).finish(moves);
    })
});

async function signMessage(account, message) {
    let hashed = ethers.utils.arrayify(message);
    return account.signMessage(hashed);
}
