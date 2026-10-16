// Headless real-touch harness for the BLACK X APK web bundle (assets/public of the built APK).
// The bundle is served from a local server; every network call the app makes (website API,
// Algolia catalogue, Firestore, AniList) is answered by in-memory mocks, so nothing here
// depends on the live site. Touch input goes through CDP touch events (page.touchscreen),
// so scrolling and taps behave like a finger. Run it through ./run.sh (see README.md).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const REPO = path.resolve(process.env.BX_REPO || '../../..');
const { APK_RELEASE } = await import(pathToFileURL(path.join(REPO, 'shared/apkRelease.js')).href);

export const DIST = path.resolve(process.env.DIST || '/tmp/bx-touch/public');
export const PORT = Number(process.env.PORT || 8790);
export const LOCAL = `http://127.0.0.1:${PORT}`;
const VIDEO_FILE = process.env.VIDEO || '/tmp/bx-touch/test.webm';
export const VIDEO_URL = `${LOCAL}/test.webm`;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ results */
export const results = [];
export function check(group, name, ok, info = '') {
  results.push({ group, name, ok: Boolean(ok), info: String(info || '') });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${group}] ${name}${info ? ` — ${String(info).slice(0, 220)}` : ''}`);
  return Boolean(ok);
}

/* ------------------------------------------------------------------ local server */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg'
};

function svgImage(kind, n) {
  const shade = 40 + ((n * 37) % 120);
  const [w, h] = kind === 'page' ? [800, 1200] : kind === 'wide' ? [640, 360] : [300, 450];
  const bg = kind === 'page' ? '#f2f2f2' : `rgb(${shade},${shade},${shade})`;
  const fg = kind === 'page' ? '#111' : '#fff';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="50%" font-size="${Math.round(w / 6)}" fill="${fg}" text-anchor="middle" font-family="sans-serif">${kind[0].toUpperCase()}${n}</text></svg>`;
}

function serveRange(req, res, file, type) {
  const size = fs.statSync(file).size;
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', type);
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
    let start = m[1] === '' || m[1] === undefined ? size - Number(m[2] || 0) : Number(m[1]);
    let end = m[1] !== '' && m[2] !== '' && m[2] !== undefined ? Number(m[2]) : size - 1;
    if (!(start >= 0) || start >= size) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}` });
      return res.end();
    }
    end = Math.min(end, size - 1);
    res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Length': size });
  if (req.method === 'HEAD') return res.end();
  return fs.createReadStream(file).pipe(res);
}

export function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, LOCAL);
    const p = decodeURIComponent(url.pathname);
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (p === '/test.webm') return serveRange(req, res, VIDEO_FILE, 'video/webm');
    const m = p.match(/^\/(poster|page|wide)\/(\d+)\.svg$/);
    if (m) {
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=3600' });
      return res.end(svgImage(m[1], Number(m[2])));
    }
    let file = path.join(DIST, p);
    if (!file.startsWith(DIST)) {
      res.writeHead(403);
      return res.end();
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(DIST, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

/* ------------------------------------------------------------------ mock data */
const WEEK = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const TODAY = WEEK[new Date().getDay()];

export const ANIME = Array.from({ length: 60 }, (_, i) => {
  const n = i + 1;
  return {
    objectID: `Test Anime ${n}`,
    name: `Test Anime ${n}`,
    mal_id: 1000 + n,
    details: {
      english_title: `Test Anime ${n}`,
      state: n % 3 === 0 ? 'مكتمل' : 'مستمر',
      year: String(2020 + (n % 6)),
      season: 'Fall',
      studio: [n % 2 ? 'MAPPA' : 'Bones'],
      mal_mean: Number((6.5 + (n % 30) / 10).toFixed(2)),
      age: 'PG-13'
    },
    type: n % 7 === 0 ? 'فيلم' : 'مسلسل',
    show_time: n <= 8 ? TODAY : WEEK[(n + 1) % 7],
    poster_uri: `${LOCAL}/poster/${n}.svg`,
    cover_uri: `${LOCAL}/wide/${n}.svg`,
    story: `قصة تجريبية للأنمي رقم ${n}. نص طويل شوية عشان نختبر عرض الملخص في صفحة التفاصيل.`,
    tags: n % 2 ? ['أكشن', 'مغامرات'] : ['دراما', 'كوميدي'],
    duration: '24 min',
    views: 100000 - n * 1000
  };
});

export const MANGA = Array.from({ length: 12 }, (_, i) => ({
  id: `test-manhwa-${i + 1}`,
  title: `Test Manhwa ${i + 1}`,
  poster: `${LOCAL}/poster/${i + 30}.svg`,
  type: i % 2 ? 'MANGA' : 'MANHWA',
  server: 'bx1',
  rating: 8.1,
  availableServers: ['bx1']
}));

export const TEST_USER = {
  id: 'u_tester',
  username: 'tester',
  email: 'tester@example.com',
  displayName: 'Tester',
  photoUrl: '',
  avatarColor: '#ffffff',
  bio: '',
  role: 'user',
  isDeveloper: false,
  vipTier: 'free',
  vipStatus: 'Free Tier',
  vipExpiresAt: null,
  isGoogleAccount: false,
  createdAt: '2026-01-01T00:00:00.000Z'
};

function seedPosts() {
  const now = Date.now();
  const extra = Array.from({ length: 9 }, (_, i) => ({ id: `post_x${i}`, author: `User ${i}`, username: `user${i}`, role: 'user', category: 'discussion', isSpoiler: false, createdAt: new Date(now - (4 + i) * 86400e3).toISOString(), time: '', text: `بوست قديم رقم ${i + 1} — كلام عن الحلقات والأنمي عشان الصفحة تبقى طويلة كفاية للتمرير.`, likes: i, likedBy: [], replies: [] }));
  return [
    { id: 'post_a', author: 'Kai', username: 'kai', role: 'user', category: 'discussion', isSpoiler: false, createdAt: new Date(now - 5 * 60e3).toISOString(), time: '', text: 'الحلقة دي كانت تحفة', likes: 2, likedBy: ['x1', 'x2'], replies: [] },
    { id: 'post_b', author: 'Mona', username: 'mona', role: 'user', category: 'recommend', isSpoiler: false, createdAt: new Date(now - 3 * 3600e3).toISOString(), time: '', text: 'ترشيح: Test Anime 3', likes: 0, likedBy: [], replies: [] },
    { id: 'post_c', author: 'Omar', username: 'omar', role: 'user', category: 'theory', isSpoiler: false, createdAt: new Date(now - 2 * 86400e3).toISOString(), time: '', text: 'نظرية عن النهاية', likes: 1, likedBy: ['x3'], replies: [] },
    ...extra
  ];
}

/* ------------------------------------------------------------------ mocks */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, X-Algolia-Application-Id, X-Algolia-API-Key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
};

function json(req, data, status = 200) {
  return req.respond({ status, headers: { ...CORS, 'Cache-Control': 'no-store' }, contentType: 'application/json; charset=utf-8', body: JSON.stringify(data) });
}

const safeJson = (s) => {
  try {
    return JSON.parse(s || '{}');
  } catch {
    return {};
  }
};

function getPath(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function facetMatch(hit, f) {
  const s = String(f);
  const i = s.indexOf(':');
  if (i < 0) return true;
  let attr = s.slice(0, i);
  const val = s.slice(i + 1);
  const neg = attr.startsWith('-');
  if (neg) attr = attr.slice(1);
  const v = getPath(hit, attr);
  const ok = Array.isArray(v) ? v.map(String).includes(val) : String(v ?? '') === val;
  return neg ? !ok : ok;
}

function algolia(index, body) {
  let list = ANIME.slice();
  const q = String(body.query || '').trim().toLowerCase();
  if (q) list = list.filter((a) => a.name.toLowerCase().includes(q));
  const ff = Array.isArray(body.facetFilters) ? body.facetFilters : body.facetFilters ? [body.facetFilters] : [];
  for (const group of ff) {
    const ors = Array.isArray(group) ? group : [group];
    list = list.filter((a) => ors.some((f) => facetMatch(a, f)));
  }
  if (index === 'recent') list.reverse();
  else if (/best|rank|rating|score/.test(index)) list.sort((x, y) => y.details.mal_mean - x.details.mal_mean);
  const hpp = Number(body.hitsPerPage) || 20;
  const page = Number(body.page) || 0;
  return { hits: list.slice(page * hpp, page * hpp + hpp), nbHits: list.length, page, nbPages: Math.ceil(list.length / hpp), hitsPerPage: hpp, query: body.query || '', params: '', facets: {} };
}

function api(req, url, ctx) {
  const p = url.pathname;
  const method = req.method();
  const auth = req.headers().authorization || '';
  let m;
  if (p === '/api/app/config') return json(req, { enforced: false, broadcastMsg: '', pinnedRec: null, apk: APK_RELEASE, serverTime: new Date().toISOString() });
  if (p === '/api/app/skip-times') return json(req, { found: true, malId: Number(url.searchParams.get('mal')) || null, segments: [{ type: 'op', start: 90, end: 180 }] });
  if (p === '/api/app/me') return auth ? json(req, { user: TEST_USER, state: { favorites: [], progress: [], positions: {}, xp: 120 } }) : json(req, { error: 'auth_required' }, 401);
  if (p === '/api/app/state') return auth ? json(req, { ok: true, state: safeJson(req.postData()) }) : json(req, { error: 'auth_required' }, 401);
  if (p === '/api/stream/sources') return json(req, { sources: [{ id: 'witanime' }, { id: 'anime3rb' }, { id: 'english' }] });
  if (p === '/api/stream/stats') return json(req, { animeTotal: ANIME.length });
  if ((m = p.match(/^\/api\/stream\/show\/([^/]+)$/))) {
    const slug = decodeURIComponent(m[1]);
    return json(req, {
      show: {
        slug,
        title: slug,
        poster: `${LOCAL}/poster/1.svg`,
        banner: `${LOCAL}/wide/1.svg`,
        episodes: Array.from({ length: 12 }, (_, i) => ({ number: i + 1, title: `Episode ${i + 1}`, thumb: `${LOCAL}/wide/${i + 1}.svg` }))
      }
    });
  }
  if ((m = p.match(/^\/api\/stream\/episode\/([^/]+)\/(\d+)$/))) {
    ctx.episodes.push(`${decodeURIComponent(m[1])}:${m[2]}`);
    return json(req, { entries: [{ id: `e-${m[2]}`, server: 'BLACK X 1', serverCode: 'PD_DEV', quality: '1080p', directUrl: VIDEO_URL }], resolved: {} });
  }
  if (p === '/api/stream/resolve') return json(req, { source: { directUrl: VIDEO_URL } });
  if (p === '/api/stream/search') {
    const q = String(url.searchParams.get('q') || '').toLowerCase();
    const items = ANIME.filter((a) => a.name.toLowerCase().includes(q)).map((a) => ({
      slug: `aw-${a.objectID.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      objectID: a.objectID,
      title: a.name,
      titleEn: a.name,
      titleRomaji: a.name,
      poster: a.poster_uri,
      banner: a.cover_uri,
      rating: a.details.mal_mean,
      type: a.type,
      status: a.details.state,
      year: a.details.year,
      source: 'witanime'
    }));
    return json(req, { items });
  }
  if (p === '/api/search') {
    const q = String(url.searchParams.get('query') || '').toLowerCase();
    return json(req, { manga: MANGA.filter((x) => x.title.toLowerCase().includes(q)) });
  }
  if (p === '/api/content/library') return json(req, { items: MANGA, page: 1, hasNextPage: false });
  if ((m = p.match(/^\/api\/content\/library\/([^/]+)$/))) {
    return json(req, {
      item: {
        id: decodeURIComponent(m[1]),
        chapters: Array.from({ length: 8 }, (_, i) => ({ chapterId: `${m[1]}-ch-${i + 1}`, chapterNumber: String(i + 1), title: `Chapter ${i + 1}`, server: 'bx1' })),
        availableServers: ['bx1'],
        activeServer: 'bx1'
      }
    });
  }
  if ((m = p.match(/^\/api\/manga\/chapter\/([^/]+)\/pages$/))) {
    return json(req, { pages: Array.from({ length: 6 }, (_, i) => ({ pageNumber: i + 1, directUrl: `${LOCAL}/page/${i + 1}.svg` })) });
  }
  if (p === '/api/proxy/image') return req.respond({ status: 200, headers: CORS, contentType: 'image/svg+xml', body: svgImage('poster', 1) });
  if (method !== 'GET') return json(req, { ok: true });
  return json(req, { error: 'not_found' }, 404);
}

function firestore(req, url, ctx) {
  const m = url.pathname.match(/\/documents\/(.+)$/);
  const docPath = m ? decodeURIComponent(m[1]) : '';
  const method = req.method();
  if (method === 'GET') {
    const fields = ctx.fs.get(docPath);
    return fields ? json(req, { name: docPath, fields }) : json(req, { error: { code: 404, status: 'NOT_FOUND' } }, 404);
  }
  if (method === 'PATCH' || method === 'POST') {
    const body = safeJson(req.postData());
    ctx.fs.set(docPath, body.fields || {});
    ctx.fsWrites.push({ docPath, body });
    return json(req, { name: docPath, fields: body.fields || {} });
  }
  return json(req, {});
}

function route(req, ctx) {
  const raw = req.url();
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return req.continue();
  const url = new URL(raw);
  if (url.host === `127.0.0.1:${PORT}`) return req.continue();
  if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers: CORS });
  ctx.net.push(`${req.method()} ${url.host}${url.pathname}`);
  if (url.host === 'black-x-anime.me') return api(req, url, ctx);
  if (/algolia(net)?\.(net|com)$/.test(url.host)) {
    const index = decodeURIComponent(url.pathname.split('/')[3] || '');
    const body = safeJson(req.postData());
    ctx.algolia.push({ index, body });
    return json(req, algolia(index, body));
  }
  if (url.host === 'firestore.googleapis.com') return firestore(req, url, ctx);
  if (url.host === 'graphql.anilist.co') return json(req, { data: { Page: { pageInfo: { hasNextPage: false, currentPage: 1 }, media: [], airingSchedules: [] }, Media: null } });
  ctx.blocked.push(raw.slice(0, 160));
  return req.respond({ status: 404, headers: CORS, contentType: 'text/plain', body: 'blocked in test' });
}

/* ------------------------------------------------------------------ browser */
export async function launch() {
  return puppeteer.launch({
    executablePath: await chromium.executablePath(),
    args: await puppeteer.defaultArgs({
      args: [...chromium.args, '--autoplay-policy=no-user-gesture-required', '--disable-web-security'],
      headless: 'shell'
    }),
    headless: 'shell',
    protocolTimeout: 120000
  });
}

const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36';

export async function openApp(browser, { seed = {} } = {}) {
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const ctx = { net: [], algolia: [], fs: new Map(), fsWrites: [], errors: [], consoleErrors: [], blocked: [], episodes: [] };
  ctx.fs.set('settings/shared_community_feed', { json: { stringValue: JSON.stringify(seedPosts()) } });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    try {
      route(req, ctx);
    } catch (e) {
      ctx.errors.push(`route: ${e.message}`);
      req.abort().catch(() => {});
    }
  });
  page.on('pageerror', (e) => ctx.errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') ctx.consoleErrors.push(msg.text().slice(0, 200));
  });
  await page.evaluateOnNewDocument((seedData) => {
    window.__BLACKX_APK__ = true;
    window.__bxNativeCalls = [];
    const rec = (name) => (...args) => {
      window.__bxNativeCalls.push({ name, args });
    };
    window.BlackXNativeAuth = {
      setFullscreen: rec('setFullscreen'),
      setVolumeKeyScroll: rec('setVolumeKeyScroll'),
      setScreenBrightness: rec('setScreenBrightness'),
      requestNotificationPermission: rec('requestNotificationPermission'),
      sendPhoneNotification: rec('sendPhoneNotification'),
      exitApp: rec('exitApp'),
      enterPipMode: rec('enterPipMode')
    };
    if (!sessionStorage.getItem('__bx_seeded')) {
      sessionStorage.setItem('__bx_seeded', '1');
      for (const [k, v] of Object.entries(seedData)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }, { bx_mob_splash_seen: APK_RELEASE.version, bx_mob_lang: 'ar', ...seed });
  await page.goto(`${LOCAL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.bx-dock') && !document.querySelector('.bx-intro'), { timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll('.bx-poster').length > 4, { timeout: 20000 }).catch(() => {});
  await sleep(500);
  return { page, ctx };
}

/* ------------------------------------------------------------------ touch helpers */
export async function tapAt(page, x, y) {
  await page.touchscreen.tap(x, y);
}

export async function swipe(page, x1, y1, x2, y2, { steps = 14, stepMs = 16 } = {}) {
  await page.touchscreen.touchStart(x1, y1);
  for (let i = 1; i <= steps; i++) {
    await page.touchscreen.touchMove(x1 + ((x2 - x1) * i) / steps, y1 + ((y2 - y1) * i) / steps);
    await sleep(stepMs);
  }
  await page.touchscreen.touchEnd();
}

export async function doubleTap(page, x, y, gapMs = 110) {
  await page.touchscreen.tap(x, y);
  await sleep(gapMs);
  await page.touchscreen.tap(x, y);
}

/** Visible element box (+ whether a finger at its centre would really hit it). */
export async function boxOf(page, selector, { text = null, exact = false, index = 0, scroll = true } = {}) {
  return page.evaluate(
    ({ selector, text, exact, index, scroll }) => {
      const vis = (e) => {
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none';
      };
      let els = [...document.querySelectorAll(selector)].filter(vis);
      if (text) {
        els = els.filter((e) => {
          const t = (e.innerText || e.textContent || '').trim();
          const a = e.getAttribute('aria-label') || '';
          return exact ? t === text || a === text : t.includes(text) || a.includes(text);
        });
      }
      const el = els[index];
      if (!el) return null;
      if (scroll) el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      const desc = (n) => (n ? `${n.tagName.toLowerCase()}${n.id ? `#${n.id}` : ''}${typeof n.className === 'string' && n.className ? `.${n.className.trim().split(/\s+/).join('.')}` : ''}` : 'none');
      return { x, y, w: r.width, h: r.height, top: r.top, left: r.left, hitOk: Boolean(hit) && (hit === el || el.contains(hit)), hit: desc(hit), text: (el.innerText || '').trim().slice(0, 80) };
    },
    { selector, text, exact, index, scroll }
  );
}

export async function tapEl(page, selector, opts = {}) {
  // A finger lands on the view-transition snapshot while a page transition (≤ 0.32 s) runs.
  await page.waitForFunction(() => !document.documentElement.classList.contains('bx-vt-running'), { timeout: 2000, polling: 50 }).catch(() => {});
  const b = await boxOf(page, selector, opts);
  if (!b) throw new Error(`not found: ${selector}${opts.text ? ` "${opts.text}"` : ''}`);
  if (!b.hitOk && !opts.force) throw new Error(`blocked: ${selector}${opts.text ? ` "${opts.text}"` : ''} -> ${b.hit}`);
  await page.touchscreen.tap(b.x, b.y);
  return b;
}

export async function waitVt(page, timeout = 3000) {
  await page.waitForFunction(() => !document.documentElement.classList.contains('bx-vt-running'), { timeout, polling: 50 }).catch(() => {});
  await sleep(120);
}

export async function text(page, selector) {
  return page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => (e.innerText || e.textContent || '').trim()), selector);
}

export function summary() {
  const groups = {};
  for (const r of results) {
    groups[r.group] = groups[r.group] || { pass: 0, fail: 0 };
    groups[r.group][r.ok ? 'pass' : 'fail'] += 1;
  }
  const pass = results.filter((r) => r.ok).length;
  console.log('\n==== SUMMARY ====');
  for (const [g, c] of Object.entries(groups)) console.log(`${g.padEnd(10)} ${c.pass}/${c.pass + c.fail}`);
  console.log(`TOTAL ${pass}/${results.length}`);
  const fails = results.filter((r) => !r.ok);
  if (fails.length) {
    console.log('FAILED:');
    for (const f of fails) console.log(` - [${f.group}] ${f.name} — ${f.info}`);
  }
  return { pass, total: results.length };
}
