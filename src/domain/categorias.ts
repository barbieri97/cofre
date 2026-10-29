// ============================================================
// Domínio — Categorias
// Funções puras: unicidade, arquivamento, visibilidade por
// período e agrupamento para a UI.
// ============================================================

import type { Categoria, LancamentoMensal, Orcamento, TipoCategoria } from '../types';

/** Ordem fixa dos tipos na UI */
export const TIPOS_CATEGORIA: TipoCategoria[] = ['receita', 'despesa', 'transferencia'];

export const ROTULO_TIPO: Record<TipoCategoria, string> = {
  receita: 'Receitas',
  despesa: 'Despesas',
  transferencia: 'Transferências',
};

/** Rótulo usado para categorias sem grupo */
export const SEM_GRUPO = 'Sem grupo';

function normalizarNome(nome: string): string {
  return nome.trim().toLocaleLowerCase('pt-BR');
}

/**
 * Valida nome e unicidade de (nome, tipo). `ignorarId` exclui a própria
 * categoria durante uma edição. Devolve a mensagem de erro, ou null se válida.
 */
export function validarCategoria(
  dados: { nome: string; tipo: TipoCategoria },
  existentes: Categoria[],
  ignorarId?: string
): string | null {
  const nome = normalizarNome(dados.nome);
  if (!nome) return 'Informe um nome.';
  const duplicada = existentes.some(
    c => c.id !== ignorarId && c.tipo === dados.tipo && normalizarNome(c.nome) === nome
  );
  return duplicada ? 'Já existe uma categoria com esse nome neste tipo.' : null;
}

/** A categoria tem lançamento ou orçamento? Se tiver, só pode ser arquivada. */
export function categoriaTemDados(
  id: string,
  lancamentos: LancamentoMensal[],
  orcamentos: Orcamento[]
): boolean {
  return lancamentos.some(l => l.categoriaId === id) || orcamentos.some(o => o.categoriaId === id);
}

/** Reatribui `ordem` seguindo a sequência de ids; ids ausentes vão para o fim. */
export function reordenar(categorias: Categoria[], idsNaOrdem: string[]): Categoria[] {
  const posicao = new Map(idsNaOrdem.map((id, i) => [id, i]));
  return [...categorias]
    .sort((a, b) =>
      (posicao.get(a.id) ?? Infinity) - (posicao.get(b.id) ?? Infinity) || a.ordem - b.ordem
    )
    .map((c, i) => (c.ordem === i ? c : { ...c, ordem: i }));
}

export function ordenarCategorias(categorias: Categoria[]): Categoria[] {
  return [...categorias].sort((a, b) =>
    TIPOS_CATEGORIA.indexOf(a.tipo) - TIPOS_CATEGORIA.indexOf(b.tipo)
    || a.ordem - b.ordem
    || a.nome.localeCompare(b.nome, 'pt-BR')
  );
}

/**
 * Categorias exibidas no lançamento de um mês: as ativas e, entre as
 * arquivadas, só as que já têm lançamento naquele mês — uma categoria
 * arquivada não recebe lançamento novo, mas o que foi lançado nela não some.
 */
export function categoriasDoMes(
  categorias: Categoria[],
  lancamentos: LancamentoMensal[],
  ano: number,
  mes: number
): Categoria[] {
  const comDados = new Set(
    lancamentos.filter(l => l.ano === ano && l.mes === mes).map(l => l.categoriaId)
  );
  return ordenarCategorias(categorias.filter(c => c.ativa || comDados.has(c.id)));
}

/** Categorias exibidas num ano: ativas + arquivadas com lançamento ou orçamento no ano. */
export function categoriasDoAno(
  categorias: Categoria[],
  lancamentos: LancamentoMensal[],
  orcamentos: Orcamento[],
  ano: number
): Categoria[] {
  const comDados = new Set([
    ...lancamentos.filter(l => l.ano === ano).map(l => l.categoriaId),
    ...orcamentos.filter(o => o.ano === ano).map(o => o.categoriaId),
  ]);
  return ordenarCategorias(categorias.filter(c => c.ativa || comDados.has(c.id)));
}

export interface GrupoCategorias {
  nome: string;            // nome do grupo ou SEM_GRUPO
  categorias: Categoria[];
}

export interface SecaoTipo {
  tipo: TipoCategoria;
  rotulo: string;
  grupos: GrupoCategorias[];
}

/**
 * Agrupa por tipo e, dentro do tipo, por grupo. Grupos aparecem na ordem da
 * primeira categoria de cada um; tipos sem categoria não são emitidos.
 */
export function agruparCategorias(categorias: Categoria[]): SecaoTipo[] {
  const ordenadas = ordenarCategorias(categorias);
  const secoes: SecaoTipo[] = [];
  for (const tipo of TIPOS_CATEGORIA) {
    const doTipo = ordenadas.filter(c => c.tipo === tipo);
    if (!doTipo.length) continue;
    const grupos = new Map<string, Categoria[]>();
    for (const c of doTipo) {
      const nome = c.grupo?.trim() || SEM_GRUPO;
      grupos.set(nome, [...(grupos.get(nome) ?? []), c]);
    }
    secoes.push({
      tipo,
      rotulo: ROTULO_TIPO[tipo],
      grupos: [...grupos.entries()].map(([nome, cs]) => ({ nome, categorias: cs })),
    });
  }
  return secoes;
}

/** Nomes de grupo já usados, para sugerir no formulário */
export function gruposExistentes(categorias: Categoria[]): string[] {
  const nomes = new Set(categorias.map(c => c.grupo?.trim()).filter((g): g is string => !!g));
  return [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
