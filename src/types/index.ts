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

export interface MetaPatrimonio {
  id: string;
  valor: number;
  dataInicio: string; // ISO date string
  dataConclusao?: string; // ISO date string
}

/** Configurações globais do aplicativo */
export interface ConfigApp {
  patrimonioInicial: number;
  moeda: string;           // ex: 'BRL'
  simboloMoeda: string;    // ex: 'R$'
  primeiroUso: boolean;
  metas: MetaPatrimonio[]; // Lista de metas (histórico e atual)
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

/** Projeção de meta patrimonial */
export interface ProjecaoMeta {
  patrimonioAtual: number;
  meta: number;
  percentualAtingido: number;
  valorRestante: number;
  mesesRestantes: number | null;  // null = crescimento insuficiente
  dataEstimada: string | null;    // ex: 'Mar/2028'
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

/** Formata percentual */
export function formatPercent(value: number, casas = 1): string {
  return `${value.toFixed(casas)}%`;
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

/** Compara dois meses (retorna negativo, 0 ou positivo) */
export function compararMes(
  mesA: number, anoA: number,
  mesB: number, anoB: number
): number {
  return (anoA * 100 + mesA) - (anoB * 100 + mesB);
}

/** Adiciona N meses a um mês/ano */
export function adicionarMeses(mes: number, ano: number, n: number): { mes: number; ano: number } {
  const total = (ano * 12 + (mes - 1)) + n;
  return { mes: (total % 12) + 1, ano: Math.floor(total / 12) };
}
