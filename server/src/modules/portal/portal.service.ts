import { prisma } from '../../lib/prisma';
import { NotFoundError, AppError } from '../../lib/errors';

export class PortalService {
  /**
   * Fetch project portal public data by token or project ID.
   * Completely accessible without password/login.
   */
  async getProjectPortal(token: string) {
    if (!token || !token.trim()) {
      throw new NotFoundError('Portal token');
    }

    const cleanToken = token.trim();

    // Query project with its client, agency (organization), and deliverables
    const project = await prisma.project.findFirst({
      where: {
        id: cleanToken,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
            email: true,
            notes: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            brandSettings: true,
          },
        },
        deliverables: {
          where: {
            status: { not: 'ARCHIVED' },
          },
          orderBy: { updatedAt: 'desc' },
          include: {
            versions: {
              orderBy: { versionNumber: 'desc' },
              include: {
                file: {
                  select: {
                    id: true,
                    originalName: true,
                    mimeType: true,
                    sizeBytes: true,
                    storageKey: true,
                  },
                },
                approvals: {
                  orderBy: { createdAt: 'desc' },
                  include: {
                    actor: {
                      select: {
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Projeto ou Portal do Cliente');
    }

    // Fetch comments for all deliverables in this project
    const deliverableIds = project.deliverables.map((d) => d.id);
    const comments = deliverableIds.length > 0
      ? await prisma.comment.findMany({
          where: {
            organizationId: project.organizationId,
            resourceType: 'DELIVERABLE',
            resourceId: { in: deliverableIds },
            visibility: 'CLIENT_VISIBLE',
            deletedAt: null,
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    // Map comments to deliverables
    const deliverablesWithComments = project.deliverables.map((d) => ({
      ...d,
      comments: comments.filter((c) => c.resourceId === d.id),
    }));

    // Compute progress and delivery metrics
    const totalDeliverables = project.deliverables.length;
    const approvedDeliverables = project.deliverables.filter((d) => d.status === 'APPROVED').length;
    const inReviewDeliverables = project.deliverables.filter(
      (d) => d.status === 'IN_REVIEW' || d.status === 'DRAFT'
    ).length;
    const changesRequestedDeliverables = project.deliverables.filter(
      (d) => d.status === 'CHANGES_REQUESTED'
    ).length;

    const progressPercentage =
      totalDeliverables > 0
        ? Math.round((approvedDeliverables / totalDeliverables) * 100)
        : 0;

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        category: project.category,
        startDate: project.startDate,
        dueDate: project.dueDate,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      client: project.client,
      agency: {
        id: project.organization.id,
        name: project.organization.name,
        slug: project.organization.slug,
        brandSettings: project.organization.brandSettings,
      },
      deliverables: deliverablesWithComments,
      metrics: {
        total: totalDeliverables,
        approved: approvedDeliverables,
        inReview: inReviewDeliverables,
        changesRequested: changesRequestedDeliverables,
        progressPercentage,
      },
    };
  }

  /**
   * Submit client approval or requested changes from the public portal without password.
   */
  async submitDecision(
    token: string,
    deliverableId: string,
    versionId: string,
    input: {
      decision: 'APPROVED' | 'CHANGES_REQUESTED';
      comment?: string;
      clientName?: string;
    }
  ) {
    const cleanToken = token.trim();

    // Verify project belongs to token
    const project = await prisma.project.findFirst({
      where: { id: cleanToken },
      include: {
        client: { select: { name: true } },
      },
    });

    if (!project) {
      throw new NotFoundError('Portal token');
    }

    // Verify deliverable belongs to this project
    const deliverable = await prisma.deliverable.findFirst({
      where: {
        id: deliverableId,
        projectId: project.id,
      },
    });

    if (!deliverable) {
      throw new NotFoundError('Deliverable');
    }

    if (deliverable.status === 'ARCHIVED') {
      throw new AppError('Este entregável está arquivado.', 400);
    }

    // Verify version belongs to this deliverable
    const version = await prisma.deliverableVersion.findFirst({
      where: {
        id: versionId,
        deliverableId,
      },
    });

    if (!version) {
      throw new NotFoundError('Versão do entregável');
    }

    const clientIdentifier = input.clientName?.trim() || project.client?.name || 'Cliente';
    const feedbackNote =
      input.comment?.trim() ||
      (input.decision === 'APPROVED'
        ? `Aprovado pelo cliente (${clientIdentifier}) via Portal`
        : `Solicitação de ajustes enviada pelo cliente (${clientIdentifier}) via Portal`);

    // 1. Create approval record
    const approval = await prisma.approval.create({
      data: {
        organizationId: project.organizationId,
        deliverableId: deliverable.id,
        versionId: version.id,
        actorId: project.createdById,
        decision: input.decision,
        comment: `[${clientIdentifier}]: ${feedbackNote}`,
      },
    });

    // 2. Update parent deliverable status
    const newStatus = input.decision === 'APPROVED' ? 'APPROVED' : 'CHANGES_REQUESTED';
    await prisma.deliverable.update({
      where: { id: deliverable.id },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    // 3. Register comment on deliverable if commentary was provided
    if (input.comment?.trim()) {
      await prisma.comment.create({
        data: {
          organizationId: project.organizationId,
          resourceType: 'DELIVERABLE',
          resourceId: deliverable.id,
          authorId: project.createdById,
          body: `[Portal do Cliente - ${clientIdentifier}]: ${input.comment.trim()}`,
          visibility: 'CLIENT_VISIBLE',
        },
      });
    }

    return {
      success: true,
      decision: input.decision,
      approvalId: approval.id,
      message:
        input.decision === 'APPROVED'
          ? 'Entregável aprovado com sucesso! A agência foi notificada.'
          : 'Solicitação de ajustes enviada com sucesso! A agência revisará as alterações solicitadas.',
    };
  }

  /**
   * Client posts feedback/comment on a deliverable without password.
   */
  async submitComment(
    token: string,
    deliverableId: string,
    input: {
      content: string;
      clientName?: string;
    }
  ) {
    if (!input.content || !input.content.trim()) {
      throw new AppError('O comentário não pode estar vazio.', 400);
    }

    const cleanToken = token.trim();
    const project = await prisma.project.findFirst({
      where: { id: cleanToken },
      include: { client: { select: { name: true } } },
    });

    if (!project) throw new NotFoundError('Portal token');

    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, projectId: project.id },
    });

    if (!deliverable) throw new NotFoundError('Deliverable');

    const author = input.clientName?.trim() || project.client?.name || 'Cliente';

    const comment = await prisma.comment.create({
      data: {
        organizationId: project.organizationId,
        resourceType: 'DELIVERABLE',
        resourceId: deliverable.id,
        authorId: project.createdById,
        body: `[${author}]: ${input.content.trim()}`,
        visibility: 'CLIENT_VISIBLE',
      },
    });

    return {
      success: true,
      comment: {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        authorName: author,
      },
    };
  }
}
