// ============================================================
// Tipos e Interfaces do App Cofre v2.0
// ============================================================

/** Registro mensal de ganhos e gastos */
export interface RegistroMensal {
  id: string;
  mes: number;       // 1–12
  ano: number;
  ganhos: number;    // Total de entradas no mês
  gastos: number;    // Total de saídas no mês
  descricao?: string; // Observações opcionais
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

/**
 * Formato legado de meta (schema v2). Mantido exportado apenas para tipar a
 * migração v2 → v3 em storageService; nenhum código novo deve usá-lo.
 */
export interface MetaPatrimonio {
  id: string;
  valor: number;
  dataInicio: string; // ISO date string
  dataConclusao?: string; // ISO date string
}

/**
 * Objetivo de patrimônio rastreável. Diferente da MetaPatrimonio legada, um
 * objetivo nunca é descartado ao ser editado nem ao ser concluído — todos os
 * campos são editáveis e o histórico é permanente.
 */
export interface Objetivo {
  id: string;
  nome: string;
  valor: number;           // patrimônio-alvo
  dataInicio: string;      // ISO date string
  dataAlvo?: string;       // ISO date string — prazo desejado (opcional)
  /**
   * Sobrescrita MANUAL da conclusão. Quando ausente, a conclusão é derivada da
   * série de patrimônio (ver src/domain/objetivos.ts) — o que funciona
   * retroativamente para objetivos criados sobre um histórico já existente.
   */
  dataConclusao?: string;  // ISO date string
  principal?: boolean;     // destacado na Home (no máximo um)
  criadoEm: string;        // ISO date string
  atualizadoEm: string;    // ISO date string
}

/** Janela de meses usada para a média de gastos do fôlego. 0 = todo o histórico */
export type JanelaFolego = 3 | 6 | 12 | 0;

/** Configurações globais do aplicativo */
export interface ConfigApp {
  patrimonioInicial: number;
  primeiroUso: boolean;
  janelaFolego: JanelaFolego;
  /** Reserva desejada, em meses de gasto. Usada só para colorir o card do fôlego. */
  reservaAlvoMeses: number;
}

/** Estatísticas calculadas para um período filtrado */
export interface EstatisticasPeriodo {
  totalGanhos: number;
  totalGastos: number;
  saldoLiquido: number;
  taxaPoupanca: number;    // (ganhos - gastos) / ganhos * 100
  patrimonioAtual: number;
  patrimonioBase: number;  // patrimônio no início do período filtrado
  variacaoTotal: number;   // patrimonioAtual - patrimonioBase
  variacaoPercentual: number;
  // Dados do último período filtrado (último mês ou último ano, conforme filtro.tipo)
  ganhosUltimoPeriodo: number;
  gastosUltimoPeriodo: number;
  saldoUltimoPeriodo: number;
  taxaPoupancaUltimoPeriodo: number;
  crescimentoUltimoPeriodo: number;       // variação patrimonial absoluta
  crescimentoPercUltimoPeriodo: number;   // variação patrimonial %
}

/** Ponto de dado para gráficos */
export interface PontoGrafico {
  label: string;              // ex: 'Jan/24' (visão meses) ou '2024' (visão anos)
  patrimonio: number;         // patrimônio acumulado
  ganhos: number;
  gastos: number;
  saldo: number;
  taxaPoupanca: number;       // %
  crescimento: number;        // variação do patrimônio vs período anterior
}

/** Tipo de visão do filtro */
export type TipoFiltro = 'meses' | 'anos';

/** Filtro de período */
export interface FiltroPeriodo {
  mesInicio: number;
  anoInicio: number;
  mesFim: number;
  anoFim: number;
  tipo: TipoFiltro;   // 'meses' = 1 ponto por mês | 'anos' = 1 ponto por ano
}

/** Estatísticas gerais (baseadas nos últimos 12 meses e em todo o histórico) */
export interface EstatisticasGerais {
  // Médias 12 meses
  mediaGanhos12m: number;
  mediaGastos12m: number;
  mediaSaldo12m: number;
  mediaTaxaPoupanca12m: number;
  // Records históricos
  maiorGanho: { valor: number; mes: number; ano: number } | null;
  maiorGasto: { valor: number; mes: number; ano: number } | null;
  maiorCrescimento: { valor: number; mes: number; ano: number } | null;
  melhorTaxaPoupanca: { valor: number; mes: number; ano: number } | null;
  // Crescimento médio mensal do patrimônio (12m)
  crescimentoMedioMensal: number;
}

/** Nomes dos meses em Português */
export const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MESES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

/** Gera um ID único simples */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Formata número como moeda BRL */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

/** Formata moeda abreviada (R$ 12k / R$ 1.2M), para tabelas e eixos apertados */
export function formatCurrencyK(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return formatCurrency(value);
}

/** Formata percentual */
export function formatPercent(value: number, casas = 1): string {
  return `${value.toFixed(casas)}%`;
}

/**
 * Traduz uma quantidade de meses para linguagem natural ("1 ano e 6 meses").
 * Arredonda para o mês mais próximo — os dados do app são mensais, então
 * qualquer precisão abaixo disso seria inventada.
 */
export function descreverMeses(meses: number): string {
  const total = Math.round(meses);
  if (total <= 0) return 'menos de 1 mês';
  const anos = Math.floor(total / 12);
  const resto = total % 12;
  const partes: string[] = [];
  if (anos > 0) partes.push(`${anos} ano${anos > 1 ? 's' : ''}`);
  if (resto > 0) partes.push(`${resto} ${resto > 1 ? 'meses' : 'mês'}`);
  return partes.join(' e ');
}

/** Label de mês abreviado */
export function labelMes(mes: number, ano: number): string {
  return `${MESES_ABREV[mes - 1]}/${String(ano).slice(2)}`;
}

/** Label de ano */
export function labelAno(ano: number): string {
  return String(ano);
}

/** Agregado anual de registros mensais */
export interface AgregadoAnual {
  ano: number;
  ganhos: number;
  gastos: number;
}

/**
 * Agrupa registros mensais por ano, somando ganhos e gastos.
 * Anos sem nenhum registro simplesmente não aparecem no resultado — não são
 * emitidos zerados, o que faria o patrimônio parecer despencar naquele ano.
 */
export function agruparPorAno(registros: RegistroMensal[]): AgregadoAnual[] {
  const mapa = new Map<number, AgregadoAnual>();
  for (const r of registros) {
    const acc = mapa.get(r.ano) ?? { ano: r.ano, ganhos: 0, gastos: 0 };
    acc.ganhos += r.ganhos;
    acc.gastos += r.gastos;
    mapa.set(r.ano, acc);
  }
  return [...mapa.values()].sort((a, b) => a.ano - b.ano);
}

/** Chave ordenável de um mês (ano*100 + mes), usada para comparar e filtrar */
export function chaveMes(mes: number, ano: number): number {
  return ano * 100 + mes;
}

/** Compara dois meses (retorna negativo, 0 ou positivo) */
export function compararMes(
  mesA: number, anoA: number,
  mesB: number, anoB: number
): number {
  return chaveMes(mesA, anoA) - chaveMes(mesB, anoB);
}

/** Quantidade de meses de A até B (negativa se B vier antes de A) */
export function diferencaMeses(
  mesA: number, anoA: number,
  mesB: number, anoB: number
): number {
  return (anoB * 12 + (mesB - 1)) - (anoA * 12 + (mesA - 1));
}

/** Adiciona N meses a um mês/ano */
export function adicionarMeses(mes: number, ano: number, n: number): { mes: number; ano: number } {
  const total = (ano * 12 + (mes - 1)) + n;
  return { mes: (total % 12) + 1, ano: Math.floor(total / 12) };
}
