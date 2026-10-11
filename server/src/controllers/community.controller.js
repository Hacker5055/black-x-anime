/**
 * Community & social controller
 *   POST /api/community/follow
 *   GET  /api/community/posts
 */
import { getPrisma } from '../lib/prisma.js';
import { getUserId, fail, prismaError, ensurePrismaUser } from '../lib/api.js';
import { social, ensureSocialTables } from '../lib/socialDb.js';

/** POST /api/community/follow — body { targetUserId } */
export async function followUser(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return fail(res, 401, 'Authentication required.');

    const { targetUserId, targetUsername } = req.body || {};
    if (!targetUserId && !targetUsername) {
      return fail(res, 400, 'targetUserId is required.');
    }
    if (targetUserId !== undefined && targetUserId !== null && typeof targetUserId !== 'string') {
      return fail(res, 400, 'targetUserId must be a string.');
    }

    if (!process.env.DATABASE_URL) {
      ensureSocialTables();
      const key = String(userId);
      const targetKey = targetUserId
        ? String(targetUserId)
        : 'name:' + String(targetUsername).slice(0, 40);
      if (targetKey === key) return fail(res, 400, 'You cannot follow yourself.');
      social.follow(key, targetKey);
      return res.status(200).json({
        success: true,
        message: 'User followed successfully.',
        isFollowing: true
      });
    }

    const prisma = getPrisma();
    const me = await ensurePrismaUser(prisma, req.user);
    if (!me) return fail(res, 404, 'User not found.');
    const uid = me.id;

    // target by id (spec) or by username (site UI) — username targets get
    // provisioned on the fly so follow works across the auth bridge.
    let targetId = targetUserId ? String(targetUserId) : null;
    if (!targetId) {
      const name = String(targetUsername).slice(0, 40);
      const existing = await prisma.user.findUnique({ where: { username: name } });
      if (existing) {
        targetId = existing.id;
      } else {
        const created = await prisma.user.create({
          data: { username: name, email: `${name}@blackx.local`, password_hash: 'external', display_name: name }
        });
        targetId = created.id;
      }
    } else {
      const target = await prisma.user.findUnique({ where: { id: targetId } });
      if (!target) return fail(res, 404, 'User not found.');
    }
    if (targetId === uid) {
      return fail(res, 400, 'You cannot follow yourself.');
    }

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
