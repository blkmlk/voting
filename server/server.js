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

    conn.on('message', async message => {
        let msg = JSON.parse(message.toString());

        switch (msg.type) {
            case 'CONNECT': {
                if (players.hasOwnProperty(remote)) {
                    console.log(msg.address, "is already connected");
                    return;
                }

                players[remote] = {
                    conn: conn,
                    address: msg.address,
                    gameAddress: msg.gameAddress,
                    move: null,
                    verified: false,
                }

                if (!games.hasOwnProperty(msg.gameAddress)) {
                    initGame(msg.gameAddress);
                }

                let failed = false;
                let cPlayer = await games[msg.gameAddress].contract.players(msg.address).catch(exp => {
                    failed = true
                });

                if (failed) {
                    console.log("wrong game address");
                    deletePlayer(remote);
                    return;
                }

                if (!cPlayer.exists) {
                    console.log("player doesn't exist");
                    deletePlayer(remote);
                    return;
                }

                let game = games[msg.gameAddress];

                game.clients.push(remote);

                conn.send(JSON.stringify({type: "CONNECTED", address: msg.address}))
                console.log("Connected", msg.address.toString())

                break;
            }
            case 'READY': {
                let player = getPlayer(remote);

                if (player === null) {
                    console.log(msg.address, "player not found");
                    return;
                }

                if (!verifyAddress(player.address, msg.nonce, msg.signature)) {
                    console.log("player isn't verified");
                    deletePlayer(remote);
                    return;
                }

                player.verified = true;

                if (games[player.gameAddress].players === 2) {
                    console.log("no free spots")
                    return;
                }

                let game = games[player.gameAddress];
                game.players++;

                sendToAll(player.gameAddress, {type: "APPROVED", address: player.address})

                if (game.players === 2) {
                    sendToAll(player.gameAddress, {type: 'START', gameID: game.id});
                    console.log("Started with Game ID:", game.id)
                }
                break;
            }
            case 'MOVE': {
                let player = getPlayer(remote);

                if (player === null) {
                    console.log(msg.address, "player not found");
                    return;
                }

                if (!player.verified) {
                    console.log("player isn't verified")
                    return;
                }

                if (player.move !== null) {
                    console.log("player already made a move")
                    return;
                }

                player.move = {
                    from: player.address,
                    nonce: msg.nonce,
                    move: msg.move,
                    gameID: player.gameID,
                    signature: msg.signature,
                }
                games[player.gameAddress].moves++;

                sendToAll(player.gameAddress, {type: 'MOVED', address: player.address})

                if (games[player.gameAddress].moves === 2) {
                    let moves = [];
                    games[player.gameAddress].clients.forEach(addr => {
                        moves.push(players[addr].move);
                    })

                    sendToAll(player.gameAddress, {type: 'FINISH', moves: moves})
                    console.log("The game can be finished")
                }
                break;
            }
        }
    })
    conn.on('close', () => {
        let player = getPlayer(remote);

        if (player !== null) {
            games[player.gameAddress].clients.forEach(addr => {
                players[addr].conn.send(JSON.stringify({type: 'STOP', address: player.address}))
                deletePlayer(addr);
            })
            initGame(player.gameAddress);
            console.log("Disconnected", remote);
        }
    })
})

function verifyAddress(address, nonce, signature) {
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

function sendToAll(gameAddress, obj) {
    let game = games[gameAddress];

    game.clients.forEach(remote => {
        let player = players[remote];
        player.gameID = game.id;
        player.conn.send(JSON.stringify(obj))
    });
}

function deletePlayer(remote) {
    let player = players[remote];
    if (games.hasOwnProperty(player.gameAddress)) {
        games[player.gameAddress].players--;
        games[player.gameAddress].clients = games[player.gameAddress].clients.filter(item => {
            return item !== remote;
        })
    }

    delete players[remote];
}

function getPlayer(remote) {
    if (!players.hasOwnProperty(remote)) {
        return null;
    }

    return players[remote];
}
