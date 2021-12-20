import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)
const address = require('./address.json')

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
                        info: address,
                    }
                },
                {
                    name: 'Election',
                    path: 'election/:address',
                    component: () => import('@/views/pages/Election'),
                    props: {
                        info: address,
                    }
                },
                {
                    name: 'Crowdfunding Factory',
                    path: 'crowdfunding',
                    component: () => import('@/views/pages/CrowdfundingFactory'),
                    props: {
                        info: address,
                    }
                },
                {
                    name: 'Crowdfunding',
                    path: 'crowdfunding/:address',
                    component: () => import('@/views/pages/Crowdfunding'),
                    props: {
                        info: address,
                    }
                },
                {
                    name: 'RockScissorsPaper Factory',
                    path: 'rsp',
                    component: () => import('@/views/pages/RockScissorsPaperFactory'),
                    props: {
                        info: address,
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