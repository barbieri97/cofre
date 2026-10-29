<template>
  <ion-modal :is-open="isOpen" @did-dismiss="fechar">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button color="medium" @click="fechar">Cancelar</ion-button>
        </ion-buttons>
        <ion-title>{{ categoria ? 'Editar categoria' : 'Nova categoria' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button
            id="btn-salvar-categoria"
            :strong="true"
            color="primary"
            :disabled="!form.nome.trim()"
            @click="salvar"
          >Salvar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="campo-grupo">
        <p class="campo-titulo">Nome</p>
        <ion-input
          id="input-categoria-nome"
          :value="form.nome"
          placeholder="Ex.: Mercado, Salário, Previdência"
          :maxlength="40"
          @ion-input="(e: any) => { form.nome = e.detail.value ?? ''; erro = null; }"
        />
      </div>

      <div class="campo-grupo">
        <p class="campo-titulo">Tipo</p>
        <ion-segment id="segment-categoria-tipo" v-model="form.tipo" @ion-change="erro = null">
          <ion-segment-button v-for="t in TIPOS_CATEGORIA" :key="t" :value="t">
            <ion-label>{{ ROTULO_TIPO_SINGULAR[t] }}</ion-label>
          </ion-segment-button>
        </ion-segment>
        <p class="campo-desc">{{ DESCRICAO_TIPO[form.tipo] }}</p>
      </div>

      <div class="campo-grupo">
        <p class="campo-titulo">Grupo (opcional)</p>
        <ion-input
          id="input-categoria-grupo"
          :value="form.grupo"
          placeholder="Ex.: Moradia, Transporte"
          :maxlength="30"
          @ion-input="(e: any) => { form.grupo = e.detail.value ?? ''; }"
        />
        <div v-if="sugestoesGrupo.length" class="chips">
          <button
            v-for="g in sugestoesGrupo"
            :key="g"
            type="button"
            :class="['chip', form.grupo.trim() === g && 'ativo']"
            @click="form.grupo = g"
          >{{ g }}</button>
        </div>
      </div>

      <p v-if="erro" class="erro-msg">⚠️ {{ erro }}</p>

      <!-- Ações da categoria existente -->
      <div v-if="categoria" class="acoes">
        <ion-button
          id="btn-arquivar-categoria"
          expand="block"
          fill="outline"
          color="medium"
          @click="emit('arquivar', categoria.id, !categoria.ativa)"
        >
          <ion-icon :icon="categoria.ativa ? archiveOutline : arrowUndoOutline" slot="start" />
          {{ categoria.ativa ? 'Arquivar' : 'Reativar' }}
        </ion-button>
        <ion-button
          v-if="!temDados"
          id="btn-excluir-categoria"
          expand="block"
          fill="outline"
          color="danger"
          @click="emit('remover', categoria.id)"
        >
          <ion-icon :icon="trashOutline" slot="start" />
          Excluir
        </ion-button>
        <p v-else class="campo-desc">
          Esta categoria tem lançamentos ou orçamento, então pode ser arquivada mas não excluída.
          Arquivada, ela some dos lançamentos novos e continua nos anos em que tem dados.
        </p>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonInput, IonSegment, IonSegmentButton, IonLabel, IonIcon,
} from '@ionic/vue';
import { archiveOutline, arrowUndoOutline, trashOutline } from 'ionicons/icons';
import type { Categoria, TipoCategoria } from '../types';
import { TIPOS_CATEGORIA } from '../domain/categorias';

const props = defineProps<{
  isOpen: boolean;
  categoria?: Categoria | null;
  tipoInicial?: TipoCategoria;
  grupos: string[];
  temDados: boolean;
  /** Erro devolvido pelo composable ao tentar salvar */
  erroExterno?: string | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', dados: { nome: string; tipo: TipoCategoria; grupo?: string }): void;
  (e: 'arquivar', id: string, arquivar: boolean): void;
  (e: 'remover', id: string): void;
}>();

const ROTULO_TIPO_SINGULAR: Record<TipoCategoria, string> = {
  receita: 'Receita',
  despesa: 'Despesa',
  transferencia: 'Transferência',
};

const DESCRICAO_TIPO: Record<TipoCategoria, string> = {
  receita: 'Entra no total de ganhos do mês.',
  despesa: 'Entra no total de gastos do mês.',
  transferencia: 'Aportes e investimentos: sai do consumo, mas continua no patrimônio.',
};

const form = ref({ nome: '', tipo: 'despesa' as TipoCategoria, grupo: '' });
const erro = ref<string | null>(null);

watch(() => props.isOpen, (aberto) => {
  if (!aberto) return;
  erro.value = null;
  form.value = props.categoria
    ? { nome: props.categoria.nome, tipo: props.categoria.tipo, grupo: props.categoria.grupo ?? '' }
    : { nome: '', tipo: props.tipoInicial ?? 'despesa', grupo: '' };
});

watch(() => props.erroExterno, (e) => { erro.value = e ?? null; });

const sugestoesGrupo = computed(() => props.grupos.slice(0, 12));

function salvar() {
  emit('save', {
    nome: form.value.nome,
    tipo: form.value.tipo,
    grupo: form.value.grupo.trim() || undefined,
  });
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

.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.chip {
  background: var(--cofre-surface-2); color: var(--cofre-text-muted);
  border: 1px solid var(--cofre-border); border-radius: var(--cofre-radius-full);
  padding: 4px 12px; font-size: var(--cofre-fs-xs); font-weight: 600;
}
.chip.ativo { background: var(--cofre-accent-muted); color: var(--cofre-accent-light); border-color: var(--cofre-accent-border); }

.erro-msg { color: var(--cofre-red); font-size: var(--cofre-fs-sm); margin: 0 0 16px; }

.acoes { margin-top: 32px; display: flex; flex-direction: column; gap: 10px; }
</style>
