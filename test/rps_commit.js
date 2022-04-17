const { ethers, timeAndMine} = require("hardhat");
const { assert } = require("chai");
const {isAffectDepthOfReadingPattern} = require("truffle/build/834.bundled");

describe("RockPaperScissorsCommit", function () {
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

                RPS = await ethers.getContractFactory("RockPaperScissorsCommit");
                contract = await RPS.connect(accounts[0]).deploy("test", bet);
                await contract.deployed();
                await contract.connect(accounts[0]).join({value: bet});
            })

            it("should reject join", async () => {
                await contract.connect(accounts[1]).join({value: 0}).catch(exp => {
                    assert.match(exp.toString(), /not enough value/);
                });
                await contract.connect(accounts[0]).join({value: bet}).catch(exp => {
                    assert.match(exp.toString(), /already joined/);
                });
            })

            it("should leave", async () => {
                await contract.connect(accounts[0]).leave();
            })

            it("should join with higher bet", async () => {
                await contract.connect(accounts[0]).join({value: bet.mul(3)});
                let balance = await ethers.provider.getBalance(contract.address);
                assert.equal(balance.toString(), bet.toString(), "invalid balance");
            })

            it("should be joined by 2th player", async () => {
                await contract.connect(accounts[1]).join({value: bet});
                assert.isTrue((await contract.queryFilter(contract.filters.Started())).length === 1);
            })

            it("should be started", async () => {
                let balance = await ethers.provider.getBalance(contract.address);
                assert.equal(balance.toString(), bet.mul(2).toString(), "invalid balance");

                let freeSpots = await contract.freeSpots();
                assert.equal(freeSpots, "0", "invalid freeSpots value");

                await contract.connect(accounts[2]).join({value: bet}).catch(exp => {
                    assert.match(exp.toString(), /no free spots/);
                });
                await contract.connect(accounts[0]).leave().catch(exp => {
                    assert.match(exp.toString(), /the game is not finished/);
                });
            })

            it("should not finish", async () => {
                await contract.connect(accounts[0]).finish().catch(exp => {
                    assert.match(exp.toString(), /not proved yet/);
                });
            })

            it("should not prove", async () => {
                await contract.connect(accounts[0]).prove(123, Moves.Rock).catch(exp => {
                    assert.match(exp.toString(), /not committed/);
                });
            })

            it("should commit 1th player", async () => {
                let move = Moves[c.MoveA];
                c.nonceA = Math.floor(Math.random() * 1e10);
                let commit = getCommit(contract.address, c.nonceA, move);
                await contract.connect(accounts[0]).commit(commit);
            })

            it("should not finish", async () => {
                await contract.connect(accounts[0]).finish().catch(exp => {
                    assert.match(exp.toString(), /not proved yet/);
                });
            })

            it("should commit 2th player", async () => {
                let move = Moves[c.MoveB];
                c.nonceB = Math.floor(Math.random() * 1e10);
                let commit = getCommit(contract.address, c.nonceB, move);
                await contract.connect(accounts[1]).commit(commit);
            })

            it("should not commit again", async () => {
                let commit = getCommit(contract.address, 0, 0);
                await contract.connect(accounts[0]).commit(commit).catch(exp => {
                    assert.match(exp.toString(), /already committed/);
                });
            })

            it("should not prove", async () => {
                let proved = await contract.proved();
                assert.equal(proved, "0", "invalid proved value");

                let moveA = Moves[c.MoveA];
                await contract.connect(accounts[0]).prove(c.nonceB, moveA).catch(exp => {
                    assert.match(exp.toString(), /invalid commit/);
                });

                proved = await contract.proved();
                assert.equal(proved, "0", "invalid proved value");
            })

            it("should prove", async () => {
                let proved = await contract.proved();
                assert.equal(proved, "0", "invalid proved value");

                let moveA = Moves[c.MoveA];
                await contract.connect(accounts[0]).prove(c.nonceA, moveA);

                proved = await contract.proved();
                assert.equal(proved, "1", "invalid proved value");

                let moveB = Moves[c.MoveB];
                await contract.connect(accounts[1]).prove(c.nonceB, moveB);

                proved = await contract.proved();
                assert.equal(proved, "2", "invalid proved value");
            })

            it("should finish", async () => {
                let finished = await contract.finished();
                assert.isTrue(!finished, "invalid finished value");

                await contract.connect(accounts[0]).finish({gasPrice: 20000000000}).catch(exp => {
                    console.log(exp.toString())
                });

                let balance = await ethers.provider.getBalance(contract.address);
                assert.equal(balance.toString(), "0", "invalid balance");

                let winner = await contract.winner();
                switch (c.Winner) {
                    case 1:
                        assert.equal(accounts[1].address, winner);
                        break;
                    case 0:
                        assert.equal(accounts[0].address, winner);
                        break
                    case -1:
                        assert.equal(0, parseInt(winner));
                        break
                }
            })
        })
    })
});

function getCommit(address, nonce, move) {
    return ethers.utils.solidityKeccak256(['address', 'uint256', 'uint8'], [address, nonce, move]).toString();
}
