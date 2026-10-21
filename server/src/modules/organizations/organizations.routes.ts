import { Router, Request, Response, NextFunction } from 'express';
import { OrganizationService } from './organizations.service';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema,
} from './organizations.validation';
import { authenticate, resolveOrganization, requireRole, requireTeamMember } from '../../middleware/auth';

const router = Router();
const orgService = new OrganizationService();

// POST /api/organizations — Create new organization
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createOrganizationSchema.parse(req.body);
    const result = await orgService.create(data, req.user!.userId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/organizations/current — Get current organization
router.get(
  '/current',
  authenticate,
  resolveOrganization(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const org = await orgService.getById(req.organizationId!);
      res.json(org);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/organizations/current — Update organization
router.put(
  '/current',
  authenticate,
  resolveOrganization(),
  requireRole('OWNER', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updateOrganizationSchema.parse(req.body);
      const result = await orgService.update(req.organizationId!, data);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/organizations/members — List members
router.get(
  '/members',
  authenticate,
  resolveOrganization(),
  requireTeamMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const members = await orgService.listMembers(req.organizationId!);
      res.json(members);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/organizations/invitations — Invite member
router.post(
  '/invitations',
  authenticate,
  resolveOrganization(),
  requireRole('OWNER', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = inviteMemberSchema.parse(req.body);
      const result = await orgService.inviteMember(
        req.organizationId!,
        data,
        req.user!.userId
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/organizations/invitations/accept — Accept invitation
router.post(
  '/invitations/accept',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;
      if (!token) {
        res.status(400).json({ error: { message: 'Token is required' } });
        return;
      }
      const result = await orgService.acceptInvitation(token, req.user!.userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/organizations/members/:membershipId — Remove member
router.delete(
  '/members/:membershipId',
  authenticate,
  resolveOrganization(),
  requireRole('OWNER', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await orgService.removeMember(
        req.organizationId!,
        req.params.membershipId as string,
        req.memberRole!
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
