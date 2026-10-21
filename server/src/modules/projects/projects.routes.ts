import { Router, Request, Response, NextFunction } from 'express';
import { ProjectService } from './projects.service';
import { createProjectSchema, updateProjectSchema, listProjectsSchema } from './projects.validation';
import { authenticate, resolveOrganization, requireTeamMember } from '../../middleware/auth';

const router = Router();
const projectService = new ProjectService();

const orgMiddleware = [authenticate, resolveOrganization()];

// GET /api/projects
router.get('/', ...orgMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.isClientUser) {
      const projects = await projectService.listForClientUser(req.organizationId!, req.user!.userId);
      res.json({ data: projects, pagination: { page: 1, limit: projects.length, total: projects.length, totalPages: 1 } });
      return;
    }
    const query = listProjectsSchema.parse(req.query);
    const result = await projectService.list(req.organizationId!, query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/projects
router.post('/', ...orgMiddleware, requireTeamMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createProjectSchema.parse(req.body);
    const project = await projectService.create(req.organizationId!, data, req.user!.userId);
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id
router.get('/:id', ...orgMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await projectService.getById(req.organizationId!, req.params.id as string);
    res.json(project);
  } catch (error) {
    next(error);
  }
});

// PUT /api/projects/:id
router.put('/:id', ...orgMiddleware, requireTeamMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateProjectSchema.parse(req.body);
    const project = await projectService.update(req.organizationId!, req.params.id as string, data);
    res.json(project);
  } catch (error) {
    next(error);
  }
});

export default router;
