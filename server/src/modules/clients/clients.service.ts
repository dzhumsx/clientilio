import { prisma } from '../../lib/prisma';
import { NotFoundError, PlanLimitError } from '../../lib/errors';
import { generateUniqueBase64Id } from '../../lib/id';
import { getOrgOwnerLimitsAndUsage } from '../billing/owner-limits';
import type { CreateClientInput, UpdateClientInput, ListClientsInput } from './clients.validation';

export class ClientService {
  async create(orgId: string, input: CreateClientInput, userId: string) {
    // Check shared owner plan limits across all owner's agencies
    const { limits, usage } = await getOrgOwnerLimitsAndUsage(orgId);
    if (limits.maxActiveClients !== -1 && usage.clients >= limits.maxActiveClients) {
      throw new PlanLimitError('active_clients', usage.clients, limits.maxActiveClients);
    }

    const clientId = await generateUniqueBase64Id('c');

    const client = await prisma.client.create({
      data: {
        id: clientId,
        organizationId: orgId,
        name: input.name,
        email: input.email,
        company: input.company,
        notes: input.notes,
        createdById: userId,
      },
    });

    return client;
  }

  async list(orgId: string, input: ListClientsInput) {
    const where: any = { organizationId: orgId };

    if (input.status !== 'ALL') {
      where.status = input.status;
    }

    if (input.search) {
      where.OR = [
        { name: { contains: input.search, mode: 'insensitive' } },
        { email: { contains: input.search, mode: 'insensitive' } },
        { company: { contains: input.search, mode: 'insensitive' } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            projects: true,
          },
        },
      },
    });

    const total = await prisma.client.count({ where });

    return {
      clients,
      data: clients,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.ceil(total / input.limit),
      },
    };
  }

  async getById(orgId: string, clientId: string) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId: orgId },
      include: {
        projects: {
          where: { status: { not: 'ARCHIVED' } },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        },
        _count: { select: { projects: true, clientAccesses: true } },
      },
    });

    if (!client) throw new NotFoundError('Client');
    return client;
  }

  async update(orgId: string, clientId: string, input: UpdateClientInput) {
    const existing = await prisma.client.findFirst({
      where: { id: clientId, organizationId: orgId },
    });

    if (!existing) throw new NotFoundError('Client');

    return prisma.client.update({
      where: { id: clientId },
      data: input,
      include: {
        _count: { select: { projects: true } },
      },
    });
  }

  async archive(orgId: string, clientId: string) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId: orgId },
    });

    if (!client) throw new NotFoundError('Client');

    return prisma.client.update({
      where: { id: clientId },
      data: { status: 'ARCHIVED' },
      include: {
        _count: { select: { projects: true } },
      },
    });
  }

  async reactivate(orgId: string, clientId: string) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId: orgId },
    });

    if (!client) throw new NotFoundError('Client');

    // Check shared owner plan limit before reactivation
    const { limits, usage } = await getOrgOwnerLimitsAndUsage(orgId);
    if (limits.maxActiveClients !== -1 && usage.clients >= limits.maxActiveClients) {
      throw new PlanLimitError('active_clients', usage.clients, limits.maxActiveClients);
    }

    return prisma.client.update({
      where: { id: clientId },
      data: { status: 'ACTIVE' },
      include: {
        _count: { select: { projects: true } },
      },
    });
  }

  async delete(orgId: string, clientId: string) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId: orgId },
    });

    if (!client) throw new NotFoundError('Client');

    await prisma.client.delete({
      where: { id: clientId },
    });

    return { success: true };
  }
}
