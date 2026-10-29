<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/tabs/home">
          <ion-icon :icon="homeOutline" />
          <ion-label>Início</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="registros" href="/tabs/registros">
          <ion-icon :icon="listOutline" />
          <ion-label>Registros</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="analise" href="/tabs/analise">
          <ion-icon :icon="analyticsOutline" />
          <ion-label>Análise</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="orcamento" href="/tabs/orcamento">
          <ion-icon :icon="pieChartOutline" />
          <ion-label>Orçamento</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="objetivos" href="/tabs/objetivos">
          <ion-icon :icon="flagOutline" />
          <ion-label>Objetivos</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonTabs, IonTabBar, IonTabButton,
  IonIcon, IonLabel, IonRouterOutlet
} from '@ionic/vue';
import {
  homeOutline, listOutline, analyticsOutline, pieChartOutline, flagOutline,
} from 'ionicons/icons';
</script>

<style scoped>
/* Cores da tab bar vêm do tema global (theme/variables.css). */
ion-tab-button {
  font-size: var(--cofre-fs-3xs);
  font-weight: 600;
}
ion-tab-button ion-icon {
  font-size: var(--cofre-fs-xl);
  margin-bottom: 2px;
}
</style>
