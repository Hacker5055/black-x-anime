/**
 * Latest BLACK X Mobile APK release.
 *
 * Shared by the server (GET /api/app/config tells installed apps about it) and the
 * APK itself (client/src/mobile/bxServers.js reads its own version from here), so a
 * new build only needs this file and the rebuilt APK in client/public.
 *
 * The APK is installed from the website, not from Google Play, so this banner is
 * the only way users learn that an update exists. Bump `version` (and the notes)
 * whenever a rebuilt APK is committed. `minSupported` marks older builds that can
 * no longer work (they get a non-dismissible banner).
 */
export const APK_RELEASE = Object.freeze({
  version: '16.1',
  minSupported: '15.0',
  url: 'https://black-x-anime.me/BLACK-X-Mobile-120Hz.apk',
  publishedAt: '2026-10-16',
  notesAr: Object.freeze([
    'تصليح اللمس: التمرير بالصباع رجع يشتغل في كل الصفحات',
    'تسجيل الدخول والـ VIP بقوا عن طريق سيرفر الموقع (أمان أعلى)',
    'فتح أسرع وسلاسة أكتر في الرئيسية والبحث',
    'تخطي المقدمة بتوقيتات حقيقية والحلقة الجاية بعدّاد',
    'كمّل المشاهدة من نفس الثانية على أي موبايل'
  ]),
  notesEn: Object.freeze([
    'Touch fix: finger scrolling works again on every page',
    'Sign-in and VIP now go through the website server (more secure)',
    'Faster start and smoother home and search',
    'Real intro-skip timestamps and a next-episode countdown',
    'Resume from the same second on any phone'
  ])
});

/** Compares dotted versions numerically: returns -1, 0 or 1. */
export function compareVersions(a, b) {
  const pa = String(a || '0').split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = String(b || '0').split('.').map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
