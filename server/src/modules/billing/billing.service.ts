import Stripe from 'stripe';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { NotFoundError, AppError } from '../../lib/errors';
import { PLANS, PlanId, getPlan, getPlanLimits } from '../../config/plans';
import { getOwnerPlanAndUsage, syncOwnerPlanAcrossAgencies } from './owner-limits';
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

    // Resolve owner's shared plan, limits, and usage across all organizations owned by this user
    const ownerData = await getOwnerPlanAndUsage(org.ownerId);
    const planConfig = ownerData.planConfig;
    const limits = ownerData.limits;

    const availablePlansList = [
      PLANS.free,
      PLANS.pro,
      PLANS.pro_yearly,
      PLANS.business,
      PLANS.business_yearly,
      PLANS.agency,
      PLANS.agency_yearly,
    ];

    return {
      organizationId: org.id,
      ownerId: org.ownerId,
      planId: planConfig.id,
      basePlanId: planConfig.basePlanId,
      planName: planConfig.name,
      planInterval: planConfig.interval,
      planPrice: planConfig.priceBRL,
      monthlyEquivalentPrice: planConfig.monthlyEquivalentBRL,
      savings: planConfig.savingsBRL,
      discountPercent: planConfig.discountPercent,
      status: org.subscription?.status || SubscriptionStatus.FREE,
      cancelAtPeriodEnd: org.subscription?.cancelAtPeriodEnd || false,
      currentPeriodEnd: org.subscription?.currentPeriodEnd || null,
      limits: {
        maxAgencies: limits.maxAgencies,
        maxActiveClients: limits.maxActiveClients,
        maxActiveProjects: limits.maxActiveProjects,
        maxTeamMembers: limits.maxTeamMembers,
        whiteLabel: limits.whiteLabel,
        customDomain: limits.customDomain,
      },
      usage: {
        agencies: ownerData.usage.agencies,
        clients: ownerData.usage.clients,
        projects: ownerData.usage.projects,
        teamMembers: ownerData.usage.teamMembers,
      },
      availablePlans: availablePlansList,
    };
  }

  /**
   * Create Checkout Session for Stripe or simulated checkout if no API key is provided
   */
  static async createCheckoutSession(
    organizationId: string,
    targetPlanId: PlanId,
    successUrl: string,
    cancelUrl: string,
    interval: 'monthly' | 'yearly' = 'monthly'
  ) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { subscription: true },
    });

    if (!org) {
      throw new NotFoundError('Organization');
    }

    // Resolve exact plan definition (separated internally)
    let resolvedPlanId = targetPlanId;
    if (interval === 'yearly' && !resolvedPlanId.endsWith('_yearly')) {
      const yearlyCandidate = `${resolvedPlanId}_yearly` as PlanId;
      if (PLANS[yearlyCandidate]) {
        resolvedPlanId = yearlyCandidate;
      }
    } else if (interval === 'monthly' && resolvedPlanId.endsWith('_yearly')) {
      const base = resolvedPlanId.replace('_yearly', '') as PlanId;
      if (PLANS[base]) {
        resolvedPlanId = base;
      }
    }

    const targetPlan = PLANS[resolvedPlanId] || getPlan(resolvedPlanId);
    if (!targetPlan || targetPlan.id === 'free') {
      throw new AppError('Invalid subscription plan selected', 400);
    }

    const isYearly = targetPlan.interval === 'yearly';
    const days = isYearly ? 365 : 30;

    // In demo / test mode without Stripe secret key: directly upgrade plan
    if (!stripe) {
      const now = new Date();
      const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      // Sync plan across all organizations owned by this user
      await syncOwnerPlanAcrossAgencies(org.ownerId, targetPlan.id);

      await prisma.subscription.upsert({
        where: { organizationId },
        create: {
          organizationId,
          provider: 'stripe_mock',
          status: SubscriptionStatus.ACTIVE,
          planId: targetPlan.id,
          currentPeriodEnd: periodEnd,
        },
        update: {
          provider: 'stripe_mock',
          status: SubscriptionStatus.ACTIVE,
          planId: targetPlan.id,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      });

      return {
        client_secret: `mock_secret_${targetPlan.id}`,
        simulated: true,
        planId: targetPlan.id,
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
              name: `Plano ${targetPlan.name} (${isYearly ? 'Anual com 10% OFF' : 'Mensal'}) — Gestão de Clientes`,
              description: targetPlan.limits.maxActiveClients === -1
                ? `Acesso a clientes ilimitados e ${targetPlan.limits.maxActiveProjects} projetos.`
                : `Acesso a até ${targetPlan.limits.maxActiveClients} clientes e ${targetPlan.limits.maxActiveProjects} projetos.`,
            },
            unit_amount: Math.round(targetPlan.priceBRL * 100),
            recurring: { interval: isYearly ? 'year' : 'month' },
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
        planId: targetPlan.id,
      },
      update: {
        providerCustomerId: customerId,
        status: SubscriptionStatus.CHECKOUT_INITIATED,
        planId: targetPlan.id,
      },
    });

    return { client_secret: session.client_secret, simulated: false, planId: targetPlan.id };
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
