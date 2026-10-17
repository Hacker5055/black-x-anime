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
  version: '17.1',
  minSupported: '15.0',
  url: 'https://black-x-anime.me/BLACK-X-Mobile-120Hz.apk',
  publishedAt: '2026-10-17',
  notesAr: Object.freeze([
    'الجدول بمواعيد العرض الحقيقية وعدّاد تنازلي، و«اتعرضت» لما الحلقة تتعرض',
    'تنبيهات الحلقات بقت أسرع بعد ميعاد عرض أعمالك، وإشعار التجربة بيقول إنه تجربة',
    'صفحة الأنمي من غير تابات فاضية، وأدوات الحلقات في زرار «خيارات» واحد',
    'المانجا: اقتراحات بحث من الأشهر على AniList وفلترة السيرفر والنوع في مكان واحد',
    'المجتمع: البوست يتربط بأنمي تفتحه بضغطة، وغطا على بوستات الحرق',
    'إحصائيات مشاهدتك في حسابك من سجلك الحقيقي، وكروت عريضة لـ«بيتعرض دلوقتي»'
  ]),
  notesEn: Object.freeze([
    'Schedule with the real air times, a live countdown and «aired» once it aired',
    'Episode alerts come sooner after your shows air, and the test notification says it is a test',
    'Title pages without empty tabs, and the episode tools in one «Options» button',
    'Manga: quick searches from AniList’s most popular titles, server and type in one filter sheet',
    'Community: tie a post to an anime that opens with a tap, and a cover over spoiler posts',
    'Watch stats on your account from your real history, and wide cards for «Airing now»'
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
