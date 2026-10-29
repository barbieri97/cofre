// ============================================================
// Domínio — Orçamento anual
// Funções puras: distribuição do valor anual em meses, cópia
// entre anos e a visão anual orçado × realizado.
// ============================================================

import type {
  Categoria, LancamentoMensal, Orcamento, DistribuicaoOrcamento, TipoCategoria,
} from '../types';
import { generateId } from '../types';
import { agruparCategorias, categoriasDoAno, ROTULO_TIPO } from './categorias';

// ── Distribuição ─────────────────────────────────────────────

/**
 * As distribuições trabalham em centavos inteiros: dividir em ponto flutuante
 * faria a soma dos 12 meses escapar do valor anual por frações de centavo.
 */
function paraCentavos(valor: number): number {
  return Math.round(valor * 100);
}

function deCentavos(centavos: number): number {
  return centavos / 100;
}

/** Normaliza a lista de meses escolhidos: 1–12, sem repetição, em ordem. */
export function normalizarMeses(meses: number[] | undefined): number[] {
  return [...new Set((meses ?? []).filter(m => Number.isInteger(m) && m >= 1 && m <= 12))]
    .sort((a, b) => a - b);
}

export interface Distribuicao {
  valorAnual: number;
  meses: number[];  // 12 valores, jan → dez
}

/**
 * Distribui o valor anual nos 12 meses.
 *
 * - `uniforme`: anual / 12; o resíduo do arredondamento vai para dezembro.
 * - `meses`: anual dividido entre os meses escolhidos, demais com zero; o
 *   resíduo vai para o último mês escolhido. Sem mês escolhido, tudo zero.
 * - `manual`: os 12 valores informados; o anual passa a ser a soma deles.
 *
 * Em todas as regras a soma dos meses é exatamente o valor anual devolvido.
 */
export function distribuir(
  valorAnual: number,
  distribuicao: DistribuicaoOrcamento,
  mesesEscolhidos?: number[],
  manual?: number[]
): Distribuicao {
  if (distribuicao === 'manual') {
    const centavos = Array.from({ length: 12 }, (_, i) => Math.max(0, paraCentavos(manual?.[i] ?? 0)));
    const total = centavos.reduce((s, c) => s + c, 0);
    return { valorAnual: deCentavos(total), meses: centavos.map(deCentavos) };
  }

  const total = Math.max(0, paraCentavos(valorAnual));
  const centavos = new Array<number>(12).fill(0);
  const alvo = distribuicao === 'uniforme'
    ? Array.from({ length: 12 }, (_, i) => i + 1)
    : normalizarMeses(mesesEscolhidos);

  if (!alvo.length) return { valorAnual: 0, meses: centavos.map(deCentavos) };

  const base = Math.floor(total / alvo.length);
  for (const m of alvo) centavos[m - 1] = base;
  centavos[alvo[alvo.length - 1] - 1] += total - base * alvo.length;

  return { valorAnual: deCentavos(total), meses: centavos.map(deCentavos) };
}

export interface DadosOrcamento {
  categoriaId: string;
  ano: number;
  valorAnual: number;
  distribuicao: DistribuicaoOrcamento;
  mesesEscolhidos?: number[];
  /** 12 valores, usado quando distribuicao = 'manual' */
  mesesManuais?: number[];
}

/** Upsert por (categoriaId, ano), sempre recalculando a distribuição materializada. */
export function salvarOrcamento(
  existentes: Orcamento[],
  dados: DadosOrcamento,
  agora: string = new Date().toISOString()
): Orcamento[] {
  const { valorAnual, meses } = distribuir(
    dados.valorAnual, dados.distribuicao, dados.mesesEscolhidos, dados.mesesManuais
  );
  const idx = existentes.findIndex(o => o.categoriaId === dados.categoriaId && o.ano === dados.ano);
  const orcamento: Orcamento = {
    id: idx >= 0 ? existentes[idx].id : generateId(),
    categoriaId: dados.categoriaId,
    ano: dados.ano,
    valorAnual,
    distribuicao: dados.distribuicao,
    mesesEscolhidos: dados.distribuicao === 'meses' ? normalizarMeses(dados.mesesEscolhidos) : undefined,
    meses,
    atualizadoEm: agora,
  };
  if (idx < 0) return [...existentes, orcamento];
  const lista = [...existentes];
  lista[idx] = orcamento;
  return lista;
}

export function removerOrcamento(existentes: Orcamento[], categoriaId: string, ano: number): Orcamento[] {
  return existentes.filter(o => !(o.categoriaId === categoriaId && o.ano === ano));
}

export function orcamentoDe(
  orcamentos: Orcamento[],
  categoriaId: string,
  ano: number
): Orcamento | undefined {
  return orcamentos.find(o => o.categoriaId === categoriaId && o.ano === ano);
}

/**
 * Copia os orçamentos de um ano para outro, aplicando um ajuste percentual
 * (ex.: 5 = +5%). A regra de distribuição é mantida e recalculada sobre o
 * valor ajustado; no manual, cada mês é ajustado individualmente.
 *
 * Categorias arquivadas não são copiadas. Orçamentos já existentes no ano de
 * destino são preservados, a menos que `sobrescrever` seja true.
 */
export function copiarOrcamentos(
  existentes: Orcamento[],
  categorias: Categoria[],
  anoOrigem: number,
  anoDestino: number,
  ajustePercentual = 0,
  sobrescrever = false,
  agora: string = new Date().toISOString()
): { orcamentos: Orcamento[]; copiados: number } {
  const ativas = new Set(categorias.filter(c => c.ativa).map(c => c.id));
  const fator = 1 + ajustePercentual / 100;
  let lista = existentes;
  let copiados = 0;

  for (const o of existentes) {
    if (o.ano !== anoOrigem || !ativas.has(o.categoriaId)) continue;
    if (!sobrescrever && orcamentoDe(lista, o.categoriaId, anoDestino)) continue;
    lista = salvarOrcamento(lista, {
      categoriaId: o.categoriaId,
      ano: anoDestino,
      valorAnual: o.valorAnual * fator,
      distribuicao: o.distribuicao,
      mesesEscolhidos: o.mesesEscolhidos,
      mesesManuais: o.meses.map(v => v * fator),
    }, agora);
    copiados++;
  }
  return { orcamentos: lista, copiados };
}

// ── Visão anual ──────────────────────────────────────────────

/**
 * Mês até o qual o realizado é comparado: o mês atual se o ano for o
 * corrente, dezembro para anos passados e 0 (nenhum) para anos futuros.
 */
export function mesReferencia(ano: number, hoje: Date = new Date()): number {
  const anoAtual = hoje.getFullYear();
  if (ano < anoAtual) return 12;
  if (ano > anoAtual) return 0;
  return hoje.getMonth() + 1;
}

export interface CelulaMes {
  mes: number;
  orcado: number;
  /** null = nada lançado no mês */
  realizado: number | null;
  desvio: number;      // realizado − orçado (realizado vazio conta como 0)
}

export interface LinhaAnual {
  meses: CelulaMes[];
  orcadoAcum: number;
  realizadoAcum: number;
  /** realizado acumulado − orçado acumulado: a comparação principal */
  desvioAcum: number;
  anual: number;
  /** realizado acumulado / orçamento anual. null sem orçamento anual. */
  execucao: number | null;
  /** realizado acumulado + orçado dos meses depois da referência */
  projecao: number;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Calcula acumulados, desvio, execução e projeção de uma linha de 12 meses. */
export function linhaAnual(
  orcado: number[],
  realizado: (number | null)[],
  mesRef: number
): LinhaAnual {
  let orcadoAcum = 0;
  let realizadoAcum = 0;
  let restante = 0;
  let anual = 0;

  const meses: CelulaMes[] = Array.from({ length: 12 }, (_, i) => {
    const o = orcado[i] ?? 0;
    const r = realizado[i] ?? null;
    anual += o;
    if (i + 1 <= mesRef) {
      orcadoAcum += o;
      realizadoAcum += r ?? 0;
    } else {
      restante += o;
    }
    return { mes: i + 1, orcado: o, realizado: r, desvio: r2((r ?? 0) - o) };
  });

  orcadoAcum = r2(orcadoAcum);
  realizadoAcum = r2(realizadoAcum);
  anual = r2(anual);

  return {
    meses,
    orcadoAcum,
    realizadoAcum,
    desvioAcum: r2(realizadoAcum - orcadoAcum),
    anual,
    execucao: anual > 0 ? realizadoAcum / anual : null,
    projecao: r2(realizadoAcum + restante),
  };
}

/** Soma vetores mensais; um mês só é "vazio" se for vazio em todas as linhas. */
function somarLinhas(linhas: { orcado: number[]; realizado: (number | null)[] }[]) {
  const orcado = new Array<number>(12).fill(0);
  const realizado = new Array<number | null>(12).fill(null);
  for (const l of linhas) {
    for (let i = 0; i < 12; i++) {
      orcado[i] += l.orcado[i] ?? 0;
      const r = l.realizado[i];
      if (r !== null && r !== undefined) realizado[i] = (realizado[i] ?? 0) + r;
    }
  }
  return { orcado, realizado };
}

export interface LinhaCategoria extends LinhaAnual {
  categoria: Categoria;
  distribuicao: DistribuicaoOrcamento | null;
}

export interface GrupoVisao {
  nome: string;
  linhas: LinhaCategoria[];
  subtotal: LinhaAnual;
}

export interface SecaoVisao {
  tipo: TipoCategoria;
  rotulo: string;
  grupos: GrupoVisao[];
  total: LinhaAnual;
}

export interface ResumoAnual {
  /** receitas − despesas − transferências, até o mês de referência */
  resultadoOrcadoAcum: number;
  resultadoRealizadoAcum: number;
  resultadoOrcadoAnual: number;
  /** resultado de dezembro se o restante do ano sair como orçado */
  resultadoProjetado: number;
  /** (transferências + resultado) / receitas. null sem receita. */
  taxaPoupancaOrcada: number | null;
  taxaPoupancaRealizada: number | null;
  taxaPoupancaProjetada: number | null;
}

export interface VisaoAnual {
  ano: number;
  mesRef: number;
  secoes: SecaoVisao[];
  totais: Record<TipoCategoria, LinhaAnual>;
  resumo: ResumoAnual;
}

function taxaPoupanca(receitas: number, transferencias: number, resultado: number): number | null {
  return receitas > 0 ? (transferencias + resultado) / receitas : null;
}

/** Monta a matriz orçado × realizado do ano, com subtotais por grupo e totais por tipo. */
export function visaoAnual(
  categorias: Categoria[],
  lancamentos: LancamentoMensal[],
  orcamentos: Orcamento[],
  ano: number,
  hoje: Date = new Date()
): VisaoAnual {
  const mesRef = mesReferencia(ano, hoje);

  const realizadoPorCategoria = new Map<string, (number | null)[]>();
  for (const l of lancamentos) {
    if (l.ano !== ano || l.mes < 1 || l.mes > 12) continue;
    const vetor = realizadoPorCategoria.get(l.categoriaId) ?? new Array<number | null>(12).fill(null);
    vetor[l.mes - 1] = (vetor[l.mes - 1] ?? 0) + l.valor;
    realizadoPorCategoria.set(l.categoriaId, vetor);
  }

  const vetoresDe = (c: Categoria) => ({
    orcado: orcamentoDe(orcamentos, c.id, ano)?.meses ?? new Array<number>(12).fill(0),
    realizado: realizadoPorCategoria.get(c.id) ?? new Array<number | null>(12).fill(null),
  });

  const vazia = linhaAnual([], [], mesRef);
  const totais: Record<TipoCategoria, LinhaAnual> = {
    receita: vazia, despesa: vazia, transferencia: vazia,
  };

  const secoes: SecaoVisao[] = agruparCategorias(
    categoriasDoAno(categorias, lancamentos, orcamentos, ano)
  ).map(secao => {
    const vetoresSecao: ReturnType<typeof vetoresDe>[] = [];
    const grupos = secao.grupos.map(g => {
      const vetoresGrupo = g.categorias.map(vetoresDe);
      vetoresSecao.push(...vetoresGrupo);
      const s = somarLinhas(vetoresGrupo);
      return {
        nome: g.nome,
        linhas: g.categorias.map((c, i) => ({
          categoria: c,
          distribuicao: orcamentoDe(orcamentos, c.id, ano)?.distribuicao ?? null,
          ...linhaAnual(vetoresGrupo[i].orcado, vetoresGrupo[i].realizado, mesRef),
        })),
        subtotal: linhaAnual(s.orcado, s.realizado, mesRef),
      };
    });
    const s = somarLinhas(vetoresSecao);
    const total = linhaAnual(s.orcado, s.realizado, mesRef);
    totais[secao.tipo] = total;
    return { tipo: secao.tipo, rotulo: ROTULO_TIPO[secao.tipo], grupos, total };
  });

  const { receita, despesa, transferencia } = totais;
  const resultado = (campo: 'orcadoAcum' | 'realizadoAcum' | 'anual' | 'projecao') =>
    r2(receita[campo] - despesa[campo] - transferencia[campo]);

  const resumo: ResumoAnual = {
    resultadoOrcadoAcum: resultado('orcadoAcum'),
    resultadoRealizadoAcum: resultado('realizadoAcum'),
    resultadoOrcadoAnual: resultado('anual'),
    resultadoProjetado: resultado('projecao'),
    taxaPoupancaOrcada: taxaPoupanca(receita.anual, transferencia.anual, resultado('anual')),
    taxaPoupancaRealizada: taxaPoupanca(
      receita.realizadoAcum, transferencia.realizadoAcum, resultado('realizadoAcum')
    ),
    taxaPoupancaProjetada: taxaPoupanca(
      receita.projecao, transferencia.projecao, resultado('projecao')
    ),
  };

  return { ano, mesRef, secoes, totais, resumo };
}

// ── Cores de desvio ──────────────────────────────────────────

export type EstadoDesvio = 'bom' | 'neutro' | 'ruim' | 'atencao';

/**
 * Classifica o realizado contra o orçado de uma categoria (ou total).
 *
 * Dentro de ±tolerância (em % do orçado) é neutro. Fora dela: despesa acima é
 * ruim, receita abaixo é ruim e transferência abaixo da meta pede atenção; o
 * lado oposto é bom. Sem orçado, qualquer despesa é ruim e qualquer receita
 * ou transferência é boa.
 */
export function estadoDesvio(
  tipo: TipoCategoria,
  realizado: number,
  orcado: number,
  toleranciaPct: number
): EstadoDesvio {
  if (orcado <= 0) {
    if (realizado <= 0) return 'neutro';
    return tipo === 'despesa' ? 'ruim' : 'bom';
  }
  const desvioPct = ((realizado - orcado) / orcado) * 100;
  if (Math.abs(desvioPct) <= toleranciaPct) return 'neutro';
  const acima = desvioPct > 0;
  if (tipo === 'despesa') return acima ? 'ruim' : 'bom';
  if (tipo === 'receita') return acima ? 'bom' : 'ruim';
  return acima ? 'bom' : 'atencao';
}
