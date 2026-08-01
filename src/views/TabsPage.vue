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

        <ion-tab-button tab="graficos" href="/tabs/graficos">
          <ion-icon :icon="barChartOutline" />
          <ion-label>Gráficos</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="estatisticas" href="/tabs/estatisticas">
          <ion-icon :icon="statsChartOutline" />
          <ion-label>Stats</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="metas" href="/tabs/metas">
          <ion-icon :icon="flagOutline" />
          <ion-label>Metas</ion-label>
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
import { homeOutline, listOutline, barChartOutline, statsChartOutline, flagOutline } from 'ionicons/icons';
</script>

<style scoped>
ion-tab-bar {
  --background: #0D1117;
  --border-color: rgba(255,255,255,0.07);
}
ion-tab-button {
  --color: #4B5563;
  --color-selected: #8B5CF6;
  font-size: 0.62rem;
  font-weight: 600;
}
ion-tab-button ion-icon {
  font-size: 1.35rem;
  margin-bottom: 2px;
}
</style>
