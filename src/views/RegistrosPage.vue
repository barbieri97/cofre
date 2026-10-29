<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Registros Mensais</ion-title>
        <ion-buttons slot="end">
          <ion-button
            v-if="categorias.length"
            id="btn-lancar-por-categoria"
            fill="clear"
            color="primary"
            :router-link="`/tabs/orcamento/lancamento/${hoje.getFullYear()}/${hoje.getMonth() + 1}`"
          >
            <ion-icon :icon="pricetagsOutline" slot="icon-only" />
          </ion-button>
          <ion-button id="btn-add-registro-toolbar" fill="clear" color="primary" @click="abrirModal()">
            <ion-icon :icon="addOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Lista vazia -->
      <EstadoVazio
        v-if="!registros.length"
        :icone="calendarOutline"
        titulo="Nenhum registro ainda"
        texto="Comece adicionando seus ganhos e gastos de um mês"
      >
        <ion-button id="btn-add-primeiro" color="primary" @click="abrirModal()">
          <ion-icon :icon="addOutline" slot="start" />
          Adicionar primeiro mês
        </ion-button>
      </EstadoVazio>

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
                color="primary"
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
                  <span v-if="mesEhDetalhado(reg.ano, reg.mes)" class="ri-origem">
                    <ion-icon :icon="pricetagsOutline" /> por categoria
                  </span>
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
      :message="mensagemDelete"
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
  chatbubbleOutline, trendingUpOutline, trendingDownOutline, pricetagsOutline
} from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { usePatrimonio } from '../composables/usePatrimonio';
import RegistroModal from '../components/RegistroModal.vue';
import EstadoVazio from '../components/EstadoVazio.vue';
import type { RegistroMensal } from '../types';
import { MESES_ABREV, formatCurrency } from '../types';

const {
  registros, lacunas, categorias, lancarTotaisMes, mesEhDetalhado, deleteRegistro,
} = usePatrimonio();
const router = useRouter();
const hoje = new Date();

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

/** Um mês detalhado por categoria se edita no Lançamento do mês, não no total. */
function editarRegistro(reg: RegistroMensal) {
  fecharSliding(reg.id);
  if (mesEhDetalhado(reg.ano, reg.mes)) {
    router.push(`/tabs/orcamento/lancamento/${reg.ano}/${reg.mes}`);
    return;
  }
  abrirModal(reg);
}

function salvarRegistro(dados: Omit<RegistroMensal, 'id' | 'createdAt' | 'updatedAt'>) {
  // Lançamento rápido: os totais vão para as categorias "Outros" do mês.
  const anterior = registroEditando.value;
  lancarTotaisMes(dados, anterior ? { mes: anterior.mes, ano: anterior.ano } : undefined);
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

const mensagemDelete = computed(() => {
  const r = registroParaDeletar.value;
  if (!r) return '';
  const label = `${MESES_ABREV[r.mes - 1]}/${r.ano}`;
  return mesEhDetalhado(r.ano, r.mes)
    ? `Deseja excluir ${label}? Os lançamentos por categoria deste mês também serão apagados.`
    : `Deseja excluir o registro de ${label}?`;
});

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

/* Resumo */
.lista-wrap { padding: 16px 16px 100px; }

/* ── Aviso de meses faltantes ─────────────────── */
.lacunas-aviso {
  background: var(--cofre-gold-subtle);
  border: 1px solid var(--cofre-gold-border);
  border-radius: var(--cofre-radius-lg);
  padding: 14px 16px;
  margin-bottom: 14px;
}
.la-titulo { font-size: var(--cofre-fs-sm); font-weight: 700; color: var(--cofre-gold); margin: 0 0 6px; }
.la-meses { font-size: var(--cofre-fs-sm); color: var(--cofre-gold-light); margin: 0 0 8px; line-height: 1.5; }
.la-desc { font-size: var(--cofre-fs-xs); color: var(--cofre-text-muted); margin: 0 0 12px; line-height: 1.5; }

.resumo-total {
  background: var(--cofre-surface);
  border-radius: var(--cofre-radius-lg);
  border: 1px solid var(--cofre-border);
  display: flex;
  padding: 14px;
  margin-bottom: 16px;
  gap: 0;
}
.rt-item { flex: 1; text-align: center; }
.rt-label { font-size: var(--cofre-fs-2xs); font-weight: 600; color: var(--cofre-text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 4px; }
.rt-valor { font-size: var(--cofre-fs-md); font-weight: 700; color: var(--cofre-text); margin: 0; }
.rt-valor.verde { color: var(--cofre-green); }
.rt-valor.vermelho { color: var(--cofre-red); }
.rt-sep { width: 1px; background: var(--cofre-border); margin: 0 4px; }

/* Lista */
.registros-lista { background: transparent; padding: 0; }

/* Item */
.registro-item {
  --background: var(--cofre-surface);
  --border-radius: var(--cofre-radius-lg);
  --padding-start: 0;
  --inner-padding-end: 0;
  margin-bottom: 10px;
  border-radius: var(--cofre-radius-lg);
  border: 1px solid var(--cofre-border);
  overflow: hidden;
}
.ri-content { padding: 14px 16px; width: 100%; }
.ri-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.ri-mes-badge { display: flex; flex-direction: column; }
.ri-origem {
  display: inline-flex; align-items: center; gap: 4px; margin-right: auto; margin-left: 12px;
  font-size: var(--cofre-fs-2xs); font-weight: 600; color: var(--cofre-accent-light);
  background: var(--cofre-accent-muted); border-radius: var(--cofre-radius-full); padding: 2px 8px;
}
.ri-mes-nome { font-size: var(--cofre-fs-base); font-weight: 800; color: var(--cofre-text); line-height: 1; }
.ri-mes-ano { font-size: var(--cofre-fs-xs); color: var(--cofre-text-muted); margin-top: 2px; }
.ri-saldo {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--cofre-fs-base);
  font-weight: 700;
  padding: 6px 12px;
  border-radius: var(--cofre-radius-xl);
}
.ri-saldo.positivo { background: var(--cofre-green-muted); color: var(--cofre-green); }
.ri-saldo.negativo { background: var(--cofre-red-muted); color: var(--cofre-red); }

/* Barras */
.ri-bars { display: flex; flex-direction: column; gap: 6px; }
.ri-bar-row { display: flex; align-items: center; gap: 8px; }
.ri-bar-label { font-size: var(--cofre-fs-2xs); color: var(--cofre-text-muted); width: 40px; flex-shrink: 0; }
.ri-bar-track { flex: 1; height: 6px; background: var(--cofre-border); border-radius: var(--cofre-radius-xs); overflow: hidden; }
.ri-bar-fill { height: 100%; border-radius: var(--cofre-radius-xs); transition: width 0.5s ease; }
.ri-bar-fill.verde { background: var(--cofre-green); }
.ri-bar-fill.vermelho { background: var(--cofre-red); }
.ri-bar-val { font-size: var(--cofre-fs-xs); font-weight: 600; width: 80px; text-align: right; flex-shrink: 0; }
.ri-bar-val.verde { color: var(--cofre-green); }
.ri-bar-val.vermelho { color: var(--cofre-red); }

/* Descrição */
.ri-descricao {
  margin-top: 10px;
  font-size: var(--cofre-fs-sm);
  color: var(--cofre-text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
}
.ri-descricao ion-icon { font-size: var(--cofre-fs-md); }

/* Sliding */
ion-item-sliding { border-radius: var(--cofre-radius-lg); margin-bottom: 10px; overflow: hidden; }

.verde { color: var(--cofre-green); }
.vermelho { color: var(--cofre-red); }
</style>
