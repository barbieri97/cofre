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
          <p class="ch-versao">v{{ APP_VERSION }}</p>
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

        <!-- Categorias e orçamento -->
        <div class="secao">
          <p class="secao-titulo">Categorias e Orçamento</p>
          <div class="campo-card">
            <p class="campo-desc">
              Categorias de receita, despesa e transferência usadas no lançamento do mês e no orçamento anual.
            </p>
            <ion-button
              id="btn-gerenciar-categorias"
              expand="block"
              fill="outline"
              color="primary"
              router-link="/tabs/configuracoes/categorias"
            >
              <ion-icon :icon="pricetagsOutline" slot="start" />
              Gerenciar categorias
            </ion-button>

            <p class="campo-desc tolerancia-desc">
              Tolerância de desvio: dentro dessa faixa em torno do orçado acumulado, a visão anual
              mostra o valor como neutro.
            </p>
            <div class="reserva-row">
              <ion-button
                id="btn-tolerancia-menos"
                fill="clear"
                color="medium"
                :disabled="toleranciaDesvio <= 0"
                @click="ajustarTolerancia(-1)"
              >
                <ion-icon :icon="removeCircleOutline" slot="icon-only" />
              </ion-button>
              <div class="reserva-valor">
                <span class="rv-num">{{ toleranciaDesvio }}</span>
                <span class="rv-unidade">%</span>
              </div>
              <ion-button
                id="btn-tolerancia-mais"
                fill="clear"
                color="medium"
                :disabled="toleranciaDesvio >= 50"
                @click="ajustarTolerancia(1)"
              >
                <ion-icon :icon="addCircleOutline" slot="icon-only" />
              </ion-button>
            </div>
          </div>
        </div>

        <!-- Reserva desejada -->
        <div class="secao">
          <p class="secao-titulo">Reserva Desejada</p>
          <div class="campo-card">
            <p class="campo-desc">
              Quantos meses de gasto você quer ter cobertos pelo patrimônio. Define quando o
              card de Fôlego fica verde.
            </p>
            <div class="reserva-row">
              <ion-button
                id="btn-reserva-menos"
                fill="clear"
                color="medium"
                :disabled="reservaMeses <= 1"
                @click="ajustarReserva(-1)"
              >
                <ion-icon :icon="removeCircleOutline" slot="icon-only" />
              </ion-button>
              <div class="reserva-valor">
                <span class="rv-num">{{ reservaMeses }}</span>
                <span class="rv-unidade">{{ reservaMeses === 1 ? 'mês' : 'meses' }}</span>
              </div>
              <ion-button
                id="btn-reserva-mais"
                fill="clear"
                color="medium"
                :disabled="reservaMeses >= 60"
                @click="ajustarReserva(1)"
              >
                <ion-icon :icon="addCircleOutline" slot="icon-only" />
              </ion-button>
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
              color="primary"
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

        <p class="versao">Cofre v{{ APP_VERSION }} · Dados salvos localmente</p>
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
      message="Todos os seus registros, categorias, orçamentos e configurações serão excluídos permanentemente."
      :buttons="botoesAlertReset"
      @did-dismiss="alertResetAberto = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonLabel, IonInput, IonButton, IonIcon, IonToast, IonAlert
} from '@ionic/vue';
import {
  saveOutline, trashOutline, downloadOutline, cloudUploadOutline,
  addCircleOutline, removeCircleOutline, pricetagsOutline
} from 'ionicons/icons';
import { usePatrimonio } from '../composables/usePatrimonio';
import { exportarBackup, importarBackup } from '../services/storageService';
import { formatCurrency } from '../types';

const { config, patrimonioAtualGeral, saveConfig, resetarDados, recarregarDados } = usePatrimonio();

/** Injetado pelo Vite a partir do package.json — mesma fonte que o versionName do Android. */
const APP_VERSION = __APP_VERSION__;

const reservaMeses = computed(() => config.value.reservaAlvoMeses);

function ajustarReserva(delta: number) {
  const novo = Math.min(60, Math.max(1, reservaMeses.value + delta));
  saveConfig({ reservaAlvoMeses: novo });
}

const toleranciaDesvio = computed(() => config.value.toleranciaDesvio);

function ajustarTolerancia(delta: number) {
  saveConfig({ toleranciaDesvio: Math.min(50, Math.max(0, toleranciaDesvio.value + delta)) });
}

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
.ch-icon { font-size: var(--cofre-icon-lg); margin-bottom: 8px; }
.ch-nome { font-size: var(--cofre-fs-2xl); font-weight: 800; color: var(--cofre-text); margin: 0 0 4px; letter-spacing: -0.03em; }
.ch-sub { font-size: var(--cofre-fs-sm); color: var(--cofre-text-muted); margin: 0 0 4px; }
.ch-versao { font-size: var(--cofre-fs-2xs); color: var(--cofre-text-disabled); margin: 0; }

/* Seções */
.secao { margin-bottom: 28px; }
/* .secao-titulo é global (theme/variables.css) */
.danger-titulo { color: var(--cofre-red); }

/* Campo card */
.campo-card {
  background: var(--cofre-surface); border-radius: var(--cofre-radius-lg);
  padding: 16px; border: 1px solid var(--cofre-border);
}
.danger-card { border-color: var(--cofre-red-border); }
.campo-desc { font-size: var(--cofre-fs-sm); color: var(--cofre-text-muted); line-height: 1.6; margin: 0 0 16px; }
.campo-desc strong { color: var(--cofre-text); }
.campo-wrap { margin-bottom: 14px; }
.tolerancia-desc { margin: 20px 0 4px; }

/* Preview */
.patrimonio-preview {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; background: var(--cofre-surface-2); border-radius: var(--cofre-radius-md); margin-bottom: 16px;
}
.pp-label { font-size: var(--cofre-fs-xs); color: var(--cofre-text-muted); }
.pp-valor { font-size: var(--cofre-fs-base); font-weight: 700; }
.pp-valor.verde { color: var(--cofre-green); }
.pp-valor.vermelho { color: var(--cofre-red); }

/* Stats list */
/* Reserva desejada */
.reserva-row { display: flex; align-items: center; justify-content: center; gap: 8px; }
.reserva-valor { display: flex; align-items: baseline; gap: 6px; min-width: 120px; justify-content: center; }
.rv-num { font-size: var(--cofre-fs-3xl); font-weight: 800; color: var(--cofre-accent); letter-spacing: -0.02em; }
.rv-unidade { font-size: var(--cofre-fs-md); color: var(--cofre-text-muted); font-weight: 600; }

/* Botões backup */
.btn-backup { margin-bottom: 10px; }
.btn-backup:last-of-type { margin-bottom: 0; }

.versao { text-align: center; font-size: var(--cofre-fs-xs); color: var(--cofre-text-disabled); margin-top: 24px; }
</style>
