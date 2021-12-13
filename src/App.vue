<template>
  <v-app id="materialpro" :class="`${!$vuetify.breakpoint.smAndDown ? 'full-sidebar' : 'mini-sidebar'}`">
    <v-container v-if="!connected" fluid class="down-top-padding">
      <v-row justify="space-around" class="mb-2">
        <span class="group pa-2">
            <div class="col align-self-center">
                <v-alert type="error">Can't connect to web3</v-alert>
            </div>
        </span>
      </v-row>
    </v-container>
    <router-view v-else />
  </v-app>

</template>

<script>

export default {
  name: 'App',
  beforeCreate() {
    this.$store.dispatch('REGISTER_ETHERS');
  },
  computed: {
    connected() {
      return this.$store.state.ethers != null;
    },
  }
};
</script>
