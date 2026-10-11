/**
 * Shared API helpers for the Prisma-backed routes.
 */
import { optionalAuth } from '../auth.js';

/**
 * Populate req.user from the auth cookie, but NEVER overwrite an identity
 * already attached by upstream middleware (tests/harnesses may inject the
 * authenticated user id directly, per the API contract).
 */
export function attachUser(req, res, next) {
  if (req.user != null) return next();
  return optionalAuth(req, res, next);
}

/**
 * The authenticated user's id. `req.user` carries the user id directly
 * (string/uuid) or a user object/JWT payload ({ id } | { userId } | { sub }).
 */
export function getUserId(req) {
  const u = req?.user;
  if (!u) return null;
  if (typeof u === 'object') return u.id ?? u.userId ?? u.sub ?? u.uid ?? null;
  return u;
}

export function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

/**
 * Map Prisma errors to proper status codes inside each route's catch block.
 * P2025 = record not found (update/delete), P2003 = foreign-key violation,
 * P2002 = unique constraint.
 */
export function prismaError(res, err, { notFound = 'Record not found.' } = {}) {
  if (err?.code === 'P2025') return fail(res, 404, notFound);
  if (err?.code === 'P2003') return fail(res, 404, notFound);
  if (err?.code === 'P2002') return fail(res, 409, 'Resource already exists.');
  console.error('[api]', err?.code || '', err?.message || err);
  return fail(res, 500, 'Internal server error.');
}
