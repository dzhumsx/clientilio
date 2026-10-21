import { Router, Request, Response, NextFunction } from 'express';
import { ClientService } from './clients.service';
import { createClientSchema, updateClientSchema, listClientsSchema } from './clients.validation';
import { authenticate, resolveOrganization, requireTeamMember } from '../../middleware/auth';

const router = Router();
const clientService = new ClientService();

const orgMiddleware = [authenticate, resolveOrganization(), requireTeamMember];

// GET /api/clients
router.get('/', ...orgMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listClientsSchema.parse(req.query);
    const result = await clientService.list(req.organizationId!, query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/clients
router.post('/', ...orgMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createClientSchema.parse(req.body);
    const client = await clientService.create(req.organizationId!, data, req.user!.userId);
    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
});

// GET /api/clients/:id
router.get('/:id', ...orgMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = await clientService.getById(req.organizationId!, req.params.id as string);
    res.json(client);
  } catch (error) {
    next(error);
  }
});

// PUT /api/clients/:id
router.put('/:id', ...orgMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateClientSchema.parse(req.body);
    const client = await clientService.update(req.organizationId!, req.params.id as string, data);
    res.json(client);
  } catch (error) {
    next(error);
  }
});

// POST /api/clients/:id/archive
router.post('/:id/archive', ...orgMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = await clientService.archive(req.organizationId!, req.params.id as string);
    res.json(client);
  } catch (error) {
    next(error);
  }
});

// POST /api/clients/:id/reactivate
router.post('/:id/reactivate', ...orgMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = await clientService.reactivate(req.organizationId!, req.params.id as string);
    res.json(client);
  } catch (error) {
    next(error);
  }
});

export default router;
