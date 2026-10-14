import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'black-x-dev-secret-change-in-production';
const COOKIE_NAME = 'blackx_token';

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password, hash) {
  // Google-only accounts carry a non-bcrypt sentinel; never compare it as a password hash.
  if (!/^\$2[aby]\$/.test(String(hash || ''))) return false;
  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    return false;
  }
}

export function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    path: '/',
    sameSite: 'none',
    secure: true
  });
}

export function publicUser(row) {
  if (!row) return null;
  const isDev = (row.email || '').toLowerCase() === 'mz0970mmz@gmail.com' || row.role === 'developer';
  let badges = [];
  try {
    badges = typeof row.badges === 'string' ? JSON.parse(row.badges || '[]') : (row.badges || []);
    if (!Array.isArray(badges)) badges = [];
  } catch {
    badges = [];
  }

  // Check VIP tier & expiration
  let vipTier =
    row.vip_tier ||
    (row.vip_status === 'VIP Monarch'
      ? 'vip_monarch'
      : row.vip_status === 'VIP Basic'
      ? 'vip_basic'
      : 'free');
  const vipExpiresAt = row.vip_expires_at || null;
  if (vipTier !== 'free' && vipExpiresAt) {
    const expTime = new Date(vipExpiresAt).getTime();
    if (!Number.isNaN(expTime) && expTime < Date.now()) {
      vipTier = 'free';
    }
  }

  // Developer account gets vip_monarch, gold_vip & blue_verified by default
  if (isDev) {
    vipTier = 'vip_monarch';
    if (!badges.includes('blue_verified')) badges.unshift('blue_verified');
    if (!badges.includes('gold_vip')) badges.unshift('gold_vip');
  } else if (vipTier === 'vip_basic' || vipTier === 'vip_monarch') {
    if (!badges.includes('gold_vip')) badges.unshift('gold_vip');
  }

  const effectiveVip =
    isDev || vipTier === 'vip_monarch'
      ? 'VIP Monarch'
      : vipTier === 'vip_basic'
      ? 'VIP Basic'
      : row.vip_status || null;

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    avatarColor: row.avatar_color,
    photoUrl: row.photo_url || '',
    photoURL: row.photo_url || '',
    bio: row.bio,
    role: isDev ? 'developer' : row.role,
    isDeveloper: isDev,
    vipTier,
    vipStatus: effectiveVip,
    vip_status: effectiveVip,
    vipExpiresAt,
    badges,
    createdAt: row.created_at
  };
}

function userFromRequest(req) {
  const token = req.cookies?.[COOKIE_NAME] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    if (!user) return null;
    if ((user.email || '').toLowerCase() === 'mz0970mmz@gmail.com' && user.role !== 'developer') {
      user.role = 'developer';
    }
    return user;
  } catch {
    return null;
  }
}

export function optionalAuth(req, _res, next) {
  req.user = userFromRequest(req);
  next();
}

export function requireAuth(req, res, next) {
  const user = userFromRequest(req);
  if (!user) return res.status(401).json({ error: 'auth_required', message: 'Authentication required' });
  req.user = user;
  next();
}

export function requireDeveloper(req, res, next) {
  const user = userFromRequest(req);
  if (!user) return res.status(401).json({ error: 'auth_required', message: 'Authentication required' });
  const isDev = (user.email || '').toLowerCase() === 'mz0970mmz@gmail.com' || user.role === 'developer';
  if (!isDev) return res.status(403).json({ error: 'forbidden', message: 'Developer access required' });
  req.user = user;
  next();
}
