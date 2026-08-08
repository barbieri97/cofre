import { describe, it, expect } from 'vitest';
import { agruparPorAno, labelAno, labelMes } from '@/types';
import type { RegistroMensal } from '@/types';

/** Cria um RegistroMensal com os campos de auditoria preenchidos */
function reg(mes: number, ano: number, ganhos: number, gastos: number): RegistroMensal {
  return {
    id: `${ano}-${mes}`,
    mes,
    ano,
    ganhos,
    gastos,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('agruparPorAno', () => {
  it('soma ganhos e gastos de vários meses do mesmo ano', () => {
    const registros = [
      reg(1, 2026, 5000, 3000),
      reg(2, 2026, 5500, 2500),
      reg(3, 2026, 4000, 4000),
    ];

    expect(agruparPorAno(registros)).toEqual([
      { ano: 2026, ganhos: 14500, gastos: 9500 },
    ]);
  });

  it('separa anos distintos e ordena crescentemente mesmo com entrada fora de ordem', () => {
    const registros = [
      reg(6, 2027, 1000, 400),
      reg(3, 2025, 800, 300),
      reg(1, 2026, 900, 500),
      reg(1, 2027, 1100, 600),
    ];

    expect(agruparPorAno(registros)).toEqual([
      { ano: 2025, ganhos: 800, gastos: 300 },
      { ano: 2026, ganhos: 900, gastos: 500 },
      { ano: 2027, ganhos: 2100, gastos: 1000 },
    ]);
  });

  it('devolve lista vazia para entrada vazia', () => {
    expect(agruparPorAno([])).toEqual([]);
  });

  it('aceita um ano com um único mês registrado', () => {
    expect(agruparPorAno([reg(7, 2026, 3200, 1800)])).toEqual([
      { ano: 2026, ganhos: 3200, gastos: 1800 },
    ]);
  });

  it('omite anos sem registro em vez de emiti-los zerados', () => {
    // 2026 não tem nenhum registro: não deve aparecer como barra zerada,
    // o que faria o patrimônio parecer despencar naquele ano.
    const registros = [reg(5, 2025, 1000, 400), reg(5, 2027, 1200, 500)];

    expect(agruparPorAno(registros).map(a => a.ano)).toEqual([2025, 2027]);
  });

  it('não modifica o array de entrada', () => {
    const registros = [reg(2, 2026, 100, 50), reg(1, 2026, 200, 60)];
    const copia = [...registros];

    agruparPorAno(registros);

    expect(registros).toEqual(copia);
  });
});

describe('labels de período', () => {
  it('labelAno usa o ano com quatro dígitos', () => {
    expect(labelAno(2026)).toBe('2026');
  });

  it('labelMes mantém o formato abreviado de dois dígitos', () => {
    expect(labelMes(1, 2026)).toBe('Jan/26');
    expect(labelMes(12, 2027)).toBe('Dez/27');
  });
});
