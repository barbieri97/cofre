<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Configurações</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page-content">

        <!-- Header visual -->
        <div class="config-hero">
          <div class="ch-icon">🔒</div>
          <h2 class="ch-nome">Cofre</h2>
          <p class="ch-sub">Controle de Patrimônio Pessoal</p>
          <p class="ch-versao">v2.0.0</p>
        </div>

        <!-- Patrimônio Inicial -->
        <div class="secao">
          <p class="secao-titulo">Patrimônio Inicial</p>
          <div class="campo-card">
            <p class="campo-desc">
              Valor do seu patrimônio no ponto de partida. Todos os cálculos de evolução partem desse valor.
            </p>
            <div class="campo-wrap">
              <ion-label>Valor (R$)</ion-label>
              <ion-input
                id="input-patrimonio-inicial"
                :value="patrimonioStr"
                type="number"
                inputmode="decimal"
                placeholder="0,00"
                min="0"
                :clear-input="true"
                @ion-input="(e: any) => { patrimonioStr = e.detail.value ?? '0'; }"
              />
            </div>
            <div class="patrimonio-preview">
              <span class="pp-label">Patrimônio atual calculado</span>
              <span class="pp-valor" :class="patrimonioAtualGeral >= 0 ? 'verde' : 'vermelho'">
                {{ formatCurrency(patrimonioAtualGeral) }}
              </span>
            </div>
            <ion-button
              id="btn-salvar-config"
              color="primary"
              expand="block"
              @click="salvarConfig"
              :disabled="salvando"
            >
              <ion-icon :icon="saveOutline" slot="start" />
              {{ salvando ? 'Salvando...' : 'Salvar' }}
            </ion-button>
          </div>
        </div>

        <!-- Visão Geral -->
        <div class="secao">
          <p class="secao-titulo">Visão Geral</p>
          <div class="stats-list">
            <div class="stat-row">
              <span class="sr-label">Total de registros</span>
              <span class="sr-valor">{{ registros.length }} meses</span>
            </div>
            <div class="stat-row" v-if="registros.length">
              <span class="sr-label">Período registrado</span>
              <span class="sr-valor">
                {{ labelMes(registros[0].mes, registros[0].ano) }}
                → {{ labelMes(registros[registros.length - 1].mes, registros[registros.length - 1].ano) }}
              </span>
            </div>
            <div class="stat-row">
              <span class="sr-label">Patrimônio inicial</span>
              <span class="sr-valor">{{ formatCurrency(config.patrimonioInicial) }}</span>
            </div>
            <div class="stat-row">
              <span class="sr-label">Patrimônio atual</span>
              <span class="sr-valor" :class="patrimonioAtualGeral >= 0 ? 'verde' : 'vermelho'">
                {{ formatCurrency(patrimonioAtualGeral) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Backup -->
        <div class="secao">
          <p class="secao-titulo">Backup de Dados</p>
          <div class="campo-card">
            <p class="campo-desc">Exporte seus dados como JSON para manter um backup. Você pode importar depois para restaurar.</p>

            <!-- Exportar -->
            <ion-button
              id="btn-exportar"
              expand="block"
              fill="outline"
              color="primary"
              @click="exportarDados"
              class="btn-backup"
            >
              <ion-icon :icon="downloadOutline" slot="start" />
              Exportar backup (JSON)
            </ion-button>

            <!-- Importar -->
            <ion-button
              id="btn-importar"
              expand="block"
              fill="outline"
              color="secondary"
              @click="triggerImport"
              class="btn-backup"
            >
              <ion-icon :icon="cloudUploadOutline" slot="start" />
              Importar backup (JSON)
            </ion-button>
            <input
              ref="inputFile"
              type="file"
              accept=".json"
              style="display:none"
              @change="importarDados"
            />
          </div>
        </div>

        <!-- Zona de perigo -->
        <div class="secao">
          <p class="secao-titulo danger-titulo">Zona de Perigo</p>
          <div class="campo-card danger-card">
            <p class="campo-desc">
              ⚠️ Esta ação irá apagar <strong>todos</strong> os dados do aplicativo. Esta ação não pode ser desfeita.
            </p>
            <ion-button
              id="btn-resetar-dados"
              color="danger"
              fill="outline"
              expand="block"
              @click="alertResetAberto = true"
            >
              <ion-icon :icon="trashOutline" slot="start" />
              Apagar todos os dados
            </ion-button>
          </div>
        </div>

        <p class="versao">Cofre v2.0.0 · Dados salvos localmente</p>
      </div>
    </ion-content>

    <!-- Toast -->
    <ion-toast
      :is-open="toastAberto"
      :message="toastMsg"
      :duration="2500"
      position="bottom"
      :color="toastColor"
      @did-dismiss="toastAberto = false"
    />

    <!-- Alert reset -->
    <ion-alert
      :is-open="alertResetAberto"
      header="Apagar tudo?"
      message="Todos os seus registros e configurações serão excluídos permanentemente."
      :buttons="botoesAlertReset"
      @did-dismiss="alertResetAberto = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonLabel, IonInput, IonButton, IonIcon, IonToast, IonAlert
} from '@ionic/vue';
import { saveOutline, trashOutline, downloadOutline, cloudUploadOutline } from 'ionicons/icons';
import { usePatrimonio } from '../composables/usePatrimonio';
import { exportarBackup, importarBackup } from '../services/storageService';
import { formatCurrency, labelMes } from '../types';

const { config, registros, patrimonioAtualGeral, saveConfig, resetarDados, recarregarDados } = usePatrimonio();

const patrimonioStr = ref(String(config.value.patrimonioInicial));
const salvando = ref(false);
const toastAberto = ref(false);
const toastMsg = ref('');
const toastColor = ref('success');
const alertResetAberto = ref(false);
const inputFile = ref<HTMLInputElement | null>(null);

watch(() => config.value.patrimonioInicial, (v) => {
  patrimonioStr.value = String(v);
});

async function salvarConfig() {
  salvando.value = true;
  const valor = parseFloat(patrimonioStr.value) || 0;
  saveConfig({ patrimonioInicial: valor, primeiroUso: false });
  await new Promise(r => setTimeout(r, 400));
  salvando.value = false;
  showToast('Configuração salva!', 'success');
}

function exportarDados() {
  const json = exportarBackup();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const data = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `cofre-backup-${data}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup exportado com sucesso!', 'success');
}

function triggerImport() {
  inputFile.value?.click();
}

async function importarDados(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const texto = await file.text();
  const resultado = importarBackup(texto);
  if (resultado.ok) {
    recarregarDados();
    showToast(resultado.mensagem, 'success');
  } else {
    showToast(resultado.mensagem, 'danger');
  }
  // Reset input para permitir re-importação do mesmo arquivo
  if (inputFile.value) inputFile.value.value = '';
}

function showToast(msg: string, color: string) {
  toastMsg.value = msg;
  toastColor.value = color;
  toastAberto.value = true;
}

const botoesAlertReset = [
  { text: 'Cancelar', role: 'cancel' },
  {
    text: 'Apagar tudo',
    role: 'destructive',
    handler: () => {
      resetarDados();
      patrimonioStr.value = '0';
      showToast('Todos os dados foram apagados', 'warning');
    },
  },
];
</script>

<style scoped>
.page-content { padding: 16px; padding-bottom: 48px; }

/* Hero */
.config-hero {
  text-align: center; padding: 28px 16px 24px; margin-bottom: 8px;
}
.ch-icon { font-size: 3rem; margin-bottom: 8px; }
.ch-nome { font-size: 1.6rem; font-weight: 800; color: #F0F6FC; margin: 0 0 4px; letter-spacing: -0.03em; }
.ch-sub { font-size: 0.82rem; color: #9CA3AF; margin: 0 0 4px; }
.ch-versao { font-size: 0.7rem; color: #374151; margin: 0; }

/* Seções */
.secao { margin-bottom: 28px; }
.secao-titulo {
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; color: #8B5CF6; margin: 0 0 12px;
}
.danger-titulo { color: #EF4444; }

/* Campo card */
.campo-card {
  background: #161B22; border-radius: 16px;
  padding: 16px; border: 1px solid rgba(255,255,255,0.06);
}
.danger-card { border-color: rgba(239,68,68,0.2); }
.campo-desc { font-size: 0.82rem; color: #9CA3AF; line-height: 1.6; margin: 0 0 16px; }
.campo-desc strong { color: #F0F6FC; }
.campo-wrap { margin-bottom: 14px; }

/* Preview */
.patrimonio-preview {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; background: #21262D; border-radius: 10px; margin-bottom: 16px;
}
.pp-label { font-size: 0.75rem; color: #9CA3AF; }
.pp-valor { font-size: 1rem; font-weight: 700; }
.pp-valor.verde { color: #10B981; }
.pp-valor.vermelho { color: #EF4444; }

/* Stats list */
.stats-list {
  background: #161B22; border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06); overflow: hidden;
}
.stat-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.04);
}
.stat-row:last-child { border-bottom: none; }
.sr-label { font-size: 0.82rem; color: #9CA3AF; }
.sr-valor { font-size: 0.85rem; font-weight: 700; color: #F0F6FC; }
.sr-valor.verde { color: #10B981; }
.sr-valor.vermelho { color: #EF4444; }

/* Botões backup */
.btn-backup { margin-bottom: 10px; }
.btn-backup:last-of-type { margin-bottom: 0; }

.versao { text-align: center; font-size: 0.72rem; color: #374151; margin-top: 24px; }
</style>
