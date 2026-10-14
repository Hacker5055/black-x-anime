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
      console.warn('[AI Studio] Prisma disabled or DATABASE_URL not set — using SQLite-backed fallback');
      const noOp = {
        findMany: async () => [],
        findFirst: async () => null,
        findUnique: async () => null,
        create: async (d) => d?.data ?? {},
        update: async (d) => d?.data ?? {},
        delete: async () => ({})
      };
      instance = new Proxy({}, { get: () => noOp });
      return instance;
    }
    try {
      const { PrismaClient } = require('@prisma/client');
      instance = new PrismaClient();
    } catch (err) {
      console.warn('[AI Studio] Database not connected — using mock');
      const noOp = {
        findMany: async () => [],
        findFirst: async () => null,
        findUnique: async () => null,
        create: async (d) => d?.data ?? {},
        update: async (d) => d?.data ?? {},
        delete: async () => ({})
      };
      instance = new Proxy({}, { get: () => noOp });
    }
  }
  return instance;
}
