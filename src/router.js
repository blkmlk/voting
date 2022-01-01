import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)
const info = require('./artifacts/info.json')

let router = new Router({
    mode: 'hash',
    base: process.env.BASE_URL,
    routes: [
        {
            path: '/',
            redirect: 'election',
            component: () => import('@/layouts/Layout'),
            children: [
                // Components
                {
                    name: 'Elections',
                    path: 'election',
                    component: () => import('@/views/pages/ElectionFactory'),
                    props: {
                        info: info,
                    }
                },
                {
                    name: 'Election',
                    path: 'election/:address',
                    component: () => import('@/views/pages/Election'),
                    props: {
                        info: info,
                    }
                },
                {
                    name: 'Crowdfunding Factory',
                    path: 'crowdfunding',
                    component: () => import('@/views/pages/CrowdfundingFactory'),
                    props: {
                        info: info,
                    }
                },
                {
                    name: 'Crowdfunding',
                    path: 'crowdfunding/:address',
                    component: () => import('@/views/pages/Crowdfunding'),
                    props: {
                        info: info,
                    }
                },
                {
                    name: 'RockScissorsPaper Factory',
                    path: 'rps',
                    component: () => import('@/views/pages/RockPaperScissorsFactory'),
                    props: {
                        info: info,
                    }
                },
                {
                    name: 'Rock Paper Scissors',
                    path: 'rps/:address',
                    component: () => import('@/views/pages/RockPaperScissors'),
                    props: {
                        info: info,
                    }
                },
            ]
        },

    ],
})

router.beforeEach(function (to, from, next) {
    window.prevUrl = from.path;
    next();
})

export default router;