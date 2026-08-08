import { describe, it, expect } from 'vitest';
import type { RegistroMensal } from '@/types';
import { mesesFaltantes } from '@/domain/lacunas';

function reg(mes: number, ano: number): RegistroMensal {
  return {
    id: `${ano}-${mes}`,
    mes, ano, ganhos: 5000, gastos: 3000,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

describe('mesesFaltantes', () => {
  it('encontra um buraco no meio do histórico', () => {
    const faltando = mesesFaltantes([reg(1, 2024), reg(2, 2024), reg(4, 2024)]);
    expect(faltando).toEqual([{ mes: 3, ano: 2024, label: 'Mar/24' }]);
  });

  it('encontra vários buracos', () => {
    const faltando = mesesFaltantes([reg(1, 2024), reg(3, 2024), reg(6, 2024)]);
    expect(faltando.map(f => f.label)).toEqual(['Fev/24', 'Abr/24', 'Mai/24']);
  });

  it('atravessa a virada de ano', () => {
    const faltando = mesesFaltantes([reg(11, 2024), reg(3, 2025)]);
    expect(faltando.map(f => f.label)).toEqual(['Dez/24', 'Jan/25', 'Fev/25']);
  });

  it('devolve lista vazia num histórico contínuo', () => {
    const continuo = Array.from({ length: 12 }, (_, i) => reg(i + 1, 2024));
    expect(mesesFaltantes(continuo)).toEqual([]);
  });

  it('devolve lista vazia com menos de dois registros', () => {
    expect(mesesFaltantes([])).toEqual([]);
    expect(mesesFaltantes([reg(5, 2024)])).toEqual([]);
  });

  it('meses consecutivos não geram lacuna', () => {
    expect(mesesFaltantes([reg(12, 2024), reg(1, 2025)])).toEqual([]);
  });

  it('não reporta nada fora do intervalo registrado', () => {
    // O histórico começa em Mar e acaba em Mai: Jan, Fev, Jun não são lacunas
    const faltando = mesesFaltantes([reg(3, 2024), reg(5, 2024)]);
    expect(faltando.map(f => f.label)).toEqual(['Abr/24']);
  });
});
