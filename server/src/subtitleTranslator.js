/**
 * Real-Time Anime Subtitle Fetcher & English -> Arabic Translator
 * ---------------------------------------------------------------
 * Inspired by open-source GitHub subtitle translators (rockbenben/subtitle-translator,
 * machinewrapped/llm-subtrans, manucabral/fast-subtitles-translator).
 *
 * Capabilities:
 * 1. Fetches official English (or Arabic) .srt/.vtt subtitles for any anime episode via OpenSubtitles REST API
 *    or any direct .vtt / .srt URL.
 * 2. Parses timecodes locally so timestamps are NEVER corrupted during translation.
 * 3. Translates all English dialogue cues into natural Arabic in parallel batches (~1-2 seconds per episode).
 * 4. Exports WebVTT (.vtt), SubRip (.srt), and JSON cue arrays for HTML5 <track> and custom player overlays.
 */
import zlib from 'zlib';
import { streamGet, streamSet } from './db.js';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Convert timestamp "00:01:23,450" or "00:01:23.450" -> seconds (float)
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
 * Convert timestamp to WebVTT format "HH:MM:SS.mmm"
 */
export function toVttTimestamp(ts) {
  const clean = String(ts || '').trim().replace(',', '.');
  const parts = clean.split(':');
  if (parts.length === 2) return `00:${parts[0].padStart(2, '0')}:${parts[1]}`;
  return clean;
}

/**
 * Convert timestamp to SRT format "HH:MM:SS,mmm"
 */
export function toSrtTimestamp(ts) {
  return toVttTimestamp(ts).replace('.', ',');
}

/**
 * Parse .srt or .vtt content into structured cues:
 * [{ index, start, end, startSec, endSec, text }]
 */
export function parseSubtitles(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];
  const text = rawText
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

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
    const m = timeLine.match(/(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3})/);
    if (!m) continue;

    const start = toVttTimestamp(m[1]);
    const end = toVttTimestamp(m[2]);
    const startSec = timeToSeconds(start);
    const endSec = timeToSeconds(end);

    const dialogueLines = lines
      .slice(timeIdx + 1)
      .map((l) =>
        l
          .replace(/\{\\[^}]*\}/g, '') // strip ASS tags like {\an8}
          .replace(/<[^>]+>/g, '') // strip HTML tags
          .trim()
      )
      .filter(Boolean);

    const dialogue = dialogueLines.join(' ').trim();
    if (!dialogue) continue;

    // Skip watermark / ad cues from OpenSubtitles
    if (/opensubtitles|osdb\.link|advertise your product|subtitles by|synced and corrected/i.test(dialogue)) {
      continue;
    }

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
    // Join with newline; Google GTX preserves newlines accurately
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
 * Download and decompress a subtitle file from OpenSubtitles (.gz) or direct (.vtt/.srt) URL
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
 * Search OpenSubtitles for an anime episode and return translated Arabic cues + VTT
 */
export async function getTranslatedEpisodeSubtitles({ query, episode = 1, directSubUrl = null }) {
  const cleanQuery = String(query || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b(2nd|3rd|4th|season|part|tv)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const ep = Math.max(1, Number(episode) || 1);
  const cacheKey = `sub:ep:${cleanQuery.toLowerCase()}:${ep}:${directSubUrl || 'os'}`;
  const cached = streamGet(cacheKey);
  if (cached) return cached;

  let rawSubText = null;
  let sourceLang = 'en';
  let fileName = `${cleanQuery} - E${ep}`;

  // 1) If a direct .vtt / .srt URL was provided, fetch it directly
  if (directSubUrl) {
    try {
      rawSubText = await downloadRawSubtitle(directSubUrl);
    } catch {
      rawSubText = null;
    }
  }

  // 2) Otherwise search OpenSubtitles (first check if native Arabic exists, else English -> translate to Arabic)
  if (!rawSubText && cleanQuery) {
    try {
      const araSearchUrl = `https://rest.opensubtitles.org/search/episode-${ep}/query-${encodeURIComponent(cleanQuery)}/sublanguageid-ara`;
      const engSearchUrl = `https://rest.opensubtitles.org/search/episode-${ep}/query-${encodeURIComponent(cleanQuery)}/sublanguageid-eng`;

      const [araRes, engRes] = await Promise.all([
        fetch(araSearchUrl, {
          headers: { 'User-Agent': 'TemporaryUserAgent', 'X-User-Agent': 'TemporaryUserAgent' },
          signal: AbortSignal.timeout(9000)
        }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch(engSearchUrl, {
          headers: { 'User-Agent': 'TemporaryUserAgent', 'X-User-Agent': 'TemporaryUserAgent' },
          signal: AbortSignal.timeout(9000)
        }).then((r) => (r.ok ? r.json() : [])).catch(() => [])
      ]);

      // Prefer English SRT/VTT to translate cleanly (or native Arabic if English isn't found)
      const engCandidate = (Array.isArray(engRes) ? engRes : []).find(
        (item) => item?.SubDownloadLink && (item.SubFormat === 'srt' || item.SubFormat === 'vtt')
      );
      const araCandidate = (Array.isArray(araRes) ? araRes : []).find(
        (item) => item?.SubDownloadLink && (item.SubFormat === 'srt' || item.SubFormat === 'vtt')
      );

      if (engCandidate?.SubDownloadLink) {
        rawSubText = await downloadRawSubtitle(engCandidate.SubDownloadLink);
        sourceLang = 'en';
        fileName = engCandidate.SubFileName || fileName;
      } else if (araCandidate?.SubDownloadLink) {
        rawSubText = await downloadRawSubtitle(araCandidate.SubDownloadLink);
        sourceLang = 'ar';
        fileName = araCandidate.SubFileName || fileName;
      }
    } catch {
      rawSubText = null;
    }
  }

  if (!rawSubText) {
    return null;
  }

  const cues = parseSubtitles(rawSubText);
  if (!cues.length) return null;

  if (sourceLang === 'en') {
    const englishLines = cues.map((c) => c.textEn);
    const arabicLines = await translateLinesToArabic(englishLines);
    cues.forEach((c, idx) => {
      c.textAr = arabicLines[idx] || c.textEn;
    });
  }

  const vttAr = buildVttFromCues(cues, 'textAr');
  const vttEn = buildVttFromCues(cues, 'textEn');
  const srtAr = buildSrtFromCues(cues, 'textAr');

  const payload = {
    query: cleanQuery,
    episode: ep,
    fileName,
    sourceLang,
    translatedTo: 'ar',
    cueCount: cues.length,
    cues,
    vttAr,
    vttEn,
    srtAr
  };

  streamSet(cacheKey, payload, CACHE_TTL_MS);
  return payload;
}
