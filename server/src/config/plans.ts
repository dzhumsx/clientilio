export type PlanInterval = 'monthly' | 'yearly';

export type BasePlanId = 'free' | 'pro' | 'business' | 'agency';

export type PlanId =
  | 'free'
  | 'pro'
  | 'pro_monthly'
  | 'pro_yearly'
  | 'business'
  | 'business_monthly'
  | 'business_yearly'
  | 'agency'
  | 'agency_monthly'
  | 'agency_yearly';

export interface PlanLimits {
  maxAgencies: number;
  maxActiveClients: number;
  maxActiveProjects: number;
  maxTeamMembers: number;
  whiteLabel: boolean;
  customDomain: boolean;
  removeBranding: boolean;
  advancedPermissions: boolean;
  templates: 'basic' | 'full';
  automations: 'none' | 'basic' | 'advanced';
  reports: 'basic' | 'full' | 'advanced';
}

// Plan definitions — separate plan entities internally for monthly and yearly cycles
export interface PlanDefinition {
  id: PlanId;
  basePlanId: BasePlanId;
  name: string;
  interval: PlanInterval;
  priceUsd: number;
  priceBRL: number; // Total price billed for the cycle
  monthlyEquivalentBRL: number; // Equivalent monthly cost
  savingsBRL: number; // Total annual savings
  discountPercent: number; // 0 for monthly, 10 for yearly
  limits: PlanLimits;
}

const FREE_LIMITS: PlanLimits = {
  maxAgencies: 1,
  maxActiveClients: 2,
  maxActiveProjects: 3,
  maxTeamMembers: 2,
  whiteLabel: false,
  customDomain: false,
  removeBranding: false,
  advancedPermissions: false,
  templates: 'basic',
  automations: 'none',
  reports: 'basic',
};

const PRO_LIMITS: PlanLimits = {
  maxAgencies: 3,
  maxActiveClients: 10,
  maxActiveProjects: 25,
  maxTeamMembers: 5,
  whiteLabel: false,
  customDomain: false,
  removeBranding: false,
  advancedPermissions: false,
  templates: 'full',
  automations: 'basic',
  reports: 'basic',
};

const BUSINESS_LIMITS: PlanLimits = {
  maxAgencies: 10,
  maxActiveClients: 30,
  maxActiveProjects: 100,
  maxTeamMembers: 15,
  whiteLabel: true,
  customDomain: true,
  removeBranding: true,
  advancedPermissions: false,
  templates: 'full',
  automations: 'basic',
  reports: 'full',
};

const AGENCY_LIMITS: PlanLimits = {
  maxAgencies: -1, // Ilimitado
  maxActiveClients: -1, // Ilimitado
  maxActiveProjects: -1,
  maxTeamMembers: -1,
  whiteLabel: true,
  customDomain: true,
  removeBranding: true,
  advancedPermissions: true,
  templates: 'full',
  automations: 'advanced',
  reports: 'advanced',
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  // Free Plan
  free: {
    id: 'free',
    basePlanId: 'free',
    name: 'Free',
    interval: 'monthly',
    priceUsd: 0,
    priceBRL: 0,
    monthlyEquivalentBRL: 0,
    savingsBRL: 0,
    discountPercent: 0,
    limits: FREE_LIMITS,
  },

  // Pro Plans (Monthly & Yearly separated)
  pro: {
    id: 'pro',
    basePlanId: 'pro',
    name: 'Pro',
    interval: 'monthly',
    priceUsd: 10,
    priceBRL: 59,
    monthlyEquivalentBRL: 59,
    savingsBRL: 0,
    discountPercent: 0,
    limits: PRO_LIMITS,
  },
  pro_monthly: {
    id: 'pro_monthly',
    basePlanId: 'pro',
    name: 'Pro',
    interval: 'monthly',
    priceUsd: 10,
    priceBRL: 59,
    monthlyEquivalentBRL: 59,
    savingsBRL: 0,
    discountPercent: 0,
    limits: PRO_LIMITS,
  },
  pro_yearly: {
    id: 'pro_yearly',
    basePlanId: 'pro',
    name: 'Pro Anual',
    interval: 'yearly',
    priceUsd: 108,
    priceBRL: 637.2, // 59 * 12 * 0.90
    monthlyEquivalentBRL: 53.1, // 59 * 0.90
    savingsBRL: 70.8, // 59 * 12 * 0.10
    discountPercent: 10,
    limits: PRO_LIMITS,
  },

  // Business Plans (Monthly & Yearly separated)
  business: {
    id: 'business',
    basePlanId: 'business',
    name: 'Business',
    interval: 'monthly',
    priceUsd: 20,
    priceBRL: 119,
    monthlyEquivalentBRL: 119,
    savingsBRL: 0,
    discountPercent: 0,
    limits: BUSINESS_LIMITS,
  },
  business_monthly: {
    id: 'business_monthly',
    basePlanId: 'business',
    name: 'Business',
    interval: 'monthly',
    priceUsd: 20,
    priceBRL: 119,
    monthlyEquivalentBRL: 119,
    savingsBRL: 0,
    discountPercent: 0,
    limits: BUSINESS_LIMITS,
  },
  business_yearly: {
    id: 'business_yearly',
    basePlanId: 'business',
    name: 'Business Anual',
    interval: 'yearly',
    priceUsd: 216,
    priceBRL: 1285.2, // 119 * 12 * 0.90
    monthlyEquivalentBRL: 107.1, // 119 * 0.90
    savingsBRL: 142.8, // 119 * 12 * 0.10
    discountPercent: 10,
    limits: BUSINESS_LIMITS,
  },

  // Agency Plans (Monthly & Yearly separated)
  agency: {
    id: 'agency',
    basePlanId: 'agency',
    name: 'Agency',
    interval: 'monthly',
    priceUsd: 40,
    priceBRL: 239,
    monthlyEquivalentBRL: 239,
    savingsBRL: 0,
    discountPercent: 0,
    limits: AGENCY_LIMITS,
  },
  agency_monthly: {
    id: 'agency_monthly',
    basePlanId: 'agency',
    name: 'Agency',
    interval: 'monthly',
    priceUsd: 40,
    priceBRL: 239,
    monthlyEquivalentBRL: 239,
    savingsBRL: 0,
    discountPercent: 0,
    limits: AGENCY_LIMITS,
  },
  agency_yearly: {
    id: 'agency_yearly',
    basePlanId: 'agency',
    name: 'Agency Anual',
    interval: 'yearly',
    priceUsd: 432,
    priceBRL: 2581.2, // 239 * 12 * 0.90
    monthlyEquivalentBRL: 215.1, // 239 * 0.90
    savingsBRL: 286.8, // 239 * 12 * 0.10
    discountPercent: 10,
    limits: AGENCY_LIMITS,
  },
};

export function getPlan(planId: string): PlanDefinition {
  const normalized = (planId || 'free').toLowerCase();
  return PLANS[normalized as PlanId] ?? PLANS.agency;
}

export function getPlanLimits(planId: string): PlanLimits {
  const normalized = (planId || 'free').toLowerCase();
  const plan = PLANS[normalized as PlanId];
  if (plan) return plan.limits;

  if (normalized.startsWith('pro')) return PRO_LIMITS;
  if (normalized.startsWith('business')) return BUSINESS_LIMITS;
  if (normalized.startsWith('free')) return FREE_LIMITS;
  return AGENCY_LIMITS;
}
