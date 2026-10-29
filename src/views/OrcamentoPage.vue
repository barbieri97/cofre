<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Orçamento</ion-title>
        <ion-buttons slot="end">
          <ion-button
            id="btn-abrir-lancamento"
            fill="clear"
            color="primary"
            :router-link="`/tabs/orcamento/lancamento/${anoAtual}/${mesAtual}`"
          >
            <ion-icon :icon="createOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <div class="seletor-ano">
        <ion-button id="btn-ano-anterior" fill="clear" color="medium" @click="ano--">
          <ion-icon :icon="chevronBackOutline" slot="icon-only" />
        </ion-button>
        <span class="sa-ano">{{ ano }}</span>
        <ion-button id="btn-ano-seguinte" fill="clear" color="medium" @click="ano++">
          <ion-icon :icon="chevronForwardOutline" slot="icon-only" />
        </ion-button>
      </div>
    </ion-header>

    <ion-content>
      <EstadoVazio
        v-if="!categorias.length"
        :icone="pieChartOutline"
        titulo="Nenhuma categoria ainda"
        texto="O orçamento é montado por categoria. Crie as suas para planejar o ano e acompanhar orçado × realizado."
      >
        <ion-button router-link="/tabs/configuracoes/categorias" color="primary">
          Criar categorias
        </ion-button>
      </EstadoVazio>

      <div v-else class="page-content">
        <ion-segment v-model="aba" class="orc-segment">
          <ion-segment-button value="visao">
            <ion-label>Visão anual</ion-label>
          </ion-segment-button>
          <ion-segment-button value="planejamento">
            <ion-label>Planejamento</ion-label>
          </ion-segment-button>
        </ion-segment>

        <!-- ═══ VISÃO ANUAL ═══════════════════════════════════ -->
        <template v-if="aba === 'visao'">
          <p class="contexto">
            {{ visao.mesRef === 0
              ? 'Ano futuro: ainda não há realizado para comparar.'
              : `Acumulado até ${MESES_PT[visao.mesRef - 1].toLowerCase()} — a comparação é contra o orçado acumulado.` }}
          </p>

          <div class="cards">
            <div class="card">
              <p class="cd-label">Resultado do ano</p>
              <p class="cd-valor" :class="sinal(visao.resumo.resultadoRealizadoAcum)">
                {{ formatCurrency(visao.resumo.resultadoRealizadoAcum) }}
              </p>
              <p class="cd-sub">Orçado até aqui {{ formatCurrency(visao.resumo.resultadoOrcadoAcum) }}</p>
            </div>
            <div class="card">
              <p class="cd-label">Taxa de poupança</p>
              <p class="cd-valor">{{ pct(visao.resumo.taxaPoupancaRealizada) }}</p>
              <p class="cd-sub">Orçada {{ pct(visao.resumo.taxaPoupancaOrcada) }}</p>
            </div>
            <div class="card largo">
              <p class="cd-label">Projeção de dezembro</p>
              <p class="cd-valor" :class="sinal(visao.resumo.resultadoProjetado)">
                {{ formatCurrency(visao.resumo.resultadoProjetado) }}
              </p>
              <p class="cd-sub">
                Orçado no ano {{ formatCurrency(visao.resumo.resultadoOrcadoAnual) }}
                · poupança projetada {{ pct(visao.resumo.taxaPoupancaProjetada) }}
              </p>
            </div>
          </div>

          <div v-if="!visao.secoes.length" class="sem-dados">
            Nenhum dado neste ano.
          </div>

          <div v-else class="matriz-wrap">
            <table class="matriz">
              <thead>
                <tr>
                  <th class="col-cat">Categoria</th>
                  <th
                    v-for="(abrev, i) in MESES_ABREV"
                    :id="`th-mes-${i + 1}`"
                    :key="i"
                    class="col-mes clicavel"
                    :class="{ referencia: i + 1 === visao.mesRef }"
                    @click="abrirLancamento(i + 1)"
                  >{{ abrev }}</th>
                  <th class="col-fim">Acum.</th>
                  <th class="col-fim">Anual</th>
                  <th class="col-fim">% exec.</th>
                  <th class="col-fim">Projeção</th>
                </tr>
              </thead>
              <tbody v-for="secao in visao.secoes" :key="secao.tipo">
                <tr class="linha-tipo">
                  <td class="col-cat" :class="`tipo-${secao.tipo}`">{{ secao.rotulo }}</td>
                  <td :colspan="16" />
                </tr>
                <template v-for="grupo in secao.grupos" :key="grupo.nome">
                  <tr v-if="mostrarGrupo(secao)" class="linha-grupo">
                    <td class="col-cat">{{ grupo.nome }}</td>
                    <td :colspan="16" />
                  </tr>
                  <tr v-for="linha in grupo.linhas" :key="linha.categoria.id" :class="{ arquivada: !linha.categoria.ativa }">
                    <td class="col-cat">{{ linha.categoria.nome }}</td>
                    <MatrizCelulas :linha="linha" :tipo="secao.tipo" :mes-ref="visao.mesRef" :tolerancia="tolerancia" />
                  </tr>
                  <tr v-if="mostrarGrupo(secao)" class="linha-subtotal">
                    <td class="col-cat">Subtotal {{ grupo.nome }}</td>
                    <MatrizCelulas :linha="grupo.subtotal" :tipo="secao.tipo" :mes-ref="visao.mesRef" :tolerancia="tolerancia" />
                  </tr>
                </template>
                <tr class="linha-total">
                  <td class="col-cat">Total {{ secao.rotulo.toLowerCase() }}</td>
                  <MatrizCelulas :linha="secao.total" :tipo="secao.tipo" :mes-ref="visao.mesRef" :tolerancia="tolerancia" />
                </tr>
              </tbody>
            </table>
          </div>

          <div class="legenda">
            <span><i class="lg est-bom" /> melhor que o orçado</span>
            <span><i class="lg est-ruim" /> pior que o orçado</span>
            <span><i class="lg est-atencao" /> aporte abaixo da meta</span>
            <span>Tolerância ±{{ tolerancia }}% · toque no mês para lançar</span>
          </div>
        </template>

        <!-- ═══ PLANEJAMENTO ══════════════════════════════════ -->
        <template v-else>
          <div class="plano-totais">
            <div v-for="t in TIPOS_CATEGORIA" :key="t" class="pt-item">
              <p class="pt-label">{{ ROTULO_TIPO[t] }}</p>
              <p class="pt-valor" :class="`tipo-${t}`">{{ formatCurrency(visao.totais[t].anual) }}</p>
            </div>
            <div class="pt-item">
              <p class="pt-label">Resultado</p>
              <p class="pt-valor" :class="sinal(visao.resumo.resultadoOrcadoAnual)">
                {{ formatCurrency(visao.resumo.resultadoOrcadoAnual) }}
              </p>
            </div>
          </div>

          <ion-button
            id="btn-copiar-orcamento"
            expand="block"
            fill="outline"
            color="primary"
            :disabled="!orcamentosAnoAnterior"
            @click="alertCopiaAberto = true"
          >
            <ion-icon :icon="copyOutline" slot="start" />
            Copiar de {{ ano - 1 }}{{ orcamentosAnoAnterior ? ` (${orcamentosAnoAnterior})` : ' — sem orçamento' }}
          </ion-button>

          <div v-for="secao in secoesPlano" :key="secao.tipo" class="secao">
            <p class="secao-titulo" :class="`tipo-${secao.tipo}`">{{ secao.rotulo }}</p>
            <template v-for="grupo in secao.grupos" :key="grupo.nome">
              <p v-if="secao.grupos.length > 1 || grupo.nome !== SEM_GRUPO" class="grupo-nome">{{ grupo.nome }}</p>
              <button
                v-for="c in grupo.categorias"
                :id="`btn-plano-${c.id}`"
                :key="c.id"
                type="button"
                class="plano-item"
                @click="abrirOrcamento(c)"
              >
                <div class="pi-topo">
                  <span class="pi-nome">{{ c.nome }}</span>
                  <span class="pi-valor">
                    {{ orcamentoDaCategoria(c.id) ? formatCurrency(orcamentoDaCategoria(c.id)!.valorAnual) : 'Sem orçamento' }}
                  </span>
                </div>
                <template v-if="orcamentoDaCategoria(c.id)">
                  <span class="pi-regra">{{ rotuloRegra(orcamentoDaCategoria(c.id)!) }}</span>
                  <div class="pi-barras">
                    <div
                      v-for="(v, i) in orcamentoDaCategoria(c.id)!.meses"
                      :key="i"
                      class="pi-barra"
                      :class="`tipo-${c.tipo}`"
                      :style="{ height: alturaBarra(v, orcamentoDaCategoria(c.id)!.meses) }"
                      :title="`${MESES_ABREV[i]}: ${formatCurrency(v)}`"
                    />
                  </div>
                </template>
              </button>
            </template>
          </div>
        </template>
      </div>
    </ion-content>

    <OrcamentoModal
      :is-open="modalAberto"
      :categoria="categoriaEditando"
      :ano="ano"
      :orcamento="categoriaEditando ? orcamentoDaCategoria(categoriaEditando.id) : null"
      @close="modalAberto = false"
      @save="salvar"
      @remover="remover"
    />

    <ion-alert
      :is-open="alertCopiaAberto"
      :header="`Copiar orçamento de ${ano - 1}`"
      :message="mensagemCopia"
      :inputs="[{ name: 'ajuste', type: 'number', placeholder: 'Ajuste % (ex.: 5 ou -10)' }]"
      :buttons="botoesCopia"
      @did-dismiss="alertCopiaAberto = false"
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
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonSegment, IonSegmentButton, IonLabel, IonAlert, IonToast,
} from '@ionic/vue';
import {
  chevronBackOutline, chevronForwardOutline, createOutline, copyOutline, pieChartOutline,
} from 'ionicons/icons';
import { usePatrimonio } from '../composables/usePatrimonio';
import {
  TIPOS_CATEGORIA, ROTULO_TIPO, SEM_GRUPO, agruparCategorias,
} from '../domain/categorias';
import { orcamentoDe, type DadosOrcamento, type SecaoVisao } from '../domain/orcamento';
import type { Categoria, Orcamento } from '../types';
import { MESES_PT, MESES_ABREV, formatCurrency, formatPercent } from '../types';
import EstadoVazio from '../components/EstadoVazio.vue';
import OrcamentoModal from '../components/OrcamentoModal.vue';
import MatrizCelulas from '../components/MatrizCelulas.vue';

const router = useRouter();
const {
  categorias, orcamentos, config,
  salvarOrcamento, removerOrcamento, copiarOrcamentosDoAno, visaoAnualDe,
} = usePatrimonio();

const hoje = new Date();
const anoAtual = hoje.getFullYear();
const mesAtual = hoje.getMonth() + 1;

const ano = ref(anoAtual);
const aba = ref<'visao' | 'planejamento'>('visao');

const visao = computed(() => visaoAnualDe(ano.value));
const tolerancia = computed(() => config.value.toleranciaDesvio);

function sinal(v: number) {
  return v >= 0 ? 'verde' : 'vermelho';
}

function pct(v: number | null) {
  return v === null ? '—' : formatPercent(v * 100);
}

/** Linhas de grupo e subtotal só aparecem quando há grupos de fato */
function mostrarGrupo(secao: SecaoVisao) {
  return secao.grupos.length > 1 || secao.grupos[0]?.nome !== SEM_GRUPO;
}

function abrirLancamento(mes: number) {
  router.push(`/tabs/orcamento/lancamento/${ano.value}/${mes}`);
}

// ── Planejamento ─────────────────────────────────────────────

const secoesPlano = computed(() => agruparCategorias(categorias.value.filter(c => c.ativa)));

function orcamentoDaCategoria(id: string): Orcamento | undefined {
  return orcamentoDe(orcamentos.value, id, ano.value);
}

function rotuloRegra(o: Orcamento): string {
  if (o.distribuicao === 'uniforme') return 'Uniforme · 12 meses';
  if (o.distribuicao === 'manual') return 'Manual';
  const meses = o.mesesEscolhidos ?? [];
  return `${meses.length} ${meses.length === 1 ? 'mês' : 'meses'} · ${meses.map(m => MESES_ABREV[m - 1]).join(', ')}`;
}

function alturaBarra(v: number, meses: number[]): string {
  const max = Math.max(...meses);
  return max > 0 ? `${Math.max(6, (v / max) * 100)}%` : '6%';
}

const modalAberto = ref(false);
const categoriaEditando = ref<Categoria | null>(null);

function abrirOrcamento(c: Categoria) {
  categoriaEditando.value = c;
  modalAberto.value = true;
}

function salvar(dados: DadosOrcamento) {
  salvarOrcamento(dados);
  modalAberto.value = false;
  mostrarToast('Orçamento salvo');
}

function remover() {
  if (categoriaEditando.value) removerOrcamento(categoriaEditando.value.id, ano.value);
  modalAberto.value = false;
  mostrarToast('Orçamento removido');
}

// ── Cópia do ano anterior ───────────────────────────────────

const alertCopiaAberto = ref(false);
const orcamentosAnoAnterior = computed(() => orcamentos.value.filter(o => o.ano === ano.value - 1).length);
const orcamentosDoAno = computed(() => orcamentos.value.filter(o => o.ano === ano.value).length);

const mensagemCopia = computed(() =>
  orcamentosDoAno.value
    ? `${ano.value} já tem ${orcamentosDoAno.value} orçamento(s). "Copiar" mantém os existentes; "Substituir" sobrescreve.`
    : 'Mantém a regra de distribuição de cada categoria. Categorias arquivadas não são copiadas.'
);

function copiar(dados: { ajuste?: string } | undefined, sobrescrever: boolean) {
  const ajuste = parseFloat(dados?.ajuste ?? '') || 0;
  const n = copiarOrcamentosDoAno(ano.value - 1, ano.value, ajuste, sobrescrever);
  mostrarToast(n ? `${n} orçamento(s) copiado(s)` : 'Nada a copiar');
}

const botoesCopia = computed(() => [
  { text: 'Cancelar', role: 'cancel' },
  ...(orcamentosDoAno.value
    ? [{ text: 'Substituir', handler: (d: { ajuste?: string }) => copiar(d, true) }]
    : []),
  { text: 'Copiar', handler: (d: { ajuste?: string }) => copiar(d, false) },
]);

// ── Toast ────────────────────────────────────────────────────

const toastAberto = ref(false);
const toastMsg = ref('');

function mostrarToast(msg: string) {
  toastMsg.value = msg;
  toastAberto.value = true;
}
</script>

<style scoped>
.page-content { padding: 16px; padding-bottom: 48px; }

.seletor-ano {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  background: var(--cofre-surface); border-bottom: 1px solid var(--cofre-border); padding: 2px 0 6px;
}
.sa-ano { font-size: var(--cofre-fs-lg); font-weight: 800; color: var(--cofre-text); min-width: 64px; text-align: center; }

.orc-segment { margin-bottom: 16px; }
.contexto { font-size: var(--cofre-fs-xs); color: var(--cofre-text-subtle); margin: 0 0 12px; }

/* Cards de resumo */
.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
.card {
  background: var(--cofre-surface); border: 1px solid var(--cofre-border);
  border-radius: var(--cofre-radius-lg); padding: 12px 14px;
}
.card.largo { grid-column: 1 / -1; }
.cd-label { font-size: var(--cofre-fs-2xs); color: var(--cofre-text-subtle); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px; }
.cd-valor { font-size: var(--cofre-fs-lg); font-weight: 800; color: var(--cofre-text); margin: 0 0 2px; }
.cd-sub { font-size: var(--cofre-fs-2xs); color: var(--cofre-text-muted); margin: 0; }

.verde { color: var(--cofre-green); }
.vermelho { color: var(--cofre-red); }

.sem-dados { text-align: center; color: var(--cofre-text-subtle); font-size: var(--cofre-fs-sm); padding: 32px 0; }

/* Matriz */
.matriz-wrap {
  overflow-x: auto; border: 1px solid var(--cofre-border); border-radius: var(--cofre-radius-md);
  background: var(--cofre-surface);
}
.matriz { border-collapse: separate; border-spacing: 0; font-size: var(--cofre-fs-2xs); white-space: nowrap; }
.matriz th, .matriz :deep(td) { padding: 6px 8px; border-bottom: 1px solid var(--cofre-border); text-align: right; }
.matriz th { color: var(--cofre-text-muted); font-weight: 700; background: var(--cofre-surface-2); position: sticky; top: 0; }
.matriz .col-cat {
  position: sticky; left: 0; z-index: 1; text-align: left; background: var(--cofre-surface);
  min-width: 120px; max-width: 150px; overflow: hidden; text-overflow: ellipsis;
  color: var(--cofre-text); font-weight: 600; border-right: 1px solid var(--cofre-border);
}
.matriz th.col-cat { background: var(--cofre-surface-2); z-index: 2; }
.matriz th.clicavel { cursor: pointer; color: var(--cofre-accent-light); }
.matriz th.referencia { box-shadow: inset 0 -2px 0 var(--cofre-accent); }
.linha-tipo td { background: var(--cofre-surface-2); font-size: var(--cofre-fs-xs); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
.linha-tipo .col-cat { background: var(--cofre-surface-2); }
.linha-grupo .col-cat { color: var(--cofre-text-soft); font-weight: 700; }
.linha-subtotal td, .linha-subtotal .col-cat { font-weight: 700; color: var(--cofre-text-soft); background: var(--cofre-overlay); }
.linha-total td, .linha-total .col-cat { font-weight: 800; color: var(--cofre-text); border-bottom: 1px solid var(--cofre-border-strong); }
tr.arquivada .col-cat { color: var(--cofre-text-subtle); font-style: italic; }

.tipo-receita, .matriz .col-cat.tipo-receita { color: var(--cofre-green); }
.tipo-despesa, .matriz .col-cat.tipo-despesa { color: var(--cofre-red); }
.tipo-transferencia, .matriz .col-cat.tipo-transferencia { color: var(--cofre-gold); }

.legenda {
  display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 10px;
  font-size: var(--cofre-fs-2xs); color: var(--cofre-text-subtle);
}
.legenda span { display: inline-flex; align-items: center; gap: 4px; }
.lg { width: 10px; height: 10px; border-radius: var(--cofre-radius-xs); display: inline-block; }
.est-bom { background: var(--cofre-green-border); }
.est-ruim { background: var(--cofre-red-border); }
.est-atencao { background: var(--cofre-gold-border); }

/* Planejamento */
.plano-totais { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.pt-item {
  background: var(--cofre-surface); border: 1px solid var(--cofre-border);
  border-radius: var(--cofre-radius-md); padding: 10px 12px;
}
.pt-label { font-size: var(--cofre-fs-2xs); color: var(--cofre-text-subtle); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 2px; }
.pt-valor { font-size: var(--cofre-fs-md); font-weight: 700; margin: 0; }

.secao { margin-top: 24px; }
.grupo-nome { font-size: var(--cofre-fs-xs); font-weight: 600; color: var(--cofre-text-soft); margin: 12px 0 6px; }

.plano-item {
  display: block; width: 100%; text-align: left;
  background: var(--cofre-surface); border: 1px solid var(--cofre-border);
  border-radius: var(--cofre-radius-md); padding: 10px 14px; margin-bottom: 6px; color: var(--cofre-text);
}
.pi-topo { display: flex; justify-content: space-between; gap: 8px; }
.pi-nome { font-size: var(--cofre-fs-md); font-weight: 600; }
.pi-valor { font-size: var(--cofre-fs-md); font-weight: 700; }
.pi-regra { display: block; font-size: var(--cofre-fs-2xs); color: var(--cofre-text-subtle); margin-top: 2px; }
.pi-barras { display: flex; align-items: flex-end; gap: 3px; height: 28px; margin-top: 8px; }
.pi-barra { flex: 1; border-radius: 2px 2px 0 0; opacity: 0.7; }
.pi-barra.tipo-receita { background: var(--cofre-green); }
.pi-barra.tipo-despesa { background: var(--cofre-red); }
.pi-barra.tipo-transferencia { background: var(--cofre-gold); }
</style>
