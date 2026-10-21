import { prisma } from '../../lib/prisma';
import { NotFoundError, ForbiddenError, PlanLimitError } from '../../lib/errors';
import { getPlanLimits } from '../../config/plans';
import type { CreateProjectInput, UpdateProjectInput, ListProjectsInput } from './projects.validation';

export class ProjectService {
  async create(orgId: string, input: CreateProjectInput, userId: string) {
    // Verify client belongs to this org
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, organizationId: orgId, status: 'ACTIVE' },
    });
    if (!client) throw new NotFoundError('Client');

    // Check plan limit
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        planId: true,
        _count: { select: { projects: { where: { status: { not: 'ARCHIVED' } } } } },
      },
    });
    if (!org) throw new NotFoundError('Organization');

    const limits = getPlanLimits(org.planId);
    if (org._count.projects >= limits.maxActiveProjects) {
      throw new PlanLimitError('active_projects', org._count.projects, limits.maxActiveProjects);
    }

    return prisma.project.create({
      data: {
        organizationId: orgId,
        clientId: input.clientId,
        name: input.name,
        description: input.description,
        category: input.category,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        createdById: userId,
      },
      include: { client: { select: { id: true, name: true } } },
    });
  }

  async list(orgId: string, input: ListProjectsInput) {
    const where: any = { organizationId: orgId };

    if (input.status !== 'ALL') {
      where.status = input.status;
    }
    if (input.clientId) {
      where.clientId = input.clientId;
    }
    if (input.search) {
      where.OR = [
        { name: { contains: input.search, mode: 'insensitive' } },
        { description: { contains: input.search, mode: 'insensitive' } },
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          _count: { select: { tasks: true, deliverables: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return {
      data: projects,
      pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) },
    };
  }

  async getById(orgId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
      include: {
        client: { select: { id: true, name: true } },
        tasks: { orderBy: { createdAt: 'desc' }, take: 50 },
        deliverables: {
          orderBy: { createdAt: 'desc' },
          include: {
            versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
            _count: { select: { approvals: true } },
          },
        },
        _count: { select: { tasks: true, deliverables: true, comments: true } },
      },
    });

    if (!project) throw new NotFoundError('Project');
    return project;
  }

  async update(orgId: string, projectId: string, input: UpdateProjectInput) {
    const existing = await prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!existing) throw new NotFoundError('Project');

    return prisma.project.update({
      where: { id: projectId },
      data: {
        ...input,
        startDate: input.startDate !== undefined ? (input.startDate ? new Date(input.startDate) : null) : undefined,
        dueDate: input.dueDate !== undefined ? (input.dueDate ? new Date(input.dueDate) : null) : undefined,
      },
      include: { client: { select: { id: true, name: true } } },
    });
  }

  /**
   * List projects accessible to a client user
   */
  async listForClientUser(orgId: string, userId: string) {
    const clientAccesses = await prisma.clientAccess.findMany({
      where: { userId, isActive: true, client: { organizationId: orgId } },
      select: { clientId: true },
    });

    const clientIds = clientAccesses.map((ca) => ca.clientId);

    const projects = await prisma.project.findMany({
      where: {
        organizationId: orgId,
        clientId: { in: clientIds },
        status: { not: 'ARCHIVED' },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { tasks: true, deliverables: true } },
      },
    });

    return projects;
  }
}
