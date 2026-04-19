// ============================================================
// Composable Central — usePatrimonio
// Toda a lógica de negócio reativa do app.
// ============================================================

import { ref, computed } from 'vue';
import type {
  RegistroMensal, ConfigApp, EstatisticasPeriodo,
  FiltroPeriodo, PontoGrafico
} from '../types';
import { generateId, labelMes } from '../types';
import * as storage from '../services/storageService';

// ── Estado Global (singleton reativo) ───────────────────────
const registros = ref<RegistroMensal[]>([]);
const config = ref<ConfigApp>(storage.getConfig());
const filtro = ref<FiltroPeriodo>(gerarFiltroDefault());

let inicializado = false;

// ── Inicialização ────────────────────────────────────────────
export function usePatrimonio() {

  if (!inicializado) {
    registros.value = storage.getRegistros();
    config.value = storage.getConfig();
    inicializado = true;
  }

  // ── Dados ordenados ────────────────────────────────────────
  const registrosOrdenados = computed(() =>
    [...registros.value].sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return a.mes - b.mes;
    })
  );

  // ── Registros filtrados ────────────────────────────────────
  const registrosFiltrados = computed(() =>
    registrosOrdenados.value.filter(r => {
      const chaveR = r.ano * 100 + r.mes;
      const chaveInicio = filtro.value.anoInicio * 100 + filtro.value.mesInicio;
      const chaveFim = filtro.value.anoFim * 100 + filtro.value.mesFim;
      return chaveR >= chaveInicio && chaveR <= chaveFim;
    })
  );

  // ── Estatísticas do período filtrado ──────────────────────
  const estatisticas = computed<EstatisticasPeriodo>(() => {
    const regs = registrosFiltrados.value;
    const totalGanhos = regs.reduce((s, r) => s + r.ganhos, 0);
    const totalGastos = regs.reduce((s, r) => s + r.gastos, 0);
    const saldoLiquido = totalGanhos - totalGastos;
    const taxaPoupanca = totalGanhos > 0 ? (saldoLiquido / totalGanhos) * 100 : 0;
    const patrimonioAtual = config.value.patrimonioInicial + saldoLiquido;
    const variacaoTotal = patrimonioAtual - config.value.patrimonioInicial;
    const variacaoPercentual = config.value.patrimonioInicial > 0
      ? (variacaoTotal / config.value.patrimonioInicial) * 100
      : 0;
    return {
      totalGanhos,
      totalGastos,
      saldoLiquido,
      taxaPoupanca,
      patrimonioAtual,
      patrimonioInicial: config.value.patrimonioInicial,
      variacaoTotal,
      variacaoPercentual,
    };
  });

  // ── Pontos para gráficos ───────────────────────────────────
  const pontosGrafico = computed<PontoGrafico[]>(() => {
    let acumulado = config.value.patrimonioInicial;
    return registrosFiltrados.value.map(r => {
      const saldo = r.ganhos - r.gastos;
      acumulado += saldo;
      return {
        label: labelMes(r.mes, r.ano),
        patrimonio: acumulado,
        ganhos: r.ganhos,
        gastos: r.gastos,
        saldo,
      };
    });
  });

  // ── Estatísticas gerais (sem filtro) ──────────────────────
  const patrimonioAtualGeral = computed(() => {
    const saldoTotal = registrosOrdenados.value.reduce(
      (s, r) => s + r.ganhos - r.gastos, 0
    );
    return config.value.patrimonioInicial + saldoTotal;
  });

  // ── CRUD ──────────────────────────────────────────────────

  function addRegistro(dados: Omit<RegistroMensal, 'id' | 'createdAt' | 'updatedAt'>): boolean {
    const existe = registros.value.some(r => r.mes === dados.mes && r.ano === dados.ano);
    if (existe) return false;
    const novo: RegistroMensal = {
      ...dados,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    registros.value = [...registros.value, novo];
    _persist();
    return true;
  }

  function updateRegistro(id: string, dados: Partial<Omit<RegistroMensal, 'id' | 'createdAt'>>): boolean {
    const idx = registros.value.findIndex(r => r.id === id);
    if (idx === -1) return false;
    const atualizado = { ...registros.value[idx], ...dados, updatedAt: new Date().toISOString() };
    const lista = [...registros.value];
    lista[idx] = atualizado;
    registros.value = lista;
    _persist();
    return true;
  }

  function deleteRegistro(id: string): boolean {
    const antes = registros.value.length;
    registros.value = registros.value.filter(r => r.id !== id);
    _persist();
    return registros.value.length < antes;
  }

  // ── Configuração ──────────────────────────────────────────

  function saveConfig(novaConfig: Partial<ConfigApp>) {
    config.value = { ...config.value, ...novaConfig };
    storage.saveConfig(config.value);
  }

  function resetarDados() {
    registros.value = [];
    config.value = { ...storage.getConfig(), patrimonioInicial: 0, primeiroUso: true };
    storage.clearAllData();
  }

  // ── Filtro ────────────────────────────────────────────────

  function setFiltro(novoFiltro: Partial<FiltroPeriodo>) {
    filtro.value = { ...filtro.value, ...novoFiltro };
  }

  function resetarFiltro() {
    filtro.value = gerarFiltroDefault();
  }

  // ── Privado ───────────────────────────────────────────────

  function _persist() {
    storage.saveRegistros(registros.value);
  }

  return {
    // Estado
    registros: registrosOrdenados,
    registrosFiltrados,
    config,
    filtro,
    // Computed
    estatisticas,
    pontosGrafico,
    patrimonioAtualGeral,
    // CRUD
    addRegistro,
    updateRegistro,
    deleteRegistro,
    // Config
    saveConfig,
    resetarDados,
    // Filtro
    setFiltro,
    resetarFiltro,
  };
}

// ── Helpers locais ───────────────────────────────────────────
function gerarFiltroDefault(): FiltroPeriodo {
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;
  return {
    mesInicio: mesAtual === 1 ? 1 : 1,
    anoInicio: anoAtual - 1,
    mesFim: mesAtual,
    anoFim: anoAtual,
  };
}
