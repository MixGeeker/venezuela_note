import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./pages/HomePage.vue'),
    },
    {
      path: '/note/:path(.*)',
      name: 'note',
      component: () => import('./pages/NotePage.vue'),
      props: true,
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('./pages/SearchPage.vue'),
    },
    {
      path: '/tools/cash-bundle',
      name: 'cash-bundle-tool',
      component: () => import('./pages/CashBundlePage.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('./pages/NotFoundPage.vue'),
    },
  ],
})

export default router
