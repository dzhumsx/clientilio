import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../lib/auth';
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
 * Authenticate: Extract and verify JWT from Authorization header
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);
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

/**
 * Resolve org: Extract organizationId from header and verify membership
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

      // Check membership
      const membership = await prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: req.user.userId,
          },
        },
      });

      if (membership && membership.isActive) {
        req.organizationId = orgId;
        req.memberRole = membership.role;
        req.isClientUser = false;
        next();
        return;
      }

      // Check if user is a client with access
      const clientAccess = await prisma.clientAccess.findFirst({
        where: {
          userId: req.user.userId,
          isActive: true,
          client: {
            organizationId: orgId,
          },
        },
      });

      if (clientAccess) {
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
