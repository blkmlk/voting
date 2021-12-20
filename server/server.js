const WebSocket = require("ws");
const ethers = require("ethers");

const config = require('./config.js');

const provider = new ethers.providers.JsonRpcProvider(config.url, "any");
const wsServer = new WebSocket.Server({port: 9090})

wsServer.on('connection', ws => {
    ws.on('message', message => {
        let msg = JSON.parse(message.toString());

        switch (msg.type) {
            case 'JOIN': handleJoin(msg);
        }
    })
})

function handleJoin(msg) {
    let signature = msg.signature;
    let address = msg.address;

    let message = ethers.utils.solidityKeccak256(['address'], [address]);
    let recovered = ethers.utils.verifyMessage(message, signature);

    console.log("Your address is " + recovered.toString())
}
