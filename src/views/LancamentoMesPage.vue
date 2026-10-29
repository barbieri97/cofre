<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/orcamento" text="" />
        </ion-buttons>
        <ion-title>Lançamento do mês</ion-title>
        <ion-buttons slot="end">
          <ion-button
            id="btn-salvar-lancamento"
            :strong="true"
            color="primary"
            :disabled="!categoriasMes.length"
            @click="salvar"
          >Salvar</ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Seletor de mês -->
      <div class="seletor-mes">
        <ion-button id="btn-mes-anterior" fill="clear" color="medium" @click="navegar(-1)">
          <ion-icon :icon="chevronBackOutline" slot="icon-only" />
        </ion-button>
        <div class="sm-selects">
          <ion-select
            id="select-lancamento-mes"
            :value="mes"
            interface="action-sheet"
            :interface-options="{ header: 'Mês' }"
            @ion-change="(e: any) => irPara(ano, e.detail.value)"
          >
            <ion-select-option v-for="(nome, i) in MESES_PT" :key="i" :value="i + 1">{{ nome }}</ion-select-option>
          </ion-select>
          <ion-select
            id="select-lancamento-ano"
            :value="ano"
            interface="action-sheet"
            :interface-options="{ header: 'Ano' }"
            @ion-change="(e: any) => irPara(e.detail.value, mes)"
          >
            <ion-select-option v-for="a in anosDisponiveis" :key="a" :value="a">{{ a }}</ion-select-option>
          </ion-select>
        </div>
        <ion-button id="btn-mes-seguinte" fill="clear" color="medium" @click="navegar(1)">
          <ion-icon :icon="chevronForwardOutline" slot="icon-only" />
        </ion-button>
      </div>
    </ion-header>

    <ion-content>
      <EstadoVazio
        v-if="!categoriasMes.length"
        :icone="pricetagsOutline"
        titulo="Nenhuma categoria ativa"
        texto="Crie suas categorias para lançar o mês por categoria."
      >
        <ion-button router-link="/tabs/configuracoes/categorias" color="primary">
          Criar categorias
        </ion-button>
      </EstadoVazio>

      <div v-else class="page-content">
        <div v-if="registroManual" class="aviso-manual">
          <p class="am-titulo">Este mês tem um total digitado à mão</p>
          <p class="am-texto">
            Ganhos {{ formatCurrency(registroManual.ganhos) }} · gastos {{ formatCurrency(registroManual.gastos) }}.
            Ao salvar, o total do mês passa a ser a soma das categorias.
          </p>
        </div>

        <!-- Totais ao vivo -->
        <div class="totais">
          <div class="tt-item">
            <p class="tt-label">Receitas</p>
            <p class="tt-valor verde">{{ formatCurrency(totais.receita) }}</p>
          </div>
          <div class="tt-item">
            <p class="tt-label">Despesas</p>
            <p class="tt-valor vermelho">{{ formatCurrency(totais.despesa) }}</p>
          </div>
          <div class="tt-item">
            <p class="tt-label">Transferências</p>
            <p class="tt-valor ouro">{{ formatCurrency(totais.transferencia) }}</p>
          </div>
          <div class="tt-item">
            <p class="tt-label">Resultado</p>
            <p class="tt-valor" :class="resultado >= 0 ? 'verde' : 'vermelho'">{{ formatCurrency(resultado) }}</p>
          </div>
        </div>

        <p class="dica">Campo vazio = sem lançamento. Zero = zero lançado.</p>

        <div v-for="secao in secoes" :key="secao.tipo" class="secao">
          <p class="secao-titulo" :class="`tipo-${secao.tipo}`">{{ secao.rotulo }}</p>
          <div v-for="grupo in secao.grupos" :key="grupo.nome" class="grupo">
            <p v-if="secao.grupos.length > 1 || grupo.nome !== SEM_GRUPO" class="grupo-nome">{{ grupo.nome }}</p>
            <div v-for="c in grupo.categorias" :key="c.id" class="linha" :class="{ arquivada: !c.ativa }">
              <div class="ln-info">
                <span class="ln-nome">{{ c.nome }}</span>
                <span class="ln-orcado">
                  {{ orcadoDoMes(c.id) !== null ? `Orçado ${formatCurrency(orcadoDoMes(c.id)!)}` : 'Sem orçamento' }}
                </span>
              </div>
              <ion-input
                :id="`input-lancamento-${c.id}`"
                class="ln-input"
                :value="valores[c.id] ?? ''"
                type="number"
                inputmode="decimal"
                placeholder="—"
                min="0"
                @ion-input="(e: any) => { valores[c.id] = e.detail.value ?? ''; }"
              />
            </div>
          </div>
        </div>
      </div>
    </ion-content>

    <ion-toast
      :is-open="toastAberto"
      message="Mês salvo"
      :duration="1800"
      position="bottom"
      color="success"
      @did-dismiss="toastAberto = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonBackButton, IonIcon, IonInput, IonSelect, IonSelectOption, IonToast,
} from '@ionic/vue';
import { chevronBackOutline, chevronForwardOutline, pricetagsOutline } from 'ionicons/icons';
import { usePatrimonio } from '../composables/usePatrimonio';
import { agruparCategorias, SEM_GRUPO } from '../domain/categorias';
import { orcamentoDe } from '../domain/orcamento';
import { arredondar, type TotaisPorTipo } from '../domain/lancamentos';
import { MESES_PT, formatCurrency, adicionarMeses } from '../types';
import EstadoVazio from '../components/EstadoVazio.vue';

const route = useRoute();
const router = useRouter();
const {
  registros, orcamentos, lancamentosDoMes, categoriasParaLancamento, salvarLancamentosMes,
} = usePatrimonio();

const hoje = new Date();

function paramNumero(nome: string, padrao: number, min: number, max: number): number {
  const v = Number(route.params[nome]);
  return Number.isInteger(v) && v >= min && v <= max ? v : padrao;
}

const ano = computed(() => paramNumero('ano', hoje.getFullYear(), 1900, 2999));
const mes = computed(() => paramNumero('mes', hoje.getMonth() + 1, 1, 12));

const anosDisponiveis = computed(() => {
  const base = hoje.getFullYear();
  const anos = new Set(Array.from({ length: 10 }, (_, i) => base - 7 + i));
  anos.add(ano.value);
  return [...anos].sort((a, b) => a - b);
});

const categoriasMes = computed(() => categoriasParaLancamento(ano.value, mes.value));
const secoes = computed(() => agruparCategorias(categoriasMes.value));

/** Valores digitados, como texto: '' = sem lançamento */
const valores = ref<Record<string, string>>({});
const observacoes = ref<Record<string, string | undefined>>({});

function carregar() {
  const v: Record<string, string> = {};
  const o: Record<string, string | undefined> = {};
  for (const l of lancamentosDoMes(ano.value, mes.value)) {
    v[l.categoriaId] = String(l.valor);
    o[l.categoriaId] = l.observacao;
  }
  valores.value = v;
  observacoes.value = o;
}

watch([ano, mes], carregar, { immediate: true });

function numero(texto: string | undefined): number | null {
  if (texto === undefined || texto.trim() === '') return null;
  const v = parseFloat(texto.replace(',', '.'));
  return Number.isFinite(v) ? Math.max(0, v) : null;
}

const totais = computed<TotaisPorTipo>(() => {
  const t: TotaisPorTipo = { receita: 0, despesa: 0, transferencia: 0 };
  for (const c of categoriasMes.value) t[c.tipo] += numero(valores.value[c.id]) ?? 0;
  return { receita: arredondar(t.receita), despesa: arredondar(t.despesa), transferencia: arredondar(t.transferencia) };
});

const resultado = computed(() =>
  arredondar(totais.value.receita - totais.value.despesa - totais.value.transferencia)
);

const registroManual = computed(() =>
  registros.value.find(r => r.ano === ano.value && r.mes === mes.value && r.origem !== 'categorias') ?? null
);

function orcadoDoMes(categoriaId: string): number | null {
  const o = orcamentoDe(orcamentos.value, categoriaId, ano.value);
  return o ? o.meses[mes.value - 1] : null;
}

const toastAberto = ref(false);

function salvar() {
  salvarLancamentosMes(ano.value, mes.value, categoriasMes.value.map(c => ({
    categoriaId: c.id,
    valor: numero(valores.value[c.id]),
    observacao: observacoes.value[c.id],
  })));
  toastAberto.value = true;
}

function irPara(novoAno: number, novoMes: number) {
  if (novoAno === ano.value && novoMes === mes.value) return;
  router.replace(`/tabs/orcamento/lancamento/${novoAno}/${novoMes}`);
}

function navegar(delta: number) {
  const d = adicionarMeses(mes.value, ano.value, delta);
  irPara(d.ano, d.mes);
}
</script>

<style scoped>
.page-content { padding: 16px; padding-bottom: 48px; }

.seletor-mes {
  display: flex; align-items: center; gap: 4px;
  background: var(--cofre-surface); padding: 4px 8px 10px;
  border-bottom: 1px solid var(--cofre-border);
}
.sm-selects { flex: 1; display: grid; grid-template-columns: 3fr 2fr; gap: 8px; }
.sm-selects ion-select { margin-top: 0; padding: 8px 12px; }

.aviso-manual {
  background: var(--cofre-gold-subtle); border: 1px solid var(--cofre-gold-border);
  border-radius: var(--cofre-radius-md); padding: 12px 14px; margin-bottom: 16px;
}
.am-titulo { font-size: var(--cofre-fs-sm); font-weight: 700; color: var(--cofre-gold-light); margin: 0 0 4px; }
.am-texto { font-size: var(--cofre-fs-xs); color: var(--cofre-text-muted); margin: 0; line-height: 1.5; }

.totais {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;
}
.tt-item {
  background: var(--cofre-surface); border: 1px solid var(--cofre-border);
  border-radius: var(--cofre-radius-md); padding: 10px 12px;
}
.tt-label { font-size: var(--cofre-fs-2xs); color: var(--cofre-text-subtle); margin: 0 0 2px; text-transform: uppercase; letter-spacing: 0.05em; }
.tt-valor { font-size: var(--cofre-fs-md); font-weight: 700; color: var(--cofre-text); margin: 0; }

.verde { color: var(--cofre-green); }
.vermelho { color: var(--cofre-red); }
.ouro { color: var(--cofre-gold); }

.dica { font-size: var(--cofre-fs-xs); color: var(--cofre-text-subtle); margin: 0 0 20px; }

.secao { margin-bottom: 24px; }
.secao-titulo.tipo-receita { color: var(--cofre-green); }
.secao-titulo.tipo-despesa { color: var(--cofre-red); }
.secao-titulo.tipo-transferencia { color: var(--cofre-gold); }

.grupo { margin-bottom: 12px; }
.grupo-nome { font-size: var(--cofre-fs-xs); font-weight: 600; color: var(--cofre-text-soft); margin: 0 0 6px; }

.linha {
  display: flex; align-items: center; gap: 12px;
  padding: 6px 0; border-bottom: 1px solid var(--cofre-border);
}
.linha.arquivada { opacity: 0.6; }
.ln-info { flex: 1; min-width: 0; }
.ln-nome { display: block; font-size: var(--cofre-fs-md); font-weight: 600; color: var(--cofre-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ln-orcado { display: block; font-size: var(--cofre-fs-2xs); color: var(--cofre-text-subtle); margin-top: 2px; }
.ln-input { width: 140px; flex: none; margin-top: 0; text-align: right; }
</style>
