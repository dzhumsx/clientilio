import crypto from 'crypto';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Converte Buffer para string Base32 (RFC 4648)
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodifica string Base32 para Buffer
 */
export function base32Decode(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_CHARS.indexOf(cleaned[i]);
    if (val === -1) continue;

    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Gera um segredo TOTP seguro em Base32 (20 bytes / 160 bits)
 */
export function generateTotpSecret(): string {
  const randomBytes = crypto.randomBytes(20);
  return base32Encode(randomBytes);
}

/**
 * Gera o código TOTP de 6 dígitos para um segredo e contador de tempo (RFC 6238)
 */
export function generateTotpCode(secret: string, timeStep: number = Math.floor(Date.now() / 1000 / 30)): string {
  const key = base32Decode(secret);

  // Buffer de 8 bytes para o contador de tempo
  const counterBuf = Buffer.alloc(8);
  let temp = timeStep;
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }

  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;

  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Valida código TOTP com tolerância a drift de relógio (+/- 1 janela de 30 segundos)
 */
export function verifyTotpCode(secret: string, token: string, windowSteps: number = 1): boolean {
  if (!token || token.trim().length !== 6) return false;

  const currentStep = Math.floor(Date.now() / 1000 / 30);
  const cleanToken = token.trim();

  for (let step = -windowSteps; step <= windowSteps; step++) {
    const expected = generateTotpCode(secret, currentStep + step);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(cleanToken))) {
      return true;
    }
  }

  return false;
}

/**
 * Gera URI compatível com Google Authenticator, 1Password, Authy
 */
export function generateTotpUri(accountName: string, issuer: string, secret: string): string {
  const encAccount = encodeURIComponent(accountName);
  const encIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${encIssuer}:${encAccount}?secret=${secret}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Gera lista de códigos de backup de emergência (formato xxxx-xxxx)
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString('hex');
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`.toUpperCase());
  }
  return codes;
}
