/**
 * Real-Time Anime Subtitle Fetcher & English -> Arabic Translator
 * ---------------------------------------------------------------
 * Supports .SRT, .VTT, and .ASS/.SSA (SubStation Alpha anime fansubs).
 *
 * Capabilities:
 * 1. Cleans anime titles (stripping Arabic suffixes, punctuation, season tags) and queries OpenSubtitles REST API
 *    using strictly lowercase queries (avoiding 301 redirect header loss) with automatic short-keyword fallback.
 * 2. Parses .srt, .vtt, AND .ass/.ssa ("Dialogue:" lines) locally so timestamps are NEVER corrupted.
 * 3. Translates all English dialogue cues into natural Arabic in parallel batches (~1-2 seconds per episode).
 * 4. Exports WebVTT (.vtt), SubRip (.srt), and JSON cue arrays for HTML5 <track> and custom player overlays.
 */
import zlib from 'zlib';
import { streamGet, streamSet } from './db.js';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Convert timestamp "00:01:23,450" or "0:01:23.45" -> seconds (float)
 */
export function timeToSeconds(ts) {
  const clean = String(ts || '').trim().replace(',', '.');
  const parts = clean.split(':');
  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  }
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1]);
  }
  return 0;
}

/**
 * Convert seconds (float) or timestamp string to WebVTT format "HH:MM:SS.mmm"
 */
export function toVttTimestamp(ts) {
  if (typeof ts === 'number' && Number.isFinite(ts)) {
    const totalMs = Math.max(0, Math.round(ts * 1000));
    const h = Math.floor(totalMs / 3600000);
    const m = Math.floor((totalMs % 3600000) / 60000);
    const s = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }
  const sec = timeToSeconds(ts);
  return toVttTimestamp(sec);
}

/**
 * Convert timestamp to SRT format "HH:MM:SS,mmm"
 */
export function toSrtTimestamp(ts) {
  return toVttTimestamp(ts).replace('.', ',');
}

function isWatermarkLine(dialogue) {
  return /opensubtitles|osdb\.link|advertise your product|subtitles by|synced and corrected|addic7ed|subscene/i.test(
    dialogue
  );
}

/**
 * Parse .ass / .ssa (SubStation Alpha) anime subtitle files
 * Format: Dialogue: 0,0:00:16.35,0:00:18.14,Default,,0,0,0,,Captain, we should support them too.
 */
export function parseAssSubtitles(rawText) {
  const lines = rawText.split(/\r?\n/);
  const cues = [];

  for (const line of lines) {
    if (!line.startsWith('Dialogue:')) continue;
    // Split first 9 commas: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
    const parts = line.slice('Dialogue:'.length).trim().split(',');
    if (parts.length < 10) continue;

    const rawStart = parts[1].trim();
    const rawEnd = parts[2].trim();
    const styleName = (parts[3] || '').toLowerCase();
    // Skip sign/typesetting/karaoke tracks if marked
    if (/sign|op|ed|karaoke|title|logo|credit/i.test(styleName)) continue;

    const rawDialogue = parts.slice(9).join(',');
    const cleaned = rawDialogue
      .replace(/\{[^}]*\}/g, '') // strip ASS override tags like {\pos(120,200)\fad(100,100)}
      .replace(/\\[Nn]/g, ' ') // convert \N and \n linebreaks to space
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned || cleaned.length < 2) continue;
    if (isWatermarkLine(cleaned)) continue;

    const startSec = timeToSeconds(rawStart);
    const endSec = timeToSeconds(rawEnd);
    if (endSec <= startSec) continue;

    // Deduplicate identical consecutive or overlapping cues
    const prev = cues[cues.length - 1];
    if (prev && prev.textEn === cleaned && Math.abs(prev.startSec - startSec) < 2) {
      continue;
    }

    cues.push({
      index: cues.length + 1,
      start: toVttTimestamp(startSec),
      end: toVttTimestamp(endSec),
      startSec,
      endSec,
      textEn: cleaned,
      textAr: cleaned
    });
  }

  return cues.sort((a, b) => a.startSec - b.startSec).map((c, i) => ({ ...c, index: i + 1 }));
}

/**
 * Parse .srt, .vtt, or .ass/.ssa content into structured cues:
 * [{ index, start, end, startSec, endSec, textEn, textAr }]
 */
export function parseSubtitles(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];
  const text = rawText
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Check if it is an ASS / SSA file
  if (/\[Events\]/i.test(text) || /^Dialogue:\s*\d+,/m.test(text)) {
    const assCues = parseAssSubtitles(text);
    if (assCues.length > 0) return assCues;
  }

  const blocks = text.split(/\n\s*\n/);
  const cues = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) continue;
    if (/^(WEBVTT|NOTE|STYLE|REGION)/i.test(lines[0])) continue;

    // Find line with "-->"
    const timeIdx = lines.findIndex((l) => l.includes('-->'));
    if (timeIdx === -1) continue;

    const timeLine = lines[timeIdx];
    const m = timeLine.match(
      /(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3})/
    );
    if (!m) continue;

    const startSec = timeToSeconds(m[1]);
    const endSec = timeToSeconds(m[2]);
    const start = toVttTimestamp(startSec);
    const end = toVttTimestamp(endSec);

    const dialogueLines = lines
      .slice(timeIdx + 1)
      .map((l) =>
        l
          .replace(/\{[^}]*\}/g, '') // strip ASS tags like {\an8}
          .replace(/<[^>]+>/g, '') // strip HTML tags
          .trim()
      )
      .filter(Boolean);

    const dialogue = dialogueLines.join(' ').trim();
    if (!dialogue) continue;
    if (isWatermarkLine(dialogue)) continue;

    cues.push({
      index: cues.length + 1,
      start,
      end,
      startSec,
      endSec,
      textEn: dialogue,
      textAr: dialogue
    });
  }

  return cues;
}

/**
 * Translate an array of English strings into Arabic in parallel batches
 */
export async function translateLinesToArabic(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return [];

  const BATCH_SIZE = 45;
  const batches = [];
  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    batches.push(lines.slice(i, i + BATCH_SIZE));
  }

  const translateBatch = async (batch) => {
    const joined = batch.map((l) => l.replace(/\n+/g, ' ').trim()).join('\n');
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(joined)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) return batch;
      const data = await res.json();
      const fullTranslated = (data?.[0] || []).map((seg) => seg?.[0] || '').join('');
      const splitLines = fullTranslated.split('\n').map((s) => s.trim());
      return batch.map((orig, idx) => splitLines[idx] || orig);
    } catch {
      return batch;
    }
  };

  const results = await Promise.all(batches.map((b) => translateBatch(b)));
  return results.flat();
}

/**
 * Translate plain English text (e.g. anime synopsis) to Arabic
 */
export async function translateTextToArabic(text) {
  if (!text || typeof text !== 'string') return '';
  const clean = text.replace(/<[^>]+>/g, '').trim();
  if (!clean) return '';
  const cacheKey = `sub:txt:${clean.slice(0, 80)}`;
  const cached = streamGet(cacheKey);
  if (cached) return cached;

  const [translated] = await translateLinesToArabic([clean]);
  if (translated) streamSet(cacheKey, translated, CACHE_TTL_MS);
  return translated || clean;
}

/**
 * Build WebVTT (.vtt) string from cues
 */
export function buildVttFromCues(cues, langKey = 'textAr') {
  const lines = ['WEBVTT', 'Kind: captions', 'Language: ar', ''];
  for (const cue of cues) {
    lines.push(`${cue.index}`);
    lines.push(`${cue.start} --> ${cue.end}`);
    lines.push(cue[langKey] || cue.textAr || cue.textEn);
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * Build SubRip (.srt) string from cues
 */
export function buildSrtFromCues(cues, langKey = 'textAr') {
  const lines = [];
  for (const cue of cues) {
    lines.push(`${cue.index}`);
    lines.push(`${toSrtTimestamp(cue.start)} --> ${toSrtTimestamp(cue.end)}`);
    lines.push(cue[langKey] || cue.textAr || cue.textEn);
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * Download and decompress a subtitle file from OpenSubtitles (.gz) or direct (.vtt/.srt/.ass) URL
 */
async function downloadRawSubtitle(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'TemporaryUserAgent',
      'X-User-Agent': 'TemporaryUserAgent'
    },
    signal: AbortSignal.timeout(12000)
  });
  if (!res.ok) throw new Error(`Subtitle download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (url.endsWith('.gz') || (buf[0] === 0x1f && buf[1] === 0x8b)) {
    return zlib.gunzipSync(buf).toString('utf8');
  }
  return buf.toString('utf8');
}

/**
 * Normalize an anime title into clean lowercase English search queries for OpenSubtitles
 */
export function buildSubtitleSearchQueries(rawQuery) {
  const asciiOnly = String(rawQuery || '')
    .replace(/[\u0600-\u06FF]+/g, ' ') // strip Arabic text like (مترجم للعربية)
    .replace(/^(en|mal)-\d+-/i, ' ')
    .replace(/^(ok|blkom|a3rb|ani)-/i, ' ')
    .replace(/['’`":!?.()[\]/\\_-]+/g, ' ')
    .replace(/\b(2nd|3rd|4th|5th|season|part|cour|tv|movie|ova|ai|sub|dub)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (!asciiOnly) return [];
  const words = asciiOnly.split(' ').filter((w) => w.length >= 2);
  const queries = [asciiOnly];
  if (words.length > 2) {
    queries.push(words.slice(0, 2).join(' '));
  }
  if (words.length > 1 && words[0].length >= 4) {
    queries.push(words[0]);
  }
  return [...new Set(queries)];
}

async function searchOpenSubtitles(queryLower, ep, langId = 'eng') {
  // MUST be strictly lowercase so rest.opensubtitles.org does not issue a 301 redirect
  const q = String(queryLower || '').toLowerCase().trim();
  if (!q) return [];
  const url = `https://rest.opensubtitles.org/search/episode-${ep}/query-${encodeURIComponent(q)}/sublanguageid-${langId}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'TemporaryUserAgent',
        'X-User-Agent': 'TemporaryUserAgent'
      },
      signal: AbortSignal.timeout(9000)
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

/**
 * Search OpenSubtitles for an anime episode and return translated Arabic cues + VTT
 */
export async function getTranslatedEpisodeSubtitles({ query, episode = 1, directSubUrl = null }) {
  const searchQueries = buildSubtitleSearchQueries(query);
  const primaryQuery = searchQueries[0] || 'anime';
  const ep = Math.max(1, Number(episode) || 1);
  const cacheKey = `sub:ep:v2:${primaryQuery}:${ep}:${directSubUrl || 'os'}`;
  const cached = streamGet(cacheKey);
  if (cached) return cached;

  let rawSubText = null;
  let sourceLang = 'en';
  let fileName = `${primaryQuery} - E${ep}`;

  // 1) If a direct .vtt / .srt / .ass URL was provided, fetch it directly
  if (directSubUrl) {
    try {
      rawSubText = await downloadRawSubtitle(directSubUrl);
    } catch {
      rawSubText = null;
    }
  }

  // 2) Try each normalized query (full title -> first 2 words -> first main keyword)
  if (!rawSubText && searchQueries.length > 0) {
    for (const q of searchQueries) {
      const engList = await searchOpenSubtitles(q, ep, 'eng');
      // Prefer .srt / .vtt first, then .ass / .ssa
      const validList = engList.filter(
        (item) =>
          item?.SubDownloadLink &&
          ['srt', 'vtt', 'ass', 'ssa'].includes(String(item.SubFormat || '').toLowerCase())
      );
      validList.sort((a, b) => {
        const fa = ['srt', 'vtt'].includes(String(a.SubFormat).toLowerCase()) ? 0 : 1;
        const fb = ['srt', 'vtt'].includes(String(b.SubFormat).toLowerCase()) ? 0 : 1;
        return fa - fb;
      });

      for (const candidate of validList.slice(0, 3)) {
        try {
          const downloaded = await downloadRawSubtitle(candidate.SubDownloadLink);
          const parsedCheck = parseSubtitles(downloaded);
          if (parsedCheck.length >= 5) {
            rawSubText = downloaded;
            sourceLang = 'en';
            fileName = candidate.SubFileName || fileName;
            break;
          }
        } catch {
          // try next candidate
        }
      }
      if (rawSubText) break;
    }
  }

  if (!rawSubText) {
    return null;
  }

  const cues = parseSubtitles(rawSubText);
  if (!cues.length) return null;

  // Cap at 600 cues to keep translation fast (<2.5s)
  const limitedCues = cues.slice(0, 600);

  if (sourceLang === 'en') {
    const englishLines = limitedCues.map((c) => c.textEn);
    const arabicLines = await translateLinesToArabic(englishLines);
    limitedCues.forEach((c, idx) => {
      c.textAr = arabicLines[idx] || c.textEn;
    });
  }

  const vttAr = buildVttFromCues(limitedCues, 'textAr');
  const vttEn = buildVttFromCues(limitedCues, 'textEn');
  const srtAr = buildSrtFromCues(limitedCues, 'textAr');

  const payload = {
    query: primaryQuery,
    episode: ep,
    fileName,
    sourceLang,
    translatedTo: 'ar',
    cueCount: limitedCues.length,
    cues: limitedCues,
    vttAr,
    vttEn,
    srtAr
  };

  streamSet(cacheKey, payload, CACHE_TTL_MS);
  return payload;
}
