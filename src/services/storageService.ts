// ============================================================
// Serviço de Persistência — LocalStorage
// Essa camada isola toda a lógica de armazenamento.
// Para migrar para SQLite/IndexedDB, basta reimplementar aqui.
// ============================================================

import type { RegistroMensal, ConfigApp } from '../types';

const KEYS = {
  REGISTROS: 'cofre_registros',
  CONFIG: 'cofre_config',
} as const;

const CONFIG_PADRAO: ConfigApp = {
  patrimonioInicial: 0,
  moeda: 'BRL',
  simboloMoeda: 'R$',
  primeiroUso: true,
};

// ── Registros ────────────────────────────────────────────────

export function getRegistros(): RegistroMensal[] {
  try {
    const raw = localStorage.getItem(KEYS.REGISTROS);
    if (!raw) return [];
    return JSON.parse(raw) as RegistroMensal[];
  } catch {
    console.error('[StorageService] Erro ao ler registros');
    return [];
  }
}

export function saveRegistros(registros: RegistroMensal[]): void {
  try {
    localStorage.setItem(KEYS.REGISTROS, JSON.stringify(registros));
  } catch (e) {
    console.error('[StorageService] Erro ao salvar registros', e);
  }
}

// ── Configurações ────────────────────────────────────────────

export function getConfig(): ConfigApp {
  try {
    const raw = localStorage.getItem(KEYS.CONFIG);
    if (!raw) return { ...CONFIG_PADRAO };
    return { ...CONFIG_PADRAO, ...JSON.parse(raw) } as ConfigApp;
  } catch {
    console.error('[StorageService] Erro ao ler config');
    return { ...CONFIG_PADRAO };
  }
}

export function saveConfig(config: ConfigApp): void {
  try {
    localStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('[StorageService] Erro ao salvar config', e);
  }
}

// ── Utilitários ──────────────────────────────────────────────

export function clearAllData(): void {
  localStorage.removeItem(KEYS.REGISTROS);
  localStorage.removeItem(KEYS.CONFIG);
}
