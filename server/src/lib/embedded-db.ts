import net from 'net';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const globalForDb = globalThis as unknown as {
  pgliteServerInstance: PGLiteSocketServer | undefined;
};

/**
 * Checks if a TCP port is currently open and accepting connections
 */
function isPortInUse(port: number, host: string = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);

    socket.once('connect', () => {
      socket.destroy();
      resolve(true); // Port is already bound and listening
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.once('error', () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

/**
 * Starts an embedded PostgreSQL (PGlite) server if no PostgreSQL instance is currently running locally
 */
export async function ensureDatabaseRunning(): Promise<boolean> {
  // Only attempt embedded database in development mode
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  const databaseUrl = process.env.DATABASE_URL || '';
  const isLocalDb =
    databaseUrl.includes('localhost') ||
    databaseUrl.includes('127.0.0.1') ||
    databaseUrl === '';

  if (!isLocalDb) {
    // Using a remote database (e.g. Neon, Supabase, Railway)
    return false;
  }

  const port = 5432;
  const inUse = await isPortInUse(port, '127.0.0.1');

  if (inUse) {
    console.log(`🔌 PostgreSQL já está ativo na porta ${port}. Conectando...`);
    return false;
  }

  try {
    console.log(`🚀 Iniciando PostgreSQL local embutido (PGlite) na porta ${port}...`);
    const dataDir = path.join(process.cwd(), '.pgdata');
    const db = await PGlite.create({ dataDir });

    globalForDb.pgliteServerInstance = new PGLiteSocketServer({
      db,
      port,
      host: '127.0.0.1',
    });

    await globalForDb.pgliteServerInstance.start();
    console.log(`✅ Banco de dados PostgreSQL local pronto e persistido em .pgdata na porta ${port}!`);
    return true;
  } catch (err: any) {
    console.warn(`⚠️ Não foi possível iniciar o PGlite embutido na porta ${port}:`, err.message);
    return false;
  }
}

/**
 * Stop the embedded database gracefully on server shutdown
 */
export async function stopEmbeddedDatabase(): Promise<void> {
  if (globalForDb.pgliteServerInstance) {
    try {
      console.log('🛑 Encerrando banco de dados local embutido...');
      await globalForDb.pgliteServerInstance.stop();
      globalForDb.pgliteServerInstance = undefined;
      console.log('💤 Banco de dados local encerrado.');
    } catch (err: any) {
      console.warn('Erro ao encerrar banco embutido:', err.message);
    }
  }
}
