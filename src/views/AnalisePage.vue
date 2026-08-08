<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Análise</ion-title>
        <ion-buttons slot="end">
          <ion-button id="btn-filtro-analise" fill="clear" @click="mostrarFiltro = !mostrarFiltro">
            <ion-icon :icon="mostrarFiltro ? closeOutline : filterOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <transition name="slide-filtro">
        <FiltroPeriodoPanel v-if="mostrarFiltro" />
      </transition>
    </ion-header>

    <ion-content>
      <!-- Sem registro nenhum -->
      <div v-if="!registros.length" class="empty-state">
        <ion-icon :icon="barChartOutline" class="es-icon" />
        <h3 class="es-titulo">Nenhum dado ainda</h3>
        <p class="es-sub">Adicione registros mensais para ver seus gráficos e estatísticas.</p>
        <ion-button router-link="/tabs/registros" fill="outline" color="primary">
          Adicionar registros
        </ion-button>
      </div>

      <div v-else class="page-content">

        <!-- ── Gráfico ─────────────────────────────────────── -->
        <div v-if="pontosGrafico.length" class="secao">
          <div class="chart-selector-wrap">
            <div class="chart-selector">
              <button
                v-for="opt in OPCOES_GRAFICO"
                :key="opt.tipo"
                :class="['chart-btn', tipoGrafico === opt.tipo && 'ativo']"
                @click="tipoGrafico = opt.tipo"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <p class="secao-titulo">{{ opcaoAtiva?.titulo }}</p>
          <div class="grafico-container">
            <GraficoCanvas :dados="pontosGrafico" :tipo="tipoGrafico" :height="250" />
          </div>
        </div>

        <div v-else class="sem-periodo">
          <p>Nenhum dado no período selecionado. Ajuste o filtro acima.</p>
        </div>

        <!-- ── Período × Histórico ─────────────────────────── -->
        <ion-segment v-model="aba" class="analise-segment">
          <ion-segment-button value="periodo">
            <ion-label>Período</ion-label>
          </ion-segment-button>
          <ion-segment-button value="historico">
            <ion-label>Histórico</ion-label>
          </ion-segment-button>
        </ion-segment>

        <!-- ═══ PERÍODO (respeita o filtro) ═══════════════════ -->
        <template v-if="aba === 'periodo'">
          <p class="aba-contexto">{{ rotuloPeriodo }}</p>

          <template v-if="pontosGrafico.length">
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
          </template>
        </template>

        <!-- ═══ HISTÓRICO (todo o histórico, ignora o filtro) ═ -->
        <template v-else>
          <p class="aba-contexto">Todo o histórico · {{ registros.length }} {{ registros.length === 1 ? 'mês' : 'meses' }}</p>

          <div class="secao">
            <p class="secao-titulo">🛡 Fôlego financeiro</p>
            <CardFolego
              :folego="folego"
              :janela="config.janelaFolego"
              :reserva-alvo-meses="config.reservaAlvoMeses"
              @update:janela="setJanelaFolego"
            />
          </div>

          <div class="secao">
            <div class="secao-header-badge">
              <p class="secao-titulo">Médias — Últimos 12 meses</p>
              <span class="secao-badge">{{ Math.min(registros.length, 12) }}m</span>
            </div>

            <div class="cards-col">
              <div class="media-card">
                <div class="mc-left verde-bg"><ion-icon :icon="arrowUpOutline" class="mc-icon verde" /></div>
                <div class="mc-body">
                  <p class="mc-label">Receita Média Mensal</p>
                  <p class="mc-valor verde">{{ formatCurrency(eg.mediaGanhos12m) }}</p>
                </div>
              </div>
              <div class="media-card">
                <div class="mc-left vermelho-bg"><ion-icon :icon="arrowDownOutline" class="mc-icon vermelho" /></div>
                <div class="mc-body">
                  <p class="mc-label">Despesa Média Mensal</p>
                  <p class="mc-valor vermelho">{{ formatCurrency(eg.mediaGastos12m) }}</p>
                </div>
              </div>
              <div class="media-card">
                <div class="mc-left roxo-bg"><ion-icon :icon="walletOutline" class="mc-icon roxo" /></div>
                <div class="mc-body">
                  <p class="mc-label">Saldo Médio Mensal</p>
                  <p class="mc-valor" :class="eg.mediaSaldo12m >= 0 ? 'verde' : 'vermelho'">
                    {{ formatCurrency(eg.mediaSaldo12m) }}
                  </p>
                </div>
              </div>
              <div class="media-card">
                <div class="mc-left ouro-bg"><ion-icon :icon="saveOutline" class="mc-icon ouro" /></div>
                <div class="mc-body">
                  <p class="mc-label">Taxa de Poupança Média</p>
                  <p class="mc-valor ouro">{{ formatPercent(eg.mediaTaxaPoupanca12m) }}</p>
                </div>
              </div>
              <div class="media-card">
                <div class="mc-left azul-bg"><ion-icon :icon="trendingUpOutline" class="mc-icon azul" /></div>
                <div class="mc-body">
                  <p class="mc-label">Crescimento Médio Mensal</p>
                  <p class="mc-valor" :class="eg.crescimentoMedioMensal >= 0 ? 'verde' : 'vermelho'">
                    {{ formatCurrency(eg.crescimentoMedioMensal) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

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

          <div class="secao">
            <p class="secao-titulo">📋 Visão geral</p>
            <div class="overview-list">
              <div class="ov-row">
                <span class="ov-label">Total de meses registrados</span>
                <span class="ov-valor">{{ registros.length }} meses</span>
              </div>
              <div class="ov-row">
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
        </template>

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonSegment, IonSegmentButton, IonLabel
} from '@ionic/vue';
import {
  filterOutline, closeOutline, barChartOutline, arrowUpOutline,
  arrowDownOutline, walletOutline, saveOutline, trendingUpOutline
} from 'ionicons/icons';
import { usePatrimonio } from '../composables/usePatrimonio';
import GraficoCanvas from '../components/GraficoCanvas.vue';
import type { TipoGrafico } from '../components/GraficoCanvas.vue';
import FiltroPeriodoPanel from '../components/FiltroPeriodoPanel.vue';
import CardFolego from '../components/CardFolego.vue';
import {
  formatCurrency, formatCurrencyK, formatPercent, labelMes, labelAno
} from '../types';

const {
  registros, config, filtro, pontosGrafico, estatisticas, estatisticasGerais,
  patrimonioAtualGeral, folego, setJanelaFolego,
} = usePatrimonio();

const eg = estatisticasGerais;

const mostrarFiltro = ref(false);
const aba = ref<'periodo' | 'historico'>('periodo');
const tipoGrafico = ref<TipoGrafico>('patrimonio');

const OPCOES_GRAFICO: { tipo: TipoGrafico; label: string; titulo: string }[] = [
  { tipo: 'patrimonio',      label: '💼 Patrimônio',   titulo: 'Evolução do Patrimônio' },
  { tipo: 'receita-despesa', label: '⚖️ Rec × Desp',   titulo: 'Receita × Despesa' },
  { tipo: 'poupanca',        label: '📊 Poupança',     titulo: 'Taxa de Poupança (%)' },
  { tipo: 'crescimento',     label: '📈 Crescimento',  titulo: 'Crescimento Patrimonial' },
];

const opcaoAtiva = computed(() => OPCOES_GRAFICO.find(o => o.tipo === tipoGrafico.value));

const rotuloPeriodo = computed(() =>
  filtro.value.tipo === 'anos'
    ? `${labelAno(filtro.value.anoInicio)} → ${labelAno(filtro.value.anoFim)}`
    : `${labelMes(filtro.value.mesInicio, filtro.value.anoInicio)} → ${labelMes(filtro.value.mesFim, filtro.value.anoFim)}`
);

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

.page-content { padding: 16px; padding-bottom: 32px; }

.secao { margin-bottom: 26px; }
.secao-titulo {
  font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.07em; color: rgba(255,255,255,0.4); margin: 0 0 12px;
}
.secao-header-badge { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.secao-header-badge .secao-titulo { margin: 0; }
.secao-badge {
  font-size: 0.62rem; font-weight: 700; color: #8B5CF6;
  background: rgba(139,92,246,0.12); border-radius: 6px; padding: 3px 8px;
}

/* Seletor de gráficos */
.chart-selector-wrap { margin-bottom: 18px; overflow-x: auto; }
.chart-selector { display: flex; gap: 8px; padding-bottom: 4px; }
.chart-btn {
  flex-shrink: 0; background: #161B22; border: 1px solid rgba(255,255,255,0.07);
  border-radius: 20px; padding: 8px 14px; color: #9CA3AF;
  font-size: 0.75rem; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: all 0.2s ease; white-space: nowrap;
}
.chart-btn.ativo {
  background: rgba(139,92,246,0.15); border-color: rgba(139,92,246,0.4); color: #C4B5FD;
}

.grafico-container {
  background: #161B22; border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.06); padding: 8px;
}

.sem-periodo {
  background: #161B22; border-radius: 14px;
  border: 1px dashed rgba(255,255,255,0.1);
  padding: 24px 20px; text-align: center; margin-bottom: 20px;
}
.sem-periodo p { font-size: 0.85rem; color: #6B7280; margin: 0; }

/* Segment Período | Histórico */
.analise-segment {
  --background: rgba(255,255,255,0.04);
  border-radius: 10px;
  margin-bottom: 8px;
}
.analise-segment ion-segment-button {
  --color: #6B7280; --color-checked: #F0F6FC;
  --indicator-color: rgba(139,92,246,0.25);
  --border-radius: 8px;
  min-height: 34px; font-size: 0.75rem; font-weight: 600; text-transform: none;
}
.aba-contexto { font-size: 0.7rem; color: #6B7280; margin: 0 0 18px; text-align: center; }

/* Stats do período */
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stat-card {
  background: #161B22; border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06); padding: 14px;
}
.stat-card.destaque-roxo { border-color: rgba(139,92,246,0.2); background: rgba(139,92,246,0.04); }
.stat-card.destaque-ouro { border-color: rgba(245,158,11,0.2); background: rgba(245,158,11,0.04); }
.stat-label {
  font-size: 0.63rem; color: #9CA3AF; text-transform: uppercase;
  letter-spacing: 0.06em; margin: 0 0 6px;
}
.stat-valor { font-size: 1.02rem; font-weight: 800; color: #F0F6FC; margin: 0; letter-spacing: -0.01em; }

/* Tabela */
.tabela-wrap {
  background: #161B22; border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06); overflow-x: auto;
}
.tabela { width: 100%; border-collapse: collapse; font-size: 0.72rem; }
.tabela th {
  text-align: left; padding: 10px 8px; color: #6B7280;
  font-weight: 700; text-transform: uppercase; font-size: 0.6rem;
  letter-spacing: 0.05em; border-bottom: 1px solid rgba(255,255,255,0.06);
  white-space: nowrap;
}
.tabela td {
  padding: 9px 8px; color: #D1D5DB;
  border-bottom: 1px solid rgba(255,255,255,0.03); white-space: nowrap;
}
.tabela .num { text-align: right; }
.tabela .td-mes { font-weight: 700; color: #F0F6FC; }
.totais-row td {
  font-weight: 800; border-top: 1px solid rgba(255,255,255,0.1);
  border-bottom: none; color: #F0F6FC;
}

/* Médias */
.cards-col { display: flex; flex-direction: column; gap: 10px; }
.media-card {
  background: #161B22; border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06); padding: 14px;
  display: flex; align-items: center; gap: 14px;
}
.mc-left {
  width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.mc-left.verde-bg { background: rgba(16,185,129,0.12); }
.mc-left.vermelho-bg { background: rgba(239,68,68,0.12); }
.mc-left.roxo-bg { background: rgba(139,92,246,0.12); }
.mc-left.ouro-bg { background: rgba(245,158,11,0.12); }
.mc-left.azul-bg { background: rgba(59,130,246,0.12); }
.mc-icon { font-size: 1.2rem; }
.mc-body { flex: 1; }
.mc-label {
  font-size: 0.65rem; color: #9CA3AF; text-transform: uppercase;
  letter-spacing: 0.06em; margin: 0 0 4px;
}
.mc-valor { font-size: 1.15rem; font-weight: 800; margin: 0; letter-spacing: -0.01em; }

/* Recordes */
.records-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.record-card {
  background: #161B22; border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06); padding: 14px;
}
.rec-categoria { font-size: 0.68rem; font-weight: 700; margin: 0 0 8px; }
.rec-valor { font-size: 1.05rem; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.01em; }
.rec-periodo { font-size: 0.68rem; color: #6B7280; margin: 0; }

/* Visão geral */
.overview-list {
  background: #161B22; border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06); overflow: hidden;
}
.ov-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 13px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.ov-row:last-child { border-bottom: none; }
.ov-label { font-size: 0.78rem; color: #9CA3AF; }
.ov-valor { font-size: 0.82rem; font-weight: 700; color: #F0F6FC; text-align: right; }

.verde { color: #10B981; }
.vermelho { color: #EF4444; }
.roxo { color: #8B5CF6; }
.ouro { color: #F59E0B; }
.azul { color: #3B82F6; }
.branco { color: #F0F6FC; }

/* Transição do painel de filtro */
.slide-filtro-enter-active, .slide-filtro-leave-active { transition: all 0.25s ease; }
.slide-filtro-enter-from, .slide-filtro-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
