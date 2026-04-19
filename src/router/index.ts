import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/tabs/home'
  },
  {
    path: '/tabs/',
    component: () => import('../views/TabsPage.vue'),
    children: [
      { path: '', redirect: '/tabs/home' },
      {
        path: 'home',
        name: 'Home',
        component: () => import('../views/HomePage.vue'),
      },
      {
        path: 'registros',
        name: 'Registros',
        component: () => import('../views/RegistrosPage.vue'),
      },
      {
        path: 'graficos',
        name: 'Graficos',
        component: () => import('../views/GraficosPage.vue'),
      },
      {
        path: 'configuracoes',
        name: 'Configuracoes',
        component: () => import('../views/ConfigPage.vue'),
      },
    ]
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;
