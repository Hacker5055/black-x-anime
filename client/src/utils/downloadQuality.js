/** FHD and up (1080p, 4K): the VIP download tier. */
export function isFhdQuality(q) {
  const s = String(q || '').toUpperCase();
  return s.includes('FHD') || s.includes('1080') || s.includes('4K') || s.includes('2160');
}

/**
 * Quality tier of a download link, from the quality text its server actually reported:
 * 'fhd' (1080p and up — the VIP download perk), 'hd' (720p), 'sd' (480p and below) or
 * 'unknown' when the server says nothing usable. Owner's decision of 2026-10-17: an unknown
 * quality is labelled «جودة غير معروفة» and is free — it is never guessed as FHD or HD.
 */
export function downloadQualityTier(raw) {
  const q = String(raw || '').trim().toUpperCase();
  if (!q) return 'unknown';
  if (isFhdQuality(q)) return 'fhd';
  if (q.includes('720') || /(^|[^FU])HD/.test(q)) return 'hd';
  if (/(^|[^A-Z])SD([^A-Z]|$)/.test(q) || /\b(480|360|240|144)P?\b/.test(q)) return 'sd';
  return 'unknown';
}

export function unknownQualityLabel(lang) {
  return lang === 'ar' ? 'جودة غير معروفة' : 'Unknown quality';
}
