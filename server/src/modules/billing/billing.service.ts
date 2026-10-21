import Stripe from 'stripe';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { NotFoundError, AppError } from '../../lib/errors';
import { PLANS, PlanId, getPlanLimits } from '../../config/plans';
import { SubscriptionStatus } from '@prisma/client';

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' as any })
  : null;

export class BillingService {
  /**
   * Get subscription status for an organization
   */
  static async getSubscription(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscription: true,
      },
    });

    if (!org) {
      throw new NotFoundError('Organization');
    }

    const currentPlanId = (org.planId || 'free') as PlanId;
    const planConfig = PLANS[currentPlanId] || PLANS.free;
    const limits = getPlanLimits(currentPlanId);

    // Count usage sequentially
    const clientCount = await prisma.client.count({ where: { organizationId, status: 'ACTIVE' } });
    const projectCount = await prisma.project.count({ where: { organizationId, status: { not: 'COMPLETED' } } });
    const memberCount = await prisma.membership.count({ where: { organizationId, isActive: true } });

    return {
      organizationId: org.id,
      planId: currentPlanId,
      planName: planConfig.name,
      planPrice: planConfig.priceBRL,
      status: org.subscription?.status || SubscriptionStatus.FREE,
      cancelAtPeriodEnd: org.subscription?.cancelAtPeriodEnd || false,
      currentPeriodEnd: org.subscription?.currentPeriodEnd || null,
      limits: {
        maxActiveClients: limits.maxActiveClients,
        maxActiveProjects: limits.maxActiveProjects,
        maxTeamMembers: limits.maxTeamMembers,
        whiteLabel: limits.whiteLabel,
        customDomain: limits.customDomain,
      },
      usage: {
        clients: clientCount,
        projects: projectCount,
        teamMembers: memberCount,
      },
      availablePlans: Object.values(PLANS),
    };
  }

  /**
   * Create Checkout Session for Stripe or simulated checkout if no API key is provided
   */
  static async createCheckoutSession(
    organizationId: string,
    targetPlanId: PlanId,
    successUrl: string,
    cancelUrl: string
  ) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { subscription: true },
    });

    if (!org) {
      throw new NotFoundError('Organization');
    }

    const targetPlan = PLANS[targetPlanId];
    if (!targetPlan || targetPlanId === 'free') {
      throw new AppError('Invalid subscription plan selected', 400);
    }

    // In demo / test mode without Stripe secret key: directly upgrade plan
    if (!stripe) {
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await prisma.organization.update({
        where: { id: organizationId },
        data: { planId: targetPlanId },
      });

      await prisma.subscription.upsert({
        where: { organizationId },
        create: {
          organizationId,
          provider: 'stripe_mock',
          status: SubscriptionStatus.ACTIVE,
          planId: targetPlanId,
          currentPeriodEnd: periodEnd,
        },
        update: {
          provider: 'stripe_mock',
          status: SubscriptionStatus.ACTIVE,
          planId: targetPlanId,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      });

      return {
        client_secret: `mock_secret_${targetPlanId}`,
        simulated: true,
      };
    }

    // Real Stripe Integration
    let customerId = org.subscription?.providerCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: {
          organizationId: org.id,
          organizationSlug: org.slug,
        },
      });
      customerId = customer.id;
    }

    // Stripe checkout session with embedded form
    const sessionParams: any = {
      ui_mode: 'form',
      mode: 'subscription',
      billing_address_collection: 'auto',
      phone_number_collection: {
        enabled: false,
      },
      automatic_tax: {
        enabled: false,
      },
      payment_method_collection: 'always',
      submit_type: 'auto',
      integration_identifier: 'custom_embedded_web_0001',
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `Plano ${targetPlan.name} — Gestão de Clientes`,
              description: targetPlan.limits.maxActiveClients === -1
                ? `Acesso a clientes ilimitados e ${targetPlan.limits.maxActiveProjects} projetos.`
                : `Acesso a até ${targetPlan.limits.maxActiveClients} clientes e ${targetPlan.limits.maxActiveProjects} projetos.`,
            },
            unit_amount: targetPlan.priceBRL * 100, // in cents
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Mark status as checkout initiated
    await prisma.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        provider: 'stripe',
        providerCustomerId: customerId,
        status: SubscriptionStatus.CHECKOUT_INITIATED,
        planId: targetPlanId,
      },
      update: {
        providerCustomerId: customerId,
        status: SubscriptionStatus.CHECKOUT_INITIATED,
        planId: targetPlanId,
      },
    });

    return { client_secret: session.client_secret, simulated: false };
  }

  /**
   * Handle incoming Stripe webhook
   */
  static async handleWebhook(signature: string, payload: Buffer) {
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
      throw new AppError('Stripe webhooks not configured', 500);
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      throw new AppError(`Webhook Error: ${err.message}`, 400);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.organizationId;
        const planId = session.metadata?.planId;

        if (orgId && planId) {
          await prisma.organization.update({
            where: { id: orgId },
            data: { planId },
          });

          await prisma.subscription.upsert({
            where: { organizationId: orgId },
            create: {
              organizationId: orgId,
              provider: 'stripe',
              providerCustomerId: session.customer as string,
              providerSubscriptionId: session.subscription as string,
              status: SubscriptionStatus.ACTIVE,
              planId,
            },
            update: {
              providerCustomerId: session.customer as string,
              providerSubscriptionId: session.subscription as string,
              status: SubscriptionStatus.ACTIVE,
              planId,
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const dbSub = await prisma.subscription.findFirst({
          where: { providerSubscriptionId: sub.id },
        });

        if (dbSub) {
          const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
            active: SubscriptionStatus.ACTIVE,
            past_due: SubscriptionStatus.PAYMENT_FAILED,
            unpaid: SubscriptionStatus.PAYMENT_FAILED,
            canceled: SubscriptionStatus.CANCELLED,
            incomplete: SubscriptionStatus.CHECKOUT_INITIATED,
            incomplete_expired: SubscriptionStatus.EXPIRED,
            trialing: SubscriptionStatus.ACTIVE,
            paused: SubscriptionStatus.CANCEL_SCHEDULED,
          };

          await prisma.subscription.update({
            where: { id: dbSub.id },
            data: {
              status: statusMap[sub.status] || SubscriptionStatus.ACTIVE,
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              currentPeriodEnd: (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000) : null,
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const dbSub = await prisma.subscription.findFirst({
          where: { providerSubscriptionId: sub.id },
        });

        if (dbSub) {
          await prisma.organization.update({
            where: { id: dbSub.organizationId },
            data: { planId: 'free' },
          });

          await prisma.subscription.update({
            where: { id: dbSub.id },
            data: {
              status: SubscriptionStatus.CANCELLED,
              planId: 'free',
            },
          });
        }
        break;
      }
    }

    return { received: true };
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(organizationId: string) {
    const sub = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!sub || !sub.providerSubscriptionId || sub.provider === 'stripe_mock') {
      // Direct mock cancel
      await prisma.organization.update({
        where: { id: organizationId },
        data: { planId: 'free' },
      });

      if (sub) {
        await prisma.subscription.update({
          where: { organizationId },
          data: { status: SubscriptionStatus.CANCELLED, planId: 'free' },
        });
      }

      return { cancelled: true };
    }

    if (stripe && sub.providerSubscriptionId) {
      await stripe.subscriptions.update(sub.providerSubscriptionId, {
        cancel_at_period_end: true,
      });

      await prisma.subscription.update({
        where: { organizationId },
        data: { cancelAtPeriodEnd: true },
      });
    }

    return { cancelAtPeriodEnd: true };
  }
}
