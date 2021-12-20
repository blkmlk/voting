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
const ethers = require("ethers");

export default {
  name: "Factory",
  props: [ "info" ],
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
        targetAddress: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
      },
      factory: null,
      crowdfundingList: [],
      crowdfundingInfo:[],
    }
  },
  created() {
    if (this.connected) {
      this.loadContract();
    }
  },
  computed: {
    connected() {
      return this.$store.state.ethers != null;
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
          target_amount: ethers.utils.formatEther(this.crowdfundingInfo[i].targetAmount).toString(),
          current_amount: ethers.utils.formatEther(this.crowdfundingInfo[i].currentAmount).toString(),
          address: this.crowdfundingInfo[i].target,
          expires: this.getExpiration(this.crowdfundingInfo[i].expiresAt),
        })
      }

      return items;
    },
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

      let targetAmount = ethers.utils.parseEther(this.newCrowdfunding.targetAmount).toString();

      this.factory.create(
          this.newCrowdfunding.name,
          this.newCrowdfunding.description,
          targetAmount,
          this.newCrowdfunding.targetAddress
      ).then(function () {
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
      return this.crowdfundingList[idx].address;
    },
    loadContract() {
      try {
        this.factory = new ethers.Contract(
            this.info.CrowdfundingFactory.address,
            this.info.CrowdfundingFactory.abi,
            this.$store.state.ethers.getSigner(0),
        );
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
          let info = await e.getInfo();
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

      factory.list().then(function (items) {
        if (items === null) {
          return
        }

        let contracts = [];
        for (const address of items) {
          let contract = new ethers.Contract(
              address,
              this.info.Crowdfunding.abi,
              this.$store.state.ethers.getSigner(0),
          );
          contracts.push(contract);
        }

        this.crowdfundingList = contracts;
      }.bind(this))

    },
    connected(connected) {
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