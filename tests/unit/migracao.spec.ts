import { describe, it, expect, beforeEach } from 'vitest';
import {
  migrarSchema, getConfig, getObjetivos, importarBackup,
  exportarBackup, saveRegistros, SCHEMA_VERSION,
} from '@/services/storageService';

const REGISTROS = [
  { id: 'r1', mes: 1, ano: 2024, ganhos: 8000, gastos: 5000, createdAt: '', updatedAt: '' },
  { id: 'r2', mes: 2, ano: 2024, ganhos: 8000, gastos: 5000, createdAt: '', updatedAt: '' },
];

beforeEach(() => {
  localStorage.clear();
});

describe('migrarSchema — v1 (meta em campos soltos)', () => {
  const CONFIG_V1 = {
    patrimonioInicial: 10000,
    moeda: 'BRL',
    simboloMoeda: 'R$',
    primeiroUso: false,
    metaPatrimonio: 250000,
    metaDataInicio: '2023-05-10T00:00:00.000Z',
  };

  it('converte a meta única em um objetivo preservando valor e dataInicio', () => {
    localStorage.setItem('cofre_config', JSON.stringify(CONFIG_V1));
    migrarSchema();

    const objetivos = getObjetivos();
    expect(objetivos).toHaveLength(1);
    expect(objetivos[0].valor).toBe(250000);
    expect(objetivos[0].dataInicio).toBe('2023-05-10T00:00:00.000Z');
    expect(objetivos[0].nome).toContain('250');
    expect(objetivos[0].principal).toBe(true);
    expect(objetivos[0].criadoEm).toBe('2023-05-10T00:00:00.000Z');
  });

  it('preserva a data de conclusão de uma meta já atingida', () => {
    localStorage.setItem('cofre_config', JSON.stringify({
      ...CONFIG_V1,
      metaDataConclusao: '2024-03-01T00:00:00.000Z',
    }));
    migrarSchema();

    const [o] = getObjetivos();
    expect(o.dataConclusao).toBe('2024-03-01T00:00:00.000Z');
    // Meta já concluída não vira o objetivo principal
    expect(o.principal).toBe(false);
  });

  it('limpa os campos legados e os não usados da config', () => {
    localStorage.setItem('cofre_config', JSON.stringify(CONFIG_V1));
    migrarSchema();

    const bruto = JSON.parse(localStorage.getItem('cofre_config')!);
    expect(bruto.metaPatrimonio).toBeUndefined();
    expect(bruto.metaDataInicio).toBeUndefined();
    expect(bruto.metas).toBeUndefined();
    expect(bruto.moeda).toBeUndefined();
    expect(bruto.simboloMoeda).toBeUndefined();

    // O que importa sobrevive, e os defaults novos entram
    const config = getConfig();
    expect(config.patrimonioInicial).toBe(10000);
    expect(config.primeiroUso).toBe(false);
    expect(config.janelaFolego).toBe(12);
    expect(config.reservaAlvoMeses).toBe(6);
  });
});

describe('migrarSchema — v2 (array metas dentro da config)', () => {
  const CONFIG_V2 = {
    patrimonioInicial: 50000,
    moeda: 'BRL',
    simboloMoeda: 'R$',
    primeiroUso: false,
    metas: [
      { id: 'm1', valor: 100000, dataInicio: '2022-01-01T00:00:00.000Z', dataConclusao: '2023-01-01T00:00:00.000Z' },
      { id: 'm2', valor: 300000, dataInicio: '2023-02-01T00:00:00.000Z' },
    ],
  };

  it('move todas as metas para a coleção de objetivos', () => {
    localStorage.setItem('cofre_config', JSON.stringify(CONFIG_V2));
    migrarSchema();

    const objetivos = getObjetivos();
    expect(objetivos).toHaveLength(2);
    expect(objetivos.map(o => o.valor)).toEqual([100000, 300000]);
    expect(objetivos.map(o => o.id)).toEqual(['m1', 'm2']);
  });

  it('elege a primeira meta em aberto como principal', () => {
    localStorage.setItem('cofre_config', JSON.stringify(CONFIG_V2));
    migrarSchema();

    const objetivos = getObjetivos();
    expect(objetivos.find(o => o.id === 'm1')!.principal).toBe(false);
    expect(objetivos.find(o => o.id === 'm2')!.principal).toBe(true);
  });
});

describe('migrarSchema — idempotência e instalação nova', () => {
  it('rodar duas vezes não duplica objetivos', () => {
    localStorage.setItem('cofre_config', JSON.stringify({
      patrimonioInicial: 0,
      primeiroUso: false,
      metas: [{ id: 'm1', valor: 100000, dataInicio: '2023-01-01T00:00:00.000Z' }],
    }));

    migrarSchema();
    const depoisDaPrimeira = getObjetivos();
    migrarSchema();
    migrarSchema();

    expect(getObjetivos()).toEqual(depoisDaPrimeira);
    expect(getObjetivos()).toHaveLength(1);
  });

  it('grava a versão atual e não inventa dados numa instalação nova', () => {
    migrarSchema();
    expect(localStorage.getItem('cofre_schema_version')).toBe(String(SCHEMA_VERSION));
    expect(getObjetivos()).toEqual([]);
    expect(getConfig().primeiroUso).toBe(true);
  });

  it('não mexe em dados que já estão na versão atual', () => {
    localStorage.setItem('cofre_schema_version', String(SCHEMA_VERSION));
    localStorage.setItem('cofre_config', JSON.stringify({ patrimonioInicial: 777, primeiroUso: false }));
    localStorage.setItem('cofre_objetivos', JSON.stringify([
      { id: 'x', nome: 'Meu', valor: 1000, dataInicio: '2024-01-01T00:00:00.000Z', criadoEm: '', atualizadoEm: '' },
    ]));

    migrarSchema();

    expect(getConfig().patrimonioInicial).toBe(777);
    expect(getObjetivos()).toHaveLength(1);
    expect(getObjetivos()[0].nome).toBe('Meu');
  });
});

describe('importarBackup', () => {
  it('migra um backup antigo (v2) na importação', () => {
    const backupAntigo = JSON.stringify({
      versao: '2.0',
      exportadoEm: '2024-06-01T00:00:00.000Z',
      config: {
        patrimonioInicial: 20000,
        moeda: 'BRL',
        simboloMoeda: 'R$',
        primeiroUso: false,
        metas: [{ id: 'm9', valor: 400000, dataInicio: '2023-08-01T00:00:00.000Z' }],
      },
      registros: REGISTROS,
    });

    const r = importarBackup(backupAntigo);
    expect(r.ok).toBe(true);

    const objetivos = getObjetivos();
    expect(objetivos).toHaveLength(1);
    expect(objetivos[0].valor).toBe(400000);
    expect(objetivos[0].principal).toBe(true);
    expect(getConfig().patrimonioInicial).toBe(20000);
    expect(localStorage.getItem('cofre_schema_version')).toBe(String(SCHEMA_VERSION));
  });

  it('faz round-trip de exportar e importar sem perder nada', () => {
    saveRegistros(REGISTROS);
    localStorage.setItem('cofre_config', JSON.stringify({ patrimonioInicial: 33000, primeiroUso: false }));
    localStorage.setItem('cofre_objetivos', JSON.stringify([
      { id: 'o1', nome: 'Reserva', valor: 60000, dataInicio: '2024-01-01T00:00:00.000Z', principal: true, criadoEm: '', atualizadoEm: '' },
    ]));
    localStorage.setItem('cofre_schema_version', String(SCHEMA_VERSION));

    const json = exportarBackup();
    localStorage.clear();

    const r = importarBackup(json);
    expect(r.ok).toBe(true);
    expect(getConfig().patrimonioInicial).toBe(33000);
    expect(getObjetivos()).toHaveLength(1);
    expect(getObjetivos()[0].nome).toBe('Reserva');
  });

  it('rejeita arquivo sem registros', () => {
    expect(importarBackup('{"versao":"3"}').ok).toBe(false);
    expect(importarBackup('não é json').ok).toBe(false);
  });
});
