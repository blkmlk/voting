<template>
<v-container v-if="connected">
    <v-app-bar absolute color="white">
      <v-btn v-if="canGoBack" @click="goBack" class="mx-2 text-center" dark color="#F5F5F5">
        <v-icon dark color="#212121"> mdi-arrow-left-bold </v-icon>
      </v-btn>
      <v-toolbar-title class="ml-5 black--text">
          {{contractInfo.name}}
        </v-toolbar-title>
      <v-spacer></v-spacer>
    </v-app-bar>
    <v-row justify="center">
            <v-container fill-height>
                <v-row v-if="canMove" align="center" justify="center" class="mb-5">
                  <v-btn class="mx-2 text-center" dark color="indigo" @click="makeMove('rock')">
                    <v-icon dark> mdi-diamond-stone </v-icon>
                  </v-btn>
                  <v-btn class="mx-2 text-center" dark color="indigo" @click="makeMove('paper')">
                    <v-icon dark> mdi-file </v-icon>
                  </v-btn>
                  <v-btn class="mx-2 text-center" dark color="indigo" @click="makeMove('scissors')">
                    <v-icon dark> mdi-content-cut </v-icon>
                  </v-btn>
                </v-row>
                <v-row align="center" justify="center">
                  <v-btn v-if="canJoin" class="mx-2 text-center" dark color="indigo" @click="join">Join</v-btn>
                  <v-btn v-else-if="canLeave" class="mx-2 text-center" dark color="red" @click="leave">Leave</v-btn>
                  <v-btn v-else-if="canPlay" class="mx-2 text-center" dark color="purple" @click="play">Play</v-btn>
                  <v-btn v-else-if="canFinish" class="mx-2 text-center" dark color="green" @click="finish">Finish</v-btn>
                  <v-btn v-else-if="finished" class="mx-2 text-center" dark color="green">Finished</v-btn>
                </v-row>
            </v-container>
    </v-row>
</v-container>
</template>

<script>

const ethers = require("ethers");
import {AvatarGenerator} from 'random-avatar-generator';

const Moves = {
  Rock: 1,
  Paper: 2,
  Scissors: 3
}

const Status = {
  Viewer: 0,
  Joined: 1,
  Approved: 2,
  Playing: 3,
  Moved: 4,
  Finishing: 5,
  Finished: 6,
}

export default {
  created() {
    this.address = this.$route.params.address;
    this.generator = new AvatarGenerator();

    this.$connect('ws://localhost:8090/ws', {format: 'json'})
    this.$socket.onopen = this.onWsConnect;
    this.$socket.onmessage = this.onWsMessage;

    this.timeInterval = setInterval(function (){
      this.currentTimestamp = parseInt(Date.now()/1000);
    }.bind(this), 1000);

    this.checkContract();
  },
  beforeDestroy() {
    this.$disconnect();
    clearInterval(this.timeInterval);
  },
  props: ["info"],
  data() {
    return {
      address: "",
      timeInterval: null,
      currentTimestamp: parseInt(Date.now()/1000),
      contract: null,
      contractInfo: {
        name: "",
        owner: null,
        bet: 0,
        freeSpots: 0,
        expiresAt: 0,
        winner: "",
      },
      generator: null,
      status: Status.Viewer,
      moves: null,
      gameID: 0,
      players: [],
    }
  },
  computed: {
    canGoBack() {
      return window.prevUrl !== "/";
    },
    canJoin() {
      console.log(this.contractInfo);
      return this.contractInfo.freeSpots > 0 && this.status === Status.Viewer && this.currentTimestamp <= this.contractInfo.expiresAt;
    },
    canLeave() {
      return this.status === Status.Joined &&
          (this.contractInfo.freeSpots > 0 || (this.currentTimestamp > this.contractInfo.expiresAt && !this.finished));
    },
    canPlay() {
      return this.status === Status.Joined;
    },
    canMove() {
      return this.status === Status.Playing;
    },
    canFinish() {
      return this.status === Status.Finishing && this.moves !== null;
    },
    finished() {
      return this.status === Status.Finished;
    },
    connected() {
      return this.$store.state.ethers != null && this.contract !== null;
    },
    newBlock() {
      return this.$store.state.newBlock;
    },
    account() {
      if (this.$store.state.accounts.length === 0) {
        return null;
      }
      return this.$store.state.accounts[0];
    },
  },
  methods: {
    goBack() {
      this.$router.go(-1);
    },
    onWsConnect(conn) {
      this.wsConnection = conn;
    },
    onWsMessage(event) {
      let msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'APPROVED':
          this.status = Status.Approved;
          break;
        case 'START':
          this.status = Status.Playing;
          this.gameID = msg.gameID;
          console.log("Started with Game ID:", msg.gameID);
          break;
        case 'MOVED':
          this.status = Status.Moved;
          break;
        case 'STOP':
          this.status = Status.Viewer;
          break;
        case 'FINISH':
          this.status = Status.Finishing;
          this.moves = msg.moves;
          console.log("Got moves", msg.moves);
          break;
      }
    },
    join() {
      this.contract.join({value: this.contractInfo.bet});
    },
    leave() {
      this.contract.leave().then(function () {
        this.$disconnect();
      }.bind(this));
    },
    play() {
      let nonce = Math.floor(Math.random() * 1e10)
      let message = ethers.utils.solidityKeccak256(['uint256', 'address'], [nonce, this.account]);
      this.signMessage(this.$store.state.ethers.getSigner(0), message).then(function (signature) {
        this.$socket.sendObj({
          type: "PLAY",
          address: this.account,
          nonce: nonce,
          signature: signature,
          gameAddress: this.address,
        })
      }.bind(this))
    },
    finish() {
      this.contract.finish(this.moves);
    },
    makeMove(value) {
      let move = 0;
      switch (value) {
        case 'rock': move = Moves.Rock; break;
        case 'paper': move = Moves.Paper; break;
        case 'scissors': move = Moves.Scissors; break;
      }

      let nonce = Math.floor(Math.random() * 1e10)
      let message = ethers.utils.solidityKeccak256(['uint256', 'uint256', 'uint8'], [nonce, this.gameID, move]);
      this.signMessage(this.$store.state.ethers.getSigner(0), message).then(function (signature) {
        this.$socket.sendObj({
          type: "MOVE",
          nonce: nonce,
          move: move,
          signature: signature,
        })
      }.bind(this))

      console.log("Made move", move);
    },
    signMessage(signer, message) {
      let hashed = ethers.utils.arrayify(message);
      return signer.signMessage(hashed);
    },
    getAvatar(seed) {
      return this.generator.generateRandomAvatar(seed);
    },
    loadContractInfo(instance) {
      instance.getInfo().then(function(info){
        this.contractInfo.name = info.name;
        this.contractInfo.owner = info.owner;
        this.contractInfo.bet = info.bet;
      }.bind(this))

      instance.freeSpots().then(function (value) {
        this.contractInfo.freeSpots = value;
      }.bind(this));

      instance.players(this.account).then(function(player) {
        if (player.exists) {
          this.status = Status.Joined;
        } else {
          this.status = Status.Viewer;
        }
      }.bind(this))

      instance.expiresAt().then(function (value) {
        this.contractInfo.expiresAt = value;
      }.bind(this))

      instance.winner().then(function (value) {
        this.contractInfo.winner = value;
        if (value !== "") {
          this.status = Status.Finished;
        }
      }.bind(this))

      instance.startBlock().then(async function(blockNumber) {
        let topicJoined = instance.filters.Joined(null);
        let topicLeft = instance.filters.Left(null);

        let events = await instance.queryFilter([[topicJoined, topicLeft]], blockNumber.toNumber());

        let players = {};
        events.forEach(e => {
          if (e.topics[0] === topicJoined.topics[0]) {
            players[e.args[0]] = true;
          } else if (e.topics[0] === topicLeft.topics[0]){
            delete players[e.args[0]];
          }
        })
        this.players = Object.keys(players);
      }.bind(this))
    },
    checkContract() {
      try {
        this.contract = new ethers.Contract(
            this.address,
            this.info.RockPaperScissors.abi,
            this.$store.state.ethers.getSigner(0),
        );
      } catch(e) {
        console.log(e);
      }
    }
  },
  watch: {
    newBlock() {
      this.loadContractInfo(this.contract);
    },
    connected(connected) {
      if (!connected) {
        this.contract = null;
        return;
      }

      this.checkContract();
    },
    contract(instance) {
      if (instance === null) {
        return;
      }
      this.loadContractInfo(instance);
    },
  }
}
</script>

<style>
.card {
  height: 290px;
  width: 250px;
}
</style>