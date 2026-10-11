/**
 * Content & ratings controller — POST /api/content/rate
 */
import { getPrisma } from '../lib/prisma.js';
import { getUserId, fail, prismaError, ensurePrismaUser } from '../lib/api.js';

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
    return prismaError(res, err, { notFound: 'Rating target not found.' });
  }
}
