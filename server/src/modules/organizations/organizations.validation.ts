import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  specialties: z.array(z.string()).optional().default([]),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
