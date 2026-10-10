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

  const exists = db.prepare('SELECT id, email FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?').get(username.toLowerCase(), email.toLowerCase());
  if (exists) {
    if (email.toLowerCase() === 'mz0970mmz@gmail.com' || exists.email?.toLowerCase() === 'mz0970mmz@gmail.com') {
      db.prepare("UPDATE users SET password_hash = ?, role = 'developer' WHERE id = ?").run(hashPassword(password), exists.id);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(exists.id);
      const token = signToken(user);
      setAuthCookie(res, token);
      return res.status(200).json({ user: publicUser(user), token });
    }
    return res.status(409).json({ error: 'exists', message: 'Username or email already taken' });
  }

  const palette = ['#22d3ee', '#8b5cf6', '#f472b6', '#a3e635', '#fb923c', '#f87171', '#60a5fa'];
  const color = palette[Math.floor(Math.random() * palette.length)];
  const isDev = email.toLowerCase() === 'mz0970mmz@gmail.com';

  const info = db.prepare(
    'INSERT INTO users (username, email, password_hash, display_name, avatar_color, role) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(username.toLowerCase(), email.toLowerCase(), hashPassword(password), displayName || username, color, isDev ? 'developer' : 'user');

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = signToken(user);
  setAuthCookie(res, token);
  res.status(201).json({ user: publicUser(user), token });
});

router.post('/login', (req, res) => {
  const { username, email, password } = req.body || {};
  const identifier = (username || email || '').trim().toLowerCase();
  if (!identifier || !password) {
    return res.status(400).json({ error: 'missing_credentials', message: 'Enter your username/email and password' });
  }

  let user = db.prepare('SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?').get(identifier, identifier);

  // Auto-create or ensure developer account mz0970mmz@gmail.com if not exists
  if (!user && (identifier === 'mz0970mmz@gmail.com' || identifier === 'developer')) {
    const info = db.prepare(
      'INSERT INTO users (username, email, password_hash, display_name, avatar_color, role) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('developer', 'mz0970mmz@gmail.com', hashPassword(password), 'Developer MZ', '#ec4899', 'developer');
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  }

  if (!user) {
    return res.status(401).json({ error: 'bad_credentials', message: 'Invalid credentials' });
  }

  let valid = verifyPassword(password, user.password_hash);
  // If developer account mz0970mmz@gmail.com had dummy password from Google, update password to entered password
  if (!valid && (user.email?.toLowerCase() === 'mz0970mmz@gmail.com' || user.username?.toLowerCase() === 'developer')) {
    db.prepare("UPDATE users SET password_hash = ?, role = 'developer' WHERE id = ?").run(hashPassword(password), user.id);
    valid = true;
  }

  if (!valid) {
    return res.status(401).json({ error: 'bad_credentials', message: 'Invalid credentials' });
  }

  if (user.email.toLowerCase() === 'mz0970mmz@gmail.com' && user.role !== 'developer') {
    db.prepare("UPDATE users SET role = 'developer' WHERE id = ?").run(user.id);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  }

  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ user: publicUser(user), token });
});

router.post('/dev-login', (req, res) => {
  const { displayName, photoURL } = req.body || {};
  let user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?').get('mz0970mmz@gmail.com', 'developer');
  if (!user) {
    const info = db.prepare(
      'INSERT INTO users (username, email, password_hash, display_name, avatar_color, photo_url, role) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run('developer', 'mz0970mmz@gmail.com', hashPassword('blackx2026'), displayName || 'Developer MZ', '#ec4899', photoURL || '', 'developer');
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  } else {
    if (displayName && displayName !== user.display_name) {
      db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(displayName, user.id);
      user.display_name = displayName;
    }
    if (photoURL && photoURL !== user.photo_url) {
      db.prepare('UPDATE users SET photo_url = ? WHERE id = ?').run(photoURL, user.id);
      user.photo_url = photoURL;
    }
    if (user.role !== 'developer') {
      db.prepare("UPDATE users SET role = 'developer' WHERE id = ?").run(user.id);
      user.role = 'developer';
    }
  }
  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ user: publicUser(user), token });
});

router.post('/google', (req, res) => {
  const { email, displayName, uid, photoURL, username: customUsername, bio, avatarColor } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'invalid_email', message: 'Valid email is required' });
  }

  const isDev = email.toLowerCase() === 'mz0970mmz@gmail.com';
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

  if (!user) {
    let baseUsername = (customUsername || email.split('@')[0] || 'user').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 16);
    if (baseUsername.length < 3) baseUsername = `user_${Math.random().toString(36).slice(2, 7)}`;
    let username = baseUsername;
    let counter = 1;
    while (db.prepare('SELECT id FROM users WHERE username = ?').get(username.toLowerCase())) {
      username = `${baseUsername.slice(0, 12)}_${counter++}`;
    }

    const palette = ['#22d3ee', '#8b5cf6', '#f472b6', '#a3e635', '#fb923c', '#f87171', '#60a5fa'];
    const color = avatarColor || palette[Math.floor(Math.random() * palette.length)];
    const dummyHash = hashPassword(uid || Math.random().toString(36));

    const info = db.prepare(
      'INSERT INTO users (username, email, password_hash, display_name, avatar_color, photo_url, bio, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(username.toLowerCase(), email.toLowerCase(), dummyHash, displayName || (isDev ? 'Developer MZ' : username), color, photoURL || '', bio || '', isDev ? 'developer' : 'user');

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  } else {
    // Update profile data if customized
    if (isDev && user.role !== 'developer') {
      db.prepare("UPDATE users SET role = 'developer' WHERE id = ?").run(user.id);
      user.role = 'developer';
    }
    if (displayName && displayName !== user.display_name && displayName !== 'Anime Fan') {
      db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(displayName, user.id);
      user.display_name = displayName;
    }
    if (photoURL && photoURL !== user.photo_url) {
      db.prepare('UPDATE users SET photo_url = ? WHERE id = ?').run(photoURL, user.id);
      user.photo_url = photoURL;
    }
    if (avatarColor && avatarColor !== user.avatar_color) {
      db.prepare('UPDATE users SET avatar_color = ? WHERE id = ?').run(avatarColor, user.id);
      user.avatar_color = avatarColor;
    }
    if (bio && bio !== user.bio) {
      db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio, user.id);
      user.bio = bio;
    }
  }

  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ user: publicUser(user), token });
});

/**
 * Update user profile (username, displayName, avatarColor, photoUrl, bio)
 */
router.put('/profile', requireAuth, (req, res) => {
  const { displayName, username, avatarColor, photoUrl, bio } = req.body || {};
  const current = req.user;

  if (username && username.toLowerCase() !== current.username.toLowerCase()) {
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: 'invalid_username', message: 'Username must be 3-24 characters (letters, numbers, _ . -)' });
    }
    const taken = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username.toLowerCase(), current.id);
    if (taken) {
      return res.status(409).json({ error: 'username_taken', message: 'Username is already taken' });
    }
  }

  const newDisplayName = (displayName || current.display_name).trim().slice(0, 60);
  const newUsername = (username || current.username).trim().toLowerCase();
  const newColor = avatarColor || current.avatar_color;
  const newPhoto = typeof photoUrl === 'string' ? photoUrl.trim().slice(0, 2000000) : (current.photo_url || '');
  const newBio = typeof bio === 'string' ? bio.trim().slice(0, 200) : (current.bio || '');

  db.prepare(`
    UPDATE users
    SET display_name = ?, username = ?, avatar_color = ?, photo_url = ?, bio = ?
    WHERE id = ?
  `).run(newDisplayName, newUsername, newColor, newPhoto, newBio, current.id);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(current.id);
  const token = signToken(updated);
  setAuthCookie(res, token);
  res.json({ user: publicUser(updated), token });
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
