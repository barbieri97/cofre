import { describe, it, expect } from 'vitest';
import type { Objetivo } from '@/types';
import {
  derivarConclusao, statusObjetivo, mesesDecorridos,
  progressoObjetivo, ordenarObjetivos, type PontoPatrimonio,
} from '@/domain/objetivos';

function obj(over: Partial<Objetivo> = {}): Objetivo {
  return {
    id: 'o1',
    nome: 'Objetivo',
    valor: 100_000,
    dataInicio: '2024-01-15T00:00:00.000Z',
    criadoEm: '2024-01-15T00:00:00.000Z',
    atualizadoEm: '2024-01-15T00:00:00.000Z',
    ...over,
  };
}

/** Patrimônio subindo 20k por mês a partir de Jan/24 */
const SERIE: PontoPatrimonio[] = [
  { mes: 1, ano: 2024, patrimonio: 20_000 },
  { mes: 2, ano: 2024, patrimonio: 40_000 },
  { mes: 3, ano: 2024, patrimonio: 60_000 },
  { mes: 4, ano: 2024, patrimonio: 80_000 },
  { mes: 5, ano: 2024, patrimonio: 100_000 },
  { mes: 6, ano: 2024, patrimonio: 120_000 },
];

describe('derivarConclusao', () => {
  it('marca retroativamente o primeiro mês em que o patrimônio alcançou o alvo', () => {
    const c = derivarConclusao(obj(), SERIE);
    expect(c).not.toBeNull();
    expect(c!.mes).toBe(5);
    expect(c!.ano).toBe(2024);
    expect(c!.label).toBe('Mai/24');
    expect(c!.manual).toBe(false);
  });

  it('devolve null quando nenhum mês cruzou o alvo', () => {
    expect(derivarConclusao(obj({ valor: 500_000 }), SERIE)).toBeNull();
  });

  it('ignora cruzamentos anteriores à data de início', () => {
    // Alvo de 40k foi cruzado em Fev, mas o objetivo só começa em Abr
    const c = derivarConclusao(
      obj({ valor: 40_000, dataInicio: '2024-04-10T00:00:00.000Z' }),
      SERIE
    );
    expect(c!.mes).toBe(4);
    expect(c!.label).toBe('Abr/24');
  });

  it('considera o próprio mês de início como elegível', () => {
    const c = derivarConclusao(
      obj({ valor: 60_000, dataInicio: '2024-03-20T00:00:00.000Z' }),
      SERIE
    );
    expect(c!.mes).toBe(3);
  });

  it('dataConclusao manual sobrepõe a derivação', () => {
    const c = derivarConclusao(
      obj({ dataConclusao: '2024-09-01T00:00:00.000Z' }),
      SERIE
    );
    expect(c!.mes).toBe(9);
    expect(c!.label).toBe('Set/24');
    expect(c!.manual).toBe(true);
  });

  it('sobrescrita manual vale mesmo quando a série nunca alcança o alvo', () => {
    const c = derivarConclusao(
      obj({ valor: 999_999, dataConclusao: '2025-02-01T00:00:00.000Z' }),
      SERIE
    );
    expect(c!.manual).toBe(true);
    expect(c!.label).toBe('Fev/25');
  });

  it('devolve null com série vazia', () => {
    expect(derivarConclusao(obj(), [])).toBeNull();
  });
});

describe('statusObjetivo', () => {
  it('classifica como concluído ou ativo conforme a conclusão derivada', () => {
    expect(statusObjetivo(obj(), SERIE)).toBe('concluido');
    expect(statusObjetivo(obj({ valor: 500_000 }), SERIE)).toBe('ativo');
  });
});

describe('mesesDecorridos', () => {
  it('conta do início até a conclusão', () => {
    const o = obj();
    expect(mesesDecorridos(o, derivarConclusao(o, SERIE))).toBe(4); // Jan → Mai
  });

  it('conta do início até a referência quando ainda está ativo', () => {
    const o = obj({ valor: 500_000 });
    expect(mesesDecorridos(o, null, new Date(2024, 6, 10))).toBe(6); // Jan → Jul
  });

  it('nunca é negativo quando o início é posterior à referência', () => {
    const o = obj({ dataInicio: '2025-06-01T00:00:00.000Z' });
    expect(mesesDecorridos(o, null, new Date(2024, 0, 10))).toBe(0);
  });
});

describe('progressoObjetivo', () => {
  const REF = new Date(2024, 5, 15); // Jun/24

  it('projeta a chegada a partir do crescimento médio', () => {
    const p = progressoObjetivo(obj({ valor: 200_000 }), 120_000, 20_000, REF);
    expect(p.atingido).toBe(false);
    expect(p.valorRestante).toBe(80_000);
    expect(p.percentualAtingido).toBe(60);
    expect(p.mesesRestantes).toBe(4);
    expect(p.dataEstimada).toBe('Out/24');
  });

  it('não projeta quando o crescimento médio é zero ou negativo', () => {
    const p = progressoObjetivo(obj({ valor: 200_000 }), 120_000, -500, REF);
    expect(p.mesesRestantes).toBeNull();
    expect(p.dataEstimada).toBeNull();
  });

  it('limita o percentual a 100 e zera os meses quando já atingido', () => {
    const p = progressoObjetivo(obj({ valor: 100_000 }), 250_000, 20_000, REF);
    expect(p.atingido).toBe(true);
    expect(p.percentualAtingido).toBe(100);
    expect(p.valorRestante).toBe(0);
    expect(p.mesesRestantes).toBe(0);
  });

  it('noPrazo é null sem dataAlvo', () => {
    expect(progressoObjetivo(obj(), 50_000, 20_000, REF).noPrazo).toBeNull();
  });

  it('compara a projeção com a data-alvo', () => {
    const base = { valor: 200_000 };
    // Chegada projetada em Out/24
    const folgado = progressoObjetivo(
      obj({ ...base, dataAlvo: '2024-12-31T00:00:00.000Z' }), 120_000, 20_000, REF
    );
    expect(folgado.noPrazo).toBe(true);

    const apertado = progressoObjetivo(
      obj({ ...base, dataAlvo: '2024-08-31T00:00:00.000Z' }), 120_000, 20_000, REF
    );
    expect(apertado.noPrazo).toBe(false);
  });

  it('sem projeção possível e com prazo definido, não está no prazo', () => {
    const p = progressoObjetivo(
      obj({ valor: 200_000, dataAlvo: '2025-12-31T00:00:00.000Z' }), 120_000, 0, REF
    );
    expect(p.noPrazo).toBe(false);
  });

  it('já atingido está sempre no prazo', () => {
    const p = progressoObjetivo(
      obj({ valor: 100_000, dataAlvo: '2024-01-01T00:00:00.000Z' }), 150_000, 20_000, REF
    );
    expect(p.noPrazo).toBe(true);
  });
});

describe('ordenarObjetivos', () => {
  it('põe ativos antes de concluídos, com o principal no topo', () => {
    const ativoPrincipal = obj({ id: 'a', valor: 500_000, principal: true });
    const ativoProximo = obj({ id: 'b', valor: 200_000 });
    const concluido = obj({ id: 'c', valor: 50_000 });

    const ordem = ordenarObjetivos([concluido, ativoProximo, ativoPrincipal], SERIE, 120_000)
      .map(o => o.id);

    expect(ordem).toEqual(['a', 'b', 'c']);
  });

  it('ordena concluídos do mais recente para o mais antigo', () => {
    const cedo = obj({ id: 'cedo', valor: 20_000 });   // Jan/24
    const tarde = obj({ id: 'tarde', valor: 100_000 }); // Mai/24

    const ordem = ordenarObjetivos([cedo, tarde], SERIE, 120_000).map(o => o.id);
    expect(ordem).toEqual(['tarde', 'cedo']);
  });

  it('não muda o array de entrada', () => {
    const lista = [obj({ id: 'x', valor: 500_000 }), obj({ id: 'y', valor: 20_000 })];
    const copia = [...lista];
    ordenarObjetivos(lista, SERIE, 120_000);
    expect(lista).toEqual(copia);
  });
});
