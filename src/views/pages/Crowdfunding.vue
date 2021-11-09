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
        <v-dialog v-if="canStart" v-model="startDialog" max-width="500px">
            <template v-slot:activator="{on,attrs}">
              <v-btn color="red" v-bind="attrs" v-on="on">Start</v-btn>
            </template>
            <v-card>
              <v-card-title>
                <span class="text-h5">Set Crowdfunding Duration</span>
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
                <v-btn color="blue darken-1" text @click="startDialog = false"> Cancel </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
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
        <div class="pr-5 pl-5">
          <v-progress-linear color="blue" class="mt-6" elevation="2" :value="amountRatio" height="20">
            <template v-slot:default="{ value }">
              {{ Math.round(value * 100) / 100 }}%
            </template>
          </v-progress-linear>
          <v-container>
              <div class="d-flex justify-end">
                {{currentAmount}}
                /
                {{targetAmount}}
                <v-icon class="mb-1" size="20" color="black" dark>mdi-ethereum</v-icon>
              </div>
          </v-container>
          <v-container>
            <div v-if="canDonate" class="d-flex justify-end">
              <v-col class="col-3">
                <v-dialog v-model="donationDialog" max-width="500px">
                  <template v-slot:activator="{on,attrs}">
                    <v-btn class="mt-5" color="green" @click="donationDialog = true">Donate</v-btn>
                  </template>
                  <v-card>
                    <v-card-title>
                      <span class="text-h5">Donate</span>
                    </v-card-title>
                    <v-card-text>
                      <v-container>
                        <v-row>
                          <v-col cols="12">
                            <v-subheader class="pl-0">
                              Message
                            </v-subheader>
                            <v-text-field v-model="newDonation.message"></v-text-field>
                            <v-subheader class="pl-0">
                              Amount
                            </v-subheader>
                            <v-text-field type="number" v-model="newDonation.amount"></v-text-field>
                          </v-col>
                        </v-row>
                      </v-container>
                    </v-card-text>

                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn color="blue darken-1" text @click="donate"> Donate </v-btn>
                      <v-btn color="blue darken-1" text @click="donationDialog = false"> Cancel </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
              </v-col>
            </div>
            <v-row v-else-if="canWithdraw" class="d-flex justify-end mr-3">
              <v-col v-if="!isTarget" class="col-3">
                <v-text-field disabled :value="currentDonationAmount"></v-text-field>
              </v-col>
              <v-col class="col-3">
                <v-btn class="mt-5" color="blue" @click="withdraw">Withdraw</v-btn>
              </v-col>
            </v-row>
          </v-container>
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
import {getAvatar, getRemainingTime} from "../../helpers";

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
      donationDialog: false,
      address: "",
      contract: null,
      contractInfo: {},
      donation: {},
      contractExpiresAt: 0,
      contractRemainingTime: "",
      newDonation: {
        message: "",
        amount: 0,
      },
      generator: null,
      currentTimestamp: 0,
      timeInterval: null,
    }
  },
  computed: {
    targetAmount() {
      if (this.contractInfo.targetAmount === undefined) {
        return "0";
      }

      return this.web3.utils.fromWei(this.contractInfo.targetAmount, 'ether');
    },
    currentAmount() {
      if (this.contractInfo.currentAmount === undefined) {
        return "0";
      }

      return this.web3.utils.fromWei(this.contractInfo.currentAmount, 'ether');
    },
    amountRatio() {
      if (this.contractInfo.startedAt === 0) {
        return;
      }

      return (this.contractInfo.currentAmount / this.contractInfo.targetAmount) * 100;
    },
    currentDonationAmount() {
      if (this.donation.amount === undefined) {
        return "0";
      }

      return this.web3.utils.fromWei(this.donation.amount, 'ether');
    },
    isTarget() {
      return this.contractInfo.target === this.account;
    },
    canWithdraw() {
      if (this.isTarget) {
        return this.contractInfo.ended && this.contractInfo.startedAt > 0 && !this.contractInfo.withdrawn;
      }

      return !this.contractInfo.ended && this.contractExpired && this.donation.createdAt > 0;
    },
    canGoBack() {
      return window.prevUrl !== "/";
    },
    canStart() {
      return parseInt(this.contractInfo.startedAt) === 0 &&
          !this.contractInfo.ended &&
          this.contractInfo.owner === this.account;
    },
    canDonate() {
      return parseInt(this.contractInfo.startedAt) > 0 &&
          !this.contractInfo.ended &&
          !this.contractExpired &&
          this.contractInfo.target !== this.account &&
          parseInt(this.donation.createdAt) === 0;
    },
    contractState() {
      if (this.contractInfo === null) {
        return "";
      }

      if (this.contractInfo.startedAt === "0") {
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
        this.startDialog = false;
      }.bind(this))
    },
    donate() {
      let amount = parseFloat(this.newDonation.amount);

      if (amount <= 0) {
        return;
      }

      if (amount > this.contractInfo.targetAmount) {
        amount = this.contractInfo.targetAmount;
      }

      this.newDonation = {
        message: "",
        amount: 0,
      }

      let value = this.web3.utils.toWei(amount.toString(), 'ether');
      this.contract.methods.
        donate(this.newDonation.message).
        send({from: this.account, value: value}).
        on('receipt', function() {
          this.donationDialog = false;
      }.bind(this));
    },
    withdraw() {
      this.contract.methods.withdraw().send({from: this.account}).on('receipt', function () {
        this.loadContractInfo(this.contract)
      }.bind(this));
    },
    loadContractInfo(instance) {
      instance.methods.getInfo().call({from: this.account}).then(function(info){
        this.contractInfo = info;
        this.name = info.name;

        this.contractExpiresAt = parseInt(info.expiresAt);
        console.log(info);
      }.bind(this))
      instance.methods.getDonation().call({from: this.account}).then(function (donation) {
        this.donation = donation;
      }.bind(this))
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

      this.contractRemainingTime = getRemainingTime(this.contractInfo.expiresAt, value);
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