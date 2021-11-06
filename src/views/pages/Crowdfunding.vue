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
      <v-card style="width:500px">
        <v-card-title class="justify-center">
          <span class="text-h5 mt-2">{{contractInfo.name}}</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <span class="text-h5 mt-2">{{contractInfo.description}}</span>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <div class="pa-5">
          <v-progress-linear color="blue" class="mt-6" elevation="2" :value="amountRation" height="15">
            <template v-slot:default="{ value }">
              <strong>{{ Math.round(value * 100) / 100 }}%</strong>
            </template>
          </v-progress-linear>
          <v-row justify="end">
            <v-col class="col-3">
              <v-text-field type="number" placeholder="Amount" v-model="newAmount"></v-text-field>
            </v-col>
            <v-col class="col-3">
              <v-btn class="mt-5" color="green" :disabled="!canDonate" @click="donate">Donate</v-btn>
            </v-col>
          </v-row>
        </div>
      </v-card>
      <v-icon class="ml-15 mr-15" color="green" size="100" dark> mdi-arrow-right-bold-outline </v-icon>
      <v-card>
        <v-container>
          <v-row justify="center" class="mb-10">
            <img
                :src="getAvatar(contractInfo.target)"
                alt="user"
                width="160px"
                class="img-fluid rounded-circle shadow-sm pt-5"
            />
          </v-row>
          <v-row class="ml-2 mr-2" justify="center">
            <h4 class="mt-2 mb-2 title blue-grey--text text--darken-2 font-weight-regular">{{contractInfo.target}}</h4>
          </v-row>
        </v-container>
        </v-card>
    </v-row>
</v-container>
</template>

<script>

import ICrowdfunding from '@/contracts/ICrowdfunding.json';
import Contract from 'web3-eth-contract';
import {AvatarGenerator} from 'random-avatar-generator';
import {getAvatar} from "../../helpers";

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
      address: "",
      contract: null,
      contractInfo: {},
      contractOwner: null,
      contractExpiresAt: 0,
      contractRemainingTime: "",
      newAmount: 0,
      generator: null,
      editMode: false,
      currentTimestamp: 0,
      timeInterval: null,
    }
  },
  computed: {
    amountRation() {
      if (this.contractInfo.started === 0) {
        return;
      }

      return (this.contractInfo.currentAmount / this.contractInfo.targetAmount) * 100;
    },
    canGoBack() {
      return window.prevUrl !== "/";
    },
    canStart() {
      return parseInt(this.contractInfo.startedAt) === 0;
    },
    canDonate() {
      return parseInt(this.newAmount) > 0;
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
    start() {
      this.contract.methods.start(this.inputMinutes*60).send({from: this.account}).on('receipt', function () {
        this.closeStartDialog();
      }.bind(this))
    },
    donate() {
      let amount = parseFloat(this.newAmount);

      if (amount <= 0) {
        return;
      }

      if (amount > this.contractInfo.targetAmount) {
        amount = this.contractInfo.targetAmount;
      }

      this.newAmount = amount;

      let value = this.web3.utils.toWei(amount.toString(), 'ether');
      this.contract.methods.donate("donate").send({from: this.account, value: value});
    },
    closeStartDialog() {
      this.startDialog = false;
    },
    closeAddDialog() {
      this.addDialog = false;
    },
    zeroPad (num, places) {
      return String(num).padStart(places, '0');
    },
    loadContractInfo(instance) {
      instance.methods.getInfo().call({from: this.account}).then(function(info){
        this.contractInfo = info;
        this.name = info.name;

        this.contractOwner = info.owner;
        this.contractExpiresAt = parseInt(info.expiresAt);
        console.log(info);
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
        let contract = new Contract(ICrowdfunding.abi, this.address);
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
        this.contractRemainingTime = "";
        return;
      }

      this.contractRemainingTime = this.getRemainingTime(this.contractExpiresAt, value);
    },
    newBlock() {
      this.loadContractInfo(this.contract);
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