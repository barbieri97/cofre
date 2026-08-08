<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Gráficos</ion-title>
        <ion-buttons slot="end">
          <ion-button id="btn-filtro-graficos" fill="clear" @click="mostrarFiltro = !mostrarFiltro">
            <ion-icon :icon="mostrarFiltro ? closeOutline : filterOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <transition name="slide-filtro">
        <FiltroPeriodoPanel v-if="mostrarFiltro" />
      </transition>
    </ion-header>

    <ion-content>
      <!-- Sem dados -->
      <div v-if="!pontosGrafico.length" class="empty-state">
        <ion-icon :icon="barChartOutline" class="es-icon" />
        <h3 class="es-titulo">Sem dados no período</h3>
        <p class="es-sub">Adicione registros mensais ou ajuste o filtro.</p>
        <ion-button router-link="/tabs/registros" fill="outline" color="primary">
          Ir para Registros
        </ion-button>
      </div>

      <div v-else class="page-content">

        <!-- ── Seletor de gráfico (scroll horizontal) ──── -->
        <div class="chart-selector-wrap">
          <div class="chart-selector">
            <button
              v-for="opt in opcoeGrafico"
              :key="opt.tipo"
              :class="['chart-btn', tipoGrafico === opt.tipo && 'ativo']"
              @click="tipoGrafico = opt.tipo"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- ── Gráfico Principal ────────────────────────── -->
        <div class="secao">
          <p class="secao-titulo">{{ opcaoAtiva?.titulo }}</p>
          <div class="grafico-container">
            <GraficoCanvas :dados="pontosGrafico" :tipo="tipoGrafico" :height="250" />
          </div>
        </div>

        <!-- ── Stats do período ─────────────────────────── -->
        <div class="secao">
          <p class="secao-titulo">Resumo do Período</p>
          <div class="stats-grid">
            <div class="stat-card">
              <p class="stat-label">Patrimônio inicial</p>
              <p class="stat-valor">{{ formatCurrency(estatisticas.patrimonioBase) }}</p>
            </div>
            <div class="stat-card destaque-roxo">
              <p class="stat-label">Patrimônio atual</p>
              <p class="stat-valor roxo">{{ formatCurrency(estatisticas.patrimonioAtual) }}</p>
            </div>
            <div class="stat-card">
              <p class="stat-label">Total Receitas</p>
              <p class="stat-valor verde">{{ formatCurrency(estatisticas.totalGanhos) }}</p>
            </div>
            <div class="stat-card">
              <p class="stat-label">Total Despesas</p>
              <p class="stat-valor vermelho">{{ formatCurrency(estatisticas.totalGastos) }}</p>
            </div>
            <div class="stat-card">
              <p class="stat-label">Saldo Líquido</p>
              <p class="stat-valor" :class="estatisticas.saldoLiquido >= 0 ? 'verde' : 'vermelho'">
                {{ formatCurrency(estatisticas.saldoLiquido) }}
              </p>
            </div>
            <div class="stat-card destaque-ouro">
              <p class="stat-label">Tx. Poupança Média</p>
              <p class="stat-valor ouro">{{ formatPercent(estatisticas.taxaPoupanca) }}</p>
            </div>
          </div>
        </div>

        <!-- ── Tabela detalhada ─────────────────────────── -->
        <div class="secao">
          <p class="secao-titulo">Tabela Detalhada</p>
          <div class="tabela-wrap">
            <table class="tabela">
              <thead>
                <tr>
                  <th>{{ filtro.tipo === 'anos' ? 'Ano' : 'Mês' }}</th>
                  <th class="num">Receita</th>
                  <th class="num">Despesa</th>
                  <th class="num">Saldo</th>
                  <th class="num">Tx.Poup</th>
                  <th class="num">Patrim.</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in pontosGrafico" :key="i">
                  <td class="td-mes">{{ p.label }}</td>
                  <td class="num verde">{{ formatCurrencyK(p.ganhos) }}</td>
                  <td class="num vermelho">{{ formatCurrencyK(p.gastos) }}</td>
                  <td class="num" :class="p.saldo >= 0 ? 'verde' : 'vermelho'">{{ formatCurrencyK(p.saldo) }}</td>
                  <td class="num ouro">{{ formatPercent(p.taxaPoupanca, 0) }}</td>
                  <td class="num branco">{{ formatCurrencyK(p.patrimonio) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="totais-row">
                  <td>Total</td>
                  <td class="num verde">{{ formatCurrencyK(estatisticas.totalGanhos) }}</td>
                  <td class="num vermelho">{{ formatCurrencyK(estatisticas.totalGastos) }}</td>
                  <td class="num" :class="estatisticas.saldoLiquido >= 0 ? 'verde' : 'vermelho'">{{ formatCurrencyK(estatisticas.saldoLiquido) }}</td>
                  <td class="num ouro">{{ formatPercent(estatisticas.taxaPoupanca, 0) }}</td>
                  <td class="num branco">{{ formatCurrencyK(estatisticas.patrimonioAtual) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon
} from '@ionic/vue';
import { filterOutline, closeOutline, barChartOutline } from 'ionicons/icons';
import { usePatrimonio } from '../composables/usePatrimonio';
import GraficoCanvas from '../components/GraficoCanvas.vue';
import type { TipoGrafico } from '../components/GraficoCanvas.vue';
import FiltroPeriodoPanel from '../components/FiltroPeriodoPanel.vue';
import { formatCurrency, formatPercent } from '../types';

const { filtro, pontosGrafico, estatisticas } = usePatrimonio();

const mostrarFiltro = ref(false);
const tipoGrafico = ref<TipoGrafico>('patrimonio');

const opcoeGrafico: { tipo: TipoGrafico; label: string; titulo: string }[] = [
  { tipo: 'patrimonio',     label: '💼 Patrimônio',    titulo: 'Evolução do Patrimônio' },
  { tipo: 'receita',        label: '💰 Receita',        titulo: 'Evolução da Receita' },
  { tipo: 'despesa',        label: '💸 Despesa',        titulo: 'Evolução da Despesa' },
  { tipo: 'poupanca',       label: '📊 Poupança',       titulo: 'Taxa de Poupança (%)' },
  { tipo: 'receita-despesa',label: '⚖️ Rec × Desp',    titulo: 'Receita × Despesa' },
  { tipo: 'crescimento',    label: '📈 Crescimento',    titulo: 'Crescimento Patrimonial' },
];

const opcaoAtiva = computed(() => opcoeGrafico.find(o => o.tipo === tipoGrafico.value));

// Formata valor abreviado para tabela
function formatCurrencyK(v: number): string {
  if (Math.abs(v) >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return formatCurrency(v);
}
</script>

<style scoped>
.empty-state {
  height: 65vh; display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 32px; text-align: center;
}
.es-icon { font-size: 3.5rem; color: #374151; margin-bottom: 16px; display: block; }
.es-titulo { font-size: 1.2rem; font-weight: 700; color: #F0F6FC; margin: 0 0 8px; }
.es-sub { font-size: 0.85rem; color: #9CA3AF; margin: 0 0 24px; line-height: 1.6; }

.page-content { padding: 16px; padding-bottom: 32px; }

/* Seletor de gráficos */
.chart-selector-wrap { margin-bottom: 18px; overflow-x: auto; }
.chart-selector {
  display: flex; gap: 8px; width: max-content; padding-bottom: 4px;
}
.chart-btn {
  padding: 9px 14px; border-radius: 22px;
  background: #161B22; border: 1px solid rgba(255,255,255,0.08);
  color: #9CA3AF; font-size: 0.8rem; font-weight: 600; cursor: pointer;
  white-space: nowrap; transition: all 0.2s; font-family: inherit;
}
.chart-btn.ativo { background: #8B5CF6; border-color: #8B5CF6; color: #fff; }

.secao { margin-bottom: 24px; }
.secao-titulo { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: rgba(255,255,255,0.4); margin: 0 0 12px; }
.grafico-container { border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); background: #0D1117; }

/* Stats */
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stat-card {
  background: #161B22; border-radius: 12px; padding: 14px;
  border: 1px solid rgba(255,255,255,0.06);
}
.stat-card.destaque-roxo { border-color: rgba(139,92,246,0.3); background: rgba(139,92,246,0.05); }
.stat-card.destaque-ouro { border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.05); }
.stat-label { font-size: 0.65rem; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 6px; }
.stat-valor { font-size: 0.95rem; font-weight: 700; color: #F0F6FC; margin: 0; }

/* Tabela */
.tabela-wrap {
  background: #161B22; border-radius: 14px;
  overflow-x: auto; border: 1px solid rgba(255,255,255,0.06);
}
.tabela { width: 100%; border-collapse: collapse; font-size: 0.78rem; white-space: nowrap; }
.tabela th {
  background: #1C2233; padding: 10px 8px; text-align: left;
  font-size: 0.62rem; font-weight: 700; color: #9CA3AF;
  text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.tabela td { padding: 10px 8px; border-bottom: 1px solid rgba(255,255,255,0.04); color: #D1D5DB; }
.tabela tbody tr:last-child td { border-bottom: none; }
.tabela tbody tr:hover td { background: rgba(255,255,255,0.02); }
.tabela tfoot td { border-top: 1px solid rgba(255,255,255,0.1); }
.td-mes { font-weight: 600; color: #F0F6FC; }
.num { text-align: right; }
.totais-row td { font-weight: 700; color: #F0F6FC; background: #1C2233; }

.verde { color: #10B981; }
.vermelho { color: #EF4444; }
.roxo { color: #8B5CF6; }
.ouro { color: #F59E0B; }
.branco { color: #F0F6FC; }

.slide-filtro-enter-active, .slide-filtro-leave-active { transition: all 0.25s ease; }
.slide-filtro-enter-from, .slide-filtro-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
