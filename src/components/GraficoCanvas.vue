<template>
  <div class="grafico-wrap" :style="{ height: height + 'px' }">
    <Line v-if="tipo === 'linha' || tipo === 'linha-comparativo'" :data="chartData" :options="chartOptions" class="grafico-canvas" />
    <Bar v-else-if="tipo === 'barra'" :data="chartData" :options="chartOptions" class="grafico-canvas" />
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

const props = withDefaults(defineProps<{
  dados: PontoGrafico[];
  tipo?: 'linha' | 'barra' | 'linha-comparativo';
  height?: number;
}>(), {
  tipo: 'linha',
  height: 240,
});

const chartData = computed(() => {
  const labels = props.dados.map(d => d.label);
  
  if (props.tipo === 'linha') {
    return {
      labels,
      datasets: [{
        label: 'Patrimônio',
        data: props.dados.map(d => d.patrimonio),
        borderColor: '#6366F1', // Roxo premium como destaque patrimonial
        backgroundColor: 'rgba(99,102,241,0.2)',
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#161B22',
        pointBorderColor: '#6366F1',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      }]
    };
  } else if (props.tipo === 'linha-comparativo') {
    return {
      labels,
      datasets: [
        {
          label: 'Ganhos',
          data: props.dados.map(d => d.ganhos),
          borderColor: '#10B981',
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          tension: 0.4,
          pointBackgroundColor: '#161B22',
          pointBorderColor: '#10B981',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Gastos',
          data: props.dados.map(d => d.gastos),
          borderColor: '#EF4444',
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          tension: 0.4,
          pointBackgroundColor: '#161B22',
          pointBorderColor: '#EF4444',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        }
      ]
    };
  } else {
    // barra mista: ganhos (positivo), gastos (negativo), saldo como linha
    const saldos = props.dados.map(d => d.saldo);
    return {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: 'Ganhos',
          data: props.dados.map(d => d.ganhos),
          backgroundColor: 'rgba(16,185,129,0.75)',
          borderColor: '#10B981',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.8,
          order: 2,
        },
        {
          type: 'bar' as const,
          label: 'Despesas',
          data: props.dados.map(d => -d.gastos),
          backgroundColor: 'rgba(239,68,68,0.75)',
          borderColor: '#EF4444',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.8,
          order: 2,
        },
        {
          type: 'line' as const,
          label: 'Saldo',
          data: saldos,
          borderColor: '#6366F1',
          backgroundColor: 'rgba(99,102,241,0.12)',
          borderWidth: 2.5,
          tension: 0.4,
          fill: false,
          pointBackgroundColor: '#6366F1',
          pointBorderColor: '#6366F1',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          order: 1,
        }
      ]
    };
  }
});

const chartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    color: '#9CA3AF',
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: props.tipo !== 'linha',
        position: 'bottom' as const,
        labels: {
          color: '#9CA3AF',
          usePointStyle: true,
          boxWidth: 8,
          padding: 20,
          font: { family: 'Inter', size: 11, weight: 'bold' } as any
        }
      },
      tooltip: {
        backgroundColor: '#21262D',
        titleColor: '#F0F6FC',
        bodyColor: '#D1D5DB',
        borderColor: 'rgba(255,255,255,0.07)',
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
               label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
        ticks: { color: '#9CA3AF', font: { family: 'Inter', size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false },
        beginAtZero: props.tipo === 'barra',
        ticks: {
          color: '#9CA3AF',
          font: { family: 'Inter', size: 10 },
          maxTicksLimit: 6,
          callback: function(value: any) {
            if (Math.abs(value) >= 1000000) return (value / 1000000).toFixed(1) + 'M';
            if (Math.abs(value) >= 1000)    return (value / 1000).toFixed(1) + 'k';
            return value;
          }
        }
      }
    }
  };
});
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
