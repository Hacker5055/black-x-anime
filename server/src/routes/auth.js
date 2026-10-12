import { Router } from 'express';
import { db } from '../db.js';
import { hashPassword, verifyPassword, signToken, setAuthCookie, clearAuthCookie, publicUser, requireAuth } from '../auth.js';
import { social } from '../lib/socialDb.js';
import { syncUserToCloud, fetchUserFromCloud, sha256Hex, syncAllLocalUsersToCloud } from '../services/cloudSync.service.js';

const router = Router();

// Background sync existing Website users to shared Cloud Firestore so APK can log in immediately
setTimeout(() => {
  syncAllLocalUsersToCloud().catch(() => {});
}, 1500);

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,24}$/;

router.post('/register', (req, res) => {
  const { username, email, password, displayName, referralCode } = req.body || {};
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

  // Real referral tracking
  if (referralCode) {
    try {
      let cleanRef = String(referralCode).trim();
      if (cleanRef.toUpperCase().startsWith('BLACKX-')) {
        cleanRef = cleanRef.slice(7);
      }
      const referrer = db.prepare('SELECT id, username FROM users WHERE LOWER(username) = ?').get(cleanRef.toLowerCase());
      if (referrer && referrer.username.toLowerCase() !== username.toLowerCase()) {
        social.addReferral(String(referrer.id), user.username);
        try {
          db.prepare(`
            INSERT INTO user_notifications (id, user_id, title, message, link, read)
            VALUES (?, ?, ?, ?, ?, 0)
          `).run(
            `ref_${Date.now()}_${referrer.id}`,
            referrer.id,
            '🎉 انضم صديق جديد عبر دعوتك!',
            `سجل @${user.username} بنجاح عبر رابط دعوتك الخاص!`,
            '/profile?tab=referrals'
          );
        } catch {}
      }
    } catch (refErr) {
      console.warn('Referral tracking warning:', refErr.message);
    }
  }

  const token = signToken(user);
  setAuthCookie(res, token);
  syncUserToCloud(user, password).catch(() => {});
  res.status(201).json({ user: publicUser(user), token });
});

router.post('/login', async (req, res) => {
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

  // If user registered on the Android APK, pull their account from shared Cloud Firestore
  if (!user) {
    try {
      const cloudUser = await fetchUserFromCloud(identifier);
      if (cloudUser && (!cloudUser.passSha256 || cloudUser.passSha256 === sha256Hex(password))) {
        const uname = (cloudUser.username || identifier.split('@')[0] || 'user').toLowerCase();
        const uemail = (cloudUser.email || `${uname}@blackx.app`).toLowerCase();
        const info = db.prepare(
          'INSERT INTO users (username, email, password_hash, display_name, avatar_color, photo_url, bio, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
          uname,
          uemail,
          hashPassword(password),
          cloudUser.displayName || uname,
          cloudUser.avatarColor || '#22d3ee',
          cloudUser.photoUrl || '',
          cloudUser.bio || '',
          cloudUser.role || 'user'
        );
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
      }
    } catch (_) {}
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
  syncUserToCloud(user, password).catch(() => {});
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
 * Redeem VIP Subscription Code (Activated by user)
 */
router.post('/redeem-vip-code', requireAuth, (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'invalid_code', message: 'يرجى إدخال كود اشتراك صالح' });
    }
    const cleanCode = code.trim().toUpperCase();
    let row = db.prepare('SELECT * FROM vip_subscription_codes WHERE UPPER(code) = ?').get(cleanCode);
    const rowV2 = db.prepare('SELECT * FROM vip_codes WHERE UPPER(code) = ?').get(cleanCode);

    if (!row && !rowV2) {
      return res.status(404).json({ error: 'not_found', message: 'كود الاشتراك غير صحيح أو غير موجود' });
    }
    if ((row && row.is_used && (!rowV2 || rowV2.used_count >= rowV2.max_uses)) || (rowV2 && rowV2.used_count >= rowV2.max_uses)) {
      return res.status(400).json({ error: 'already_used', message: 'تم استخدام هذا الكود من قبل مسبقاً' });
    }

    const rawTier = (rowV2?.tier || row?.tier || 'VIP Basic');
    const isMonarch = String(rawTier).toLowerCase().includes('monarch');
    const vipStatusLabel = isMonarch ? 'VIP Monarch' : 'VIP Basic';
    const vipTierKey = isMonarch ? 'vip_monarch' : 'vip_basic';
    const durationDays = rowV2?.duration_days || row?.duration_days || 30;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    if (row) {
      db.prepare(`
        UPDATE vip_subscription_codes
        SET is_used = 1, used_by_user_id = ?, used_by_username = ?, used_at = datetime('now')
        WHERE id = ?
      `).run(req.user.id, req.user.username, row.id);
    }
    if (rowV2) {
      let redeemedBy = [];
      try { redeemedBy = JSON.parse(rowV2.redeemed_by || '[]'); } catch {}
      redeemedBy.push({ userId: req.user.id, username: req.user.username, at: new Date().toISOString() });
      db.prepare('UPDATE vip_codes SET used_count = used_count + 1, redeemed_by = ? WHERE id = ?').run(JSON.stringify(redeemedBy), rowV2.id);
    }

    // Update user vip_status, vip_tier and badges
    let badges = [];
    try {
      badges = typeof req.user.badges === 'string' ? JSON.parse(req.user.badges || '[]') : (req.user.badges || []);
      if (!Array.isArray(badges)) badges = [];
    } catch {
      badges = [];
    }
    if (!badges.includes('gold_vip')) {
      badges.unshift('gold_vip');
    }
    if (isMonarch && !badges.includes('celebrity')) {
      badges.push('celebrity');
    }

    db.prepare(`
      UPDATE users
      SET vip_status = ?, vip_tier = ?, vip_expires_at = ?, badges = ?
      WHERE id = ?
    `).run(vipStatusLabel, vipTierKey, expiresAt, JSON.stringify(badges), req.user.id);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    res.json({
      ok: true,
      message: `تم تفعيل اشتراك ${vipStatusLabel} بنجاح لمدة ${durationDays} يوماً! 🎉`,
      tier: vipStatusLabel,
      vipTier: vipTierKey,
      expiresAt,
      user: publicUser(updatedUser)
    });
  } catch (err) {
    res.status(500).json({ error: 'server_error', message: err.message });
  }
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
