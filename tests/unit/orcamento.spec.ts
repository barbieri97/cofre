import { describe, it, expect } from 'vitest';
import {
  distribuir, salvarOrcamento, copiarOrcamentos, mesReferencia,
  linhaAnual, visaoAnual, estadoDesvio,
} from '@/domain/orcamento';
import type { Categoria, LancamentoMensal, Orcamento } from '@/types';

const soma = (xs: number[]) => Math.round(xs.reduce((s, x) => s + x, 0) * 100) / 100;

function cat(id: string, tipo: Categoria['tipo'], extra: Partial<Categoria> = {}): Categoria {
  return { id, nome: id, tipo, ativa: true, ordem: 0, criadoEm: '', atualizadoEm: '', ...extra };
}

function lanc(categoriaId: string, ano: number, mes: number, valor: number): LancamentoMensal {
  return { id: `${categoriaId}-${ano}-${mes}`, categoriaId, ano, mes, valor };
}

describe('distribuir', () => {
  it('uniforme: soma exata e resíduo em dezembro', () => {
    const d = distribuir(1000, 'uniforme');
    expect(d.meses).toHaveLength(12);
    expect(soma(d.meses)).toBe(1000);
    expect(d.meses.slice(0, 11).every(v => v === 83.33)).toBe(true);
    expect(d.meses[11]).toBe(83.37);
  });

  it('uniforme: valor que divide exatamente', () => {
    const d = distribuir(1200, 'uniforme');
    expect(d.meses.every(v => v === 100)).toBe(true);
  });

  it('uniforme: centavos que não dividem', () => {
    const d = distribuir(0.05, 'uniforme');
    expect(soma(d.meses)).toBe(0.05);
    expect(d.meses[11]).toBe(0.05);
  });

  it('meses: divide entre os escolhidos, zera os demais e o resíduo vai para o último', () => {
    const d = distribuir(100.01, 'meses', [12, 3, 7, 3]);
    expect(soma(d.meses)).toBe(100.01);
    expect(d.meses[2]).toBe(33.33);
    expect(d.meses[6]).toBe(33.33);
    expect(d.meses[11]).toBe(33.35);
    expect(d.meses.filter(v => v === 0)).toHaveLength(9);
  });

  it('meses: sem mês escolhido não distribui nada', () => {
    const d = distribuir(500, 'meses', []);
    expect(d.valorAnual).toBe(0);
    expect(soma(d.meses)).toBe(0);
  });

  it('manual: o anual é a soma dos 12 valores', () => {
    const manual = [10.1, 20.2, 30.3, 0, 0, 0, 0, 0, 0, 0, 0, 0.01];
    const d = distribuir(99999, 'manual', undefined, manual);
    expect(d.valorAnual).toBe(60.61);
    expect(soma(d.meses)).toBe(d.valorAnual);
  });
});

describe('salvarOrcamento', () => {
  it('faz upsert por (categoria, ano) e recalcula os meses', () => {
    let lista: Orcamento[] = [];
    lista = salvarOrcamento(lista, { categoriaId: 'c1', ano: 2025, valorAnual: 1200, distribuicao: 'uniforme' });
    const id = lista[0].id;
    lista = salvarOrcamento(lista, { categoriaId: 'c1', ano: 2025, valorAnual: 600, distribuicao: 'meses', mesesEscolhidos: [6, 12] });
    expect(lista).toHaveLength(1);
    expect(lista[0].id).toBe(id);
    expect(lista[0].meses[5]).toBe(300);
    expect(lista[0].meses[0]).toBe(0);
    expect(lista[0].mesesEscolhidos).toEqual([6, 12]);

    lista = salvarOrcamento(lista, { categoriaId: 'c1', ano: 2026, valorAnual: 1, distribuicao: 'uniforme' });
    expect(lista).toHaveLength(2);
  });
});

describe('copiarOrcamentos', () => {
  const categorias = [cat('a', 'despesa'), cat('b', 'despesa'), cat('arq', 'despesa', { ativa: false })];
  let base: Orcamento[] = [];
  base = salvarOrcamento(base, { categoriaId: 'a', ano: 2025, valorAnual: 1200, distribuicao: 'uniforme' });
  base = salvarOrcamento(base, {
    categoriaId: 'b', ano: 2025, valorAnual: 0, distribuicao: 'manual',
    mesesManuais: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 33.33],
  });
  base = salvarOrcamento(base, { categoriaId: 'arq', ano: 2025, valorAnual: 500, distribuicao: 'uniforme' });

  it('copia sem ajuste mantendo a regra', () => {
    const { orcamentos, copiados } = copiarOrcamentos(base, categorias, 2025, 2026);
    expect(copiados).toBe(2);
    const a = orcamentos.find(o => o.categoriaId === 'a' && o.ano === 2026)!;
    expect(a.valorAnual).toBe(1200);
    expect(a.distribuicao).toBe('uniforme');
    const b = orcamentos.find(o => o.categoriaId === 'b' && o.ano === 2026)!;
    expect(b.meses[0]).toBe(100);
    expect(b.valorAnual).toBe(133.33);
  });

  it('aplica o ajuste percentual com soma exata', () => {
    const { orcamentos } = copiarOrcamentos(base, categorias, 2025, 2026, 7);
    const a = orcamentos.find(o => o.categoriaId === 'a' && o.ano === 2026)!;
    expect(a.valorAnual).toBe(1284);
    expect(soma(a.meses)).toBe(1284);
    const b = orcamentos.find(o => o.categoriaId === 'b' && o.ano === 2026)!;
    expect(b.meses[0]).toBe(107);
    expect(b.meses[11]).toBe(35.66);
    expect(b.valorAnual).toBe(soma(b.meses));
  });

  it('pula arquivadas e preserva o que já existe no destino', () => {
    const comDestino = salvarOrcamento(base, { categoriaId: 'a', ano: 2026, valorAnual: 50, distribuicao: 'uniforme' });
    const { orcamentos, copiados } = copiarOrcamentos(comDestino, categorias, 2025, 2026, 10);
    expect(copiados).toBe(1);
    expect(orcamentos.find(o => o.categoriaId === 'a' && o.ano === 2026)!.valorAnual).toBe(50);
    expect(orcamentos.some(o => o.categoriaId === 'arq' && o.ano === 2026)).toBe(false);

    const sobrescrito = copiarOrcamentos(comDestino, categorias, 2025, 2026, 10, true);
    expect(sobrescrito.copiados).toBe(2);
    expect(sobrescrito.orcamentos.find(o => o.categoriaId === 'a' && o.ano === 2026)!.valorAnual).toBe(1320);
  });
});

describe('mesReferencia', () => {
  const hoje = new Date(2026, 9, 15); // out/2026

  it('ano corrente usa o mês atual', () => {
    expect(mesReferencia(2026, hoje)).toBe(10);
  });
  it('ano passado usa dezembro', () => {
    expect(mesReferencia(2025, hoje)).toBe(12);
  });
  it('ano futuro não tem mês de referência', () => {
    expect(mesReferencia(2027, hoje)).toBe(0);
  });
});

describe('linhaAnual', () => {
  const orcado = new Array(12).fill(100);
  const realizado: (number | null)[] = [90, 120, 100, null, 500, ...new Array(7).fill(null)];

  it('ano corrente: acumula só até o mês de referência e projeta o restante pelo orçado', () => {
    const l = linhaAnual(orcado, realizado, 4);
    expect(l.orcadoAcum).toBe(400);
    expect(l.realizadoAcum).toBe(310);    // maio (500) fica fora da referência
    expect(l.desvioAcum).toBe(-90);
    expect(l.anual).toBe(1200);
    expect(l.projecao).toBe(310 + 800);
    expect(l.execucao).toBeCloseTo(310 / 1200);
    expect(l.meses[1].desvio).toBe(20);
    expect(l.meses[3].realizado).toBeNull();
  });

  it('ano passado: referência em dezembro, projeção = realizado', () => {
    const l = linhaAnual(orcado, realizado, 12);
    expect(l.orcadoAcum).toBe(1200);
    expect(l.realizadoAcum).toBe(810);
    expect(l.projecao).toBe(810);
  });

  it('sem orçamento anual, execução é null', () => {
    expect(linhaAnual(new Array(12).fill(0), [10], 12).execucao).toBeNull();
  });
});

describe('visaoAnual', () => {
  const categorias = [
    cat('sal', 'receita'),
    cat('alug', 'despesa', { grupo: 'Moradia', ordem: 0 }),
    cat('luz', 'despesa', { grupo: 'Moradia', ordem: 1 }),
    cat('merc', 'despesa', { ordem: 2 }),
    cat('inv', 'transferencia'),
    cat('velha', 'despesa', { ativa: false, ordem: 3 }),
  ];
  let orcamentos: Orcamento[] = [];
  orcamentos = salvarOrcamento(orcamentos, { categoriaId: 'sal', ano: 2025, valorAnual: 120000, distribuicao: 'uniforme' });
  orcamentos = salvarOrcamento(orcamentos, { categoriaId: 'alug', ano: 2025, valorAnual: 36000, distribuicao: 'uniforme' });
  orcamentos = salvarOrcamento(orcamentos, { categoriaId: 'luz', ano: 2025, valorAnual: 2400, distribuicao: 'uniforme' });
  orcamentos = salvarOrcamento(orcamentos, { categoriaId: 'inv', ano: 2025, valorAnual: 24000, distribuicao: 'uniforme' });
  const lancamentos = [
    lanc('sal', 2025, 1, 10000), lanc('sal', 2025, 2, 10000),
    lanc('alug', 2025, 1, 3000), lanc('alug', 2025, 2, 3000),
    lanc('luz', 2025, 1, 250),
    lanc('merc', 2025, 2, 800),
    lanc('inv', 2025, 1, 2000),
    lanc('velha', 2024, 5, 99),
  ];
  const hoje = new Date(2025, 1, 10); // fev/2025

  const v = visaoAnual(categorias, lancamentos, orcamentos, 2025, hoje);

  it('agrupa por tipo e grupo com subtotais', () => {
    expect(v.mesRef).toBe(2);
    expect(v.secoes.map(s => s.tipo)).toEqual(['receita', 'despesa', 'transferencia']);
    const despesas = v.secoes[1];
    expect(despesas.grupos.map(g => g.nome)).toEqual(['Moradia', 'Sem grupo']);
    expect(despesas.grupos[0].subtotal.orcadoAcum).toBe(6400);
    expect(despesas.grupos[0].subtotal.realizadoAcum).toBe(6250);
    expect(despesas.total.realizadoAcum).toBe(7050);
  });

  it('arquivada sem dados no ano não aparece; com dados em outro ano também não', () => {
    const ids = v.secoes.flatMap(s => s.grupos.flatMap(g => g.linhas.map(l => l.categoria.id)));
    expect(ids).not.toContain('velha');
    const v2024 = visaoAnual(categorias, lancamentos, orcamentos, 2024, hoje);
    const ids2024 = v2024.secoes.flatMap(s => s.grupos.flatMap(g => g.linhas.map(l => l.categoria.id)));
    expect(ids2024).toContain('velha');
  });

  it('resumo: resultado, taxa de poupança e projeção', () => {
    // receitas 20000, despesas 7050, transferências 2000
    expect(v.resumo.resultadoRealizadoAcum).toBe(10950);
    expect(v.resumo.taxaPoupancaRealizada).toBeCloseTo((2000 + 10950) / 20000);
    // orçado acumulado: 20000 − 6400 − 4000
    expect(v.resumo.resultadoOrcadoAcum).toBe(9600);
    // projeção: realizado + orçado mar–dez
    const projReceita = 20000 + 100000;
    const projDespesa = 7050 + 32000;
    const projTransf = 2000 + 20000;
    expect(v.resumo.resultadoProjetado).toBe(projReceita - projDespesa - projTransf);
  });
});

describe('estadoDesvio', () => {
  it('dentro da tolerância é neutro, inclusive na borda', () => {
    expect(estadoDesvio('despesa', 105, 100, 5)).toBe('neutro');
    expect(estadoDesvio('receita', 95, 100, 5)).toBe('neutro');
  });
  it('despesa acima é ruim e abaixo é bom', () => {
    expect(estadoDesvio('despesa', 106, 100, 5)).toBe('ruim');
    expect(estadoDesvio('despesa', 80, 100, 5)).toBe('bom');
  });
  it('receita abaixo é ruim', () => {
    expect(estadoDesvio('receita', 80, 100, 5)).toBe('ruim');
    expect(estadoDesvio('receita', 120, 100, 5)).toBe('bom');
  });
  it('transferência abaixo da meta pede atenção', () => {
    expect(estadoDesvio('transferencia', 50, 100, 5)).toBe('atencao');
    expect(estadoDesvio('transferencia', 150, 100, 5)).toBe('bom');
  });
  it('sem orçado', () => {
    expect(estadoDesvio('despesa', 0, 0, 5)).toBe('neutro');
    expect(estadoDesvio('despesa', 10, 0, 5)).toBe('ruim');
    expect(estadoDesvio('receita', 10, 0, 5)).toBe('bom');
  });
});
