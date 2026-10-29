<template>
  <!-- As 16 células de valores de uma linha da visão anual: 12 meses + colunas finais. -->
  <td
    v-for="c in linha.meses"
    :key="c.mes"
    class="cel"
    :class="[estadoMes(c), { futuro: c.mes > mesRef }]"
  >
    <span class="cel-real">{{ c.realizado === null ? '—' : formatCurrencyK(c.realizado) }}</span>
    <span class="cel-orc">{{ c.orcado ? formatCurrencyK(c.orcado) : '' }}</span>
  </td>
  <td class="cel fim" :class="estadoAcum">
    <span class="cel-real">{{ formatCurrencyK(linha.realizadoAcum) }}</span>
    <span class="cel-orc">{{ formatCurrencyK(linha.orcadoAcum) }}</span>
  </td>
  <td class="cel fim"><span class="cel-real">{{ formatCurrencyK(linha.anual) }}</span></td>
  <td class="cel fim">
    <span class="cel-real">{{ linha.execucao === null ? '—' : formatPercent(linha.execucao * 100, 0) }}</span>
  </td>
  <td class="cel fim"><span class="cel-real">{{ formatCurrencyK(linha.projecao) }}</span></td>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { TipoCategoria } from '../types';
import { formatCurrencyK, formatPercent } from '../types';
import { estadoDesvio, type LinhaAnual, type CelulaMes } from '../domain/orcamento';

const props = defineProps<{
  linha: LinhaAnual;
  tipo: TipoCategoria;
  mesRef: number;
  tolerancia: number;
}>();

/**
 * Sem orçamento no ano não há meta, logo não há desvio: a linha fica sem cor.
 * Sem isso, o histórico migrado para "Outros" apareceria todo vermelho.
 */
const semOrcamento = computed(() => props.linha.anual <= 0);

/** Só colore meses até a referência e com algo lançado: mês vazio não é desvio ainda. */
function estadoMes(c: CelulaMes): string {
  if (semOrcamento.value || c.mes > props.mesRef || c.realizado === null) return '';
  return `est-${estadoDesvio(props.tipo, c.realizado, c.orcado, props.tolerancia)}`;
}

const estadoAcum = computed(() =>
  props.mesRef === 0 || semOrcamento.value
    ? ''
    : `est-${estadoDesvio(props.tipo, props.linha.realizadoAcum, props.linha.orcadoAcum, props.tolerancia)}`
);
</script>

<style scoped>
.cel { min-width: 64px; vertical-align: top; }
.cel.fim { background: var(--cofre-overlay); }
.cel.futuro { opacity: 0.55; }
.cel-real { display: block; color: inherit; font-weight: inherit; }
.cel-orc { display: block; color: var(--cofre-text-subtle); font-weight: 400; margin-top: 1px; }

.est-bom { background: var(--cofre-green-muted); }
.est-ruim { background: var(--cofre-red-muted); }
.est-atencao { background: var(--cofre-gold-muted); }
</style>
