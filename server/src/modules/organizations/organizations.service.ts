import { prisma } from '../../lib/prisma';
import { generateUniqueSlug, generateSecureToken, hashToken } from '../../lib/auth';
import { NotFoundError, ForbiddenError, ConflictError, PlanLimitError } from '../../lib/errors';
import { getPlanLimits } from '../../config/plans';
import { getOwnerPlanAndUsage, getOrgOwnerLimitsAndUsage } from '../billing/owner-limits';
import { MemberRole } from '@prisma/client';
import { invalidateOrgContextCache } from '../../middleware/auth';
import type { CreateOrganizationInput, UpdateOrganizationInput, InviteMemberInput } from './organizations.validation';

export class OrganizationService {
  /**
   * Create a new organization (user becomes owner)
   */
  async create(input: CreateOrganizationInput, userId: string) {
    // Check shared owner agency limit based on the user's contracted plan
    const ownerData = await getOwnerPlanAndUsage(userId);
    if (ownerData.limits.maxAgencies !== -1 && ownerData.usage.agencies >= ownerData.limits.maxAgencies) {
      throw new PlanLimitError('agencies', ownerData.usage.agencies, ownerData.limits.maxAgencies);
    }

    const slug = generateUniqueSlug(input.name);

    const org = await prisma.organization.create({
      data: {
        name: input.name,
        slug,
        ownerId: userId,
        planId: ownerData.planId,
        memberships: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
        subscription: {
          create: {
            planId: ownerData.planId,
            status: 'FREE',
          },
        },
        brandSettings: {
          create: {},
        },
      },
      include: {
        memberships: { where: { userId }, select: { role: true } },
      },
    });

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      planId: org.planId,
      role: org.memberships[0]?.role,
    };
  }

  /**
   * List all organizations that a user belongs to
   */
  async listUserOrganizations(userId: string) {
    const memberships = await prisma.membership.findMany({
      where: { userId, isActive: true },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
            planId: true,
            createdAt: true,
            _count: {
              select: {
                memberships: { where: { isActive: true } },
                clients: { where: { status: 'ACTIVE' } },
                projects: { where: { status: { not: 'ARCHIVED' } } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      ownerId: m.organization.ownerId,
      planId: m.organization.planId,
      role: m.role,
      joinedAt: m.createdAt,
      createdAt: m.organization.createdAt,
      isOwner: m.role === 'OWNER',
      memberCount: m.organization._count.memberships,
      clientCount: m.organization._count.clients,
      projectCount: m.organization._count.projects,
    }));
  }

  /**
   * Get organization by ID (with tenant check)
   */
  async getById(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        subscription: { select: { status: true, planId: true, currentPeriodEnd: true } },
        brandSettings: true,
        _count: {
          select: {
            clients: { where: { status: 'ACTIVE' } },
            projects: { where: { status: { not: 'ARCHIVED' } } },
            memberships: { where: { isActive: true } },
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundError('Organization');
    }

    // Resolve owner's shared limits and shared usage across all owner's agencies
    const ownerData = await getOwnerPlanAndUsage(org.ownerId);

    return {
      ...org,
      planId: ownerData.planId,
      limits: ownerData.limits,
      usage: {
        activeClients: ownerData.usage.clients,
        activeProjects: ownerData.usage.projects,
        teamMembers: ownerData.usage.teamMembers,
        agencies: ownerData.usage.agencies,
      },
    };
  }

  /**
   * Update organization
   */
  async update(orgId: string, input: UpdateOrganizationInput) {
    const org = await prisma.organization.update({
      where: { id: orgId },
      data: { name: input.name },
      select: { id: true, name: true, slug: true, planId: true },
    });
    return org;
  }

  /**
   * List members
   */
  async listMembers(orgId: string) {
    const members = await prisma.membership.findMany({
      where: { organizationId: orgId, isActive: true },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      joinedAt: m.createdAt,
    }));
  }

  /**
   * Invite a team member
   */
  async inviteMember(orgId: string, input: InviteMemberInput, invitedById: string) {
    // Check shared team member limit across all agencies owned by this agency's owner
    const { limits, usage } = await getOrgOwnerLimitsAndUsage(orgId);
    if (limits.maxTeamMembers !== -1 && usage.teamMembers >= limits.maxTeamMembers) {
      throw new PlanLimitError('team_members', usage.teamMembers, limits.maxTeamMembers);
    }

    // Check if already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      const existingMembership = await prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMembership?.isActive) {
        throw new ConflictError('User is already a member of this organization');
      }
    }

    // Check for pending invite
    const pendingInvite = await prisma.invitation.findFirst({
      where: {
        organizationId: orgId,
        email: input.email,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingInvite) {
      throw new ConflictError('An invitation is already pending for this email');
    }

    const token = generateSecureToken();
    const invitation = await prisma.invitation.create({
      data: {
        organizationId: orgId,
        email: input.email,
        role: input.role as MemberRole,
        type: 'TEAM_MEMBER',
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdById: invitedById,
      },
    });

    // TODO: Send invite email
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Invitation token for ${input.email}: ${token}`);
    }

    return { id: invitation.id, email: invitation.email, expiresAt: invitation.expiresAt, token };
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(token: string, userId: string) {
    const tokenHash = hashToken(token);

    const invitation = await prisma.invitation.findUnique({
      where: { tokenHash },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    });

    if (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt < new Date()) {
      throw new ForbiddenError('Invalid or expired invitation');
    }

    // Create membership in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Mark invitation as accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      // Create or reactivate membership
      const existingMembership = await tx.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId,
          },
        },
      });

      if (existingMembership) {
        return tx.membership.update({
          where: { id: existingMembership.id },
          data: { isActive: true, role: invitation.role },
        });
      }

      return tx.membership.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role,
        },
      });
    });

    invalidateOrgContextCache(invitation.organizationId, userId);

    return {
      organization: invitation.organization,
      role: result.role,
    };
  }

  /**
   * List pending invitations
   */
  async listInvitations(orgId: string) {
    const invitations = await prisma.invitation.findMany({
      where: {
        organizationId: orgId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      type: inv.type,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      createdBy: inv.createdBy,
    }));
  }

  /**
   * Revoke / cancel an invitation
   */
  async revokeInvitation(orgId: string, invitationId: string) {
    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, organizationId: orgId },
    });
    if (!invitation) throw new NotFoundError('Invitation');

    await prisma.invitation.update({
      where: { id: invitationId },
      data: { revokedAt: new Date() },
    });

    return { message: 'Invitation revoked successfully' };
  }

  /**
   * Get invitation preview by token
   */
  async getInvitationByToken(token: string) {
    const tokenHash = hashToken(token);
    const invitation = await prisma.invitation.findUnique({
      where: { tokenHash },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { name: true } },
      },
    });

    if (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt < new Date()) {
      throw new ForbiddenError('Invalid or expired invitation');
    }

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      organization: invitation.organization,
      inviterName: invitation.createdBy.name,
      expiresAt: invitation.expiresAt,
    };
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(orgId: string, membershipId: string, newRole: MemberRole, actorRole: MemberRole) {
    const membership = await prisma.membership.findFirst({
      where: { id: membershipId, organizationId: orgId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!membership) throw new NotFoundError('Membership');

    if (membership.role === 'OWNER') {
      throw new ForbiddenError('Cannot change the role of the owner');
    }

    if (actorRole === 'MEMBER') {
      throw new ForbiddenError('Members cannot change roles');
    }

    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: { role: newRole },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    invalidateOrgContextCache(orgId, membership.userId);

    return {
      id: updated.id,
      userId: updated.user.id,
      name: updated.user.name,
      email: updated.user.email,
      avatarUrl: updated.user.avatarUrl,
      role: updated.role,
      joinedAt: updated.createdAt,
    };
  }

  /**
   * Remove a member
   */
  async removeMember(orgId: string, membershipId: string, actorRole: MemberRole) {
    const membership = await prisma.membership.findFirst({
      where: { id: membershipId, organizationId: orgId },
      select: { id: true, userId: true, role: true },
    });

    if (!membership) {
      throw new NotFoundError('Membership');
    }

    if (membership.role === 'OWNER') {
      throw new ForbiddenError('Cannot remove the owner');
    }

    if (actorRole === 'MEMBER') {
      throw new ForbiddenError('Members cannot remove other members');
    }

    await prisma.membership.update({
      where: { id: membershipId },
      data: { isActive: false },
    });

    invalidateOrgContextCache(orgId, membership.userId);

    return { message: 'Member removed successfully' };
  }

  /**
   * List pending invitations sent to a specific user's email
   */
  async listMyInvitations(userEmail: string) {
    const cleanEmail = userEmail.toLowerCase().trim();
    const invitations = await prisma.invitation.findMany({
      where: {
        email: cleanEmail,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            planId: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      organization: inv.organization,
      createdBy: inv.createdBy,
    }));
  }

  /**
   * Accept an invitation directly by ID (for logged-in existing users)
   */
  async acceptMyInvitation(invitationId: string, userId: string, userEmail: string) {
    const cleanEmail = userEmail.toLowerCase().trim();
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        email: cleanEmail,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, planId: true },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation');
    }

    const membership = await prisma.$transaction(async (tx) => {
      // Mark invitation accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      // Upsert membership
      const existing = await tx.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId,
          },
        },
      });

      if (existing) {
        return tx.membership.update({
          where: { id: existing.id },
          data: { isActive: true, role: invitation.role },
        });
      }

      return tx.membership.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role,
          isActive: true,
        },
      });
    });

    invalidateOrgContextCache(invitation.organizationId, userId);

    return {
      message: 'Invitation accepted successfully',
      organization: invitation.organization,
      role: membership.role,
    };
  }

  /**
   * Decline an invitation directly by ID (for logged-in existing users)
   */
  async declineMyInvitation(invitationId: string, userEmail: string) {
    const cleanEmail = userEmail.toLowerCase().trim();
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        email: cleanEmail,
        acceptedAt: null,
        revokedAt: null,
      },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation');
    }

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { revokedAt: new Date() },
    });

    return { message: 'Invitation declined successfully' };
  }
}
