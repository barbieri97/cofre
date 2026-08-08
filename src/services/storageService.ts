// ============================================================
// Serviço de Persistência — LocalStorage
// Isola toda lógica de armazenamento. Para migrar para
// SQLite/IndexedDB basta reimplementar aqui.
// ============================================================

import type { RegistroMensal, ConfigApp, Objetivo, MetaPatrimonio } from '../types';
import { formatCurrency } from '../types';

const KEYS = {
  REGISTROS: 'cofre_registros',
  CONFIG: 'cofre_config',
  OBJETIVOS: 'cofre_objetivos',
  SCHEMA: 'cofre_schema_version',
} as const;

/** Versão de schema que este código entende. Subir junto com uma migração nova. */
export const SCHEMA_VERSION = 3;

const CONFIG_PADRAO: ConfigApp = {
  patrimonioInicial: 0,
  primeiroUso: true,
  janelaFolego: 12,
  reservaAlvoMeses: 6,
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
    // Leitura pura: as migrações rodam uma única vez em migrarSchema().
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

// ── Objetivos ────────────────────────────────────────────────

export function getObjetivos(): Objetivo[] {
  try {
    const raw = localStorage.getItem(KEYS.OBJETIVOS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Objetivo[]) : [];
  } catch {
    console.error('[StorageService] Erro ao ler objetivos');
    return [];
  }
}

export function saveObjetivos(objetivos: Objetivo[]): void {
  try {
    localStorage.setItem(KEYS.OBJETIVOS, JSON.stringify(objetivos));
  } catch (e) {
    console.error('[StorageService] Erro ao salvar objetivos', e);
  }
}

// ── Migrações de schema ──────────────────────────────────────

function novoId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Detecta a versão de dados já gravada. Versões < 3 não gravavam número de
 * schema, então são inferidas pelo formato: `metaPatrimonio` solto = v1,
 * `metas[]` dentro da config = v2.
 */
function detectarVersao(configBruta: Record<string, unknown> | null): number {
  const gravada = Number(localStorage.getItem(KEYS.SCHEMA));
  if (Number.isFinite(gravada) && gravada > 0) return gravada;
  if (!configBruta) return SCHEMA_VERSION; // instalação nova: nada a migrar
  if (configBruta.metaPatrimonio !== undefined) return 1;
  if (Array.isArray(configBruta.metas)) return 2;
  return 1;
}

/** v1 → v2: meta única em campos soltos vira o array `metas`. */
function migrar1para2(cfg: Record<string, any>): Record<string, any> {
  if (cfg.metaPatrimonio !== undefined) {
    cfg.metas = [{
      id: novoId(),
      valor: cfg.metaPatrimonio,
      dataInicio: cfg.metaDataInicio || new Date().toISOString(),
      dataConclusao: cfg.metaDataConclusao,
    } satisfies MetaPatrimonio];
  }
  delete cfg.metaPatrimonio;
  delete cfg.metaDataInicio;
  delete cfg.metaDataConclusao;
  if (!Array.isArray(cfg.metas)) cfg.metas = [];
  return cfg;
}

/**
 * v2 → v3: `config.metas[]` vira a coleção própria `cofre_objetivos`, ganhando
 * nome e campos de auditoria. Também remove `moeda`/`simboloMoeda`, que eram
 * gravados mas nunca lidos.
 */
function migrar2para3(cfg: Record<string, any>): { config: Record<string, any>; objetivos: Objetivo[] } {
  const metas: MetaPatrimonio[] = Array.isArray(cfg.metas) ? cfg.metas : [];

  let principalDefinido = false;
  const objetivos: Objetivo[] = metas.map(m => {
    const inicio = m.dataInicio || new Date().toISOString();
    // A primeira meta ainda em aberto vira o objetivo principal da Home.
    const principal = !m.dataConclusao && !principalDefinido;
    if (principal) principalDefinido = true;
    return {
      id: m.id || novoId(),
      nome: `Objetivo ${formatCurrency(m.valor)}`,
      valor: m.valor,
      dataInicio: inicio,
      dataConclusao: m.dataConclusao,
      principal,
      criadoEm: inicio,
      atualizadoEm: inicio,
    };
  });

  delete cfg.metas;
  delete cfg.moeda;
  delete cfg.simboloMoeda;
  return { config: cfg, objetivos };
}

/**
 * Roda todas as migrações pendentes. Chamado uma única vez em main.ts, antes
 * do mount — nenhum getter grava por conta própria.
 *
 * Idempotente: ao terminar grava SCHEMA_VERSION, e uma segunda chamada
 * encontra a versão em dia e não faz nada.
 */
export function migrarSchema(): void {
  try {
    const rawConfig = localStorage.getItem(KEYS.CONFIG);
    const temDados = rawConfig !== null || localStorage.getItem(KEYS.REGISTROS) !== null;

    if (!temDados) {
      localStorage.setItem(KEYS.SCHEMA, String(SCHEMA_VERSION));
      return;
    }

    let cfg: Record<string, any> = rawConfig ? JSON.parse(rawConfig) : {};
    let versao = detectarVersao(rawConfig ? cfg : null);
    if (versao >= SCHEMA_VERSION) {
      localStorage.setItem(KEYS.SCHEMA, String(SCHEMA_VERSION));
      return;
    }

    if (versao === 1) {
      cfg = migrar1para2(cfg);
      versao = 2;
    }
    if (versao === 2) {
      const { config, objetivos } = migrar2para3(cfg);
      cfg = config;
      // Preserva objetivos já existentes (não deve acontecer na v2, mas evita
      // perder dados se a chave tiver sido escrita por outra via).
      const existentes = getObjetivos();
      const idsExistentes = new Set(existentes.map(o => o.id));
      saveObjetivos([...existentes, ...objetivos.filter(o => !idsExistentes.has(o.id))]);
      versao = 3;
    }

    localStorage.setItem(KEYS.CONFIG, JSON.stringify(cfg));
    localStorage.setItem(KEYS.SCHEMA, String(SCHEMA_VERSION));
  } catch (e) {
    console.error('[StorageService] Erro ao migrar schema', e);
  }
}

// ── Backup / Restore ─────────────────────────────────────────

export interface BackupData {
  versao: string;
  exportadoEm: string;
  config: ConfigApp;
  registros: RegistroMensal[];
  objetivos: Objetivo[];
}

export function exportarBackup(): string {
  const backup: BackupData = {
    versao: String(SCHEMA_VERSION),
    exportadoEm: new Date().toISOString(),
    config: getConfig(),
    registros: getRegistros(),
    objetivos: getObjetivos(),
  };
  return JSON.stringify(backup, null, 2);
}

export function importarBackup(json: string): { ok: boolean; mensagem: string } {
  try {
    const backup = JSON.parse(json) as Partial<BackupData>;
    if (!backup.registros || !Array.isArray(backup.registros)) {
      return { ok: false, mensagem: 'Arquivo inválido: registros não encontrados.' };
    }

    // Grava o payload cru e deixa migrarSchema() normalizá-lo. Assim um backup
    // antigo (v1/v2, com metas dentro da config) é convertido na importação em
    // vez de entrar no app num formato que o código atual não entende mais.
    saveRegistros(backup.registros);
    localStorage.setItem(KEYS.CONFIG, JSON.stringify(backup.config ?? {}));
    saveObjetivos(Array.isArray(backup.objetivos) ? backup.objetivos : []);

    const versaoBackup = Number(backup.versao);
    localStorage.setItem(
      KEYS.SCHEMA,
      String(Number.isFinite(versaoBackup) && versaoBackup > 0 ? Math.floor(versaoBackup) : 1)
    );
    migrarSchema();

    return { ok: true, mensagem: `${backup.registros.length} registros importados com sucesso!` };
  } catch {
    return { ok: false, mensagem: 'Erro ao ler o arquivo. Verifique se é um backup válido do Cofre.' };
  }
}

// ── Utilitários ──────────────────────────────────────────────

export function clearAllData(): void {
  localStorage.removeItem(KEYS.REGISTROS);
  localStorage.removeItem(KEYS.CONFIG);
  localStorage.removeItem(KEYS.OBJETIVOS);
  localStorage.removeItem(KEYS.SCHEMA);
}
