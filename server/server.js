const WebSocket = require("ws");
const ethers = require("ethers");

const config = require('./config.js');

const provider = new ethers.providers.JsonRpcProvider(config.url, "any");
const wsServer = new WebSocket.Server({
    host: "127.0.0.1",
    path: "/ws",
    port: 8090,
})

const players = {};

wsServer.on('connection', (ws, req) => {
    let remote = req.socket.remoteAddress;
    console.log("Connected", remote);

    ws.on('message', message => {
        let msg = JSON.parse(message.toString());

        switch (msg.type) {
            case 'PLAY': handlePlay(remote, msg);
        }
    })
})

function handlePlay(remote, msg) {
    let address = msg.address;
    let signature = msg.signature;
    let nonce = msg.nonce;
    // let gameAddress = msg.gameAddress;

    let message = ethers.utils.solidityKeccak256(['uint256', 'address'], [nonce, address]);
    let hashed = ethers.utils.arrayify(message);
    let recovered = ethers.utils.verifyMessage(hashed, signature);

    if (address !== recovered.toString()) {
        console.log("Wrong address", recovered.toString())
        return;
    }

    players[address] = {
        remote: remote,
    }

    console.log("Connected", recovered.toString())
}

