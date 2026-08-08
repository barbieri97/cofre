<template>
  <div class="grafico-wrap" :style="{ height: height + 'px' }">
    <Line v-if="isLine" :data="(chartData as any)" :options="(chartOptions as any)" class="grafico-canvas" />
    <Bar v-else-if="isBar" :data="(chartData as any)" :options="(chartOptions as any)" class="grafico-canvas" />
    <p v-if="!dados.length" class="grafico-vazio">Sem dados para exibir</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PontoGrafico } from '../types';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  TooltipItem
} from 'chart.js';
import { Line, Bar } from 'vue-chartjs';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, Filler);

export type TipoGrafico =
  | 'patrimonio'
  | 'poupanca'
  | 'receita-despesa'
  | 'crescimento';

const props = withDefaults(defineProps<{
  dados: PontoGrafico[];
  tipo?: TipoGrafico;
  height?: number;
}>(), {
  tipo: 'patrimonio',
  height: 240,
});

const isLine = computed(() => ['patrimonio', 'poupanca'].includes(props.tipo));
const isBar = computed(() => ['receita-despesa', 'crescimento'].includes(props.tipo));

// ── Paleta de cores ──────────────────────────────────────────
const VERDE   = '#10B981';
const ROXO    = '#8B5CF6';
const ROXO_A  = 'rgba(139,92,246,0.18)';
const VERMELHO = '#EF4444';
const AZUL    = '#3B82F6';
const OURO    = '#F59E0B';
const OURO_A  = 'rgba(245,158,11,0.15)';

function lineDataset(label: string, data: number[], color: string, colorA: string) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: colorA,
    fill: true,
    borderWidth: 2.5,
    tension: 0.4,
    pointBackgroundColor: '#0D1117',
    pointBorderColor: color,
    pointBorderWidth: 2,
    pointRadius: props.dados.length > 24 ? 2 : 4,
    pointHoverRadius: 6,
  };
}

const chartData = computed(() => {
  const labels = props.dados.map(d => d.label);

  switch (props.tipo) {
    // ── Patrimônio ──────────────────────────────────────────
    case 'patrimonio':
      return {
        labels,
        datasets: [lineDataset('Patrimônio', props.dados.map(d => d.patrimonio), ROXO, ROXO_A)],
      };

    // ── Taxa de Poupança ────────────────────────────────────
    case 'poupanca':
      return {
        labels,
        datasets: [lineDataset('Taxa de Poupança (%)', props.dados.map(d => d.taxaPoupanca), OURO, OURO_A)],
      };

    // ── Receita vs Despesa (barras comparativas) ────────────
    case 'receita-despesa':
      return {
        labels,
        datasets: [
          {
            type: 'bar' as const,
            label: 'Receita',
            data: props.dados.map(d => d.ganhos),
            backgroundColor: 'rgba(16,185,129,0.7)',
            borderColor: VERDE,
            borderWidth: 1,
            borderRadius: 5,
            barPercentage: 0.5,
            categoryPercentage: 0.8,
            order: 2,
          },
          {
            type: 'bar' as const,
            label: 'Despesa',
            data: props.dados.map(d => d.gastos),
            backgroundColor: 'rgba(239,68,68,0.7)',
            borderColor: VERMELHO,
            borderWidth: 1,
            borderRadius: 5,
            barPercentage: 0.5,
            categoryPercentage: 0.8,
            order: 2,
          },
          {
            type: 'line' as const,
            label: 'Saldo',
            data: props.dados.map(d => d.saldo),
            borderColor: AZUL,
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            tension: 0.4,
            fill: false,
            pointBackgroundColor: AZUL,
            pointBorderColor: AZUL,
            pointRadius: 4,
            pointHoverRadius: 6,
            order: 1,
          },
        ],
      };

    // ── Crescimento patrimonial (barras) ────────────────────
    case 'crescimento': {
      const crescimentos = props.dados.map(d => d.crescimento);
      return {
        labels,
        datasets: [
          {
            type: 'bar' as const,
            label: 'Crescimento Patrimonial',
            data: crescimentos,
            backgroundColor: crescimentos.map(v => v >= 0 ? 'rgba(16,185,129,0.75)' : 'rgba(239,68,68,0.75)'),
            borderColor: crescimentos.map(v => v >= 0 ? VERDE : VERMELHO),
            borderWidth: 1,
            borderRadius: 5,
            order: 1,
          },
        ],
      };
    }

    default:
      return { labels, datasets: [] };
  }
});

// ── Opções do gráfico ────────────────────────────────────────
const isPoupanca = computed(() => props.tipo === 'poupanca');
const isMixed = computed(() => ['receita-despesa', 'crescimento'].includes(props.tipo));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  color: '#9CA3AF',
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      display: isMixed.value,
      position: 'bottom' as const,
      labels: {
        color: '#9CA3AF',
        usePointStyle: true,
        boxWidth: 8,
        padding: 20,
        font: { family: 'Inter', size: 11, weight: 'bold' } as any,
      },
    },
    tooltip: {
      backgroundColor: '#1C2233',
      titleColor: '#F0F6FC',
      bodyColor: '#D1D5DB',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      padding: 12,
      boxPadding: 6,
      usePointStyle: true,
      titleFont: { family: 'Inter', size: 13 },
      bodyFont: { family: 'Inter', size: 12 },
      callbacks: {
        label: function(context: TooltipItem<'line' | 'bar'>) {
          let label = context.dataset.label || '';
          if (label) label += ': ';
          if (context.parsed.y !== null) {
            if (isPoupanca.value) {
              label += context.parsed.y.toFixed(1) + '%';
            } else {
              label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
            }
          }
          return label;
        },
      },
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.03)' },
      ticks: { color: '#6B7280', font: { family: 'Inter', size: 10 } },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.05)' },
      beginAtZero: isMixed.value,
      ticks: {
        color: '#6B7280',
        font: { family: 'Inter', size: 10 },
        maxTicksLimit: 6,
        callback: function(value: any) {
          if (isPoupanca.value) return value.toFixed(0) + '%';
          if (Math.abs(value) >= 1000000) return (value / 1000000).toFixed(1) + 'M';
          if (Math.abs(value) >= 1000) return (value / 1000).toFixed(0) + 'k';
          return value;
        },
      },
    },
  },
}));
</script>

<style scoped>
.grafico-wrap {
  position: relative;
  width: 100%;
  padding: 12px;
  background: transparent;
  transition: all 0.3s ease;
}

.grafico-canvas {
  width: 100%;
  height: 100%;
}

.grafico-vazio {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6B7280;
  font-size: 0.85rem;
  pointer-events: none;
}
</style>
