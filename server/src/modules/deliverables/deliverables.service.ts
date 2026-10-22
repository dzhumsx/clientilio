import { prisma } from '../../lib/prisma';
import { NotFoundError, AppError, ForbiddenError } from '../../lib/errors';
import { generateBase64Id } from '../../lib/id';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  CreateDeliverableInput,
  UpdateDeliverableInput,
  CreateVersionInput,
  SubmitApprovalInput,
  CreateCommentInput,
} from './deliverables.validation';

export class TaskService {
  async create(orgId: string, input: CreateTaskInput, userId: string) {
    // Verify project belongs to org
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, organizationId: orgId },
    });
    if (!project) throw new NotFoundError('Project');

    return prisma.task.create({
      data: {
        organizationId: orgId,
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        assigneeId: input.assigneeId,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        createdById: userId,
      },
    });
  }

  async listByProject(orgId: string, projectId: string) {
    return prisma.task.findMany({
      where: { organizationId: orgId, projectId },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async update(orgId: string, taskId: string, input: UpdateTaskInput) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, organizationId: orgId },
    });
    if (!task) throw new NotFoundError('Task');

    return prisma.task.update({
      where: { id: taskId },
      data: {
        ...input,
        dueDate: input.dueDate !== undefined ? (input.dueDate ? new Date(input.dueDate) : null) : undefined,
      },
    });
  }
}

export class DeliverableService {
  async create(orgId: string, input: CreateDeliverableInput, userId: string) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, organizationId: orgId },
    });
    if (!project) throw new NotFoundError('Project');

    const deliverable = await prisma.deliverable.create({
      data: {
        id: generateBase64Id('d'),
        organizationId: orgId,
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        type: input.type,
        createdById: userId,
      },
    });

    if (input.initialExternalUrl || input.initialNotes) {
      await prisma.deliverableVersion.create({
        data: {
          organizationId: orgId,
          deliverableId: deliverable.id,
          versionNumber: 1,
          externalUrl: input.initialExternalUrl || undefined,
          notes: input.initialNotes || undefined,
          createdById: userId,
        },
      });
    }

    return prisma.deliverable.findUnique({
      where: { id: deliverable.id },
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
        _count: { select: { versions: true, approvals: true } },
      },
    });
  }

  async listByProject(orgId: string, projectId?: string, status?: string, search?: string) {
    const where: any = { organizationId: orgId };
    if (projectId) {
      where.projectId = projectId;
    }
    if (status === 'ARCHIVED') {
      where.status = 'ARCHIVED';
    } else {
      where.status = { not: 'ARCHIVED' };
    }
    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { versions: { some: { notes: { contains: s, mode: 'insensitive' } } } },
      ];
    }
    return prisma.deliverable.findMany({
      where,
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            approvals: {
              include: { actor: { select: { id: true, name: true, email: true } } },
              orderBy: { createdAt: 'desc' },
            },
            file: true,
          },
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
          include: {
            actor: { select: { id: true, name: true, email: true } },
            version: { select: { id: true, versionNumber: true } },
          },
        },
        project: { select: { id: true, name: true, clientId: true, client: { select: { id: true, name: true } } } },
        _count: { select: { versions: true, approvals: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  async getById(orgId: string, deliverableId: string) {
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, organizationId: orgId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            approvals: {
              include: { actor: { select: { id: true, name: true, email: true } } },
            },
            file: true,
          },
        },
        project: { select: { id: true, name: true, clientId: true, client: { select: { id: true, name: true } } } },
      },
    });
    if (!deliverable) throw new NotFoundError('Deliverable');
    return deliverable;
  }

  async update(orgId: string, deliverableId: string, input: UpdateDeliverableInput) {
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, organizationId: orgId },
    });
    if (!deliverable) throw new NotFoundError('Deliverable');

    return prisma.deliverable.update({
      where: { id: deliverableId },
      data: input,
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            approvals: {
              include: { actor: { select: { id: true, name: true, email: true } } },
            },
            file: true,
          },
        },
        project: { select: { id: true, name: true } },
      },
    });
  }

  async archive(orgId: string, deliverableId: string) {
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, organizationId: orgId },
    });
    if (!deliverable) throw new NotFoundError('Deliverable');

    return prisma.deliverable.update({
      where: { id: deliverableId },
      data: { status: 'ARCHIVED' },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
        project: { select: { id: true, name: true } },
      },
    });
  }

  async reactivate(orgId: string, deliverableId: string) {
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, organizationId: orgId },
    });
    if (!deliverable) throw new NotFoundError('Deliverable');

    return prisma.deliverable.update({
      where: { id: deliverableId },
      data: { status: 'DRAFT' },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
        project: { select: { id: true, name: true } },
      },
    });
  }

  async delete(orgId: string, deliverableId: string) {
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, organizationId: orgId },
    });
    if (!deliverable) throw new NotFoundError('Deliverable');

    await prisma.approval.deleteMany({
      where: { deliverableId },
    });
    await prisma.deliverableVersion.deleteMany({
      where: { deliverableId },
    });
    await prisma.comment.deleteMany({
      where: { resourceType: 'deliverable', resourceId: deliverableId },
    });

    return prisma.deliverable.delete({
      where: { id: deliverableId },
    });
  }

  async addVersion(orgId: string, deliverableId: string, input: CreateVersionInput, userId: string) {
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, organizationId: orgId },
    });
    if (!deliverable) throw new NotFoundError('Deliverable');

    // Get next version number
    const lastVersion = await prisma.deliverableVersion.findFirst({
      where: { deliverableId },
      orderBy: { versionNumber: 'desc' },
    });

    const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

    const version = await prisma.deliverableVersion.create({
      data: {
        organizationId: orgId,
        deliverableId,
        versionNumber: nextVersionNumber,
        fileId: input.fileId || undefined,
        externalUrl: input.externalUrl || undefined,
        notes: input.notes || undefined,
        createdById: userId,
      },
      include: {
        file: true,
        approvals: true,
      },
    });

    // Update parent deliverable updatedAt and transition to IN_REVIEW if requested or resolving changes
    const shouldSubmit = input.submitForReview || deliverable.status === 'CHANGES_REQUESTED';
    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        ...(shouldSubmit ? { status: 'IN_REVIEW' } : {}),
        updatedAt: new Date(),
      },
    });

    return version;
  }

  async submitForReview(orgId: string, deliverableId: string) {
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, organizationId: orgId },
      select: {
        id: true,
        status: true,
        _count: { select: { versions: true } },
      },
    });
    if (!deliverable) throw new NotFoundError('Deliverable');

    if (deliverable.status !== 'DRAFT' && deliverable.status !== 'CHANGES_REQUESTED') {
      throw new AppError('Deliverable can only be submitted from draft or changes_requested status', 400);
    }

    if (deliverable._count.versions === 0) {
      throw new AppError('Deliverable must have at least one version before submitting', 400);
    }

    return prisma.deliverable.update({
      where: { id: deliverableId },
      data: { status: 'IN_REVIEW' },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            approvals: {
              include: { actor: { select: { id: true, name: true, email: true } } },
              orderBy: { createdAt: 'desc' },
            },
            file: true,
          },
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
          include: {
            actor: { select: { id: true, name: true, email: true } },
            version: { select: { id: true, versionNumber: true } },
          },
        },
        project: { select: { id: true, name: true } },
      },
    });
  }

  async submitApproval(orgId: string, deliverableId: string, versionId: string, input: SubmitApprovalInput, userId: string) {
    // Single consolidated query verifying deliverable status, version existence, and duplicate check
    const version = await prisma.deliverableVersion.findFirst({
      where: { id: versionId, deliverableId, organizationId: orgId },
      include: {
        deliverable: { select: { status: true } },
        approvals: { where: { actorId: userId }, take: 1 },
      },
    });

    if (!version || !version.deliverable) throw new NotFoundError('Deliverable or Version');

    if (version.deliverable.status === 'ARCHIVED') {
      throw new AppError('Cannot submit approval for an archived deliverable', 400);
    }

    if (version.deliverable.status === 'DRAFT') {
      throw new AppError('Cannot submit approval for a draft deliverable. It must be submitted for review first.', 400);
    }

    const existingApproval = version.approvals[0];

    const approval = await prisma.$transaction(async (tx) => {
      let result;
      if (existingApproval) {
        result = await tx.approval.update({
          where: { id: existingApproval.id },
          data: {
            decision: input.decision,
            comment: input.comment,
            createdAt: new Date(),
          },
          include: {
            actor: { select: { id: true, name: true, email: true } },
            version: { select: { id: true, versionNumber: true } },
          },
        });
      } else {
        result = await tx.approval.create({
          data: {
            organizationId: orgId,
            deliverableId,
            versionId,
            actorId: userId,
            decision: input.decision,
            comment: input.comment,
          },
          include: {
            actor: { select: { id: true, name: true, email: true } },
            version: { select: { id: true, versionNumber: true } },
          },
        });
      }

      // Update deliverable status based on decision
      await tx.deliverable.update({
        where: { id: deliverableId },
        data: {
          status: input.decision === 'APPROVED' ? 'APPROVED' : 'CHANGES_REQUESTED',
          updatedAt: new Date(),
        },
      });

      return result;
    });

    return approval;
  }
}

export class CommentService {
  async create(orgId: string, input: CreateCommentInput, userId: string, isClientUser: boolean) {
    // If client user, force CLIENT_VISIBLE and prevent INTERNAL comments
    const visibility = isClientUser ? 'CLIENT_VISIBLE' : input.visibility;

    return prisma.comment.create({
      data: {
        organizationId: orgId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        authorId: userId,
        body: input.body,
        visibility,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async listByResource(orgId: string, resourceType: string, resourceId: string, isClientUser: boolean) {
    const where: any = {
      organizationId: orgId,
      resourceType,
      resourceId,
      deletedAt: null,
    };

    // Client users can only see CLIENT_VISIBLE comments
    if (isClientUser) {
      where.visibility = 'CLIENT_VISIBLE';
    }

    return prisma.comment.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
