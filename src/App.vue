<template>
  <v-app id="materialpro" :class="`${!$vuetify.breakpoint.smAndDown ? 'full-sidebar' : 'mini-sidebar'}`">
      <router-view />
  </v-app>

</template>

<script>

export default {
  name: 'App',
  beforeCreate() {
    this.$store.dispatch('REGISTER_WEB3');
  },
};
</script>
