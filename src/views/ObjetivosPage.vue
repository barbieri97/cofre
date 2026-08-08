<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Objetivos</ion-title>
        <ion-buttons slot="end">
          <ion-button id="btn-add-objetivo" fill="clear" @click="abrirNovo">
            <ion-icon :icon="addOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <ion-toolbar class="segment-toolbar">
        <ion-segment v-model="aba" class="obj-segment">
          <ion-segment-button value="ativos">
            <ion-label>Ativos{{ objetivosAtivos.length ? ` (${objetivosAtivos.length})` : '' }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="concluidos">
            <ion-label>Concluídos{{ objetivosConcluidos.length ? ` (${objetivosConcluidos.length})` : '' }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="todos">
            <ion-label>Todos</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page-content">

        <!-- Aviso: sem registros não há projeção -->
        <div v-if="!registros.length" class="aviso-registros">
          <p>⚠️ Adicione registros mensais para que o progresso e as projeções sejam calculados.</p>
        </div>

        <!-- Estado vazio -->
        <div v-if="!listaVisivel.length" class="sem-objetivo">
          <ion-icon :icon="flagOutline" class="so-icon" />
          <p class="so-txt">{{ mensagemVazio }}</p>
          <ion-button v-if="aba !== 'concluidos'" fill="outline" color="primary" size="small" @click="abrirNovo">
            Criar objetivo
          </ion-button>
        </div>

        <!-- Lista -->
        <ion-list v-else class="obj-list" lines="none">
          <ion-item-sliding v-for="item in listaVisivel" :key="item.objetivo.id">
            <ion-item class="obj-item" button :detail="false" @click="abrirEdicao(item.objetivo)">
              <div class="obj-card" :class="{ concluido: !!item.conclusao }">

                <div class="oc-top">
                  <div class="oc-nome-wrap">
                    <span v-if="item.conclusao" class="oc-trofeu">🏆</span>
                    <span v-else-if="item.objetivo.principal" class="oc-estrela">⭐</span>
                    <p class="oc-nome">{{ item.objetivo.nome }}</p>
                  </div>
                  <p class="oc-alvo">{{ formatCurrency(item.objetivo.valor) }}</p>
                </div>

                <!-- Barra de progresso -->
                <div class="oc-bar-track">
                  <div
                    class="oc-bar-fill"
                    :class="{ completo: !!item.conclusao }"
                    :style="{ width: Math.min(item.progresso.percentualAtingido, 100) + '%' }"
                  />
                </div>

                <div class="oc-percent-row">
                  <span class="oc-percent" :class="{ completo: !!item.conclusao }">
                    {{ item.progresso.percentualAtingido.toFixed(1) }}%
                  </span>
                  <span v-if="!item.conclusao && item.progresso.valorRestante > 0" class="oc-falta">
                    faltam {{ formatCurrency(item.progresso.valorRestante) }}
                  </span>
                </div>

                <!-- Rodapé: concluído -->
                <div v-if="item.conclusao" class="oc-rodape">
                  <span class="oc-info verde">
                    Concluído em {{ item.conclusao.label }}
                    <template v-if="item.mesesLevados > 0">
                      · levou {{ descreverMeses(item.mesesLevados) }}
                    </template>
                  </span>
                  <span v-if="item.conclusao.manual" class="oc-tag">data manual</span>
                </div>

                <!-- Rodapé: ativo -->
                <div v-else class="oc-rodape">
                  <span v-if="item.progresso.dataEstimada" class="oc-info ouro">
                    Estimativa: {{ item.progresso.dataEstimada }}
                    <template v-if="item.progresso.mesesRestantes">
                      · ~{{ descreverMeses(item.progresso.mesesRestantes) }}
                    </template>
                  </span>
                  <span v-else class="oc-info vermelho">
                    Crescimento médio insuficiente para projetar
                  </span>
                  <span
                    v-if="item.progresso.noPrazo !== null"
                    class="oc-tag"
                    :class="item.progresso.noPrazo ? 'tag-ok' : 'tag-alerta'"
                  >
                    {{ item.progresso.noPrazo ? 'no prazo' : 'atrasado' }}
                  </span>
                </div>

                <p v-if="!item.conclusao && item.mesesLevados > 0" class="oc-perseguindo">
                  ⏳ Perseguindo há {{ descreverMeses(item.mesesLevados) }}
                </p>
              </div>
            </ion-item>

            <ion-item-options side="start">
              <ion-item-option color="primary" @click="abrirEdicao(item.objetivo)">
                <ion-icon :icon="createOutline" slot="icon-only" />
              </ion-item-option>
            </ion-item-options>
            <ion-item-options side="end">
              <ion-item-option color="danger" @click="confirmarExclusao(item.objetivo)">
                <ion-icon :icon="trashOutline" slot="icon-only" />
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button id="btn-add-objetivo-fab" @click="abrirNovo">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <ObjetivoModal
      :is-open="modalAberto"
      :objetivo="objetivoEditando"
      :patrimonio-atual="patrimonioAtualGeral"
      :crescimento-medio-mensal="estatisticasGerais.crescimentoMedioMensal"
      :conclusao-automatica="conclusaoDoEditando"
      @close="fecharModal"
      @save="salvarObjetivo"
    />

    <ion-alert
      :is-open="alertaAberto"
      header="Excluir objetivo"
      :message="`Excluir &quot;${objetivoExcluindo?.nome ?? ''}&quot;? Isso remove o objetivo do histórico permanentemente.`"
      :buttons="botoesAlerta"
      @did-dismiss="alertaAberto = false"
    />

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
import { ref, computed } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonList, IonItem,
  IonItemSliding, IonItemOptions, IonItemOption,
  IonSegment, IonSegmentButton, IonLabel,
  IonFab, IonFabButton, IonAlert, IonToast
} from '@ionic/vue';
import { addOutline, createOutline, trashOutline, flagOutline } from 'ionicons/icons';
import { usePatrimonio } from '../composables/usePatrimonio';
import ObjetivoModal from '../components/ObjetivoModal.vue';
import { formatCurrency, descreverMeses, type Objetivo } from '../types';
import { mesesDecorridos } from '../domain/objetivos';

const {
  registros, objetivos, objetivosAtivos, objetivosConcluidos,
  patrimonioAtualGeral, estatisticasGerais,
  conclusaoDe, progressoDe, addObjetivo, updateObjetivo, deleteObjetivo,
} = usePatrimonio();

const aba = ref<'ativos' | 'concluidos' | 'todos'>('ativos');
const modalAberto = ref(false);
const objetivoEditando = ref<Objetivo | null>(null);
const alertaAberto = ref(false);
const objetivoExcluindo = ref<Objetivo | null>(null);
const toastAberto = ref(false);
const toastMsg = ref('');

/** Enriquece cada objetivo com conclusão, progresso e tempo decorrido. */
function decorar(lista: Objetivo[]) {
  return lista.map(objetivo => {
    const conclusao = conclusaoDe(objetivo);
    return {
      objetivo,
      conclusao,
      progresso: progressoDe(objetivo),
      mesesLevados: mesesDecorridos(objetivo, conclusao),
    };
  });
}

const listaVisivel = computed(() => {
  if (aba.value === 'ativos') return decorar(objetivosAtivos.value);
  if (aba.value === 'concluidos') return decorar(objetivosConcluidos.value);
  return decorar(objetivos.value);
});

const mensagemVazio = computed(() => {
  if (aba.value === 'concluidos') return 'Nenhum objetivo concluído ainda. Eles aparecem aqui automaticamente quando seu patrimônio alcança o valor-alvo.';
  if (aba.value === 'ativos' && objetivosConcluidos.value.length) return 'Nenhum objetivo em andamento. Que tal definir o próximo?';
  return 'Defina um objetivo de patrimônio para acompanhar o progresso e ver quando você chega lá.';
});

const conclusaoDoEditando = computed(() =>
  objetivoEditando.value ? conclusaoDe(objetivoEditando.value) : null
);

const botoesAlerta = [
  { text: 'Cancelar', role: 'cancel' },
  { text: 'Excluir', role: 'destructive', handler: () => excluirConfirmado() },
];

function abrirNovo() {
  objetivoEditando.value = null;
  modalAberto.value = true;
}

function abrirEdicao(obj: Objetivo) {
  objetivoEditando.value = obj;
  modalAberto.value = true;
}

function fecharModal() {
  modalAberto.value = false;
  objetivoEditando.value = null;
}

function salvarObjetivo(dados: Omit<Objetivo, 'id' | 'criadoEm' | 'atualizadoEm'>) {
  if (objetivoEditando.value) {
    updateObjetivo(objetivoEditando.value.id, dados);
    toastMsg.value = 'Objetivo atualizado!';
  } else {
    addObjetivo(dados);
    toastMsg.value = 'Objetivo criado!';
  }
  toastAberto.value = true;
  fecharModal();
}

function confirmarExclusao(obj: Objetivo) {
  objetivoExcluindo.value = obj;
  alertaAberto.value = true;
}

function excluirConfirmado() {
  if (!objetivoExcluindo.value) return;
  deleteObjetivo(objetivoExcluindo.value.id);
  objetivoExcluindo.value = null;
  toastMsg.value = 'Objetivo excluído.';
  toastAberto.value = true;
}
</script>

<style scoped>
.page-content { padding: 16px; padding-bottom: 90px; }

.segment-toolbar { --background: #0D1117; --min-height: 44px; }
.obj-segment {
  --background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  margin: 0 12px 8px;
}
.obj-segment ion-segment-button {
  --color: #6B7280;
  --color-checked: #F0F6FC;
  --indicator-color: rgba(139, 92, 246, 0.25);
  --border-radius: 8px;
  min-height: 32px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: none;
}

.obj-list { background: transparent; padding: 0; }
.obj-item {
  --background: transparent;
  --padding-start: 0;
  --inner-padding-end: 0;
  --min-height: 0;
  margin-bottom: 12px;
}

.obj-card {
  width: 100%;
  background: #161B22;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 16px;
}
.obj-card.concluido {
  border-color: rgba(16, 185, 129, 0.22);
  background: rgba(16, 185, 129, 0.04);
}

.oc-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.oc-nome-wrap { display: flex; align-items: center; gap: 6px; min-width: 0; }
.oc-trofeu, .oc-estrela { font-size: 0.9rem; flex-shrink: 0; }
.oc-nome {
  font-size: 0.95rem; font-weight: 700; color: #F0F6FC; margin: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.oc-alvo { font-size: 0.9rem; font-weight: 800; color: #8B5CF6; margin: 0; white-space: nowrap; }
.concluido .oc-alvo { color: #10B981; }

.oc-bar-track {
  height: 8px; background: rgba(255, 255, 255, 0.08);
  border-radius: 8px; overflow: hidden; margin-bottom: 8px;
}
.oc-bar-fill {
  height: 100%; border-radius: 8px;
  background: linear-gradient(90deg, #8B5CF6, #6366F1);
  transition: width 0.6s ease;
}
.oc-bar-fill.completo { background: linear-gradient(90deg, #10B981, #06D6A0); }

.oc-percent-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.oc-percent { font-size: 0.8rem; font-weight: 700; color: #8B5CF6; }
.oc-percent.completo { color: #10B981; }
.oc-falta { font-size: 0.72rem; color: #9CA3AF; }

.oc-rodape {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; margin-top: 10px; padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
.oc-info { font-size: 0.72rem; line-height: 1.4; }
.oc-info.verde { color: #10B981; }
.oc-info.ouro { color: #F59E0B; }
.oc-info.vermelho { color: #EF4444; }

.oc-tag {
  font-size: 0.62rem; font-weight: 700; white-space: nowrap;
  border-radius: 6px; padding: 3px 7px;
  background: rgba(255, 255, 255, 0.06); color: #9CA3AF;
}
.oc-tag.tag-ok { background: rgba(16, 185, 129, 0.12); color: #10B981; }
.oc-tag.tag-alerta { background: rgba(239, 68, 68, 0.12); color: #EF4444; }

.oc-perseguindo { font-size: 0.7rem; color: #6B7280; margin: 8px 0 0; }

.sem-objetivo {
  background: #161B22; border-radius: 14px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  padding: 32px 20px; text-align: center;
}
.so-icon { font-size: 2.5rem; color: #374151; display: block; margin: 0 auto 12px; }
.so-txt { font-size: 0.85rem; color: #6B7280; line-height: 1.6; margin: 0 0 16px; }

.aviso-registros {
  background: rgba(245, 158, 11, 0.06); border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 12px; padding: 14px 16px; margin-bottom: 16px;
}
.aviso-registros p { font-size: 0.82rem; color: #F59E0B; margin: 0; }
</style>
