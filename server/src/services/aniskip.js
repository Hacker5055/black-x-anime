/**
 * Intro/outro timestamps from AniSkip (https://api.aniskip.com, crowd-sourced
 * OP/ED/recap intervals keyed by MyAnimeList id + episode). Only timestamps are
 * fetched — never video. When the caller has no MAL id, the title is matched
 * through Jikan (the public MyAnimeList API). Results are small JSON documents
 * cached by the CDN (shared/publicCacheRoutes.js) and in memory here.
 */

const ANISKIP_BASE = 'https://api.aniskip.com/v2/skip-times';
const JIKAN_SEARCH = 'https://api.jikan.moe/v4/anime';
const MAL_CACHE_TTL_MS = 7 * 24 * 3600 * 1000;
const SKIP_CACHE_TTL_MS = 6 * 3600 * 1000;
const MAX_CACHE = 2000;

let fetchImpl = (...args) => fetch(...args);
const malCache = new Map(); // normalized title -> { id, at }
const skipCache = new Map(); // `${mal}:${ep}:${lenBucket}` -> { value, at }

export function __setAniskipFetchForTests(fn) {
  fetchImpl = fn || ((...args) => fetch(...args));
  malCache.clear();
  skipCache.clear();
}

function remember(map, key, value) {
  if (map.size >= MAX_CACHE) map.delete(map.keys().next().value);
  map.set(key, { ...value, at: Date.now() });
}

export function normalizeTitle(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\(tv\)|season\s*\d+|\d+(st|nd|rd|th)\s*season|part\s*\d+|cour\s*\d+/g, ' ')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
    .trim();
}

function titleScore(wanted, candidate) {
  const a = normalizeTitle(wanted);
  const b = normalizeTitle(candidate);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ta = new Set(a.split(' '));
  const tb = new Set(b.split(' '));
  let common = 0;
  for (const t of ta) if (tb.has(t)) common += 1;
  return common / Math.max(ta.size, tb.size);
}

async function getJson(url) {
  const res = await fetchImpl(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000) });
  if (res.status === 404) return { notFound: true };
  if (!res.ok) throw new Error(`upstream_${res.status}`);
  return res.json();
}

/** MAL id for a title (best Jikan match with a reasonable score), or null. */
export async function resolveMalId(title) {
  const key = normalizeTitle(title);
  if (!key || key.length < 2) return null;
  const hit = malCache.get(key);
  if (hit && Date.now() - hit.at < MAL_CACHE_TTL_MS) return hit.id;
  const data = await getJson(`${JIKAN_SEARCH}?q=${encodeURIComponent(String(title).slice(0, 100))}&limit=6`);
  const list = Array.isArray(data?.data) ? data.data : [];
  let best = null;
  for (const item of list) {
    const names = [item.title, item.title_english, item.title_japanese, ...(Array.isArray(item.titles) ? item.titles.map((t) => t?.title) : [])];
    const score = Math.max(...names.map((n) => titleScore(title, n)));
    if (!best || score > best.score) best = { id: Number(item.mal_id) || null, score };
  }
  const id = best && best.score >= 0.6 ? best.id : null;
  remember(malCache, key, { id });
  return id;
}

/**
 * Skip segments for one episode: { found, malId, segments: [{ type, start, end }] }.
 * type is 'op' | 'ed' | 'recap'. `episodeLength` (seconds) lets AniSkip pick the
 * submission that matches this upload; 0 means unknown.
 */
export async function getSkipTimes({ malId, title, episode, episodeLength = 0 }) {
  const ep = Number.parseInt(episode, 10);
  if (!Number.isInteger(ep) || ep < 1 || ep > 5000) return { found: false, malId: null, segments: [] };
  let mal = Number.parseInt(malId, 10);
  if (!Number.isInteger(mal) || mal <= 0) mal = await resolveMalId(title);
  if (!mal) return { found: false, malId: null, segments: [] };
  const len = Math.max(0, Math.round(Number(episodeLength) || 0));
  const cacheKey = `${mal}:${ep}:${Math.round(len / 30)}`;
  const cached = skipCache.get(cacheKey);
  if (cached && Date.now() - cached.at < SKIP_CACHE_TTL_MS) return cached.value;
  const url = `${ANISKIP_BASE}/${mal}/${ep}?types=op&types=ed&types=recap&episodeLength=${len}`;
  const data = await getJson(url);
  const segments = [];
  if (!data?.notFound && Array.isArray(data?.results)) {
    for (const r of data.results) {
      const start = Number(r?.interval?.startTime);
      const end = Number(r?.interval?.endTime);
      const type = String(r?.skipType || '');
      if (!['op', 'ed', 'recap'].includes(type) || !Number.isFinite(start) || !Number.isFinite(end) || end - start < 5) continue;
      segments.push({ type, start: Math.max(0, Math.round(start * 10) / 10), end: Math.round(end * 10) / 10 });
    }
  }
  segments.sort((a, b) => a.start - b.start);
  const value = { found: segments.length > 0, malId: mal, segments };
  remember(skipCache, cacheKey, { value });
  return value;
}
