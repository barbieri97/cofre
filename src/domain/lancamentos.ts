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
