/**
 * Tiny API client — JSON over fetch with cookie auth + typed errors.
 *
 * Two build modes:
 *   • server build (default): requests go to the Node API (same origin, or
 *     window.BLACKX_CONFIG.apiBase when hosted separately).
 *   • static build (VITE_STATIC=1, GitHub Pages): auth + library live in
 *     localStorage, the catalog comes live from AniList GraphQL, and
 *     /api/stream/* goes to the Cloudflare Worker relay (window.BLACKX_CONFIG
 *     .streamBase) when configured — with graceful browse-only fallbacks
 *     without it.
 */

const STATIC = import.meta.env.VITE_STATIC === '1';
const CFG = (typeof window !== 'undefined' && window.BLACKX_CONFIG) || {};

function joinBase(base, path) {
  return String(base || '').replace(/\/$/, '') + path;
}

function typedError(code, message, status) {
  const e = new Error(message || code);
  e.code = code;
  e.status = status;
  return e;
}

async function rawRequest(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    const e = new Error('network');
    e.code = 'network';
    throw e;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.message || 'request_failed');
    e.code = data.error || 'request_failed';
    e.status = res.status;
    throw e;
  }
  return data;
}

/* ------------------------------ static mode ------------------------------ */

async function staticRequest(path, opts = {}) {
  const { staticAuth, staticLibrary, FALLBACK_SHOWS } = await import('./lib/staticStore.js');

  if (path.startsWith('/api/auth/')) return staticAuth(path, opts);
  if (path.startsWith('/api/library/')) return staticLibrary(path, opts);

  if (path === '/api/anime/trending') {
    const { anilistTrending } = await import('./lib/anilist.js');
    return { anime: await anilistTrending() };
  }

  if (path.startsWith('/api/stream/')) {
    const streamBase = joinBase(CFG.streamBase, '');
    if (streamBase) {
      // full streaming relay available — route everything through it
      return rawRequest(joinBase(streamBase, path), opts);
    }
    // browse-only fallbacks (no worker configured yet)
    const q = new URLSearchParams(path.split('?')[1] || '').get('q');
    if (path.startsWith('/api/stream/search')) {
      const { anilistSearchItems } = await import('./lib/anilist.js');
      return { items: await anilistSearchItems(q || '') };
    }
    const showMatch = /^\/api\/stream\/show\/([^/?]+)/.exec(path);
    if (showMatch) {
      const { anilistShowFallback } = await import('./lib/anilist.js');
      return anilistShowFallback(decodeURIComponent(showMatch[1]), FALLBACK_SHOWS);
    }
    if (path === '/api/stream/latest') {
      return { items: [] }; // empty rail until the relay is connected
    }
    if (path === '/api/stream/health') {
      return { ok: false, status: 0, source: 'witanime.site', mode: 'static', relay: 'not_configured' };
    }
    throw typedError('source_unavailable', 'Streaming relay not configured — see README', 503);
  }

  throw typedError('not_found', `No static handler for ${path}`, 404);
}

async function request(path, opts = {}) {
  if (STATIC) return staticRequest(path, opts);
  return rawRequest(joinBase(CFG.apiBase, path), opts);
}

export const api = {
  get: (path, opts) => request(path, opts),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' })
};
