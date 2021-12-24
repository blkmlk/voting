import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import router from './router'
import store from './store'
import './plugins/base'
import VueNativeSock from 'vue-native-websocket';

Vue.config.productionTip = false
Vue.use(VueNativeSock, '', {connectManually: true});

new Vue({
    vuetify,
    store,
    router,
    render: h => h(App)
}).$mount('#app')
