<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Metas</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page-content">

        <!-- ── Definir Meta ────────────────────────────────── -->
        <div class="secao">
          <p class="secao-titulo">🎯 Meta de Patrimônio</p>
          <div class="meta-card">
            <p class="meta-desc">
              Defina sua meta de patrimônio líquido. O app calculará quando você chegará lá com base no seu crescimento médio mensal dos últimos 12 meses.
            </p>
            <div class="meta-input-wrap">
              <ion-label>Meta (R$)</ion-label>
              <ion-input
                id="input-meta"
                :value="metaStr"
                type="number"
                inputmode="decimal"
                placeholder="Ex: 500000"
                min="0"
                :clear-input="true"
                @ion-input="(e: any) => { metaStr = e.detail.value ?? ''; }"
              />
            </div>
            <ion-button
              id="btn-salvar-meta"
              color="primary"
              expand="block"
              @click="salvarMeta"
              :disabled="salvando"
            >
              <ion-icon :icon="saveOutline" slot="start" />
              {{ salvando ? 'Salvando...' : 'Definir meta' }}
            </ion-button>
          </div>
        </div>

        <!-- ── Progresso da Meta ───────────────────────────── -->
        <div v-if="projecao" class="secao">
          <p class="secao-titulo">📊 Progresso</p>

          <!-- Card principal da meta -->
          <div class="progresso-hero">
            <div class="prog-top">
              <span class="prog-label">Patrimônio atual</span>
              <span class="prog-label">Meta: {{ formatCurrency(projecao.meta) }}</span>
            </div>
            <p class="prog-valor" :class="projecao.percentualAtingido >= 100 ? 'verde' : ''">
              {{ formatCurrency(projecao.patrimonioAtual) }}
            </p>

            <!-- Barra de progresso -->
            <div class="prog-bar-track">
              <div
                class="prog-bar-fill"
                :style="{ width: Math.min(projecao.percentualAtingido, 100) + '%' }"
                :class="projecao.percentualAtingido >= 100 ? 'completo' : ''"
              />
            </div>
            <div class="prog-percent-row">
              <span class="prog-percent">{{ projecao.percentualAtingido.toFixed(1) }}% atingido</span>
              <span class="prog-falta" v-if="projecao.valorRestante > 0">
                Faltam {{ formatCurrency(projecao.valorRestante) }}
              </span>
              <span class="prog-meta-ok" v-else>🎉 Meta atingida{{ diasCorridos !== null ? ` em ${diasCorridos} dias` : '' }}!</span>
            </div>
          </div>

          <!-- Tempo decorrido (quando não atingiu ainda) -->
          <div class="meta-dias" v-if="diasCorridos !== null && projecao.valorRestante > 0">
            ⏳ Você está perseguindo esta meta há <strong>{{ diasCorridos }}</strong> dias.
          </div>

          <!-- Cards de detalhes -->
          <div class="detail-grid">
            <div class="detail-card">
              <ion-icon :icon="trendingUpOutline" class="dc-icon verde" />
              <p class="dc-label">Crescimento médio mensal</p>
              <p class="dc-valor" :class="crescimentoMedio >= 0 ? 'verde' : 'vermelho'">
                {{ formatCurrency(crescimentoMedio) }}
              </p>
              <p class="dc-sub">últimos 12 meses</p>
            </div>

            <div class="detail-card" v-if="projecao.dataEstimada">
              <ion-icon :icon="calendarOutline" class="dc-icon ouro" />
              <p class="dc-label">Estimativa de chegada</p>
              <p class="dc-valor ouro">{{ projecao.dataEstimada }}</p>
              <p class="dc-sub" v-if="projecao.mesesRestantes !== null && projecao.mesesRestantes > 0">
                em ~{{ projecao.mesesRestantes }} meses
              </p>
            </div>

            <div class="detail-card aviso" v-else-if="crescimentoMedio <= 0">
              <ion-icon :icon="warningOutline" class="dc-icon vermelho" />
              <p class="dc-label">Atenção</p>
              <p class="dc-valor-sm">Crescimento médio insuficiente para projetar a data.</p>
            </div>
          </div>
        </div>

        <!-- Estado sem meta -->
        <div v-if="!projecao && !metaAtiva" class="sem-meta">
          <ion-icon :icon="flagOutline" class="sm-icon" />
          <p class="sm-txt">Defina sua meta acima para ver o progresso e a estimativa de quando você vai chegar lá.</p>
        </div>

        <!-- ── Histórico de Metas ───────────────────────────── -->
        <div v-if="metasConcluidas.length > 0" class="secao" style="margin-top: 32px">
          <p class="secao-titulo">🏆 Metas Alcançadas</p>
          <div class="historico-grid">
            <div v-for="m in metasConcluidas" :key="m.id" class="historico-card">
              <ion-icon :icon="trophyOutline" class="hc-icon" />
              <div class="hc-conteudo">
                <p class="hc-valor">{{ formatCurrency(m.valor) }}</p>
                <p class="hc-data">
                  Concluída em {{ new Date(m.dataConclusao!).toLocaleDateString('pt-BR') }}
                </p>
                <p class="hc-dias">Levou {{ diasCorridosParaMeta(m) }} dias</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Sem dados de registros -->
        <div v-if="!registros.length" class="aviso-registros">
          <p>⚠️ Adicione registros mensais para que as projeções sejam calculadas.</p>
        </div>

      </div>
    </ion-content>

    <!-- Toast -->
    <ion-toast
      :is-open="toastAberto"
      :message="toastMsg"
      :duration="2000"
      position="bottom"
      color="success"
      @did-dismiss="toastAberto = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonLabel, IonInput, IonButton, IonIcon, IonToast
} from '@ionic/vue';
import {
  saveOutline, trendingUpOutline, calendarOutline,
  warningOutline, flagOutline, trophyOutline
} from 'ionicons/icons';
import { usePatrimonio } from '../composables/usePatrimonio';
import { formatCurrency, type MetaPatrimonio } from '../types';

const { config, registros, projecaoMeta, estatisticasGerais, saveConfig, metaAtiva, metasConcluidas, adicionarMeta, removerMetaAtiva } = usePatrimonio();

const metaStr = ref(metaAtiva.value ? String(metaAtiva.value.valor) : '');
const salvando = ref(false);
const toastAberto = ref(false);
const toastMsg = ref('');

const projecao = projecaoMeta;
const crescimentoMedio = computed(() => estatisticasGerais.value.crescimentoMedioMensal);

const diasCorridos = computed(() => {
  if (!metaAtiva.value) return null;
  const inicio = new Date(metaAtiva.value.dataInicio).getTime();
  const fim = metaAtiva.value.dataConclusao ? new Date(metaAtiva.value.dataConclusao).getTime() : new Date().getTime();
  const diff = fim - inicio;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
});

function diasCorridosParaMeta(meta: MetaPatrimonio): number {
  if (!meta.dataInicio || !meta.dataConclusao) return 0;
  const inicio = new Date(meta.dataInicio).getTime();
  const fim = new Date(meta.dataConclusao).getTime();
  const diff = fim - inicio;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

watch(() => metaAtiva.value, (v) => {
  metaStr.value = v ? String(v.valor) : '';
});

async function salvarMeta() {
  salvando.value = true;
  const valor = parseFloat(metaStr.value) || 0;
  
  if (valor > 0) {
    if (!metaAtiva.value || metaAtiva.value.valor !== valor) {
      adicionarMeta(valor);
    }
  } else {
    removerMetaAtiva();
  }

  await new Promise(r => setTimeout(r, 400));
  salvando.value = false;
  toastMsg.value = valor > 0 ? 'Meta definida com sucesso!' : 'Meta removida.';
  toastAberto.value = true;
}
</script>

<style scoped>
.page-content { padding: 16px; padding-bottom: 48px; }

.secao { margin-bottom: 26px; }
.secao-titulo { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: rgba(255,255,255,0.4); margin: 0 0 12px; }

/* Meta card */
.meta-card {
  background: #161B22; border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.06); padding: 16px;
}
.meta-desc { font-size: 0.82rem; color: #9CA3AF; line-height: 1.6; margin: 0 0 16px; }
.meta-input-wrap { margin-bottom: 16px; }

/* Progresso hero */
.progresso-hero {
  background: linear-gradient(135deg, #1a1030 0%, #1e2540 100%);
  border-radius: 18px;
  border: 1px solid rgba(139,92,246,0.2);
  padding: 20px;
  margin-bottom: 12px;
}
.prog-top {
  display: flex; justify-content: space-between;
  margin-bottom: 8px;
}
.prog-label { font-size: 0.7rem; color: rgba(255,255,255,0.4); }
.prog-valor { font-size: 1.8rem; font-weight: 800; color: #F0F6FC; margin: 0 0 16px; letter-spacing: -0.02em; }
.prog-valor.verde { color: #10B981; }
.prog-bar-track {
  height: 10px; background: rgba(255,255,255,0.08);
  border-radius: 10px; overflow: hidden; margin-bottom: 10px;
}
.prog-bar-fill {
  height: 100%; border-radius: 10px;
  background: linear-gradient(90deg, #8B5CF6, #6366F1);
  transition: width 0.8s ease;
}
.prog-bar-fill.completo { background: linear-gradient(90deg, #10B981, #06D6A0); }
.prog-percent-row { display: flex; justify-content: space-between; align-items: center; }
.prog-percent { font-size: 0.82rem; font-weight: 700; color: #8B5CF6; }
.prog-falta { font-size: 0.75rem; color: #9CA3AF; }
.prog-meta-ok { font-size: 0.82rem; font-weight: 700; color: #10B981; }

/* Tempo decorrido */
.meta-dias {
  background: rgba(139,92,246,0.06); border: 1px solid rgba(139,92,246,0.2);
  border-radius: 12px; padding: 12px 16px; margin-bottom: 16px;
  font-size: 0.82rem; color: #D8B4FE;
}
.meta-dias strong { color: #F3E8FF; font-weight: 800; font-size: 0.9rem; }

/* Detail cards */
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.detail-card {
  background: #161B22; border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06); padding: 16px;
}
.detail-card.aviso { border-color: rgba(239,68,68,0.2); background: rgba(239,68,68,0.04); }
.dc-icon { font-size: 1.4rem; display: block; margin-bottom: 8px; }
.dc-label { font-size: 0.65rem; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 6px; }
.dc-valor { font-size: 1.1rem; font-weight: 800; color: #F0F6FC; margin: 0 0 2px; }
.dc-valor-sm { font-size: 0.8rem; color: #9CA3AF; margin: 0; line-height: 1.5; }
.dc-sub { font-size: 0.68rem; color: #6B7280; margin: 0; }

/* Sem meta */
.sem-meta {
  background: #161B22; border-radius: 14px;
  border: 1px dashed rgba(255,255,255,0.1);
  padding: 28px 20px; text-align: center;
}
.sm-icon { font-size: 2.5rem; color: #374151; display: block; margin: 0 auto 12px; }
.sm-txt { font-size: 0.85rem; color: #6B7280; line-height: 1.6; margin: 0; }

/* Aviso */
.aviso-registros {
  background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.2);
  border-radius: 12px; padding: 14px 16px;
}
.aviso-registros p { font-size: 0.82rem; color: #F59E0B; margin: 0; }

.verde { color: #10B981; }
.vermelho { color: #EF4444; }
.ouro { color: #F59E0B; }

/* Histórico */
.historico-grid { display: flex; flex-direction: column; gap: 12px; }
.historico-card {
  background: #161B22; border-radius: 12px; padding: 16px;
  border: 1px solid rgba(16,185,129,0.2);
  display: flex; align-items: center; gap: 16px;
}
.hc-icon { font-size: 2rem; color: #10B981; }
.hc-conteudo { display: flex; flex-direction: column; gap: 4px; }
.hc-valor { font-size: 1.2rem; font-weight: 800; color: #F0F6FC; margin: 0; }
.hc-data { font-size: 0.8rem; color: #9CA3AF; margin: 0; }
.hc-dias { font-size: 0.75rem; color: #10B981; font-weight: 700; margin: 0; }

</style>
