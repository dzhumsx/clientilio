import { prisma } from '../../lib/prisma';
import { NotFoundError, ForbiddenError, PlanLimitError } from '../../lib/errors';
import { generateUniqueBase64Id } from '../../lib/id';
import { getOrgOwnerLimitsAndUsage } from '../billing/owner-limits';
import type { CreateProjectInput, UpdateProjectInput, ListProjectsInput } from './projects.validation';

export class ProjectService {
  async create(orgId: string, input: CreateProjectInput, userId: string) {
    // Verify client belongs to org
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, organizationId: orgId, status: 'ACTIVE' },
      select: { id: true },
    });

    if (!client) throw new NotFoundError('Client');

    // Check shared owner plan limits across all owner's agencies
    const { limits, usage } = await getOrgOwnerLimitsAndUsage(orgId);
    if (limits.maxActiveProjects !== -1 && usage.projects >= limits.maxActiveProjects) {
      throw new PlanLimitError('active_projects', usage.projects, limits.maxActiveProjects);
    }

    const projectId = await generateUniqueBase64Id('p');

    return prisma.project.create({
      data: {
        id: projectId,
        organizationId: orgId,
        clientId: input.clientId,
        name: input.name,
        description: input.description,
        category: input.category,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        dueDate: (input.dueDate || input.targetEndDate) ? new Date(input.dueDate || input.targetEndDate!) : undefined,
        createdById: userId,
      },
      include: { client: { select: { id: true, name: true } } },
    });
  }

  async list(orgId: string, input: ListProjectsInput) {
    const where: any = { organizationId: orgId };

    if (input.status === 'ALL') {
      where.status = { not: 'ARCHIVED' };
    } else {
      where.status = input.status;
    }
    if (input.clientId) {
      where.clientId = input.clientId;
    }
    if (input.search) {
      where.OR = [
        { name: { contains: input.search, mode: 'insensitive' } },
        { description: { contains: input.search, mode: 'insensitive' } },
        { client: { name: { contains: input.search, mode: 'insensitive' } } },
        { category: { contains: input.search, mode: 'insensitive' } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { tasks: true, deliverables: true } },
      },
    });

    const total = await prisma.project.count({ where });

    return {
      projects,
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
          orderBy: { updatedAt: 'desc' },
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

    const effectiveDueDate = input.dueDate !== undefined ? input.dueDate : input.targetEndDate;
    const normalizedStatus = input.status === 'PLANNING' ? 'DRAFT'
      : (input.status === 'IN_PROGRESS' || input.status === 'REVIEW') ? 'ACTIVE'
      : input.status;

    return prisma.project.update({
      where: { id: projectId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(normalizedStatus !== undefined && { status: normalizedStatus as any }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.startDate !== undefined && {
          startDate: input.startDate ? new Date(input.startDate) : null,
        }),
        ...(effectiveDueDate !== undefined && {
          dueDate: effectiveDueDate ? new Date(effectiveDueDate) : null,
        }),
      },
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { tasks: true, deliverables: true } },
      },
    });
  }

  /**
   * List projects accessible to a client user
   */
  async listForClientUser(orgId: string, userId: string) {
    const clientAccesses = await prisma.clientAccess.findMany({
      where: { userId, organizationId: orgId, isActive: true },
      select: { clientId: true },
    });

    const clientIds = clientAccesses.map((ca) => ca.clientId);
    if (clientIds.length === 0) {
      return [];
    }

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

  async archive(orgId: string, projectId: string) {
    const existing = await prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!existing) throw new NotFoundError('Project');

    return prisma.project.update({
      where: { id: projectId },
      data: { status: 'ARCHIVED' },
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { tasks: true, deliverables: true } },
      },
    });
  }

  async reactivate(orgId: string, projectId: string) {
    const existing = await prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!existing) throw new NotFoundError('Project');

    return prisma.project.update({
      where: { id: projectId },
      data: { status: 'ACTIVE' },
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { tasks: true, deliverables: true } },
      },
    });
  }

  async delete(orgId: string, projectId: string) {
    const existing = await prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!existing) throw new NotFoundError('Project');

    // Cascade delete deliverables and their children
    const deliverableIds = (
      await prisma.deliverable.findMany({
        where: { projectId },
        select: { id: true },
      })
    ).map((d) => d.id);

    if (deliverableIds.length > 0) {
      await prisma.approval.deleteMany({
        where: { deliverableId: { in: deliverableIds } },
      });
      await prisma.deliverableVersion.deleteMany({
        where: { deliverableId: { in: deliverableIds } },
      });
      await prisma.deliverable.deleteMany({
        where: { id: { in: deliverableIds } },
      });
    }

    await prisma.task.deleteMany({
      where: { projectId },
    });
    await prisma.comment.deleteMany({
      where: { resourceType: 'project', resourceId: projectId },
    });

    return prisma.project.delete({
      where: { id: projectId },
    });
  }
}

