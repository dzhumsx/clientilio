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
    super(
      `Plan limit reached: ${limit} (${current}/${max})`,
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

  // Prisma connection errors (e.g. database offline)
  if ((err as any).code === 'P1001' || err.message?.includes("Can't reach database server")) {
    res.status(503).json({
      error: {
        message: 'Não foi possível conectar ao banco de dados PostgreSQL. Verifique se o banco está ativo ou configure a DATABASE_URL no arquivo server/.env.',
        code: 'DATABASE_UNAVAILABLE',
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
