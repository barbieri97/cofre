<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Gráficos</ion-title>
        <ion-buttons slot="end">
          <ion-button id="btn-filtro-graficos" fill="clear" @click="mostrarFiltro = !mostrarFiltro">
            <ion-icon :icon="filterOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Filtro fixo dentro do header -->
      <transition name="slide-filtro">
        <ion-toolbar v-if="mostrarFiltro" class="filtro-toolbar">
          <div class="filtro-panel">
            <p class="filtro-title">Filtrar período</p>
            <div class="filtro-row">
              <div class="filtro-group">
                <label>De</label>
                <div class="filtro-selects">
                  <ion-select v-model="filtroLocal.mesInicio" interface="action-sheet" @ion-change="aplicarFiltro">
                    <ion-select-option v-for="(m, i) in MESES_ABREV" :key="i" :value="i + 1">{{ m }}</ion-select-option>
                  </ion-select>
                  <ion-select v-model="filtroLocal.anoInicio" interface="action-sheet" @ion-change="aplicarFiltro">
                    <ion-select-option v-for="a in anos" :key="a" :value="a">{{ a }}</ion-select-option>
                  </ion-select>
                </div>
              </div>
              <div class="filtro-group">
                <label>Até</label>
                <div class="filtro-selects">
                  <ion-select v-model="filtroLocal.mesFim" interface="action-sheet" @ion-change="aplicarFiltro">
                    <ion-select-option v-for="(m, i) in MESES_ABREV" :key="i" :value="i + 1">{{ m }}</ion-select-option>
                  </ion-select>
                  <ion-select v-model="filtroLocal.anoFim" interface="action-sheet" @ion-change="aplicarFiltro">
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
      </transition>
    </ion-header>

    <ion-content>

      <!-- Sem dados -->
      <div v-if="!pontosGrafico.length" class="empty-state">
        <ion-icon :icon="barChartOutline" class="es-icon" />
        <h3 class="es-titulo">Sem dados no período</h3>
        <p class="es-sub">Adicione registros mensais ou ajuste o filtro para visualizar os gráficos.</p>
        <ion-button router-link="/tabs/registros" fill="outline" color="primary">
          Ir para Registros
        </ion-button>
      </div>

      <div v-else class="page-content">
        <!-- Seletor de tipo de gráfico -->
        <div class="tipo-selector">
          <button
            id="btn-tipo-linha"
            :class="['tipo-btn', tipoGrafico === 'linha' && 'ativo']"
            @click="tipoGrafico = 'linha'"
          >
            <ion-icon :icon="trendingUpOutline" /> Patrimônio
          </button>
          <button
            id="btn-tipo-linha-comp"
            :class="['tipo-btn', tipoGrafico === 'linha-comparativo' && 'ativo']"
            @click="tipoGrafico = 'linha-comparativo'"
          >
            <ion-icon :icon="trendingUpOutline" /> Evolução G/G
          </button>
          <button
            id="btn-tipo-barra"
            :class="['tipo-btn', tipoGrafico === 'barra' && 'ativo']"
            @click="tipoGrafico = 'barra'"
          >
            <ion-icon :icon="barChartOutline" /> Barras
          </button>
          <button
            id="btn-tipo-saldo"
            :class="['tipo-btn', tipoGrafico === 'saldo' && 'ativo']"
            @click="tipoGrafico = 'saldo'"
          >
            <ion-icon :icon="walletOutline" /> Saldo
          </button>
        </div>

        <!-- Gráfico Principal -->
        <div class="secao">
          <p class="secao-titulo">
            {{
              tipoGrafico === 'linha' ? 'Evolução do Patrimônio'
              : tipoGrafico === 'linha-comparativo' ? 'Evolução Ganhos vs Gastos'
              : tipoGrafico === 'saldo' ? 'Saldo Mensal (quanto guardei)'
              : 'Ganhos vs Gastos (Barras)'
            }}
          </p>
          <div class="grafico-container">
            <GraficoCanvas :dados="pontosGrafico" :tipo="tipoGrafico" :height="240" />
          </div>
        </div>

        <!-- Cards de estatísticas do período -->
        <div class="secao">
          <p class="secao-titulo">Resumo do Período</p>
          <div class="stats-grid">
            <div class="stat-card">
              <p class="stat-label">Patrimônio Inicial</p>
              <p class="stat-valor">{{ formatCurrency(estatisticas.patrimonioInicial) }}</p>
            </div>
            <div class="stat-card destaque-verde">
              <p class="stat-label">Patrimônio Atual</p>
              <p class="stat-valor verde">{{ formatCurrency(estatisticas.patrimonioAtual) }}</p>
            </div>
            <div class="stat-card">
              <p class="stat-label">Total Ganhos</p>
              <p class="stat-valor verde">{{ formatCurrency(estatisticas.totalGanhos) }}</p>
            </div>
            <div class="stat-card">
              <p class="stat-label">Total Gastos</p>
              <p class="stat-valor vermelho">{{ formatCurrency(estatisticas.totalGastos) }}</p>
            </div>
            <div class="stat-card">
              <p class="stat-label">Saldo Líquido</p>
              <p class="stat-valor" :class="estatisticas.saldoLiquido >= 0 ? 'verde' : 'vermelho'">
                {{ formatCurrency(estatisticas.saldoLiquido) }}
              </p>
            </div>
            <div class="stat-card destaque-roxo">
              <p class="stat-label">Taxa de Poupança</p>
              <p class="stat-valor roxo">{{ formatPercent(estatisticas.taxaPoupanca) }}</p>
            </div>
          </div>
        </div>

        <!-- Tabela detalhada -->
        <div class="secao">
          <p class="secao-titulo">Tabela Detalhada</p>
          <div class="tabela-wrap">
            <table class="tabela">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th class="num">Ganhos</th>
                  <th class="num">Gastos</th>
                  <th class="num">Saldo</th>
                  <th class="num">Patrimônio</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in tabelaDados" :key="i">
                  <td class="td-mes">{{ p.label }}</td>
                  <td class="num verde">{{ formatCurrency(p.ganhos) }}</td>
                  <td class="num vermelho">{{ formatCurrency(p.gastos) }}</td>
                  <td class="num" :class="p.saldo >= 0 ? 'verde' : 'vermelho'">
                    {{ formatCurrency(p.saldo) }}
                  </td>
                  <td class="num branco">{{ formatCurrency(p.patrimonio) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="totais-row">
                  <td>Total</td>
                  <td class="num verde">{{ formatCurrency(estatisticas.totalGanhos) }}</td>
                  <td class="num vermelho">{{ formatCurrency(estatisticas.totalGastos) }}</td>
                  <td class="num" :class="estatisticas.saldoLiquido >= 0 ? 'verde' : 'vermelho'">
                    {{ formatCurrency(estatisticas.saldoLiquido) }}
                  </td>
                  <td class="num branco">{{ formatCurrency(estatisticas.patrimonioAtual) }}</td>
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
import { ref, computed, watch } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonSelect, IonSelectOption
} from '@ionic/vue';
import { filterOutline, barChartOutline, trendingUpOutline, walletOutline } from 'ionicons/icons';
import { usePatrimonio } from '../composables/usePatrimonio';
import GraficoCanvas from '../components/GraficoCanvas.vue';
import { MESES_ABREV, formatCurrency, formatPercent } from '../types';

const { filtro, pontosGrafico, estatisticas, setFiltro, resetarFiltro } = usePatrimonio();

const mostrarFiltro = ref(false);
const tipoGrafico = ref<'linha' | 'barra' | 'linha-comparativo' | 'saldo'>('linha');
const filtroLocal = ref({ ...filtro.value });

watch(filtro, n => { filtroLocal.value = { ...n }; }, { deep: true });

const anos = computed(() => {
  const a = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, i) => a - 5 + i);
});

const tabelaDados = computed(() => [...pontosGrafico.value]);

function aplicarFiltro() { setFiltro({ ...filtroLocal.value }); }
function limparFiltro() { resetarFiltro(); filtroLocal.value = { ...filtro.value }; }
</script>

<style scoped>
/* Filtro toolbar fixo */
.filtro-toolbar {
  --background: #161B22;
  --border-color: rgba(255,255,255,0.07);
}

/* Filtro panel */
.filtro-panel {
  padding: 12px 16px 8px;
}
.filtro-title {
  font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; color: #10B981; margin: 0 0 12px;
}
.filtro-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.filtro-group > label {
  font-size: 0.7rem; color: #9CA3AF; text-transform: uppercase;
  letter-spacing: 0.06em; display: block; margin-bottom: 6px;
}
.filtro-selects { display: flex; gap: 6px; }
.filtro-selects ion-select {
  flex: 1; font-size: 0.82rem; padding: 8px 10px;
  background: #21262D; border-radius: 8px; border: 1px solid rgba(255,255,255,0.07);
}
.btn-limpar { margin-top: 8px; }

.empty-state {
  height: 65vh; display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 32px; text-align: center;
}
.es-icon { font-size: 3.5rem; color: #374151; margin-bottom: 16px; display: block; }
.es-titulo { font-size: 1.2rem; font-weight: 700; color: #F0F6FC; margin: 0 0 8px; }
.es-sub { font-size: 0.85rem; color: #9CA3AF; margin: 0 0 24px; line-height: 1.6; }

.page-content { padding: 16px; padding-bottom: 32px; }

/* Seletor tipo */
.tipo-selector {
  display: flex; gap: 8px; margin-bottom: 20px;
  background: #161B22; padding: 4px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06);
}
.tipo-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px; border-radius: 8px; background: transparent; border: none;
  color: #9CA3AF; font-size: 0.82rem; font-weight: 600; cursor: pointer;
  transition: all 0.2s; font-family: inherit;
}
.tipo-btn.ativo { background: #10B981; color: #fff; }
.tipo-btn ion-icon { font-size: 1rem; }

/* Seções */
.secao { margin-bottom: 24px; }
.secao-titulo { font-size: 0.9rem; font-weight: 700; color: #F0F6FC; margin: 0 0 12px; }
.grafico-container { border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); }

/* Stats */
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stat-card {
  background: #161B22; border-radius: 12px; padding: 14px;
  border: 1px solid rgba(255,255,255,0.06);
}
.stat-card.destaque-verde { border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.05); }
.stat-card.destaque-roxo { border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.05); }
.stat-label { font-size: 0.65rem; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 6px; }
.stat-valor { font-size: 0.95rem; font-weight: 700; color: #F0F6FC; margin: 0; }

/* Tabela */
.tabela-wrap {
  background: #161B22; border-radius: 14px; overflow-x: auto; overflow-y: hidden;
  border: 1px solid rgba(255,255,255,0.06);
}
.tabela { width: 100%; border-collapse: collapse; font-size: 0.78rem; white-space: nowrap; }
.tabela th {
  background: #1C2233; padding: 10px 8px; text-align: left;
  font-size: 0.65rem; font-weight: 700; color: #9CA3AF;
  text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.tabela td {
  padding: 10px 8px; border-bottom: 1px solid rgba(255,255,255,0.04);
  color: #D1D5DB;
}
.tabela tbody tr:last-child td { border-bottom: none; }
.tabela tbody tr:hover td { background: rgba(255,255,255,0.02); }
.tabela tfoot td { border-top: 1px solid rgba(255,255,255,0.1); }
.td-mes { font-weight: 600; color: #F0F6FC; white-space: nowrap; }
.num { text-align: right; }
.totais-row td { font-weight: 700; color: #F0F6FC; background: #1C2233; }

.verde { color: #10B981; }
.vermelho { color: #EF4444; }
.roxo { color: #6366F1; }
.branco { color: #F0F6FC; }

.slide-filtro-enter-active, .slide-filtro-leave-active { transition: all 0.25s ease; }
.slide-filtro-enter-from, .slide-filtro-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
