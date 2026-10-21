import { z } from 'zod';

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

export const createDeliverableSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  type: z.enum(['IMAGE', 'VIDEO', 'DOCUMENT', 'PRESENTATION', 'TEXT', 'CAPTION', 'REPORT', 'CREATIVE', 'BRANDING', 'EXTERNAL_PREVIEW', 'OTHER']).optional().default('OTHER'),
});

export const updateDeliverableSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional(),
  type: z.enum(['IMAGE', 'VIDEO', 'DOCUMENT', 'PRESENTATION', 'TEXT', 'CAPTION', 'REPORT', 'CREATIVE', 'BRANDING', 'EXTERNAL_PREVIEW', 'OTHER']).optional(),
});

export const createVersionSchema = z.object({
  notes: z.string().max(2000).optional(),
  externalUrl: z.string().url().optional(),
  fileId: z.string().uuid().optional(),
});

export const submitApprovalSchema = z.object({
  decision: z.enum(['APPROVED', 'CHANGES_REQUESTED']),
  comment: z.string().max(2000).optional(),
});

export const createCommentSchema = z.object({
  resourceType: z.enum(['project', 'deliverable']),
  resourceId: z.string().uuid(),
  body: z.string().min(1).max(5000),
  visibility: z.enum(['INTERNAL', 'CLIENT_VISIBLE']).optional().default('CLIENT_VISIBLE'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>;
export type UpdateDeliverableInput = z.infer<typeof updateDeliverableSchema>;
export type CreateVersionInput = z.infer<typeof createVersionSchema>;
export type SubmitApprovalInput = z.infer<typeof submitApprovalSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
