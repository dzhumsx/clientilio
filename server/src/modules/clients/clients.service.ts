import { prisma } from '../../lib/prisma';
import { NotFoundError, PlanLimitError } from '../../lib/errors';
import { getPlanLimits } from '../../config/plans';
import type { CreateClientInput, UpdateClientInput, ListClientsInput } from './clients.validation';

export class ClientService {
  async create(orgId: string, input: CreateClientInput, userId: string) {
    // Check plan limit
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        planId: true,
        _count: { select: { clients: { where: { status: 'ACTIVE' } } } },
      },
    });

    if (!org) throw new NotFoundError('Organization');

    const limits = getPlanLimits(org.planId);
    if (org._count.clients >= limits.maxActiveClients) {
      throw new PlanLimitError('active_clients', org._count.clients, limits.maxActiveClients);
    }

    const client = await prisma.client.create({
      data: {
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

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
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
      }),
      prisma.client.count({ where }),
    ]);

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
    });
  }

  async reactivate(orgId: string, clientId: string) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId: orgId },
    });

    if (!client) throw new NotFoundError('Client');

    // Check plan limit before reactivation
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        planId: true,
        _count: { select: { clients: { where: { status: 'ACTIVE' } } } },
      },
    });

    if (!org) throw new NotFoundError('Organization');

    const limits = getPlanLimits(org.planId);
    if (org._count.clients >= limits.maxActiveClients) {
      throw new PlanLimitError('active_clients', org._count.clients, limits.maxActiveClients);
    }

    return prisma.client.update({
      where: { id: clientId },
      data: { status: 'ACTIVE' },
    });
  }
}
