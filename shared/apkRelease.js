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
  version: '18.0',
  minSupported: '15.0',
  url: 'https://black-x-anime.me/BLACK-X-Mobile-120Hz.apk',
  publishedAt: '2026-10-17',
  notesAr: Object.freeze([
    'تذكير بميعاد عرض حلقات الأعمال اللي بتتابعها حتى والتطبيق مقفول',
    'حفلة المشاهدة اتعملت من جديد: بتفتح حلقة صاحب الغرفة، والفيديو بيمشي معاه، وشات ورياكشن حقيقيين',
    'توفير البيانات ممكن يشتغل لوحده على باقة الموبايل («على الداتا»)',
    'مؤقت النوم ظاهر فوق المشغل، وتلغيه بلمسة',
    'صفحة «على الموقع بس» بتقولك الموقع فيه إيه زيادة'
  ]),
  notesEn: Object.freeze([
    'Air-time reminders for the titles you follow, even while the app is closed',
    'Watch parties rebuilt: you open the host’s episode, the video follows the host, with a real chat and reactions',
    'Data saver can turn itself on over mobile data («Mobile data»)',
    'The sleep timer shows above the player and is cancelled with one tap',
    'A «Website only» page lists what the website adds'
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
