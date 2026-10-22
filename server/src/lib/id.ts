import crypto from 'crypto';

export type SingleLetterPrefix = 'u' | 'o' | 'c' | 'p' | 'd';
export type IdPrefix = SingleLetterPrefix | string;

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
  o: 6,
  c: 6,
  p: 8,
  d: 8,
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
 * Generates a Base64 (URL-safe) ID with a single-letter prefix without underscore.
 * Lengths by entity:
 *  - uxxxxxx (User: 1 letter + 6 Base64 digits) - ~68.7 billion combinations
 *  - oxxxxxx (Agency: 1 letter + 6 Base64 digits) - ~68.7 billion combinations
 *  - cxxxxxx (Client: 1 letter + 6 Base64 digits) - ~68.7 billion combinations
 *  - pxxxxxxxx (Project: 1 letter + 8 Base64 digits) - ~281.4 trillion combinations
 *  - dxxxxxxxx (Deliverable: 1 letter + 8 Base64 digits) - ~281.4 trillion combinations
 */
export function generateBase64Id(prefix: IdPrefix, customDigits?: number): string {
  const digits = customDigits ?? DEFAULT_PREFIX_LENGTHS[prefix] ?? 8;
  const base64Digits = generateRawBase64Id(digits);
  return `${prefix}${base64Digits}`;
}

export function isPrefixedId(id: string, prefix: IdPrefix): boolean {
  return typeof id === 'string' && id.startsWith(prefix);
}

export function stripPrefix(id: string, prefix: IdPrefix): string {
  if (typeof id !== 'string') return '';
  if (id.startsWith(prefix)) return id.slice(prefix.length);
  return id;
}
