import crypto from 'crypto';

export type SingleLetterPrefix = 'u' | 'o' | 'c' | 'p' | 'd';
export type IdPrefix = SingleLetterPrefix | 'usr' | 'org' | 'cli' | 'prj' | 'del' | string;

/**
 * Mapping of prefix to Base64 digit length:
 * - u (User): 6 digits
 * - o (Organization / Agency): 6 digits
 * - c (Client): 6 digits
 * - p (Project): 8 digits
 * - d (Deliverable): 8 digits
 */
const DEFAULT_PREFIX_LENGTHS: Record<string, number> = {
  u: 6,
  usr: 6,
  o: 6,
  org: 6,
  a: 6,
  c: 6,
  cli: 6,
  p: 8,
  prj: 8,
  d: 8,
  del: 8,
};

/**
 * Generates a URL-safe Base64 string of exact length `digits`.
 */
export function generateRawBase64Id(digits: number = 8): string {
  const bytesNeeded = Math.ceil((digits * 6) / 8) + 2;
  return crypto
    .randomBytes(bytesNeeded)
    .toString('base64url')
    .slice(0, digits);
}

/**
 * Generates a Base64 (URL-safe) ID with a single-letter prefix.
 * Lengths by entity:
 *  - u_xxxxxx (User: 1 letter + 6 Base64 digits) - ~68.7 billion combinations
 *  - o_xxxxxx (Agency: 1 letter + 6 Base64 digits) - ~68.7 billion combinations
 *  - c_xxxxxx (Client: 1 letter + 6 Base64 digits) - ~68.7 billion combinations
 *  - p_xxxxxxxx (Project: 1 letter + 8 Base64 digits) - ~281.4 trillion combinations
 *  - d_xxxxxxxx (Deliverable: 1 letter + 8 Base64 digits) - ~281.4 trillion combinations
 */
export function generateBase64Id(prefix: IdPrefix, customDigits?: number): string {
  const digits = customDigits ?? DEFAULT_PREFIX_LENGTHS[prefix] ?? 8;
  const base64Digits = generateRawBase64Id(digits);
  return `${prefix}_${base64Digits}`;
}

export function isPrefixedId(id: string, prefix: IdPrefix): boolean {
  return typeof id === 'string' && id.startsWith(`${prefix}_`);
}
