/**
 * BLACK X — serverless streaming API for static hosting (GitHub Pages).
 * ------------------------------------------------------------------
 * The full /api/stream/* surface of the Node server, ported to Cloudflare
 * Workers: the witanime.site scraper runs HERE (Cloudflare's own network —
 * passes the site's bot challenge, unlike datacenter hosts), plus AniList
 * discovery, an image proxy and a video proxy with Range support.
 *
 * Deploy: dash.cloudflare.com → Workers → Create → paste this file → Deploy.
 * Then set the site's config.js: streamBase = "https://<name>.<subdomain>.workers.dev"
 *
 * Endpoints (same shapes as the Node API):
 *   GET  /api/stream/health | diagnostics | latest | search?q= | show/:slug
 *   GET  /api/stream/episode/:slug/:ep | proxy?url=
 *   POST /api/stream/resolve  {slug, episode, entryId}
 *   GET  /api/anime/trending  |  /api/proxy-image?url=
 */

/* ----------------------------- tiny TTL cache ----------------------------- */
const mem = new Map();
function cacheGet(key) {
  const hit = mem.get(key);
  if (!hit) return null;
  if (hit.exp && Date.now() > hit.exp) { mem.delete(key); return null; }
  return hit.val;
}
function cacheSet(key, val, ttlMs) {
  if (mem.size > 400) mem.clear(); // crude cap — isolates are ephemeral
  mem.set(key, { val, exp: Date.now() + (ttlMs || 600000) });
}
const apiGet = cacheGet;
const apiSet = cacheSet;
const streamGet = cacheGet;
const streamSet = cacheSet;

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

export const WITA_BASE = 'https://witanime.site';

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
  const res = await fetch(url, {
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
  const res = await fetch(url, {
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
  if (!entries.length) {
    throw Object.assign(new Error('empty manifest'), { code: 'upstream' });
  }

  const payload = {
    entries: orderEntries(entries),
    resolved: {},
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

async function resolveDirectUrl(embedUrl) {
  const host = (() => { try { return new URL(embedUrl).hostname; } catch { return ''; } })();

  // mega.nz embeds are encrypted — cannot resolve a direct file URL
  if (host.endsWith('mega.nz') || host.endsWith('mega.co.nz')) return null;

  const cacheKey = `wita:direct:${embedUrl}`;
  const cached = streamGet(cacheKey);
  if (cached !== null && cached !== undefined) return cached;

  const res = await get(embedUrl, {
    headers: { Accept: 'text/html' }
  });
  const html = await res.text();

  let direct = null;
  // mp4upload / generic: file:"…mp4" | src:"…mp4" | <source src="…mp4">
  const patterns = [
    /(?:file|src)\s*:\s*["']([^"']+\.mp4[^"']*)/i,
    /<source[^>]+src="([^"]+\.mp4[^"]*)"/i,
    /"(https?:\/\/[^"]+\.mp4[^"]*)"/i,
    /"(https?:\/\/[^"]+\.m3u8[^"]*)"/i
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && !/video\.min\.js|\.css|player\//i.test(m[1])) {
      direct = m[1].replace(/\\\//g, '/');
      break;
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
  const out = { source: 'witanime.site', relay: 'worker', at: new Date().toISOString(), probes: [] };
  const uas = [['short', UA_API], ['honest', UA_HONEST], ['chrome-long', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36']];
  for (const [name, ua] of uas) {
    try {
      const res = await fetch(`${WITA_BASE}/`, {
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


/* ------------------------------- router ------------------------------- */

function corsHeaders(request, extra = {}) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-expose-headers': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    ...extra
  };
}

function json(request, data, status = 200, extra) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(request, { 'content-type': 'application/json', ...(extra || {}) })
  });
}

const MEDIA_FRAGMENT = `
  id description(asHtml: false) format status episodes season seasonYear
  averageScore popularity title { romaji english native }
  coverImage { extraLarge large color } bannerImage genres
  nextAiringEpisode { episode airingAt }
`;

function toPublic(m) {
  return {
    id: m.id,
    titleRomaji: m.title?.romaji || m.title?.english || 'Untitled',
    titleEnglish: m.title?.english || m.title?.romaji || 'Untitled',
    titleArabic: null,
    description: (m.description || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim(),
    coverUrl: m.coverImage?.extraLarge || m.coverImage?.large || null,
    bannerUrl: m.bannerImage || null,
    color: m.coverImage?.color || '#8b5cf6',
    genres: m.genres || [],
    episodes: m.episodes ?? null,
    status: m.status ?? null,
    format: m.format ?? null,
    season: m.season ?? null,
    seasonYear: m.seasonYear ?? null,
    score: m.averageScore ?? null,
    popularity: m.popularity ?? null,
    nextEpisode: m.nextAiringEpisode?.episode ?? null,
    nextAiringAt: m.nextAiringEpisode?.airingAt ?? null
  };
}

async function anilistTrending() {
  const cached = apiGet('anilist:trending');
  if (cached) return cached;
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      query: `query { Page(page: 1, perPage: 12) { media(type: ANIME, sort: TRENDING_DESC, isAdult: false) { ${MEDIA_FRAGMENT} } } }`
    })
  });
  const json = await res.json();
  const items = (json.data?.Page?.media || []).map(toPublic);
  apiSet('anilist:trending', items, 15 * 60 * 1000);
  return items;
}

async function anilistTitle(id) {
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      query: `query ($id: Int) { Media(id: $id, type: ANIME) { title { romaji english } } }`,
      variables: { id: Number(id) }
    })
  });
  const json = await res.json();
  const t = json.data?.Media?.title;
  return t?.english || t?.romaji || null;
}

/** al-<id>/find-<id> slugs (AniList-driven UI) -> witanime slug. */
async function resolveWitaSlug(slug) {
  const m = /^(?:al|find)-(\d+)$/.exec(slug);
  if (!m) return slug;
  const key = `slug:al:${m[1]}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const title = await anilistTitle(m[1]);
  if (!title) return slug;
  let wita = slug;
  try {
    const items = await searchShows(title);
    if (items[0]?.slug) wita = items[0].slug;
  } catch { /* fall through */ }
  cacheSet(key, wita, 12 * 60 * 60 * 1000);
  return wita;
}

const ALLOWED_HOSTS = [
  'mp4upload.com', '4shared.com', 'videa.hu', 'videas.hu',
  'hgcloud.me', 'yonaplay.com', 'mega.nz', 'mega.co.nz'
];
const hostAllowed = (hostname) => {
  const h = String(hostname || '').toLowerCase();
  return ALLOWED_HOSTS.some((a) => h === a || h.endsWith('.' + a) || h.endsWith(a));
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(request) });
    }

    try {
      /* ------------------------------- health ------------------------------- */
      if (path === '/api/stream/health') {
        return json(request, await scrapeHealth());
      }
      if (path === '/api/stream/diagnostics') {
        return json(request, await scrapeDiagnostics());
      }

      /* ------------------------------ discovery ----------------------------- */
      if (path === '/api/anime/trending') {
        return json(request, { anime: await anilistTrending() });
      }
      if (path === '/api/proxy-image') {
        const target = String(url.searchParams.get('url') || '');
        if (!/^https:\/\//.test(target)) return json(request, { error: 'bad_url' }, 400);
        const img = await fetch(target, {
          headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*' },
          signal: AbortSignal.timeout(20000)
        });
        const headers = corsHeaders(request, { 'content-type': img.headers.get('content-type') || 'image/jpeg' });
        const cc = img.headers.get('cache-control');
        if (cc) headers['cache-control'] = cc;
        return new Response(img.ok ? img.body : null, { status: img.status, headers });
      }

      /* ------------------------------- streaming ---------------------------- */
      if (path === '/api/stream/latest') {
        try {
          return json(request, { items: await fetchLatest() });
        } catch (err) {
          return json(request, { error: 'upstream', message: err.message, items: [] }, 502);
        }
      }
      if (path === '/api/stream/search') {
        const q = (url.searchParams.get('q') || '').trim();
        if (!q) return json(request, { items: [] });
        try {
          return json(request, { items: await searchShows(q) });
        } catch (err) {
          return json(request, { error: 'upstream', message: err.message, items: [] }, 502);
        }
      }
      const showMatch = /^\/api\/stream\/show\/([^/]+)$/.exec(path);
      if (showMatch) {
        const requested = decodeURIComponent(showMatch[1]);
        const wita = await resolveWitaSlug(requested);
        try {
          const show = await fetchShow(wita);
          if (!show) return json(request, { error: 'not_found', message: 'Show not found' }, 404);
          show.slug = requested; // episode links must keep the requested slug
          return json(request, { show });
        } catch (err) {
          return json(request, { error: 'upstream', message: err.message }, 502);
        }
      }
      const epMatch = /^\/api\/stream\/episode\/([^/]+)\/(\d+)$/.exec(path);
      if (epMatch) {
        const episode = Number(epMatch[2]);
        if (!Number.isInteger(episode) || episode < 1) {
          return json(request, { error: 'invalid_episode', message: 'Invalid episode number' }, 400);
        }
        const wita = await resolveWitaSlug(decodeURIComponent(epMatch[1]));
        try {
          const data = await fetchEpisode(wita, episode);
          if (!data) return json(request, { error: 'not_found', message: 'Episode not found' }, 404);
          return json(request, data);
        } catch (err) {
          return json(request, { error: err.code || 'upstream', message: err.message || 'Could not resolve streaming sources' }, 502);
        }
      }
      if (path === '/api/stream/resolve' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const episode = Number(body.episode);
        if (!body.slug || !Number.isInteger(episode) || episode < 1 || !body.entryId) {
          return json(request, { error: 'bad_request', message: 'slug, episode, entryId required' }, 400);
        }
        const wita = await resolveWitaSlug(String(body.slug));
        try {
          const source = await resolveEntry(wita, episode, String(body.entryId));
          if (!source) return json(request, { error: 'not_found', message: 'Server not found' }, 404);
          return json(request, { source });
        } catch (err) {
          return json(request, { error: err.code || 'upstream', message: err.message || 'Could not resolve this server' }, 502);
        }
      }

      /* ---------------------------- video proxy ----------------------------- */
      if (path === '/api/stream/proxy') {
        let target;
        try {
          target = new URL(String(url.searchParams.get('url') || ''));
        } catch {
          return json(request, { error: 'bad_url', message: 'Invalid url' }, 400);
        }
        if (target.protocol !== 'https:' && target.protocol !== 'http:') {
          return json(request, { error: 'bad_url', message: 'Only http(s)' }, 400);
        }
        if (!hostAllowed(target.hostname)) {
          return json(request, { error: 'bad_host', message: 'Host not allowed' }, 403);
        }
        const labels = target.hostname.split('.');
        const brand = labels.length >= 2 ? labels.slice(-2).join('.') : target.hostname;
        const headers = {
          'User-Agent': 'Mozilla/5.0',
          Accept: '*/*',
          Referer: `https://www.${brand}/`,
          Origin: `https://www.${brand}`
        };
        const range = request.headers.get('range');
        if (range) headers.Range = range;
        const upstream = await fetch(target.href, {
          headers,
          redirect: 'follow',
          signal: AbortSignal.timeout(30000)
        });
        if (!upstream.ok && upstream.status !== 206) {
          return new Response(null, { status: upstream.status, headers: corsHeaders(request) });
        }
        const out = corsHeaders(request, { 'content-type': upstream.headers.get('content-type') || 'video/mp4' });
        for (const h of ['content-length', 'content-range', 'accept-ranges', 'cache-control']) {
          const v = upstream.headers.get(h);
          if (v) out[h] = v;
        }
        return new Response(upstream.body, { status: upstream.status, headers: out });
      }

      return json(request, { error: 'not_found', message: `No route ${path}` }, 404);
    } catch (err) {
      return json(request, { error: err.code || 'internal', message: err.message || 'Worker error' }, 500);
    }
  }
};
