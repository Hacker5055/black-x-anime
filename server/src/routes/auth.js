import { Router } from 'express';
import { db } from '../db.js';
import { hashPassword, verifyPassword, signToken, setAuthCookie, clearAuthCookie, publicUser, requireAuth } from '../auth.js';

const router = Router();

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,24}$/;

router.post('/register', (req, res) => {
  const { username, email, password, displayName } = req.body || {};
  if (!username || !USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'invalid_username', message: 'Username must be 3-24 chars (letters, numbers, _ . -)' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'invalid_email', message: 'Enter a valid email address' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'invalid_password', message: 'Password must be at least 6 characters' });
  }

  const exists = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username.toLowerCase(), email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'exists', message: 'Username or email already taken' });

  const palette = ['#22d3ee', '#8b5cf6', '#f472b6', '#a3e635', '#fb923c', '#f87171', '#60a5fa'];
  const color = palette[Math.floor(Math.random() * palette.length)];

  const info = db.prepare(
    'INSERT INTO users (username, email, password_hash, display_name, avatar_color) VALUES (?, ?, ?, ?, ?)'
  ).run(username.toLowerCase(), email.toLowerCase(), hashPassword(password), displayName || username, color);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  setAuthCookie(res, signToken(user));
  res.status(201).json({ user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { username, email, password } = req.body || {};
  const identifier = (username || email || '').toLowerCase();
  if (!identifier || !password) {
    return res.status(400).json({ error: 'missing_credentials', message: 'Enter your username/email and password' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(identifier, identifier);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'bad_credentials', message: 'Invalid credentials' });
  }
  setAuthCookie(res, signToken(user));
  res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

/**
 * Optional me: returns 200 with user:null when unauthenticated
 * (avoids noisy 401s on first load; login state is simply null).
 */
router.get('/me', (req, res) => {
  const user = req.user;
  if (!user) return res.json({ user: null, stats: null });
  const favorites = db.prepare('SELECT COUNT(*) AS c FROM favorites WHERE user_id = ?').get(user.id).c;
  const watchedEpisodes = db.prepare('SELECT COUNT(*) AS c FROM progress WHERE user_id = ?').get(user.id).c;
  const completed = db.prepare('SELECT COUNT(*) AS c FROM progress WHERE user_id = ? AND completed = 1').get(user.id).c;
  const showsTracked = db.prepare('SELECT COUNT(DISTINCT slug) AS c FROM progress WHERE user_id = ?').get(user.id).c;
  res.json({
    user: publicUser(user),
    stats: { favorites, watchedEpisodes, completed, showsTracked }
  });
});

export default router;
