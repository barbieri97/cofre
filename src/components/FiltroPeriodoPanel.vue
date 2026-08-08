<template>
  <ion-toolbar class="filtro-toolbar">
    <div class="filtro-panel">
      <!-- Seletor de tipo de visão -->
      <div class="visao-selector">
        <button
          :class="['visao-btn', filtro.tipo === 'meses' && 'ativo']"
          @click="mudarTipo('meses')"
        >📅 Meses</button>
        <button
          :class="['visao-btn', filtro.tipo === 'anos' && 'ativo']"
          @click="mudarTipo('anos')"
        >📆 Anos</button>
      </div>

      <!-- Visão por meses: um ponto por mês -->
      <div v-if="filtro.tipo === 'meses'" class="filtro-row">
        <div class="filtro-group">
          <label>De</label>
          <div class="filtro-selects">
            <ion-select
              v-model="mesInicio"
              interface="action-sheet"
              :interface-options="{ header: 'Mês inicial' }"
              @ion-change="aplicarFiltroMeses"
            >
              <ion-select-option v-for="(m, i) in MESES_ABREV" :key="i" :value="i + 1">{{ m }}</ion-select-option>
            </ion-select>
            <ion-select
              v-model="anoInicio"
              interface="action-sheet"
              :interface-options="{ header: 'Ano inicial' }"
              @ion-change="aplicarFiltroMeses"
            >
              <ion-select-option v-for="a in anos" :key="a" :value="a">{{ a }}</ion-select-option>
            </ion-select>
          </div>
        </div>
        <div class="filtro-group">
          <label>Até</label>
          <div class="filtro-selects">
            <ion-select
              v-model="mesFim"
              interface="action-sheet"
              :interface-options="{ header: 'Mês final' }"
              @ion-change="aplicarFiltroMeses"
            >
              <ion-select-option v-for="(m, i) in MESES_ABREV" :key="i" :value="i + 1">{{ m }}</ion-select-option>
            </ion-select>
            <ion-select
              v-model="anoFim"
              interface="action-sheet"
              :interface-options="{ header: 'Ano final' }"
              @ion-change="aplicarFiltroMeses"
            >
              <ion-select-option v-for="a in anos" :key="a" :value="a">{{ a }}</ion-select-option>
            </ion-select>
          </div>
        </div>
      </div>

      <!-- Visão por anos: um ponto por ano, comparando anos entre si -->
      <div v-else class="filtro-row">
        <div class="filtro-group">
          <label>De</label>
          <div class="filtro-selects">
            <ion-select
              v-model="anoInicio"
              interface="action-sheet"
              :interface-options="{ header: 'Ano inicial' }"
              @ion-change="aplicarFiltroAnos"
            >
              <ion-select-option v-for="a in anos" :key="a" :value="a">{{ a }}</ion-select-option>
            </ion-select>
          </div>
        </div>
        <div class="filtro-group">
          <label>Até</label>
          <div class="filtro-selects">
            <ion-select
              v-model="anoFim"
              interface="action-sheet"
              :interface-options="{ header: 'Ano final' }"
              @ion-change="aplicarFiltroAnos"
            >
              <ion-select-option v-for="a in anos" :key="a" :value="a">{{ a }}</ion-select-option>
            </ion-select>
          </div>
        </div>
      </div>

      <ion-button fill="clear" size="small" color="medium" @click="limparFiltro" class="btn-limpar">
        Limpar filtro
      </ion-button>
    </div>
  </ion-toolbar>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { IonToolbar, IonButton, IonSelect, IonSelectOption } from '@ionic/vue';
import { usePatrimonio } from '../composables/usePatrimonio';
import { MESES_ABREV } from '../types';
import type { TipoFiltro } from '../types';

const { filtro, setFiltro, resetarFiltro } = usePatrimonio();

// Estado local dos selects, espelhado a partir do filtro ativo.
const mesInicio = ref(filtro.value.mesInicio);
const anoInicio = ref(filtro.value.anoInicio);
const mesFim = ref(filtro.value.mesFim);
const anoFim = ref(filtro.value.anoFim);

watch(filtro, (novo) => {
  mesInicio.value = novo.mesInicio;
  anoInicio.value = novo.anoInicio;
  mesFim.value = novo.mesFim;
  anoFim.value = novo.anoFim;
}, { deep: true });

const anos = computed(() => {
  const a = new Date().getFullYear();
  return Array.from({ length: 12 }, (_, i) => a - 8 + i);
});

function aplicarFiltroMeses() {
  setFiltro({
    tipo: 'meses',
    mesInicio: mesInicio.value,
    anoInicio: anoInicio.value,
    mesFim: mesFim.value,
    anoFim: anoFim.value,
  });
}

// Na visão de anos a janela vai sempre de Jan do ano inicial a Dez do ano
// final; a agregação por ano acontece em pontosGrafico.
function aplicarFiltroAnos() {
  setFiltro({
    tipo: 'anos',
    mesInicio: 1,
    anoInicio: anoInicio.value,
    mesFim: 12,
    anoFim: anoFim.value,
  });
}

// Reaplica o filtro do modo destino para o período nunca ficar incoerente
// com o botão aceso.
function mudarTipo(tipo: TipoFiltro) {
  if (filtro.value.tipo === tipo) return;
  if (tipo === 'anos') aplicarFiltroAnos();
  else aplicarFiltroMeses();
}

function limparFiltro() {
  resetarFiltro();
}
</script>

<style scoped>
.filtro-toolbar { --background: #0D1117; --border-color: rgba(255,255,255,0.07); }
.filtro-panel { padding: 12px 16px 10px; }

.visao-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  background: #161B22;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.06);
}
.visao-btn {
  flex: 1; padding: 8px; border-radius: 7px; background: transparent; border: none;
  color: #9CA3AF; font-size: 0.82rem; font-weight: 600; cursor: pointer;
  transition: all 0.2s; font-family: inherit;
}
.visao-btn.ativo { background: #10B981; color: #fff; }

.filtro-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.filtro-group > label {
  font-size: 0.68rem; color: #9CA3AF; text-transform: uppercase;
  letter-spacing: 0.06em; display: block; margin-bottom: 6px;
}
.filtro-selects { display: flex; gap: 6px; }
.filtro-selects ion-select {
  flex: 1; font-size: 0.82rem; padding: 8px 10px;
  background: #21262D; border-radius: 8px; border: 1px solid rgba(255,255,255,0.07);
}
.btn-limpar { margin-top: 8px; }
</style>
