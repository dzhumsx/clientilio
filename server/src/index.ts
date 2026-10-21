import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { ensureDatabaseRunning, stopEmbeddedDatabase } from './lib/embedded-db';

async function main() {
  // Automatically start embedded PostgreSQL database if running locally and port 5432 is free
  await ensureDatabaseRunning();

  const app = createApp();

  // Test DB connection
  try {
    await prisma.$connect();
    console.log('✅ Connected to database successfully.');

    // Auto-seed if the database is brand new (no users)
    const userCount = await prisma.user.count().catch(() => 0);
    if (userCount === 0) {
      console.log('🌱 First run: Seeding initial demo administrator account...');
      const { exec } = await import('child_process');
      exec('npx tsx prisma/seed.ts', (err, stdout) => {
        if (!err && stdout) console.log(stdout.trim());
      });
    }
  } catch (err: any) {
    console.warn('⚠️ Warning: Database connection check failed. Ensure PostgreSQL is running. Error:', err.message);
  }

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    console.log(`📡 Healthcheck available at http://localhost:${env.PORT}/health`);
    console.log(`🔒 Multi-tenant Client Management API ready.`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      await stopEmbeddedDatabase();
      console.log('💤 Server and DB connections closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
