/**
 * Content & ratings controller — POST /api/content/rate
 */
import { getPrisma } from '../lib/prisma.js';
import { getUserId, fail, prismaError } from '../lib/api.js';

/** POST /api/content/rate — body { contentId, episodeId?, score: 1..10 } */
export async function rateContent(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return fail(res, 401, 'Authentication required.');

    const { contentId, episodeId, score } = req.body || {};
    if (!contentId || typeof contentId !== 'string') {
      return fail(res, 400, 'contentId is required.');
    }
    if (episodeId !== undefined && episodeId !== null && typeof episodeId !== 'string') {
      return fail(res, 400, 'episodeId must be a string.');
    }
    const s = Number(score);
    if (!Number.isInteger(s) || s < 1 || s > 10) {
      return fail(res, 400, 'score must be an integer between 1 and 10.');
    }

    const prisma = getPrisma();
    const uid = String(userId);

    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user) return fail(res, 404, 'User not found.');

    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) return fail(res, 404, 'Content not found.');

    if (episodeId) {
      const episode = await prisma.episodeChapter.findUnique({ where: { id: episodeId } });
      if (!episode) return fail(res, 404, 'Episode not found.');
      if (episode.content_id !== contentId) {
        return fail(res, 400, 'Episode does not belong to the given content.');
      }
    }

    // One rating per (user, content, episode|content-level) — upsert-by-hand
    // because the composite unique contains a nullable episode_id.
    const where = { user_id: uid, content_id: contentId, episode_id: episodeId ?? null };
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
