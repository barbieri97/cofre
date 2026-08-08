// ============================================================
// Domínio — Lacunas no histórico
// Cada mês é um registro único, então um mês esquecido não
// deixa buraco visível: ele some da série e contamina
// silenciosamente médias, fôlego e crescimento.
// ============================================================

import type { RegistroMensal } from '../types';
import { labelMes, chaveMes, adicionarMeses } from '../types';

export interface MesFaltante {
  mes: number;
  ano: number;
  label: string;   // ex.: 'Fev/25'
}

/**
 * Meses sem registro entre o primeiro e o último mês registrados.
 *
 * Só olha para o intervalo interno: meses anteriores ao início do histórico ou
 * posteriores ao último registro não são lacunas, são simplesmente fora do
 * período acompanhado.
 *
 * @param registrosOrdenados registros já ordenados cronologicamente
 */
export function mesesFaltantes(registrosOrdenados: RegistroMensal[]): MesFaltante[] {
  if (registrosOrdenados.length < 2) return [];

  const presentes = new Set(registrosOrdenados.map(r => chaveMes(r.mes, r.ano)));
  const primeiro = registrosOrdenados[0];
  const ultimo = registrosOrdenados[registrosOrdenados.length - 1];
  const chaveFim = chaveMes(ultimo.mes, ultimo.ano);

  const faltantes: MesFaltante[] = [];
  let { mes, ano } = primeiro;

  while (chaveMes(mes, ano) < chaveFim) {
    ({ mes, ano } = adicionarMeses(mes, ano, 1));
    if (chaveMes(mes, ano) >= chaveFim) break;
    if (!presentes.has(chaveMes(mes, ano))) {
      faltantes.push({ mes, ano, label: labelMes(mes, ano) });
    }
  }

  return faltantes;
}
