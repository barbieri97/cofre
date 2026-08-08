// ============================================================
// Composable Central — usePatrimonio v2.0
// Toda a lógica de negócio reativa do app.
// ============================================================

import { ref, computed, watch } from 'vue';
import type {
  RegistroMensal, ConfigApp, EstatisticasPeriodo,
  EstatisticasGerais, ProjecaoMeta, MetaPatrimonio,
  FiltroPeriodo, PontoGrafico
} from '../types';
import { generateId, labelMes, labelAno, adicionarMeses, agruparPorAno } from '../types';
import * as storage from '../services/storageService';

// ── Estado Global (singleton reativo) ───────────────────────
// Precisa ficar em escopo de módulo, e não dentro de usePatrimonio(), para
// que todos os consumidores compartilhem o mesmo estado — inclusive o
// FiltroPeriodoPanel, que altera o filtro lido pelas páginas.
const registros = ref<RegistroMensal[]>([]);
const config = ref<ConfigApp>(storage.getConfig());
const filtroAtivo = ref<FiltroPeriodo>(gerarFiltroDefault());

let inicializado = false;

// ── Inicialização ────────────────────────────────────────────
export function usePatrimonio() {

  if (!inicializado) {
    registros.value = storage.getRegistros();
    config.value = storage.getConfig();
    inicializado = true;
  }

  // ── Dados ordenados cronologicamente ──────────────────────
  const registrosOrdenados = computed(() =>
    [...registros.value].sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return a.mes - b.mes;
    })
  );

  // ── Patrimônio acumulado de TODOS os registros ─────────────
  // Calcula o patrimônio para cada mês usando o patrimonioInicial como base
  const patrimonioAcumulado = computed(() => {
    let acumulado = config.value.patrimonioInicial;
    return registrosOrdenados.value.map(r => {
      acumulado += r.ganhos - r.gastos;
      return { mes: r.mes, ano: r.ano, patrimonio: acumulado };
    });
  });

  // ── Patrimônio atual geral (sem filtro) ───────────────────
  const patrimonioAtualGeral = computed(() => {
    const ultimo = patrimonioAcumulado.value.at(-1);
    return ultimo?.patrimonio ?? config.value.patrimonioInicial;
  });

  // ── Patrimônio em um mês específico ─────────────────────
  // BUG FIX: calcula o patrimônio acumulado até (exclusive) um determinado ponto
  function patrimonioAntesDe(mes: number, ano: number): number {
    const chave = ano * 100 + mes;
    let acumulado = config.value.patrimonioInicial;
    for (const r of registrosOrdenados.value) {
      if (r.ano * 100 + r.mes >= chave) break;
      acumulado += r.ganhos - r.gastos;
    }
    return acumulado;
  }

  // ── Registros filtrados ────────────────────────────────────
  const registrosFiltrados = computed(() =>
    registrosOrdenados.value.filter(r => {
      const chaveR = r.ano * 100 + r.mes;
      const chaveInicio = filtroAtivo.value.anoInicio * 100 + filtroAtivo.value.mesInicio;
      const chaveFim = filtroAtivo.value.anoFim * 100 + filtroAtivo.value.mesFim;
      return chaveR >= chaveInicio && chaveR <= chaveFim;
    })
  );

  // ── Pontos para gráficos (período filtrado) ───────────────
  // Acumula o patrimônio sobre uma lista de baldes já ordenados
  // cronologicamente. Serve tanto para baldes mensais quanto anuais.
  function construirPontos(
    baldes: { label: string; ganhos: number; gastos: number }[],
    patrimonioBase: number
  ): PontoGrafico[] {
    let acumulado = patrimonioBase;
    return baldes.map((b) => {
      const saldo = b.ganhos - b.gastos;
      const patrimonioAnterior = acumulado;
      acumulado += saldo;
      return {
        label: b.label,
        patrimonio: acumulado,
        ganhos: b.ganhos,
        gastos: b.gastos,
        saldo,
        taxaPoupanca: b.ganhos > 0 ? (saldo / b.ganhos) * 100 : 0,
        crescimento: acumulado - patrimonioAnterior,
      };
    });
  }

  // BUG FIX: usa o patrimônio real no início do período filtrado como base
  const pontosGrafico = computed<PontoGrafico[]>(() => {
    const regs = registrosFiltrados.value;
    if (!regs.length) return [];

    // Patrimônio logo antes do início do filtro
    const patrimonioBase = patrimonioAntesDe(
      filtroAtivo.value.mesInicio,
      filtroAtivo.value.anoInicio
    );

    // Visão 'anos': soma os 12 meses de cada ano num único ponto, permitindo
    // comparar anos entre si. Visão 'meses': um ponto por registro mensal.
    const baldes = filtroAtivo.value.tipo === 'anos'
      ? agruparPorAno(regs).map(a => ({
          label: labelAno(a.ano), ganhos: a.ganhos, gastos: a.gastos,
        }))
      : regs.map(r => ({
          label: labelMes(r.mes, r.ano), ganhos: r.ganhos, gastos: r.gastos,
        }));

    return construirPontos(baldes, patrimonioBase);
  });

  // ── Estatísticas do período filtrado ──────────────────────
  const estatisticas = computed<EstatisticasPeriodo>(() => {
    const regs = registrosFiltrados.value;
    const pontos = pontosGrafico.value;

    const totalGanhos = regs.reduce((s, r) => s + r.ganhos, 0);
    const totalGastos = regs.reduce((s, r) => s + r.gastos, 0);
    const saldoLiquido = totalGanhos - totalGastos;
    const taxaPoupanca = totalGanhos > 0 ? (saldoLiquido / totalGanhos) * 100 : 0;

    const patrimonioBase = patrimonioAntesDe(
      filtroAtivo.value.mesInicio,
      filtroAtivo.value.anoInicio
    );
    const patrimonioAtual = pontos.at(-1)?.patrimonio ?? patrimonioBase;
    const variacaoTotal = patrimonioAtual - patrimonioBase;
    const variacaoPercentual = patrimonioBase !== 0
      ? (variacaoTotal / Math.abs(patrimonioBase)) * 100
      : 0;

    // Dados do período mais recente no filtro (último mês ou último ano)
    const ultimoPonto = pontos.at(-1);
    const penultimoPonto = pontos.at(-2);
    const ganhosUltimoPeriodo = ultimoPonto?.ganhos ?? 0;
    const gastosUltimoPeriodo = ultimoPonto?.gastos ?? 0;
    const saldoUltimoPeriodo = ultimoPonto?.saldo ?? 0;
    const taxaPoupancaUltimoPeriodo = ultimoPonto?.taxaPoupanca ?? 0;
    const crescimentoUltimoPeriodo = ultimoPonto?.crescimento ?? 0;
    const patrimonioAnteriorUltimo = penultimoPonto?.patrimonio ?? patrimonioBase;
    const crescimentoPercUltimoPeriodo = patrimonioAnteriorUltimo !== 0
      ? (crescimentoUltimoPeriodo / Math.abs(patrimonioAnteriorUltimo)) * 100
      : 0;

    return {
      totalGanhos,
      totalGastos,
      saldoLiquido,
      taxaPoupanca,
      patrimonioAtual,
      patrimonioBase,
      variacaoTotal,
      variacaoPercentual,
      ganhosUltimoPeriodo,
      gastosUltimoPeriodo,
      saldoUltimoPeriodo,
      taxaPoupancaUltimoPeriodo,
      crescimentoUltimoPeriodo,
      crescimentoPercUltimoPeriodo,
    };
  });

  // ── Estatísticas gerais (sem filtro, baseadas em todo histórico) ──
  const estatisticasGerais = computed<EstatisticasGerais>(() => {
    const todos = registrosOrdenados.value;
    if (!todos.length) {
      return {
        mediaGanhos12m: 0, mediaGastos12m: 0, mediaSaldo12m: 0,
        mediaTaxaPoupanca12m: 0, crescimentoMedioMensal: 0,
        maiorGanho: null, maiorGasto: null,
        maiorCrescimento: null, melhorTaxaPoupanca: null,
      };
    }

    // Últimos 12 meses
    const ultimos12 = todos.slice(-12);
    const n12 = ultimos12.length;

    const mediaGanhos12m = ultimos12.reduce((s, r) => s + r.ganhos, 0) / n12;
    const mediaGastos12m = ultimos12.reduce((s, r) => s + r.gastos, 0) / n12;
    const mediaSaldo12m = (mediaGanhos12m - mediaGastos12m);
    const mediaTaxaPoupanca12m = mediaGanhos12m > 0
      ? (mediaSaldo12m / mediaGanhos12m) * 100 : 0;

    // Pontos com patrimônio para calcular crescimento
    let acumulado = config.value.patrimonioInicial;
    const pontosCompletos = todos.map(r => {
      const anterior = acumulado;
      acumulado += r.ganhos - r.gastos;
      const saldo = r.ganhos - r.gastos;
      return {
        r,
        patrimonio: acumulado,
        saldo,
        crescimento: acumulado - anterior,
        taxaPoupanca: r.ganhos > 0 ? (saldo / r.ganhos) * 100 : 0,
      };
    });

    // Crescimento médio mensal (últimos 12)
    const ultimos12Pontos = pontosCompletos.slice(-12);
    const crescimentoMedioMensal = ultimos12Pontos.reduce((s, p) => s + p.crescimento, 0) / ultimos12Pontos.length;

    // Records históricos
    const maiorGanhoP = pontosCompletos.reduce((max, p) => p.r.ganhos > max.r.ganhos ? p : max, pontosCompletos[0]);
    const maiorGastoP = pontosCompletos.reduce((max, p) => p.r.gastos > max.r.gastos ? p : max, pontosCompletos[0]);
    const maiorCrescP = pontosCompletos.reduce((max, p) => p.crescimento > max.crescimento ? p : max, pontosCompletos[0]);
    const melhorPoupP = pontosCompletos.reduce((max, p) => p.taxaPoupanca > max.taxaPoupanca ? p : max, pontosCompletos[0]);

    return {
      mediaGanhos12m,
      mediaGastos12m,
      mediaSaldo12m,
      mediaTaxaPoupanca12m,
      crescimentoMedioMensal,
      maiorGanho: { valor: maiorGanhoP.r.ganhos, mes: maiorGanhoP.r.mes, ano: maiorGanhoP.r.ano },
      maiorGasto: { valor: maiorGastoP.r.gastos, mes: maiorGastoP.r.mes, ano: maiorGastoP.r.ano },
      maiorCrescimento: { valor: maiorCrescP.crescimento, mes: maiorCrescP.r.mes, ano: maiorCrescP.r.ano },
      melhorTaxaPoupanca: { valor: melhorPoupP.taxaPoupanca, mes: melhorPoupP.r.mes, ano: melhorPoupP.r.ano },
    };
  });

  // ── Metas (Ativa e Histórico) ─────────────────────────────
  const metaAtiva = computed<MetaPatrimonio | null>(() => {
    return config.value.metas.find(m => !m.dataConclusao) || null;
  });

  const metasConcluidas = computed<MetaPatrimonio[]>(() => {
    return [...config.value.metas]
      .filter(m => m.dataConclusao)
      .sort((a, b) => new Date(b.dataConclusao!).getTime() - new Date(a.dataConclusao!).getTime());
  });

  function adicionarMeta(valor: number) {
    if (valor <= 0) return;
    // Se já houver meta ativa, removemos ela para iniciar uma nova (mantendo apenas o histórico)
    const historico = config.value.metas.filter(m => m.dataConclusao);
    historico.push({
      id: generateId(),
      valor,
      dataInicio: new Date().toISOString(),
    });
    saveConfig({ metas: historico });
  }

  function removerMetaAtiva() {
    const historico = config.value.metas.filter(m => m.dataConclusao);
    saveConfig({ metas: historico });
  }

  // ── Projeção de meta ──────────────────────────────────────
  const projecaoMeta = computed<ProjecaoMeta | null>(() => {
    const metaObj = metaAtiva.value;
    if (!metaObj) return null;
    const meta = metaObj.valor;

    const patrimonioAtual = patrimonioAtualGeral.value;
    const percentualAtingido = Math.min((patrimonioAtual / meta) * 100, 100);
    const valorRestante = Math.max(meta - patrimonioAtual, 0);
    const crescimentoMedio = estatisticasGerais.value.crescimentoMedioMensal;

    let mesesRestantes: number | null = null;
    let dataEstimada: string | null = null;

    if (patrimonioAtual >= meta) {
      mesesRestantes = 0;
      dataEstimada = 'Meta atingida! 🎉';
    } else if (crescimentoMedio > 0) {
      mesesRestantes = Math.ceil(valorRestante / crescimentoMedio);
      const hoje = new Date();
      const { mes, ano } = adicionarMeses(hoje.getMonth() + 1, hoje.getFullYear(), mesesRestantes);
      dataEstimada = `${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][mes - 1]}/${ano}`;
    }

    return { patrimonioAtual, meta, percentualAtingido, valorRestante, mesesRestantes, dataEstimada };
  });

  // Watcher para registrar a data de conclusão da meta automaticamente
  if (!inicializado) { // Roda uma única vez
    watch(
      () => [patrimonioAtualGeral.value, metaAtiva.value],
      ([atual, metaObj]) => {
        if (metaObj && typeof metaObj === 'object') {
          const m = metaObj as MetaPatrimonio;
          if ((atual as number) >= m.valor && !m.dataConclusao) {
            // Atingiu a meta agora, clone e atualiza
            const clone = [...config.value.metas];
            const idx = clone.findIndex(x => x.id === m.id);
            if (idx !== -1) {
              clone[idx] = { ...clone[idx], dataConclusao: new Date().toISOString() };
              saveConfig({ metas: clone });
            }
          }
        }
      }
    );
  }


  // ── Médias e desvio padrão (período filtrado) ────────────
  const mediasDesvio = computed(() => {
    const regs = registrosFiltrados.value;
    const n = regs.length;
    if (n === 0) return { mediaGanhos: 0, dpGanhos: 0, mediaGastos: 0, dpGastos: 0 };

    const mediaGanhos = regs.reduce((s, r) => s + r.ganhos, 0) / n;
    const mediaGastos = regs.reduce((s, r) => s + r.gastos, 0) / n;
    const dpGanhos = Math.sqrt(regs.reduce((s, r) => s + Math.pow(r.ganhos - mediaGanhos, 2), 0) / n);
    const dpGastos = Math.sqrt(regs.reduce((s, r) => s + Math.pow(r.gastos - mediaGastos, 2), 0) / n);

    return { mediaGanhos, dpGanhos, mediaGastos, dpGastos };
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

  function recarregarDados() {
    registros.value = storage.getRegistros();
    config.value = storage.getConfig();
  }

  // ── Filtro ────────────────────────────────────────────────

  function setFiltro(novoFiltro: Partial<FiltroPeriodo>) {
    filtroAtivo.value = normalizarFiltro({ ...filtroAtivo.value, ...novoFiltro });
  }

  function resetarFiltro() {
    filtroAtivo.value = gerarFiltroDefault();
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
    filtro: filtroAtivo,
    // Computed
    estatisticas,
    estatisticasGerais,
    projecaoMeta,
    mediasDesvio,
    pontosGrafico,
    patrimonioAtualGeral,
    patrimonioAcumulado,
    metaAtiva,
    metasConcluidas,
    // CRUD
    addRegistro,
    updateRegistro,
    deleteRegistro,
    // Config
    saveConfig,
    resetarDados,
    recarregarDados,
    adicionarMeta,
    removerMetaAtiva,
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
  // Últimos 12 meses por padrão
  const mesInicio = mesAtual === 12 ? 12 : mesAtual + 1;
  return {
    mesInicio: mesInicio > 12 ? 1 : mesInicio,
    anoInicio: anoAtual - 1,
    mesFim: mesAtual,
    anoFim: anoAtual,
    tipo: 'meses',
  };
}

/**
 * Garante que o início do período não seja posterior ao fim. Com seletores
 * independentes é fácil inverter as pontas, o que sem isso resultaria numa
 * tela vazia sem explicação.
 */
function normalizarFiltro(f: FiltroPeriodo): FiltroPeriodo {
  // Na visão de anos a janela cobre sempre Jan→Dez: só os anos podem inverter,
  // e os meses são forçados para não sobrar resíduo da visão de meses.
  if (f.tipo === 'anos') {
    const inverter = f.anoInicio > f.anoFim;
    return {
      ...f,
      mesInicio: 1,
      anoInicio: inverter ? f.anoFim : f.anoInicio,
      mesFim: 12,
      anoFim: inverter ? f.anoInicio : f.anoFim,
    };
  }

  if (f.anoInicio * 100 + f.mesInicio <= f.anoFim * 100 + f.mesFim) return f;
  return {
    ...f,
    mesInicio: f.mesFim,
    anoInicio: f.anoFim,
    mesFim: f.mesInicio,
    anoFim: f.anoInicio,
  };
}
