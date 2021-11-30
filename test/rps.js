const { ethers, timeAndMine} = require("hardhat");
const { assert } = require("chai");

describe("RockPaperScissors", function () {
    let RPS;
    let accounts;
    let contract;
    let bet = ethers.utils.parseEther('1');

    const Moves = {
        Rock: 1,
        Paper: 2,
        Scissors: 3
    }

    let cases = [
        { MoveA: 'Rock', MoveB: 'Rock', Winner: -1 },
        { MoveA: 'Rock', MoveB: 'Paper', Winner: 1 },
        { MoveA: 'Rock', MoveB: 'Scissors', Winner: 0 },
        { MoveA: 'Paper', MoveB: 'Rock', Winner: 0 },
        { MoveA: 'Paper', MoveB: 'Paper', Winner: -1 },
        { MoveA: 'Paper', MoveB: 'Scissors', Winner: 1 },
        { MoveA: 'Scissors', MoveB: 'Rock', Winner: 1 },
        { MoveA: 'Scissors', MoveB: 'Paper', Winner: 0 },
        { MoveA: 'Scissors', MoveB: 'Scissors', Winner: -1 },
    ];

    cases.forEach(c => {
        describe(c.MoveA + " vs " + c.MoveB, () => {
            afterEach(async () => {
                await timeAndMine.mine(1);
            })

            before(async function () {
                accounts = await ethers.getSigners();

                RPS = await ethers.getContractFactory("RockPaperScissors");
                contract = await RPS.connect(accounts[0]).deploy(bet, {value: bet});
                await contract.deployed();
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

                assert.isTrue((await contract.queryFilter(contract.filters.Started())).length === 1);
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
                    let move = Moves[c.MoveA];
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
                    let move = Moves[c.MoveB];
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

                if (c.Winner !== -1) {
                    const expectedWinner = moves[c.Winner].from;

                    await contract.connect(accounts[0]).finish(moves);

                    let events = await contract.queryFilter(contract.filters.Finished());

                    assert.equal((await contract.players(expectedWinner)).move, moves[c.Winner].move);
                    assert.equal(await contract.winner(), expectedWinner);
                    assert.isTrue(events.length === 1);
                    assert.equal(events[0].args.winner, expectedWinner);
                } else {
                    await contract.connect(accounts[0]).finish(moves).catch(exp => {
                        assert.match(exp.toString(), /draw/)
                    });
                }
            })
        })
    })
});

async function signMessage(account, message) {
    let hashed = ethers.utils.arrayify(message);
    return account.signMessage(hashed);
}
