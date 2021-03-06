<template>
<v-container v-if="connected">
    <v-app-bar absolute color="white">
      <v-btn v-if="canGoBack" @click="goBack" class="mx-2 text-center" dark color="#F5F5F5">
        <v-icon dark color="#212121"> mdi-arrow-left-bold </v-icon>
      </v-btn>
      <v-toolbar-title class="ml-5 black--text">
        <v-row class="d-flex justify-space-between">
          <v-col>
            {{contractInfo.name}}
          </v-col>
          <v-col>
            {{contractExpiresIn}}
          </v-col>
        </v-row>
      </v-toolbar-title>
      <v-spacer></v-spacer>
    </v-app-bar>
    <v-row justify="center">
            <v-container fill-height>
              <v-row justify="center">
                  <v-card v-for="player in playersList" class="top-card mr-10 ml-10 mb-10">
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
                        <h4 class="text-target mt-2 mb-2 blue-grey--text text--darken-2 font-weight-regular">{{player.address}}</h4>
                      </v-row>
                      <v-row justify="center">
                        <h4 class="mt-2 mb-2 title black--text text--darken-2 font-weight-regular">{{getStatus(player.status)}}</h4>
                      </v-row>
                    </v-container>
                  </v-card>
              </v-row>
              <v-row align="center" justify="center">
                <v-btn v-if="canJoin" class="mx-2 text-center" dark color="indigo" @click="join">Join</v-btn>
                <v-btn v-else-if="canLeave" class="mx-2 text-center" dark color="red" @click="leave">Leave</v-btn>
                <div v-else-if="canBeReady">
                  <v-btn class="mx-2 text-center" dark color="purple" @click="ready">Ready</v-btn>
                </div>
                <div v-else-if="canMove">
                  <v-btn class="mx-2 text-center" dark color="indigo" @click="makeMove('rock')">
                    <v-icon dark> mdi-diamond-stone </v-icon>
                  </v-btn>
                  <v-btn class="mx-2 text-center" dark color="indigo" @click="makeMove('paper')">
                    <v-icon dark> mdi-file </v-icon>
                  </v-btn>
                  <v-btn class="mx-2 text-center" dark color="indigo" @click="makeMove('scissors')">
                    <v-icon dark> mdi-content-cut </v-icon>
                  </v-btn>
                </div>
                <v-btn v-else-if="canFinish" class="mx-2 text-center" dark color="green" @click="finish">Finish</v-btn>
                <v-btn v-else-if="canWithdraw" class="mx-2 text-center" dark color="green" @click="withdraw">Withdraw</v-btn>
              </v-row>
            </v-container>
    </v-row>
</v-container>
</template>

<script>

const ethers = require("ethers");
import {AvatarGenerator} from 'random-avatar-generator';
import {getRemainingTime} from "@/helpers";

const Moves = {
  Rock: 1,
  Paper: 2,
  Scissors: 3
}

const Status = {
  Viewer: 0,
  Joined: 1,
  Draw: 2,
  Approved: 3,
  Started: 4,
  Moved: 5,
  Finishing: 6,
  Won: 7,
}

export default {
  created() {
    this.address = this.$route.params.address;
    this.generator = new AvatarGenerator();

    this.connectWs(true);

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
        withdrawn: true,
      },
      generator: null,
      moves: null,
      gameID: 0,
      players: {},
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
      return (this.status === Status.Joined || this.status === Status.Draw) && this.winner === "";
    },
    canMove() {
      return this.status === Status.Started;
    },
    canFinish() {
      return this.status === Status.Finishing && this.moves !== null;
    },
    canWithdraw() {
      return this.status === Status.Won && !this.contractInfo.withdrawn;
    },
    finished() {
      return this.status === Status.Won;
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
    status() {
      if (!this.players.hasOwnProperty(this.account)) {
        return Status.Viewer;
      }
      return this.players[this.account].status;
    },
    playersList() {
      return Object.entries(this.players).map(item => {
        return item[1];
      });
    },
    winner() {
      if (parseInt(this.contractInfo.winner, 16) === 0) {
        return "";
      }
      return this.contractInfo.winner;
    },
    contractExpiresIn() {
      if (this.currentTimestamp > this.contractInfo.expiresAt) {
        return "expired";
      }

      return "expires in " + getRemainingTime(this.contractInfo.expiresAt, this.currentTimestamp);
    }
  },
  methods: {
    goBack() {
      this.$router.go(-1);
    },
    connectWs(bindHandlers) {
      this.$disconnect();
      this.$connect('ws://localhost:8090/ws', {
        format: 'json',
        reconnection: true,
        reconnectionAttempts: 500,
        reconnectionDelay: 500,
      });

      if (bindHandlers) {
        this.$options.sockets.onopen = this.onWsConnect;
        this.$options.sockets.onmessage = this.onWsMessage;
      }
    },
    getStatus(status) {
      switch (status) {
        case Status.Draw: return "Draw";
        case Status.Approved: return "Ready";
        case Status.Started: return "Choosing";
        case Status.Moved: return "Made a move";
        case Status.Finishing: return "Finishing";
        case Status.Won: return "Winner!";
      }
    },
    onWsConnect(conn) {
      this.$socket.sendObj({
        type: 'CONNECT',
        address: this.account,
        gameAddress: this.address,
      })
      console.log("Successfully connected to ws server");
    },
    onWsMessage(event) {
      let msg = JSON.parse(event.data);
      let address = msg.address;

      let status = "";
      switch (msg.type) {
        case 'CONNECTED':
          status = Status.Joined;
          break;
        case 'APPROVED':
          status = Status.Approved;
          break;
        case 'STARTED':
          status = Status.Started;
          address = 'all';
          this.gameID = msg.gameID;
          console.log("Started game with ID:", msg.gameID);
          break;
        case 'MOVED':
          status = Status.Moved;
          break;
        case 'FINISH':
          status = Status.Finishing;
          address = 'all';
          this.moves = msg.moves;
          break;
        case 'DISCONNECT':
          status = Status.Joined;
          address = 'all';
          this.connectWs(false);
          break;
      }
      console.log(msg);

      this.setPlayerStatus(address, status);
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
        if (exp.data.message.match(/draw/)) {
          Object.keys(this.players).forEach(function(address) {
            this.players[address].status = Status.Draw;
          }.bind(this))
        }
      }.bind(this));
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
      if (address === 'all') {
        Object.keys(this.players).forEach(function(addr) {
          this.players[addr].status = status;
        }.bind(this))
        return;
      }

      if (!this.players.hasOwnProperty(address)) {
        return;
      }
      this.players[address].status = status;
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
        events.forEach(function(e) {
          if (e.topics[0] === topicJoined.topics[0]) {
            players[e.args[0]] = {
              address: e.args[0],
              status: Status.Joined,
            };
          } else if (e.topics[0] === topicLeft.topics[0]) {
            delete players[e.args[0]];
          }
        }.bind(this))
        if (parseInt(info.winner) > 0) {
          players[info.winner].status = Status.Won;
        }
        this.players = players;
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
.text-target {
  font-size: 15px
}
</style>
