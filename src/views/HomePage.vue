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
          <!-- Única entrada permanente para as Configurações: a aba foi removida
               na v2 e o botão de boas-vindas só aparece no primeiro uso. -->
          <ion-button id="btn-config-home" fill="clear" router-link="/tabs/configuracoes">
            <ion-icon :icon="settingsOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Painel de Filtro -->
      <transition name="slide-filtro">
        <FiltroPeriodoPanel v-if="mostrarFiltro" />
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
            <p class="ph-periodo">{{ rotuloPeriodo }}</p>
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

        <!-- ── Fôlego + Objetivo principal ────────────────── -->
        <div v-if="registros.length" class="secao">
          <div class="cards-grid-2">
            <router-link to="/tabs/analise" class="link-limpo">
              <CardFolego
                :folego="folego"
                :janela="config.janelaFolego"
                :reserva-alvo-meses="config.reservaAlvoMeses"
                compacto
              />
            </router-link>

            <router-link to="/tabs/objetivos" class="link-limpo">
              <div v-if="objetivoPrincipal && progressoPrincipal" class="objetivo-card">
                <div class="oc-top">
                  <ion-icon :icon="flagOutline" class="oc-icone" />
                  <span class="oc-titulo">Objetivo</span>
                </div>
                <p class="oc-nome">{{ objetivoPrincipal.nome }}</p>
                <div class="oc-bar-track">
                  <div class="oc-bar-fill" :style="{ width: Math.min(progressoPrincipal.percentualAtingido, 100) + '%' }" />
                </div>
                <p class="oc-sub">
                  {{ progressoPrincipal.percentualAtingido.toFixed(0) }}% de {{ formatCurrency(objetivoPrincipal.valor) }}
                </p>
                <p v-if="progressoPrincipal.dataEstimada" class="oc-estimativa">
                  Estimativa: {{ progressoPrincipal.dataEstimada }}
                </p>
              </div>

              <div v-else class="objetivo-card vazio">
                <div class="oc-top">
                  <ion-icon :icon="flagOutline" class="oc-icone" />
                  <span class="oc-titulo">Objetivo</span>
                </div>
                <p class="oc-vazio-txt">Defina um objetivo de patrimônio para acompanhar o progresso.</p>
              </div>
            </router-link>
          </div>
        </div>

        <!-- ── Cards do último período ────────────────────── -->
        <div v-if="temUltimoPeriodo" class="secao">
          <p class="secao-titulo">Último {{ unidadePeriodo }} registrado</p>
          <div class="cards-grid-2">

            <!-- Crescimento vs período anterior -->
            <div class="kpi-card" :class="estatisticas.crescimentoUltimoPeriodo >= 0 ? 'kpi-verde' : 'kpi-vermelho'">
              <div class="kpi-top">
                <ion-icon :icon="estatisticas.crescimentoUltimoPeriodo >= 0 ? trendingUpOutline : trendingDownOutline" class="kpi-icon" />
                <span class="kpi-label">Crescimento Patrim.</span>
              </div>
              <p class="kpi-valor">
                {{ estatisticas.crescimentoUltimoPeriodo >= 0 ? '+' : '' }}{{ formatCurrency(estatisticas.crescimentoUltimoPeriodo) }}
              </p>
              <p class="kpi-sub">{{ formatPercent(estatisticas.crescimentoPercUltimoPeriodo) }} vs {{ unidadePeriodo }} ant.</p>
            </div>

            <!-- Taxa de poupança -->
            <div class="kpi-card" :class="estatisticas.taxaPoupancaUltimoPeriodo >= 20 ? 'kpi-verde' : estatisticas.taxaPoupancaUltimoPeriodo >= 0 ? 'kpi-ouro' : 'kpi-vermelho'">
              <div class="kpi-top">
                <ion-icon :icon="saveOutline" class="kpi-icon" />
                <span class="kpi-label">Taxa de Poupança</span>
              </div>
              <p class="kpi-valor">{{ formatPercent(estatisticas.taxaPoupancaUltimoPeriodo) }}</p>
              <p class="kpi-sub">do que entrou foi poupado</p>
            </div>
          </div>

          <!-- Receita / Despesa / Saldo -->
          <div class="cards-grid-3">
            <div class="mini-card verde">
              <ion-icon :icon="arrowUpOutline" class="mc-icon" />
              <div>
                <p class="mc-label">Receita</p>
                <p class="mc-valor">{{ formatCurrency(estatisticas.ganhosUltimoPeriodo) }}</p>
              </div>
            </div>
            <div class="mini-card vermelho">
              <ion-icon :icon="arrowDownOutline" class="mc-icon" />
              <div>
                <p class="mc-label">Despesa</p>
                <p class="mc-valor">{{ formatCurrency(estatisticas.gastosUltimoPeriodo) }}</p>
              </div>
            </div>
            <div class="mini-card" :class="estatisticas.saldoUltimoPeriodo >= 0 ? 'roxo' : 'vermelho-escuro'">
              <ion-icon :icon="walletOutline" class="mc-icon" />
              <div>
                <p class="mc-label">Saldo</p>
                <p class="mc-valor" :class="estatisticas.saldoUltimoPeriodo >= 0 ? 'verde-txt' : 'vermelho-txt'">
                  {{ formatCurrency(estatisticas.saldoUltimoPeriodo) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Mini gráfico patrimônio ────────────────────── -->
        <div v-if="pontosGrafico.length" class="secao">
          <div class="secao-header">
            <p class="secao-titulo">Evolução do Patrimônio</p>
            <router-link to="/tabs/analise" class="ver-mais">Ver análise →</router-link>
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
              v-for="reg in ultimosRegistros"
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
        <EstadoVazio
          v-if="!pontosGrafico.length && !config.primeiroUso"
          compacto
          :icone="barChartOutline"
          texto="Nenhum dado no período selecionado"
        >
          <ion-button id="btn-ir-registros-home" router-link="/tabs/registros" color="primary" size="small">
            Adicionar registros
          </ion-button>
        </EstadoVazio>

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
import {
  filterOutline, closeOutline, trendingUpOutline, trendingDownOutline,
  arrowUpOutline, arrowDownOutline, walletOutline,
  saveOutline, barChartOutline, settingsOutline, flagOutline
} from 'ionicons/icons';
import { usePatrimonio } from '../composables/usePatrimonio';
import GraficoCanvas from '../components/GraficoCanvas.vue';
import FiltroPeriodoPanel from '../components/FiltroPeriodoPanel.vue';
import CardFolego from '../components/CardFolego.vue';
import EstadoVazio from '../components/EstadoVazio.vue';
import { MESES_ABREV, formatCurrency, formatPercent, labelMes, labelAno } from '../types';

const {
  config, filtro, registros, registrosFiltrados, estatisticas, pontosGrafico,
  folego, objetivoPrincipal, progressoDe,
} = usePatrimonio();

const mostrarFiltro = ref(false);

const unidadePeriodo = computed(() => filtro.value.tipo === 'anos' ? 'ano' : 'mês');

const rotuloPeriodo = computed(() =>
  filtro.value.tipo === 'anos'
    ? `${labelAno(filtro.value.anoInicio)} → ${labelAno(filtro.value.anoFim)}`
    : `${labelMes(filtro.value.mesInicio, filtro.value.anoInicio)} → ${labelMes(filtro.value.mesFim, filtro.value.anoFim)}`
);

const temUltimoPeriodo = computed(() => pontosGrafico.value.length > 0);

const ultimosRegistros = computed(() =>
  [...registrosFiltrados.value].slice(-4).reverse()
);

const progressoPrincipal = computed(() =>
  objetivoPrincipal.value ? progressoDe(objetivoPrincipal.value) : null
);
</script>

<style scoped>
.logo-text { font-weight: 800; font-size: var(--cofre-fs-lg); letter-spacing: -0.02em; }

/* Boas-vindas */
.boas-vindas { padding: 60px 28px; text-align: center; }
.bv-emoji { font-size: var(--cofre-icon-xl); margin-bottom: 20px; }
.bv-titulo { font-size: var(--cofre-fs-2xl); font-weight: 800; color: var(--cofre-text); margin: 0 0 10px; }
.bv-sub { font-size: var(--cofre-fs-md); color: var(--cofre-text-muted); line-height: 1.7; margin: 0 0 32px; }

/* Page content */
.page-content { padding: 16px; padding-bottom: 40px; }

/* ── Hero ───────────────────────────────────── */
.patrimonio-hero {
  background: var(--cofre-gradient-hero);
  border-radius: var(--cofre-radius-xl);
  padding: 22px 20px 20px;
  margin-bottom: 18px;
  box-shadow: var(--cofre-shadow-accent);
  position: relative;
  overflow: hidden;
  border: 1px solid var(--cofre-accent-border);
}
.ph-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.ph-deco {
  position: absolute; top: -40px; right: -40px;
  width: 140px; height: 140px; border-radius: var(--cofre-radius-full);
  background: var(--cofre-accent-muted);
}
.ph-deco2 {
  position: absolute; bottom: -30px; left: -20px;
  width: 100px; height: 100px; border-radius: var(--cofre-radius-full);
  background: var(--cofre-blue-muted);
}
.ph-label { font-size: var(--cofre-fs-xs); font-weight: 700; color: var(--cofre-on-accent-muted); text-transform: uppercase; letter-spacing: 0.1em; margin: 0; }
.ph-periodo { font-size: var(--cofre-fs-2xs); color: var(--cofre-on-accent-subtle); margin: 0; }
.ph-valor { font-size: var(--cofre-fs-3xl); font-weight: 800; color: var(--cofre-on-accent); margin: 4px 0 12px; letter-spacing: -0.03em; line-height: 1; }
.ph-variacao {
  display: flex; align-items: center; gap: 6px;
  font-size: var(--cofre-fs-md); font-weight: 600;
  background: var(--cofre-border);
  padding: 8px 12px;
  border-radius: var(--cofre-radius-md);
  width: fit-content;
}
.ph-variacao.positivo { color: var(--cofre-green-light); }
.ph-variacao.negativo { color: var(--cofre-red-light); }
.ph-variacao ion-icon { font-size: var(--cofre-fs-base); flex-shrink: 0; }
.ph-variacao-label { font-size: var(--cofre-fs-xs); color: var(--cofre-on-accent-subtle); font-weight: 400; }

/* ── Seções ─────────────────────────────────── */
.secao { margin-bottom: 20px; }
.secao-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.secao-header .secao-titulo { margin-bottom: 0; }
.ver-mais { font-size: var(--cofre-fs-sm); color: var(--cofre-accent); text-decoration: none; font-weight: 600; }
.grafico-container { border-radius: var(--cofre-radius-lg); overflow: hidden; border: 1px solid var(--cofre-border); background: var(--cofre-bg); }

/* ── KPI Cards grandes ──────────────────────── */
/* minmax(0, …): sem isso a coluna não encolhe abaixo do conteúdo (badge do Fôlego,
   nome do objetivo) e o card da direita vaza da tela em celulares. */
.cards-grid-2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; margin-bottom: 10px; }
.kpi-card {
  border-radius: var(--cofre-radius-lg); padding: 16px;
  border: 1px solid var(--cofre-border);
  background: var(--cofre-surface);
}
.kpi-card.kpi-verde { border-color: var(--cofre-green-border); background: var(--cofre-green-subtle); }
.kpi-card.kpi-vermelho { border-color: var(--cofre-red-border); background: var(--cofre-red-subtle); }
.kpi-card.kpi-ouro { border-color: var(--cofre-gold-border); background: var(--cofre-gold-subtle); }
.kpi-top { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.kpi-icon { font-size: var(--cofre-fs-base); flex-shrink: 0; }
.kpi-card.kpi-verde .kpi-icon { color: var(--cofre-green); }
.kpi-card.kpi-vermelho .kpi-icon { color: var(--cofre-red); }
.kpi-card.kpi-ouro .kpi-icon { color: var(--cofre-gold); }
.kpi-label { font-size: var(--cofre-fs-2xs); color: var(--cofre-text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
.kpi-valor { font-size: var(--cofre-fs-base); font-weight: 800; color: var(--cofre-text); margin: 0 0 2px; line-height: 1.2; }
.kpi-sub { font-size: var(--cofre-fs-2xs); color: var(--cofre-text-subtle); margin: 0; }

/* ── Mini Cards 3 colunas ───────────────────── */
.cards-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.mini-card {
  background: var(--cofre-surface);
  border-radius: var(--cofre-radius-md);
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  border: 1px solid var(--cofre-border);
}
.mini-card.verde { border-left: 3px solid var(--cofre-green); }
.mini-card.vermelho { border-left: 3px solid var(--cofre-red); }
.mini-card.roxo { border-left: 3px solid var(--cofre-accent); }
.mini-card.vermelho-escuro { border-left: 3px solid var(--cofre-red); }
.mc-icon { font-size: var(--cofre-fs-base); }
.mini-card.verde .mc-icon { color: var(--cofre-green); }
.mini-card.vermelho .mc-icon, .mini-card.vermelho-escuro .mc-icon { color: var(--cofre-red); }
.mini-card.roxo .mc-icon { color: var(--cofre-accent); }
.mc-label { font-size: var(--cofre-fs-2xs); font-weight: 600; color: var(--cofre-text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 2px; }
.mc-valor { font-size: var(--cofre-fs-sm); font-weight: 700; color: var(--cofre-text); margin: 0; }

/* ── Fôlego + Objetivo principal ────────────── */
.link-limpo { text-decoration: none; display: block; height: 100%; }

.objetivo-card {
  height: 100%;
  background: var(--cofre-surface);
  border-radius: var(--cofre-radius-lg);
  border: 1px solid var(--cofre-accent-border);
  padding: 16px;
  display: flex;
  flex-direction: column;
}
.objetivo-card.vazio { border-style: dashed; border-color: var(--cofre-border-strong); }

.oc-top { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
.oc-icone { font-size: var(--cofre-fs-base); color: var(--cofre-accent); }
.oc-titulo {
  font-size: var(--cofre-fs-2xs); font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--cofre-text-muted);
}
.oc-nome {
  font-size: var(--cofre-fs-md); font-weight: 700; color: var(--cofre-text); margin: 0 0 10px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.oc-bar-track {
  height: 7px; background: var(--cofre-border-strong);
  border-radius: var(--cofre-radius-sm); overflow: hidden; margin-bottom: 8px;
}
.oc-bar-fill {
  height: 100%; border-radius: var(--cofre-radius-sm);
  background: var(--cofre-gradient-accent);
  transition: width 0.8s ease;
}
.oc-sub { font-size: var(--cofre-fs-2xs); color: var(--cofre-text-muted); margin: 0; }
.oc-estimativa { font-size: var(--cofre-fs-2xs); color: var(--cofre-gold); margin: 6px 0 0; }
.oc-vazio-txt { font-size: var(--cofre-fs-xs); color: var(--cofre-text-subtle); line-height: 1.5; margin: 0; }

/* ── Últimos registros ──────────────────────── */
.ultimos-list { display: flex; flex-direction: column; gap: 8px; }
.ultimo-item {
  background: var(--cofre-surface);
  border-radius: var(--cofre-radius-md);
  border: 1px solid var(--cofre-border);
  padding: 12px 14px;
  display: grid;
  grid-template-columns: 52px 1fr auto;
  align-items: center;
  gap: 10px;
}
.ui-mes-badge { display: flex; flex-direction: column; }
.ui-mes-nome { font-size: var(--cofre-fs-base); font-weight: 800; color: var(--cofre-text); line-height: 1; }
.ui-mes-ano { font-size: var(--cofre-fs-2xs); color: var(--cofre-text-muted); margin-top: 2px; }
.ui-values { display: flex; flex-direction: column; gap: 3px; }
.ui-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ui-lbl { font-size: var(--cofre-fs-2xs); color: var(--cofre-text-subtle); }
.ui-val { font-size: var(--cofre-fs-sm); font-weight: 600; }
.ui-saldo { font-size: var(--cofre-fs-md); font-weight: 700; padding: 6px 10px; border-radius: var(--cofre-radius-sm); text-align: right; white-space: nowrap; }
.ui-saldo.positivo { background: var(--cofre-green-muted); color: var(--cofre-green); }
.ui-saldo.negativo { background: var(--cofre-red-muted); color: var(--cofre-red); }


/* ── Cores utilitárias ──────────────────────── */
.verde-txt { color: var(--cofre-green); }
.vermelho-txt { color: var(--cofre-red); }
.ouro-txt { color: var(--cofre-gold); }

/* ── Transições ─────────────────────────────── */
.slide-filtro-enter-active, .slide-filtro-leave-active { transition: all 0.25s ease; }
.slide-filtro-enter-from, .slide-filtro-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
