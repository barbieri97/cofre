<template>
  <ion-modal :is-open="isOpen" @did-dismiss="fechar">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button color="medium" @click="fechar">Cancelar</ion-button>
        </ion-buttons>
        <ion-title>{{ modoEdicao ? 'Editar Objetivo' : 'Novo Objetivo' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button
            id="btn-salvar-objetivo"
            :strong="true"
            color="primary"
            :disabled="!formularioValido"
            @click="salvar"
          >Salvar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Nome -->
      <div class="campo-grupo">
        <p class="campo-titulo">🎯 Nome</p>
        <div class="campo-wrap">
          <ion-input
            id="input-objetivo-nome"
            :value="form.nome"
            placeholder="Ex: Reserva de emergência"
            :clear-input="true"
            @ion-input="(e: any) => { form.nome = e.detail.value ?? ''; }"
          />
        </div>
      </div>

      <!-- Valor -->
      <div class="campo-grupo">
        <p class="campo-titulo">💼 Patrimônio-alvo (R$)</p>
        <p class="campo-desc">O valor de patrimônio líquido que você quer alcançar.</p>
        <div class="campo-wrap">
          <ion-input
            id="input-objetivo-valor"
            :value="form.valorStr"
            type="number"
            inputmode="decimal"
            placeholder="Ex: 500000"
            min="0"
            :clear-input="true"
            @ion-input="(e: any) => { form.valorStr = e.detail.value ?? ''; }"
          />
        </div>
      </div>

      <!-- Datas -->
      <div class="campo-grupo">
        <p class="campo-titulo">📅 Prazos</p>
        <div class="row-2col">
          <div class="campo-wrap">
            <ion-label class="campo-label">Início</ion-label>
            <input id="input-objetivo-inicio" v-model="form.dataInicio" type="date" class="date-input" />
          </div>
          <div class="campo-wrap">
            <ion-label class="campo-label">Alvo (opcional)</ion-label>
            <input id="input-objetivo-alvo" v-model="form.dataAlvo" type="date" class="date-input" />
          </div>
        </div>
        <p v-if="erroDatas" class="erro-msg">⚠️ A data-alvo não pode ser anterior ao início.</p>
      </div>

      <!-- Conclusão (só na edição) -->
      <div class="campo-grupo" v-if="modoEdicao">
        <p class="campo-titulo">🏆 Conclusão</p>
        <div class="toggle-row">
          <div class="toggle-texto">
            <p class="toggle-label">Informar data manualmente</p>
            <p class="toggle-desc">
              {{ form.conclusaoManual
                ? 'Você define quando este objetivo foi concluído.'
                : conclusaoAutomatica
                  ? `Detectado automaticamente: concluído em ${conclusaoAutomatica.label}.`
                  : 'O app marca como concluído quando seu patrimônio alcançar o alvo.' }}
            </p>
          </div>
          <ion-toggle
            id="toggle-objetivo-conclusao"
            :checked="form.conclusaoManual"
            @ion-change="(e: any) => alternarConclusaoManual(e.detail.checked)"
          />
        </div>
        <div class="campo-wrap" v-if="form.conclusaoManual">
          <input id="input-objetivo-conclusao" v-model="form.dataConclusao" type="date" class="date-input" />
        </div>
      </div>

      <!-- Principal -->
      <div class="campo-grupo">
        <div class="toggle-row">
          <div class="toggle-texto">
            <p class="toggle-label">⭐ Destacar na Home</p>
            <p class="toggle-desc">Apenas um objetivo pode ficar em destaque.</p>
          </div>
          <ion-toggle
            id="toggle-objetivo-principal"
            :checked="form.principal"
            @ion-change="(e: any) => { form.principal = e.detail.checked; }"
          />
        </div>
      </div>

      <!-- Preview ao vivo -->
      <div class="preview-card" v-if="previa">
        <div class="preview-row">
          <span class="prev-label">Progresso</span>
          <span class="prev-valor" :class="previa.atingido ? 'positivo' : 'neutro'">
            {{ previa.percentualAtingido.toFixed(1) }}%
          </span>
        </div>
        <div class="preview-row" v-if="!previa.atingido">
          <span class="prev-label">Faltam</span>
          <span class="prev-valor">{{ formatCurrency(previa.valorRestante) }}</span>
        </div>
        <div class="preview-row" v-if="previa.atingido">
          <span class="prev-label">Situação</span>
          <span class="prev-valor positivo">Já atingido 🎉</span>
        </div>
        <div class="preview-row" v-else-if="previa.dataEstimada">
          <span class="prev-label">Estimativa</span>
          <span class="prev-valor neutro">{{ previa.dataEstimada }}</span>
        </div>
        <div class="preview-row" v-else>
          <span class="prev-label">Estimativa</span>
          <span class="prev-valor negativo">Crescimento insuficiente</span>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonLabel, IonInput, IonToggle
} from '@ionic/vue';
import type { Objetivo } from '../types';
import { formatCurrency } from '../types';
import { progressoObjetivo, type Conclusao } from '../domain/objetivos';

const props = defineProps<{
  isOpen: boolean;
  objetivo?: Objetivo | null;
  patrimonioAtual: number;
  crescimentoMedioMensal: number;
  /** Conclusão derivada do histórico, quando houver — só para exibir no toggle */
  conclusaoAutomatica?: Conclusao | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', dados: Omit<Objetivo, 'id' | 'criadoEm' | 'atualizadoEm'>): void;
}>();

const modoEdicao = computed(() => !!props.objetivo);

/** Converte ISO completo para o formato aceito pelo <input type="date"> */
function paraInputDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Converte a data escolhida no <input type="date"> para ISO ao meio-dia UTC.
 *
 * O meio-dia evita que a conversão de fuso empurre a data para o dia anterior
 * ou seguinte — o que, numa virada de mês, mudaria o mês exibido na conclusão
 * do objetivo. Ver mesAnoDe() em src/domain/objetivos.ts.
 */
function paraISO(valor: string): string | undefined {
  if (!valor) return undefined;
  const [ano, mes, dia] = valor.split('-').map(Number);
  if (!ano || !mes || !dia) return undefined;
  return new Date(Date.UTC(ano, mes - 1, dia, 12)).toISOString();
}

function formVazio() {
  return {
    nome: '',
    valorStr: '',
    dataInicio: paraInputDate(new Date().toISOString()),
    dataAlvo: '',
    dataConclusao: '',
    conclusaoManual: false,
    principal: false,
  };
}

const form = ref(formVazio());

watch(() => props.isOpen, (aberto) => {
  if (!aberto) return;
  const o = props.objetivo;
  form.value = o
    ? {
        nome: o.nome,
        valorStr: String(o.valor),
        dataInicio: paraInputDate(o.dataInicio),
        dataAlvo: paraInputDate(o.dataAlvo),
        dataConclusao: paraInputDate(o.dataConclusao),
        conclusaoManual: !!o.dataConclusao,
        principal: !!o.principal,
      }
    : formVazio();
});

/**
 * Ao ligar o modo manual, pré-preenche com a data já detectada (ou hoje) para
 * o campo não abrir vazio; ao desligar, limpa para que a derivação volte a valer.
 */
function alternarConclusaoManual(ativo: boolean) {
  form.value.conclusaoManual = ativo;
  if (ativo) {
    if (!form.value.dataConclusao) {
      const auto = props.conclusaoAutomatica;
      form.value.dataConclusao = auto
        ? paraInputDate(new Date(Date.UTC(auto.ano, auto.mes - 1, 1, 12)).toISOString())
        : paraInputDate(new Date().toISOString());
    }
  } else {
    form.value.dataConclusao = '';
  }
}

const valorNumerico = computed(() => parseFloat(form.value.valorStr) || 0);

const erroDatas = computed(() => {
  if (!form.value.dataInicio || !form.value.dataAlvo) return false;
  return form.value.dataAlvo < form.value.dataInicio;
});

const formularioValido = computed(() =>
  form.value.nome.trim() !== '' &&
  valorNumerico.value > 0 &&
  form.value.dataInicio !== '' &&
  !erroDatas.value &&
  (!form.value.conclusaoManual || form.value.dataConclusao !== '')
);

const previa = computed(() => {
  if (valorNumerico.value <= 0) return null;
  const base: Objetivo = {
    id: 'previa',
    nome: form.value.nome,
    valor: valorNumerico.value,
    dataInicio: paraISO(form.value.dataInicio) ?? new Date().toISOString(),
    criadoEm: '',
    atualizadoEm: '',
  };
  return progressoObjetivo(base, props.patrimonioAtual, props.crescimentoMedioMensal);
});

function salvar() {
  if (!formularioValido.value) return;
  emit('save', {
    nome: form.value.nome.trim(),
    valor: valorNumerico.value,
    dataInicio: paraISO(form.value.dataInicio) ?? new Date().toISOString(),
    dataAlvo: paraISO(form.value.dataAlvo),
    dataConclusao: form.value.conclusaoManual ? paraISO(form.value.dataConclusao) : undefined,
    principal: form.value.principal,
  });
}

function fechar() {
  emit('close');
}
</script>

<style scoped>
ion-modal { --background: #0D1117; }
ion-header ion-toolbar { --background: #161B22; padding-top: env(safe-area-inset-top); }
ion-content { --background: #0D1117; }

.campo-grupo { margin-bottom: 24px; }
.campo-titulo {
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; color: #10B981; margin: 0 0 6px;
}
.campo-desc { font-size: 0.78rem; color: #6B7280; margin: 0 0 12px; line-height: 1.5; }
.campo-wrap { display: flex; flex-direction: column; gap: 4px; }
.campo-label { font-size: 0.75rem; color: #9CA3AF; }
.row-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.date-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: #F0F6FC;
  font-size: 0.9rem;
  font-family: inherit;
  padding: 10px 12px;
}
.date-input::-webkit-calendar-picker-indicator { filter: invert(0.7); cursor: pointer; }

.toggle-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; padding: 4px 0 12px;
}
.toggle-texto { flex: 1; }
.toggle-label { font-size: 0.88rem; font-weight: 600; color: #F0F6FC; margin: 0 0 4px; }
.toggle-desc { font-size: 0.75rem; color: #6B7280; margin: 0; line-height: 1.5; }

.preview-card {
  background: #161B22; border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px; padding: 16px; margin-bottom: 24px;
  display: flex; flex-direction: column; gap: 10px;
}
.preview-row { display: flex; align-items: center; justify-content: space-between; }
.prev-label { font-size: 0.82rem; color: #9CA3AF; }
.prev-valor { font-size: 1rem; font-weight: 700; color: #F0F6FC; }
.prev-valor.positivo { color: #10B981; }
.prev-valor.negativo { color: #EF4444; }
.prev-valor.neutro { color: #F59E0B; }

.erro-msg { color: #EF4444; font-size: 0.78rem; margin: 8px 0 0; }
</style>
