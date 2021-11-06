import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

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
                },
                {
                    name: 'Election',
                    path: 'election/:address',
                    component: () => import('@/views/pages/Election'),
                },
                {
                    name: 'Crowdfunding Factory',
                    path: 'crowdfunding',
                    component: () => import('@/views/pages/CrowdfundingFactory'),
                },
                {
                    name: 'Crowdfunding',
                    path: 'crowdfunding/:address',
                    component: () => import('@/views/pages/Crowdfunding'),
                }
            ]
        },

    ],
})

router.beforeEach(function (to, from, next) {
    window.prevUrl = from.path;
    next();
})

export default router;