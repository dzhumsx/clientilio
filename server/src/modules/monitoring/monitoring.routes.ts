import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import os from 'os';

const router = Router();
const startupTime = Date.now();

let requestCount = 0;
let errorCount = 0;

export function incrementRequestMetrics(isError: boolean = false) {
  requestCount++;
  if (isError) errorCount++;
}

// GET /api/monitoring/health — Detalhamento completo da saúde dos subsistemas
router.get('/health', async (_req: Request, res: Response) => {
  const startDb = Date.now();
  let dbStatus = 'UP';
  let dbLatencyMs = 0;
  let dbError: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - startDb;
  } catch (err: any) {
    dbStatus = 'DOWN';
    dbError = err.message;
    dbLatencyMs = Date.now() - startDb;
  }

  const memory = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  const isHealthy = dbStatus === 'UP';

  const healthPayload = {
    status: isHealthy ? 'UP' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    uptimeFormatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
    components: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        provider: 'PostgreSQL',
        error: dbError,
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      memory: {
        rssMb: +(memory.rss / (1024 * 1024)).toFixed(2),
        heapUsedMb: +(memory.heapUsed / (1024 * 1024)).toFixed(2),
        heapTotalMb: +(memory.heapTotal / (1024 * 1024)).toFixed(2),
        externalMb: +(memory.external / (1024 * 1024)).toFixed(2),
      },
      system: {
        totalMemoryMb: +(os.totalmem() / (1024 * 1024)).toFixed(2),
        freeMemoryMb: +(os.freemem() / (1024 * 1024)).toFixed(2),
        cpuCount: os.cpus().length,
        loadAverage: os.loadavg(),
      },
    },
  };

  res.status(isHealthy ? 200 : 503).json(healthPayload);
});

// GET /api/monitoring/metrics — Métricas de performance e taxa de erros
router.get('/metrics', async (_req: Request, res: Response) => {
  const memory = process.memoryUsage();
  const uptime = Math.floor(process.uptime());

  const metrics = {
    uptime_seconds: uptime,
    requests_total: requestCount,
    requests_errors_total: errorCount,
    error_rate_percentage: requestCount > 0 ? +((errorCount / requestCount) * 100).toFixed(2) : 0,
    memory_heap_used_bytes: memory.heapUsed,
    memory_heap_total_bytes: memory.heapTotal,
    memory_rss_bytes: memory.rss,
    cpu_cores: os.cpus().length,
  };

  res.json({
    metrics,
    format: 'json',
    collectedAt: new Date().toISOString(),
  });
});

export default router;
