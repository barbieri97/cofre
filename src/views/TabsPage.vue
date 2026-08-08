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
import { homeOutline, listOutline, analyticsOutline, flagOutline } from 'ionicons/icons';
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
