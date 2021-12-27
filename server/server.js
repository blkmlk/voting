const WebSocket = require("ws");
const ethers = require("ethers");
const crypto = require('crypto');

const config = require('./config.js');
const info = require('../src/info.json');

const provider = new ethers.providers.JsonRpcProvider(config.url, "any");

const wsServer = new WebSocket.Server({
    host: "127.0.0.1",
    path: "/ws",
    port: 8090,
})

let games = {};
let players = {};

wsServer.on('connection', (conn, req) => {
    let remote = req.socket.remoteAddress + ":" + req.socket.remotePort;
    console.log("Connected", remote);

    conn.on('message', async message => {
        let msg = JSON.parse(message.toString());

        switch (msg.type) {
            case 'PLAY':
                if (!handlePlay(msg)) {
                    return;
                }

                if (players.hasOwnProperty(remote)) {
                    console.log(msg.address, "is already connected");
                    return;
                }

                if (!games.hasOwnProperty(msg.gameAddress)) {
                    initGame(msg.gameAddress);
                }

                if (games[msg.gameAddress].players === 2) {
                    console.log("no free spots")
                    return;
                }

                let failed = false;
                let player = await games[msg.gameAddress].contract.players(msg.address).catch(exp => {
                    failed = true
                });

                if (failed) {
                    console.log("wrong contract");
                    return;
                }

                if (!player.exists) {
                    console.log("player doesn't exist");
                }

                players[remote] = {
                    conn: conn,
                    address: msg.address,
                    gameAddress: msg.gameAddress,
                    move: null,
                }

                console.log("Connected", msg.address.toString())

                let game = games[msg.gameAddress];

                game.players++;
                game.clients.push(remote);

                conn.send(JSON.stringify({type: 'APPROVED'}))

                if (game.players === 2) {
                    game.clients.forEach(remote => {
                        let player = players[remote];
                        player.gameID = game.id;
                        player.conn.send(JSON.stringify({
                            type: 'START',
                            gameID: game.id,
                        }))
                    });

                    console.log("Started with Game ID:", game.id)
                    return;
                }
                break;
            case 'MOVE':
                let p = players[remote];
                if (p.move !== null) {
                    console.log("player already made a move")
                    return;
                }

                p.move = {
                    from: p.address,
                    nonce: msg.nonce,
                    move: msg.move,
                    gameID: p.gameID,
                    signature: msg.signature,
                }
                games[p.gameAddress].moves++;
                p.conn.send(JSON.stringify({type: 'MOVED'}))

                if (games[p.gameAddress].moves === 2) {
                    let moves = [];
                    games[p.gameAddress].clients.forEach(addr => {
                        moves.push(players[addr].move);
                    })

                    games[p.gameAddress].clients.forEach(addr => {
                        players[addr].conn.send(JSON.stringify({
                            type: 'FINISH',
                            moves: moves,
                        }))
                    })
                    console.log("The game can be finished")
                }
                break;
            }
    })
    conn.on('close', () => {
        let player = players[remote];

        if (player !== undefined) {
            games[player.gameAddress].clients.forEach(addr => {
                players[addr].conn.send(JSON.stringify({type: 'STOP'}))
                delete players[addr];
            })
            initGame(player.gameAddress);
            console.log("Disconnected", remote);
        }
    })
})

function handlePlay(msg) {
    let address = msg.address;
    let signature = msg.signature;
    let nonce = msg.nonce;

    let message = ethers.utils.solidityKeccak256(['uint256', 'address'], [nonce, address]);
    let hashed = ethers.utils.arrayify(message);
    let recovered = ethers.utils.verifyMessage(hashed, signature);

    if (address !== recovered.toString()) {
        console.log("Wrong address", recovered.toString())
        return false;
    }

    return true;
}

function initGame(address) {
    let contract = new ethers.Contract(
        address,
        info.RockPaperScissors.abi,
        provider,
    );
    games[address] = {
        id: Math.floor(Math.random() * 1e10),
        players: 0,
        contract: contract,
        clients: [],
        moves: 0,
    };
}

function generateAddress(provider) {
    let id = crypto.randomBytes(32).toString('hex');
    let privateKey = "0x"+id;
    return new ethers.Wallet(privateKey, provider);
}
