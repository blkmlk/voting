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
        <v-toolbar-title class="ml-5 black--text">
            <div v-if="contractExpired">{{name}} expired</div>
            <div v-else>{{ name }} expires in {{ contractRemainingTime }}</div>
        </v-toolbar-title>
        <v-spacer/>
        <div v-if="account == contractOwner && !contractExpired" class="mr-5">
            <v-btn v-if="!editMode" color="green" @click="edit">Edit</v-btn>
            <div v-else>
                <v-btn color="blue" @click="save">Save</v-btn>
                <v-btn class="ml-5" color="red" @click="cancel">Cancel</v-btn>
            </div>
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
            <v-btn v-if="vote == null && !contractExpired" elevation="2" @click="sendVote(key)"> Vote </v-btn>
            <div v-else-if="vote != null && vote.candidateID == key">
                <v-btn v-if="!voteExpired && !contractExpired" elevation="2" @click="sendRetract()" color="blue">
                  Retract in {{ voteRemainingTime }}</v-btn>
                <v-progress-linear color="blue" class="mt-6" v-else-if="contractExpired" elevation="2" :value="getVotes(key)" height="25">
                    <template v-slot:default="{ value }">
                        <strong>{{ Math.round(value*100)/100 }}%</strong>
                    </template>
                </v-progress-linear>
                <v-btn v-else elevation="2" :disabled="true" color="success">Voted</v-btn>
            </div>
            <v-progress-linear color="grey" class="mt-6" v-else-if="contractExpired" elevation="2" :value="getVotes(key)" height="25">
                <template v-slot:default="{ value }">
                    <strong>{{ Math.round(value * 100)/100 }}%</strong>
                </template>
            </v-progress-linear>
            <v-btn v-else elevation="2" disabled> Vote </v-btn>
        </v-card>
        <v-card v-if="editMode" class="card text-center">
            <v-container fill-height>
                <v-row class="pt-7" align="center" justify="center">
                    <v-btn class="mx-2 text-center" fab dark color="indigo" @click="add">
                        <v-icon dark>
                            mdi-plus
                        </v-icon>
                    </v-btn>
                </v-row>
                <v-row class="pr-5 pl-5">
                    <v-text-field label="Name" v-model="newName" hide-details="auto"></v-text-field>
                    <v-text-field label="Surname" v-model="newSurname" hide-details="auto"></v-text-field>
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
  mounted() {
    this.address = this.$route.params.address;
    this.generator = new AvatarGenerator();
    this.interval = setInterval(function (){
      this.currentTimestamp = parseInt(Date.now()/1000);
    }.bind(this), 1000)
  },
  beforeDestroy() {
    clearInterval(this.interval);
  },
  data() {
    return {
      name: "",
      address: "",
      contract: null,
      account: "",
      contractInfo: {},
      contractOwner: null,
      contractExpiresAt: 0,
      candidates: [],
      vote: null,
      voteExpired: false,
      contractExpired: false,
      contractRemainingTime: "",
      voteRemainingTime: "",
      generator: null,
      editMode: false,
      addCandidates: [],
      savedCandidates: [],
      newName: "",
      newSurname: "",
      totalVotes: 0,
      currentTimestamp: 0,
      interval: null,
    }
  },
  computed: {
    web3Connected() {
      return this.$store.state.web3 != null;
    },
    newBlock() {
      return this.$store.state.newBlock;
    },
  },
  methods: {
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
    edit(){
      this.editMode = true;
      this.savedCandidates = this.candidates;
    },
    save() {
      if (this.addCandidates.length === 0) {
        return;
      }

      this.contract.methods.addCandidates(this.addCandidates).send({from: this.account}).on('receipt', function(){
        this.addCandidates = [];
        this.editMode = false;
      }.bind(this));
    },
    cancel(){
      this.editMode = false;
      this.candidates = this.savedCandidates;
      this.addCandidates = [];
    },
    add(){
      if (this.newName === "" || this.newSurname === "") {
        return;
      }

      let newCandidate = {
        name: this.newName,
        surname: this.newSurname,
        imageValue: (Math.random() + 1).toString(36).substring(7),
        votes: 0,
        active: true,
      };

      let newCandidates = [];

      for(let i = 0; i < this.candidates.length; i++) {
        newCandidates.push(this.candidates[i]);
      }

      newCandidates.push(newCandidate);
      this.addCandidates.push(newCandidate);

      this.candidates = newCandidates;

      this.newName = "";
      this.newSurname = "";
    },
    zeroPad (num, places) {
      return String(num).padStart(places, '0');
    },
    loadContractInfo(instance) {
      instance.methods.getInfo().call({from: this.account}).then(function(info){
        this.contractInfo = info;
        this.name = info.name;

        if (info.vote == undefined || !info.vote.exists) {
          this.vote = null;
        } else {
          this.vote = info.vote;
        }

        this.candidates = info.candidates;
        this.contractOwner = info.owner;
        this.contractExpiresAt = parseInt(info.expiresAt);
      }.bind(this))
    },
    getRemainingTime(expiresAt, now) {
      let secondsLeft = expiresAt - now;
      let hours = Math.floor(secondsLeft/(60*60));
      let minutes = Math.floor(secondsLeft/60) - hours*60;
      let seconds = secondsLeft % 60;
      return this.zeroPad(hours, 2) + ":" + this.zeroPad(minutes, 2) + ":" + this.zeroPad(seconds, 2);
    }
  },
  watch: {
    currentTimestamp(value) {
      this.contractExpired = (this.contractExpiresAt !== 0 && value >= this.contractExpiresAt)

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
        this.voteRemainingTime = this.getRemainingTime(this.vote.expiresAt, value);
      } else {
        this.voteRemainingTime = this.contractRemainingTime;
      }
    },
    newBlock() {
      this.loadContractInfo(this.contract);
    },
    web3Connected(connected) {
      if (!connected) {
        this.contract = null;
        return;
      }

      try {
        let contract = new Contract(IElection.abi, this.address);
        contract.setProvider(this.$store.state.web3.currentProvider);
        this.contract = contract;
      } catch(e) {
        console.log(e);
      }
    },
    contractExpired(expired){
      if (expired) {
        this.loadContractInfo(this.contract);
      }
    },
    contract(instance) {
      this.account = this.$store.state.accounts[0];
      this.loadContractInfo(instance);
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