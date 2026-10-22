import { prisma } from '../../lib/prisma';
import { getPlan, getPlanLimits, PlanId, PlanLimits, PlanDefinition } from '../../config/plans';
import { NotFoundError } from '../../lib/errors';

export interface OwnerPlanAndUsage {
  ownerId: string;
  planId: PlanId;
  planConfig: PlanDefinition;
  limits: PlanLimits;
  usage: {
    agencies: number;
    clients: number;
    projects: number;
    teamMembers: number;
  };
  ownedOrgIds: string[];
}

const PLAN_HIERARCHY: Record<string, number> = {
  free: 1,
  pro: 2,
  pro_monthly: 2,
  pro_yearly: 2,
  business: 3,
  business_monthly: 3,
  business_yearly: 3,
  agency: 4,
  agency_monthly: 4,
  agency_yearly: 4,
};

/**
 * Get the effective contracted plan and shared resource usage
 * across ALL organizations owned by a specific user.
 * Note: Members' personal plans do not affect the agency; only the owner's plan counts.
 */
export async function getOwnerPlanAndUsage(ownerId: string): Promise<OwnerPlanAndUsage> {
  const ownedOrgs = await prisma.organization.findMany({
    where: { ownerId, isActive: true },
    select: { id: true, planId: true },
  });

  // Resolve highest active plan among all organizations owned by this user
  let bestPlanId: PlanId = 'free';
  let highestRank = 1;

  for (const org of ownedOrgs) {
    const pid = (org.planId || 'free') as PlanId;
    const rank = PLAN_HIERARCHY[pid] || 1;
    if (rank > highestRank) {
      highestRank = rank;
      bestPlanId = pid;
    }
  }

  const limits = getPlanLimits(bestPlanId);
  const planConfig = getPlan(bestPlanId);
  const ownedOrgIds = ownedOrgs.map((o) => o.id);

  // Count shared usage across all organizations owned by this user
  let clientsCount = 0;
  let projectsCount = 0;
  let teamMembersCount = 0;

  if (ownedOrgIds.length > 0) {
    clientsCount = await prisma.client.count({
      where: { organizationId: { in: ownedOrgIds }, status: 'ACTIVE' },
    });
    projectsCount = await prisma.project.count({
      where: { organizationId: { in: ownedOrgIds }, status: { not: 'COMPLETED' } },
    });
    teamMembersCount = await prisma.membership.count({
      where: { organizationId: { in: ownedOrgIds }, isActive: true },
    });
  }

  return {
    ownerId,
    planId: bestPlanId,
    planConfig,
    limits,
    usage: {
      agencies: ownedOrgs.length,
      clients: clientsCount,
      projects: projectsCount,
      teamMembers: teamMembersCount,
    },
    ownedOrgIds,
  };
}

/**
 * Given any organization ID, resolves its owner and returns the shared
 * owner's plan limits and shared usage.
 */
export async function getOrgOwnerLimitsAndUsage(orgId: string): Promise<OwnerPlanAndUsage> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, ownerId: true },
  });

  if (!org) {
    throw new NotFoundError('Organization');
  }

  return getOwnerPlanAndUsage(org.ownerId);
}

/**
 * Synchronize a plan update to all organizations owned by this user
 */
export async function syncOwnerPlanAcrossAgencies(ownerId: string, newPlanId: PlanId) {
  await prisma.organization.updateMany({
    where: { ownerId },
    data: { planId: newPlanId },
  });
}
