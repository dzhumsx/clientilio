import { prisma } from '../../lib/prisma';
import { NotFoundError, AppError, ForbiddenError } from '../../lib/errors';
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

    return prisma.deliverable.create({
      data: {
        organizationId: orgId,
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        type: input.type,
        createdById: userId,
      },
    });
  }

  async listByProject(orgId: string, projectId?: string) {
    const where: any = { organizationId: orgId };
    if (projectId) {
      where.projectId = projectId;
    }
    return prisma.deliverable.findMany({
      where,
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        _count: { select: { versions: true, approvals: true } },
      },
      orderBy: { createdAt: 'desc' },
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
        project: { select: { id: true, name: true, clientId: true } },
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
        fileId: input.fileId,
        externalUrl: input.externalUrl,
        notes: input.notes,
        createdById: userId,
      },
    });

    return version;
  }

  async submitForReview(orgId: string, deliverableId: string) {
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, organizationId: orgId },
    });
    if (!deliverable) throw new NotFoundError('Deliverable');

    if (deliverable.status !== 'DRAFT' && deliverable.status !== 'CHANGES_REQUESTED') {
      throw new AppError('Deliverable can only be submitted from draft or changes_requested status', 400);
    }

    // Must have at least one version
    const versionCount = await prisma.deliverableVersion.count({
      where: { deliverableId },
    });
    if (versionCount === 0) {
      throw new AppError('Deliverable must have at least one version before submitting', 400);
    }

    return prisma.deliverable.update({
      where: { id: deliverableId },
      data: { status: 'IN_REVIEW' },
    });
  }

  async submitApproval(orgId: string, deliverableId: string, versionId: string, input: SubmitApprovalInput, userId: string) {
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, organizationId: orgId },
    });
    if (!deliverable) throw new NotFoundError('Deliverable');

    if (deliverable.status !== 'IN_REVIEW') {
      throw new AppError('Deliverable must be in review to approve', 400);
    }

    // Verify version belongs to this deliverable
    const version = await prisma.deliverableVersion.findFirst({
      where: { id: versionId, deliverableId },
    });
    if (!version) throw new NotFoundError('Version');

    // Check for duplicate approval
    const existingApproval = await prisma.approval.findFirst({
      where: { versionId, actorId: userId },
    });
    if (existingApproval) {
      throw new AppError('You have already submitted a decision for this version', 409);
    }

    const approval = await prisma.$transaction(async (tx) => {
      const created = await tx.approval.create({
        data: {
          organizationId: orgId,
          deliverableId,
          versionId,
          actorId: userId,
          decision: input.decision,
          comment: input.comment,
        },
      });

      // Update deliverable status based on decision
      await tx.deliverable.update({
        where: { id: deliverableId },
        data: {
          status: input.decision === 'APPROVED' ? 'APPROVED' : 'CHANGES_REQUESTED',
        },
      });

      return created;
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
