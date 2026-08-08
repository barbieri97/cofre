import { describe, it, expect, beforeAll } from 'vitest';
import type { RegistroMensal } from '@/types';

/**
 * Teste de integração da visão de anos.
 *
 * usePatrimonio lê o localStorage na primeira chamada e guarda um flag
 * `inicializado` em escopo de módulo, então os registros precisam ser
 * semeados ANTES do import — daí o import dinâmico no beforeAll.
 */

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

// 2 meses em 2025 e 3 meses em 2026, para os baldes anuais serem distinguíveis.
const REGISTROS: RegistroMensal[] = [
  reg(1, 2025, 1000, 400),   // saldo +600
  reg(2, 2025, 1200, 500),   // saldo +700
  reg(1, 2026, 2000, 900),   // saldo +1100
  reg(2, 2026, 2200, 1000),  // saldo +1200
  reg(3, 2026, 1800, 800),   // saldo +1000
];

type Patrimonio = ReturnType<typeof import('@/composables/usePatrimonio')['usePatrimonio']>;
let patrimonio: Patrimonio;

beforeAll(async () => {
  localStorage.setItem('cofre_registros', JSON.stringify(REGISTROS));
  localStorage.setItem('cofre_config', JSON.stringify({
    patrimonioInicial: 10000,
    moeda: 'BRL',
    simboloMoeda: 'R$',
    primeiroUso: false,
    metas: [],
  }));

  const { usePatrimonio } = await import('@/composables/usePatrimonio');
  patrimonio = usePatrimonio();
});

describe('pontosGrafico — visão de meses', () => {
  it('emite um ponto por mês, rotulado Mmm/AA', () => {
    patrimonio.setFiltro({
      tipo: 'meses', mesInicio: 1, anoInicio: 2025, mesFim: 12, anoFim: 2026,
    });

    expect(patrimonio.pontosGrafico.value.map(p => p.label))
      .toEqual(['Jan/25', 'Fev/25', 'Jan/26', 'Fev/26', 'Mar/26']);
  });
});

describe('pontosGrafico — visão de anos', () => {
  it('emite um ponto por ano, permitindo comparar anos entre si', () => {
    patrimonio.setFiltro({ tipo: 'anos', anoInicio: 2025, anoFim: 2026 });

    const pontos = patrimonio.pontosGrafico.value;

    // O bug original: aqui saíam os meses do ano, não os anos.
    expect(pontos.map(p => p.label)).toEqual(['2025', '2026']);
    expect(pontos).toHaveLength(2);
  });

  it('soma os meses de cada ano em ganhos, gastos e saldo', () => {
    patrimonio.setFiltro({ tipo: 'anos', anoInicio: 2025, anoFim: 2026 });

    const [p2025, p2026] = patrimonio.pontosGrafico.value;

    expect(p2025.ganhos).toBe(2200);   // 1000 + 1200
    expect(p2025.gastos).toBe(900);    // 400 + 500
    expect(p2025.saldo).toBe(1300);

    expect(p2026.ganhos).toBe(6000);   // 2000 + 2200 + 1800
    expect(p2026.gastos).toBe(2700);   // 900 + 1000 + 800
    expect(p2026.saldo).toBe(3300);
  });

  it('acumula o patrimônio corretamente ao fim de cada ano', () => {
    patrimonio.setFiltro({ tipo: 'anos', anoInicio: 2025, anoFim: 2026 });

    const [p2025, p2026] = patrimonio.pontosGrafico.value;

    expect(p2025.patrimonio).toBe(11300);  // 10000 inicial + 1300
    expect(p2026.patrimonio).toBe(14600);  // 11300 + 3300
  });

  it('bate com o último ponto da visão de meses', () => {
    patrimonio.setFiltro({
      tipo: 'meses', mesInicio: 1, anoInicio: 2025, mesFim: 12, anoFim: 2026,
    });
    const patrimonioFinalMeses = patrimonio.pontosGrafico.value.at(-1)!.patrimonio;

    patrimonio.setFiltro({ tipo: 'anos', anoInicio: 2025, anoFim: 2026 });
    const patrimonioFinalAnos = patrimonio.pontosGrafico.value.at(-1)!.patrimonio;

    expect(patrimonioFinalAnos).toBe(patrimonioFinalMeses);
  });

  it('expõe os totais do último ano nas estatísticas de período', () => {
    patrimonio.setFiltro({ tipo: 'anos', anoInicio: 2025, anoFim: 2026 });

    const est = patrimonio.estatisticas.value;

    expect(est.ganhosUltimoPeriodo).toBe(6000);
    expect(est.gastosUltimoPeriodo).toBe(2700);
    expect(est.saldoUltimoPeriodo).toBe(3300);
  });

  it('omite anos sem registro em vez de gerar um ponto zerado', () => {
    // 2024 não tem registros e está dentro do intervalo pedido.
    patrimonio.setFiltro({ tipo: 'anos', anoInicio: 2024, anoFim: 2026 });

    expect(patrimonio.pontosGrafico.value.map(p => p.label)).toEqual(['2025', '2026']);
  });
});

describe('normalização do filtro', () => {
  it('inverte as pontas quando o início é posterior ao fim', () => {
    patrimonio.setFiltro({ tipo: 'anos', anoInicio: 2026, anoFim: 2025 });

    expect(patrimonio.filtro.value.anoInicio).toBe(2025);
    expect(patrimonio.filtro.value.anoFim).toBe(2026);
    // e o gráfico continua com dados, em vez de ficar vazio
    expect(patrimonio.pontosGrafico.value.map(p => p.label)).toEqual(['2025', '2026']);
  });
});
