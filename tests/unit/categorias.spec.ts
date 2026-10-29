import { describe, it, expect } from 'vitest';
import {
  validarCategoria, categoriaTemDados, reordenar, categoriasDoMes,
  categoriasDoAno, agruparCategorias,
} from '@/domain/categorias';
import type { Categoria, LancamentoMensal, Orcamento } from '@/types';

function cat(id: string, tipo: Categoria['tipo'], extra: Partial<Categoria> = {}): Categoria {
  return { id, nome: id, tipo, ativa: true, ordem: 0, criadoEm: '', atualizadoEm: '', ...extra };
}

const LANC: LancamentoMensal[] = [{ id: 'l1', categoriaId: 'arq', ano: 2024, mes: 5, valor: 10 }];
const ORC: Orcamento[] = [{
  id: 'o1', categoriaId: 'arq2', ano: 2025, valorAnual: 12, distribuicao: 'uniforme',
  meses: new Array(12).fill(1), atualizadoEm: '',
}];

describe('validarCategoria', () => {
  const existentes = [cat('a', 'despesa', { nome: 'Mercado' })];

  it('recusa nome repetido no mesmo tipo, ignorando caixa e espaços', () => {
    expect(validarCategoria({ nome: '  mercado ', tipo: 'despesa' }, existentes)).not.toBeNull();
  });
  it('aceita o mesmo nome em outro tipo', () => {
    expect(validarCategoria({ nome: 'Mercado', tipo: 'receita' }, existentes)).toBeNull();
  });
  it('na edição a própria categoria não conflita', () => {
    expect(validarCategoria({ nome: 'Mercado', tipo: 'despesa' }, existentes, 'a')).toBeNull();
  });
  it('recusa nome vazio', () => {
    expect(validarCategoria({ nome: '   ', tipo: 'despesa' }, [])).not.toBeNull();
  });
});

describe('categoriaTemDados', () => {
  it('considera lançamentos e orçamentos', () => {
    expect(categoriaTemDados('arq', LANC, ORC)).toBe(true);
    expect(categoriaTemDados('arq2', LANC, ORC)).toBe(true);
    expect(categoriaTemDados('nova', LANC, ORC)).toBe(false);
  });
});

describe('reordenar', () => {
  it('reatribui a ordem pela sequência de ids', () => {
    const r = reordenar([cat('a', 'despesa', { ordem: 0 }), cat('b', 'despesa', { ordem: 1 })], ['b', 'a']);
    expect(r.map(c => [c.id, c.ordem])).toEqual([['b', 0], ['a', 1]]);
  });
});

describe('categorias arquivadas', () => {
  const categorias = [
    cat('ativa', 'despesa', { ordem: 0 }),
    cat('arq', 'despesa', { ativa: false, ordem: 1 }),
    cat('arq2', 'despesa', { ativa: false, ordem: 2 }),
  ];

  it('aparecem no mês em que têm lançamento', () => {
    expect(categoriasDoMes(categorias, LANC, 2024, 5).map(c => c.id)).toEqual(['ativa', 'arq']);
  });
  it('não aparecem num lançamento novo', () => {
    expect(categoriasDoMes(categorias, LANC, 2026, 1).map(c => c.id)).toEqual(['ativa']);
  });
  it('aparecem nos anos em que têm lançamento ou orçamento', () => {
    expect(categoriasDoAno(categorias, LANC, ORC, 2024).map(c => c.id)).toEqual(['ativa', 'arq']);
    expect(categoriasDoAno(categorias, LANC, ORC, 2025).map(c => c.id)).toEqual(['ativa', 'arq2']);
    expect(categoriasDoAno(categorias, LANC, ORC, 2026).map(c => c.id)).toEqual(['ativa']);
  });
});

describe('agruparCategorias', () => {
  it('ordena por tipo, depois grupos na ordem da primeira categoria', () => {
    const s = agruparCategorias([
      cat('inv', 'transferencia'),
      cat('merc', 'despesa', { ordem: 2 }),
      cat('alug', 'despesa', { grupo: 'Moradia', ordem: 0 }),
      cat('luz', 'despesa', { grupo: 'Moradia', ordem: 1 }),
      cat('sal', 'receita'),
    ]);
    expect(s.map(x => x.tipo)).toEqual(['receita', 'despesa', 'transferencia']);
    expect(s[1].grupos.map(g => [g.nome, g.categorias.map(c => c.id)])).toEqual([
      ['Moradia', ['alug', 'luz']],
      ['Sem grupo', ['merc']],
    ]);
  });
});
