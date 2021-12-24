<template>
<v-container>
    <v-app-bar absolute color="white">
      <v-btn v-if="canGoBack" @click="goBack" class="mx-2 text-center" dark color="#F5F5F5">
        <v-icon dark color="#212121"> mdi-arrow-left-bold </v-icon>
      </v-btn>
      <v-toolbar-title class="ml-5 black--text">
          {{name}}
        </v-toolbar-title>
      <v-spacer></v-spacer>
    </v-app-bar>
    <v-row justify="center">
            <v-container fill-height>
                <v-row align="center" justify="center">
                  <v-btn v-if="canJoin" class="mx-2 text-center" dark color="indigo" @click="join">Join</v-btn>
                  <v-btn v-else-if="canLeave" class="mx-2 text-center" dark color="red" @click="leave">Leave</v-btn>
                </v-row>
            </v-container>
    </v-row>
</v-container>
</template>

<script>

const ethers = require("ethers");
import {AvatarGenerator} from 'random-avatar-generator';

export default {
  created() {
    this.address = this.$route.params.address;
    this.generator = new AvatarGenerator();

    if (this.connected) {
      this.checkContract();
      this.loadContractInfo(this.contract);
    }
  },
  props: ["info"],
  data() {
    return {
      name: "",
      address: "",
      contract: null,
      contractInfo: null,
      freeSpots: 0,
      contractOwner: null,
      generator: null,
      joined: false,
      players: [],
    }
  },
  computed: {
    canGoBack() {
      return window.prevUrl !== "/";
    },
    canJoin() {
      if (this.contract == null || this.freeSpots <= 0) {
        return false;
      }
      return !this.joined;
    },
    canLeave() {
      if (this.contract == null) {
        return false;
      }

      return this.joined;
    },
    connected() {
      return this.$store.state.ethers != null;
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
    join() {
      this.contract.join({value: this.contractInfo.bet});
    },
    leave() {
      this.contract.leave();
    },
    getAvatar(seed) {
      return this.generator.generateRandomAvatar(seed);
    },
    loadContractInfo(instance) {
      instance.getInfo().then(function(info){
        this.contractInfo = info;
        this.name = info.name;
        this.contractOwner = info.owner;
      }.bind(this))

      instance.freeSpots().then(function (value) {
        this.freeSpots = value;
      }.bind(this));

      instance.players(this.account).then(function(player) {
        this.joined = player.exists;
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