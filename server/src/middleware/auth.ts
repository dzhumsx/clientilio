import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload, SESSION_COOKIE_NAME } from '../lib/auth';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { MemberRole } from '@prisma/client';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
      organizationId?: string;
      memberRole?: MemberRole;
      isClientUser?: boolean;
    }
  }
}

/**
 * Authenticate: Extract and verify JWT from Cookie or Authorization header
 * Validates session on all protected requests
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    // 1. Try to extract token from cookies
    let token =
      req.cookies?.[SESSION_COOKIE_NAME] ||
      req.cookies?.token ||
      req.cookies?.session_token ||
      req.cookies?.accessToken;

    // 2. Fallback to Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // 3. Verify JWT validity and expiration (6 hours validity)
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError('Invalid or expired token'));
    }
  }
}

interface CachedOrgContext {
  role?: MemberRole;
  isClientUser: boolean;
  expiresAt: number;
}

const orgContextCache = new Map<string, CachedOrgContext>();
const ORG_CONTEXT_TTL_MS = 60 * 1000; // 60s cache
const MAX_ORG_CACHE_SIZE = 5000;

/**
 * Invalidate organization context cache when roles or memberships change
 */
export function invalidateOrgContextCache(orgId?: string, userId?: string) {
  if (orgId && userId) {
    orgContextCache.delete(`${orgId}:${userId}`);
  } else if (orgId) {
    for (const key of orgContextCache.keys()) {
      if (key.startsWith(`${orgId}:`)) {
        orgContextCache.delete(key);
      }
    }
  } else if (userId) {
    for (const key of orgContextCache.keys()) {
      if (key.endsWith(`:${userId}`)) {
        orgContextCache.delete(key);
      }
    }
  } else {
    orgContextCache.clear();
  }
}

/**
 * Resolve org: Extract organizationId from header and verify membership (cached)
 */
export function resolveOrganization() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const orgId = req.headers['x-organization-id'] as string;
      if (!orgId) {
        throw new ForbiddenError('Organization context required');
      }

      const cacheKey = `${orgId}:${req.user.userId}`;
      const now = Date.now();
      const cached = orgContextCache.get(cacheKey);

      if (cached && cached.expiresAt > now) {
        req.organizationId = orgId;
        req.memberRole = cached.role;
        req.isClientUser = cached.isClientUser;
        next();
        return;
      }

      // Check membership with lean select
      const membership = await prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: req.user.userId,
          },
        },
        select: { role: true, isActive: true },
      });

      if (membership && membership.isActive) {
        if (orgContextCache.size > MAX_ORG_CACHE_SIZE) {
          orgContextCache.clear();
        }
        orgContextCache.set(cacheKey, {
          role: membership.role,
          isClientUser: false,
          expiresAt: now + ORG_CONTEXT_TTL_MS,
        });

        req.organizationId = orgId;
        req.memberRole = membership.role;
        req.isClientUser = false;
        next();
        return;
      }

      // Check if user is a client with direct indexed lookup
      const clientAccess = await prisma.clientAccess.findFirst({
        where: {
          organizationId: orgId,
          userId: req.user.userId,
          isActive: true,
        },
        select: { id: true },
      });

      if (clientAccess) {
        if (orgContextCache.size > MAX_ORG_CACHE_SIZE) {
          orgContextCache.clear();
        }
        orgContextCache.set(cacheKey, {
          isClientUser: true,
          expiresAt: now + ORG_CONTEXT_TTL_MS,
        });

        req.organizationId = orgId;
        req.isClientUser = true;
        next();
        return;
      }

      throw new ForbiddenError('Not a member of this organization');
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require role: Ensure user has at least the specified role
 */
export function requireRole(...roles: MemberRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.isClientUser) {
      next(new ForbiddenError('Client users cannot access this resource'));
      return;
    }

    if (!req.memberRole || !roles.includes(req.memberRole)) {
      next(new ForbiddenError('Insufficient role'));
      return;
    }
    next();
  };
}

/**
 * Require team member: Block client users
 */
export function requireTeamMember(req: Request, _res: Response, next: NextFunction): void {
  if (req.isClientUser) {
    next(new ForbiddenError('Client users cannot access this resource'));
    return;
  }
  next();
}
