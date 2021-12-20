<template>
  <v-container>
    <v-row justify="center">
      <v-data-table no-data-text="" height="500" :headers="headers" :items="getElections" @click:row="goToElection">
        <template v-slot:top>
          <v-toolbar flat>
            <v-toolbar-title>Elections</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-dialog v-model="newDialog" max-width="500px">
              <template v-slot:activator="{ on, attrs }">
                <v-btn color="primary" dark v-bind="attrs" v-on="on">
                  Create
                </v-btn>
              </template>
              <v-card>
                <v-card-title>
                  <span class="text-h5">New Election</span>
                </v-card-title>
                <v-card-text>
                  <v-container>
                    <v-row>
                      <v-col cols="12">
                        <v-text-field v-model="newElectionName" label="Name"></v-text-field>
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
  props: ['info'],
  data() {
    return {
      headers: [
        {text: "Name", value: "name"},
        {text: "Owner", value: "owner"},
        {text: "Candidates", value: "candidates"},
        {text: "Votes", value: "votes"},
        {text: "Expires At", value: "expires"}
      ],
      newDialog: false,
      newElectionName: "",
      factory: null,
      elections: [],
      electionInfo:[],
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
    getElections() {
      let elections = [];
      for (let i = 0; i < this.electionInfo.length; i++) {
        elections.push({
          id: i,
          name: this.electionInfo[i].name,
          owner: this.electionInfo[i].owner,
          candidates: this.electionInfo[i].candidates.length,
          votes: this.electionInfo[i].votes,
          expires: this.getExpiration(this.electionInfo[i].expiresAt),
        })
      }

      return elections;
    },
  },
  methods: {
    create() {
      if (this.newElectionName.length === 0) {
        return;
      }

      if (this.factory === null) {
        return;
      }

      this.factory.create(this.newElectionName).then(function () {
        this.newElectionName = "";
        this.newDialog = false;
      }.bind(this))

      return;
    },
    closeNewDialog() {
      this.newDialog = false;
    },
    goToElection(value) {
      this.$router.push("/election/" + this.getAddress(value.id))
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
      return this.elections[idx].address;
    },
    loadContract() {
      try {
        this.factory = new ethers.Contract(
            this.info.ElectionFactory.address,
            this.info.ElectionFactory.abi,
            this.$store.state.ethers.getSigner(0));
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
      this.electionInfo = newInfo;
    },
    factory(factory) {
      if (factory === null) {
        return;
      }

      factory.list().then(function (elections) {
        let contracts = [];
        for (const address of elections) {
          let contract = new ethers.Contract(
              address,
              this.info.Election.abi,
              this.$store.state.ethers.getSigner(0),
          );
          contracts.push(contract);
        }

        this.elections = contracts;
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