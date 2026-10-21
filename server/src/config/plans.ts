export type PlanId = 'free' | 'pro' | 'business' | 'agency';

// Plan definitions — centralized, not hardcoded in business logic
export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceUsd: number;
  priceBRL: number;
  limits: PlanLimits;
}

export interface PlanLimits {
  maxActiveClients: number;
  maxActiveProjects: number;
  maxTeamMembers: number;
  maxStorageMb: number;
  whiteLabel: boolean;
  customDomain: boolean;
  removeBranding: boolean;
  advancedPermissions: boolean;
  templates: 'basic' | 'full';
  automations: 'none' | 'basic' | 'advanced';
  reports: 'basic' | 'full' | 'advanced';
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    priceUsd: 0,
    priceBRL: 0,
    limits: {
      maxActiveClients: 2,
      maxActiveProjects: 3,
      maxTeamMembers: 2,
      maxStorageMb: 100,
      whiteLabel: false,
      customDomain: false,
      removeBranding: false,
      advancedPermissions: false,
      templates: 'basic',
      automations: 'none',
      reports: 'basic',
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceUsd: 10,
    priceBRL: 59,
    limits: {
      maxActiveClients: 10,
      maxActiveProjects: 25,
      maxTeamMembers: 5,
      maxStorageMb: 1024,
      whiteLabel: false,
      customDomain: false,
      removeBranding: false,
      advancedPermissions: false,
      templates: 'full',
      automations: 'basic',
      reports: 'basic',
    },
  },
  business: {
    id: 'business',
    name: 'Business',
    priceUsd: 20,
    priceBRL: 119,
    limits: {
      maxActiveClients: 30,
      maxActiveProjects: 100,
      maxTeamMembers: 15,
      maxStorageMb: 5120,
      whiteLabel: true,
      customDomain: true,
      removeBranding: true,
      advancedPermissions: false,
      templates: 'full',
      automations: 'basic',
      reports: 'full',
    },
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    priceUsd: 40,
    priceBRL: 239,
    limits: {
      maxActiveClients: 100,
      maxActiveProjects: 500,
      maxTeamMembers: 50,
      maxStorageMb: 20480,
      whiteLabel: true,
      customDomain: true,
      removeBranding: true,
      advancedPermissions: true,
      templates: 'full',
      automations: 'advanced',
      reports: 'advanced',
    },
  },
};

export function getPlan(planId: string): PlanDefinition | undefined {
  return PLANS[planId as PlanId];
}

export function getPlanLimits(planId: string): PlanLimits {
  return PLANS[planId as PlanId]?.limits ?? PLANS.free.limits;
}
