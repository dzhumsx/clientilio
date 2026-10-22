import { Router, Request, Response, NextFunction } from 'express';
import { TaskService, DeliverableService, CommentService } from './deliverables.service';
import {
  createTaskSchema,
  updateTaskSchema,
  createDeliverableSchema,
  updateDeliverableSchema,
  createVersionSchema,
  submitApprovalSchema,
  createCommentSchema,
} from './deliverables.validation';
import { authenticate, resolveOrganization, requireTeamMember } from '../../middleware/auth';

const router = Router();
const taskService = new TaskService();
const deliverableService = new DeliverableService();
const commentService = new CommentService();

const orgMiddleware = [authenticate, resolveOrganization()];

// ===================== TASKS =====================

// GET /api/tasks?projectId=xxx
router.get('/tasks', ...orgMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) {
      res.status(400).json({ error: { message: 'projectId is required' } });
      return;
    }
    const tasks = await taskService.listByProject(req.organizationId!, projectId);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks
router.post('/tasks', ...orgMiddleware, requireTeamMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createTaskSchema.parse(req.body);
    const task = await taskService.create(req.organizationId!, data, req.user!.userId);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

// PUT /api/tasks/:id
router.put('/tasks/:id', ...orgMiddleware, requireTeamMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateTaskSchema.parse(req.body);
    const task = await taskService.update(req.organizationId!, req.params.id as string, data);
    res.json(task);
  } catch (error) {
    next(error);
  }
});

// ===================== DELIVERABLES =====================

// GET /api/deliverables?projectId=xxx&status=ACTIVE|ARCHIVED&search=xxx
router.get('/deliverables', ...orgMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.query.projectId as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const deliverables = await deliverableService.listByProject(req.organizationId!, projectId, status, search);
    res.json(deliverables);
  } catch (error) {
    next(error);
  }
});

// POST /api/deliverables
router.post('/deliverables', ...orgMiddleware, requireTeamMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createDeliverableSchema.parse(req.body);
    const deliverable = await deliverableService.create(req.organizationId!, data, req.user!.userId);
    res.status(201).json(deliverable);
  } catch (error) {
    next(error);
  }
});

// GET /api/deliverables/:id
router.get('/deliverables/:id', ...orgMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deliverable = await deliverableService.getById(req.organizationId!, req.params.id as string);
    res.json(deliverable);
  } catch (error) {
    next(error);
  }
});

// PUT /api/deliverables/:id
router.put('/deliverables/:id', ...orgMiddleware, requireTeamMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateDeliverableSchema.parse(req.body);
    const deliverable = await deliverableService.update(req.organizationId!, req.params.id as string, data);
    res.json(deliverable);
  } catch (error) {
    next(error);
  }
});

// POST /api/deliverables/:id/archive
router.post('/deliverables/:id/archive', ...orgMiddleware, requireTeamMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deliverable = await deliverableService.archive(req.organizationId!, req.params.id as string);
    res.json(deliverable);
  } catch (error) {
    next(error);
  }
});

// POST /api/deliverables/:id/reactivate
router.post('/deliverables/:id/reactivate', ...orgMiddleware, requireTeamMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deliverable = await deliverableService.reactivate(req.organizationId!, req.params.id as string);
    res.json(deliverable);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/deliverables/:id
router.delete('/deliverables/:id', ...orgMiddleware, requireTeamMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deliverableService.delete(req.organizationId!, req.params.id as string);
    res.json({ message: 'Deliverable permanently deleted' });
  } catch (error) {
    next(error);
  }
});

// POST /api/deliverables/:id/versions
router.post('/deliverables/:id/versions', ...orgMiddleware, requireTeamMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createVersionSchema.parse(req.body);
    const version = await deliverableService.addVersion(req.organizationId!, req.params.id as string, data, req.user!.userId);
    res.status(201).json(version);
  } catch (error) {
    next(error);
  }
});

// POST /api/deliverables/:id/submit
router.post('/deliverables/:id/submit', ...orgMiddleware, requireTeamMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deliverable = await deliverableService.submitForReview(req.organizationId!, req.params.id as string);
    res.json(deliverable);
  } catch (error) {
    next(error);
  }
});

// POST /api/deliverables/:deliverableId/versions/:versionId/approve
router.post(
  '/deliverables/:deliverableId/versions/:versionId/approve',
  ...orgMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = submitApprovalSchema.parse(req.body);
      const approval = await deliverableService.submitApproval(
        req.organizationId!,
        req.params.deliverableId as string,
        req.params.versionId as string,
        data,
        req.user!.userId
      );
      res.status(201).json(approval);
    } catch (error) {
      next(error);
    }
  }
);

// ===================== COMMENTS =====================

// GET /api/comments?resourceType=xxx&resourceId=xxx
router.get('/comments', ...orgMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { resourceType, resourceId } = req.query;
    if (!resourceType || !resourceId) {
      res.status(400).json({ error: { message: 'resourceType and resourceId are required' } });
      return;
    }
    const comments = await commentService.listByResource(
      req.organizationId!,
      resourceType as string,
      resourceId as string,
      req.isClientUser ?? false
    );
    res.json(comments);
  } catch (error) {
    next(error);
  }
});

// POST /api/comments
router.post('/comments', ...orgMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createCommentSchema.parse(req.body);
    const comment = await commentService.create(
      req.organizationId!,
      data,
      req.user!.userId,
      req.isClientUser ?? false
    );
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
});

export default router;
