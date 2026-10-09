import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

/* ============================ favorites ============================ */

router.get('/favorites', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({
    favorites: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      titleEn: r.title_en,
      titleAr: r.title_ar,
      poster: r.poster,
      banner: r.banner,
      episodes: r.episodes,
      createdAt: r.created_at
    }))
  });
});

router.put('/favorites/:slug', requireAuth, (req, res) => {
  const slug = String(req.params.slug || '').trim();
  if (!/^[a-z0-9-]{1,120}$/i.test(slug)) {
    return res.status(400).json({ error: 'invalid_slug', message: 'Invalid show slug' });
  }
  const { titleEn, titleAr, poster, banner, episodes } = req.body || {};
  db.prepare(`
    INSERT INTO favorites (user_id, slug, title_en, title_ar, poster, banner, episodes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, slug) DO UPDATE SET
      title_en = COALESCE(excluded.title_en, favorites.title_en),
      title_ar = COALESCE(excluded.title_ar, favorites.title_ar),
      poster = COALESCE(excluded.poster, favorites.poster),
      banner = COALESCE(excluded.banner, favorites.banner),
      episodes = COALESCE(excluded.episodes, favorites.episodes)
  `).run(
    req.user.id, slug,
    titleEn ?? null, titleAr ?? null,
    poster ?? null, banner ?? null,
    episodes ?? null
  );
  res.json({ ok: true, favorite: true });
});

router.delete('/favorites/:slug', requireAuth, (req, res) => {
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND slug = ?').run(req.user.id, String(req.params.slug));
  res.json({ ok: true, favorite: false });
});

router.get('/favorites/:slug', requireAuth, (req, res) => {
  const r = db.prepare('SELECT * FROM favorites WHERE user_id = ? AND slug = ?').get(req.user.id, String(req.params.slug));
  res.json({ favorite: Boolean(r) });
});

/* ===================== progress / continue watching ===================== */

/**
 * GET /api/library/continue — one entry per show: the most recently
 * watched episode that is not finished (or the last touched one).
 */
router.get('/continue', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT p.* FROM progress p
    JOIN (
      SELECT slug, MAX(updated_at) AS mu FROM progress
      WHERE user_id = ? GROUP BY slug
    ) latest ON latest.slug = p.slug AND latest.mu = p.updated_at
    WHERE p.user_id = ?
    ORDER BY p.updated_at DESC
    LIMIT 24
  `).all(req.user.id, req.user.id);

  const entries = rows.map((r) => ({
    slug: r.slug,
    episode: r.episode,
    position: r.position,
    duration: r.duration,
    completed: r.completed,
    titleEn: r.title_en,
    titleAr: r.title_ar,
    poster: r.poster,
    updatedAt: r.updated_at,
    percent: r.duration > 0 ? Math.min(100, Math.round((r.position / r.duration) * 100)) : 0
  }));

  // keep only active shows (not fully completed the episode), completed ones move to history
  res.json({
    continueWatching: entries.filter((e) => !e.completed && e.percent < 95),
    history: entries
  });
});

/** GET /api/library/progress/:slug/:ep — resume point */
router.get('/progress/:slug/:ep', requireAuth, (req, res) => {
  const r = db.prepare('SELECT * FROM progress WHERE user_id = ? AND slug = ? AND episode = ?')
    .get(req.user.id, String(req.params.slug), Number(req.params.ep));
  res.json({
    progress: r
      ? { position: r.position, duration: r.duration, completed: r.completed, updatedAt: r.updated_at }
      : null
  });
});

/** PUT /api/library/progress/:slug/:ep — save position {position, duration, completed?, titles?, poster?} */
router.put('/progress/:slug/:ep', requireAuth, (req, res) => {
  const slug = String(req.params.slug || '').trim();
  const episode = Number(req.params.ep);
  if (!/^[a-z0-9-]{1,120}$/i.test(slug) || !Number.isInteger(episode) || episode < 1) {
    return res.status(400).json({ error: 'invalid_params', message: 'Invalid slug or episode' });
  }
  const { position = 0, duration = 0, completed, titleEn, titleAr, poster } = req.body || {};
  const pos = Math.max(0, Number(position) || 0);
  const dur = Math.max(0, Number(duration) || 0);
  const done = completed !== undefined
    ? (completed ? 1 : 0)
    : (dur > 0 && pos / dur >= 0.95 ? 1 : 0);

  db.prepare(`
    INSERT INTO progress (user_id, slug, episode, position, duration, completed, title_en, title_ar, poster, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, slug, episode) DO UPDATE SET
      position = excluded.position,
      duration = excluded.duration,
      completed = excluded.completed,
      title_en = COALESCE(excluded.title_en, progress.title_en),
      title_ar = COALESCE(excluded.title_ar, progress.title_ar),
      poster = COALESCE(excluded.poster, progress.poster),
      updated_at = datetime('now')
  `).run(req.user.id, slug, episode, pos, dur, done, titleEn ?? null, titleAr ?? null, poster ?? null);

  res.json({ ok: true, completed: Boolean(done) });
});

router.delete('/progress/:slug', requireAuth, (req, res) => {
  db.prepare('DELETE FROM progress WHERE user_id = ? AND slug = ?').run(req.user.id, String(req.params.slug));
  res.json({ ok: true });
});

export default router;
