/**
 * SQLite social store — used when DATABASE_URL is not configured (e.g. on
 * static-free hosts like AI Studio). Mirrors the Prisma/PostgreSQL feature
 * set so ratings, follows, gamification, submissions and tickets work
 * everywhere. Response shapes are identical in both modes.
 */
import { db } from '../db.js';
export { db };

let ready = false;

export function ensureSocialTables() {
  if (ready) return;
  ready = true;
  db.exec(`
CREATE TABLE IF NOT EXISTS social_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_key TEXT NOT NULL,
  slug TEXT NOT NULL,
  episode INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  score INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_key, slug, episode)
);
CREATE TABLE IF NOT EXISTS social_follows (
  follower_key TEXT NOT NULL,
  following_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (follower_key, following_key)
);
CREATE TABLE IF NOT EXISTS social_stats (
  user_key TEXT PRIMARY KEY,
  total_watch_time_min INTEGER NOT NULL DEFAULT 0,
  total_read_time_min INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS social_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  icon_url TEXT,
  requirement_threshold INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS social_user_badges (
  user_key TEXT NOT NULL,
  badge_id INTEGER NOT NULL,
  awarded_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_key, badge_id)
);
CREATE TABLE IF NOT EXISTS social_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_key TEXT NOT NULL,
  video_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS social_profiles (
  user_key TEXT PRIMARY KEY,
  banner_url TEXT,
  theme_preference TEXT
);
CREATE TABLE IF NOT EXISTS social_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);
  // profile customization columns on the auth users table
  for (const col of ['banner_url TEXT', 'theme_preference TEXT']) {
    try { db.exec(`ALTER TABLE users ADD COLUMN ${col}`); } catch { /* exists */ }
  }
  // seed badges once
  const c = db.prepare('SELECT COUNT(*) AS c FROM social_badges').get().c;
  if (!c) {
    const ins = db.prepare('INSERT INTO social_badges (name, icon_url, requirement_threshold) VALUES (?, ?, ?)');
    ins.run('First Steps', '/assets/badge1.png', 10);
    ins.run('Marathon Watcher', '/assets/badge2.png', 120);
    ins.run('Binge Lord', '/assets/badge3.png', 600);
    ins.run('Legend of BLACK X', '/assets/badge4.png', 1500);
  }
}

/** Plain SQLite rows for the social features. */
export const social = {
  upsertRating(userKey, slug, episode, score, title) {
    ensureSocialTables();
    db.prepare(`
      INSERT INTO social_ratings (user_key, slug, episode, score, title)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_key, slug, episode) DO UPDATE SET
        score = excluded.score, title = COALESCE(excluded.title, social_ratings.title),
        updated_at = datetime('now')
    `).run(userKey, slug, episode, score, title ?? null);
  },
  getRating(userKey, slug, episode) {
    ensureSocialTables();
    return db.prepare('SELECT score FROM social_ratings WHERE user_key = ? AND slug = ? AND episode = ?')
      .get(userKey, slug, episode) || null;
  },
  follow(followerKey, followingKey) {
    ensureSocialTables();
    db.prepare('INSERT OR IGNORE INTO social_follows (follower_key, following_key) VALUES (?, ?)')
      .run(followerKey, followingKey);
  },
  getStats(userKey) {
    ensureSocialTables();
    return db.prepare('SELECT * FROM social_stats WHERE user_key = ?').get(userKey) || null;
  },
  upsertStats(userKey, field, delta) {
    ensureSocialTables();
    db.prepare(`
      INSERT INTO social_stats (user_key, ${field}) VALUES (?, ?)
      ON CONFLICT(user_key) DO UPDATE SET ${field} = ${field} + excluded.${field}
    `).run(userKey, delta);
    return this.getStats(userKey);
  },
  setLevel(userKey, level) {
    ensureSocialTables();
    db.prepare('UPDATE social_stats SET current_level = ? WHERE user_key = ?').run(level, userKey);
  },
  badges() {
    ensureSocialTables();
    return db.prepare('SELECT * FROM social_badges ORDER BY requirement_threshold ASC').all();
  },
  userBadges(userKey) {
    ensureSocialTables();
    return db.prepare(`
      SELECT b.name, b.icon_url FROM social_user_badges ub
      JOIN social_badges b ON b.id = ub.badge_id
      WHERE ub.user_key = ? ORDER BY ub.awarded_at ASC
    `).all(userKey);
  },
  awardBadge(userKey, badgeId) {
    ensureSocialTables();
    db.prepare('INSERT OR IGNORE INTO social_user_badges (user_key, badge_id) VALUES (?, ?)').run(userKey, badgeId);
  },
  submitCreator(userKey, videoUrl) {
    ensureSocialTables();
    db.prepare("INSERT INTO social_submissions (user_key, video_url, status) VALUES (?, ?, 'PENDING')")
      .run(userKey, videoUrl);
  },
  createTicket(userKey, subject, message) {
    ensureSocialTables();
    const r = db.prepare("INSERT INTO social_tickets (user_key, subject, message, status) VALUES (?, ?, ?, 'OPEN')")
      .run(userKey, subject, message);
    return String(r.lastInsertRowid);
  },
  customizeUser(userId, data = {}) {
    ensureSocialTables();
    const bannerUrl = data.bannerUrl !== undefined ? data.bannerUrl : data.banner_url;
    const themePreference = data.themePreference !== undefined ? data.themePreference : data.theme_preference;
    const key = String(userId);
    // reliable store: works for any auth id (Firebase uid, numeric, demo…)
    const cur = db.prepare('SELECT banner_url, theme_preference FROM social_profiles WHERE user_key = ?').get(key) || {};
    const b = bannerUrl !== undefined ? bannerUrl : cur.banner_url ?? null;
    const t = themePreference !== undefined ? themePreference : cur.theme_preference ?? null;
    db.prepare(`INSERT INTO social_profiles (user_key, banner_url, theme_preference) VALUES (?, ?, ?)
      ON CONFLICT(user_key) DO UPDATE SET banner_url = excluded.banner_url, theme_preference = excluded.theme_preference`)
      .run(key, b ?? null, t ?? null);
    // best-effort mirror into the legacy users table (seeded demo accounts)
    try {
      const sets = []; const args = [];
      if (bannerUrl !== undefined) { sets.push('banner_url = ?'); args.push(bannerUrl); }
      if (themePreference !== undefined) { sets.push('theme_preference = ?'); args.push(themePreference); }
      if (sets.length) { args.push(key); db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...args); }
    } catch { /* legacy table optional */ }
    return 1;
  },
  getUserProfile(userKey) {
    ensureSocialTables();
    return db.prepare('SELECT banner_url, theme_preference FROM social_profiles WHERE user_key = ?').get(String(userKey)) || {};
  }
};

/* ------------------------- shared leveling rules ------------------------- */
export const MINUTES_PER_LEVEL = 120;

export function levelFromMinutes(totalMinutes) {
  return Math.floor(Math.max(0, totalMinutes) / MINUTES_PER_LEVEL) + 1;
}

export function progressPercentage(totalMinutes) {
  const t = Math.max(0, totalMinutes);
  return Math.round(((t % MINUTES_PER_LEVEL) / MINUTES_PER_LEVEL) * 1000) / 10;
}

export function awardBadgesSqlite(userKey, totalMinutes) {
  for (const badge of social.badges()) {
    if (badge.requirement_threshold <= totalMinutes) social.awardBadge(userKey, badge.id);
  }
}
