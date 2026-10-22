import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} from './auth.validation';
import { authenticate } from '../../middleware/auth';
import { verifyAccessToken, verifyRefreshToken, getSessionCookieOptions, SESSION_COOKIE_NAME, verifyPassword } from '../../lib/auth';
import { UnauthorizedError, AppError, NotFoundError } from '../../lib/errors';
import { isProduction } from '../../config/env';
import { mfaService } from '../../lib/mfa.service';
import { prisma } from '../../lib/prisma';

const router = Router();
const authService = new AuthService();

function hasCookieConsent(req: Request): boolean {
  return (
    req.headers['x-cookie-consent'] === 'true' ||
    req.body?.cookieConsent === true ||
    req.cookies?.['cookie_consent'] === 'accepted'
  );
}

// POST /api/auth/consent-cookies
// Armazena cookies APENAS após o usuário aceitar explicitamente
router.post('/consent-cookies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = '';
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.body?.token) {
      token = req.body.token;
    }

    if (token) {
      try {
        verifyAccessToken(token);
        res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions(isProduction));
      } catch {
        // Token inválido/expirado
      }
    }

    // Registra cookie persistente de consentimento (1 ano)
    res.cookie('cookie_consent', 'accepted', {
      httpOnly: false,
      secure: isProduction,
      sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({ success: true, message: 'Cookies aceitos e armazenados com sucesso' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    if (hasCookieConsent(req)) {
      res.cookie(SESSION_COOKIE_NAME, result.accessToken, getSessionCookieOptions(isProduction));
    }
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);

    // Se o MFA for exigido, retorna ticket para desafio sem emitir cookie de sessão ainda
    if (result.mfaRequired) {
      return res.json({
        mfaRequired: true,
        mfaTicket: result.mfaTicket,
      });
    }

    if (hasCookieConsent(req)) {
      res.cookie(SESSION_COOKIE_NAME, result.accessToken, getSessionCookieOptions(isProduction));
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }

    const payload = verifyRefreshToken(refreshToken);
    const result = await authService.refreshAccessToken(payload.tokenId, payload.userId);
    if (hasCookieConsent(req)) {
      res.cookie(SESSION_COOKIE_NAME, result.accessToken, getSessionCookieOptions(isProduction));
    }
    res.json(result);
  } catch (error) {
    next(new UnauthorizedError('Invalid refresh token'));
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await authService.logout(payload.tokenId);
      } catch {
        // Token might be invalid, still log out
      }
    }
    res.clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions(isProduction));
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = forgotPasswordSchema.parse(req.body);
    const result = await authService.forgotPassword(data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const result = await authService.resetPassword(data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await authService.getProfile(req.user!.userId);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const profile = await authService.updateProfile(req.user!.userId, data);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    const result = await authService.changePassword(req.user!.userId, data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================
// Multi-Factor Authentication (MFA / 2FA) Routes
// ============================================

// POST /api/auth/mfa/setup — Inicia configuração de MFA com TOTP
router.post('/mfa/setup', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await mfaService.setupMfa(req.user!.userId, req.user!.email);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/mfa/enable — Confirma o primeiro código e ativa o MFA
router.post('/mfa/enable', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.body;
    if (!code) throw new AppError('Código de verificação é obrigatório', 400);
    const result = await mfaService.enableMfa(req.user!.userId, code);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/mfa/disable — Desativa o MFA mediante confirmação de senha
router.post('/mfa/disable', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body;
    if (!password) throw new AppError('Senha atual é necessária para desativar o MFA', 400);
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new NotFoundError('User');
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Senha incorreta');
    await mfaService.disableMfa(req.user!.userId);
    res.json({ message: 'MFA desativado com sucesso' });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/mfa/status — Verifica se o MFA está ativo para o usuário
router.get('/mfa/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enabled = await mfaService.isMfaEnabled(req.user!.userId);
    res.json({ enabled });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/mfa/verify-login — Valida código 2FA / backup code no desafio de login
router.post('/mfa/verify-login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mfaTicket, code } = req.body;
    if (!mfaTicket || !code) {
      throw new UnauthorizedError('mfaTicket e código 2FA são obrigatórios');
    }
    const { userId } = mfaService.verifyMfaTicket(mfaTicket);
    const valid = await mfaService.verifyCodeOrBackup(userId, code);
    if (!valid) {
      throw new UnauthorizedError('Código MFA ou código de backup inválido');
    }
    const result = await authService.completeMfaLogin(userId);
    if (hasCookieConsent(req)) {
      res.cookie(SESSION_COOKIE_NAME, result.accessToken, getSessionCookieOptions(isProduction));
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
