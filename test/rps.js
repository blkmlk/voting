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
                contract = await RPS.connect(accounts[0]).deploy("test", accounts[0].address, bet, 10*60);
                await contract.deployed();
                await contract.connect(accounts[0]).join({value: bet});
            })

            it("should reject join", async () => {
                await contract.connect(accounts[1]).join({value: 0}).catch(exp => {
                    assert.match(exp.toString(), /value does not equal to the bet/);
                });
                await contract.connect(accounts[0]).join({value: bet}).catch(exp => {
                    assert.match(exp.toString(), /player already joined the game/);
                });
            })

            it("should leave", async () => {
                await contract.connect(accounts[0]).leave();
                await contract.connect(accounts[0]).join({value: bet});
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

            let moves = [];
            it("should prepare moves", async () => {
                const gameID = Math.floor(Math.random() * 1e10)

                {
                    const nonce = Math.floor(Math.random() * 1e10)
                    let move = Moves[c.MoveA];
                    let message = ethers.utils.solidityKeccak256(['uint256', 'uint256', 'uint8'], [nonce, gameID, move]);
                    let signature = await signMessage(accounts[0], message);

                    moves.push({
                        from: accounts[0].address,
                        move: move,
                        nonce: nonce,
                        gameID: gameID,
                        hash: message,
                        signature: signature,
                    })
                }

                {
                    const nonce = Math.floor(Math.random() * 1e10)
                    let move = Moves[c.MoveB];
                    let message = ethers.utils.solidityKeccak256(['uint256', 'uint256', 'uint8'], [nonce, gameID, move]);
                    let signature = await signMessage(accounts[1], message);

                    moves.push({
                        from: accounts[1].address,
                        move: move,
                        nonce: nonce,
                        gameID: gameID,
                        hash: message,
                        signature: signature,
                    })
                }
            })

            it("should reject finish", async() => {
                await contract.connect(accounts[2]).finish(moves).catch(exp => {
                    assert.match(exp.toString(), /player not found/)
                });

                let invalidMoves = JSON.parse(JSON.stringify(moves));
                invalidMoves[0].from = accounts[2].address;
                await contract.connect(accounts[0]).finish(invalidMoves).catch(exp => {
                    assert.match(exp.toString(), /player does not exist/)
                });

                invalidMoves = JSON.parse(JSON.stringify(moves));
                invalidMoves[0].gameID = 0;
                await contract.connect(accounts[0]).finish(invalidMoves).catch(exp => {
                    assert.match(exp.toString(), /gameID values must be the same/)
                });
            })

            if (c.Winner === -1) {
                it("should be a draw", async () => {
                    await contract.connect(accounts[0]).finish(moves).catch(exp => {
                        assert.match(exp.toString(), /draw/)
                    });
                })
            } else {
                it("should finish", async () => {
                    const expectedWinner = moves[c.Winner].from;
                    await contract.connect(accounts[0]).finish(moves);
                    let events = await contract.queryFilter(contract.filters.Finished());

                    assert.equal((await contract.players(expectedWinner)).move, moves[c.Winner].move);
                    assert.equal(await contract.winner(), expectedWinner);
                    assert.isTrue(events.length === 1);
                    assert.equal(events[0].args.winner, expectedWinner);
                })

                it("should withdraw", async () => {
                    const expectedWinner = moves[c.Winner].from;
                    let account = accounts.find(item => {return item.address === expectedWinner});
                    await contract.connect(account).withdraw();
                })
            }
        })
    })
});

async function signMessage(account, message) {
    let hashed = ethers.utils.arrayify(message);
    return account.signMessage(hashed);
}
