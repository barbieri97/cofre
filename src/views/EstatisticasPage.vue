<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Estatísticas</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="!registros.length" class="empty-state">
        <ion-icon :icon="statsChartOutline" class="es-icon" />
        <h3 class="es-titulo">Nenhum dado ainda</h3>
        <p class="es-sub">Adicione registros mensais para ver suas estatísticas.</p>
        <ion-button router-link="/tabs/registros" fill="outline" color="primary">
          Adicionar registros
        </ion-button>
      </div>

      <div v-else class="page-content">

        <!-- ── Médias dos últimos 12 meses ────────────────── -->
        <div class="secao">
          <div class="secao-header-badge">
            <p class="secao-titulo">Médias — Últimos 12 meses</p>
            <span class="secao-badge">{{ Math.min(registros.length, 12) }}m</span>
          </div>

          <div class="cards-col">
            <div class="media-card">
              <div class="mc-left verde-bg">
                <ion-icon :icon="arrowUpOutline" class="mc-icon verde" />
              </div>
              <div class="mc-body">
                <p class="mc-label">Receita Média Mensal</p>
                <p class="mc-valor verde">{{ formatCurrency(eg.mediaGanhos12m) }}</p>
              </div>
            </div>
            <div class="media-card">
              <div class="mc-left vermelho-bg">
                <ion-icon :icon="arrowDownOutline" class="mc-icon vermelho" />
              </div>
              <div class="mc-body">
                <p class="mc-label">Despesa Média Mensal</p>
                <p class="mc-valor vermelho">{{ formatCurrency(eg.mediaGastos12m) }}</p>
              </div>
            </div>
            <div class="media-card">
              <div class="mc-left roxo-bg">
                <ion-icon :icon="walletOutline" class="mc-icon roxo" />
              </div>
              <div class="mc-body">
                <p class="mc-label">Saldo Médio Mensal</p>
                <p class="mc-valor" :class="eg.mediaSaldo12m >= 0 ? 'verde' : 'vermelho'">
                  {{ formatCurrency(eg.mediaSaldo12m) }}
                </p>
              </div>
            </div>
            <div class="media-card">
              <div class="mc-left ouro-bg">
                <ion-icon :icon="saveOutline" class="mc-icon ouro" />
              </div>
              <div class="mc-body">
                <p class="mc-label">Taxa de Poupança Média</p>
                <p class="mc-valor ouro">{{ formatPercent(eg.mediaTaxaPoupanca12m) }}</p>
              </div>
            </div>
            <div class="media-card">
              <div class="mc-left azul-bg">
                <ion-icon :icon="trendingUpOutline" class="mc-icon azul" />
              </div>
              <div class="mc-body">
                <p class="mc-label">Crescimento Médio Mensal</p>
                <p class="mc-valor" :class="eg.crescimentoMedioMensal >= 0 ? 'verde' : 'vermelho'">
                  {{ formatCurrency(eg.crescimentoMedioMensal) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Recordes históricos ────────────────────────── -->
        <div class="secao">
          <p class="secao-titulo">🏆 Recordes históricos</p>

          <div class="records-grid">
            <div class="record-card" v-if="eg.maiorGanho">
              <p class="rec-categoria verde">💰 Maior Receita</p>
              <p class="rec-valor verde">{{ formatCurrency(eg.maiorGanho.valor) }}</p>
              <p class="rec-periodo">{{ labelMes(eg.maiorGanho.mes, eg.maiorGanho.ano) }}</p>
            </div>
            <div class="record-card" v-if="eg.maiorGasto">
              <p class="rec-categoria vermelho">💸 Maior Despesa</p>
              <p class="rec-valor vermelho">{{ formatCurrency(eg.maiorGasto.valor) }}</p>
              <p class="rec-periodo">{{ labelMes(eg.maiorGasto.mes, eg.maiorGasto.ano) }}</p>
            </div>
            <div class="record-card" v-if="eg.maiorCrescimento">
              <p class="rec-categoria roxo">📈 Maior Crescimento</p>
              <p class="rec-valor roxo">{{ formatCurrency(eg.maiorCrescimento.valor) }}</p>
              <p class="rec-periodo">{{ labelMes(eg.maiorCrescimento.mes, eg.maiorCrescimento.ano) }}</p>
            </div>
            <div class="record-card" v-if="eg.melhorTaxaPoupanca">
              <p class="rec-categoria ouro">⭐ Melhor Tx. Poupança</p>
              <p class="rec-valor ouro">{{ formatPercent(eg.melhorTaxaPoupanca.valor) }}</p>
              <p class="rec-periodo">{{ labelMes(eg.melhorTaxaPoupanca.mes, eg.melhorTaxaPoupanca.ano) }}</p>
            </div>
          </div>
        </div>

        <!-- ── Visão geral do histórico ───────────────────── -->
        <div class="secao">
          <p class="secao-titulo">📋 Visão geral</p>
          <div class="overview-list">
            <div class="ov-row">
              <span class="ov-label">Total de meses registrados</span>
              <span class="ov-valor">{{ registros.length }} meses</span>
            </div>
            <div class="ov-row" v-if="registros.length">
              <span class="ov-label">Período registrado</span>
              <span class="ov-valor">
                {{ labelMes(registros[0].mes, registros[0].ano) }} → {{ labelMes(registros[registros.length - 1].mes, registros[registros.length - 1].ano) }}
              </span>
            </div>
            <div class="ov-row">
              <span class="ov-label">Total receitas (histórico)</span>
              <span class="ov-valor verde">{{ formatCurrency(totalHistoricoGanhos) }}</span>
            </div>
            <div class="ov-row">
              <span class="ov-label">Total despesas (histórico)</span>
              <span class="ov-valor vermelho">{{ formatCurrency(totalHistoricoGastos) }}</span>
            </div>
            <div class="ov-row">
              <span class="ov-label">Saldo líquido acumulado</span>
              <span class="ov-valor" :class="saldoHistorico >= 0 ? 'verde' : 'vermelho'">
                {{ formatCurrency(saldoHistorico) }}
              </span>
            </div>
            <div class="ov-row">
              <span class="ov-label">Patrimônio líquido atual</span>
              <span class="ov-valor roxo">{{ formatCurrency(patrimonioAtualGeral) }}</span>
            </div>
          </div>
        </div>

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonButton
} from '@ionic/vue';
import {
  statsChartOutline, arrowUpOutline, arrowDownOutline,
  walletOutline, saveOutline, trendingUpOutline
} from 'ionicons/icons';
import { usePatrimonio } from '../composables/usePatrimonio';
import { formatCurrency, formatPercent, labelMes } from '../types';

const { registros, estatisticasGerais, patrimonioAtualGeral } = usePatrimonio();
const eg = estatisticasGerais;

const totalHistoricoGanhos = computed(() => registros.value.reduce((s, r) => s + r.ganhos, 0));
const totalHistoricoGastos = computed(() => registros.value.reduce((s, r) => s + r.gastos, 0));
const saldoHistorico = computed(() => totalHistoricoGanhos.value - totalHistoricoGastos.value);
</script>

<style scoped>
.empty-state {
  height: 65vh; display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 32px; text-align: center;
}
.es-icon { font-size: 3.5rem; color: #374151; margin-bottom: 16px; display: block; }
.es-titulo { font-size: 1.2rem; font-weight: 700; color: #F0F6FC; margin: 0 0 8px; }
.es-sub { font-size: 0.85rem; color: #9CA3AF; margin: 0 0 24px; line-height: 1.6; }

.page-content { padding: 16px; padding-bottom: 40px; }

/* Seção */
.secao { margin-bottom: 26px; }
.secao-titulo { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: rgba(255,255,255,0.4); margin: 0 0 12px; }
.secao-header-badge { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.secao-header-badge .secao-titulo { margin-bottom: 0; }
.secao-badge {
  background: rgba(16,185,129,0.12); color: #10B981;
  border: 1px solid rgba(16,185,129,0.25);
  border-radius: 20px; padding: 2px 10px;
  font-size: 0.7rem; font-weight: 700;
}

/* Cards de médias */
.cards-col { display: flex; flex-direction: column; gap: 10px; }
.media-card {
  background: #161B22; border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06);
  display: flex; align-items: center; overflow: hidden;
}
.mc-left {
  width: 52px; height: 52px; display: flex;
  align-items: center; justify-content: center; flex-shrink: 0;
}
.verde-bg { background: rgba(16,185,129,0.1); }
.vermelho-bg { background: rgba(239,68,68,0.1); }
.roxo-bg { background: rgba(139,92,246,0.1); }
.ouro-bg { background: rgba(245,158,11,0.1); }
.azul-bg { background: rgba(59,130,246,0.1); }
.mc-icon { font-size: 1.3rem; }
.mc-body { flex: 1; padding: 12px 14px; }
.mc-label { font-size: 0.68rem; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 4px; }
.mc-valor { font-size: 1.05rem; font-weight: 700; margin: 0; }

/* Records */
.records-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.record-card {
  background: #161B22; border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06);
  padding: 16px 14px;
}
.rec-categoria { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 8px; }
.rec-valor { font-size: 1.1rem; font-weight: 800; margin: 0 0 4px; }
.rec-periodo { font-size: 0.72rem; color: #6B7280; margin: 0; }

/* Overview */
.overview-list {
  background: #161B22; border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06); overflow: hidden;
}
.ov-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 13px 16px; border-bottom: 1px solid rgba(255,255,255,0.04);
}
.ov-row:last-child { border-bottom: none; }
.ov-label { font-size: 0.82rem; color: #9CA3AF; }
.ov-valor { font-size: 0.85rem; font-weight: 700; color: #F0F6FC; }

/* Cores */
.verde { color: #10B981; }
.vermelho { color: #EF4444; }
.roxo { color: #8B5CF6; }
.ouro { color: #F59E0B; }
.azul { color: #3B82F6; }
</style>
