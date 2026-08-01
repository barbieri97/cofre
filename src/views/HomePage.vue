<template>
  <ion-page>
    <ion-header :translucent="false">
      <ion-toolbar>
        <ion-title>
          <span class="logo-text">🔒 Cofre</span>
        </ion-title>
        <ion-buttons slot="end">
          <ion-button id="btn-filtro-home" fill="clear" @click="mostrarFiltro = !mostrarFiltro">
            <ion-icon :icon="mostrarFiltro ? closeOutline : filterOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Painel de Filtro -->
      <transition name="slide-filtro">
        <ion-toolbar v-if="mostrarFiltro" class="filtro-toolbar">
          <div class="filtro-panel">
            <!-- Seletor de tipo de visão -->
            <div class="visao-selector">
              <button
                :class="['visao-btn', tipoFiltro === 'meses' && 'ativo']"
                @click="tipoFiltro = 'meses'"
              >📅 Meses</button>
              <button
                :class="['visao-btn', tipoFiltro === 'anos' && 'ativo']"
                @click="tipoFiltro = 'anos'"
              >📆 Ano</button>
            </div>

            <!-- Filtro por meses -->
            <div v-if="tipoFiltro === 'meses'" class="filtro-row">
              <div class="filtro-group">
                <label>De</label>
                <div class="filtro-selects">
                  <ion-select
                    v-model="filtroLocal.mesInicio"
                    interface="action-sheet"
                    :interface-options="{ header: 'Mês inicial' }"
                    @ion-change="aplicarFiltro"
                  >
                    <ion-select-option v-for="(m, i) in MESES_ABREV" :key="i" :value="i + 1">{{ m }}</ion-select-option>
                  </ion-select>
                  <ion-select
                    v-model="filtroLocal.anoInicio"
                    interface="action-sheet"
                    :interface-options="{ header: 'Ano inicial' }"
                    @ion-change="aplicarFiltro"
                  >
                    <ion-select-option v-for="a in anos" :key="a" :value="a">{{ a }}</ion-select-option>
                  </ion-select>
                </div>
              </div>
              <div class="filtro-group">
                <label>Até</label>
                <div class="filtro-selects">
                  <ion-select
                    v-model="filtroLocal.mesFim"
                    interface="action-sheet"
                    :interface-options="{ header: 'Mês final' }"
                    @ion-change="aplicarFiltro"
                  >
                    <ion-select-option v-for="(m, i) in MESES_ABREV" :key="i" :value="i + 1">{{ m }}</ion-select-option>
                  </ion-select>
                  <ion-select
                    v-model="filtroLocal.anoFim"
                    interface="action-sheet"
                    :interface-options="{ header: 'Ano final' }"
                    @ion-change="aplicarFiltro"
                  >
                    <ion-select-option v-for="a in anos" :key="a" :value="a">{{ a }}</ion-select-option>
                  </ion-select>
                </div>
              </div>
            </div>

            <!-- Filtro por ano -->
            <div v-else class="filtro-ano-wrap">
              <ion-select
                v-model="anoSelecionado"
                interface="action-sheet"
                :interface-options="{ header: 'Selecione o ano' }"
                @ion-change="aplicarFiltroAno"
                class="select-ano-unico"
              >
                <ion-select-option v-for="a in anos" :key="a" :value="a">{{ a }}</ion-select-option>
              </ion-select>
            </div>

            <ion-button fill="clear" size="small" color="medium" @click="limparFiltro" class="btn-limpar">
              Limpar filtro
            </ion-button>
          </div>
        </ion-toolbar>
      </transition>
    </ion-header>

    <ion-content :fullscreen="false">

      <!-- Boas-vindas (primeiro uso) -->
      <div v-if="config.primeiroUso" class="boas-vindas">
        <div class="bv-emoji">🔒</div>
        <h2 class="bv-titulo">Bem-vindo ao Cofre!</h2>
        <p class="bv-sub">Configure seu patrimônio inicial e comece a registrar seus meses financeiros.</p>
        <ion-button id="btn-ir-config" router-link="/tabs/configuracoes" color="primary" expand="block">
          Configurar agora
        </ion-button>
      </div>

      <div v-else class="page-content">

        <!-- ── Hero Patrimônio ────────────────────────────── -->
        <div class="patrimonio-hero">
          <div class="ph-top">
            <p class="ph-label">Patrimônio Líquido</p>
            <p class="ph-periodo">
              {{ labelMes(filtro.mesInicio, filtro.anoInicio) }} → {{ labelMes(filtro.mesFim, filtro.anoFim) }}
            </p>
          </div>
          <h1 class="ph-valor">{{ formatCurrency(estatisticas.patrimonioAtual) }}</h1>

          <!-- Crescimento vs período anterior -->
          <div v-if="pontosGrafico.length > 0" class="ph-variacao" :class="estatisticas.variacaoTotal >= 0 ? 'positivo' : 'negativo'">
            <ion-icon :icon="estatisticas.variacaoTotal >= 0 ? trendingUpOutline : trendingDownOutline" />
            <span>
              {{ estatisticas.variacaoTotal >= 0 ? '+' : '' }}{{ formatCurrency(estatisticas.variacaoTotal) }}
              &nbsp;({{ formatPercent(estatisticas.variacaoPercentual) }})
              <span class="ph-variacao-label">no período</span>
            </span>
          </div>

          <!-- Decoração -->
          <div class="ph-deco" />
          <div class="ph-deco2" />
        </div>

        <!-- ── Cards do mês atual ─────────────────────────── -->
        <div v-if="temUltimoMes" class="secao">
          <p class="secao-titulo">Último mês registrado</p>
          <div class="cards-grid-2">

            <!-- Crescimento vs mês anterior -->
            <div class="kpi-card" :class="estatisticas.crescimentoUltimoMes >= 0 ? 'kpi-verde' : 'kpi-vermelho'">
              <div class="kpi-top">
                <ion-icon :icon="estatisticas.crescimentoUltimoMes >= 0 ? trendingUpOutline : trendingDownOutline" class="kpi-icon" />
                <span class="kpi-label">Crescimento Patrim.</span>
              </div>
              <p class="kpi-valor">
                {{ estatisticas.crescimentoUltimoMes >= 0 ? '+' : '' }}{{ formatCurrency(estatisticas.crescimentoUltimoMes) }}
              </p>
              <p class="kpi-sub">{{ formatPercent(estatisticas.crescimentoPercUltimoMes) }} vs mês ant.</p>
            </div>

            <!-- Taxa de poupança -->
            <div class="kpi-card" :class="estatisticas.taxaPoupancaUltimoMes >= 20 ? 'kpi-verde' : estatisticas.taxaPoupancaUltimoMes >= 0 ? 'kpi-ouro' : 'kpi-vermelho'">
              <div class="kpi-top">
                <ion-icon :icon="saveOutline" class="kpi-icon" />
                <span class="kpi-label">Taxa de Poupança</span>
              </div>
              <p class="kpi-valor">{{ formatPercent(estatisticas.taxaPoupancaUltimoMes) }}</p>
              <p class="kpi-sub">do que entrou foi poupado</p>
            </div>
          </div>

          <!-- Receita / Despesa / Saldo -->
          <div class="cards-grid-3">
            <div class="mini-card verde">
              <ion-icon :icon="arrowUpOutline" class="mc-icon" />
              <div>
                <p class="mc-label">Receita</p>
                <p class="mc-valor">{{ formatCurrency(estatisticas.ganhosUltimoMes) }}</p>
              </div>
            </div>
            <div class="mini-card vermelho">
              <ion-icon :icon="arrowDownOutline" class="mc-icon" />
              <div>
                <p class="mc-label">Despesa</p>
                <p class="mc-valor">{{ formatCurrency(estatisticas.gastosUltimoMes) }}</p>
              </div>
            </div>
            <div class="mini-card" :class="estatisticas.saldoUltimoMes >= 0 ? 'roxo' : 'vermelho-escuro'">
              <ion-icon :icon="walletOutline" class="mc-icon" />
              <div>
                <p class="mc-label">Saldo</p>
                <p class="mc-valor" :class="estatisticas.saldoUltimoMes >= 0 ? 'verde-txt' : 'vermelho-txt'">
                  {{ formatCurrency(estatisticas.saldoUltimoMes) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Resumo do período filtrado ────────────────── -->
        <div v-if="pontosGrafico.length > 1" class="secao">
          <p class="secao-titulo">Resumo do período</p>
          <div class="resumo-periodo">
            <div class="rp-item">
              <p class="rp-label">Total Receitas</p>
              <p class="rp-valor verde-txt">{{ formatCurrency(estatisticas.totalGanhos) }}</p>
            </div>
            <div class="rp-sep" />
            <div class="rp-item">
              <p class="rp-label">Total Despesas</p>
              <p class="rp-valor vermelho-txt">{{ formatCurrency(estatisticas.totalGastos) }}</p>
            </div>
            <div class="rp-sep" />
            <div class="rp-item">
              <p class="rp-label">Saldo Acumulado</p>
              <p class="rp-valor" :class="estatisticas.saldoLiquido >= 0 ? 'verde-txt' : 'vermelho-txt'">
                {{ formatCurrency(estatisticas.saldoLiquido) }}
              </p>
            </div>
            <div class="rp-sep" />
            <div class="rp-item">
              <p class="rp-label">Tx. Poupança Média</p>
              <p class="rp-valor ouro-txt">{{ formatPercent(estatisticas.taxaPoupanca) }}</p>
            </div>
          </div>
        </div>

        <!-- ── Mini gráfico patrimônio ────────────────────── -->
        <div v-if="pontosGrafico.length" class="secao">
          <div class="secao-header">
            <p class="secao-titulo">Evolução do Patrimônio</p>
            <router-link to="/tabs/graficos" class="ver-mais">Ver gráficos →</router-link>
          </div>
          <div class="grafico-container">
            <GraficoCanvas :dados="pontosGrafico" tipo="patrimonio" :height="180" />
          </div>
        </div>

        <!-- ── Últimos registros ───────────────────────────── -->
        <div class="secao" v-if="ultimosRegistros.length">
          <div class="secao-header">
            <p class="secao-titulo">Últimos registros</p>
            <router-link to="/tabs/registros" class="ver-mais">Ver todos →</router-link>
          </div>
          <div class="ultimos-list">
            <div
              v-for="(reg, i) in ultimosRegistros"
              :key="reg.id"
              class="ultimo-item"
            >
              <div class="ui-mes-badge">
                <span class="ui-mes-nome">{{ MESES_ABREV[reg.mes - 1] }}</span>
                <span class="ui-mes-ano">{{ reg.ano }}</span>
              </div>
              <div class="ui-values">
                <div class="ui-row">
                  <span class="ui-lbl">Receita</span>
                  <span class="ui-val verde-txt">{{ formatCurrency(reg.ganhos) }}</span>
                </div>
                <div class="ui-row">
                  <span class="ui-lbl">Despesa</span>
                  <span class="ui-val vermelho-txt">{{ formatCurrency(reg.gastos) }}</span>
                </div>
              </div>
              <div class="ui-saldo" :class="(reg.ganhos - reg.gastos) >= 0 ? 'positivo' : 'negativo'">
                {{ formatCurrency(reg.ganhos - reg.gastos) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Estado vazio -->
        <div v-if="!pontosGrafico.length && !config.primeiroUso" class="sem-dados">
          <ion-icon :icon="barChartOutline" class="sd-icon" />
          <p>Nenhum dado no período selecionado</p>
          <ion-button id="btn-ir-registros-home" router-link="/tabs/registros" fill="outline" color="primary" size="small">
            Adicionar registros
          </ion-button>
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
import {
  filterOutline, closeOutline, trendingUpOutline, trendingDownOutline,
  arrowUpOutline, arrowDownOutline, walletOutline,
  saveOutline, barChartOutline
} from 'ionicons/icons';
import { usePatrimonio } from '../composables/usePatrimonio';
import GraficoCanvas from '../components/GraficoCanvas.vue';
import { MESES_ABREV, formatCurrency, formatPercent, labelMes } from '../types';

const { config, filtro, registrosFiltrados, estatisticas, pontosGrafico, setFiltro, resetarFiltro } = usePatrimonio();

const mostrarFiltro = ref(false);
const tipoFiltro = ref<'meses' | 'anos'>('meses');
const filtroLocal = ref({ ...filtro.value });
const anoSelecionado = ref(new Date().getFullYear());

watch(filtro, (novo) => { filtroLocal.value = { ...novo }; }, { deep: true });

const anos = computed(() => {
  const a = new Date().getFullYear();
  return Array.from({ length: 12 }, (_, i) => a - 8 + i);
});

const temUltimoMes = computed(() => pontosGrafico.value.length > 0);

const ultimosRegistros = computed(() =>
  [...registrosFiltrados.value].slice(-4).reverse()
);

function aplicarFiltro() {
  setFiltro({ ...filtroLocal.value });
}

function aplicarFiltroAno() {
  setFiltro({
    mesInicio: 1,
    anoInicio: anoSelecionado.value,
    mesFim: 12,
    anoFim: anoSelecionado.value,
  });
  filtroLocal.value = {
    mesInicio: 1,
    anoInicio: anoSelecionado.value,
    mesFim: 12,
    anoFim: anoSelecionado.value,
  };
}

function limparFiltro() {
  resetarFiltro();
  filtroLocal.value = { ...filtro.value };
  anoSelecionado.value = new Date().getFullYear();
}
</script>

<style scoped>
.logo-text { font-weight: 800; font-size: 1.1rem; letter-spacing: -0.02em; }

/* Filtro */
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
.filtro-ano-wrap { margin-bottom: 4px; }
.select-ano-unico {
  width: 100%; font-size: 0.9rem; padding: 10px 14px;
  background: #21262D; border-radius: 10px; border: 1px solid rgba(255,255,255,0.07);
}
.btn-limpar { margin-top: 8px; }

/* Boas-vindas */
.boas-vindas { padding: 60px 28px; text-align: center; }
.bv-emoji { font-size: 4rem; margin-bottom: 20px; }
.bv-titulo { font-size: 1.6rem; font-weight: 800; color: #F0F6FC; margin: 0 0 10px; }
.bv-sub { font-size: 0.9rem; color: #9CA3AF; line-height: 1.7; margin: 0 0 32px; }

/* Page content */
.page-content { padding: 16px; padding-bottom: 40px; }

/* ── Hero ───────────────────────────────────── */
.patrimonio-hero {
  background: linear-gradient(135deg, #1a0a3e 0%, #2d1060 50%, #1e3a5f 100%);
  border-radius: 22px;
  padding: 22px 20px 20px;
  margin-bottom: 18px;
  box-shadow: 0 12px 40px rgba(139,92,246,0.25);
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(139,92,246,0.2);
}
.ph-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.ph-deco {
  position: absolute; top: -40px; right: -40px;
  width: 140px; height: 140px; border-radius: 50%;
  background: rgba(139,92,246,0.12);
}
.ph-deco2 {
  position: absolute; bottom: -30px; left: -20px;
  width: 100px; height: 100px; border-radius: 50%;
  background: rgba(59,130,246,0.1);
}
.ph-label { font-size: 0.72rem; font-weight: 700; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.1em; margin: 0; }
.ph-periodo { font-size: 0.7rem; color: rgba(255,255,255,0.4); margin: 0; }
.ph-valor { font-size: 2.2rem; font-weight: 800; color: #fff; margin: 4px 0 12px; letter-spacing: -0.03em; line-height: 1; }
.ph-variacao {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.88rem; font-weight: 600;
  background: rgba(255,255,255,0.06);
  padding: 8px 12px;
  border-radius: 10px;
  width: fit-content;
}
.ph-variacao.positivo { color: #6EE7B7; }
.ph-variacao.negativo { color: #FCA5A5; }
.ph-variacao ion-icon { font-size: 1rem; flex-shrink: 0; }
.ph-variacao-label { font-size: 0.72rem; color: rgba(255,255,255,0.4); font-weight: 400; }

/* ── Seções ─────────────────────────────────── */
.secao { margin-bottom: 20px; }
.secao-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.secao-titulo { font-size: 0.82rem; font-weight: 700; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 12px; }
.secao-header .secao-titulo { margin-bottom: 0; }
.ver-mais { font-size: 0.8rem; color: #8B5CF6; text-decoration: none; font-weight: 600; }
.grafico-container { border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); background: #0D1117; }

/* ── KPI Cards grandes ──────────────────────── */
.cards-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
.kpi-card {
  border-radius: 16px; padding: 16px;
  border: 1px solid rgba(255,255,255,0.06);
  background: #161B22;
}
.kpi-card.kpi-verde { border-color: rgba(16,185,129,0.25); background: rgba(16,185,129,0.06); }
.kpi-card.kpi-vermelho { border-color: rgba(239,68,68,0.25); background: rgba(239,68,68,0.06); }
.kpi-card.kpi-ouro { border-color: rgba(245,158,11,0.25); background: rgba(245,158,11,0.06); }
.kpi-top { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.kpi-icon { font-size: 1rem; flex-shrink: 0; }
.kpi-card.kpi-verde .kpi-icon { color: #10B981; }
.kpi-card.kpi-vermelho .kpi-icon { color: #EF4444; }
.kpi-card.kpi-ouro .kpi-icon { color: #F59E0B; }
.kpi-label { font-size: 0.65rem; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
.kpi-valor { font-size: 1rem; font-weight: 800; color: #F0F6FC; margin: 0 0 2px; line-height: 1.2; }
.kpi-sub { font-size: 0.65rem; color: #6B7280; margin: 0; }

/* ── Mini Cards 3 colunas ───────────────────── */
.cards-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.mini-card {
  background: #161B22;
  border-radius: 12px;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  border: 1px solid rgba(255,255,255,0.06);
}
.mini-card.verde { border-left: 3px solid #10B981; }
.mini-card.vermelho { border-left: 3px solid #EF4444; }
.mini-card.roxo { border-left: 3px solid #8B5CF6; }
.mini-card.vermelho-escuro { border-left: 3px solid #EF4444; }
.mc-icon { font-size: 1rem; }
.mini-card.verde .mc-icon { color: #10B981; }
.mini-card.vermelho .mc-icon, .mini-card.vermelho-escuro .mc-icon { color: #EF4444; }
.mini-card.roxo .mc-icon { color: #8B5CF6; }
.mc-label { font-size: 0.62rem; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 2px; }
.mc-valor { font-size: 0.82rem; font-weight: 700; color: #F0F6FC; margin: 0; }

/* ── Resumo período ─────────────────────────── */
.resumo-periodo {
  background: #161B22;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06);
  padding: 14px;
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
  align-items: center;
  gap: 0;
}
.rp-item { text-align: center; }
.rp-label { font-size: 0.6rem; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 4px; }
.rp-valor { font-size: 0.82rem; font-weight: 700; color: #F0F6FC; margin: 0; }
.rp-sep { width: 1px; background: rgba(255,255,255,0.07); height: 28px; }

/* ── Últimos registros ──────────────────────── */
.ultimos-list { display: flex; flex-direction: column; gap: 8px; }
.ultimo-item {
  background: #161B22;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06);
  padding: 12px 14px;
  display: grid;
  grid-template-columns: 52px 1fr auto;
  align-items: center;
  gap: 10px;
}
.ui-mes-badge { display: flex; flex-direction: column; }
.ui-mes-nome { font-size: 0.95rem; font-weight: 800; color: #F0F6FC; line-height: 1; }
.ui-mes-ano { font-size: 0.68rem; color: #9CA3AF; margin-top: 2px; }
.ui-values { display: flex; flex-direction: column; gap: 3px; }
.ui-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ui-lbl { font-size: 0.68rem; color: #6B7280; }
.ui-val { font-size: 0.78rem; font-weight: 600; }
.ui-saldo { font-size: 0.9rem; font-weight: 700; padding: 6px 10px; border-radius: 8px; text-align: right; white-space: nowrap; }
.ui-saldo.positivo { background: rgba(16,185,129,0.1); color: #10B981; }
.ui-saldo.negativo { background: rgba(239,68,68,0.1); color: #EF4444; }

/* ── Sem dados ──────────────────────────────── */
.sem-dados {
  background: #161B22; border-radius: 16px;
  border: 1px dashed rgba(255,255,255,0.1);
  padding: 40px 16px; text-align: center;
}
.sd-icon { font-size: 2.5rem; color: #374151; margin-bottom: 8px; display: block; }
.sem-dados p { font-size: 0.85rem; color: #6B7280; margin: 0 0 16px; }

/* ── Cores utilitárias ──────────────────────── */
.verde-txt { color: #10B981; }
.vermelho-txt { color: #EF4444; }
.ouro-txt { color: #F59E0B; }

/* ── Transições ─────────────────────────────── */
.slide-filtro-enter-active, .slide-filtro-leave-active { transition: all 0.25s ease; }
.slide-filtro-enter-from, .slide-filtro-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
