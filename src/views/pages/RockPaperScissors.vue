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
        <v-card class="card text-center">
            <v-container fill-height>
                <v-row align="center" justify="center">
                  <v-btn class="mx-2 text-center" dark color="indigo">Join</v-btn>
                </v-row>
            </v-container>
        </v-card>
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
      inputMinutes: 10,
      startDialog: false,
      addDialog: false,
      addCandidate: {
        name: "",
        surname: "",
      },
      address: "",
      contract: null,
      contractInfo: null,
      contractOwner: null,
      contractExpiresAt: 0,
      candidates: [],
      vote: null,
      voteExpired: false,
      contractRemainingTime: "",
      voteRemainingTime: "",
      generator: null,
      editMode: false,
      addCandidates: [],
      savedCandidates: [],
      totalVotes: 0,
      currentTimestamp: 0,
      timeInterval: null,
    }
  },
  computed: {
    canGoBack() {
      return window.prevUrl !== "/";
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
    getAvatar(seed) {
      return this.generator.generateRandomAvatar(seed);
    },
    zeroPad (num, places) {
      return String(num).padStart(places, '0');
    },
    loadContractInfo(instance) {
      instance.getInfo().then(function(info){
        this.contractInfo = info;
        this.name = info.name;
        this.contractOwner = info.owner;
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
    contractInfo(info) {
    }
  }
}
</script>

<style>
.card {
  height: 290px;
  width: 250px;
}
</style>