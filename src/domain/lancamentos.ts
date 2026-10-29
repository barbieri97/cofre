// ============================================================
// Domínio — Lançamentos por categoria
// Funções puras: upsert em lote do mês, totais por tipo e
// sincronização com o RegistroMensal que alimenta o patrimônio.
// ============================================================

import type { Categoria, LancamentoMensal, RegistroMensal, TipoCategoria } from '../types';
import { generateId } from '../types';

/** Uma linha do formulário do mês. `valor: null` = campo vazio = sem lançamento. */
export interface EntradaLancamento {
  categoriaId: string;
  valor: number | null;
  observacao?: string;
}

export type TotaisPorTipo = Record<TipoCategoria, number>;

/** Arredonda para centavos, evitando resíduos de ponto flutuante nas somas */
export function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Grava o mês inteiro de uma vez. Para cada entrada: valor numérico cria ou
 * atualiza o lançamento (zero é um valor lançado); `null` remove o que houver.
 * Categorias que não vieram nas entradas ficam como estão, assim como os
 * outros meses. Garante a unicidade (categoriaId, ano, mes).
 */
export function upsertLancamentosMes(
  existentes: LancamentoMensal[],
  ano: number,
  mes: number,
  entradas: EntradaLancamento[]
): LancamentoMensal[] {
  const porCategoria = new Map(entradas.map(e => [e.categoriaId, e]));
  const resultado: LancamentoMensal[] = [];
  const atualizadas = new Set<string>();

  for (const l of existentes) {
    const doMes = l.ano === ano && l.mes === mes;
    const entrada = doMes ? porCategoria.get(l.categoriaId) : undefined;
    if (!entrada) {
      resultado.push(l);
      continue;
    }
    // Duplicata herdada de dado corrompido: mantém só a primeira.
    if (atualizadas.has(l.categoriaId)) continue;
    atualizadas.add(l.categoriaId);
    if (entrada.valor === null) continue;
    resultado.push({
      ...l,
      valor: arredondar(Math.max(0, entrada.valor)),
      observacao: entrada.observacao || undefined,
    });
  }

  for (const e of entradas) {
    if (atualizadas.has(e.categoriaId) || e.valor === null) continue;
    atualizadas.add(e.categoriaId);
    resultado.push({
      id: generateId(),
      categoriaId: e.categoriaId,
      ano,
      mes,
      valor: arredondar(Math.max(0, e.valor)),
      observacao: e.observacao || undefined,
    });
  }

  return resultado;
}

export function lancamentosDoMes(
  lancamentos: LancamentoMensal[],
  ano: number,
  mes: number
): LancamentoMensal[] {
  return lancamentos.filter(l => l.ano === ano && l.mes === mes);
}

/** Soma os lançamentos do mês por tipo de categoria */
export function totaisDoMes(
  lancamentos: LancamentoMensal[],
  categorias: Categoria[],
  ano: number,
  mes: number
): TotaisPorTipo {
  const tipoDe = new Map(categorias.map(c => [c.id, c.tipo]));
  const totais: TotaisPorTipo = { receita: 0, despesa: 0, transferencia: 0 };
  for (const l of lancamentosDoMes(lancamentos, ano, mes)) {
    const tipo = tipoDe.get(l.categoriaId);
    if (tipo) totais[tipo] += l.valor;
  }
  totais.receita = arredondar(totais.receita);
  totais.despesa = arredondar(totais.despesa);
  totais.transferencia = arredondar(totais.transferencia);
  return totais;
}

/**
 * Reflete os lançamentos do mês no RegistroMensal, que é o que alimenta o
 * patrimônio, o fôlego e as análises.
 *
 * - Com lançamentos (`totais` não nulo): cria ou atualiza o registro do mês com
 *   ganhos = receitas e gastos = despesas, marcado `origem: 'categorias'`. Um
 *   registro manual do mesmo mês é convertido. Transferências ficam de fora:
 *   aporte não é gasto, o dinheiro continua no patrimônio.
 * - Sem lançamentos (`totais` nulo): remove o registro só se ele veio das
 *   categorias — um total digitado à mão nunca é apagado por aqui.
 */
export function sincronizarRegistro(
  registros: RegistroMensal[],
  ano: number,
  mes: number,
  totais: TotaisPorTipo | null,
  agora: string = new Date().toISOString()
): RegistroMensal[] {
  const idx = registros.findIndex(r => r.ano === ano && r.mes === mes);
  const atual = idx >= 0 ? registros[idx] : null;

  if (!totais) {
    if (atual?.origem !== 'categorias') return registros;
    return registros.filter((_, i) => i !== idx);
  }

  const dados = { ganhos: totais.receita, gastos: totais.despesa, origem: 'categorias' as const };
  if (atual) {
    const lista = [...registros];
    lista[idx] = { ...atual, ...dados, updatedAt: agora };
    return lista;
  }
  return [
    ...registros,
    { id: generateId(), ano, mes, ...dados, createdAt: agora, updatedAt: agora },
  ];
}

// ── Categorias "Outros" ──────────────────────────────────────

/** Ids fixos das categorias genéricas, para a migração ser idempotente */
export const ID_OUTROS = { receita: 'outros-receita', despesa: 'outros-despesa' } as const;
export const NOME_OUTROS = 'Outros';

export interface IdsOutros {
  receita: string;
  despesa: string;
}

function ehOutros(c: Categoria, tipo: 'receita' | 'despesa'): boolean {
  return c.tipo === tipo
    && (c.id === ID_OUTROS[tipo] || c.nome.trim().toLocaleLowerCase('pt-BR') === 'outros');
}

/**
 * Garante uma categoria "Outros" de receita e uma de despesa — o destino do
 * lançamento rápido (total do mês) e dos totais migrados da v3. Reaproveita
 * uma "Outros" que o usuário já tenha criado naquele tipo. Arquivada continua
 * arquivada, a menos que `reativar` seja true.
 */
export function garantirCategoriasOutros(
  categorias: Categoria[],
  agora: string,
  reativar = false
): { categorias: Categoria[]; ids: IdsOutros } {
  let lista = [...categorias];
  const ids = {} as IdsOutros;

  for (const tipo of ['receita', 'despesa'] as const) {
    const idx = lista.findIndex(c => ehOutros(c, tipo));
    if (idx >= 0) {
      ids[tipo] = lista[idx].id;
      if (reativar && !lista[idx].ativa) {
        lista[idx] = { ...lista[idx], ativa: true, atualizadoEm: agora };
      }
      continue;
    }
    // "Outros" vai para o fim do tipo
    const ordem = Math.max(-1, ...lista.filter(c => c.tipo === tipo).map(c => c.ordem)) + 1;
    lista = [...lista, {
      id: ID_OUTROS[tipo], nome: NOME_OUTROS, tipo, ativa: true, ordem, criadoEm: agora, atualizadoEm: agora,
    }];
    ids[tipo] = ID_OUTROS[tipo];
  }
  return { categorias: lista, ids };
}

/**
 * O mês tem lançamento em alguma categoria além das duas "Outros"? Um mês
 * detalhado se edita no Lançamento do mês; os demais aceitam o lançamento
 * rápido de totais.
 */
export function mesDetalhado(
  lancamentos: LancamentoMensal[],
  ids: IdsOutros,
  ano: number,
  mes: number
): boolean {
  return lancamentosDoMes(lancamentos, ano, mes)
    .some(l => l.categoriaId !== ids.receita && l.categoriaId !== ids.despesa);
}

/**
 * Migração dos totais manuais (schema v3): cada RegistroMensal sem origem vira
 * um lançamento de receita e um de despesa nas categorias "Outros", e passa a
 * ser derivado delas.
 *
 * Preserva o patrimônio ao centavo: os valores são copiados sem arredondar e
 * um total zero vira lançamento de zero (era um valor digitado). Registros
 * duplicados no mesmo mês — possíveis em dados antigos — já somavam juntos no
 * patrimônio, então são fundidos num só com os totais somados.
 *
 * Idempotente: um (categoria, ano, mês) que já tem lançamento não é tocado, e
 * registros que já têm origem ficam como estão.
 */
export function converterRegistrosManuais(
  registros: RegistroMensal[],
  categorias: Categoria[],
  lancamentos: LancamentoMensal[],
  agora: string
): { registros: RegistroMensal[]; categorias: Categoria[]; lancamentos: LancamentoMensal[] } {
  const garantidas = garantirCategoriasOutros(categorias, agora);
  const { ids } = garantidas;

  const porMes = new Map<number, RegistroMensal>();
  const resultado: RegistroMensal[] = [];
  for (const r of registros) {
    if (r.origem) {
      resultado.push(r);
      continue;
    }
    const chave = r.ano * 100 + r.mes;
    const atual = porMes.get(chave);
    if (!atual) {
      porMes.set(chave, { ...r });
      continue;
    }
    atual.ganhos += r.ganhos;
    atual.gastos += r.gastos;
    atual.descricao = [atual.descricao, r.descricao].filter(Boolean).join(' · ') || undefined;
  }

  const ocupado = new Set(lancamentos.map(l => `${l.categoriaId}|${l.ano}|${l.mes}`));
  const novos: LancamentoMensal[] = [];
  const lancar = (categoriaId: string, r: RegistroMensal, valor: number, sufixo: string) => {
    if (ocupado.has(`${categoriaId}|${r.ano}|${r.mes}`)) return;
    novos.push({ id: `mig-${r.id}-${sufixo}`, categoriaId, ano: r.ano, mes: r.mes, valor: Math.max(0, valor) });
  };

  for (const r of porMes.values()) {
    lancar(ids.receita, r, r.ganhos, 'r');
    lancar(ids.despesa, r, r.gastos, 'd');
    resultado.push({ ...r, origem: 'categorias' });
  }

  return {
    registros: resultado,
    categorias: garantidas.categorias,
    lancamentos: [...lancamentos, ...novos],
  };
}
