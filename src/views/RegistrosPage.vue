<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Registros Mensais</ion-title>
        <ion-buttons slot="end">
          <ion-button id="btn-add-registro-toolbar" fill="clear" color="primary" @click="abrirModal()">
            <ion-icon :icon="addOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Lista vazia -->
      <div v-if="!registros.length" class="empty-state">
        <ion-icon :icon="calendarOutline" class="es-icon" />
        <h3 class="es-titulo">Nenhum registro ainda</h3>
        <p class="es-sub">Comece adicionando seus ganhos e gastos de um mês</p>
        <ion-button id="btn-add-primeiro" color="primary" @click="abrirModal()">
          <ion-icon :icon="addOutline" slot="start" />
          Adicionar primeiro mês
        </ion-button>
      </div>

      <!-- Lista de registros -->
      <div v-else class="lista-wrap">
        <!-- Meses sem registro entre o primeiro e o último: como cada mês é um
             registro único, um mês esquecido some da série em vez de aparecer
             como buraco, distorcendo médias, fôlego e crescimento. -->
        <div v-if="lacunas.length" class="lacunas-aviso">
          <p class="la-titulo">⚠️ {{ lacunas.length }} {{ lacunas.length === 1 ? 'mês sem registro' : 'meses sem registro' }}</p>
          <p class="la-meses">{{ lacunasResumo }}</p>
          <p class="la-desc">Suas médias, o fôlego e o crescimento patrimonial ficam distorcidos enquanto esses meses faltarem.</p>
          <ion-button id="btn-preencher-lacuna" fill="outline" color="warning" size="small" @click="abrirModal()">
            <ion-icon :icon="addOutline" slot="start" />
            Adicionar mês
          </ion-button>
        </div>

        <!-- Resumo do período total -->
        <div class="resumo-total">
          <div class="rt-item">
            <p class="rt-label">Total registros</p>
            <p class="rt-valor">{{ registros.length }}</p>
          </div>
          <div class="rt-sep" />
          <div class="rt-item">
            <p class="rt-label">Ganhos totais</p>
            <p class="rt-valor verde">{{ formatCurrency(totalGanhos) }}</p>
          </div>
          <div class="rt-sep" />
          <div class="rt-item">
            <p class="rt-label">Gastos totais</p>
            <p class="rt-valor vermelho">{{ formatCurrency(totalGastos) }}</p>
          </div>
        </div>

        <!-- Itens com swipe -->
        <ion-list class="registros-lista">
          <ion-item-sliding
            v-for="reg in registrosOrdemDecrescente"
            :key="reg.id"
            :ref="el => setSlidingRef(el, reg.id)"
          >
            <!-- Opções de swipe: editar -->
            <ion-item-options side="start">
              <ion-item-option
                color="secondary"
                expandable
                @click="editarRegistro(reg)"
              >
                <ion-icon :icon="createOutline" slot="icon-only" />
              </ion-item-option>
            </ion-item-options>

            <!-- Conteúdo do item -->
            <ion-item lines="none" class="registro-item" @click="editarRegistro(reg)">
              <div class="ri-content">
                <div class="ri-header">
                  <div class="ri-mes-badge">
                    <span class="ri-mes-nome">{{ MESES_ABREV[reg.mes - 1] }}</span>
                    <span class="ri-mes-ano">{{ reg.ano }}</span>
                  </div>
                  <div class="ri-saldo" :class="(reg.ganhos - reg.gastos) >= 0 ? 'positivo' : 'negativo'">
                    <ion-icon :icon="(reg.ganhos - reg.gastos) >= 0 ? trendingUpOutline : trendingDownOutline" />
                    {{ formatCurrency(reg.ganhos - reg.gastos) }}
                  </div>
                </div>
                <div class="ri-bars">
                  <div class="ri-bar-row">
                    <span class="ri-bar-label">Ganhos</span>
                    <div class="ri-bar-track">
                      <div
                        class="ri-bar-fill verde"
                        :style="{ width: barWidth(reg.ganhos, reg) + '%' }"
                      />
                    </div>
                    <span class="ri-bar-val verde">{{ formatCurrency(reg.ganhos) }}</span>
                  </div>
                  <div class="ri-bar-row">
                    <span class="ri-bar-label">Gastos</span>
                    <div class="ri-bar-track">
                      <div
                        class="ri-bar-fill vermelho"
                        :style="{ width: barWidth(reg.gastos, reg) + '%' }"
                      />
                    </div>
                    <span class="ri-bar-val vermelho">{{ formatCurrency(reg.gastos) }}</span>
                  </div>
                </div>
                <div v-if="reg.descricao" class="ri-descricao">
                  <ion-icon :icon="chatbubbleOutline" /> {{ reg.descricao }}
                </div>
              </div>
            </ion-item>

            <!-- Opções de swipe: deletar -->
            <ion-item-options side="end">
              <ion-item-option
                color="danger"
                expandable
                @click="confirmarDelete(reg)"
              >
                <ion-icon :icon="trashOutline" slot="icon-only" />
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>
      </div>

      <!-- FAB para adicionar -->
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button id="btn-add-fab" @click="abrirModal()">
          <ion-icon :icon="addOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <!-- Modal -->
    <RegistroModal
      :is-open="modalAberto"
      :registro="registroEditando"
      :registros-existentes="registros"
      @close="fecharModal"
      @save="salvarRegistro"
    />

    <!-- Alert de confirmação de delete -->
    <ion-alert
      :is-open="alertDeleteAberto"
      header="Excluir registro"
      :message="`Deseja excluir o registro de ${registroParaDeletar ? MESES_ABREV[registroParaDeletar.mes - 1] + '/' + registroParaDeletar.ano : ''}?`"
      :buttons="botoesAlert"
      @did-dismiss="alertDeleteAberto = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonList, IonItem,
  IonItemSliding, IonItemOptions, IonItemOption,
  IonFab, IonFabButton, IonAlert
} from '@ionic/vue';
import {
  addOutline, calendarOutline, createOutline, trashOutline,
  chatbubbleOutline, trendingUpOutline, trendingDownOutline
} from 'ionicons/icons';
import { usePatrimonio } from '../composables/usePatrimonio';
import RegistroModal from '../components/RegistroModal.vue';
import type { RegistroMensal } from '../types';
import { MESES_ABREV, formatCurrency } from '../types';

const { registros, lacunas, addRegistro, updateRegistro, deleteRegistro } = usePatrimonio();

// ── Modal ─────────────────────────────────────────────────────
const modalAberto = ref(false);
const registroEditando = ref<RegistroMensal | null>(null);

function abrirModal(reg?: RegistroMensal) {
  registroEditando.value = reg ?? null;
  modalAberto.value = true;
}

function fecharModal() {
  modalAberto.value = false;
  registroEditando.value = null;
}

function editarRegistro(reg: RegistroMensal) {
  fecharSliding(reg.id);
  abrirModal(reg);
}

function salvarRegistro(dados: Omit<RegistroMensal, 'id' | 'createdAt' | 'updatedAt'>) {
  if (registroEditando.value) {
    updateRegistro(registroEditando.value.id, dados);
  } else {
    addRegistro(dados);
  }
  fecharModal();
}

// ── Delete ────────────────────────────────────────────────────
const alertDeleteAberto = ref(false);
const registroParaDeletar = ref<RegistroMensal | null>(null);

function confirmarDelete(reg: RegistroMensal) {
  fecharSliding(reg.id);
  registroParaDeletar.value = reg;
  alertDeleteAberto.value = true;
}

const botoesAlert = [
  { text: 'Cancelar', role: 'cancel', handler: () => { registroParaDeletar.value = null; } },
  {
    text: 'Excluir',
    role: 'destructive',
    cssClass: 'danger',
    handler: () => {
      if (registroParaDeletar.value) {
        deleteRegistro(registroParaDeletar.value.id);
        registroParaDeletar.value = null;
      }
    },
  },
];

// ── Sliding refs ──────────────────────────────────────────────
const slidingRefs = new Map<string, any>();

function setSlidingRef(el: any, id: string) {
  if (el) slidingRefs.set(id, el);
}

function fecharSliding(id: string) {
  const ref = slidingRefs.get(id);
  if (ref?.$el) ref.$el.close();
}

// ── Computed ──────────────────────────────────────────────────
const registrosOrdemDecrescente = computed(() =>
  [...registros.value].reverse()
);

const totalGanhos = computed(() => registros.value.reduce((s, r) => s + r.ganhos, 0));
const totalGastos = computed(() => registros.value.reduce((s, r) => s + r.gastos, 0));

/** Lista os meses faltantes; acima de 6 resume para não estourar o card. */
const lacunasResumo = computed(() => {
  const labels = lacunas.value.map(l => l.label);
  if (labels.length <= 6) return labels.join(' · ');
  return `${labels.slice(0, 6).join(' · ')} e mais ${labels.length - 6}`;
});

function barWidth(valor: number, reg: RegistroMensal): number {
  const max = Math.max(reg.ganhos, reg.gastos, 1);
  return Math.min((valor / max) * 100, 100);
}
</script>

<style scoped>
/* Empty state */
.empty-state {
  height: 70vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
}
.es-icon { font-size: 3.5rem; color: #374151; margin-bottom: 16px; display: block; }
.es-titulo { font-size: 1.2rem; font-weight: 700; color: #F0F6FC; margin: 0 0 8px; }
.es-sub { font-size: 0.85rem; color: #9CA3AF; margin: 0 0 24px; line-height: 1.6; }

/* Resumo */
.lista-wrap { padding: 16px 16px 100px; }

/* ── Aviso de meses faltantes ─────────────────── */
.lacunas-aviso {
  background: rgba(245,158,11,0.06);
  border: 1px solid rgba(245,158,11,0.22);
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 14px;
}
.la-titulo { font-size: 0.82rem; font-weight: 700; color: #F59E0B; margin: 0 0 6px; }
.la-meses { font-size: 0.78rem; color: #FCD34D; margin: 0 0 8px; line-height: 1.5; }
.la-desc { font-size: 0.72rem; color: #9CA3AF; margin: 0 0 12px; line-height: 1.5; }

.resumo-total {
  background: #161B22;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06);
  display: flex;
  padding: 14px;
  margin-bottom: 16px;
  gap: 0;
}
.rt-item { flex: 1; text-align: center; }
.rt-label { font-size: 0.65rem; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 4px; }
.rt-valor { font-size: 0.9rem; font-weight: 700; color: #F0F6FC; margin: 0; }
.rt-valor.verde { color: #10B981; }
.rt-valor.vermelho { color: #EF4444; }
.rt-sep { width: 1px; background: rgba(255,255,255,0.07); margin: 0 4px; }

/* Lista */
.registros-lista { background: transparent; padding: 0; }

/* Item */
.registro-item {
  --background: #161B22;
  --border-radius: 14px;
  --padding-start: 0;
  --inner-padding-end: 0;
  margin-bottom: 10px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.06);
  overflow: hidden;
}
.ri-content { padding: 14px 16px; width: 100%; }
.ri-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.ri-mes-badge { display: flex; flex-direction: column; }
.ri-mes-nome { font-size: 1rem; font-weight: 800; color: #F0F6FC; line-height: 1; }
.ri-mes-ano { font-size: 0.72rem; color: #9CA3AF; margin-top: 2px; }
.ri-saldo {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.95rem;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 20px;
}
.ri-saldo.positivo { background: rgba(16,185,129,0.12); color: #10B981; }
.ri-saldo.negativo { background: rgba(239,68,68,0.12); color: #EF4444; }

/* Barras */
.ri-bars { display: flex; flex-direction: column; gap: 6px; }
.ri-bar-row { display: flex; align-items: center; gap: 8px; }
.ri-bar-label { font-size: 0.68rem; color: #9CA3AF; width: 40px; flex-shrink: 0; }
.ri-bar-track { flex: 1; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
.ri-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
.ri-bar-fill.verde { background: #10B981; }
.ri-bar-fill.vermelho { background: #EF4444; }
.ri-bar-val { font-size: 0.75rem; font-weight: 600; width: 80px; text-align: right; flex-shrink: 0; }
.ri-bar-val.verde { color: #10B981; }
.ri-bar-val.vermelho { color: #EF4444; }

/* Descrição */
.ri-descricao {
  margin-top: 10px;
  font-size: 0.78rem;
  color: #9CA3AF;
  display: flex;
  align-items: center;
  gap: 4px;
}
.ri-descricao ion-icon { font-size: 0.85rem; }

/* Sliding */
ion-item-sliding { border-radius: 14px; margin-bottom: 10px; overflow: hidden; }

.verde { color: #10B981; }
.vermelho { color: #EF4444; }
</style>
