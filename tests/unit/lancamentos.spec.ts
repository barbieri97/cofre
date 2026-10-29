import { describe, it, expect } from 'vitest';
import {
  upsertLancamentosMes, totaisDoMes, sincronizarRegistro, garantirCategoriasOutros, mesDetalhado,
} from '@/domain/lancamentos';
import type { Categoria, LancamentoMensal, RegistroMensal } from '@/types';

function cat(id: string, tipo: Categoria['tipo']): Categoria {
  return { id, nome: id, tipo, ativa: true, ordem: 0, criadoEm: '', atualizadoEm: '' };
}

const CATEGORIAS = [cat('sal', 'receita'), cat('alug', 'despesa'), cat('inv', 'transferencia')];

describe('upsertLancamentosMes', () => {
  it('cria lançamentos, inclusive zero, e ignora campos vazios', () => {
    const r = upsertLancamentosMes([], 2025, 3, [
      { categoriaId: 'sal', valor: 10000 },
      { categoriaId: 'alug', valor: 0 },
      { categoriaId: 'inv', valor: null },
    ]);
    expect(r).toHaveLength(2);
    expect(r.find(l => l.categoriaId === 'alug')!.valor).toBe(0);
    expect(r.some(l => l.categoriaId === 'inv')).toBe(false);
  });

  it('atualiza mantendo o id e limpa com valor vazio', () => {
    const inicial = upsertLancamentosMes([], 2025, 3, [
      { categoriaId: 'sal', valor: 10000 },
      { categoriaId: 'alug', valor: 3000 },
    ]);
    const idSal = inicial.find(l => l.categoriaId === 'sal')!.id;

    const r = upsertLancamentosMes(inicial, 2025, 3, [
      { categoriaId: 'sal', valor: 11000.555, observacao: 'bônus' },
      { categoriaId: 'alug', valor: null },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe(idSal);
    expect(r[0].valor).toBe(11000.56);
    expect(r[0].observacao).toBe('bônus');
  });

  it('não toca em outros meses nem em categorias fora das entradas', () => {
    const outros: LancamentoMensal[] = [
      { id: 'x', categoriaId: 'sal', ano: 2025, mes: 2, valor: 1 },
      { id: 'y', categoriaId: 'inv', ano: 2025, mes: 3, valor: 2 },
    ];
    const r = upsertLancamentosMes(outros, 2025, 3, [{ categoriaId: 'sal', valor: null }]);
    expect(r).toEqual(outros);
  });

  it('mantém um único lançamento por (categoria, ano, mês)', () => {
    const duplicados: LancamentoMensal[] = [
      { id: 'a', categoriaId: 'sal', ano: 2025, mes: 3, valor: 1 },
      { id: 'b', categoriaId: 'sal', ano: 2025, mes: 3, valor: 2 },
    ];
    const r = upsertLancamentosMes(duplicados, 2025, 3, [{ categoriaId: 'sal', valor: 5 }]);
    expect(r).toEqual([{ id: 'a', categoriaId: 'sal', ano: 2025, mes: 3, valor: 5, observacao: undefined }]);
  });

  it('valor negativo é gravado como zero', () => {
    const r = upsertLancamentosMes([], 2025, 3, [{ categoriaId: 'alug', valor: -10 }]);
    expect(r[0].valor).toBe(0);
  });
});

describe('totaisDoMes', () => {
  it('soma por tipo só o mês pedido', () => {
    const lancs = upsertLancamentosMes([], 2025, 3, [
      { categoriaId: 'sal', valor: 10000 },
      { categoriaId: 'alug', valor: 3000.1 },
      { categoriaId: 'inv', valor: 2000 },
    ]);
    lancs.push({ id: 'z', categoriaId: 'alug', ano: 2025, mes: 4, valor: 999 });
    expect(totaisDoMes(lancs, CATEGORIAS, 2025, 3)).toEqual({
      receita: 10000, despesa: 3000.1, transferencia: 2000,
    });
  });
});

describe('sincronizarRegistro', () => {
  const totais = { receita: 10000, despesa: 3000, transferencia: 2000 };
  const AGORA = '2025-03-31T12:00:00.000Z';

  it('cria o registro do mês: ganhos = receitas, gastos = despesas (sem transferências)', () => {
    const r = sincronizarRegistro([], 2025, 3, totais, AGORA);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ ano: 2025, mes: 3, ganhos: 10000, gastos: 3000, origem: 'categorias' });
  });

  it('converte um registro manual existente, preservando id e descrição', () => {
    const manual: RegistroMensal = {
      id: 'm', ano: 2025, mes: 3, ganhos: 1, gastos: 1, descricao: 'obs', createdAt: '', updatedAt: '',
    };
    const r = sincronizarRegistro([manual], 2025, 3, totais, AGORA);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ id: 'm', descricao: 'obs', ganhos: 10000, origem: 'categorias', updatedAt: AGORA });
  });

  it('sem lançamentos, remove só o registro que veio das categorias', () => {
    const derivado = sincronizarRegistro([], 2025, 3, totais, AGORA);
    expect(sincronizarRegistro(derivado, 2025, 3, null)).toEqual([]);

    const manual: RegistroMensal = {
      id: 'm', ano: 2025, mes: 3, ganhos: 1, gastos: 1, createdAt: '', updatedAt: '',
    };
    expect(sincronizarRegistro([manual], 2025, 3, null)).toEqual([manual]);
  });
});

describe('garantirCategoriasOutros', () => {
  it('cria as duas no fim de cada tipo', () => {
    const { categorias, ids } = garantirCategoriasOutros(
      [{ ...cat('merc', 'despesa'), ordem: 4 }], 'agora'
    );
    expect(ids).toEqual({ receita: 'outros-receita', despesa: 'outros-despesa' });
    expect(categorias.find(c => c.id === 'outros-despesa')!.ordem).toBe(5);
  });

  it('não duplica e só reativa a arquivada quando pedido', () => {
    const arquivada = { ...cat('outros-despesa', 'despesa'), nome: 'Outros', ativa: false };
    const r1 = garantirCategoriasOutros([arquivada], 'agora');
    expect(r1.categorias.filter(c => c.tipo === 'despesa')).toHaveLength(1);
    expect(r1.categorias.find(c => c.id === 'outros-despesa')!.ativa).toBe(false);
    const r2 = garantirCategoriasOutros([arquivada], 'agora', true);
    expect(r2.categorias.find(c => c.id === 'outros-despesa')!.ativa).toBe(true);
  });
});

describe('mesDetalhado', () => {
  const ids = { receita: 'outros-receita', despesa: 'outros-despesa' };
  it('mês só com "Outros" não é detalhado; com outra categoria é', () => {
    const base = upsertLancamentosMes([], 2025, 1, [
      { categoriaId: ids.receita, valor: 100 }, { categoriaId: ids.despesa, valor: 50 },
    ]);
    expect(mesDetalhado(base, ids, 2025, 1)).toBe(false);
    const detalhado = upsertLancamentosMes(base, 2025, 1, [{ categoriaId: 'alug', valor: 10 }]);
    expect(mesDetalhado(detalhado, ids, 2025, 1)).toBe(true);
    expect(mesDetalhado(detalhado, ids, 2025, 2)).toBe(false);
  });
});
