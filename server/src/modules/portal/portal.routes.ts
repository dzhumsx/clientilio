import { Router, Request, Response, NextFunction } from 'express';
import { PortalService } from './portal.service';
import { z } from 'zod';

const router = Router();
const portalService = new PortalService();

const decisionSchema = z.object({
  decision: z.enum(['APPROVED', 'CHANGES_REQUESTED']),
  comment: z.string().max(2000).optional(),
  clientName: z.string().max(100).optional(),
});

const commentSchema = z.object({
  content: z.string().min(1, 'Conteúdo obrigatório').max(2000),
  clientName: z.string().max(100).optional(),
});

/**
 * GET /api/portal/:token
 * Public portal view — loads project, agency and client details without password
 */
router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await portalService.getProjectPortal(req.params.token as string);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/portal/:token/deliverables/:deliverableId/versions/:versionId/decision
 * Public approval/changes submission by client without password
 */
router.post(
  '/:token/deliverables/:deliverableId/versions/:versionId/decision',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = decisionSchema.parse(req.body);
      const result = await portalService.submitDecision(
        req.params.token as string,
        req.params.deliverableId as string,
        req.params.versionId as string,
        data
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/portal/:token/deliverables/:deliverableId/comments
 * Public comment on deliverable by client without password
 */
router.post(
  '/:token/deliverables/:deliverableId/comments',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = commentSchema.parse(req.body);
      const result = await portalService.submitComment(
        req.params.token as string,
        req.params.deliverableId as string,
        data
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
