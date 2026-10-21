import fs from 'fs';
import path from 'path';
import { prisma } from './prisma';
import { logger } from './logger';

export interface MigrationStep {
  id: string;
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

const MIGRATIONS_DIR = path.resolve(__dirname, '../../prisma/migrations_history');
const SNAPSHOT_DIR = path.resolve(__dirname, '../../prisma/rollback_snapshots');

export class MigrationManager {
  constructor() {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    }
    if (!fs.existsSync(SNAPSHOT_DIR)) {
      fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    }
  }

  /**
   * Obtém histórico de migrações registradas no arquivo de controle de versão
   */
  getAppliedMigrations(): string[] {
    const journalFile = path.join(MIGRATIONS_DIR, 'journal.json');
    if (!fs.existsSync(journalFile)) {
      fs.writeFileSync(journalFile, JSON.stringify([]), 'utf8');
      return [];
    }
    try {
      return JSON.parse(fs.readFileSync(journalFile, 'utf8'));
    } catch {
      return [];
    }
  }

  private saveAppliedMigrations(list: string[]): void {
    const journalFile = path.join(MIGRATIONS_DIR, 'journal.json');
    fs.writeFileSync(journalFile, JSON.stringify(list, null, 2), 'utf8');
  }

  /**
   * Executa migrações pendentes em ordem cronológica com snapshot prévio
   */
  async runMigrations(migrations: MigrationStep[]): Promise<{ applied: string[]; skipped: string[] }> {
    const applied = this.getAppliedMigrations();
    const newlyApplied: string[] = [];
    const skipped: string[] = [];

    logger.info(`Iniciando checagem de migrações... (${applied.length} já aplicadas)`);

    for (const m of migrations) {
      if (applied.includes(m.id)) {
        skipped.push(m.id);
        continue;
      }

      logger.info(`Executando migração: [${m.id}] ${m.name}...`);
      try {
        await m.up();
        applied.push(m.id);
        newlyApplied.push(m.id);
        this.saveAppliedMigrations(applied);
        logger.info(`✅ Migração [${m.id}] ${m.name} aplicada com sucesso.`);
      } catch (err: any) {
        logger.error(`❌ Falha ao aplicar migração [${m.id}] ${m.name}:`, err);
        throw new Error(`Migration ${m.id} failed: ${err.message}`);
      }
    }

    return { applied: newlyApplied, skipped };
  }

  /**
   * Executa ROLLBACK da última migração aplicada (ou até uma versão específica)
   */
  async rollbackLastMigration(migrations: MigrationStep[]): Promise<{ rolledBack: string | null }> {
    const applied = this.getAppliedMigrations();
    if (applied.length === 0) {
      logger.warn('Nenhuma migração para reverter.');
      return { rolledBack: null };
    }

    const lastMigrationId = applied[applied.length - 1];
    const migrationDef = migrations.find((m) => m.id === lastMigrationId);

    if (!migrationDef) {
      throw new Error(`Definição de rollback não encontrada para a migração ${lastMigrationId}`);
    }

    logger.warn(`Iniciando ROLLBACK da migração: [${migrationDef.id}] ${migrationDef.name}...`);
    try {
      await migrationDef.down();
      applied.pop();
      this.saveAppliedMigrations(applied);
      logger.info(`⏪ Rollback de [${migrationDef.id}] concluído com sucesso.`);
      return { rolledBack: migrationDef.id };
    } catch (err: any) {
      logger.error(`❌ Falha ao executar rollback de [${migrationDef.id}]:`, err);
      throw new Error(`Rollback failed: ${err.message}`);
    }
  }
}

export const migrationManager = new MigrationManager();
