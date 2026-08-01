<template>
  <ion-modal :is-open="isOpen" @did-dismiss="fechar">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button color="medium" @click="fechar">Cancelar</ion-button>
        </ion-buttons>
        <ion-title>{{ modoEdicao ? 'Editar Mês' : 'Novo Registro' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button
            id="btn-salvar-registro"
            :strong="true"
            color="primary"
            @click="salvar"
            :disabled="!formularioValido"
          >Salvar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Período -->
      <div class="campo-grupo">
        <p class="campo-titulo">📅 Período</p>
        <div class="row-2col">
          <div class="campo-wrap">
            <ion-label>Mês</ion-label>
            <ion-select
              id="select-mes"
              v-model="form.mes"
              placeholder="Mês"
              interface="action-sheet"
              :interface-options="{ header: 'Selecione o mês' }"
            >
              <ion-select-option v-for="(nome, idx) in MESES_PT" :key="idx" :value="idx + 1">
                {{ nome }}
              </ion-select-option>
            </ion-select>
          </div>
          <div class="campo-wrap">
            <ion-label>Ano</ion-label>
            <ion-select
              id="select-ano"
              v-model="form.ano"
              placeholder="Ano"
              interface="action-sheet"
              :interface-options="{ header: 'Selecione o ano' }"
            >
              <ion-select-option v-for="ano in anosDisponiveis" :key="ano" :value="ano">
                {{ ano }}
              </ion-select-option>
            </ion-select>
          </div>
        </div>
        <p v-if="erroMesDuplicado" class="erro-msg">⚠️ Este mês já foi registrado.</p>
      </div>

      <!-- Receita -->
      <div class="campo-grupo">
        <p class="campo-titulo">💰 Receita Total (R$)</p>
        <p class="campo-desc">Tudo que entrou: salário, freelances, renda extra, rendimentos...</p>
        <div class="campo-wrap">
          <ion-input
            id="input-ganhos"
            :value="form.ganhosStr"
            type="number"
            inputmode="decimal"
            placeholder="0,00"
            min="0"
            @ion-input="(e: any) => { form.ganhosStr = e.detail.value ?? ''; validarNumero('ganhos'); }"
            :clear-input="true"
          />
        </div>
      </div>

      <!-- Despesa -->
      <div class="campo-grupo">
        <p class="campo-titulo">💸 Despesa Total (R$)</p>
        <p class="campo-desc">Tudo que saiu: contas, compras, despesas fixas e variáveis...</p>
        <div class="campo-wrap">
          <ion-input
            id="input-gastos"
            :value="form.gastosStr"
            type="number"
            inputmode="decimal"
            placeholder="0,00"
            min="0"
            @ion-input="(e: any) => { form.gastosStr = e.detail.value ?? ''; validarNumero('gastos'); }"
            :clear-input="true"
          />
        </div>
      </div>

      <!-- Preview calculado -->
      <div class="preview-card" v-if="form.ganhosStr || form.gastosStr">
        <div class="preview-row">
          <span class="prev-label">Saldo do mês</span>
          <span class="prev-valor" :class="saldoPreview >= 0 ? 'positivo' : 'negativo'">
            {{ saldoPreview >= 0 ? '+' : '' }}{{ formatCurrency(saldoPreview) }}
          </span>
        </div>
        <div class="preview-row" v-if="taxaPoupancaPreview > 0">
          <span class="prev-label">Taxa de poupança</span>
          <span class="prev-valor" :class="taxaPoupancaPreview >= 20 ? 'positivo' : taxaPoupancaPreview >= 0 ? 'neutro' : 'negativo'">
            {{ formatPercent(taxaPoupancaPreview) }}
          </span>
        </div>
      </div>

      <!-- Descrição -->
      <div class="campo-grupo">
        <p class="campo-titulo">📝 Observações (opcional)</p>
        <div class="campo-wrap">
          <ion-textarea
            id="textarea-descricao"
            v-model="form.descricao"
            placeholder="Ex: férias, bônus, mês atípico..."
            :rows="3"
          />
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonLabel, IonInput, IonTextarea,
  IonSelect, IonSelectOption
} from '@ionic/vue';
import type { RegistroMensal } from '../types';
import { MESES_PT, formatCurrency, formatPercent } from '../types';

// ── Props / Emits ────────────────────────────────────────────
const props = defineProps<{
  isOpen: boolean;
  registro?: RegistroMensal | null;
  registrosExistentes: RegistroMensal[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', dados: Omit<RegistroMensal, 'id' | 'createdAt' | 'updatedAt'>): void;
}>();

// ── Estado do formulário ─────────────────────────────────────
const hoje = new Date();
const form = ref({
  mes: hoje.getMonth() + 1,
  ano: hoje.getFullYear(),
  ganhosStr: '',
  gastosStr: '',
  descricao: '',
});

const modoEdicao = computed(() => !!props.registro);

const anosDisponiveis = computed(() => {
  const ano = hoje.getFullYear();
  return Array.from({ length: 10 }, (_, i) => ano - 5 + i);
});

// ── Sincronizar com registro quando modal abre ───────────────
watch(() => props.isOpen, (aberto) => {
  if (aberto) {
    if (props.registro) {
      form.value = {
        mes: props.registro.mes,
        ano: props.registro.ano,
        ganhosStr: String(props.registro.ganhos),
        gastosStr: String(props.registro.gastos),
        descricao: props.registro.descricao ?? '',
      };
    } else {
      form.value = {
        mes: hoje.getMonth() + 1,
        ano: hoje.getFullYear(),
        ganhosStr: '',
        gastosStr: '',
        descricao: '',
      };
    }
  }
});

// ── Validações ───────────────────────────────────────────────
function validarNumero(campo: 'ganhos' | 'gastos') {
  const key = campo === 'ganhos' ? 'ganhosStr' : 'gastosStr';
  const val = parseFloat(form.value[key]);
  if (val < 0) form.value[key] = '0';
}

const erroMesDuplicado = computed(() => {
  if (modoEdicao.value) return false;
  return props.registrosExistentes.some(
    r => r.mes === form.value.mes && r.ano === form.value.ano
  );
});

const formularioValido = computed(() =>
  !erroMesDuplicado.value &&
  form.value.ganhosStr !== '' &&
  form.value.gastosStr !== '' &&
  parseFloat(form.value.ganhosStr) >= 0 &&
  parseFloat(form.value.gastosStr) >= 0
);

const saldoPreview = computed(() => {
  const g = parseFloat(form.value.ganhosStr) || 0;
  const s = parseFloat(form.value.gastosStr) || 0;
  return g - s;
});

const taxaPoupancaPreview = computed(() => {
  const g = parseFloat(form.value.ganhosStr) || 0;
  if (g <= 0) return 0;
  return (saldoPreview.value / g) * 100;
});

// ── Ações ────────────────────────────────────────────────────
function salvar() {
  if (!formularioValido.value) return;
  emit('save', {
    mes: form.value.mes,
    ano: form.value.ano,
    ganhos: parseFloat(form.value.ganhosStr) || 0,
    gastos: parseFloat(form.value.gastosStr) || 0,
    descricao: form.value.descricao || undefined,
  });
}

function fechar() {
  emit('close');
}
</script>

<style scoped>
ion-modal {
  --background: #0D1117;
}

ion-header ion-toolbar {
  --background: #161B22;
  padding-top: env(safe-area-inset-top);
}

ion-content {
  --background: #0D1117;
}

.campo-grupo {
  margin-bottom: 24px;
}

.campo-titulo {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #10B981;
  margin: 0 0 6px;
}

.campo-desc {
  font-size: 0.78rem;
  color: #6B7280;
  margin: 0 0 12px;
  line-height: 1.5;
}

.campo-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.row-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* Preview calculado */
.preview-card {
  background: #161B22;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.prev-label {
  font-size: 0.82rem;
  color: #9CA3AF;
}

.prev-valor {
  font-size: 1rem;
  font-weight: 700;
}

.prev-valor.positivo { color: #10B981; }
.prev-valor.negativo { color: #EF4444; }
.prev-valor.neutro { color: #F59E0B; }

.erro-msg {
  color: #EF4444;
  font-size: 0.78rem;
  margin: 6px 0 0;
}

ion-select {
  width: 100%;
}
</style>
