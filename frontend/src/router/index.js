import { createRouter, createWebHistory } from 'vue-router';

const routes = [
    {
        path: '/',
        name: 'Status',
        component: () => import('../views/StatusPage.vue'),
    },
    {
        path: '/admin',
        name: 'Admin',
        component: () => import('../views/AdminPage.vue'),
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
