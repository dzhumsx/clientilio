import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

import { env } from './config/env';
import { errorHandler } from './lib/errors';

// Route imports
import authRouter from './modules/auth/auth.routes';
import organizationsRouter from './modules/organizations/organizations.routes';
import clientsRouter from './modules/clients/clients.routes';
import projectsRouter from './modules/projects/projects.routes';
import deliverablesRouter from './modules/deliverables/deliverables.routes';
import { filesRouter } from './modules/files/files.routes';
import { billingRouter, stripeWebhookRouter } from './modules/billing/billing.routes';

export function createApp(): Application {
  const app = express();

  // Security Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin) return callback(null, true);
        if (
          origin === env.APP_URL ||
          origin === 'http://localhost:5173' ||
          origin === 'http://localhost:3000' ||
          origin.endsWith('.railway.app') ||
          origin.endsWith('.up.railway.app')
        ) {
          return callback(null, true);
        }
        return callback(null, true); // Permissive for MVP / staging testing
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id'],
    })
  );

  // Stripe webhook route needs raw body, mount before json parser
  app.use('/api/billing/webhook', stripeWebhookRouter);

  // Standard parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Rate Limiting (General API)
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        message: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    },
  });
  app.use('/api', apiLimiter);

  // Stricter limiter for Auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50, // 50 attempts per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        message: 'Too many authentication attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
      },
    },
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  // Healthcheck endpoint (used by Railway deployment health checks)
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'agency-client-portal-api',
      environment: env.NODE_ENV,
    });
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'agency-client-portal-api',
      environment: env.NODE_ENV,
    });
  });

  // API Routes Mounts
  app.use('/api/auth', authRouter);
  app.use('/api/organizations', organizationsRouter);
  app.use('/api/clients', clientsRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api', deliverablesRouter);
  app.use('/api/files', filesRouter);
  app.use('/api/billing', billingRouter);

  // Static Frontend Serving (Production / Railway Deployment)
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api') || req.path === '/health') return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // 404 handler for unknown routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        message: 'Route not found',
        code: 'NOT_FOUND',
      },
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
