<template>
  <div class="folego-card" :class="nivel">
    <div class="fc-top">
      <div class="fc-titulo">
        <ion-icon :icon="shieldCheckmarkOutline" class="fc-icone" />
        <span>Fôlego</span>
      </div>
      <span v-if="compacto && folego.meses !== null" class="fc-badge">{{ rotuloJanela }}</span>
    </div>

    <!-- Sem gastos na janela: o fôlego é indefinido, não infinito -->
    <template v-if="folego.meses === null">
      <p class="fc-valor indefinido">—</p>
      <p class="fc-sub">Registre um mês com gastos para calcular.</p>
    </template>

    <template v-else>
      <p class="fc-valor">
        {{ mesesFormatados }}<span class="fc-unidade">{{ folego.meses === 1 ? ' mês' : ' meses' }}</span>
      </p>
      <p class="fc-humano">≈ {{ descreverMeses(folego.meses) }}</p>

      <template v-if="!compacto">
        <p class="fc-contexto">
          Gasto médio de <strong>{{ formatCurrency(folego.mediaGastos) }}</strong> · {{ rotuloJanela }}
          <template v-if="folego.mesesConsiderados < mesesPedidos">
            ({{ folego.mesesConsiderados }} {{ folego.mesesConsiderados === 1 ? 'mês' : 'meses' }} registrados)
          </template>
        </p>

        <p v-if="faixa" class="fc-faixa">
          Entre <strong>{{ faixa.min.toFixed(0) }}</strong> e <strong>{{ faixa.max.toFixed(0) }}</strong> meses,
          conforme seus gastos variem.
        </p>
      </template>
    </template>

    <!-- Seletor de janela -->
    <ion-segment
      v-if="!compacto"
      class="fc-segment"
      :value="String(janela)"
      @ion-change="(e: any) => emit('update:janela', Number(e.detail.value) as JanelaFolego)"
    >
      <ion-segment-button
        v-for="opcao in OPCOES_JANELA"
        :key="opcao.valor"
        :value="String(opcao.valor)"
      >
        <ion-label>{{ opcao.label }}</ion-label>
      </ion-segment-button>
    </ion-segment>

    <!-- O app não distingue ativo líquido de ilíquido: omitir isso tornaria o
         número enganoso para quem tem patrimônio preso em imóvel ou aplicação. -->
    <p v-if="!compacto" class="fc-nota">
      Considera todo o patrimônio como disponível.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonIcon, IonSegment, IonSegmentButton, IonLabel } from '@ionic/vue';
import { shieldCheckmarkOutline } from 'ionicons/icons';
import { formatCurrency, descreverMeses, type JanelaFolego } from '../types';
import { faixaFolego, type Folego } from '../domain/runway';

const props = withDefaults(defineProps<{
  folego: Folego;
  janela: JanelaFolego;
  reservaAlvoMeses?: number;
  /** Versão reduzida para a Home: sem seletor, contexto nem nota */
  compacto?: boolean;
}>(), {
  reservaAlvoMeses: 6,
  compacto: false,
});

const emit = defineEmits<{ 'update:janela': [JanelaFolego] }>();

const OPCOES_JANELA: { valor: JanelaFolego; label: string }[] = [
  { valor: 3, label: '3m' },
  { valor: 6, label: '6m' },
  { valor: 12, label: '12m' },
  { valor: 0, label: 'Tudo' },
];

const rotuloJanela = computed(() =>
  props.janela === 0 ? 'todo o histórico' : `últimos ${props.janela} meses`
);

const mesesPedidos = computed(() => props.janela === 0 ? Infinity : props.janela);

const mesesFormatados = computed(() => {
  const m = props.folego.meses ?? 0;
  // Abaixo de 10 meses cada décimo importa; acima disso a casa decimal é ruído.
  return m >= 10 ? m.toFixed(0) : m.toFixed(1).replace('.', ',');
});

const faixa = computed(() => faixaFolego(props.folego));

/** Verde a partir da reserva desejada, ouro na metade dela, vermelho abaixo. */
const nivel = computed(() => {
  const m = props.folego.meses;
  if (m === null) return 'neutro';
  if (m >= props.reservaAlvoMeses) return 'confortavel';
  if (m >= props.reservaAlvoMeses / 2) return 'atencao';
  return 'critico';
});
</script>

<style scoped>
.folego-card {
  background: var(--cofre-surface);
  border-radius: var(--cofre-radius-lg);
  border: 1px solid var(--cofre-border);
  padding: 16px;
}
.folego-card.confortavel { border-color: var(--cofre-green-border); background: var(--cofre-green-subtle); }
.folego-card.atencao { border-color: var(--cofre-gold-border); background: var(--cofre-gold-subtle); }
.folego-card.critico { border-color: var(--cofre-red-border); background: var(--cofre-red-subtle); }

.fc-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 8px; margin-bottom: 10px; }
.fc-titulo {
  display: flex; align-items: center; gap: 6px;
  font-size: var(--cofre-fs-2xs); font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--cofre-text-muted);
}
.fc-icone { font-size: var(--cofre-fs-base); }
.confortavel .fc-icone { color: var(--cofre-green); }
.atencao .fc-icone { color: var(--cofre-gold); }
.critico .fc-icone { color: var(--cofre-red); }
.neutro .fc-icone { color: var(--cofre-text-subtle); }

.fc-badge {
  font-size: var(--cofre-fs-3xs); color: var(--cofre-text-subtle); white-space: nowrap;
  background: var(--cofre-overlay); border-radius: var(--cofre-radius-sm); padding: 2px 6px;
}

.fc-valor {
  font-size: var(--cofre-fs-2xl); font-weight: 800; color: var(--cofre-text);
  margin: 0 0 2px; letter-spacing: -0.02em; line-height: 1.1;
}
.confortavel .fc-valor { color: var(--cofre-green); }
.atencao .fc-valor { color: var(--cofre-gold); }
.critico .fc-valor { color: var(--cofre-red); }
.fc-valor.indefinido { color: var(--cofre-text-faint); }
.fc-unidade { font-size: var(--cofre-fs-md); font-weight: 600; opacity: 0.7; }

.fc-humano { font-size: var(--cofre-fs-xs); color: var(--cofre-text-muted); margin: 0; }
.fc-sub { font-size: var(--cofre-fs-xs); color: var(--cofre-text-subtle); margin: 0; line-height: 1.5; }

.fc-contexto { font-size: var(--cofre-fs-xs); color: var(--cofre-text-muted); margin: 12px 0 0; line-height: 1.5; }
.fc-contexto strong { color: var(--cofre-text-soft); font-weight: 700; }

.fc-faixa {
  font-size: var(--cofre-fs-xs); color: var(--cofre-text-muted); margin: 6px 0 0; line-height: 1.5;
}
.fc-faixa strong { color: var(--cofre-text-soft); font-weight: 700; }

.fc-segment {
  margin-top: 14px;
  --background: var(--cofre-overlay);
  border-radius: var(--cofre-radius-md);
}
.fc-segment ion-segment-button {
  --color: var(--cofre-text-subtle);
  --color-checked: var(--cofre-text);
  --indicator-color: var(--cofre-border-strong);
  --border-radius: var(--cofre-radius-sm);
  min-height: 30px;
  font-size: var(--cofre-fs-2xs);
  font-weight: 600;
  text-transform: none;
}

.fc-nota { font-size: var(--cofre-fs-2xs); color: var(--cofre-text-faint); margin: 10px 0 0; line-height: 1.4; }
</style>
