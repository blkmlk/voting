<template>
<v-container>
    <v-app-bar absolute color="white">
      <v-btn v-if="canGoBack" @click="goBack" class="mx-2 text-center" dark color="#F5F5F5">
        <v-icon dark color="#212121"> mdi-arrow-left-bold </v-icon>
      </v-btn>
      <v-toolbar-title class="ml-5 black--text">
          Crowdfunding
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
      <v-card class="top-card">
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
                    <v-btn color="green" @click="donationDialog = true">Donate</v-btn>
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
      <v-icon class="ml-15 mr-15" color="blue" size="100" dark> mdi-arrow-right-bold-outline </v-icon>
      <v-card class="top-card">
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
  <v-row class="d-flex justify-center mt-10">
          <v-card class="log-card">
            <v-card-title>
              Payments
            </v-card-title>
            <v-timeline dense class="overflow-y-auto" style="max-height: 270px">
              <v-timeline-item
                  v-for="donation in donations"
                  small
                  color="blue"
                  icon="mbi-buffer"
              >
                <v-card color="blue lighten-4" class="elevation-2 log-item-card">
                  <v-card-text class="d-flex justify-space-between">
                    <div>
                      {{donation.message}}
                    </div>
                    <div>
                      {{donation.amount}}
                      <v-icon class="mb-1" style="width: 10px;" size="20" color="black" dark>mdi-ethereum</v-icon>
                    </div>
                  </v-card-text>
                </v-card>
              </v-timeline-item>
            </v-timeline>
          </v-card>
  </v-row>
</v-container>
</template>

<script>

const ethers = require("ethers");
import {AvatarGenerator} from 'random-avatar-generator';
import {getAvatar, getRemainingTime} from "../../helpers";

export default {
  props: ['info'],
  created() {
    this.address = this.$route.params.address;
    this.generator = new AvatarGenerator();

    this.currentTimestamp = parseInt(Date.now()/1000);

    this.timeInterval = setInterval(function (){
      this.currentTimestamp = parseInt(Date.now()/1000);
    }.bind(this), 1000);

    if (this.connected) {
      this.loadContract();
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
      donations: [],
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

      return ethers.utils.formatEther(this.contractInfo.targetAmount).toString();
    },
    currentAmount() {
      if (this.contractInfo.currentAmount === undefined) {
        return "0";
      }

      return ethers.utils.formatEther(this.contractInfo.currentAmount).toString();
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

      return ethers.utils.formatEther(this.donation.amount).toString();
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

      if (this.contractInfo.ended) {
        return "ended";
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
    start() {
      this.contract.start(this.inputMinutes*60).then(function () {
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

      let value = ethers.utils.parseEther(amount.toString()).toString();
      this.contract.donate(this.newDonation.message, {value: value}).then(function() {
          this.donationDialog = false;
      }.bind(this));

      this.newDonation = {
        message: "",
        amount: 0,
      }
    },
    getDonation() {
      this.contract.getDonation().then(function (donation) {
        this.donation = donation;
      }.bind(this))
    },
    withdraw() {
      this.contract.withdraw().then(function () {
        this.loadContractInfo(this.contract)
      }.bind(this));
    },
    loadContractInfo(instance) {
      instance.getInfo().then(function(info){
        this.contractInfo = info;
        this.name = info.name;

        this.contractExpiresAt = parseInt(info.expiresAt);

        this.readLogs();
      }.bind(this))
      this.getDonation();
    },
    loadContract() {
      try {
        this.contract = new ethers.Contract(
            this.address,
            this.info.Crowdfunding.abi,
            this.$store.state.ethers.getSigner(0),
        );
      } catch(e) {
        console.log(e);
      }
    },
    readLogs() {
      this.contract.queryFilter(
          this.contract.filters.NewDonation(),
          parseInt(this.contractInfo.startBlock),
      ).then(function (events) {
        let donations = [];
        events.forEach(event => {
          donations.unshift({
            message: event.args.message,
            amount: ethers.utils.formatEther(event.args.amount).toString(),
            blockNumber: event.blockNumber,
          })
        })
        this.donations = donations;
      }.bind(this))
    }
  },
  watch: {
    account() {
      this.getDonation();
    },
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

      this.loadContract();
    },
    contract(instance) {
      this.loadContractInfo(instance);
    },
  }
}
</script>

<style>
.top-card {
  width: 580px;
}
.log-card {
  width: 400px;
  height: 350px;
}
.log-item-card {
  width: 250px;
}
</style>