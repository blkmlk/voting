<template>
  <v-container>
    <v-row justify="center">
      <v-data-table no-data-text="" height="500" :headers="headers" :items="getCrowdfundingItems" @click:row="goToCrowdfunding">
        <template v-slot:top>
          <v-toolbar flat>
            <v-toolbar-title>Crowdfunding</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-dialog v-model="newDialog" max-width="500px">
              <template v-slot:activator="{ on, attrs }">
                <v-btn color="primary" dark v-bind="attrs" v-on="on">
                  Create
                </v-btn>
              </template>
              <v-card>
                <v-card-title>
                  <span class="text-h5">New Crowdfunding</span>
                </v-card-title>
                <v-card-text>
                  <v-container>
                    <v-row>
                      <v-col cols="12">
                        <v-text-field v-model="newCrowdfunding.name" label="Name"></v-text-field>
                        <v-text-field v-model="newCrowdfunding.description" label="Description"></v-text-field>
                        <v-text-field v-model="newCrowdfunding.targetAmount" label="Target Amount"></v-text-field>
                        <v-text-field v-model="newCrowdfunding.targetAddress" label="Target Address"></v-text-field>
                      </v-col>
                    </v-row>
                  </v-container>
                </v-card-text>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn color="blue darken-1" text @click="create"> Create </v-btn>
                  <v-btn color="blue darken-1" text @click="closeNewDialog"> Cancel </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </v-toolbar>
        </template>
      </v-data-table>
    </v-row>
  </v-container>
</template>

<script>
import Contract from "web3-eth-contract";
import Factory from '@/contracts/Factory.json'
import ICrowdfunding from '@/contracts/ICrowdfunding.json'

export default {
  name: "Factory",
  data() {
    return {
      headers: [
        {text: "Name", value: "name"},
        {text: "Owner", value: "owner"},
        {text: "Target", value: "target_amount"},
        {text: "Collected", value: "current_amount"},
        {text: "To", value: "address"},
        {text: "Expires At", value: "expires"}
      ],
      newDialog: false,
      newCrowdfunding: {
        name: "",
        description: "",
        targetAmount: 0,
        targetAddress: "0x879CC2bf498892D5deDb75C591625bAdc9499Df9",
      },
      factory: null,
      crowdfundingList: [],
      crowdfundingInfo:[],
    }
  },
  created() {
    if (this.web3Connected) {
      this.loadContract();
    }
  },
  computed: {
    web3Connected() {
      return this.$store.state.web3 != null;
    },
    newBlock() {
      return this.$store.state.newBlock;
    },
    account() {
      return this.$store.state.accounts[0];
    },
    networkId() {
      return this.$store.state.networkId;
    },
    getCrowdfundingItems() {
      let items = [];
      for (let i = 0; i < this.crowdfundingInfo.length; i++) {
        items.push({
          id: i,
          name: this.crowdfundingInfo[i].name,
          owner: this.crowdfundingInfo[i].owner,
          target_amount: this.web3.utils.fromWei(this.crowdfundingInfo[i].targetAmount, 'ether'),
          current_amount: this.web3.utils.fromWei(this.crowdfundingInfo[i].currentAmount, 'ether'),
          address: this.crowdfundingInfo[i].target,
          expires: this.getExpiration(this.crowdfundingInfo[i].expiresAt),
        })
      }

      return items;
    },
    web3() {
      return this.$store.state.web3;
    }
  },
  methods: {
    create() {
      if (this.newCrowdfunding.name.length === 0) {
        return;
      }

      if (this.newCrowdfunding.description.length === 0) {
        return;
      }

      if (this.newCrowdfunding.targetAmount <= 0) {
        return;
      }

      if (this.newCrowdfunding.targetAddress.length === 0) {
        return;
      }

      if (this.factory === null) {
        return;
      }

      let targetAmount = this.web3.utils.toWei(this.newCrowdfunding.targetAmount, 'ether');

      this.factory.methods.createCrowdfunding(
          this.newCrowdfunding.name,
          this.newCrowdfunding.description,
          targetAmount,
          this.newCrowdfunding.targetAddress
      ).send({from: this.account}).on('receipt', function () {
        this.newCrowdfunding = {
          name: "",
          description: "",
          targetAmount: 0,
          targetAddress: "",
        }
        this.newDialog = false;
      }.bind(this))
    },
    closeNewDialog() {
      this.newDialog = false;
    },
    goToCrowdfunding(value) {
      this.$router.push("/crowdfunding/" + this.getAddress(value.id))
    },
    getExpiration(expiresAt) {
      if (parseInt(expiresAt) === 0) {
        return "not started"
      }

      let now = Date.now();

      if (expiresAt * 1000 <= now) {
        return "expired";
      }

      return (new Date(expiresAt * 1000)).toString();
    },
    getAddress(idx) {
      return this.crowdfundingList[idx]['_address'];
    },
    loadContract() {
      try {
        let contract = new Contract(Factory.abi, Factory.networks[this.networkId].address);
        contract.setProvider(this.$store.state.web3.currentProvider);
        this.factory = contract;
      } catch(e) {
        console.log(e);
      }
    }
  },
  watch: {
    async crowdfundingList(items) {
      let promises = [];
      for (let i = 0; i < items.length; i++) {
        let e = items[i];
        promises.push(async function() {
          let info = await e.methods.getInfo().call();
          return {
            id: i,
            info: info,
          }
        }())
      }

      let newInfo = [];
      await Promise.all(promises).then(function(result) {
        for (const r of result) {
          newInfo[r.id] = r.info;
        }
      })
      this.crowdfundingInfo = newInfo;
    },
    factory(factory) {
      if (factory === null) {
        return;
      }

      factory.methods.getCrowdfunding().call({from: this.account}).then(function (items) {
        if (items === null) {
          return
        }

        let contracts = [];
        for (const c of items) {
          let contract = new Contract(ICrowdfunding.abi, c);
          contract.setProvider(this.$store.state.web3.currentProvider);
          contracts.push(contract);
        }

        this.crowdfundingList = contracts;
      }.bind(this))

    },
    web3Connected(connected) {
      if (!connected) {
        this.factory = null;
        return;
      }
      this.loadContract();
    },
    newBlock() {
      this.loadContract();
    }
  }
}
</script>

<style>

</style>