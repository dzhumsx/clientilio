import { prisma } from '../../lib/prisma';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  generateSecureToken,
  hashToken,
  generateUniqueSlug,
} from '../../lib/auth';
import {
  AppError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../../lib/errors';
import { v4 as uuid } from 'uuid';
import { generateUniqueBase64Id } from '../../lib/id';
import { mfaService } from '../../lib/mfa.service';
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  UpdateProfileInput,
  ChangePasswordInput,
} from './auth.validation';

export interface AuthResult {
  user: { id: string; name: string; email: string; avatarUrl?: string | null };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  accessToken: string;
  refreshToken: string;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    planId: string;
    role?: string;
  }>;
  mfaRequired?: boolean;
  mfaTicket?: string;
}

export class AuthService {
  /**
   * Register a new user and create their default organization
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);
    const refreshTokenId = uuid();
    const rawRefreshToken = generateSecureToken();

    const orgName = input.companyName || `${input.name}'s Agency`;
    const orgSlug = generateUniqueSlug(orgName);
    const userEmail = input.email.toLowerCase().trim();

    // Check for pending invitations for this email or invite token
    const pendingInvites = await prisma.invitation.findMany({
      where: {
        email: userEmail,
        expiresAt: { gt: new Date() },
        acceptedAt: null,
        revokedAt: null,
      },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, ownerId: true, planId: true },
        },
      },
    });

    let tokenInvite = null;
    if (input.inviteToken) {
      tokenInvite = await prisma.invitation.findUnique({
        where: { tokenHash: hashToken(input.inviteToken) },
        include: {
          organization: {
            select: { id: true, name: true, slug: true, ownerId: true, planId: true },
          },
        },
      });
    }

    const allInvitesToClaim = [...pendingInvites];
    if (
      tokenInvite &&
      !tokenInvite.acceptedAt &&
      !tokenInvite.revokedAt &&
      tokenInvite.expiresAt > new Date() &&
      !allInvitesToClaim.some((i) => i.id === tokenInvite.id)
    ) {
      allInvitesToClaim.push(tokenInvite);
    }

    const hasInvites = allInvitesToClaim.length > 0;
    const wantsAgency = Boolean(input.companyName && input.companyName.trim().length > 0) || input.createAgency === true;
    const shouldCreateOrg = !hasInvites || wantsAgency;

    // Create user, organization (if needed), owner membership, accept invitations and refresh token in a single transaction
    const { user, organization, joinedOrgs } = await prisma.$transaction(async (tx) => {
      const userId = await generateUniqueBase64Id('u', tx);
      const newUser = await tx.user.create({
        data: {
          id: userId,
          name: input.name,
          email: input.email,
          passwordHash,
          refreshTokens: {
            create: {
              id: refreshTokenId,
              tokenHash: hashToken(rawRefreshToken),
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
          },
        },
        select: { id: true, name: true, email: true, avatarUrl: true },
      });

      let newOrg: { id: string; name: string; slug: string; ownerId: string; planId: string } | null = null;
      if (shouldCreateOrg) {
        const orgId = await generateUniqueBase64Id('o', tx);
        newOrg = await tx.organization.create({
          data: {
            id: orgId,
            name: orgName,
            slug: orgSlug,
            ownerId: newUser.id,
            planId: 'free',
            memberships: {
              create: {
                userId: newUser.id,
                role: 'OWNER',
              },
            },
          },
          select: { id: true, name: true, slug: true, ownerId: true, planId: true },
        });
      }

      // Claim and accept all invitations for this user
      const claimedOrgs: Array<{
        id: string;
        name: string;
        slug: string;
        ownerId: string;
        planId: string;
        role: string;
      }> = [];

      for (const inv of allInvitesToClaim) {
        await tx.invitation.update({
          where: { id: inv.id },
          data: { acceptedAt: new Date() },
        });

        await tx.membership.create({
          data: {
            organizationId: inv.organizationId,
            userId: newUser.id,
            role: inv.role,
            isActive: true,
          },
        });

        claimedOrgs.push({
          ...inv.organization,
          role: inv.role,
        });
      }

      return { user: newUser, organization: newOrg, joinedOrgs: claimedOrgs };
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      tokenId: refreshTokenId,
    });

    // If invited to agencies, prioritize the invited agency as active first
    const orgList = [
      ...joinedOrgs,
      ...(organization ? [{ ...organization, role: 'OWNER' }] : []),
    ];

    return {
      user,
      tokens: { accessToken, refreshToken },
      accessToken,
      refreshToken,
      organizations: orgList,
    };
  }

  /**
   * Login with email and password
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, name: true, email: true, passwordHash: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Se o usuário possuir MFA ativo, emite ticket temporário de desafio
    const isMfaActive = await mfaService.isMfaEnabled(user.id);
    if (isMfaActive) {
      const mfaTicket = mfaService.generateMfaTicket(user.id);
      return {
        mfaRequired: true,
        mfaTicket,
      } as any;
    }

    return this.completeMfaLogin(user.id);
  }

  /**
   * Finaliza o login (direto ou após validação bem sucedida do 2FA/MFA)
   */
  async completeMfaLogin(userId: string): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });
    if (!user) throw new NotFoundError('User');

    const refreshTokenId = uuid();
    const rawRefreshToken = generateSecureToken();

    await prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        userId: user.id,
        tokenHash: hashToken(rawRefreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      tokenId: refreshTokenId,
    });

    // Query active memberships with org details
    const memberships = await prisma.membership.findMany({
      where: { userId: user.id, isActive: true },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, ownerId: true, planId: true },
        },
      },
    });

    const orgList = memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }));

    return {
      user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
      tokens: { accessToken, refreshToken },
      accessToken,
      refreshToken,
      organizations: orgList,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshTokenId: string, userId: string): Promise<{ accessToken: string }> {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { id: refreshTokenId },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });

    if (
      !storedToken ||
      storedToken.revoked ||
      storedToken.userId !== userId ||
      storedToken.expiresAt < new Date() ||
      !storedToken.user.isActive
    ) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const accessToken = generateAccessToken({
      userId: storedToken.user.id,
      email: storedToken.user.email,
    });

    return { accessToken };
  }

  /**
   * Logout — revoke refresh token
   */
  async logout(refreshTokenId: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { id: refreshTokenId },
      data: { revoked: true },
    }).catch(() => {
      // Token might not exist, that's fine
    });
  }

  /**
   * Forgot password — generate reset token
   */
  async forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    // Always return same message to prevent email enumeration
    const message = 'If an account with that email exists, a password reset link has been sent.';

    if (!user) {
      return { message };
    }

    // Invalidate existing reset tokens
    await prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = generateSecureToken();
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // TODO: Send email with reset link
    // For now, log in development only
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Password reset token for ${input.email}: ${token}`);
    }

    return { message };
  }

  /**
   * Reset password using token
   */
  async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const tokenHash = hashToken(input.token);

    const resetRecord = await prisma.passwordReset.findUnique({
      where: { tokenHash },
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
    }

    const newPasswordHash = await hashPassword(input.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all refresh tokens on password reset
      prisma.refreshToken.updateMany({
        where: { userId: resetRecord.userId },
        data: { revoked: true },
      }),
    ]);

    return { message: 'Password has been reset successfully' };
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    const memberships = await prisma.membership.findMany({
      where: { userId, isActive: true },
      select: {
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            planId: true,
          },
        },
      },
    });

    const clientAccesses = await prisma.clientAccess.findMany({
      where: { userId, isActive: true },
      select: {
        client: {
          select: {
            id: true,
            name: true,
            organizationId: true,
            organization: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    return {
      user: { ...user },
      ...user,
      organizations: memberships.map((m) => ({
        ...m.organization,
        role: m.role,
      })),
      clientAccesses: clientAccesses.map((ca) => ({
        clientId: ca.client.id,
        clientName: ca.client.name,
        organizationId: ca.client.organizationId,
        organizationName: ca.client.organization.name,
        organizationSlug: ca.client.organization.slug,
      })),
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, input: UpdateProfileInput) {
    const dataToUpdate: any = {};
    if (input.name !== undefined) dataToUpdate.name = input.name;
    if (input.avatarUrl !== undefined) dataToUpdate.avatarUrl = input.avatarUrl;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    return updated;
  }

  /**
   * Change user password with current password verification
   */
  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw new NotFoundError('User');

    const isValid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('A senha atual informada está incorreta');
    }

    const newPasswordHash = await hashPassword(input.newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: 'Senha alterada com sucesso' };
  }
}
