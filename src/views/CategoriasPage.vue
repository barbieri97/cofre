<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/configuracoes" text="" />
        </ion-buttons>
        <ion-title>Categorias</ion-title>
        <ion-buttons slot="end">
          <ion-button id="btn-add-categoria" fill="clear" color="primary" @click="abrirModal(null)">
            <ion-icon :icon="addOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <EstadoVazio
        v-if="!categorias.length"
        :icone="pricetagsOutline"
        titulo="Nenhuma categoria"
        texto="Crie categorias de receita, despesa e transferência para lançar cada mês por categoria e montar seu orçamento."
      >
        <ion-button id="btn-add-primeira-categoria" color="primary" @click="abrirModal(null)">
          <ion-icon :icon="addOutline" slot="start" />
          Criar categoria
        </ion-button>
      </EstadoVazio>

      <div v-else class="page-content">
        <p class="dica">Toque para editar, agrupar ou arquivar. Arraste ☰ para reordenar.</p>

        <div v-for="tipo in TIPOS_CATEGORIA" :key="tipo" class="secao">
          <div class="secao-header">
            <p class="secao-titulo" :class="`tipo-${tipo}`">{{ ROTULO_TIPO[tipo] }}</p>
            <ion-button
              :id="`btn-add-categoria-${tipo}`"
              fill="clear"
              size="small"
              color="primary"
              @click="abrirModal(null, tipo)"
            >
              <ion-icon :icon="addOutline" slot="icon-only" />
            </ion-button>
          </div>

          <p v-if="!ativasPorTipo[tipo].length" class="vazio-tipo">Nenhuma categoria ativa.</p>
          <ion-list v-else class="lista">
            <ion-reorder-group :disabled="false" @ion-item-reorder="(e: any) => aoReordenar(tipo, e)">
              <ion-item
                v-for="c in ativasPorTipo[tipo]"
                :key="c.id"
                lines="none"
                class="cat-item"
                button
                :detail="false"
                @click="abrirModal(c)"
              >
                <ion-label>
                  <span class="cat-nome">{{ c.nome }}</span>
                  <span v-if="c.grupo" class="cat-grupo">{{ c.grupo }}</span>
                </ion-label>
                <ion-reorder slot="end" />
              </ion-item>
            </ion-reorder-group>
          </ion-list>
        </div>

        <div v-if="arquivadas.length" class="secao">
          <button id="btn-toggle-arquivadas" type="button" class="toggle-arquivadas" @click="mostrarArquivadas = !mostrarArquivadas">
            <span class="secao-titulo">Arquivadas ({{ arquivadas.length }})</span>
            <ion-icon :icon="mostrarArquivadas ? chevronUpOutline : chevronDownOutline" />
          </button>
          <ion-list v-if="mostrarArquivadas" class="lista">
            <ion-item
              v-for="c in arquivadas"
              :key="c.id"
              lines="none"
              class="cat-item arquivada"
              button
              :detail="false"
              @click="abrirModal(c)"
            >
              <ion-label>
                <span class="cat-nome">{{ c.nome }}</span>
                <span class="cat-grupo">{{ ROTULO_TIPO[c.tipo] }}{{ c.grupo ? ` · ${c.grupo}` : '' }}</span>
              </ion-label>
            </ion-item>
          </ion-list>
        </div>
      </div>
    </ion-content>

    <CategoriaModal
      :is-open="modalAberto"
      :categoria="editando"
      :tipo-inicial="tipoNovo"
      :grupos="grupos"
      :tem-dados="editando ? temDados(editando.id) : false"
      :erro-externo="erroModal"
      @close="modalAberto = false"
      @save="salvar"
      @arquivar="arquivar"
      @remover="remover"
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
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonBackButton, IonIcon, IonList, IonItem, IonLabel, IonReorderGroup, IonReorder, IonToast,
} from '@ionic/vue';
import {
  addOutline, pricetagsOutline, chevronDownOutline, chevronUpOutline,
} from 'ionicons/icons';
import { usePatrimonio } from '../composables/usePatrimonio';
import { TIPOS_CATEGORIA, ROTULO_TIPO, gruposExistentes } from '../domain/categorias';
import type { Categoria, TipoCategoria } from '../types';
import CategoriaModal from '../components/CategoriaModal.vue';
import EstadoVazio from '../components/EstadoVazio.vue';

const {
  categorias, addCategoria, updateCategoria, removerCategoria, reordenarCategorias, temDados,
} = usePatrimonio();

const ativasPorTipo = computed(() => {
  const r = { receita: [], despesa: [], transferencia: [] } as Record<TipoCategoria, Categoria[]>;
  for (const c of categorias.value) if (c.ativa) r[c.tipo].push(c);
  return r;
});
const arquivadas = computed(() => categorias.value.filter(c => !c.ativa));
const grupos = computed(() => gruposExistentes(categorias.value));

const mostrarArquivadas = ref(false);
const modalAberto = ref(false);
const editando = ref<Categoria | null>(null);
const tipoNovo = ref<TipoCategoria>('despesa');
const erroModal = ref<string | null>(null);
const toastAberto = ref(false);
const toastMsg = ref('');

function abrirModal(c: Categoria | null, tipo: TipoCategoria = 'despesa') {
  editando.value = c;
  tipoNovo.value = tipo;
  erroModal.value = null;
  modalAberto.value = true;
}

function salvar(dados: { nome: string; tipo: TipoCategoria; grupo?: string }) {
  const erro = editando.value
    ? updateCategoria(editando.value.id, { ...dados, grupo: dados.grupo ?? '' })
    : addCategoria(dados);
  if (erro) {
    erroModal.value = erro;
    return;
  }
  modalAberto.value = false;
  mostrarToast(editando.value ? 'Categoria atualizada' : 'Categoria criada');
}

function arquivar(id: string, arquivarCategoria: boolean) {
  updateCategoria(id, { ativa: !arquivarCategoria });
  modalAberto.value = false;
  mostrarToast(arquivarCategoria ? 'Categoria arquivada' : 'Categoria reativada');
}

function remover(id: string) {
  if (removerCategoria(id)) {
    modalAberto.value = false;
    mostrarToast('Categoria excluída');
  }
}

/** A reordenação vale dentro do tipo; os outros tipos mantêm a posição. */
function aoReordenar(tipo: TipoCategoria, e: CustomEvent) {
  const lista = e.detail.complete([...ativasPorTipo.value[tipo]]) as Categoria[];
  const outras = categorias.value.filter(c => c.tipo !== tipo || !c.ativa).map(c => c.id);
  reordenarCategorias([...lista.map(c => c.id), ...outras]);
}

function mostrarToast(msg: string) {
  toastMsg.value = msg;
  toastAberto.value = true;
}
</script>

<style scoped>
.page-content { padding: 16px; padding-bottom: 48px; }
.dica { font-size: var(--cofre-fs-xs); color: var(--cofre-text-subtle); margin: 0 0 20px; }

.secao { margin-bottom: 24px; }
.secao-header { display: flex; align-items: center; justify-content: space-between; }
.secao-header .secao-titulo { margin: 0; }
.secao-titulo.tipo-receita { color: var(--cofre-green); }
.secao-titulo.tipo-despesa { color: var(--cofre-red); }
.secao-titulo.tipo-transferencia { color: var(--cofre-gold); }

.vazio-tipo { font-size: var(--cofre-fs-sm); color: var(--cofre-text-faint); margin: 4px 0 0; }

.lista { background: transparent; padding: 0; margin-top: 8px; }
.cat-item {
  --background: var(--cofre-surface);
  --padding-start: 14px;
  --inner-padding-end: 8px;
  border: 1px solid var(--cofre-border);
  border-radius: var(--cofre-radius-md);
  margin-bottom: 6px;
}
.cat-item.arquivada { opacity: 0.6; }
.cat-nome { display: block; font-size: var(--cofre-fs-md); font-weight: 600; color: var(--cofre-text); }
.cat-grupo { display: block; font-size: var(--cofre-fs-xs); color: var(--cofre-text-subtle); margin-top: 2px; }

.toggle-arquivadas {
  display: flex; align-items: center; justify-content: space-between; width: 100%;
  background: transparent; border: 0; padding: 0; color: var(--cofre-text-muted);
}
.toggle-arquivadas .secao-titulo { margin: 0; }
</style>
