<template>
  <div class="estado-vazio" :class="{ compacto }">
    <ion-icon :icon="icone" class="ev-icone" />
    <h3 v-if="titulo" class="ev-titulo">{{ titulo }}</h3>
    <p class="ev-texto">{{ texto }}</p>
    <!-- Ação única: um ion-button color="primary" (size="small" no compacto) -->
    <slot />
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue';

withDefaults(defineProps<{
  icone: string;
  texto: string;
  titulo?: string;
  /** Card tracejado dentro da página, em vez de ocupar a tela inteira */
  compacto?: boolean;
}>(), {
  titulo: undefined,
  compacto: false,
});
</script>

<style scoped>
.estado-vazio {
  min-height: 65vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
}
.ev-icone { font-size: var(--cofre-icon-lg); color: var(--cofre-text-disabled); margin-bottom: 16px; display: block; }
.ev-titulo { font-size: var(--cofre-fs-lg); font-weight: 700; color: var(--cofre-text); margin: 0 0 8px; }
.ev-texto { font-size: var(--cofre-fs-md); color: var(--cofre-text-muted); margin: 0 0 24px; line-height: 1.6; }

.estado-vazio.compacto {
  min-height: 0;
  background: var(--cofre-surface);
  border-radius: var(--cofre-radius-lg);
  border: 1px dashed var(--cofre-border-strong);
  padding: 32px 20px;
}
.compacto .ev-icone { font-size: var(--cofre-icon-md); margin-bottom: 12px; }
.compacto .ev-texto { color: var(--cofre-text-subtle); margin-bottom: 16px; }
</style>
