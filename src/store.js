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
            state.web3 = payload.web3;
            state.accounts = payload.accounts;

            state.web3.eth.subscribe('newBlockHeaders', async (error, event) => {
                state.newBlock = event;
            })
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
            }).then(accounts => {
                commit('SET_WEB3', {
                    web3: web3,
                    accounts: accounts,
                });
            })
        }
    }
})