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

/**
 * Identity bridge: the app authenticates via the SQLite/JWT (or Firebase)
 * layer while the social/gamification features live in the Prisma DB.
 * Provisioning a matching User row on first use keeps FKs happy and lets
 * every feature work without a manual user migration.
 */
export async function ensurePrismaUser(prisma, reqUser) {
  const rawId = getUserId({ user: reqUser });
  if (rawId == null) return null;
  const id = String(rawId);
  const existing = await prisma.user.findUnique({ where: { id } });
  if (existing) return existing;

  const u = (reqUser && typeof reqUser === 'object') ? reqUser : {};
  const baseName = String(u.username || u.uid || `user_${id}`).slice(0, 40);
  const displayName = u.displayName || u.display_name || baseName;
  const make = (suffix, emailPrefix) => ({
    id,
    username: suffix ? `${baseName}_${id}`.slice(0, 40) : baseName,
    email: `${emailPrefix}${u.email || `${baseName}@blackx.local`}`.slice(0, 80),
    password_hash: 'external',
    display_name: String(displayName).slice(0, 60),
    role: u.role === 'admin' ? 'admin' : 'user',
    is_verified: Boolean(u.is_verified || u.isVerified || u.role === 'developer' || u.role === 'admin')
  });
  try {
    return await prisma.user.create({ data: make(false, '') });
  } catch (err) {
    if (err?.code === 'P2002') {
      return prisma.user.create({ data: make(true, `${id}.`) });
    }
    throw err;
  }
}
