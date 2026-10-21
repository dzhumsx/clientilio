import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

// Deriva chave de 256 bits a partir do secret do ambiente usando PBKDF2
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Criptografa texto usando AES-256-GCM com autenticação de integridade (AEAD)
 * Formato retornado: salt:iv:tag:ciphertext (base64)
 */
export function encryptData(plainText: string, secretKey: string = env.JWT_ACCESS_SECRET): string {
  if (!plainText) return '';

  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(secretKey, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    salt.toString('base64'),
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/**
 * Descriptografa string cifrada em AES-256-GCM com validação de tag de autenticação
 */
export function decryptData(encryptedPayload: string, secretKey: string = env.JWT_ACCESS_SECRET): string {
  if (!encryptedPayload) return '';

  const parts = encryptedPayload.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted payload format');
  }

  const [saltB64, ivB64, tagB64, ciphertextB64] = parts;
  const salt = Buffer.from(saltB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');

  const key = deriveKey(secretKey, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Gera HMAC seguro SHA-256 para checagens de integridade
 */
export function generateHmac(data: string, secret: string = env.JWT_ACCESS_SECRET): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Mascara strings confidenciais (ex: chaves, e-mails ou senhas em logs)
 */
export function maskSensitive(text: string, visibleChars: number = 4): string {
  if (!text || text.length <= visibleChars) return '***';
  const visible = text.substring(0, visibleChars);
  return `${visible}${'*'.repeat(Math.min(text.length - visibleChars, 12))}`;
}
