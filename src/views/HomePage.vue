<template>
  <ion-page>
    <ion-header :translucent="false">
      <ion-toolbar>
        <ion-title>
          <span class="logo-text">🔒 Cofre</span>
        </ion-title>
        <ion-buttons slot="end">
          <ion-button id="btn-filtro-home" fill="clear" @click="mostrarFiltro = !mostrarFiltro">
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
                  <ion-select
                    id="filtro-mes-inicio"
                    v-model="filtroLocal.mesInicio"
                    interface="action-sheet"
                    :interface-options="{ header: 'Mês inicial' }"
                    @ion-change="aplicarFiltro"
                  >
                    <ion-select-option v-for="(m, i) in MESES_ABREV" :key="i" :value="i + 1">{{ m }}</ion-select-option>
                  </ion-select>
                  <ion-select
                    id="filtro-ano-inicio"
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
                    id="filtro-mes-fim"
                    v-model="filtroLocal.mesFim"
                    interface="action-sheet"
                    :interface-options="{ header: 'Mês final' }"
                    @ion-change="aplicarFiltro"
                  >
                    <ion-select-option v-for="(m, i) in MESES_ABREV" :key="i" :value="i + 1">{{ m }}</ion-select-option>
                  </ion-select>
                  <ion-select
                    id="filtro-ano-fim"
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
            <ion-button fill="clear" size="small" color="medium" @click="limparFiltro" class="btn-limpar">
              Limpar filtro
            </ion-button>
          </div>
        </ion-toolbar>
      </transition>
    </ion-header>

    <ion-content :fullscreen="false">

      <!-- Card de boas-vindas (primeiro uso) -->
      <div v-if="config.primeiroUso" class="boas-vindas">
        <div class="bv-emoji">🔒</div>
        <h2 class="bv-titulo">Bem-vindo ao Cofre!</h2>
        <p class="bv-sub">Configure seu patrimônio inicial e comece a registrar seus ganhos e gastos mensais.</p>
        <ion-button id="btn-ir-config" router-link="/tabs/configuracoes" color="primary" expand="block">
          Configurar agora
        </ion-button>
      </div>

      <div v-else class="page-content">
        <!-- Card Patrimônio Principal -->
        <div class="patrimonio-hero">
          <p class="ph-label">Patrimônio Atual</p>
          <h1 class="ph-valor" :class="estatisticas.patrimonioAtual < 0 ? 'ph-valor-neg' : ''">
            {{ formatCurrency(estatisticas.patrimonioAtual) }}
          </h1>
          <div class="ph-variacao" :class="estatisticas.variacaoTotal >= 0 ? 'positivo' : 'negativo'">
            <ion-icon :icon="estatisticas.variacaoTotal >= 0 ? trendingUpOutline : trendingDownOutline" />
            <span>
              {{ estatisticas.variacaoTotal >= 0 ? '+' : '' }}{{ formatCurrency(estatisticas.variacaoTotal) }}
              ({{ formatPercent(estatisticas.variacaoPercentual) }})
            </span>
          </div>
          <p class="ph-periodo">
            {{ labelMes(filtro.mesInicio, filtro.anoInicio) }} → {{ labelMes(filtro.mesFim, filtro.anoFim) }}
          </p>
        </div>

        <!-- Cards de Indicadores -->
        <div class="cards-grid">
          <div class="mini-card verde">
            <ion-icon :icon="arrowUpOutline" class="mc-icon" />
            <div>
              <p class="mc-label">Ganhos</p>
              <p class="mc-valor">{{ formatCurrency(estatisticas.totalGanhos) }}</p>
            </div>
          </div>
          <div class="mini-card vermelho">
            <ion-icon :icon="arrowDownOutline" class="mc-icon" />
            <div>
              <p class="mc-label">Gastos</p>
              <p class="mc-valor">{{ formatCurrency(estatisticas.totalGastos) }}</p>
            </div>
          </div>
          <div class="mini-card roxo">
            <ion-icon :icon="walletOutline" class="mc-icon" />
            <div>
              <p class="mc-label">Saldo Líquido</p>
              <p class="mc-valor" :class="estatisticas.saldoLiquido >= 0 ? 'verde' : 'vermelho'">
                {{ formatCurrency(estatisticas.saldoLiquido) }}
              </p>
            </div>
          </div>
          <div class="mini-card ouro">
            <ion-icon :icon="saveOutline" class="mc-icon" />
            <div>
              <p class="mc-label">Taxa Poupança</p>
              <p class="mc-valor">{{ formatPercent(estatisticas.taxaPoupanca) }}</p>
            </div>
          </div>
        </div>

        <!-- Cards de Média / Desvio Padrão -->
        <div class="media-grid">
          <div class="media-card verde">
            <div class="media-top">
              <ion-icon :icon="arrowUpOutline" class="media-icon" />
              <span class="media-label">Ganho Médio</span>
            </div>
            <p class="media-valor">{{ formatCurrency(mediasDesvio.mediaGanhos) }}</p>
            <p class="media-dp">(± {{ formatCurrency(mediasDesvio.dpGanhos) }})</p>
          </div>
          <div class="media-card vermelho">
            <div class="media-top">
              <ion-icon :icon="arrowDownOutline" class="media-icon" />
              <span class="media-label">Gasto Médio</span>
            </div>
            <p class="media-valor">{{ formatCurrency(mediasDesvio.mediaGastos) }}</p>
            <p class="media-dp">(± {{ formatCurrency(mediasDesvio.dpGastos) }})</p>
          </div>
        </div>

        <!-- Mini Gráfico -->
        <div class="secao">
          <div class="secao-header">
            <p class="secao-titulo">Evolução do Patrimônio</p>
            <router-link to="/tabs/graficos" class="ver-mais">Ver mais →</router-link>
          </div>
          <div v-if="pontosGrafico.length" class="grafico-container">
            <GraficoCanvas :dados="pontosGrafico" tipo="linha" :height="180" />
          </div>
          <div v-else class="sem-dados">
            <ion-icon :icon="barChartOutline" class="sd-icon" />
            <p>Adicione registros mensais para ver o gráfico</p>
            <ion-button id="btn-ir-registros-home" router-link="/tabs/registros" fill="outline" color="primary" size="small">
              Adicionar registros
            </ion-button>
          </div>
        </div>

        <!-- Últimos registros -->
        <div class="secao" v-if="registrosFiltrados.length">
          <div class="secao-header">
            <p class="secao-titulo">Últimos Registros</p>
            <router-link to="/tabs/registros" class="ver-mais">Ver todos →</router-link>
          </div>
          <div class="ultimos-list">
            <div
              v-for="reg in ultimosRegistros"
              :key="reg.id"
              class="ultimo-item"
            >
              <div class="ui-mes">{{ MESES_ABREV[reg.mes - 1] }}/{{ reg.ano }}</div>
              <div class="ui-info">
                <span class="ui-ganhos">+{{ formatCurrency(reg.ganhos) }}</span>
                <span class="ui-gastos">-{{ formatCurrency(reg.gastos) }}</span>
              </div>
              <div class="ui-saldo" :class="(reg.ganhos - reg.gastos) >= 0 ? 'verde' : 'vermelho'">
                {{ formatCurrency(reg.ganhos - reg.gastos) }}
              </div>
            </div>
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
import {
  filterOutline, trendingUpOutline, trendingDownOutline,
  arrowUpOutline, arrowDownOutline, walletOutline,
  saveOutline, barChartOutline
} from 'ionicons/icons';
import { usePatrimonio } from '../composables/usePatrimonio';
import GraficoCanvas from '../components/GraficoCanvas.vue';
import { MESES_ABREV, formatCurrency, formatPercent, labelMes } from '../types';

const { config, filtro, registrosFiltrados, estatisticas, mediasDesvio, pontosGrafico, setFiltro, resetarFiltro } = usePatrimonio();

const mostrarFiltro = ref(false);
const filtroLocal = ref({ ...filtro.value });

watch(filtro, (novo) => {
  filtroLocal.value = { ...novo };
}, { deep: true });

const anos = computed(() => {
  const a = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, i) => a - 5 + i);
});

const ultimosRegistros = computed(() =>
  [...registrosFiltrados.value].slice(-3).reverse()
);

function aplicarFiltro() {
  setFiltro({ ...filtroLocal.value });
}

function limparFiltro() {
  resetarFiltro();
  filtroLocal.value = { ...filtro.value };
}
</script>

<style scoped>
.logo-text { font-weight: 800; font-size: 1.1rem; letter-spacing: -0.02em; }

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
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #10B981;
  margin: 0 0 12px;
}
.filtro-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.filtro-group > label {
  font-size: 0.7rem;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: block;
  margin-bottom: 6px;
}
.filtro-selects {
  display: flex;
  gap: 6px;
}
.filtro-selects ion-select {
  flex: 1;
  font-size: 0.82rem;
  padding: 8px 10px;
  background: #21262D;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.07);
}
.btn-limpar { margin-top: 8px; }

/* Boas-vindas */
.boas-vindas {
  padding: 48px 24px;
  text-align: center;
}
.bv-emoji { font-size: 3.5rem; margin-bottom: 16px; }
.bv-titulo { font-size: 1.5rem; font-weight: 800; color: #F0F6FC; margin: 0 0 8px; }
.bv-sub { font-size: 0.9rem; color: #9CA3AF; line-height: 1.6; margin: 0 0 28px; }

/* Page content */
.page-content { padding: 16px; padding-bottom: 32px; }

/* Hero */
.patrimonio-hero {
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  border-radius: 20px;
  padding: 24px 20px 20px;
  margin-bottom: 16px;
  box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
  position: relative;
  overflow: hidden;
}
.patrimonio-hero::before {
  content: '';
  position: absolute;
  top: -30px; right: -30px;
  width: 120px; height: 120px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
}
.ph-label { font-size: 0.75rem; font-weight: 600; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 4px; }
.ph-valor { font-size: 2rem; font-weight: 800; color: #fff; margin: 0 0 8px; letter-spacing: -0.03em; }
.ph-valor.ph-valor-neg { color: #FCA5A5; }
.ph-variacao { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 600; color: rgba(255,255,255,0.9); margin-bottom: 8px; }
.ph-variacao ion-icon { font-size: 1rem; }
.ph-periodo { font-size: 0.72rem; color: rgba(255,255,255,0.6); margin: 0; }

/* Cards grid */
.cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
}
.mini-card {
  background: #161B22;
  border-radius: 14px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(255,255,255,0.06);
}
.mini-card.verde { border-left: 3px solid #10B981; }
.mini-card.vermelho { border-left: 3px solid #EF4444; }
.mini-card.roxo { border-left: 3px solid #6366F1; }
.mini-card.ouro { border-left: 3px solid #F59E0B; }
.mc-icon { font-size: 1.2rem; flex-shrink: 0; }
.mini-card.verde .mc-icon { color: #10B981; }
.mini-card.vermelho .mc-icon { color: #EF4444; }
.mini-card.roxo .mc-icon { color: #6366F1; }
.mini-card.ouro .mc-icon { color: #F59E0B; }
.mc-label { font-size: 0.68rem; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 2px; }
.mc-valor { font-size: 0.9rem; font-weight: 700; color: #F0F6FC; margin: 0; }
.mc-valor.verde { color: #10B981; }
.mc-valor.vermelho { color: #EF4444; }

/* Seções */
.secao { margin-bottom: 20px; }
.secao-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.secao-titulo { font-size: 0.9rem; font-weight: 700; color: #F0F6FC; margin: 0; }
.ver-mais { font-size: 0.8rem; color: #10B981; text-decoration: none; font-weight: 600; }
.grafico-container { border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); }

/* Sem dados */
.sem-dados {
  background: #161B22;
  border-radius: 16px;
  border: 1px dashed rgba(255,255,255,0.1);
  padding: 32px 16px;
  text-align: center;
}
.sd-icon { font-size: 2.5rem; color: #374151; margin-bottom: 8px; display: block; }
.sem-dados p { font-size: 0.85rem; color: #6B7280; margin: 0 0 16px; }

/* Últimos registros */
.ultimos-list { display: flex; flex-direction: column; gap: 8px; }
.ultimo-item {
  background: #161B22;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06);
  padding: 12px 14px;
  display: grid;
  grid-template-columns: 60px 1fr auto;
  align-items: center;
  gap: 8px;
}
.ui-mes { font-size: 0.8rem; font-weight: 700; color: #9CA3AF; }
.ui-info { display: flex; flex-direction: column; gap: 2px; }
.ui-ganhos { font-size: 0.75rem; color: #10B981; font-weight: 600; }
.ui-gastos { font-size: 0.75rem; color: #EF4444; font-weight: 600; }
.ui-saldo { font-size: 0.9rem; font-weight: 700; }
.ui-saldo.verde { color: #10B981; }
.ui-saldo.vermelho { color: #EF4444; }

/* Transitions */
.slide-filtro-enter-active, .slide-filtro-leave-active { transition: all 0.25s ease; }
.slide-filtro-enter-from, .slide-filtro-leave-to { opacity: 0; transform: translateY(-10px); }

.verde { color: #10B981; }
.vermelho { color: #EF4444; }

/* Cards de Média / Desvio Padrão */
.media-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
}
.media-card {
  background: #161B22;
  border-radius: 14px;
  padding: 14px 14px 12px;
  border: 1px solid rgba(255,255,255,0.06);
}
.media-card.verde { border-left: 3px solid #10B981; }
.media-card.vermelho { border-left: 3px solid #EF4444; }
.media-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.media-icon { font-size: 1rem; flex-shrink: 0; }
.media-card.verde .media-icon { color: #10B981; }
.media-card.vermelho .media-icon { color: #EF4444; }
.media-label {
  font-size: 0.68rem;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}
.media-valor {
  font-size: 0.95rem;
  font-weight: 700;
  color: #F0F6FC;
  margin: 0 0 2px;
}
.media-card.verde .media-valor { color: #10B981; }
.media-card.vermelho .media-valor { color: #EF4444; }
.media-dp {
  font-size: 0.72rem;
  color: #6B7280;
  margin: 0;
  font-style: italic;
}
</style>
