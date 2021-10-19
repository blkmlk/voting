<template>
  <v-container v-if="!web3Connected" fluid class="down-top-padding">
    <v-row justify="space-around" class="mb-2">
        <span class="group pa-2">
            <div class="col align-self-center">
                <v-alert type="error">Can't connect to web3</v-alert>
            </div>
        </span>
    </v-row>
</v-container>
<v-container v-else>
    <v-app-bar absolute color="white">
      <v-btn v-if="canGoBack" @click="goBack" class="mx-2 text-center" dark color="#F5F5F5">
        <v-icon dark color="#212121"> mdi-arrow-left-bold </v-icon>
      </v-btn>
      <v-toolbar-title class="ml-5 black--text">
          {{name}}
          {{contractState}}
        </v-toolbar-title>
      <v-spacer></v-spacer>
      <div v-if="canEdit">
        <v-btn v-if="needToSave" color="blue" class="mr-5" @click="save">Save</v-btn>
        <v-btn v-if="needToSave" color="grey" class="mr-5" @click="cancel">Cancel</v-btn>
        <v-dialog v-model="startDialog" max-width="500px">
            <template v-slot:activator="{on,attrs}">
              <v-btn v-if="canStart" color="red" v-bind="attrs" v-on="on">Start</v-btn>
            </template>
            <v-card>
              <v-card-title>
                <span class="text-h5">Set Election Duration</span>
              </v-card-title>
              <v-card-text>
                <v-container>
                  <v-row>
                    <v-col cols="12">
                      <v-subheader class="pl-0 mb-10">
                        Minutes
                      </v-subheader>
                      <v-slider v-model="inputMinutes" thumb-label="always" min="2" step="2" max="20"></v-slider>
                    </v-col>
                  </v-row>
                </v-container>
              </v-card-text>

              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="blue darken-1" text @click="start"> Start </v-btn>
                <v-btn color="blue darken-1" text @click="closeStartDialog"> Cancel </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </div>
    </v-app-bar>
    <v-row justify="center">
        <v-card v-for="(n, key) in candidates" :key="key" class="card text-center pb-5 ml-2 mr-2 mb-5">
            <img
              :src="getAvatar(n.imageValue)"
              alt="user"
              width="150px"
              class="img-fluid rounded-circle shadow-sm pt-5"
            />
            <h4 class="mt-2 mb-2 title blue-grey--text text--darken-2 font-weight-regular">{{n.name}} {{n.surname}}</h4>
          <div v-if="contractStarted">
            <v-btn v-if="canVote" elevation="2" @click="sendVote(key)"> Vote </v-btn>
            <div v-else-if="votedID === key">
                <v-btn v-if="canRetract" elevation="2" @click="sendRetract()" color="blue">
                  Retract in {{ voteRemainingTime }}</v-btn>
                <v-progress-linear color="blue" class="mt-6" v-else-if="contractExpired" elevation="2" :value="getVotes(key)" height="25">
                    <template v-slot:default="{ value }">
                        <strong>{{ Math.round(value*100)/100 }}%</strong>
                    </template>
                </v-progress-linear>
                <v-btn v-else elevation="2" disabled color="success">Voted</v-btn>
            </div>
            <v-progress-linear color="grey" class="mt-6" v-else-if="contractExpired" elevation="2" :value="getVotes(key)" height="25">
                <template v-slot:default="{ value }">
                    <strong>{{ Math.round(value * 100)/100 }}%</strong>
                </template>
            </v-progress-linear>
            <v-btn v-else elevation="2" disabled> Vote </v-btn>
          </div>
        </v-card>
        <v-card v-if="canEdit" class="card text-center">
            <v-container fill-height>
                <v-row align="center" justify="center">
                  <v-dialog v-model="addDialog" max-width="500px">
                    <template v-slot:activator="{on,attrs}">
                      <v-btn class="mx-2 text-center" fab dark color="indigo" v-bind="attrs" v-on="on">
                        <v-icon dark> mdi-plus </v-icon>
                      </v-btn>
                    </template>
                    <v-card>
                      <v-card-title>
                        <span class="text-h5">Add Candidate</span>
                      </v-card-title>
                      <v-card-text>
                        <v-container>
                          <v-row>
                            <v-col cols="12">
                              <v-text-field v-model="addCandidate.name" label="Name"></v-text-field>
                              <v-text-field v-model="addCandidate.surname" label="Surname"></v-text-field>
                            </v-col>
                          </v-row>
                        </v-container>
                      </v-card-text>

                      <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn color="blue darken-1" text @click="add"> Add </v-btn>
                        <v-btn color="blue darken-1" text @click="closeAddDialog"> Cancel </v-btn>
                      </v-card-actions>
                    </v-card>
                  </v-dialog>
                </v-row>
            </v-container>
        </v-card>
    </v-row>
</v-container>
</template>

<script>

import IElection from '@/contracts/IElection.json';
import Contract from 'web3-eth-contract';
import {AvatarGenerator} from 'random-avatar-generator';

export default {
  created() {
    this.address = this.$route.params.address;
    this.generator = new AvatarGenerator();

    this.currentTimestamp = parseInt(Date.now()/1000);

    this.timeInterval = setInterval(function (){
      this.currentTimestamp = parseInt(Date.now()/1000);
    }.bind(this), 1000);

    if (this.web3Connected) {
      this.checkContract();
      this.loadContractInfo(this.contract);
      this.loadVote();
    }
  },
  beforeDestroy() {
    clearInterval(this.timeInterval);
  },
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
    canStart() {
      if (this.candidates.length === 0) {
        return false;
      }

      return true;
    },
    canVote() {
      if (this.contractExpired) {
        return false;
      }

      if (this.vote === null) {
        return true;
      }

      return !this.vote.exists;
    },
    votedID() {
      if (this.vote === null || !this.vote.exists) {
        return false;
      }

      return parseInt(this.vote.candidateID);
    },
    canRetract() {
      if (this.canVote) {
        return false;
      }

      if (this.contractExpired) {
        return false;
      }

      return this.vote.expiresAt > this.currentTimestamp;
    },
    canEdit() {
      if (this.contractInfo === null) {
        return false;
      }

      if (this.contractInfo.started) {
        return false;
      }

      return this.contractInfo.owner === this.account && this.account.length > 0;
    },
    needToSave() {
      return this.addCandidates.length > 0;
    },
    contractState() {
      if (this.contractInfo === null) {
        return "";
      }

      if (!this.contractInfo.started) {
        return "not started";
      }

      if (this.contractExpired) {
        return "expired";
      }

      return "expires in " + this.contractRemainingTime;
    },
    contractStarted() {
      if (this.contractInfo === null) {
        return false;
      }

      return this.contractInfo.started;
    },
    contractExpired() {
      if (this.contractInfo === null) {
        return false;
      }

      return this.contractInfo.expiresAt <= this.currentTimestamp;
    },
    web3Connected() {
      return this.$store.state.web3 != null;
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
    web3() {
      return this.$store.state.web3;
    },
  },
  methods: {
    goBack() {
      this.$router.go(-1);
    },
    getAvatar(seed) {
      return this.generator.generateRandomAvatar(seed);
    },
    sendVote(id) {
      this.contract.methods.vote(id).send({from: this.account});
    },
    sendRetract() {
      this.contract.methods.retract().send({from: this.account});
    },
    getVotes(id) {
      if (this.totalVotes === 0) {
        return 0;
      }

      return (parseInt(this.candidates[id].votes) / this.totalVotes) * 100;
    },
    start() {
      this.contract.methods.start(this.inputMinutes*60).send({from: this.account}).on('receipt', function () {
        this.closeStartDialog();
      }.bind(this))
    },
    closeStartDialog() {
      this.startDialog = false;
    },
    closeAddDialog() {
      this.addDialog = false;
    },
    save() {
      this.contract.methods.addCandidates(this.addCandidates).send({from: this.account}).on('receipt', function(){
        this.addCandidates = [];
        this.editMode = false;
      }.bind(this));
    },
    cancel() {
      this.candidates = this.savedCandidates;
      this.addCandidates = [];
    },
    add(){
      if (this.addCandidate.name === "" || this.addCandidate.surname === "") {
        return;
      }

      let newCandidate = {
        name: this.addCandidate.name,
        surname: this.addCandidate.surname,
        imageValue: (Math.random() + 1).toString(36).substring(7),
        votes: 0,
        active: true,
      };

      let newCandidates = [];
      this.savedCandidates = this.candidates;

      for(let i = 0; i < this.candidates.length; i++) {
        newCandidates.push(this.candidates[i]);
      }

      newCandidates.push(newCandidate);
      this.addCandidates.push(newCandidate);

      this.candidates = newCandidates;

      this.addCandidate = {
        name: "",
        surname: "",
      };
      this.addDialog = false;
    },
    zeroPad (num, places) {
      return String(num).padStart(places, '0');
    },
    loadContractInfo(instance) {
      instance.methods.getInfo().call({from: this.account}).then(function(info){
        this.contractInfo = info;
        this.name = info.name;

        this.candidates = info.candidates;
        this.contractOwner = info.owner;
        this.contractExpiresAt = parseInt(info.expiresAt);
      }.bind(this))
    },
    loadVote() {
      if (this.contract == null) {
        return
      }

      this.contract.methods.getVote().call({from: this.account}).then(function (vote) {
        this.vote = vote;
      }.bind(this))
    },
    getRemainingTime(expiresAt, now) {
      let secondsLeft = expiresAt - now;
      let hours = Math.floor(secondsLeft/(60*60));
      let minutes = Math.floor(secondsLeft/60) - hours*60;
      let seconds = secondsLeft % 60;
      return this.zeroPad(hours, 2) + ":" + this.zeroPad(minutes, 2) + ":" + this.zeroPad(seconds, 2);
    },
    checkContract() {
      try {
        let contract = new Contract(IElection.abi, this.address);
        contract.setProvider(this.$store.state.web3.currentProvider);
        this.contract = contract;
      } catch(e) {
        console.log(e);
      }
    }
  },
  watch: {
    currentTimestamp(value) {
      if (this.contractExpired || this.contractExpiresAt === 0) {
        this.voteRemainingTime = "";
        this.contractRemainingTime = "";
        return;
      }

      this.contractRemainingTime = this.getRemainingTime(this.contractExpiresAt, value);

      if (this.vote == null) {
        return;
      }

      this.voteExpired = value >= this.vote.expiresAt;

      if (this.contractExpiresAt > this.vote.expiresAt) {
        if (this.vote.expiresAt <= value) {
          value = this.vote.expiresAt;
        }

        this.voteRemainingTime = this.getRemainingTime(this.vote.expiresAt, value);
      } else {
        this.voteRemainingTime = this.contractRemainingTime;
      }
    },
    newBlock() {
      this.loadContractInfo(this.contract);
      this.loadVote();
    },
    account() {
      this.loadVote();
    },
    web3Connected(connected) {
      if (!connected) {
        this.contract = null;
        return;
      }

      this.checkContract();
    },
    contract(instance) {
      this.loadContractInfo(instance);
      this.loadVote();
    },
    contractInfo(info) {
      let totalVotes = 0;
      let maxVotes = 0;

      for (let i = 0; i < info.candidates.length; i++) {
        let votes = parseInt(info.candidates[i].votes);

        totalVotes += votes;

        if (votes > maxVotes) {
          maxVotes = votes;
        }
      }

      this.totalVotes = totalVotes;
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