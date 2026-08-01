// ============================================================
// Serviço de Persistência — LocalStorage
// Isola toda lógica de armazenamento. Para migrar para
// SQLite/IndexedDB basta reimplementar aqui.
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
  metas: [],
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

function generateMetaId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
}

export function getConfig(): ConfigApp {
  try {
    const raw = localStorage.getItem(KEYS.CONFIG);
    if (!raw) return { ...CONFIG_PADRAO };
    const parsed = JSON.parse(raw);
    
    // Migração de meta única para array de metas
    if (parsed.metaPatrimonio !== undefined && !parsed.metas) {
      parsed.metas = [{
        id: generateMetaId(),
        valor: parsed.metaPatrimonio,
        dataInicio: parsed.metaDataInicio || new Date().toISOString(),
        dataConclusao: parsed.metaDataConclusao
      }];
      delete parsed.metaPatrimonio;
      delete parsed.metaDataInicio;
      delete parsed.metaDataConclusao;
      localStorage.setItem(KEYS.CONFIG, JSON.stringify(parsed));
    }
    
    // Para garantir que o array metas sempre exista
    if (!parsed.metas) parsed.metas = [];

    return { ...CONFIG_PADRAO, ...parsed } as ConfigApp;
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

// ── Backup / Restore ─────────────────────────────────────────

export interface BackupData {
  versao: string;
  exportadoEm: string;
  config: ConfigApp;
  registros: RegistroMensal[];
}

export function exportarBackup(): string {
  const backup: BackupData = {
    versao: '2.0',
    exportadoEm: new Date().toISOString(),
    config: getConfig(),
    registros: getRegistros(),
  };
  return JSON.stringify(backup, null, 2);
}

export function importarBackup(json: string): { ok: boolean; mensagem: string } {
  try {
    const backup = JSON.parse(json) as BackupData;
    if (!backup.registros || !Array.isArray(backup.registros)) {
      return { ok: false, mensagem: 'Arquivo inválido: registros não encontrados.' };
    }
    if (backup.config) saveConfig({ ...CONFIG_PADRAO, ...backup.config });
    saveRegistros(backup.registros);
    return { ok: true, mensagem: `${backup.registros.length} registros importados com sucesso!` };
  } catch {
    return { ok: false, mensagem: 'Erro ao ler o arquivo. Verifique se é um backup válido do Cofre.' };
  }
}

// ── Utilitários ──────────────────────────────────────────────

export function clearAllData(): void {
  localStorage.removeItem(KEYS.REGISTROS);
  localStorage.removeItem(KEYS.CONFIG);
}
