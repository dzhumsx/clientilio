import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

async function main() {
  const app = createApp();

  // Test DB connection if DATABASE_URL is reachable
  try {
    await prisma.$connect();
    console.log('✅ Connected to database successfully.');
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
