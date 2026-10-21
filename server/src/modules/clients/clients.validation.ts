import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email().optional().or(z.literal('')).transform(v => v || undefined),
  company: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateClientSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().or(z.literal('')).transform(v => v || undefined),
  company: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export const listClientsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'ALL']).optional().default('ACTIVE'),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ListClientsInput = z.infer<typeof listClientsSchema>;
