import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../lib/errors';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { verifyPassword } from '../lib/auth';

/**
 * PMP (Princípio do Menor Privilégio & Privileged Access Management)
 *
 * Garante que ações administrativas de alto impacto:
 * 1. Exijam o papel mais restrito necessário (ex: estritamente OWNER).
 * 2. Bloqueiem elevação indevida de privilégios (ex: atribuir cargos superiores ao próprio).
 * 3. Permitam confirmação por senha (Step-up / Sudo Mode) para operações críticas.
 * 4. Gravem trilha de auditoria para cada tentativa de uso de privilégio elevado.
 */

export interface ElevationOptions {
  actionDescription: string;
  requireSudoPassword?: boolean;
}

/**
 * Middleware que reforça o Princípio do Menor Privilégio para operações críticas
 */
export function requirePrivilegedAccess(options: ElevationOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      const orgId = req.organizationId;
      const role = req.memberRole;

      if (!user) {
        throw new UnauthorizedError('Autenticação requerida');
      }

      // 1. Verificação de menor privilégio estrito: apenas OWNER tem acesso à operação
      if (role !== 'OWNER') {
        logger.audit({
          action: 'PRIVILEGED_ACCESS_DENIED',
          category: 'ADMIN',
          userId: user.userId,
          organizationId: orgId,
          status: 'FAILURE',
          details: {
            requiredRole: 'OWNER',
            actualRole: role,
            action: options.actionDescription,
          },
        });
        throw new ForbiddenError(
          `Ação restrita pelo Princípio do Menor Privilégio. Apenas o proprietário da organização pode executar: ${options.actionDescription}`
        );
      }

      // 2. Step-up Authentication (Sudo mode) se a operação exigir revalidação de credencial
      if (options.requireSudoPassword) {
        const sudoPassword = req.headers['x-sudo-password'] as string | undefined;
        if (!sudoPassword) {
          throw new UnauthorizedError(
            'Confirmação de senha (header x-sudo-password) necessária para autorizar esta ação crítica'
          );
        }

        const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
        if (!dbUser || !(await verifyPassword(sudoPassword, dbUser.passwordHash))) {
          logger.audit({
            action: 'SUDO_STEPUP_FAILED',
            category: 'ADMIN',
            userId: user.userId,
            organizationId: orgId,
            status: 'FAILURE',
            details: { action: options.actionDescription },
          });
          throw new UnauthorizedError('Senha de confirmação de privilégio incorreta');
        }
      }

      // Registra sucesso do acesso privilegiado na auditoria
      logger.audit({
        action: 'PRIVILEGED_ACTION_EXECUTED',
        category: 'ADMIN',
        userId: user.userId,
        organizationId: orgId,
        status: 'SUCCESS',
        details: { action: options.actionDescription },
      });

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Impede que usuários convidem ou promovam outros usuários para cargos superiores ou iguais ao seu
 */
export function enforceLeastPrivilegeAssignment(actorRole: string, targetRole: string): void {
  const roleHierarchy: Record<string, number> = {
    MEMBER: 1,
    ADMIN: 2,
    OWNER: 3,
  };

  const actorLevel = roleHierarchy[actorRole] || 0;
  const targetLevel = roleHierarchy[targetRole] || 0;

  if (targetLevel >= actorLevel && actorRole !== 'OWNER') {
    throw new ForbiddenError(
      `Violação do Princípio do Menor Privilégio: Um ${actorRole} não pode conceder ou gerenciar permissões de nível ${targetRole}`
    );
  }
}
