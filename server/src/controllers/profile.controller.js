/**
 * Profile & customization controller — PUT /api/profile/customize
 */
import { getPrisma } from '../lib/prisma.js';
import { getUserId, fail, prismaError } from '../lib/api.js';

/** PUT /api/profile/customize — body { bannerUrl?, themePreference? } */
export async function customizeProfile(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return fail(res, 401, 'Authentication required.');

    const { bannerUrl, themePreference } = req.body || {};
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
    if (Object.keys(data).length === 0) {
      return fail(res, 400, 'Nothing to update: provide bannerUrl and/or themePreference.');
    }

    const prisma = getPrisma();
    await prisma.user.update({ where: { id: String(userId) }, data });

    return res.status(200).json({
      success: true,
      message: 'Profile updated.'
    });
  } catch (err) {
    return prismaError(res, err, { notFound: 'User not found.' });
  }
}
