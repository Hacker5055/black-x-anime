/**
 * Content & ratings controller — POST /api/content/rate
 */
import { getPrisma } from '../lib/prisma.js';
import { getUserId, fail, prismaError, ensurePrismaUser, isDbUnavailable, dbIsBroken } from '../lib/api.js';
import { social, ensureSocialTables, levelFromMinutes, awardBadgesSqlite } from '../lib/socialDb.js';

/** POST /api/content/rate — body { contentId, episodeId?, score: 1..10 } */
export async function rateContent(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return fail(res, 401, 'Authentication required.');

    const { contentId, episodeId, score, slug, title, type, episodeNumber } = req.body || {};
    if (contentId !== undefined && contentId !== null && typeof contentId !== 'string') {
      return fail(res, 400, 'contentId must be a string.');
    }
    if (episodeId !== undefined && episodeId !== null && typeof episodeId !== 'string') {
      return fail(res, 400, 'episodeId must be a string.');
    }
    const s = Number(score);
    if (!Number.isInteger(s) || s < 1 || s > 10) {
      return fail(res, 400, 'score must be an integer between 1 and 10.');
    }

    // no DATABASE_URL -> SQLite social store (works on every host)
        var socialFallback = () => {
      ensureSocialTables();
      const ep = episodeNumber !== undefined && episodeNumber !== null ? Number(episodeNumber) : 0;
      if (!Number.isInteger(ep) || ep < 0) return fail(res, 400, 'episodeNumber must be a positive integer.');
      if (!slug) return fail(res, 400, 'contentId or slug is required.');
      social.upsertRating(String(userId), String(slug).slice(0, 120), ep, s, title != null ? String(title).slice(0, 200) : null);
      return res.status(200).json({ success: true, message: 'Rating saved successfully.' });
    };
    if (!process.env.DATABASE_URL || dbIsBroken()) return socialFallback();

    const prisma = getPrisma();
    const user = await ensurePrismaUser(prisma, req.user);
    if (!user) return fail(res, 404, 'User not found.');
    const uid = user.id;

    // contentId (spec) or slug (site UI: witanime/AniList slugs) -> Content row
    let cid = contentId ?? null;
    if (!cid && slug) {
      const clean = String(slug).slice(0, 120);
      let row = await prisma.content.findUnique({ where: { slug: clean } });
      if (!row) {
        row = await prisma.content.create({
          data: {
            slug: clean,
            title: String(title || clean).slice(0, 200),
            type: ['ANIME', 'MANGA', 'NOVEL'].includes(type) ? type : 'ANIME'
          }
        });
      }
      cid = row.id;
    }
    if (!cid) return fail(res, 400, 'contentId or slug is required.');

    const content = await prisma.content.findUnique({ where: { id: cid } });
    if (!content) return fail(res, 404, 'Content not found.');

    let epId = episodeId ?? null;
    if (!epId && episodeNumber !== undefined && episodeNumber !== null) {
      const n = Number(episodeNumber);
      if (!Number.isInteger(n) || n < 0) return fail(res, 400, 'episodeNumber must be a positive integer.');
      let ep = await prisma.episodeChapter.findFirst({ where: { content_id: cid, number: n } });
      if (!ep) ep = await prisma.episodeChapter.create({ data: { content_id: cid, number: n, title: `Episode ${n}` } });
      epId = ep.id;
    }
    if (epId) {
      const episode = await prisma.episodeChapter.findUnique({ where: { id: epId } });
      if (!episode) return fail(res, 404, 'Episode not found.');
      if (episode.content_id !== cid) {
        return fail(res, 400, 'Episode does not belong to the given content.');
      }
    }

    // One rating per (user, content, episode|content-level) — upsert-by-hand
    // because the composite unique contains a nullable episode_id.
    const where = { user_id: uid, content_id: cid, episode_id: epId ?? null };
    const existing = await prisma.rating.findFirst({ where });
    if (existing) {
      await prisma.rating.update({ where: { id: existing.id }, data: { score: s } });
    } else {
      await prisma.rating.create({ data: { ...where, score: s } });
    }

    return res.status(200).json({
      success: true,
      message: 'Rating saved successfully.'
    });
  } catch (err) {
      if (isDbUnavailable(err) && typeof socialFallback === 'function') return socialFallback();
    return prismaError(res, err, { notFound: 'Rating target not found.' });
  }
}

/**
 * GET /api/content/rating?slug=&episodeNumber= — the signed-in user's saved
 * score for a show/episode, so the UI can restore highlighted stars.
 */
export async function getMyRating(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return fail(res, 401, 'Authentication required.');
    const slug = String(req.query.slug || '').trim();
    if (!slug) return fail(res, 400, 'slug is required.');
    const ep = req.query.episodeNumber !== undefined ? Number(req.query.episodeNumber) : 0;
    if (!Number.isInteger(ep) || ep < 0) return fail(res, 400, 'episodeNumber must be a positive integer.');

        var socialFallback = () => {
      ensureSocialTables();
      const row = social.getRating(String(userId), slug.slice(0, 120), ep);
      return res.status(200).json({ success: true, rating: row ? { score: row.score } : null });
    };
    if (!process.env.DATABASE_URL || dbIsBroken()) return socialFallback();

    const prisma = getPrisma();
    const user = await ensurePrismaUser(prisma, req.user);
    const where = { user_id: user.id, content_id: '', episode_id: null };
    // resolve content by slug (or contentId) then find the rating
    let content = null;
    if (req.query.contentId) content = await prisma.content.findUnique({ where: { id: String(req.query.contentId) } });
    if (!content) content = await prisma.content.findUnique({ where: { slug: slug.slice(0, 120) } });
    if (!content) return res.status(200).json({ success: true, rating: null });

    let epId = null;
    if (ep > 0) {
      const epRow = await prisma.episodeChapter.findFirst({ where: { content_id: content.id, number: ep } });
      epId = epRow?.id ?? null;
    }
    const rating = await prisma.rating.findFirst({
      where: { user_id: user.id, content_id: content.id, episode_id: epId }
    });
    return res.status(200).json({ success: true, rating: rating ? { score: rating.score } : null });
  } catch (err) {
      if (isDbUnavailable(err) && typeof socialFallback === 'function') return socialFallback();
    return prismaError(res, err);
  }
}

/**
 * GET /api/content/library?type=ALL|MANGA|MANHWA|NOVEL|BOOK&q=
 */
export async function getLibrary(req, res) {
  try {
    ensureSocialTables();
    const type = String(req.query.type || 'ALL').trim();
    const q = String(req.query.q || '').trim();
    const items = social.getLibraryItems(type, q);
    return res.json({ success: true, items });
  } catch (err) {
    console.error('getLibrary error:', err);
    return res.status(500).json({ success: false, error: 'failed_to_fetch_library', items: [] });
  }
}

/**
 * GET /api/content/library/:id
 */
export async function getLibraryItemDetail(req, res) {
  try {
    ensureSocialTables();
    const { id } = req.params;
    const item = social.getLibraryItem(id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    
    // Generate chapter/volume list for reading
    const totalChapters = item.chapters_count || 20;
    const isNovelOrBook = item.type === 'NOVEL' || item.type === 'BOOK';
    const chapters = Array.from({ length: Math.min(totalChapters, 60) }, (_, i) => {
      const num = i + 1;
      return {
        number: num,
        title: isNovelOrBook ? `الفصل ${num}: البداية والتفاصيل` : `الفصل ${num}`,
        pages: isNovelOrBook ? 18 : 22,
        releaseDate: '2025'
      };
    });

    return res.json({ success: true, item: { ...item, chapters } });
  } catch (err) {
    console.error('getLibraryItemDetail error:', err);
    return res.status(500).json({ success: false, error: 'failed_to_fetch_item' });
  }
}

/**
 * POST /api/content/library/:id/read — logs reading minutes & awards XP/leveling!
 */
export async function logReadingProgress(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return fail(res, 401, 'Authentication required.');
    const { minutes = 15 } = req.body || {};
    const delta = Math.max(1, Math.min(180, Number(minutes) || 15));
    
    ensureSocialTables();
    const key = String(userId);
    const before = social.getStats(key);
    const prevTotal = (before?.total_watch_time_min || 0) + (before?.total_read_time_min || 0);
    const prevLevel = levelFromMinutes(prevTotal);

    const row = social.upsertStats(key, 'total_read_time_min', delta);
    const total = row.total_watch_time_min + row.total_read_time_min;
    const newLevel = levelFromMinutes(total);
    if (row.current_level !== newLevel) social.setLevel(key, newLevel);
    awardBadgesSqlite(key, total);

    return res.json({
      success: true,
      message: 'Reading session recorded!',
      minutesAdded: delta,
      totalReadMinutes: row.total_read_time_min,
      currentLevel: newLevel,
      levelUp: newLevel > prevLevel
    });
  } catch (err) {
    console.error('logReadingProgress error:', err);
    return res.status(500).json({ success: false, error: 'failed_to_record_progress' });
  }
}
