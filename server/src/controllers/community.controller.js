/**
 * Community & social controller
 *   POST /api/community/follow
 *   GET  /api/community/posts
 */
import { getPrisma } from '../lib/prisma.js';
import { getUserId, fail, prismaError } from '../lib/api.js';

/** POST /api/community/follow — body { targetUserId } */
export async function followUser(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return fail(res, 401, 'Authentication required.');

    const { targetUserId } = req.body || {};
    if (!targetUserId || typeof targetUserId !== 'string') {
      return fail(res, 400, 'targetUserId is required.');
    }

    const uid = String(userId);
    const targetId = String(targetUserId);
    if (targetId === uid) {
      return fail(res, 400, 'You cannot follow yourself.');
    }

    const prisma = getPrisma();
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return fail(res, 404, 'User not found.');

    // idempotent follow
    await prisma.follow.upsert({
      where: { follower_id_following_id: { follower_id: uid, following_id: targetId } },
      create: { follower_id: uid, following_id: targetId },
      update: {}
    });

    return res.status(200).json({
      success: true,
      message: 'User followed successfully.',
      isFollowing: true
    });
  } catch (err) {
    return prismaError(res, err, { notFound: 'User not found.' });
  }
}

/** GET /api/community/posts */
export async function listPosts(req, res) {
  try {
    const prisma = getPrisma();
    const posts = await prisma.post.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { username: true, is_verified: true, vip_status: true } }
      }
    });

    const data = posts.map((p) => ({
      postId: p.id,
      title: p.title,
      author: {
        username: p.user.username,
        isVerified: p.user.is_verified,
        vipStatus: p.user.vip_status
      }
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return prismaError(res, err);
  }
}
