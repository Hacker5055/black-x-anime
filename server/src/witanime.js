/**
 * witanime.site scraper
 * ---------------------
 * Validated request recipe (their WAF is picky):
 *   - Session endpoints: any UA, cookies from GET /watch/{slug}/{ep}
 *   - Manifest/sources + stream-source/stream-gate: UA MUST be short ("Mozilla/5.0")
 *     and MUST NOT carry a Referer header (hotlink gate).
 *   - GET /watch/stream-gate/{token} answers with 302 → upstream embed URL.
 *   - mp4upload & friends embed pages contain a direct .mp4 file URL.
 */
import { apiGet, apiSet, streamGet, streamSet } from './db.js';

export const WITA_BASE = 'https://witanime.site';
// Cloudflare Worker relay (see worker/witanime-relay.js): datacenter hosts get
// a "Just a moment…" challenge from witanime's WAF; the relay fetches from
// Cloudflare's own network instead. Set WITA_RELAY=https://<name>.workers.dev
const RELAY = (process.env.WITA_RELAY || '').replace(/\/$/, '');
const viaRelay = (url) => (RELAY ? `${RELAY}/?url=${encodeURIComponent(url)}` : url);
// WAF recon: stream routes 404 on long browser UAs and pass short ones.
// A datacenter IP + long Chrome UA gets a hard 403, so EVERYTHING uses the
// short profile now, with an honest fallback on retry.
const UA_API = 'Mozilla/5.0';
const UA_HONEST = 'black-x/1.0';
const UA_PAGE = UA_API;
const LANG = 'ar-EG,ar;q=0.9,en;q=0.8';
const TIMEOUT = 20000;

/* ------------------------------ http helpers ------------------------------ */

/**
 * Tiny global throttle — witanime rate-limits aggressively (429 page).
 * Serialize upstream calls with a minimum gap and surface 429 as a typed error.
 */
let lastUpstreamAt = 0;
const MIN_GAP_MS = 450;

async function throttle() {
  const wait = lastUpstreamAt + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastUpstreamAt = Date.now();
}

class RateLimitedError extends Error {
  constructor() {
    super('witanime rate limited (429)');
    this.code = 'rate_limited';
  }
}

function parseSetCookies(res) {
  const out = {};
  const cookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const c of cookies) {
    const [pair] = c.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) out[pair.slice(0, idx)] = pair.slice(idx + 1);
  }
  return out;
}

/**
 * Session-bound cookie jar. Laravel rotates witanime-session mid-flow —
 * every response's Set-Cookie MUST be merged back or the gate 404s
 * ("session expired"). This was the hard-won lesson of the recon phase.
 */
class WitaSession {
  constructor(cookies = {}) {
    this.cookies = { ...cookies };
    this.csrf = '';
  }
  absorb(res) {
    Object.assign(this.cookies, parseSetCookies(res));
    return res;
  }
  cookieHeader() {
    return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

const cookieHeader = (jar) => (jar instanceof WitaSession ? jar.cookieHeader() : Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; '));

function guard(res) {
  if (res.status === 429) throw new RateLimitedError();
  return res;
}

function jarOf(cookies) {
  return cookies instanceof WitaSession ? cookies : new WitaSession(cookies || {});
}

async function get(url, { ua = UA_API, cookies = {}, headers = {}, redirect = 'follow', _retry = true } = {}) {
  await throttle();
  const jar = jarOf(cookies);
  const res = await fetch(viaRelay(url), {
    headers: {
      'User-Agent': ua,
      'Accept-Language': LANG,
      ...(Object.keys(jar.cookies).length ? { Cookie: jar.cookieHeader() } : {}),
      ...headers
    },
    redirect,
    signal: AbortSignal.timeout(TIMEOUT)
  });
  if (_retry && (res.status === 403 || res.status === 429) && ua !== UA_HONEST) {
    // WAF mood swing — one retry with the honest UA
    return get(url, { ua: UA_HONEST, cookies: jar, headers, redirect, _retry: false });
  }
  jar.absorb(guard(res));
  return res;
}

async function post(url, { ua = UA_API, cookies = {}, headers = {}, body, json = false, _retry = true } = {}) {
  await throttle();
  const jar = jarOf(cookies);
  const res = await fetch(viaRelay(url), {
    method: 'POST',
    headers: {
      'User-Agent': ua,
      'Accept-Language': LANG,
      ...(Object.keys(jar.cookies).length ? { Cookie: jar.cookieHeader() } : {}),
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    body: body ? (json ? JSON.stringify(body) : body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT)
  });
  if (_retry && (res.status === 403 || res.status === 429) && ua !== UA_HONEST) {
    return post(url, { ua: UA_HONEST, cookies: jar, headers, body, json, _retry: false });
  }
  jar.absorb(guard(res));
  return res;
}

/** Fetch a page + extract session cookies + csrf token. */
async function session(pagePath) {
  const url = `${WITA_BASE}${pagePath}`;
  const jar = new WitaSession();
  const res = await get(url, { ua: UA_PAGE, cookies: jar, headers: { Accept: 'text/html' } });
  const html = await res.text();
  const csrf = html.match(/csrf-token" content="([^"]+)"/)?.[1] || '';
  return { html, cookies: jar, csrf, status: res.status };
}

const stripTags = (s) => (s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();

/* ------------------------------- discovery ------------------------------- */

/** Homepage: latest episode cards. */
export async function fetchLatest() {
  const cached = apiGet('wita:latest');
  if (cached) return cached;

  const { html } = await session('/');
  const items = [];
  const seen = new Set();
  // <a ... href="https://witanime.site/watch/{slug}/{ep}"> ... <img src="poster" alt="Title">
  const re = /<a[^>]+href="https:\/\/witanime\.site\/watch\/([^"\/]+)\/(\d+)"[^>]*>[\s\S]{0,1600}?<img[^>]+src="(https:\/\/images\.witanime\.site\/[^"]+)"[^>]+alt="([^"]*)"/g;
  for (const m of html.matchAll(re)) {
    const [, slug, ep, poster, alt] = m;
    const key = `${slug}/${ep}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      slug,
      episode: Number(ep),
      titleEn: decodeEntities(alt) || slug,
      titleAr: null,
      poster,
      url: `/watch/${slug}/${ep}`
    });
    if (items.length >= 24) break;
  }
  apiSet('wita:latest', items, 10 * 60 * 1000);
  return items;
}

function decodeEntities(s) {
  return (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** Search witanime for shows. */
export async function searchShows(q) {
  const key = `wita:search:${q.toLowerCase().trim()}`;
  const cached = apiGet(key);
  if (cached) return cached;

  let items = await searchOnce(q);
  if (!items.length && q.trim().split(/\s+/).length > 3) {
    // AniList titles are long ("STEEL BALL RUN JoJo's … 2nd - 3rd STAGE") —
    // witanime search matches better on short keyword sets
    const short = q.replace(/[''`]/g, '').split(/[\s\-(]+/).filter((w) => w.length > 2).slice(0, 3).join(' ');
    if (short && short !== q) items = await searchOnce(short);
  }
  apiSet(key, items, 30 * 60 * 1000);
  return items;
}

async function searchOnce(q) {
  const { html } = await session(`/search?q=${encodeURIComponent(q)}`);
  const items = [];
  const seen = new Set();
  const re = /<a[^>]+href="https:\/\/witanime\.site\/(anime|movie)\/([^"\/]+)"[^>]*>[\s\S]{0,1800}?<img[^>]+src="(https:\/\/images\.witanime\.site\/[^"]+)"[^>]+alt="([^"]*)"/g;
  for (const m of html.matchAll(re)) {
    const [, kind, slug, poster, alt] = m;
    if (seen.has(slug)) continue;
    seen.add(slug);
    items.push({
      slug,
      kind,
      titleEn: decodeEntities(alt) || slug,
      titleAr: null,
      poster,
      url: `/${kind}/${slug}`
    });
    if (items.length >= 24) break;
  }
  return items;
}

/** Anime page: metadata + full episode list. */
export async function fetchShow(slug) {
  const key = `wita:show:${slug}`;
  const cached = apiGet(key);
  if (cached) return cached;

  const { html, status } = await session(`/anime/${slug}`);
  if (status === 404 || !html.includes(`/watch/${slug}/`)) return null;

  const poster = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)?.[1]
    || html.match(/src="(https:\/\/images\.witanime\.site\/posters\/[^"]+)"/)?.[1] || null;
  const banner = html.match(/src="(https:\/\/images\.witanime\.site\/banners\/[^"]+)"/)?.[1] || poster;
  const titleEn = decodeEntities(html.match(/<h1[^>]*>[\s\S]*?<span dir="ltr">([^<]+)<\/span>/)?.[1] || slug);
  const desc = decodeEntities(html.match(/name="description" content="([^"]+)"/)?.[1] || '');

  // full episode list: href="/watch/{slug}/{n}" (server renders all episodes)
  const episodes = new Map();
  for (const m of html.matchAll(new RegExp(`href="(?:https://witanime\\.site)?/watch/${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(\\d+)"`, 'g'))) {
    const n = Number(m[1]);
    if (!episodes.has(n)) {
      episodes.set(n, { episode: n, url: `/watch/${slug}/${n}` });
    }
  }

  const show = {
    slug,
    kind: 'anime',
    titleEn,
    titleAr: null,
    description: desc,
    poster,
    banner,
    episodeCount: episodes.size,
    episodes: [...episodes.values()].sort((a, b) => a.episode - b.episode)
  };
  apiSet(key, show, 30 * 60 * 1000);
  return show;
}

/* ------------------------------ streaming ------------------------------ */

/**
 * Resolve all streaming sources for an episode.
 * Returns [{ id, server, quality, version, lang, embedUrl, directUrl|null }]
 *
 * Resilience: stale-while-revalidate. The cache entry stores { sources, fetchedAt }
 * with a long TTL; entries older than FRESH_MS trigger a background refresh but
 * still serve immediately. On upstream 429 we always fall back to stale data.
 */
/* ------------------------- streaming resolution -------------------------
 * Two hard-won facts from the recon phase:
 *  1. witanime rate-limits aggressively (429 page) — keep bursts tiny.
 *  2. manifest tokens are SESSION-BOUND: stream-source/gate only accept a
 *     token inside the session that created the manifest. Always resolve with
 *     the stored session; if it's stale, re-pull the manifest and retry once.
 * ---------------------------------------------------------------------- */
const RESOLVE_TTL_MS = 12 * 60 * 60 * 1000;
const DIRECT_HOST_LABELS = ['mp4upload', 'hgcloud', 'videa', 'videas', '4shared', 'yonaplay'];

function manifestEntryId(slug, episode, e, idx) {
  return `${slug}-${episode}-${(e.label || e.server || 'srv')}-${e.quality || ''}-${idx}`;
}

function orderEntries(entries) {
  return [...entries].sort((a, b) => {
    const pa = DIRECT_HOST_LABELS.indexOf(a.server) === -1 ? 99 : DIRECT_HOST_LABELS.indexOf(a.server);
    const pb = DIRECT_HOST_LABELS.indexOf(b.server) === -1 ? 99 : DIRECT_HOST_LABELS.indexOf(b.server);
    return pa - pb;
  });
}

/**
 * Episode payload (cached server-side):
 *   { entries, resolved: { [id]: {embedUrl, directUrl} }, _session: {cookies, csrf} }
 */
export async function fetchEpisode(slug, episode, { fresh = false } = {}) {
  const key = `wita:episode:${slug}:${episode}`;
  const entry = fresh ? null : streamGet(key);
  if (entry && Array.isArray(entry.entries) && entry.entries.length) return entry;

  // 1) session via the watch page
  const sess = await session(`/watch/${slug}/${episode}`);
  if (sess.status === 404) return null;

  // 2) manifest — short UA, NO Referer
  const manRes = await post(`${WITA_BASE}/watch/${slug}/${episode}/sources`, {
    headers: { 'X-CSRF-TOKEN': sess.csrf, Accept: '*/*' },
    cookies: sess.cookies
  });
  if (!manRes.ok) {
    throw Object.assign(new Error(`sources manifest failed (${manRes.status})`), { code: 'upstream' });
  }
  const manifest = await manRes.json();

  const entries = [];
  let idx = 0;
  for (const [quality, list] of Object.entries(manifest.players || {})) {
    for (const item of list) {
      idx += 1;
      entries.push({
        id: manifestEntryId(slug, episode, item, idx),
        token: item.token,
        server: item.label || `server-${idx}`,
        quality: quality || null,
        version: item.version || 'sub',
        lang: item.lang || 'jp'
      });
    }
  }

  const downloads = [];
  let dIdx = 0;
  for (const [quality, list] of Object.entries(manifest.downloads || {})) {
    for (const item of list) {
      dIdx += 1;
      downloads.push({
        id: `dl-${slug}-${episode}-${(item.label || 'srv')}-${quality || ''}-${dIdx}`,
        token: item.token,
        server: item.label || `download-${dIdx}`,
        quality: quality || null,
        version: item.version || 'sub',
        lang: item.lang || 'jp'
      });
    }
  }

  if (!entries.length && !downloads.length) {
    throw Object.assign(new Error('empty manifest'), { code: 'upstream' });
  }

  const payload = {
    entries: orderEntries(entries),
    downloads,
    resolved: {},
    resolvedDownloads: {},
    _session: {
      cookies: { ...sess.cookies.cookies },
      csrf: sess.csrf,
      at: Date.now()
    }
  };
  streamSet(key, payload, RESOLVE_TTL_MS);
  return payload;
}

/**
 * Resolve one download manifest entry by id.
 */
export async function resolveDownloadEntry(slug, episode, entryId) {
  let payload = await fetchEpisode(slug, episode);
  if (!payload) return null;

  if (payload.resolvedDownloads?.[entryId]) return payload.resolvedDownloads[entryId];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const entry = (payload.downloads || []).find((e) => e.id === entryId);
    if (!entry) return null;

    try {
      const source = await resolveDownloadTokenWithSession(entry.token, payload._session);
      payload.resolvedDownloads = { ...(payload.resolvedDownloads || {}), [entryId]: source };
      streamSet(`wita:episode:${slug}:${episode}`, payload, RESOLVE_TTL_MS);
      return source;
    } catch (err) {
      if (err.code === 'rate_limited') throw err;
      if (attempt === 0) {
        payload = await fetchEpisode(slug, episode, { fresh: true });
        if (!payload) return null;
        continue;
      }
      throw err;
    }
  }
  return null;
}

async function resolveDownloadTokenWithSession(token, sess) {
  const key = `wita:dl_token:${token}`;
  const cached = streamGet(key);
  if (cached) return cached;

  const jar = new WitaSession(sess?.cookies || {});
  const csrf = sess?.csrf || '';

  await post(`${WITA_BASE}/watch/download-source/${token}`, {
    headers: { 'X-CSRF-TOKEN': csrf, Accept: 'application/json' },
    cookies: jar
  });
  const gate = await get(`${WITA_BASE}/watch/download-gate/${token}`, {
    cookies: jar,
    redirect: 'manual'
  });
  const downloadUrl = gate.headers.get('location');
  if (!downloadUrl) {
    throw Object.assign(new Error('download gate did not redirect (stale session?)'), { code: 'stale_session' });
  }

  let directUrl = null;
  try {
    directUrl = await resolveDirectUrl(downloadUrl);
  } catch { /* keep link */ }

  const out = { downloadUrl, directUrl };
  streamSet(key, out, RESOLVE_TTL_MS);
  return out;
}

/**
 * Resolve one manifest entry by id (keeps tokens server-side).
 * Uses the manifest's own session; retries once with a fresh manifest.
 */
export async function resolveEntry(slug, episode, entryId) {
  let payload = await fetchEpisode(slug, episode);
  if (!payload) return null;

  if (payload.resolved?.[entryId]) return payload.resolved[entryId];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const entry = payload.entries.find((e) => e.id === entryId);
    if (!entry) return null;

    try {
      const source = await resolveTokenWithSession(entry.token, payload._session);
      payload.resolved = { ...(payload.resolved || {}), [entryId]: source };
      streamSet(`wita:episode:${slug}:${episode}`, payload, RESOLVE_TTL_MS);
      return source;
    } catch (err) {
      if (err.code === 'rate_limited') throw err;
      // stale session → re-pull manifest and retry once
      if (attempt === 0) {
        payload = await fetchEpisode(slug, episode, { fresh: true });
        if (!payload) return null;
        continue;
      }
      throw err;
    }
  }
  return null;
}

async function resolveTokenWithSession(token, sess) {
  const key = `wita:token:${token}`;
  const cached = streamGet(key);
  if (cached) return cached;

  const jar = new WitaSession(sess?.cookies || {});
  const csrf = sess?.csrf || '';

  await post(`${WITA_BASE}/watch/stream-source/${token}`, {
    headers: { 'X-CSRF-TOKEN': csrf, Accept: 'application/json' },
    cookies: jar
  });
  const gate = await get(`${WITA_BASE}/watch/stream-gate/${token}`, {
    cookies: jar,
    redirect: 'manual'
  });
  const embedUrl = gate.headers.get('location');
  if (!embedUrl) {
    throw Object.assign(new Error('gate did not redirect (stale session?)'), { code: 'stale_session' });
  }

  let directUrl = null;
  try {
    directUrl = await resolveDirectUrl(embedUrl);
  } catch { /* keep embed-only */ }

  const out = { embedUrl, directUrl };
  streamSet(key, out, RESOLVE_TTL_MS);
  return out;
}

async function resolveDirectUrl(url) {
  if (!url || typeof url !== 'string') return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();

  // Mega, Google Drive, Workupload, Gofile, 4shared are web lockers / cloud drives — not raw stream direct files
  if (
    host.endsWith('mega.nz') ||
    host.endsWith('mega.co.nz') ||
    host.endsWith('drive.google.com') ||
    host.endsWith('workupload.com') ||
    host.endsWith('gofile.io') ||
    host.endsWith('4shared.com') ||
    host.endsWith('wtsrv.xyz')
  ) {
    return null;
  }

  const cacheKey = `wita:direct:${url}`;
  const cached = streamGet(cacheKey);
  if (cached !== null && cached !== undefined) return cached;

  let direct = null;

  try {
    // 1. mp4upload (embed or direct page)
    if (host.includes('mp4upload.com')) {
      let embedTarget = url;
      const idMatch = url.match(/mp4upload\.com\/(?:embed-)?([a-zA-Z0-9]+)(?:\.html)?/i);
      if (idMatch && idMatch[1]) {
        embedTarget = `https://www.mp4upload.com/embed-${idMatch[1]}.html`;
      }

      const res = await fetch(embedTarget, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
          Accept: 'text/html'
        },
        signal: AbortSignal.timeout(12000)
      });
      if (res.ok) {
        const html = await res.text();
        const m = html.match(/src\s*:\s*["'](https?:\/\/[^"']+\/video\.mp4)[\"']/i) ||
                  html.match(/["'](https?:\/\/[a-zA-Z0-9.:-]+\/d\/[a-zA-Z0-9_\/=-]+\/video\.mp4)["']/i);
        if (m && m[1]) {
          direct = m[1];
        }
      }
    }
    // 2. MediaFire (extract direct download CDN button link)
    else if (host.includes('mediafire.com')) {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
          Accept: 'text/html'
        },
        signal: AbortSignal.timeout(12000)
      });
      if (res.ok) {
        const html = await res.text();
        const m = html.match(/href=["'](https?:\/\/[a-zA-Z0-9.-]+\.mediafire\.com\/[^"']+)["'][^>]*id=["']downloadButton["']/i) ||
                  html.match(/id=["']downloadButton["'][^>]*href=["']([^"']+)["']/i) ||
                  html.match(/aria-label=["']Download file["'][^>]*href=["']([^"']+)["']/i);
        if (m && m[1] && m[1].startsWith('http') && !m[1].includes('/file/')) {
          direct = m[1];
        }
      }
    }
    // 3. Generic video hosts (e.g. yourupload, videa, etc.)
    else {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html'
        },
        signal: AbortSignal.timeout(12000)
      });
      if (res.ok) {
        const html = await res.text();
        // Look specifically for actual video paths with .mp4 or .mkv in the file name
        const patterns = [
          /(?:file|src)\s*:\s*["'](https?:\/\/[^"'\s]+\/(?:[^"'\s\/]+\.)+(?:mp4|mkv)(?:\?[^"'\s]*)?)["']/i,
          /<source[^>]+src=["'](https?:\/\/[^"'\s]+\/(?:[^"'\s\/]+\.)+(?:mp4|mkv)(?:\?[^"'\s]*)?)["']/i
        ];
        for (const re of patterns) {
          const m = html.match(re);
          if (m && m[1] && !/video\.min\.js|\.css|\.png|\.jpg|\.m3u8|favicon|player\//i.test(m[1])) {
            direct = m[1].replace(/\\\//g, '/');
            break;
          }
        }
      }
    }
  } catch {
    // Keep direct null if extraction times out or fails
  }

  // Safety filter: never allow non-video assets to be returned as direct video URLs
  if (direct) {
    try {
      const u = new URL(direct);
      const path = u.pathname.toLowerCase();
      if (
        path.endsWith('.png') ||
        path.endsWith('.jpg') ||
        path.endsWith('.jpeg') ||
        path.endsWith('.gif') ||
        path.endsWith('.ico') ||
        path.endsWith('.m3u8') ||
        path.endsWith('.js') ||
        path.endsWith('.css') ||
        path.includes('favicon')
      ) {
        direct = null;
      }
    } catch {
      direct = null;
    }
  }

  streamSet(cacheKey, direct, 6 * 60 * 60 * 1000);
  return direct;
}

/** Health/status helper for the UI. */
export async function scrapeHealth() {
  try {
    const res = await get(`${WITA_BASE}/`, { headers: { Accept: 'text/html' } });
    const body = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      source: 'witanime.site',
      challenge: /Just a moment|challenge-platform|Attention Required/i.test(body)
    };
  } catch (err) {
    return { ok: false, status: 0, source: 'witanime.site', error: err.message };
  }
}

/**
 * Deep diagnostics — run from the deployed host to see exactly how its IP/UA
 * is treated by the witanime WAF (statuses, cf-ray, challenge pages, manifest).
 */
export async function scrapeDiagnostics() {
  const out = { source: 'witanime.site', relay: RELAY || null, at: new Date().toISOString(), probes: [] };
  const uas = [['short', UA_API], ['honest', UA_HONEST], ['chrome-long', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36']];
  for (const [name, ua] of uas) {
    try {
      const res = await fetch(viaRelay(`${WITA_BASE}/`), {
        headers: { 'User-Agent': ua, Accept: 'text/html', 'Accept-Language': LANG },
        redirect: 'manual',
        signal: AbortSignal.timeout(15000)
      });
      const body = (await res.text()).slice(0, 4000);
      out.probes.push({
        name,
        status: res.status,
        cfRay: res.headers.get('cf-ray'),
        server: res.headers.get('server'),
        challenge: /Just a moment|challenge-platform|Attention Required/i.test(body),
        blocked: /Access denied|Sorry, you have been blocked/i.test(body),
        title: body.match(/<title>([^<]*)/)?.[1]?.slice(0, 60) || null
      });
    } catch (err) {
      out.probes.push({ name, error: err.message });
    }
  }
  // full streaming chain probe (the money test)
  try {
    const sess = await session('/watch/black-clover-2nd-season/1');
    out.pageStatus = sess.status;
    out.csrf = Boolean(sess.csrf);
    const man = await post(`${WITA_BASE}/watch/black-clover-2nd-season/1/sources`, {
      headers: { 'X-CSRF-TOKEN': sess.csrf, Accept: '*/*' },
      cookies: sess.cookies
    });
    const manBody = await man.text();
    out.manifestStatus = man.status;
    out.manifestOk = manBody.startsWith('{');
    out.manifestSnippet = manBody.slice(0, 100);
  } catch (err) {
    out.manifestError = err.message;
  }
  return out;
}
