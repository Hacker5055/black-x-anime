/**
 * Static-mode persistence — GitHub Pages build has no server, so accounts,
 * favorites and continue-watching live in localStorage (persistent per
 * device/browser). Response shapes mirror the Express API exactly, so the
 * rest of the app doesn't care which mode it's in.
 *
 * Demo accounts mirror server/src/seed.js (password blackx2026).
 */

const USERS_KEY = 'blackx_users_v1';
const SESSION_KEY = 'blackx_session_v1';
const LIB_KEY = (uid) => `blackx_lib_v1_${uid}`;

/* Demo shows — the same localization overlay as the server seed. */
export const FALLBACK_SHOWS = {
  'one-piece': { titleEn: 'One Piece', titleAr: 'ون بيس', poster: null, episodes: 1180 },
  'black-clover-2nd-season': { titleEn: 'Black Clover 2nd Season', titleAr: 'البرسيم الأسود 2', poster: null, episodes: 1 },
  'bleach-sennen-kessen-hen-kashin-tan': { titleEn: 'Bleach: Thousand-Year Blood War', titleAr: 'بليتش: حرب الدماء', poster: null, episodes: 8 },
  'steel-ball-run-jojo-no-kimyou-na-bouken': { titleEn: "JoJo's Bizarre Adventure: Steel Ball Run", titleAr: 'مغامرات جوجو الغريبة', poster: null, episodes: 3 },
  'tensei-shitara-ken-deshita-ii': { titleEn: 'Reincarnated as a Sword 2', titleAr: 'تناسخت كسيف 2', poster: null, episodes: 2 },
  'tokyo-revengers-santen-sensou-hen': { titleEn: 'Tokyo Revengers', titleAr: 'طوكيو المنتقمون', poster: null, episodes: 1 }
};

const DEMO_USERS = [
  ['kuro', 'kuro@blackx.app', 'Kuro', '#22d3ee', 'admin', 'Founder of BLACK X. Binge-watcher & subtitle perfectionist. | مؤسس BLACK X. مدمن مشاهدة ومثالي في الترجمة.'],
  ['zero', 'zero@blackx.app', 'Zero', '#f472b6', 'user', 'Shonen nights, school mornings. | ليل الشونن، وصباحات المدرسة.'],
  ['mirai', 'mirai@blackx.app', 'Mirai', '#a3e635', 'user', 'I watch 12 shows at once and finish none. | أشاهد 12 مسلساً دفعة واحدة وأنهي واحداً.'],
  ['nocturne', 'nocturne@blackx.app', 'Nocturne', '#8b5cf6', 'user', 'Dark psychological anime only. | أنمي نفسي مظلم فقط.'],
  ['raven', 'raven@blackx.app', 'Raven', '#fb923c', 'user', 'Opening theme collector. | جامع أغاني المقدمات.'],
  ['yuki', 'yuki@blackx.app', 'Yuki', '#60a5fa', 'user', 'Slice of life is a lifestyle. | أنمي الحياة اليومية هو أسلوب حياة.']
];

const DEMO_FAVORITES = [
  ['kuro', 'one-piece'], ['kuro', 'black-clover-2nd-season'],
  ['zero', 'bleach-sennen-kessen-hen-kashin-tan'], ['zero', 'steel-ball-run-jojo-no-kimyou-na-bouken'],
  ['mirai', 'one-piece'], ['mirai', 'tensei-shitara-ken-deshita-ii'],
  ['nocturne', 'bleach-sennen-kessen-hen-kashin-tan'], ['nocturne', 'tokyo-revengers-santen-sensou-hen'],
  ['raven', 'black-clover-2nd-season'],
  ['yuki', 'tokyo-revengers-santen-sensou-hen'], ['yuki', 'tensei-shitara-ken-deshita-ii']
];

const DEMO_PROGRESS = [
  ['kuro', 'one-piece', 1176, 920, 1420, 0], ['kuro', 'black-clover-2nd-season', 1, 310, 1420, 0],
  ['zero', 'bleach-sennen-kessen-hen-kashin-tan', 7, 1280, 1400, 0], ['zero', 'bleach-sennen-kessen-hen-kashin-tan', 8, 210, 1400, 0],
  ['mirai', 'one-piece', 1178, 640, 1420, 0], ['mirai', 'tensei-shitara-ken-deshita-ii', 1, 1385, 1400, 1],
  ['nocturne', 'tokyo-revengers-santen-sensou-hen', 1, 480, 1420, 0],
  ['raven', 'black-clover-2nd-season', 1, 128, 1420, 0],
  ['yuki', 'tensei-shitara-ken-deshita-ii', 2, 1330, 1400, 0]
];

/* ------------------------------- storage ------------------------------- */

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota — ignore */ }
}

function ensureSeeded() {
  let users = load(USERS_KEY, null);
  if (users && users.length) return users;
  users = DEMO_USERS.map(([username, email, displayName, avatarColor, role, bio], i) => ({
    id: i + 1,
    username,
    email,
    password: 'blackx2026', // demo only — static demo has no real auth backend
    displayName,
    avatarColor,
    bio,
    role,
    createdAt: new Date(Date.now() - (90 - i) * 86400000).toISOString()
  }));
  save(USERS_KEY, users);

  // demo libraries for each demo account (bilingual titles, like the server seed)
  for (const u of users) {
    const lib = { favorites: [], progress: [] };
    for (const [un, slug] of DEMO_FAVORITES) {
      if (un !== u.username) continue;
      const meta = FALLBACK_SHOWS[slug] || {};
      lib.favorites.push({
        id: lib.favorites.length + 1,
        slug,
        titleEn: meta.titleEn || slug,
        titleAr: meta.titleAr || null,
        poster: meta.poster || null,
        banner: null,
        episodes: meta.episodes ?? null,
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
      });
    }
    let n = 0;
    for (const [un, slug, episode, position, duration, completed] of DEMO_PROGRESS) {
      if (un !== u.username) continue;
      const meta = FALLBACK_SHOWS[slug] || {};
      lib.progress.push({
        slug,
        episode,
        position,
        duration,
        completed: Boolean(completed),
        titleEn: meta.titleEn || slug,
        titleAr: meta.titleAr || null,
        poster: meta.poster || null,
        updatedAt: new Date(Date.now() - (10 - n) * 3600000).toISOString()
      });
      n += 1;
    }
    save(LIB_KEY(u.id), lib);
  }
  return users;
}

export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    displayName: u.displayName,
    avatarColor: u.avatarColor,
    bio: u.bio,
    role: u.role,
    createdAt: u.createdAt
  };
}

function currentUser() {
  const sid = load(SESSION_KEY, null);
  if (!sid) return null;
  return ensureSeeded().find((u) => u.id === sid) || null;
}

function getLib(uid) {
  return load(LIB_KEY(uid), { favorites: [], progress: [] });
}
function putLib(uid, lib) {
  save(LIB_KEY(uid), lib);
}

function statsFor(uid) {
  const lib = getLib(uid);
  return {
    favorites: lib.favorites.length,
    watchedEpisodes: lib.progress.length,
    completed: lib.progress.filter((p) => p.completed).length,
    showsTracked: new Set(lib.progress.map((p) => p.slug)).size
  };
}

/* --------------------------------- auth --------------------------------- */

function fail(code, message, status = 400) {
  const e = new Error(message);
  e.code = code;
  e.status = status;
  throw e;
}

export function staticAuth(path, { method = 'GET', body } = {}) {
  ensureSeeded();
  if (path === '/api/auth/me') {
    const u = currentUser();
    return Promise.resolve(u ? { user: publicUser(u), stats: statsFor(u.id) } : { user: null, stats: null });
  }
  if (path === '/api/auth/login' && method === 'POST') {
    const { username, password } = body || {};
    const u = ensureSeeded().find((x) => x.username === String(username || '').trim());
    if (!u || u.password !== password) fail('invalid_credentials', 'Invalid username or password', 401);
    save(SESSION_KEY, u.id);
    return Promise.resolve({ user: publicUser(u) });
  }
  if (path === '/api/auth/register' && method === 'POST') {
    const { username, password, email, displayName } = body || {};
    const name = String(username || '').trim();
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(name)) fail('invalid_username', 'Invalid username');
    if (ensureSeeded().some((x) => x.username === name)) fail('username_taken', 'Username taken', 409);
    if (!password || String(password).length < 6) fail('weak_password', 'Password too short');
    const users = load(USERS_KEY, []);
    const u = {
      id: Math.max(0, ...users.map((x) => x.id)) + 1,
      username: name,
      email: email || `${name}@blackx.local`,
      password: String(password),
      displayName: displayName || name,
      avatarColor: '#22d3ee',
      bio: '',
      role: 'user',
      createdAt: new Date().toISOString()
    };
    users.push(u);
    save(USERS_KEY, users);
    putLib(u.id, { favorites: [], progress: [] });
    save(SESSION_KEY, u.id);
    return Promise.resolve({ user: publicUser(u) });
  }
  if (path === '/api/auth/logout') {
    save(SESSION_KEY, null);
    return Promise.resolve({ ok: true });
  }
  return Promise.reject(fail('not_found', 'Not found', 404));
}

/* -------------------------------- library ------------------------------- */

export function staticLibrary(path, { method = 'GET', body } = {}) {
  const u = currentUser();
  if (!u) return Promise.reject(fail('unauthorized', 'Sign in first', 401));
  const lib = getLib(u.id);
  const slugMatch = /^\/api\/library\/(?:favorites|progress)\/([^/]+)(?:\/(\d+))?$/.exec(path);

  if (path === '/api/library/favorites') {
    return Promise.resolve({ favorites: lib.favorites });
  }
  if (path === '/api/library/continue') {
    // one entry per show: most recently touched episode
    const latest = new Map();
    for (const p of lib.progress) {
      const cur = latest.get(p.slug);
      if (!cur || new Date(p.updatedAt) > new Date(cur.updatedAt)) latest.set(p.slug, p);
    }
    const entries = [...latest.values()]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 24)
      .map((p) => ({
        slug: p.slug,
        episode: p.episode,
        position: p.position,
        duration: p.duration,
        completed: p.completed,
        titleEn: p.titleEn,
        titleAr: p.titleAr,
        poster: p.poster,
        updatedAt: p.updatedAt,
        percent: p.duration > 0 ? Math.min(100, Math.round((p.position / p.duration) * 100)) : 0
      }));
    return Promise.resolve({
      continueWatching: entries.filter((e) => !e.completed && e.percent < 95),
      history: entries
    });
  }
  if (path === '/api/library/favorites' && method === 'PUT') return Promise.resolve({ ok: true, favorite: true }); // unreachable, kept for shape

  if (slugMatch && slugMatch[0].startsWith('/api/library/favorites/')) {
    const slug = decodeURIComponent(slugMatch[1]);
    const idx = lib.favorites.findIndex((f) => f.slug === slug);
    if (method === 'GET') return Promise.resolve({ favorite: idx >= 0 });
    if (method === 'DELETE') {
      if (idx >= 0) lib.favorites.splice(idx, 1);
      putLib(u.id, lib);
      return Promise.resolve({ ok: true, favorite: false });
    }
    // PUT — add/update
    const { titleEn, titleAr, poster, banner, episodes } = body || {};
    const meta = FALLBACK_SHOWS[slug] || {};
    const row = {
      id: idx >= 0 ? lib.favorites[idx].id : Math.max(0, ...lib.favorites.map((f) => f.id)) + 1,
      slug,
      titleEn: titleEn ?? meta.titleEn ?? slug,
      titleAr: titleAr ?? meta.titleAr ?? null,
      poster: poster ?? meta.poster ?? null,
      banner: banner ?? null,
      episodes: episodes ?? meta.episodes ?? null,
      createdAt: idx >= 0 ? lib.favorites[idx].createdAt : new Date().toISOString()
    };
    if (idx >= 0) lib.favorites[idx] = { ...lib.favorites[idx], ...row };
    else lib.favorites.unshift(row);
    putLib(u.id, lib);
    return Promise.resolve({ ok: true, favorite: true });
  }

  if (slugMatch && slugMatch[0].startsWith('/api/library/progress/')) {
    const slug = decodeURIComponent(slugMatch[1]);
    const ep = Number(slugMatch[2]);
    if (method === 'GET') {
      const p = lib.progress.find((x) => x.slug === slug && x.episode === ep);
      return Promise.resolve({
        progress: p
          ? { position: p.position, duration: p.duration, completed: p.completed, updatedAt: p.updatedAt }
          : null
      });
    }
    if (method === 'PUT') {
      const { position = 0, duration = 0, completed, titleEn, titleAr, poster } = body || {};
      const pos = Math.max(0, Number(position) || 0);
      const dur = Math.max(0, Number(duration) || 0);
      const done = completed !== undefined ? Boolean(completed) : dur > 0 && pos / dur >= 0.95;
      const meta = FALLBACK_SHOWS[slug] || {};
      let row = lib.progress.find((x) => x.slug === slug && x.episode === ep);
      if (!row) {
        row = { slug, episode: ep, position: 0, duration: 0, completed: false, titleEn: null, titleAr: null, poster: null };
        lib.progress.push(row);
      }
      row.position = pos;
      row.duration = dur;
      row.completed = done;
      row.titleEn = titleEn ?? row.titleEn ?? meta.titleEn ?? slug;
      row.titleAr = titleAr ?? row.titleAr ?? meta.titleAr ?? null;
      row.poster = poster ?? row.poster ?? null;
      row.updatedAt = new Date().toISOString();
      putLib(u.id, lib);
      return Promise.resolve({ ok: true, completed: done });
    }
    if (method === 'DELETE') {
      // DELETE /api/library/progress/:slug — drop the show's rows
      return Promise.resolve({ ok: true });
    }
  }

  if (path.startsWith('/api/library/progress/') && method === 'DELETE' && slugMatch) {
    const slug = decodeURIComponent(slugMatch[1]);
    putLib(u.id, { ...lib, progress: lib.progress.filter((x) => x.slug !== slug) });
    return Promise.resolve({ ok: true });
  }

  return Promise.reject(fail('not_found', 'Not found', 404));
}
