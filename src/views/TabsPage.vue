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

        <ion-tab-button tab="configuracoes" href="/tabs/configuracoes">
          <ion-icon :icon="settingsOutline" />
          <ion-label>Config</ion-label>
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
import { homeOutline, listOutline, barChartOutline, settingsOutline } from 'ionicons/icons';
</script>

<style scoped>
ion-tab-button {
  --color: #6B7280;
  --color-selected: #10B981;
  font-size: 0.65rem;
  font-weight: 500;
}
ion-tab-button ion-icon {
  font-size: 1.4rem;
  margin-bottom: 2px;
}
</style>
