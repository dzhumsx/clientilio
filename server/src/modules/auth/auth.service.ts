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
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.validation';

export interface AuthResult {
  user: { id: string; name: string; email: string };
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

    // Create user, organization, owner membership and refresh token in a single transaction
    const { user, organization } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
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
        select: { id: true, name: true, email: true },
      });

      const newOrg = await tx.organization.create({
        data: {
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

      return { user: newUser, organization: newOrg };
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      tokenId: refreshTokenId,
    });

    const orgList = [
      {
        ...organization,
        role: 'OWNER',
      },
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
      user: { id: user.id, name: user.name, email: user.email },
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

    // Get user's organizations
    const memberships = await prisma.membership.findMany({
      where: { userId, isActive: true },
      include: {
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

    // Also check client accesses
    const clientAccesses = await prisma.clientAccess.findMany({
      where: { userId, isActive: true },
      include: {
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
}
