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
  version: '17.0',
  minSupported: '15.0',
  url: 'https://black-x-anime.me/BLACK-X-Mobile-120Hz.apk',
  publishedAt: '2026-10-16',
  notesAr: Object.freeze([
    'شكل جديد: رئيسية أنضف وكل قسم بيعرض حاجة مختلفة',
    'التنقل: حسابك من صورتك فوق، والتابات بأساميها وحركة انسيابية',
    'مشغل بأزرار جديدة: ±10 ثواني و±10 دقايق وعلامات المقدمة',
    'البحث بفلترة في مكان واحد، والجدول بيفتح على النهارده',
    'المجتمع: لايك واحد لكل حساب ووقت حقيقي للبوستات'
  ]),
  notesEn: Object.freeze([
    'New look: a cleaner home where every row shows something different',
    'Navigation: your account from your picture, labelled tabs and smooth motion',
    'New player controls: ±10 s, ±10 min and intro marks on the seek bar',
    'Search filters in one sheet, and the schedule opens on today',
    'Community: one like per account and real post times'
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
