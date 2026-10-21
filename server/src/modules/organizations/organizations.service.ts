import { prisma } from '../../lib/prisma';
import { generateUniqueSlug, generateSecureToken, hashToken } from '../../lib/auth';
import { NotFoundError, ForbiddenError, ConflictError, PlanLimitError } from '../../lib/errors';
import { getPlanLimits } from '../../config/plans';
import { MemberRole } from '@prisma/client';
import { invalidateOrgContextCache } from '../../middleware/auth';
import type { CreateOrganizationInput, UpdateOrganizationInput, InviteMemberInput } from './organizations.validation';

export class OrganizationService {
  /**
   * Create a new organization (user becomes owner)
   */
  async create(input: CreateOrganizationInput, userId: string) {
    const slug = generateUniqueSlug(input.name);

    const org = await prisma.organization.create({
      data: {
        name: input.name,
        slug,
        ownerId: userId,
        memberships: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
        subscription: {
          create: {
            planId: 'free',
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

    const limits = getPlanLimits(org.planId);

    return {
      ...org,
      limits,
      usage: {
        activeClients: org._count.clients,
        activeProjects: org._count.projects,
        teamMembers: org._count.memberships,
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
    // Check team member limit
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { planId: true, _count: { select: { memberships: { where: { isActive: true } } } } },
    });

    if (!org) throw new NotFoundError('Organization');

    const limits = getPlanLimits(org.planId);
    if (limits.maxTeamMembers !== -1 && org._count.memberships >= limits.maxTeamMembers) {
      throw new PlanLimitError('team_members', org._count.memberships, limits.maxTeamMembers);
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
}
