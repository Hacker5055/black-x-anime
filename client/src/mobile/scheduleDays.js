/**
 * Days of the airing schedule. `id` is the exact `show_time` facet value of the
 * catalogue index, so it doubles as the Algolia filter.
 */
export const SCHEDULE_DAYS = [
  { id: 'السبت', ar: 'السبت', en: 'Saturday', short: 'Sat' },
  { id: 'الأحد', ar: 'الأحد', en: 'Sunday', short: 'Sun' },
  { id: 'الإثنين', ar: 'الإثنين', en: 'Monday', short: 'Mon' },
  { id: 'الثلاثاء', ar: 'الثلاثاء', en: 'Tuesday', short: 'Tue' },
  { id: 'الأربعاء', ar: 'الأربعاء', en: 'Wednesday', short: 'Wed' },
  { id: 'الخميس', ar: 'الخميس', en: 'Thursday', short: 'Thu' },
  { id: 'الجمعة', ar: 'الجمعة', en: 'Friday', short: 'Fri' },
  { id: 'all_airing', ar: 'كل المستمر', en: 'All airing', short: 'All' }
];

/** Date#getDay() order (0 = Sunday). */
const BY_WEEKDAY = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** The schedule id of today on this phone (local time). */
export function todayScheduleId(date = new Date()) {
  return BY_WEEKDAY[date.getDay()] || 'السبت';
}
