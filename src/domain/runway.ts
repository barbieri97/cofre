// ============================================================
// Domínio — Fôlego financeiro ("meses garantidos")
// Funções puras: quanto tempo o patrimônio banca o padrão de
// gastos atual, se nenhuma receita nova entrar.
// ============================================================

import type { RegistroMensal, JanelaFolego } from '../types';

export interface Folego {
  /** Meses de gasto que o patrimônio cobre. null = não calculável */
  meses: number | null;
  mediaGastos: number;
  /** Desvio padrão populacional dos gastos da janela */
  desvioGastos: number;
  /** Quantos meses entraram na média (pode ser < janela se houver menos registros) */
  mesesConsiderados: number;
  patrimonio: number;
}

const FOLEGO_VAZIO: Folego = {
  meses: null,
  mediaGastos: 0,
  desvioGastos: 0,
  mesesConsiderados: 0,
  patrimonio: 0,
};

/**
 * Calcula o fôlego a partir do patrimônio atual e da média de gastos de uma
 * janela recente.
 *
 * Premissa deliberada: considera todo o patrimônio como disponível. O app não
 * distingue ativo líquido de ilíquido, então quem consumir isso precisa exibir
 * a ressalva junto do número.
 *
 * @param registrosOrdenados registros já ordenados cronologicamente
 * @param patrimonioAtual patrimônio líquido no fim do histórico
 * @param janela quantos meses recentes entram na média (0 = todo o histórico)
 */
export function calcularFolego(
  registrosOrdenados: RegistroMensal[],
  patrimonioAtual: number,
  janela: JanelaFolego
): Folego {
  if (!registrosOrdenados.length) return { ...FOLEGO_VAZIO, patrimonio: patrimonioAtual };

  const amostra = janela === 0
    ? registrosOrdenados
    : registrosOrdenados.slice(-janela);

  const n = amostra.length;
  const mediaGastos = amostra.reduce((s, r) => s + r.gastos, 0) / n;
  const desvioGastos = Math.sqrt(
    amostra.reduce((s, r) => s + (r.gastos - mediaGastos) ** 2, 0) / n
  );

  const base = {
    mediaGastos,
    desvioGastos,
    mesesConsiderados: n,
    patrimonio: patrimonioAtual,
  };

  // Sem gastos registrados não há o que dividir — o fôlego é indefinido, não
  // infinito, e a UI precisa dizer isso em vez de mostrar um número inventado.
  if (mediaGastos <= 0) return { ...base, meses: null };

  // Patrimônio zerado ou negativo: nenhum mês coberto.
  if (patrimonioAtual <= 0) return { ...base, meses: 0 };

  return { ...base, meses: patrimonioAtual / mediaGastos };
}

/**
 * Faixa de fôlego considerando a volatilidade dos gastos: um mês caro reduz o
 * fôlego, um mês barato estende. Retorna null quando não há volatilidade ou
 * quando o fôlego não é calculável.
 */
export function faixaFolego(folego: Folego): { min: number; max: number } | null {
  if (folego.meses === null || folego.desvioGastos <= 0 || folego.patrimonio <= 0) return null;

  const gastoAlto = folego.mediaGastos + folego.desvioGastos;
  const gastoBaixo = folego.mediaGastos - folego.desvioGastos;

  // Com gastos muito voláteis o limite inferior pode zerar ou virar negativo;
  // nesse caso a faixa não informa nada de útil.
  if (gastoBaixo <= 0) return null;

  return {
    min: folego.patrimonio / gastoAlto,
    max: folego.patrimonio / gastoBaixo,
  };
}
