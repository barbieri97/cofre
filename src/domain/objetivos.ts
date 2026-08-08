// ============================================================
// Domínio — Objetivos de patrimônio
// Funções puras: status, conclusão derivada do histórico e
// projeção de chegada.
// ============================================================

import type { Objetivo } from '../types';
import { labelMes, chaveMes, diferencaMeses, adicionarMeses } from '../types';

/** Um ponto da série de patrimônio acumulado (mesmo formato de patrimonioAcumulado) */
export interface PontoPatrimonio {
  mes: number;
  ano: number;
  patrimonio: number;
}

export interface Conclusao {
  mes: number;
  ano: number;
  label: string;      // ex.: 'Mar/25'
  manual: boolean;    // true = data informada à mão, false = derivada do histórico
}

export type StatusObjetivo = 'ativo' | 'concluido';

export interface ProgressoObjetivo {
  patrimonioAtual: number;
  valor: number;
  percentualAtingido: number;   // limitado a 100
  valorRestante: number;
  atingido: boolean;
  /** null = crescimento médio insuficiente para projetar */
  mesesRestantes: number | null;
  /** ex.: 'Mar/28'. null quando não há projeção possível */
  dataEstimada: string | null;
  /** Só definido quando o objetivo tem dataAlvo: a projeção cabe no prazo? */
  noPrazo: boolean | null;
}

/**
 * Converte uma data ISO no mês/ano correspondente, lendo em UTC.
 *
 * Ler com getters locais deslocaria uma data gravada à meia-noite UTC para o
 * dia anterior em fusos a oeste — e num primeiro dia de mês isso muda o mês
 * inteiro ("concluído em Set/24" viraria "Ago/24"). As datas escolhidas pelo
 * usuário são gravadas ao meio-dia UTC justamente para serem lidas assim sem
 * ambiguidade em nenhum fuso.
 */
function mesAnoDe(iso: string): { mes: number; ano: number } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return { mes: d.getUTCMonth() + 1, ano: d.getUTCFullYear() };
}

/**
 * Determina quando um objetivo foi concluído.
 *
 * Uma `dataConclusao` gravada no objetivo é uma sobrescrita manual e sempre
 * vence. Sem ela, varre a série de patrimônio e devolve o primeiro mês, a
 * partir do mês de `dataInicio`, em que o patrimônio alcançou o valor-alvo.
 *
 * Derivar em vez de observar o momento do cruzamento faz a conclusão funcionar
 * retroativamente: um objetivo criado hoje sobre um histórico de três anos já
 * nasce marcado como concluído se o patrimônio passou daquele valor em 2024.
 */
export function derivarConclusao(obj: Objetivo, serie: PontoPatrimonio[]): Conclusao | null {
  if (obj.dataConclusao) {
    const d = mesAnoDe(obj.dataConclusao);
    if (d) return { ...d, label: labelMes(d.mes, d.ano), manual: true };
  }

  const inicio = mesAnoDe(obj.dataInicio);
  const chaveInicio = inicio ? chaveMes(inicio.mes, inicio.ano) : -Infinity;

  for (const p of serie) {
    if (chaveMes(p.mes, p.ano) < chaveInicio) continue;
    if (p.patrimonio >= obj.valor) {
      return { mes: p.mes, ano: p.ano, label: labelMes(p.mes, p.ano), manual: false };
    }
  }
  return null;
}

export function statusObjetivo(obj: Objetivo, serie: PontoPatrimonio[]): StatusObjetivo {
  return derivarConclusao(obj, serie) ? 'concluido' : 'ativo';
}

/**
 * Meses decorridos de um objetivo: de `dataInicio` até a conclusão, ou até
 * `referencia` (hoje) enquanto estiver ativo.
 *
 * Conta em meses, não em dias: os dados do app são mensais e um número de dias
 * sugeriria uma precisão que não existe.
 */
export function mesesDecorridos(
  obj: Objetivo,
  conclusao: Conclusao | null,
  referencia: Date = new Date()
): number {
  const inicio = mesAnoDe(obj.dataInicio);
  if (!inicio) return 0;

  const fim = conclusao
    ? { mes: conclusao.mes, ano: conclusao.ano }
    : { mes: referencia.getMonth() + 1, ano: referencia.getFullYear() };

  return Math.max(0, diferencaMeses(inicio.mes, inicio.ano, fim.mes, fim.ano));
}

/**
 * Progresso e projeção de chegada de um objetivo.
 *
 * Generaliza a antiga `projecaoMeta`, que só existia para a meta única. A
 * projeção usa o crescimento patrimonial médio mensal; quando ele é zero ou
 * negativo não há data possível e `mesesRestantes` fica null.
 */
export function progressoObjetivo(
  obj: Objetivo,
  patrimonioAtual: number,
  crescimentoMedioMensal: number,
  referencia: Date = new Date()
): ProgressoObjetivo {
  const atingido = patrimonioAtual >= obj.valor;
  const valorRestante = Math.max(obj.valor - patrimonioAtual, 0);
  const percentualAtingido = obj.valor > 0
    ? Math.min((patrimonioAtual / obj.valor) * 100, 100)
    : 0;

  let mesesRestantes: number | null = null;
  let dataEstimada: string | null = null;

  if (atingido) {
    mesesRestantes = 0;
  } else if (crescimentoMedioMensal > 0) {
    mesesRestantes = Math.ceil(valorRestante / crescimentoMedioMensal);
    const { mes, ano } = adicionarMeses(
      referencia.getMonth() + 1,
      referencia.getFullYear(),
      mesesRestantes
    );
    dataEstimada = labelMes(mes, ano);
  }

  let noPrazo: boolean | null = null;
  if (obj.dataAlvo) {
    const alvo = mesAnoDe(obj.dataAlvo);
    if (alvo) {
      if (atingido) {
        noPrazo = true;
      } else if (mesesRestantes !== null) {
        const chegada = adicionarMeses(
          referencia.getMonth() + 1,
          referencia.getFullYear(),
          mesesRestantes
        );
        noPrazo = chaveMes(chegada.mes, chegada.ano) <= chaveMes(alvo.mes, alvo.ano);
      } else {
        // Sem projeção possível e ainda não atingido: não cabe no prazo.
        noPrazo = false;
      }
    }
  }

  return {
    patrimonioAtual,
    valor: obj.valor,
    percentualAtingido,
    valorRestante,
    atingido,
    mesesRestantes,
    dataEstimada,
    noPrazo,
  };
}

/**
 * Ordena objetivos para exibição: ativos primeiro (principal no topo, depois
 * os mais próximos de serem atingidos), concluídos depois (mais recentes
 * primeiro).
 */
export function ordenarObjetivos(
  objetivos: Objetivo[],
  serie: PontoPatrimonio[],
  patrimonioAtual: number
): Objetivo[] {
  return [...objetivos].sort((a, b) => {
    const ca = derivarConclusao(a, serie);
    const cb = derivarConclusao(b, serie);

    if (!ca && cb) return -1;
    if (ca && !cb) return 1;

    if (!ca && !cb) {
      if (a.principal !== b.principal) return a.principal ? -1 : 1;
      const pa = a.valor > 0 ? patrimonioAtual / a.valor : 0;
      const pb = b.valor > 0 ? patrimonioAtual / b.valor : 0;
      return pb - pa;
    }

    return chaveMes(cb!.mes, cb!.ano) - chaveMes(ca!.mes, ca!.ano);
  });
}
