import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(errors: Record<string, string[]>) {
    super('Validation failed', 422, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class PlanLimitError extends AppError {
  public readonly limit: string;
  public readonly current: number;
  public readonly max: number;

  constructor(limit: string, current: number, max: number) {
    const resourceMap: Record<string, string> = {
      active_clients: 'clientes ativos',
      active_projects: 'projetos ativos',
      team_members: 'membros na equipe',
    };
    const resourceName = resourceMap[limit] || limit;
    super(
      `Limite do plano atingido para ${resourceName} (${current}/${max}). Faça upgrade para cadastrar novos registros.`,
      403,
      'PLAN_LIMIT_REACHED'
    );
    this.limit = limit;
    this.current = current;
    this.max = max;
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super('Too many requests. Please try again later.', 429, 'RATE_LIMITED');
  }
}

// Error response format
interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    errors?: Record<string, string[]>;
    limit?: { name: string; current: number; max: number };
  };
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    const issues = err.issues || (err as any).errors || [];
    issues.forEach((e: any) => {
      const path = Array.isArray(e.path) ? e.path.join('.') : 'general';
      if (!errors[path]) errors[path] = [];
      errors[path].push(e.message);
    });
    const response: ErrorResponse = {
      error: { message: 'Validation failed', code: 'VALIDATION_ERROR', errors },
    };
    res.status(422).json(response);
    return;
  }

  // Custom app errors
  if (err instanceof PlanLimitError) {
    const response: ErrorResponse = {
      error: {
        message: err.message,
        code: err.code,
        limit: { name: err.limit, current: err.current, max: err.max },
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  if (err instanceof ValidationError) {
    const response: ErrorResponse = {
      error: { message: err.message, code: err.code, errors: err.errors },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  if (err instanceof AppError) {
    const response: ErrorResponse = {
      error: { message: err.message, code: err.code },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Prisma connection & initialization errors (database offline, wrong credentials, unreachable host)
  const isPrismaDbConnectionError =
    (err as any).code === 'P1000' ||
    (err as any).code === 'P1001' ||
    (err as any).code === 'P1002' ||
    (err as any).code === 'P1003' ||
    (err as any).code === 'P1017' ||
    err.name === 'PrismaClientInitializationError' ||
    err.message?.includes("Can't reach database server");

  if (isPrismaDbConnectionError) {
    res.status(503).json({
      error: {
        message:
          'Não foi possível conectar ao banco de dados PostgreSQL. Certifique-se de iniciar o banco de dados (ex: `docker compose up -d` ou via Railway/Neon) e que a variável DATABASE_URL em server/.env está correta.',
        code: 'DATABASE_UNAVAILABLE',
      },
    });
    return;
  }

  // Prisma unique constraint violation (e.g. duplicate email, slug)
  if ((err as any).code === 'P2002') {
    const target = (err as any).meta?.target;
    const fields = Array.isArray(target) ? target.join(', ') : target || 'campo';
    res.status(409).json({
      error: {
        message: `Já existe um registro cadastrado com este ${fields}.`,
        code: 'CONFLICT',
      },
    });
    return;
  }

  // Prisma record not found
  if ((err as any).code === 'P2025') {
    res.status(404).json({
      error: {
        message: 'O registro solicitado não foi encontrado no banco de dados.',
        code: 'NOT_FOUND',
      },
    });
    return;
  }

  // Unexpected errors — no stack trace in production
  console.error('Unhandled error:', err);
  const response: ErrorResponse = {
    error: {
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message,
      code: 'INTERNAL_ERROR',
    },
  };
  res.status(500).json(response);
}
