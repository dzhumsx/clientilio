import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import { BillingService } from './billing.service';
import { authenticate, resolveOrganization, requireRole } from '../../middleware/auth';
import { PlanId } from '../../config/plans';

export const billingRouter = Router();

/**
 * GET /api/billing
 * Get subscription & usage for current organization
 */
billingRouter.get(
  '/',
  authenticate,
  resolveOrganization(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await BillingService.getSubscription(req.organizationId!);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/billing/checkout
 * Create checkout session (or upgrade directly in mock mode)
 */
billingRouter.post(
  '/checkout',
  authenticate,
  resolveOrganization(),
  requireRole('OWNER', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { planId, interval = 'monthly', successUrl, cancelUrl } = req.body;
      const result = await BillingService.createCheckoutSession(
        req.organizationId!,
        planId as PlanId,
        successUrl || `${req.headers.origin || 'http://localhost:5173'}/dashboard/settings/billing`,
        cancelUrl || `${req.headers.origin || 'http://localhost:5173'}/dashboard/settings/billing`,
        interval === 'yearly' ? 'yearly' : 'monthly'
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/billing/cancel
 * Cancel current subscription at end of period
 */
billingRouter.post(
  '/cancel',
  authenticate,
  resolveOrganization(),
  requireRole('OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await BillingService.cancelSubscription(req.organizationId!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/billing/webhook
 * Stripe Webhook (raw body required)
 */
export const stripeWebhookRouter = Router();

stripeWebhookRouter.post(
  '/',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const result = await BillingService.handleWebhook(signature, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
