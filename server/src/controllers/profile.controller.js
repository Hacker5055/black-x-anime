/**
 * Profile & customization controller — PUT /api/profile/customize
 */
import { getPrisma } from '../lib/prisma.js';
import { getUserId, fail, prismaError, ensurePrismaUser, isDbUnavailable, dbIsBroken } from '../lib/api.js';
import { social, ensureSocialTables, levelFromMinutes, getLevelRank, db as socialSqlite } from '../lib/socialDb.js';

/** PUT /api/profile/customize — body { bannerUrl?, themePreference?, frameStyle?, ornament? } */
export async function customizeProfile(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return fail(res, 401, 'Authentication required.');

    const { bannerUrl, themePreference, frameStyle, ornament } = req.body || {};
    const data = {};

    if (bannerUrl !== undefined) {
      if (bannerUrl !== null && typeof bannerUrl !== 'string') {
        return fail(res, 400, 'bannerUrl must be a string.');
      }
      data.banner_url = bannerUrl;
    }
    if (themePreference !== undefined) {
      if (typeof themePreference !== 'string' || !themePreference.trim()) {
        return fail(res, 400, 'themePreference must be a non-empty string.');
      }
      data.theme_preference = themePreference.trim();
    }
    if (frameStyle !== undefined) {
      data.frame_style = String(frameStyle).trim();
    }
    if (ornament !== undefined) {
      data.ornament = String(ornament).trim();
    }
    if (Object.keys(data).length === 0) {
      return fail(res, 400, 'Nothing to update: provide bannerUrl, themePreference, or frameStyle.');
    }

        var socialFallback = () => {
      ensureSocialTables();
      const changes = social.customizeUser(userId, data);
      if (!changes) return fail(res, 404, 'User not found.');
      return res.status(200).json({ success: true, message: 'Profile updated.' });
    };
    if (!process.env.DATABASE_URL || dbIsBroken()) return socialFallback();

    const prisma = getPrisma();
    await ensurePrismaUser(prisma, req.user);
    await prisma.user.update({ where: { id: String(userId) }, data });

    return res.status(200).json({
      success: true,
      message: 'Profile updated.'
    });
  } catch (err) {
      if (isDbUnavailable(err) && typeof socialFallback === 'function') return socialFallback();
    return prismaError(res, err, { notFound: 'User not found.' });
  }
}

/**
 * GET /api/profile/profile?username= — own or public profile.
 */
export async function getProfile(req, res) {
  try {
    const me = getUserId(req);
    if (!me) return fail(res, 401, 'Authentication required.');
    const username = req.query.username ? String(req.query.username).slice(0, 40) : null;

    var socialFallback = () => {
      ensureSocialTables();
      let row = username
        ? socialSqlite.prepare('SELECT * FROM users WHERE username = ?').get(username)
        : socialSqlite.prepare('SELECT * FROM users WHERE id = ?').get(String(me));
      if (!row && !username) {
        row = { id: String(me), username: req.user?.username || 'user', display_name: req.user?.displayName || null, photo_url: null };
      }
      if (!row) return fail(res, 404, 'User not found.');
      const prof = social.getUserProfile(row.id);
      const key = String(row.id);
      const st = social.getStats(key);
      const total = (st?.total_watch_time_min || 0) + (st?.total_read_time_min || 0);
      const followers = socialSqlite.prepare('SELECT COUNT(*) c FROM social_follows WHERE following_key = ?').get(key).c;
      const following = socialSqlite.prepare('SELECT COUNT(*) c FROM social_follows WHERE follower_key = ?').get(key).c;
      const curLevel = levelFromMinutes(total);
      const rank = getLevelRank(curLevel);
      const refInfo = social.getReferrals(key);
      return res.status(200).json({
        success: true,
        data: {
          username: row.username,
          displayName: row.display_name || row.username,
          photoUrl: row.photo_url ?? null,
          bannerUrl: prof.banner_url ?? row.banner_url ?? null,
          themePreference: prof.theme_preference ?? row.theme_preference ?? null,
          frameStyle: prof.frame_style ?? row.frame_style ?? 'default',
          ornament: prof.ornament ?? row.ornament ?? 'none',
          vipStatus: refInfo.isVipUnlocked ? 'VIP Basic' : (row.vip_status || null),
          referralCode: `BLACKX-${(row.username || 'USER').toUpperCase()}`,
          totalWatchTimeMin: st?.total_watch_time_min || 0,
          totalReadTimeMin: st?.total_read_time_min || 0,
          totalMinutes: total,
          xp: total * 10,
          level: curLevel,
          rank,
          followers, following,
          badges: social.userBadges(key).map((b) => ({ name: b.name, iconUrl: b.icon_url }))
        }
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
    const user = await prisma.user.findUnique({
      where: { id: uid },
      include: {
        stats: true,
        badges: { include: { badge: true }, orderBy: { awarded_at: 'asc' } }
      }
    });
    if (!user) return fail(res, 404, 'User not found.');
    const [followers, following] = await Promise.all([
      prisma.follow.count({ where: { following_id: uid } }),
      prisma.follow.count({ where: { follower_id: uid } })
    ]);
    const total = (user.stats?.total_watch_time_min || 0) + (user.stats?.total_read_time_min || 0);
    return res.status(200).json({
      success: true,
      data: {
        username: user.username,
        displayName: user.display_name || user.username,
        photoUrl: user.photo_url ?? null,
        bannerUrl: user.banner_url ?? null,
        themePreference: user.theme_preference ?? null,
        totalWatchTimeMin: user.stats?.total_watch_time_min || 0,
        level: levelFromMinutes(total),
        followers, following,
        badges: user.badges.map((ub) => ({ name: ub.badge.name, iconUrl: ub.badge.icon_url }))
      }
    });
  } catch (err) {
    if (isDbUnavailable(err) && typeof socialFallback === 'function') return socialFallback();
    return prismaError(res, err, { notFound: 'User not found.' });
  }
}
