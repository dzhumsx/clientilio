import { Request, Response, NextFunction } from 'express';
import { maskSensitive } from './encryption';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'AUDIT';

export interface AuditEvent {
  action: string;
  category: 'AUTH' | 'ACCESS' | 'BILLING' | 'ADMIN' | 'DATA_MUTATION';
  userId?: string;
  organizationId?: string;
  ip?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details?: Record<string, any>;
}

class Logger {
  private formatLog(level: LogLevel, message: string, meta?: Record<string, any>): string {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'agency-portal-api',
      environment: process.env.NODE_ENV || 'development',
      ...this.sanitizeMeta(meta),
    };
    return JSON.stringify(logEntry);
  }

  private sanitizeMeta(meta?: Record<string, any>): Record<string, any> | undefined {
    if (!meta) return undefined;
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(meta)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('password') ||
        lower.includes('secret') ||
        lower.includes('token') ||
        lower.includes('authorization') ||
        lower.includes('cookie')
      ) {
        sanitized[key] = typeof value === 'string' ? maskSensitive(value) : '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMeta(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatLog('DEBUG', message, meta));
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    console.log(this.formatLog('INFO', message, meta));
  }

  warn(message: string, meta?: Record<string, any>): void {
    console.warn(this.formatLog('WARN', message, meta));
  }

  error(message: string, error?: any, meta?: Record<string, any>): void {
    console.error(
      this.formatLog('ERROR', message, {
        errorMessage: error?.message || String(error),
        stack: error?.stack,
        ...meta,
      })
    );
  }

  /**
   * Registra eventos de auditoria de segurança (MFA, Login, Privilégios, Acessos Críticos)
   */
  audit(event: AuditEvent): void {
    console.log(
      this.formatLog('AUDIT', `[SECURITY AUDIT] ${event.category}:${event.action} - ${event.status}`, {
        audit: {
          ...event,
          timestamp: new Date().toISOString(),
        },
      })
    );
  }
}

export const logger = new Logger();

/**
 * Middleware Express para log estruturado de requisições HTTP e tempo de resposta
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('x-request-id', String(requestId));

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level: LogLevel = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';

    const logData = {
      requestId,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.userId,
      organizationId: req.organizationId,
    };

    if (level === 'ERROR') {
      logger.error(`HTTP ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`, undefined, logData);
    } else if (level === 'WARN') {
      logger.warn(`HTTP ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`, logData);
    } else {
      logger.info(`HTTP ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`, logData);
    }
  });

  next();
}
