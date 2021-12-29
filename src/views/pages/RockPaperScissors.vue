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
              <v-row justify="center">
                  <v-card v-for="player in players" class="top-card mr-10 ml-10 mb-10">
                    <v-container>
                      <v-row justify="center" class="mb-10">
                        <img
                            :src="getAvatar(player.address)"
                            alt="user"
                            width="160px"
                            class="img-fluid rounded-circle shadow-sm pt-5"
                        />
                      </v-row>
                      <v-row class="ml-2 mr-2" justify="center">
                        <h4 class="mt-2 mb-2 title blue-grey--text text--darken-2 font-weight-regular">{{player.address}}</h4>
                      </v-row>
                      <v-row justify="center">
                        <h4 class="mt-2 mb-2 title black--text text--darken-2 font-weight-regular">{{player.status}}</h4>
                      </v-row>
                    </v-container>
                  </v-card>
              </v-row>
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
                  <div v-else-if="canBeReady">
                    <v-btn class="mx-2 text-center" dark color="purple" @click="ready">Ready</v-btn>
                  </div>
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
  Approved: 3,
  Playing: 4,
  Moved: 5,
  Finishing: 6,
  Finished: 7,
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
      rivalStatus: Status.Joined,
      moves: null,
      gameID: 0,
      players: [],
    }
  },
  computed: {
    canGoBack() {
      return window.prevUrl !== "/";
    },
    expired() {
      return this.currentTimestamp > this.contractInfo.expiresAt;
    },
    canJoin() {
      return this.contractInfo.freeSpots > 0 && this.status === Status.Viewer && !this.expired;
    },
    canLeave() {
      return this.status === Status.Joined &&
          (this.contractInfo.freeSpots > 0 || (this.expired && !this.finished));
    },
    canBeReady() {
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
      return this.$store.state.ethers != null && this.contract !== null && this.account !== undefined;
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
    winner() {
      return this.contractInfo.winner;
    },
  },
  methods: {
    goBack() {
      this.$router.go(-1);
    },
    getStatus(status) {
      switch (status) {
        case Status.Viewer: return "Viewer";
        case Status.Joined: return "Joined";
        case Status.Approved: return "Ready";
        case Status.Playing: return "Choosing";
        case Status.Moved: return "Made a move";
        case Status.Finishing: return "Finished";
        case Status.Finished: return "Winner!";
      }
    },
    onWsConnect(conn) {
      this.$socket.sendObj({
        type: 'CONNECT',
        address: this.account,
        gameAddress: this.address,
      })
    },
    onWsMessage(event) {
      let msg = JSON.parse(event.data);

      let newStatus = "";
      switch (msg.type) {
        case 'CONNECTED':
          newStatus = Status.Joined;
          break;
        case 'APPROVED':
          newStatus = Status.Approved;
          break;
        case 'START':
          newStatus = Status.Playing;
          this.gameID = msg.gameID;
          console.log("Started game with ID:", msg.gameID);
          break;
        case 'MOVED':
          newStatus = Status.Moved;
          break;
        case 'FINISH':
          newStatus = Status.Finishing;
          this.moves = msg.moves;
          break;
        case 'STOP':
          newStatus = Status.Joined;
          break;
      }

      if (msg.address === undefined || msg.address === this.account) {
        this.status = newStatus;
      }
      this.setPlayerStatus(msg.address, newStatus);
    },
    join() {
      this.contract.join({value: this.contractInfo.bet});
    },
    leave() {
      this.contract.leave().then(function () {
        this.$disconnect();
      }.bind(this));
    },
    ready() {
      let nonce = Math.floor(Math.random() * 1e10)
      let message = ethers.utils.solidityKeccak256(['uint256', 'address'], [nonce, this.account]);
      this.signMessage(this.$store.state.ethers.getSigner(0), message).then(function (signature) {
        this.$socket.sendObj({
          type: "READY",
          nonce: nonce,
          signature: signature,
        })
      }.bind(this))
    },
    finish() {
      this.contract.finish(this.moves).catch(function(exp) {
        if (exp.toString().match(/draw/)) {
          this.status = Status.Joined;
          this.players.forEach(item => {
            item.status = this.getStatus(Status.Joined);
          })
        }
      });
    },
    withdraw() {
      this.contract.withdraw();
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
    },
    signMessage(signer, message) {
      let hashed = ethers.utils.arrayify(message);
      return signer.signMessage(hashed);
    },
    getAvatar(seed) {
      return this.generator.generateRandomAvatar(seed);
    },
    setPlayerStatus(address, status) {
      let player = this.players.find(item => {
        return item.address === address;
      })

      if (player !== undefined) {
        player.status = this.getStatus(status);
      }
    },
    loadContractInfo(instance) {
      instance.getInfo().then(function(info){
        this.contractInfo = info;
        return info;
      }.bind(this)).then(async function(info) {
        let topicJoined = instance.filters.Joined(null);
        let topicLeft = instance.filters.Left(null);

        let events = await instance.queryFilter([[topicJoined, topicLeft]], info.startBlock.toNumber());

        let players = {};
        events.forEach(e => {
          if (e.topics[0] === topicJoined.topics[0]) {
            players[e.args[0]] = true;
          } else if (e.topics[0] === topicLeft.topics[0]){
            delete players[e.args[0]];
          }
        })

        let newPlayers = [];
        Object.keys(players).forEach(function(key) {
          let status = Status.Joined;

          if (parseInt(info.winner, 16) !== 0) {
            if (key === info.winner) {
              status = Status.Finished;
              this.status = Status.Finished;
            } else {
              status = "";
            }
          }

          newPlayers.push({
            address: key,
            status: this.getStatus(status),
          })
        }.bind(this));
        this.players = newPlayers;
      }.bind(this))

      instance.players(this.account).then(function(player) {
        if (player.exists) {
          this.status = Status.Joined;
        } else {
          this.status = Status.Viewer;
        }
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