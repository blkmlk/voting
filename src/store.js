import Vue from 'vue'
import Vuex from 'vuex'
import getWeb3 from './getWeb3';
Vue.use(Vuex)

export default new Vuex.Store({
    state: {
        Sidebar_drawer: null,
        Customizer_drawer: false,
        SidebarColor: 'white',
        SidebarBg: '',
        web3: null,
        newBlock: null,
        accounts: [],
        networkId: 0,
      },
    mutations: {
        SET_SIDEBAR_DRAWER (state, payload) {
            state.Sidebar_drawer = payload
        },
        SET_CUSTOMIZER_DRAWER (state, payload) {
            state.Customizer_drawer = payload
        },
        SET_SIDEBAR_COLOR (state, payload) {
            state.SidebarColor = payload
        }, 
        SET_WEB3 (state, payload) {
            state.web3 = payload;

            state.web3.eth.subscribe('newBlockHeaders', async (error, event) => {
                state.newBlock = event;
            })
        },
        SET_ACCOUNTS (state, payload) {
            state.accounts = payload;
        },
        SET_NETWORK_ID (state, payload) {
            state.networkId = payload;
        }
    },
    actions: {
        REGISTER_WEB3({commit}) {
            let web3;
            getWeb3().then(instance => {
                web3 = instance;
                return instance;
            }).then(instance => {
                return instance.eth.getAccounts();
            }).then(function(accounts) {
                commit('SET_ACCOUNTS', accounts);

                setInterval(function () {
                    web3.eth.getAccounts().then(function (accounts) {
                        if (accounts[0] !== this.state.accounts[0]) {
                            commit('SET_ACCOUNTS', accounts);
                        }
                    }.bind(this))
                }.bind(this), 500);
                return web3.eth.net.getId();
            }.bind(this)).then(function (id) {
                commit('SET_NETWORK_ID', id);
                commit('SET_WEB3', web3);
            })
        }
    }
})