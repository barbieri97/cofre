<template>
  <ion-modal :is-open="isOpen" @did-dismiss="fechar">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button color="medium" @click="fechar">Cancelar</ion-button>
        </ion-buttons>
        <ion-title>{{ categoria?.nome }} · {{ ano }}</ion-title>
        <ion-buttons slot="end">
          <ion-button
            id="btn-salvar-orcamento"
            :strong="true"
            color="primary"
            :disabled="!valido"
            @click="salvar"
          >Salvar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="campo-grupo">
        <p class="campo-titulo">Distribuição</p>
        <ion-segment id="segment-distribuicao" v-model="form.distribuicao">
          <ion-segment-button value="uniforme"><ion-label>Uniforme</ion-label></ion-segment-button>
          <ion-segment-button value="meses"><ion-label>Meses</ion-label></ion-segment-button>
          <ion-segment-button value="manual"><ion-label>Manual</ion-label></ion-segment-button>
        </ion-segment>
        <p class="campo-desc">{{ DESCRICAO[form.distribuicao] }}</p>
      </div>

      <div v-if="form.distribuicao !== 'manual'" class="campo-grupo">
        <p class="campo-titulo">Valor anual (R$)</p>
        <ion-input
          id="input-orcamento-anual"
          :value="form.anualStr"
          type="number"
          inputmode="decimal"
          placeholder="0,00"
          min="0"
          @ion-input="(e: any) => { form.anualStr = e.detail.value ?? ''; }"
        />
      </div>

      <div v-if="form.distribuicao === 'meses'" class="campo-grupo">
        <p class="campo-titulo">Meses</p>
        <div class="chips">
          <button
            v-for="(abrev, i) in MESES_ABREV"
            :id="`chip-mes-${i + 1}`"
            :key="i"
            type="button"
            :class="['chip', form.mesesEscolhidos.includes(i + 1) && 'ativo']"
            @click="alternarMes(i + 1)"
          >{{ abrev }}</button>
        </div>
      </div>

      <div v-if="form.distribuicao === 'manual'" class="campo-grupo">
        <p class="campo-titulo">Valor de cada mês (R$)</p>
        <div class="grade-manual">
          <div v-for="(abrev, i) in MESES_ABREV" :key="i" class="campo-wrap">
            <ion-label>{{ abrev }}</ion-label>
            <ion-input
              :id="`input-orcamento-mes-${i + 1}`"
              :value="form.manualStr[i]"
              type="number"
              inputmode="decimal"
              placeholder="0"
              min="0"
              @ion-input="(e: any) => { form.manualStr[i] = e.detail.value ?? ''; }"
            />
          </div>
        </div>
      </div>

      <!-- Prévia -->
      <div class="campo-grupo">
        <p class="campo-titulo">Prévia · total {{ formatCurrency(previa.valorAnual) }}</p>
        <div class="previa">
          <div v-for="(v, i) in previa.meses" :key="i" class="pv-mes" :class="{ zero: v === 0 }">
            <span class="pv-label">{{ MESES_ABREV[i] }}</span>
            <span class="pv-valor">{{ formatCurrency(v) }}</span>
          </div>
        </div>
      </div>

      <ion-button
        v-if="orcamento"
        id="btn-remover-orcamento"
        expand="block"
        fill="outline"
        color="danger"
        @click="emit('remover')"
      >
        <ion-icon :icon="trashOutline" slot="start" />
        Remover orçamento deste ano
      </ion-button>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonInput, IonSegment, IonSegmentButton, IonLabel, IonIcon,
} from '@ionic/vue';
import { trashOutline } from 'ionicons/icons';
import type { Categoria, Orcamento, DistribuicaoOrcamento } from '../types';
import { MESES_ABREV, formatCurrency } from '../types';
import { distribuir, type DadosOrcamento } from '../domain/orcamento';

const props = defineProps<{
  isOpen: boolean;
  categoria: Categoria | null;
  ano: number;
  orcamento?: Orcamento | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', dados: DadosOrcamento): void;
  (e: 'remover'): void;
}>();

const DESCRICAO: Record<DistribuicaoOrcamento, string> = {
  uniforme: 'O valor anual dividido igualmente pelos 12 meses. O arredondamento vai para dezembro.',
  meses: 'O valor anual dividido entre os meses escolhidos; os demais ficam com zero.',
  manual: 'Você define cada mês; o valor anual é a soma deles.',
};

const form = ref({
  distribuicao: 'uniforme' as DistribuicaoOrcamento,
  anualStr: '',
  mesesEscolhidos: [] as number[],
  manualStr: new Array<string>(12).fill(''),
});

watch(() => props.isOpen, (aberto) => {
  if (!aberto) return;
  const o = props.orcamento;
  form.value = {
    distribuicao: o?.distribuicao ?? 'uniforme',
    anualStr: o ? String(o.valorAnual) : '',
    mesesEscolhidos: [...(o?.mesesEscolhidos ?? [])],
    manualStr: o ? o.meses.map(v => (v ? String(v) : '')) : new Array<string>(12).fill(''),
  };
});

function numero(texto: string): number {
  const v = parseFloat(texto);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function alternarMes(m: number) {
  const lista = form.value.mesesEscolhidos;
  form.value.mesesEscolhidos = lista.includes(m) ? lista.filter(x => x !== m) : [...lista, m];
}

const dados = computed<DadosOrcamento | null>(() => {
  if (!props.categoria) return null;
  return {
    categoriaId: props.categoria.id,
    ano: props.ano,
    valorAnual: numero(form.value.anualStr),
    distribuicao: form.value.distribuicao,
    mesesEscolhidos: form.value.mesesEscolhidos,
    mesesManuais: form.value.manualStr.map(numero),
  };
});

const previa = computed(() => {
  const d = dados.value;
  return d
    ? distribuir(d.valorAnual, d.distribuicao, d.mesesEscolhidos, d.mesesManuais)
    : { valorAnual: 0, meses: new Array<number>(12).fill(0) };
});

const valido = computed(() =>
  !!dados.value && (form.value.distribuicao !== 'meses' || form.value.mesesEscolhidos.length > 0)
);

function salvar() {
  if (dados.value && valido.value) emit('save', dados.value);
}

function fechar() {
  emit('close');
}
</script>

<style scoped>
ion-modal { --background: var(--cofre-bg); }
ion-header ion-toolbar { --background: var(--cofre-surface); padding-top: env(safe-area-inset-top); }
ion-content { --background: var(--cofre-bg); }

.campo-grupo { margin-bottom: 24px; }
.campo-titulo { margin-bottom: 6px; }
.campo-desc { font-size: var(--cofre-fs-sm); color: var(--cofre-text-subtle); margin: 10px 0 0; line-height: 1.5; }
.campo-wrap { display: flex; flex-direction: column; }

.chips { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
.chip {
  background: var(--cofre-surface-2); color: var(--cofre-text-muted);
  border: 1px solid var(--cofre-border); border-radius: var(--cofre-radius-sm);
  padding: 8px 0; font-size: var(--cofre-fs-xs); font-weight: 600;
}
.chip.ativo { background: var(--cofre-accent-muted); color: var(--cofre-accent-light); border-color: var(--cofre-accent-border); }

.grade-manual { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }

.previa { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.pv-mes {
  background: var(--cofre-surface); border: 1px solid var(--cofre-border);
  border-radius: var(--cofre-radius-sm); padding: 6px 8px;
}
.pv-mes.zero { opacity: 0.45; }
.pv-label { display: block; font-size: var(--cofre-fs-2xs); color: var(--cofre-text-subtle); }
.pv-valor { display: block; font-size: var(--cofre-fs-xs); font-weight: 600; color: var(--cofre-text); }
</style>
