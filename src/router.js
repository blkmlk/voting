import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

let router = new Router({
    mode: 'hash',
    base: process.env.BASE_URL,
    routes: [
        {
            path: '/',
            redirect: 'dashboard/basic-dashboard',
            component: () => import('@/layouts/Layout'),
            children: [
                // Components
                {
                    name: 'Alerts',
                    path: 'pages/alerts',
                    component: () => import('@/views/pages/Alerts'),
                },

                {
                    name: 'Profile',
                    path: 'pages/profile',
                    component: () => import('@/views/pages/Profile'),
                },

                {
                    name: 'Icons',
                    path: 'pages/icons',
                    component: () => import('@/views/pages/Icons'),
                },

                {
                    name: 'TableSimple',
                    path: 'pages/tables-simple',
                    component: () => import('@/views/pages/TableSimple'),
                },

                {
                    name: 'Dashboard',
                    path: 'dashboard/basic-dashboard',
                    component: () => import('@/views/dashboard/BasicDashboard'),
                },
                {
                    name: 'Factory',
                    path: 'factory',
                    component: () => import('@/views/pages/Factory'),
                },
                {
                    name: 'Election',
                    path: 'election/:address',
                    component: () => import('@/views/pages/Election'),
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