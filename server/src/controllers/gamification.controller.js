/**
 * Gamification & rewards controller
 *   GET  /api/gamification/stats
 *   POST /api/gamification/sync-time
 *   POST /api/creator/submit
 */
import { getPrisma } from '../lib/prisma.js';
import { getUserId, fail, prismaError, ensurePrismaUser, isDbUnavailable, dbIsBroken } from '../lib/api.js';
import { social, ensureSocialTables, levelFromMinutes, progressPercentage, awardBadgesSqlite, db as socialSqlite } from '../lib/socialDb.js';

/* ---------------------------- leveling rules ----------------------------
 * Lifetime minutes (watch + read) drive the level:
 *   level   = floor(totalMinutes / MINUTES_PER_LEVEL) + 1
 *   progress = percentage through the current level (0–99.9, 1 decimal)
 * Badges unlock when requirement_threshold <= lifetime minutes.
 */
/** Award every badge whose threshold the user has crossed and not yet earned. */
async function awardEligibleBadges(prisma, userId, totalMinutes) {
  const eligible = await prisma.badge.findMany({
    where: { requirement_threshold: { lte: totalMinutes } }
  });
  if (eligible.length === 0) return;
  const owned = await prisma.userBadge.findMany({
    where: { user_id: userId },
    select: { badge_id: true }
  });
  const ownedIds = new Set(owned.map((b) => b.badge_id));
  for (const badge of eligible) {
    if (ownedIds.has(badge.id)) continue;
    await prisma.userBadge.upsert({
      where: { user_id_badge_id: { user_id: userId, badge_id: badge.id } },
      create: { user_id: userId, badge_id: badge.id },
      update: {}
    });
  }
}

/** GET /api/gamification/stats */
export async function getStats(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return fail(res, 401, 'Authentication required.');

        var socialFallback = () => {
      ensureSocialTables();
      const key = String(userId);
      const row = social.getStats(key);
      const total = (row?.total_watch_time_min || 0) + (row?.total_read_time_min || 0);
      const currentLevel = levelFromMinutes(total);
      if (row && row.current_level !== currentLevel) social.setLevel(key, currentLevel);
      return res.status(200).json({
        success: true,
        data: {
          totalWatchTimeMin: row?.total_watch_time_min || 0,
          totalReadTimeMin: row?.total_read_time_min || 0,
          currentLevel,
          progressPercentage: progressPercentage(total),
          unlockedBadges: social.userBadges(key).map((b) => ({ name: b.name, iconUrl: b.icon_url }))
        }
      });
    };
    if (!process.env.DATABASE_URL || dbIsBroken()) return socialFallback();

    const prisma = getPrisma();
    const uid = String(userId);

    await ensurePrismaUser(prisma, req.user);
    const user = await prisma.user.findUnique({
      where: { id: uid },
      include: {
        stats: true,
        badges: { include: { badge: true }, orderBy: { awarded_at: 'asc' } }
      }
    });
    if (!user) return fail(res, 404, 'User not found.');

    // ensure the stats row exists (upsert) and keep current_level coherent
    const total = (user.stats?.total_watch_time_min || 0) + (user.stats?.total_read_time_min || 0);
    const currentLevel = levelFromMinutes(total);
    await prisma.userStats.upsert({
      where: { user_id: uid },
      create: { user_id: uid, current_level: currentLevel },
      update: { current_level: currentLevel }
    });

    const unlockedBadges = user.badges.map((ub) => ({
      name: ub.badge.name,
      iconUrl: ub.badge.icon_url
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalWatchTimeMin: user.stats?.total_watch_time_min || 0,
        totalReadTimeMin: user.stats?.total_read_time_min || 0,
        currentLevel,
        progressPercentage: progressPercentage(total),
        unlockedBadges
      }
    });
  } catch (err) {
      if (isDbUnavailable(err) && typeof socialFallback === 'function') return socialFallback();
    return prismaError(res, err, { notFound: 'User not found.' });
  }
}

/** POST /api/gamification/sync-time — body { sessionMinutes, type: 'watch'|'read' } */
export async function syncTime(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return fail(res, 401, 'Authentication required.');

    const { sessionMinutes, type } = req.body || {};
    if (type !== 'watch' && type !== 'read') {
      return fail(res, 400, "type must be 'watch' or 'read'.");
    }
    const minutes = Number(sessionMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) {
      return fail(res, 400, 'sessionMinutes must be a number between 1 and 1440.');
    }
    const delta = Math.round(minutes);

        var socialFallback = () => {
      ensureSocialTables();
      const key = String(userId);
      const before = social.getStats(key);
      const prevTotal = (before?.total_watch_time_min || 0) + (before?.total_read_time_min || 0);
      const prevLevel = levelFromMinutes(prevTotal);
      const field = type === 'watch' ? 'total_watch_time_min' : 'total_read_time_min';
      const row = social.upsertStats(key, field, delta);
      const total = row.total_watch_time_min + row.total_read_time_min;
      const newLevel = levelFromMinutes(total);
      if (row.current_level !== newLevel) social.setLevel(key, newLevel);
      awardBadgesSqlite(key, total);
      return res.status(200).json({ success: true, levelUp: newLevel > prevLevel, newLevel });
    };
    if (!process.env.DATABASE_URL || dbIsBroken()) return socialFallback();

    const prisma = getPrisma();
    const uid = String(userId);

    const user = await ensurePrismaUser(prisma, req.user);
    if (!user) return fail(res, 404, 'User not found.');

    const before = await prisma.userStats.findUnique({ where: { user_id: uid } });
    const prevTotal = (before?.total_watch_time_min || 0) + (before?.total_read_time_min || 0);
    const prevLevel = levelFromMinutes(prevTotal);

    const field = type === 'watch' ? 'total_watch_time_min' : 'total_read_time_min';
    const stats = await prisma.userStats.upsert({
      where: { user_id: uid },
      create: { user_id: uid, [field]: delta },
      update: { [field]: { increment: delta } }
    });

    const total = stats.total_watch_time_min + stats.total_read_time_min;
    const newLevel = levelFromMinutes(total);
    if (stats.current_level !== newLevel) {
      await prisma.userStats.update({ where: { user_id: uid }, data: { current_level: newLevel } });
    }

    await awardEligibleBadges(prisma, uid, total);

    return res.status(200).json({
      success: true,
      levelUp: newLevel > prevLevel,
      newLevel
    });
  } catch (err) {
      if (isDbUnavailable(err) && typeof socialFallback === 'function') return socialFallback();
    return prismaError(res, err, { notFound: 'User not found.' });
  }
}

/** POST /api/creator/submit — body { videoUrl } */
export async function submitCreator(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return fail(res, 401, 'Authentication required.');

    const { videoUrl } = req.body || {};
    if (!videoUrl || typeof videoUrl !== 'string') {
      return fail(res, 400, 'videoUrl is required.');
    }
    let parsed;
    try {
      parsed = new URL(videoUrl);
    } catch {
      return fail(res, 400, 'videoUrl must be a valid URL.');
    }
    if (parsed.protocol !== 'https:') {
      return fail(res, 400, 'videoUrl must be an https URL.');
    }

        var socialFallback = () => {
      ensureSocialTables();
      social.submitCreator(String(userId), videoUrl);
      return res.status(201).json({
        success: true,
        status: 'PENDING',
        message: 'Submission received for VIP reward review.'
      });
    };
    if (!process.env.DATABASE_URL || dbIsBroken()) return socialFallback();

    const prisma = getPrisma();
    const uid = String(userId);

    const user = await ensurePrismaUser(prisma, req.user);
    if (!user) return fail(res, 404, 'User not found.');

    await prisma.creatorSubmission.create({
      data: { user_id: uid, video_url: videoUrl, status: 'PENDING' }
    });

    return res.status(201).json({
      success: true,
      status: 'PENDING',
      message: 'Submission received for VIP reward review.'
    });
  } catch (err) {
      if (isDbUnavailable(err) && typeof socialFallback === 'function') return socialFallback();
    return prismaError(res, err, { notFound: 'User not found.' });
  }
}

/**
 * GET /api/gamification/creator/summary?username= — creator analytics.
 */
export async function getCreatorSummary(req, res) {
  try {
    const me = getUserId(req);
    if (!me) return fail(res, 401, 'Authentication required.');
    const username = req.query.username ? String(req.query.username).slice(0, 40) : (req.user?.username || null);

    var socialFallback = () => {
      ensureSocialTables();
      const keys = [String(me)];
      if (username) keys.push('name:' + username);
      const q = keys.map(() => '?').join(',');
      const rows = socialSqlite.prepare(`SELECT status FROM social_submissions WHERE user_key IN (${q})`).all(...keys);
      const totalSubmissions = rows.length;
      const approved = rows.filter((r) => r.status === 'APPROVED').length;
      const rejected = rows.filter((r) => r.status === 'REJECTED').length;
      const pendingVideos = rows.filter((r) => r.status === 'PENDING').length;
      const vipTier = approved >= 20 ? 'Diamond' : approved >= 10 ? 'Gold' : approved >= 5 ? 'Silver' : 'Bronze';
      return res.status(200).json({
        success: true,
        data: { username: username || req.user?.username || null, totalSubmissions, approved, rejected, pendingVideos, vipTier }
      });
    };
    if (!process.env.DATABASE_URL || dbIsBroken()) return socialFallback();

    const prisma = getPrisma();
    let uid = String(me);
    if (username && username !== req.user?.username) {
      const u = await prisma.user.findUnique({ where: { username } });
      if (!u) return fail(res, 404, 'User not found.');
      uid = u.id;
    } else {
      await ensurePrismaUser(prisma, req.user);
    }
    const where = { user_id: uid };
    const [totalSubmissions, approved, rejected, pendingVideos] = await Promise.all([
      prisma.submission.count({ where }),
      prisma.submission.count({ where: { ...where, status: 'APPROVED' } }),
      prisma.submission.count({ where: { ...where, status: 'REJECTED' } }),
      prisma.submission.count({ where: { ...where, status: 'PENDING' } })
    ]);
    const vipTier = approved >= 20 ? 'Diamond' : approved >= 10 ? 'Gold' : approved >= 5 ? 'Silver' : 'Bronze';
    return res.status(200).json({
      success: true,
      data: { username: username || req.user?.username || null, totalSubmissions, approved, rejected, pendingVideos, vipTier }
    });
  } catch (err) {
    if (isDbUnavailable(err) && typeof socialFallback === 'function') return socialFallback();
    return prismaError(res, err, { notFound: 'User not found.' });
  }
}
