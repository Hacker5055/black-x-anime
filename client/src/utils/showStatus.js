/**
 * The status badge a card may show, read from what the API really sent:
 * AniList enums (RELEASING / FINISHED / NOT_YET_RELEASED), the catalogue's Arabic
 * words (مستمر / مكتمل) or English words (Currently Airing, Completed...).
 * Anything unknown returns '' so the badge hides instead of guessing. The cards
 * used to compare with 'FINISHED' only, which labelled every completed Arabic
 * catalogue title, and every title without a status, as airing.
 */
const FINISHED = /^(finished|completed?|ended|مكتمل|منتهي|انتهى)/;
const AIRING = /^(releasing|airing|currently airing|ongoing|on going|مستمر|يعرض)/;
const UPCOMING = /^(not_yet_released|not yet (aired|released)|upcoming|لم يعرض|قريبا)/;

export function showStatusLabel(status, lang = 'ar') {
  const s = String(status ?? '').trim().toLowerCase();
  if (!s) return '';
  if (FINISHED.test(s)) return lang === 'ar' ? 'مكتمل' : 'Completed';
  if (AIRING.test(s)) return lang === 'ar' ? 'يعرض الآن' : 'Airing';
  if (UPCOMING.test(s)) return lang === 'ar' ? 'قريباً' : 'Upcoming';
  return '';
}
