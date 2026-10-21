import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { generateTotpSecret, generateTotpUri, verifyTotpCode, generateBackupCodes } from './totp';
import { encryptData, decryptData } from './encryption';
import { hashToken } from './auth';
import { UnauthorizedError, AppError } from './errors';
import { logger } from './logger';

export interface UserMfaRecord {
  userId: string;
  enabled: boolean;
  encryptedSecret: string;
  hashedBackupCodes: string[];
  pendingSecret?: string; // Segredo temporário durante configuração
  updatedAt: string;
}

const MFA_STORE_DIR = path.resolve(__dirname, '../../.data');
const MFA_STORE_FILE = path.join(MFA_STORE_DIR, 'mfa_security.json');

// Garante diretório seguro de armazenamento
function ensureStore(): Record<string, UserMfaRecord> {
  if (!fs.existsSync(MFA_STORE_DIR)) {
    fs.mkdirSync(MFA_STORE_DIR, { recursive: true });
  }
  if (!fs.existsSync(MFA_STORE_FILE)) {
    fs.writeFileSync(MFA_STORE_FILE, JSON.stringify({}), 'utf8');
    return {};
  }
  try {
    const raw = fs.readFileSync(MFA_STORE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveStore(data: Record<string, UserMfaRecord>): void {
  ensureStore();
  fs.writeFileSync(MFA_STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export class MfaService {
  /**
   * Verifica se o usuário tem MFA ativo
   */
  async isMfaEnabled(userId: string): Promise<boolean> {
    const store = ensureStore();
    return !!store[userId]?.enabled;
  }

  /**
   * Inicia a configuração do MFA (Gera chave Base32 e Códigos de Recuperação)
   */
  async setupMfa(userId: string, email: string): Promise<{ secret: string; uri: string; backupCodes: string[] }> {
    const secret = generateTotpSecret();
    const backupCodes = generateBackupCodes(8);
    const uri = generateTotpUri(email, 'Nexora Portal', secret);

    const store = ensureStore();
    store[userId] = {
      userId,
      enabled: false,
      encryptedSecret: '',
      pendingSecret: encryptData(secret),
      hashedBackupCodes: backupCodes.map((code) => hashToken(code.trim().toUpperCase())),
      updatedAt: new Date().toISOString(),
    };
    saveStore(store);

    logger.audit({
      action: 'MFA_SETUP_INITIATED',
      category: 'AUTH',
      userId,
      status: 'SUCCESS',
    });

    return { secret, uri, backupCodes };
  }

  /**
   * Valida o primeiro código e ativa permanentemente o MFA para a conta
   */
  async enableMfa(userId: string, token: string): Promise<{ success: boolean }> {
    const store = ensureStore();
    const record = store[userId];

    if (!record || !record.pendingSecret) {
      throw new AppError('Nenhum setup de MFA pendente encontrado', 400);
    }

    const secret = decryptData(record.pendingSecret);
    const isValid = verifyTotpCode(secret, token);

    if (!isValid) {
      logger.audit({
        action: 'MFA_ENABLE_FAILED',
        category: 'AUTH',
        userId,
        status: 'FAILURE',
        details: { reason: 'Invalid verification token' },
      });
      throw new UnauthorizedError('Código de autenticação inválido');
    }

    record.enabled = true;
    record.encryptedSecret = record.pendingSecret;
    delete record.pendingSecret;
    record.updatedAt = new Date().toISOString();
    saveStore(store);

    logger.audit({
      action: 'MFA_ENABLED_SUCCESSFULLY',
      category: 'AUTH',
      userId,
      status: 'SUCCESS',
    });

    return { success: true };
  }

  /**
   * Valida código TOTP ou código de emergência de backup
   */
  async verifyCodeOrBackup(userId: string, code: string): Promise<boolean> {
    const store = ensureStore();
    const record = store[userId];

    if (!record || !record.enabled || !record.encryptedSecret) {
      return false;
    }

    const cleanInput = code.trim().toUpperCase();

    // 1. Testa se é um código TOTP de 6 dígitos
    if (/^\d{6}$/.test(cleanInput)) {
      const secret = decryptData(record.encryptedSecret);
      const isTotpValid = verifyTotpCode(secret, cleanInput);
      if (isTotpValid) {
        logger.audit({
          action: 'MFA_VERIFIED_TOTP',
          category: 'AUTH',
          userId,
          status: 'SUCCESS',
        });
        return true;
      }
    }

    // 2. Testa se é um código de backup (ex: XXXX-XXXX)
    const inputHash = hashToken(cleanInput);
    const backupIndex = record.hashedBackupCodes.indexOf(inputHash);

    if (backupIndex !== -1) {
      // Consome o código de backup de uso único
      record.hashedBackupCodes.splice(backupIndex, 1);
      record.updatedAt = new Date().toISOString();
      saveStore(store);

      logger.audit({
        action: 'MFA_VERIFIED_BACKUP_CODE',
        category: 'AUTH',
        userId,
        status: 'SUCCESS',
        details: { remainingCodes: record.hashedBackupCodes.length },
      });

      return true;
    }

    logger.audit({
      action: 'MFA_VERIFICATION_FAILED',
      category: 'AUTH',
      userId,
      status: 'FAILURE',
    });

    return false;
  }

  /**
   * Desativa o MFA
   */
  async disableMfa(userId: string): Promise<boolean> {
    const store = ensureStore();
    if (store[userId]) {
      delete store[userId];
      saveStore(store);
    }

    logger.audit({
      action: 'MFA_DISABLED',
      category: 'AUTH',
      userId,
      status: 'WARNING',
    });

    return true;
  }

  /**
   * Gera ticket temporário assinado de 5 minutos para desafio no login
   */
  generateMfaTicket(userId: string): string {
    return jwt.sign({ userId, purpose: 'mfa_challenge' }, env.JWT_ACCESS_SECRET, {
      expiresIn: '5m',
    });
  }

  /**
   * Valida ticket do desafio de login
   */
  verifyMfaTicket(ticket: string): { userId: string } {
    try {
      const payload = jwt.verify(ticket, env.JWT_ACCESS_SECRET) as any;
      if (payload.purpose !== 'mfa_challenge' || !payload.userId) {
        throw new UnauthorizedError('Ticket MFA inválido');
      }
      return { userId: payload.userId };
    } catch {
      throw new UnauthorizedError('Ticket MFA expirado ou inválido');
    }
  }
}

export const mfaService = new MfaService();
