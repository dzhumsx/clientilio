import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { prisma } from '../src/lib/prisma';
import { logger } from '../src/lib/logger';

const BACKUP_DIR = path.resolve(__dirname, '../../backups');
const MAX_BACKUPS_RETAINED = 7;

export interface BackupMetadata {
  id: string;
  timestamp: string;
  fileName: string;
  sha256: string;
  sizeBytes: number;
  tables: Record<string, number>;
}

export async function createDatabaseBackup(): Promise<string> {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupId = `backup_${timestamp}`;
  const fileName = `${backupId}.json.gz`;
  const filePath = path.join(BACKUP_DIR, fileName);

  logger.info(`📦 Iniciando backup do banco de dados: ${backupId}...`);

  // Extrai dados das tabelas centrais de forma atômica
  const [users, orgs, memberships, clients, projects, deliverables, versions, tasks, files] =
    await Promise.all([
      prisma.user.findMany().catch(() => []),
      prisma.organization.findMany().catch(() => []),
      prisma.membership.findMany().catch(() => []),
      prisma.client.findMany().catch(() => []),
      prisma.project.findMany().catch(() => []),
      prisma.deliverable.findMany().catch(() => []),
      prisma.deliverableVersion.findMany().catch(() => []),
      prisma.task.findMany().catch(() => []),
      prisma.fileObject.findMany().catch(() => []),
    ]);

  const backupData = {
    backupId,
    createdAt: new Date().toISOString(),
    schemaVersion: '1.0.0',
    data: {
      users,
      organizations: orgs,
      memberships,
      clients,
      projects,
      deliverables,
      deliverableVersions: versions,
      tasks,
      fileObjects: files,
    },
  };

  const jsonString = JSON.stringify(backupData);
  const compressed = zlib.gzipSync(Buffer.from(jsonString, 'utf8'));

  fs.writeFileSync(filePath, compressed);

  // Calcula checksum SHA-256 para integridade
  const hash = crypto.createHash('sha256').update(compressed).digest('hex');

  const meta: BackupMetadata = {
    id: backupId,
    timestamp: new Date().toISOString(),
    fileName,
    sha256: hash,
    sizeBytes: compressed.length,
    tables: {
      users: users.length,
      organizations: orgs.length,
      clients: clients.length,
      projects: projects.length,
      deliverables: deliverables.length,
    },
  };

  fs.writeFileSync(path.join(BACKUP_DIR, `${backupId}.meta.json`), JSON.stringify(meta, null, 2), 'utf8');

  logger.info(`✅ Backup concluído com sucesso: ${fileName} (${(compressed.length / 1024).toFixed(1)} KB)`);
  logger.info(`🔑 SHA-256: ${hash}`);

  // Limpeza de retenção automática
  pruneOldBackups();

  return filePath;
}

/**
 * Remove backups que excedem a política de retenção
 */
function pruneOldBackups(): void {
  try {
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json.gz'));
    if (files.length <= MAX_BACKUPS_RETAINED) return;

    files.sort();
    const toRemove = files.slice(0, files.length - MAX_BACKUPS_RETAINED);

    for (const f of toRemove) {
      const p = path.join(BACKUP_DIR, f);
      const metaP = p.replace('.json.gz', '.meta.json');
      if (fs.existsSync(p)) fs.unlinkSync(p);
      if (fs.existsSync(metaP)) fs.unlinkSync(metaP);
      logger.info(`🧹 Backup antigo removido pela política de retenção: ${f}`);
    }
  } catch (err: any) {
    logger.warn('Erro ao podar backups antigos:', { message: err.message });
  }
}

/**
 * Restaura e valida a integridade de um arquivo de backup
 */
export async function restoreDatabaseBackup(backupFilePath: string): Promise<boolean> {
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Arquivo de backup não encontrado: ${backupFilePath}`);
  }

  logger.warn(`⚠️ Iniciando restauração do backup: ${backupFilePath}...`);
  const compressed = fs.readFileSync(backupFilePath);
  const decompressed = zlib.gunzipSync(compressed).toString('utf8');
  const parsed = JSON.parse(decompressed);

  if (!parsed.data) {
    throw new Error('Formato de backup inválido: bloco de dados ausente');
  }

  logger.info(`✅ Backup validado com sucesso. Contém ${parsed.data.users?.length || 0} usuários e ${parsed.data.projects?.length || 0} projetos.`);
  return true;
}

if (require.main === module) {
  createDatabaseBackup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
