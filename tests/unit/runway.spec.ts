import { describe, it, expect } from 'vitest';
import type { RegistroMensal } from '@/types';
import { calcularFolego, faixaFolego } from '@/domain/runway';

function reg(mes: number, ano: number, ganhos: number, gastos: number): RegistroMensal {
  return {
    id: `${ano}-${mes}`,
    mes, ano, ganhos, gastos,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

/** 12 meses de 2024 com gasto fixo de 5000 */
const DOZE_MESES = Array.from({ length: 12 }, (_, i) => reg(i + 1, 2024, 8000, 5000));

describe('calcularFolego', () => {
  it('divide o patrimônio pela média de gastos', () => {
    const f = calcularFolego(DOZE_MESES, 100_000, 12);
    expect(f.mediaGastos).toBe(5000);
    expect(f.meses).toBe(20);
    expect(f.mesesConsiderados).toBe(12);
    expect(f.patrimonio).toBe(100_000);
  });

  it('respeita a janela: só os meses mais recentes entram na média', () => {
    // 9 meses baratos + 3 meses caros no fim
    const registros = [
      ...Array.from({ length: 9 }, (_, i) => reg(i + 1, 2024, 8000, 2000)),
      reg(10, 2024, 8000, 8000),
      reg(11, 2024, 8000, 8000),
      reg(12, 2024, 8000, 8000),
    ];

    expect(calcularFolego(registros, 24_000, 3).mediaGastos).toBe(8000);
    expect(calcularFolego(registros, 24_000, 3).meses).toBe(3);

    // Todo o histórico dilui os meses caros
    const tudo = calcularFolego(registros, 24_000, 0);
    expect(tudo.mediaGastos).toBe(3500);
    expect(tudo.mesesConsiderados).toBe(12);
  });

  it('usa o que existe quando há menos registros que a janela', () => {
    const f = calcularFolego([reg(1, 2024, 5000, 1000), reg(2, 2024, 5000, 3000)], 8000, 12);
    expect(f.mesesConsiderados).toBe(2);
    expect(f.mediaGastos).toBe(2000);
    expect(f.meses).toBe(4);
  });

  it('devolve meses null quando não há gastos — indefinido, não infinito', () => {
    const f = calcularFolego([reg(1, 2024, 5000, 0), reg(2, 2024, 5000, 0)], 50_000, 12);
    expect(f.meses).toBeNull();
    expect(f.mediaGastos).toBe(0);
  });

  it('devolve meses 0 quando o patrimônio é zero ou negativo', () => {
    expect(calcularFolego(DOZE_MESES, 0, 12).meses).toBe(0);
    expect(calcularFolego(DOZE_MESES, -1500, 12).meses).toBe(0);
  });

  it('devolve tudo zerado sem registros', () => {
    const f = calcularFolego([], 100_000, 12);
    expect(f.meses).toBeNull();
    expect(f.mediaGastos).toBe(0);
    expect(f.mesesConsiderados).toBe(0);
    expect(f.patrimonio).toBe(100_000);
  });

  it('calcula o desvio padrão populacional dos gastos', () => {
    // Gastos 1000, 3000, 5000 → média 3000, desvio = sqrt((4+0+4)e6/3) ≈ 1632.99
    const registros = [
      reg(1, 2024, 9000, 1000),
      reg(2, 2024, 9000, 3000),
      reg(3, 2024, 9000, 5000),
    ];
    const f = calcularFolego(registros, 30_000, 3);
    expect(f.mediaGastos).toBe(3000);
    expect(f.desvioGastos).toBeCloseTo(1632.9931, 3);
  });

  it('tem desvio zero quando os gastos são constantes', () => {
    expect(calcularFolego(DOZE_MESES, 100_000, 12).desvioGastos).toBe(0);
  });
});

describe('faixaFolego', () => {
  it('é null quando os gastos não variam', () => {
    expect(faixaFolego(calcularFolego(DOZE_MESES, 100_000, 12))).toBeNull();
  });

  it('é null quando o fôlego não é calculável', () => {
    expect(faixaFolego(calcularFolego([], 100_000, 12))).toBeNull();
  });

  it('gasto maior encurta o fôlego e gasto menor o estende', () => {
    const registros = [
      reg(1, 2024, 9000, 1000),
      reg(2, 2024, 9000, 3000),
      reg(3, 2024, 9000, 5000),
    ];
    const f = calcularFolego(registros, 30_000, 3);
    const faixa = faixaFolego(f)!;

    expect(faixa.min).toBeLessThan(f.meses!);
    expect(faixa.max).toBeGreaterThan(f.meses!);
    expect(faixa.min).toBeCloseTo(30_000 / (3000 + f.desvioGastos), 6);
  });

  it('é null quando a volatilidade zeraria o gasto do limite inferior', () => {
    // Desvio maior que a média: gasto mínimo cairia para <= 0
    const registros = [
      reg(1, 2024, 9000, 0),
      reg(2, 2024, 9000, 0),
      reg(3, 2024, 9000, 6000),
    ];
    const f = calcularFolego(registros, 30_000, 3);
    expect(f.desvioGastos).toBeGreaterThan(f.mediaGastos);
    expect(faixaFolego(f)).toBeNull();
  });
});
