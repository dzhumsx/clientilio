import { migrationManager, MigrationStep } from '../src/lib/migration-manager';
import { createDatabaseBackup } from './backup';
import { prisma } from '../src/lib/prisma';

// Registro de migrações gerenciadas e reversíveis
const migrations: MigrationStep[] = [
  {
    id: '001_initial_schema_baseline',
    name: 'Criação da estrutura base de dados e índices multi-tenant',
    up: async () => {
      // Garante índices compostos críticos
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_memberships_user_org ON memberships(user_id, organization_id);
      `).catch(() => {});
    },
    down: async () => {
      await prisma.$executeRawUnsafe(`
        DROP INDEX IF EXISTS idx_memberships_user_org;
      `).catch(() => {});
    },
  },
  {
    id: '002_security_audit_and_mfa',
    name: 'Criação de índices para auditoria de segurança e performance',
    up: async () => {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs(actor_id, created_at DESC);
      `).catch(() => {});
    },
    down: async () => {
      await prisma.$executeRawUnsafe(`
        DROP INDEX IF EXISTS idx_audit_logs_actor_created;
      `).catch(() => {});
    },
  },
];

async function main() {
  const action = process.argv[2] || 'up';

  if (action === 'down' || action === 'rollback') {
    console.log('⏪ Solicitada reversão (ROLLBACK) da última migração aplicada...');
    const result = await migrationManager.rollbackLastMigration(migrations);
    if (result.rolledBack) {
      console.log(`✔️ Rollback da migração ${result.rolledBack} executado com sucesso.`);
    }
  } else {
    console.log('🚀 Executando migrações pendentes...');
    // Backup pré-migração por segurança
    await createDatabaseBackup().catch((e) => console.warn('Aviso: backup pré-migração:', e.message));
    const result = await migrationManager.runMigrations(migrations);
    console.log(`✔️ Migrações aplicadas: ${result.applied.length > 0 ? result.applied.join(', ') : 'Nenhuma pendente'}`);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Erro na execução de migração:', err);
      process.exit(1);
    });
}
