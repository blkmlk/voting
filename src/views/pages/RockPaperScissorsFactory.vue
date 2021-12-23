<template>
  <v-container>
    <v-row justify="center">
      <v-data-table no-data-text="" height="500" :headers="headers" :items="getRPSItems" @click:row="goToRPS">
        <template v-slot:top>
          <v-toolbar flat>
            <v-toolbar-title>Rock Paper Scissors</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-dialog v-model="newDialog" max-width="500px">
              <template v-slot:activator="{ on, attrs }">
                <v-btn color="primary" dark v-bind="attrs" v-on="on">
                  Create
                </v-btn>
              </template>
              <v-card>
                <v-card-title>
                  <span class="text-h5">New Game</span>
                </v-card-title>
                <v-card-text>
                  <v-container>
                    <v-row>
                      <v-col cols="12">
                        <v-text-field v-model="newGame.name" label="Name"></v-text-field>
                        <v-text-field v-model="newGame.bet" label="Your bet"></v-text-field>
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
        {text: "Bet", value: "bet"},
      ],
      newDialog: false,
      newGame: {
        name: "",
        bet: 0,
      },
      factory: null,
      gameList: [],
      gameInfo:[],
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
    getRPSItems() {
      let items = [];
      for (let i = 0; i < this.gameInfo.length; i++) {
        items.push({
          id: i,
          name: this.gameInfo[i].name,
          owner: this.gameInfo[i].owner,
          bet: ethers.utils.formatEther(this.gameInfo[i].bet).toString(),
        })
      }

      return items;
    },
  },
  methods: {
    create() {
      if (this.newGame.name.length === 0) {
        return;
      }

      if (this.newGame.bet <= 0) {
        return;
      }

      if (this.factory === null) {
        return;
      }

      let bet = ethers.utils.parseEther(this.newGame.bet).toString();

      this.factory.create(this.newGame.name, bet).then(function () {
        this.newGame = {
          name: "",
          bet: 0,
        }
        this.newDialog = false;
      }.bind(this))
    },
    closeNewDialog() {
      this.newDialog = false;
    },
    goToRPS(value) {
      this.$router.push("/rps/" + this.getAddress(value.id))
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
      return this.gameList[idx].address;
    },
    loadContract() {
      try {
        this.factory = new ethers.Contract(
            this.info.RockPaperScissorsFactory.address,
            this.info.RockPaperScissorsFactory.abi,
            this.$store.state.ethers.getSigner(0),
        );
      } catch(e) {
        console.log(e);
      }
    }
  },
  watch: {
    async gameList(items) {
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
      this.gameInfo = newInfo;
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
              this.info.RockPaperScissors.abi,
              this.$store.state.ethers.getSigner(0),
          );
          contracts.push(contract);
        }

        this.gameList = contracts;
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