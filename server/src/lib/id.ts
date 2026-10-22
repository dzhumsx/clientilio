import crypto from 'crypto';
import { prisma } from './prisma';
import type { Prisma, PrismaClient } from '@prisma/client';

export type SingleLetterPrefix = 'u' | 'o' | 'c' | 'p' | 'd' | 't';
export type IdPrefix = SingleLetterPrefix | string;

export type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Mapping of prefix to Base64 digit length:
 * - u (User): 6 digits
 * - o (Organization / Agency): 6 digits
 * - c (Client): 6 digits
 * - p (Project): 8 digits
 * - d (Deliverable): 8 digits
 * - t (Task): 8 digits
 */
const DEFAULT_PREFIX_LENGTHS: Record<string, number> = {
  u: 6,
  o: 6,
  c: 6,
  p: 8,
  d: 8,
  t: 8,
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

/**
 * Checks if an ID already exists in the corresponding database table.
 */
export async function checkIdExists(id: string, prefix: IdPrefix, db: DbClient = prisma): Promise<boolean> {
  try {
    switch (prefix) {
      case 'u': {
        const found = await (db as any).user.findUnique({
          where: { id },
          select: { id: true },
        });
        return Boolean(found);
      }
      case 'o': {
        const found = await (db as any).organization.findUnique({
          where: { id },
          select: { id: true },
        });
        return Boolean(found);
      }
      case 'c': {
        const found = await (db as any).client.findUnique({
          where: { id },
          select: { id: true },
        });
        return Boolean(found);
      }
      case 'p': {
        const found = await (db as any).project.findUnique({
          where: { id },
          select: { id: true },
        });
        return Boolean(found);
      }
      case 'd': {
        const found = await (db as any).deliverable.findUnique({
          where: { id },
          select: { id: true },
        });
        return Boolean(found);
      }
      case 't': {
        const found = await (db as any).task.findUnique({
          where: { id },
          select: { id: true },
        });
        return Boolean(found);
      }
      default: {
        return false;
      }
    }
  } catch (error) {
    console.error(`[checkIdExists] Error checking ID "${id}" in database:`, error);
    return false;
  }
}

/**
 * Generates an ID and verifies that it does NOT already exist in the database.
 * If a collision is detected, it generates a new candidate ID until an unused ID is found.
 */
export async function generateUniqueBase64Id(
  prefix: IdPrefix,
  customDigitsOrDb?: number | DbClient,
  dbClient?: DbClient
): Promise<string> {
  const digits = typeof customDigitsOrDb === 'number' ? customDigitsOrDb : undefined;
  const db = (typeof customDigitsOrDb === 'object' && customDigitsOrDb !== null)
    ? customDigitsOrDb
    : (dbClient ?? prisma);

  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidateId = generateBase64Id(prefix, digits);
    const exists = await checkIdExists(candidateId, prefix, db);
    if (!exists) {
      return candidateId;
    }
  }

  // Fallback with higher entropy in the improbable case of multiple collisions
  const baseDigits = digits ?? DEFAULT_PREFIX_LENGTHS[prefix] ?? 8;
  return generateBase64Id(prefix, baseDigits + 4);
}

export const generateUniqueId = generateUniqueBase64Id;

export function isPrefixedId(id: string, prefix: IdPrefix): boolean {
  return typeof id === 'string' && id.startsWith(prefix);
}

export function stripPrefix(id: string, prefix: IdPrefix): string {
  if (typeof id !== 'string') return '';
  if (id.startsWith(prefix)) return id.slice(prefix.length);
  return id;
}
