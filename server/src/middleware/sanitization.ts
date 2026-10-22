import { Request, Response, NextFunction } from 'express';

/**
 * Expressões regulares para detecção e remoção de vetores XSS e injeção de tags perigosas
 */
const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const DANGEROUS_ATTRIBUTES = /\s*(on\w+|javascript:|data:|vbscript:)\s*=/gi;
const HTML_TAG_REGEX = /<\/?[^>]+(>|$)/g;

/**
 * Remove caracteres nulos, tags de script e injeções perigosas de uma string
 */
export function sanitizeString(value: string): string {
  if (typeof value !== 'string') return value;

  // 1. Remove byte nulo (null byte poison attack)
  let cleaned = value.replace(/\0/g, '');

  // 2. Remove tags <script> completas
  cleaned = cleaned.replace(SCRIPT_REGEX, '');

  // 3. Remove manipuladores de eventos maliciosos (ex: onclick, onload, onerror)
  cleaned = cleaned.replace(DANGEROUS_ATTRIBUTES, '');

  // 4. Remove tags HTML soltas para evitar injeção em nomes, títulos e inputs gerais
  cleaned = cleaned.replace(HTML_TAG_REGEX, '');

  return cleaned.trim();
}

/**
 * Sanitiza recursivamente objetos, arrays e valores primitivos
 */
export function sanitizeDeep<T>(target: T): T {
  if (target === null || target === undefined) {
    return target;
  }

  if (typeof target === 'string') {
    return sanitizeString(target) as unknown as T;
  }

  if (Array.isArray(target)) {
    return target.map((item) => sanitizeDeep(item)) as unknown as T;
  }

  if (typeof target === 'object' && target !== null) {
    const sanitizedObj: Record<string, any> = Object.create(null);
    for (const [key, value] of Object.entries(target)) {
      // Bloqueio contra Prototype Pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      // Campos de senha não devem ser modificados (para preservar caracteres especiais da senha)
      if (key.toLowerCase().includes('password')) {
        sanitizedObj[key] = value;
      } else {
        sanitizedObj[key] = sanitizeDeep(value);
      }
    }
    return sanitizedObj as T;
  }

  return target;
}

/**
 * Middleware Express para sanitização profunda de inputs (req.body, req.query, req.params)
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  try {
    if (req.body && typeof req.body === 'object') {
      if (Array.isArray(req.body)) {
        req.body = sanitizeDeep(req.body);
      } else {
        for (const key of Object.keys(req.body)) {
          if (!key.toLowerCase().includes('password')) {
            req.body[key] = sanitizeDeep(req.body[key]);
          }
        }
      }
    }
    // Em Express 5, req.query e req.params possuem apenas getters em IncomingMessage
    // Mutamos as propriedades internas diretamente para não disparar erro de atribuição
    if (req.query && typeof req.query === 'object') {
      for (const key of Object.keys(req.query)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          delete (req.query as any)[key];
          continue;
        }
        try {
          (req.query as any)[key] = sanitizeDeep((req.query as any)[key]);
        } catch {
          // Ignora propriedades protegidas por getter
        }
      }
    }
    if (req.params && typeof req.params === 'object') {
      for (const key of Object.keys(req.params)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          delete (req.params as any)[key];
          continue;
        }
        try {
          (req.params as any)[key] = sanitizeDeep((req.params as any)[key]);
        } catch {
          // Ignora propriedades protegidas por getter
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}
