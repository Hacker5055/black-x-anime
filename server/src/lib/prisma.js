/**
 * Lazy Prisma client singleton.
 *
 * Instantiated on first use so the Express server boots (and the existing
 * SQLite-backed API keeps serving) even when @prisma/client is not generated
 * yet or DATABASE_URL is not configured — the Prisma-backed endpoints then
 * answer with a clean 500 instead of crashing the process.
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let instance = null;

export function getPrisma() {
  if (!instance) {
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'postgresql://postgres@localhost:5432/blackx';
    }
    try {
      const { PrismaClient } = require('@prisma/client');
      instance = new PrismaClient();
    } catch (err) {
      console.warn('PrismaClient initialization warning:', err.message);
      throw err;
    }
  }
  return instance;
}
