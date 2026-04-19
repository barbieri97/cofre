// ============================================================
// Tipos e Interfaces do App Cofre
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

/** Configurações globais do aplicativo */
export interface ConfigApp {
  patrimonioInicial: number;
  moeda: string;           // ex: 'BRL'
  simboloMoeda: string;    // ex: 'R$'
  primeiroUso: boolean;
}

/** Estatísticas calculadas para um período */
export interface EstatisticasPeriodo {
  totalGanhos: number;
  totalGastos: number;
  saldoLiquido: number;
  taxaPoupanca: number;    // (ganhos - gastos) / ganhos * 100
  patrimonioAtual: number;
  patrimonioInicial: number;
  variacaoTotal: number;   // patrimonioAtual - patrimonioInicial
  variacaoPercentual: number;
}

/** Ponto de dado para gráficos */
export interface PontoGrafico {
  label: string;            // ex: 'Jan/24'
  patrimonio: number;
  ganhos: number;
  gastos: number;
  saldo: number;
}

/** Filtro de período */
export interface FiltroPeriodo {
  mesInicio: number;
  anoInicio: number;
  mesFim: number;
  anoFim: number;
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
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** Label de mês abreviado */
export function labelMes(mes: number, ano: number): string {
  return `${MESES_ABREV[mes - 1]}/${String(ano).slice(2)}`;
}
