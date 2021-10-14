<template>
  <div>
    <v-data-table :headers="headers" :items="getElections" @click:row="goToElection">
    </v-data-table>
  </div>
</template>

<script>
import Contract from "web3-eth-contract";
import Factory from '@/contracts/Factory.json'
import IElection from '@/contracts/IElection.json'

export default {
  name: "Factory",
  data() {
    return {
      headers: [
        {text: "Name", value: "name"},
        {text: "Owner", value: "owner"},
        {text: "Expires", value: "expires"}
      ],
      factory: null,
      elections: [],
      electionInfo:[],
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
    getElections() {
      let elections = [];
      for (let i = 0; i < this.electionInfo.length; i++) {
        elections.push({
          id: i,
          name: this.electionInfo[i].name,
          owner: this.electionInfo[i].owner,
          expires: this.getExpiration(this.electionInfo[i].expiresAt),
        })
      }

      return elections;
    },
  },
  methods: {
    goToElection(value) {
      this.$router.push("/election/" + this.getAddress(value.id))
    },
    getExpiration(expiresAt) {
      let now = Date.now();

      if (expiresAt * 1000 <= now) {
        return "expired";
      }

      new Date(expiresAt * 1000).toString();
    },
    getAddress(idx) {
      return this.elections[idx]['_address'];
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
    async elections(elections) {
      let promises = [];
      for (let i = 0; i < elections.length; i++) {
        let e = elections[i];
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
      this.electionInfo = newInfo;
    },
    factory(factory) {
      if (factory === null) {
        return;
      }

      factory.methods.getElections().call({from: this.account}).then(function (elections) {
        let contracts = [];
        for (const e of elections) {
          let contract = new Contract(IElection.abi, e);
          contract.setProvider(this.$store.state.web3.currentProvider);
          contracts.push(contract);
        }

        this.elections = contracts;
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