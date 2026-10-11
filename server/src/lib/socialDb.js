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
  theme_preference TEXT,
  frame_style TEXT DEFAULT 'default',
  ornament TEXT DEFAULT 'none',
  banner_style TEXT DEFAULT 'off'
);
CREATE TABLE IF NOT EXISTS social_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_key TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  admin_reply TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS social_referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_key TEXT NOT NULL,
  referred_username TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS social_library_items (
  id TEXT PRIMARY KEY,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  type TEXT NOT NULL, -- MANGA, MANHWA, NOVEL, BOOK
  poster TEXT NOT NULL,
  banner TEXT,
  chapters_count INTEGER NOT NULL DEFAULT 1,
  author TEXT,
  rating REAL DEFAULT 9.0,
  description_ar TEXT,
  description_en TEXT,
  status TEXT DEFAULT 'ONGOING',
  genres TEXT,
  release_year INTEGER
);
`);
  // profile customization columns on the auth users table
  for (const col of [
    'banner_url TEXT',
    'theme_preference TEXT',
    'frame_style TEXT',
    'ornament TEXT',
    'banner_style TEXT',
    'vip_status TEXT',
    'referral_code TEXT'
  ]) {
    try { db.exec(`ALTER TABLE users ADD COLUMN ${col}`); } catch { /* exists */ }
  }
  for (const col of [
    'frame_style TEXT',
    'ornament TEXT',
    'banner_style TEXT DEFAULT \'off\''
  ]) {
    try { db.exec(`ALTER TABLE social_profiles ADD COLUMN ${col}`); } catch { /* exists */ }
  }
  for (const col of [
    'category TEXT',
    'admin_reply TEXT',
    'updated_at TEXT'
  ]) {
    try { db.exec(`ALTER TABLE social_tickets ADD COLUMN ${col}`); } catch { /* exists */ }
  }

  // seed badges once
  const c = db.prepare('SELECT COUNT(*) AS c FROM social_badges').get().c;
  if (!c) {
    const ins = db.prepare('INSERT INTO social_badges (name, icon_url, requirement_threshold) VALUES (?, ?, ?)');
    ins.run('First Steps', '/assets/badge1.png', 10);
    ins.run('Marathon Watcher', '/assets/badge2.png', 120);
    ins.run('Binge Lord', '/assets/badge3.png', 600);
    ins.run('Legend of BLACK X', '/assets/badge4.png', 1500);
    ins.run('VIP Basic', '/assets/badge_vip.png', 0);
  }

  // Seed Library items (Manga, Manhwa, Novels, Books)
  const libCount = db.prepare('SELECT COUNT(*) AS c FROM social_library_items').get()?.c || 0;
  if (libCount === 0) {
    const insLib = db.prepare(`
      INSERT OR REPLACE INTO social_library_items 
        (id, title_ar, title_en, type, poster, banner, chapters_count, author, rating, description_ar, description_en, status, genres, release_year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // MANGA
    insLib.run(
      'manga_one_piece',
      'ون بيس (One Piece)',
      'One Piece',
      'MANGA',
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
      1115,
      'Eiichiro Oda',
      9.8,
      'قصة مونكي دي لوفي الذي يبحر في الغراند لاين بحثاً عن الكنز الأسطوري ون بيس ليصبح ملك القراصنة القادم.',
      'Monkey D. Luffy embarks on an epic voyage to the Grand Line to find the legendary treasure One Piece and become King of the Pirates.',
      'ONGOING',
      JSON.stringify(['أكشن', 'مغامرات', 'كوميديا', 'خيال']),
      1997
    );
    insLib.run(
      'manga_berserk',
      'بيرسيرك (Berserk)',
      'Berserk',
      'MANGA',
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
      375,
      'Kentaro Miura',
      9.9,
      'غاتس المحارب الأسود يسعى للانتقام من صديقه السابق غريفيث وسط عالم مظلم مليء بالشياطين والحروب الدامية.',
      'Guts, known as the Black Swordsman, seeks sanctuary from the demonic forces pursuing him and revenge on Griffith.',
      'ONGOING',
      JSON.stringify(['خيال مظلم', 'أكشن', 'دراما', 'عسكري']),
      1989
    );
    insLib.run(
      'manga_vagabond',
      'فاغابوند (Vagabond)',
      'Vagabond',
      'MANGA',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
      327,
      'Takehiko Inoue',
      9.7,
      'رحلة الأسطورة مياموتو موساشي في السعي ليصبح الساموراي الأعظم الذي لا يُقهر تحت الشمس.',
      'The journey of legendary swordsman Miyamoto Musashi as he aims to become invincible under the sun.',
      'COMPLETED',
      JSON.stringify(['ساموراي', 'تاريخي', 'فلسفي', 'سينين']),
      1998
    );

    // MANHWA
    insLib.run(
      'manhwa_solo_leveling',
      'سولو ليفلينج (ارتقاء المستوى الفردي)',
      'Solo Leveling',
      'MANHWA',
      'https://images.unsplash.com/photo-1563089145-599997674d42?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
      200,
      'Chugong / DUBU',
      9.9,
      'سونغ جين وو، أضعف صياد في العالم، يكتسب نظاماً غامضاً يتيح له الارتقاء بمستواه بمفرده ليتحول إلى حاكم الظلال.',
      'Sung Jinwoo, the weakest hunter of all mankind, awakens a mysterious Quest log system allowing him to level up without limits.',
      'COMPLETED',
      JSON.stringify(['أكشن', 'فانتازيا', 'أبراج', 'نظام']),
      2018
    );
    insLib.run(
      'manhwa_orv',
      'وجهة نظر القارئ العليم (Omniscient Reader)',
      "Omniscient Reader's Viewpoint",
      'MANHWA',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80',
      215,
      'Sing Shong / Sleepy-C',
      9.8,
      'كيم دوكجا القارئ الوحيد لرواية نهاية العالم يجد أن أحداثها أصبحت حقيقة واقعية وهو الوحيد الذي يعرف نهايتها.',
      'Kim Dokja was an ordinary office worker whose sole interest was reading his favorite web novel, until the story becomes reality.',
      'ONGOING',
      JSON.stringify(['فانتازيا', 'سيناريو', 'أبوكاليبس', 'أكشن']),
      2020
    );
    insLib.run(
      'manhwa_tower_of_god',
      'برج الإله (Tower of God)',
      'Tower of God',
      'MANHWA',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
      620,
      'SIU',
      9.6,
      'بام يدخل البرج الغامض المليء بالاختبارات القاتلة بحثاً عن صديقته راشيل التي صعدت نحو القمة.',
      'Twenty-Fifth Bam enters the mysterious Tower in search of Rachel, facing lethal tests on each floor.',
      'ONGOING',
      JSON.stringify(['مغامرات', 'قوى خارقة', 'غموض', 'برج']),
      2010
    );

    // LIGHT NOVELS
    insLib.run(
      'novel_cote',
      'فصل النخبة (Classroom of the Elite)',
      'Classroom of the Elite',
      'NOVEL',
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
      28,
      'Shougo Kinugasa',
      9.7,
      'مدرسة كودو إيكوسي الحكومية حيث يحكم الذكاء والدهاء كل شيء، وأيانوكوجي كيوتاكا يخفي عبقريته المطلقة خلف هدوئه.',
      'In a prestigious school where students compete for survival and social points, Kiyotaka Ayanokouji manipulates from the shadows.',
      'ONGOING',
      JSON.stringify(['نفسي', 'مدرسي', 'غموض', 'دهاء']),
      2015
    );
    insLib.run(
      'novel_rezero',
      'ري: زيرو (Re:Zero Starting Life in Another World)',
      'Re:Zero',
      'NOVEL',
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
      38,
      'Tappei Nagatsuki',
      9.6,
      'سوبارو ينتقل لعالم آخر ويكتشف قدرته على العودة بالزمن من نقطة الصفر كلما لاقى حتفه.',
      'Subaru Natsuki is transported to another fantasy world and discovers his harrowing ability: Return by Death.',
      'ONGOING',
      JSON.stringify(['إيسيكاي', 'نفسي', 'سحر', 'دراما']),
      2014
    );

    // BOOKS
    insLib.run(
      'book_art_of_war',
      'فن الحرب (The Art of War)',
      'The Art of War',
      'BOOK',
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
      13,
      'Sun Tzu (سون تزو)',
      9.8,
      'المرجع العسكري والفلسفي الأقدم في تاريخ البشرية حول التخطيط الاستراتيجي، القيادة، والانتصار دون قتال.',
      'Ancient Chinese military treatise attributed to Sun Tzu, composed of 13 chapters on strategic leadership and conflict.',
      'COMPLETED',
      JSON.stringify(['فلسفة', 'استراتيجية', 'تاريخ', 'قيادة']),
      -500
    );
    insLib.run(
      'book_1984',
      '1984 (رواية جورج أورويل)',
      '1984',
      'BOOK',
      'https://images.unsplash.com/photo-1495640388908-05fa85288e61?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
      24,
      'George Orwell (جورج أورويل)',
      9.9,
      'تحفة الديستوبيا العالمية عن الرقابة الشاملة، الأخ الأكبر، والتلاعب بالحقائق وحرية الفكر الإنساني.',
      'Dystopian social science fiction novel exploring the dangers of totalitarianism, extreme surveillance, and thought control.',
      'COMPLETED',
      JSON.stringify(['ديستوبيا', 'أدب كلاسيكي', 'فلسفة', 'خيال']),
      1949
    );
    insLib.run(
      'book_atomic_habits',
      'العادات الذرية (Atomic Habits)',
      'Atomic Habits',
      'BOOK',
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
      20,
      'James Clear (جيمس كلير)',
      9.8,
      'دليل عملي لتغيير العادات اليومية البسيطة التي تؤدي إلى تحولات جذرية ونجاحات استثنائية مع مرور الوقت.',
      'An easy and proven way to build good habits and break bad ones through tiny 1% daily improvements.',
      'COMPLETED',
      JSON.stringify(['تطوير الذات', 'علم النفس', 'إنتاجية', 'عادات']),
      2018
    );
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
  unfollow(followerKey, followingKey) {
    ensureSocialTables();
    db.prepare('DELETE FROM social_follows WHERE follower_key = ? AND following_key = ?')
      .run(followerKey, followingKey);
  },
  isFollowing(followerKey, followingKey) {
    ensureSocialTables();
    const row = db.prepare('SELECT 1 FROM social_follows WHERE follower_key = ? AND following_key = ?')
      .get(followerKey, followingKey);
    return Boolean(row);
  },
  getNetwork(userKey) {
    ensureSocialTables();
    const followers = db.prepare('SELECT follower_key FROM social_follows WHERE following_key = ?').all(userKey).map(r => r.follower_key);
    const following = db.prepare('SELECT following_key FROM social_follows WHERE follower_key = ?').all(userKey).map(r => r.following_key);
    return { followers, following };
  },
  getLibraryItems(type, query = '') {
    ensureSocialTables();
    let sql = 'SELECT * FROM social_library_items';
    const conditions = [];
    const params = [];
    if (type && type !== 'ALL') {
      conditions.push('type = ?');
      params.push(type.toUpperCase());
    }
    if (query && query.trim()) {
      conditions.push('(title_ar LIKE ? OR title_en LIKE ? OR author LIKE ?)');
      const q = `%${query.trim()}%`;
      params.push(q, q, q);
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY rating DESC';
    return db.prepare(sql).all(...params).map(r => ({
      ...r,
      genres: JSON.parse(r.genres || '[]')
    }));
  },
  getLibraryItem(id) {
    ensureSocialTables();
    const r = db.prepare('SELECT * FROM social_library_items WHERE id = ?').get(id);
    if (!r) return null;
    return {
      ...r,
      genres: JSON.parse(r.genres || '[]')
    };
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
  createTicket(userKey, subject, message, category = 'general') {
    ensureSocialTables();
    const r = db.prepare("INSERT INTO social_tickets (user_key, subject, message, category, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'OPEN', datetime('now'), datetime('now'))")
      .run(userKey, subject, message, category);
    return String(r.lastInsertRowid);
  },
  getTickets(userKey, isAdmin = false) {
    ensureSocialTables();
    if (isAdmin) {
      return db.prepare('SELECT * FROM social_tickets ORDER BY created_at DESC').all();
    }
    return db.prepare('SELECT * FROM social_tickets WHERE user_key = ? ORDER BY created_at DESC').all(userKey);
  },
  replyTicket(ticketId, adminReply, status = 'RESOLVED') {
    ensureSocialTables();
    db.prepare(`
      UPDATE social_tickets
      SET admin_reply = ?, status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(adminReply, status, Number(ticketId));
    return db.prepare('SELECT * FROM social_tickets WHERE id = ?').get(Number(ticketId));
  },
  getReferrals(userKey) {
    ensureSocialTables();
    const rows = db.prepare('SELECT referred_username, created_at FROM social_referrals WHERE referrer_key = ? ORDER BY created_at DESC').all(userKey);
    const count = rows.length;
    const isVipUnlocked = count >= 3;
    if (isVipUnlocked) {
      try {
        db.prepare("UPDATE users SET vip_status = 'VIP Basic' WHERE id = ? OR username = ?").run(userKey, userKey);
      } catch {}
    }
    return {
      count,
      target: 3,
      isVipUnlocked,
      referrals: rows
    };
  },
  addReferral(referrerKey, referredUsername) {
    ensureSocialTables();
    const exists = db.prepare('SELECT id FROM social_referrals WHERE referrer_key = ? AND referred_username = ?')
      .get(referrerKey, referredUsername);
    if (!exists) {
      db.prepare('INSERT INTO social_referrals (referrer_key, referred_username) VALUES (?, ?)')
        .run(referrerKey, referredUsername);
    }
    return this.getReferrals(referrerKey);
  },
  customizeUser(userId, data = {}) {
    ensureSocialTables();
    const bannerUrl = data.bannerUrl !== undefined ? data.bannerUrl : data.banner_url;
    const themePreference = data.themePreference !== undefined ? data.themePreference : data.theme_preference;
    const frameStyle = data.frameStyle !== undefined ? data.frameStyle : data.frame_style;
    const ornament = data.ornament !== undefined ? data.ornament : data.ornament;
    const bannerStyle = data.bannerStyle !== undefined ? data.bannerStyle : data.banner_style;

    const key = String(userId);
    const cur = db.prepare('SELECT * FROM social_profiles WHERE user_key = ?').get(key) || {};
    const b = bannerUrl !== undefined ? bannerUrl : cur.banner_url ?? null;
    const t = themePreference !== undefined ? themePreference : cur.theme_preference ?? null;
    const f = frameStyle !== undefined ? frameStyle : cur.frame_style ?? 'default';
    const o = ornament !== undefined ? ornament : cur.ornament ?? 'none';
    const bs = bannerStyle !== undefined ? bannerStyle : cur.banner_style ?? 'off';

    db.prepare(`
      INSERT INTO social_profiles (user_key, banner_url, theme_preference, frame_style, ornament, banner_style)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_key) DO UPDATE SET
        banner_url = excluded.banner_url,
        theme_preference = excluded.theme_preference,
        frame_style = excluded.frame_style,
        ornament = excluded.ornament,
        banner_style = excluded.banner_style
    `).run(key, b ?? null, t ?? null, f ?? 'default', o ?? 'none', bs ?? 'off');

    try {
      const sets = []; const args = [];
      if (bannerUrl !== undefined) { sets.push('banner_url = ?'); args.push(bannerUrl); }
      if (themePreference !== undefined) { sets.push('theme_preference = ?'); args.push(themePreference); }
      if (frameStyle !== undefined) { sets.push('frame_style = ?'); args.push(frameStyle); }
      if (ornament !== undefined) { sets.push('ornament = ?'); args.push(ornament); }
      if (bannerStyle !== undefined) { sets.push('banner_style = ?'); args.push(bannerStyle); }
      if (sets.length) { args.push(key); db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...args); }
    } catch { /* legacy table optional */ }
    return 1;
  },
  getUserProfile(userKey) {
    ensureSocialTables();
    return db.prepare('SELECT * FROM social_profiles WHERE user_key = ?').get(String(userKey)) || {};
  }
};

/* ------------------------- shared leveling rules ------------------------- */
export const MINUTES_PER_LEVEL = 100;

export function levelFromMinutes(totalMinutes) {
  return Math.floor(Math.max(0, totalMinutes) / MINUTES_PER_LEVEL) + 1;
}

export function progressPercentage(totalMinutes) {
  const t = Math.max(0, totalMinutes);
  return Math.round(((t % MINUTES_PER_LEVEL) / MINUTES_PER_LEVEL) * 1000) / 10;
}

export function getLevelRank(level) {
  const lvl = Number(level) || 1;
  if (lvl >= 50) return { titleAr: 'إمبراطور المانجا والأنمي', titleEn: 'Shadow Emperor', color: '#ec4899', icon: '👑' };
  if (lvl >= 30) return { titleAr: 'سينسي الأنمي والمانجا', titleEn: 'Anime Sensei', color: '#8b5cf6', icon: '⚡' };
  if (lvl >= 20) return { titleAr: 'نخبة الشينوبي', titleEn: 'Elite Shinobi', color: '#22d3ee', icon: '🗡️' };
  if (lvl >= 10) return { titleAr: 'أوتاكو معتمد', titleEn: 'Certified Otaku', color: '#a3e635', icon: '⭐' };
  if (lvl >= 5)  return { titleAr: 'متابع نشط', titleEn: 'Active Watcher', color: '#fb923c', icon: '🔥' };
  return { titleAr: 'مبتدئ الأنمي', titleEn: 'Novice Scout', color: '#60a5fa', icon: '🌱' };
}

export function awardBadgesSqlite(userKey, totalMinutes) {
  for (const badge of social.badges()) {
    if (badge.requirement_threshold <= totalMinutes) social.awardBadge(userKey, badge.id);
  }
}
