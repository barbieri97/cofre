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
        path: 'analise',
        name: 'Analise',
        component: () => import('../views/AnalisePage.vue'),
      },
      {
        path: 'objetivos',
        name: 'Objetivos',
        component: () => import('../views/ObjetivosPage.vue'),
      },
      {
        path: 'configuracoes',
        name: 'Configuracoes',
        component: () => import('../views/ConfigPage.vue'),
      },
      // Rotas da v1: Gráficos e Stats viraram Análise, Metas virou Objetivos.
      // Mantidas como redirect por causa de deep links já existentes.
      { path: 'graficos', redirect: '/tabs/analise' },
      { path: 'estatisticas', redirect: '/tabs/analise' },
      { path: 'metas', redirect: '/tabs/objetivos' },
    ]
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;
