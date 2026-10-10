<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Objetivos</ion-title>
        <ion-buttons slot="end">
          <ion-button id="btn-add-objetivo" fill="clear" color="primary" @click="abrirNovo">
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
        <EstadoVazio v-if="!listaVisivel.length" compacto :icone="flagOutline" :texto="mensagemVazio">
          <ion-button v-if="aba !== 'concluidos'" color="primary" size="small" @click="abrirNovo">
            Criar objetivo
          </ion-button>
        </EstadoVazio>

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
import EstadoVazio from '../components/EstadoVazio.vue';
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

.segment-toolbar { --background: var(--cofre-bg); --min-height: 44px; }
.obj-segment {
  --background: var(--cofre-overlay);
  border-radius: var(--cofre-radius-md);
  margin: 0 12px 8px;
}
.obj-segment ion-segment-button {
  --color: var(--cofre-text-subtle);
  --color-checked: var(--cofre-text);
  --indicator-color: var(--cofre-accent-border);
  --border-radius: var(--cofre-radius-sm);
  min-height: 32px;
  font-size: var(--cofre-fs-xs);
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
  background: var(--cofre-surface);
  border-radius: var(--cofre-radius-lg);
  border: 1px solid var(--cofre-border);
  padding: 16px;
}
.obj-card.concluido {
  border-color: var(--cofre-green-border);
  background: var(--cofre-green-subtle);
}

.oc-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.oc-nome-wrap { display: flex; align-items: center; gap: 6px; min-width: 0; }
.oc-trofeu, .oc-estrela { font-size: var(--cofre-fs-md); flex-shrink: 0; }
.oc-nome {
  font-size: var(--cofre-fs-base); font-weight: 700; color: var(--cofre-text); margin: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.oc-alvo { font-size: var(--cofre-fs-md); font-weight: 800; color: var(--cofre-accent); margin: 0; white-space: nowrap; }
.concluido .oc-alvo { color: var(--cofre-green); }

.oc-bar-track {
  height: 8px; background: var(--cofre-border-strong);
  border-radius: var(--cofre-radius-sm); overflow: hidden; margin-bottom: 8px;
}
.oc-bar-fill {
  height: 100%; border-radius: var(--cofre-radius-sm);
  background: var(--cofre-gradient-accent);
  transition: width 0.6s ease;
}
.oc-bar-fill.completo { background: var(--cofre-gradient-green); }

.oc-percent-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.oc-percent { font-size: var(--cofre-fs-sm); font-weight: 700; color: var(--cofre-accent); }
.oc-percent.completo { color: var(--cofre-green); }
.oc-falta { font-size: var(--cofre-fs-xs); color: var(--cofre-text-muted); }

.oc-rodape {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; margin-top: 10px; padding-top: 10px;
  border-top: 1px solid var(--cofre-overlay);
}
.oc-info { font-size: var(--cofre-fs-xs); line-height: 1.4; }
.oc-info.verde { color: var(--cofre-green); }
.oc-info.ouro { color: var(--cofre-gold); }
.oc-info.vermelho { color: var(--cofre-red); }

.oc-tag {
  font-size: var(--cofre-fs-3xs); font-weight: 700; white-space: nowrap;
  border-radius: var(--cofre-radius-sm); padding: 3px 7px;
  background: var(--cofre-border); color: var(--cofre-text-muted);
}
.oc-tag.tag-ok { background: var(--cofre-green-muted); color: var(--cofre-green); }
.oc-tag.tag-alerta { background: var(--cofre-red-muted); color: var(--cofre-red); }

.oc-perseguindo { font-size: var(--cofre-fs-2xs); color: var(--cofre-text-subtle); margin: 8px 0 0; }


.aviso-registros {
  background: var(--cofre-gold-subtle); border: 1px solid var(--cofre-gold-border);
  border-radius: var(--cofre-radius-md); padding: 14px 16px; margin-bottom: 16px;
}
.aviso-registros p { font-size: var(--cofre-fs-sm); color: var(--cofre-gold); margin: 0; }
</style>
