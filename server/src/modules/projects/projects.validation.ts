import { z } from 'zod';

export const createProjectSchema = z.object({
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  targetEndDate: z.string().datetime().optional(),
  budget: z.number().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED', 'PLANNING', 'IN_PROGRESS', 'REVIEW']).optional(),
  category: z.string().max(100).optional(),
  startDate: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  targetEndDate: z.string().datetime().optional().nullable(),
  budget: z.number().optional().nullable(),
});

export const listProjectsSchema = z.object({
  clientId: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED', 'ALL']).optional().default('ALL'),
  search: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsInput = z.infer<typeof listProjectsSchema>;
