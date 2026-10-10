import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'black-x-dev-secret-change-in-production';
const COOKIE_NAME = 'blackx_token';

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
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

  // Developer account gets gold_vip & blue_verified by default
  if (isDev) {
    if (!badges.includes('blue_verified')) badges.unshift('blue_verified');
    if (!badges.includes('gold_vip')) badges.unshift('gold_vip');
  }

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
