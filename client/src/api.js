/**
 * BLACK X API Client — Hybrid Web + Capacitor Android APK Edition
 * Supports dynamic cloud backend URL resolution for the native Android APK.
 */
const TOKEN_KEY = 'blackx_token';
const SERVER_URL_KEY = 'blackx_server_url';

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function isNativeApk() {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.Capacitor?.isNativePlatform?.() ||
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'file:' ||
      window.__BLACKX_APK__ ||
      (window.location.hostname === 'localhost' && !window.location.port)
  );
}

export function getServerUrl() {
  try {
    const saved = localStorage.getItem(SERVER_URL_KEY);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch {
    /* ignore */
  }
  const envUrl = import.meta.env?.VITE_API_BASE_URL || '';
  if (envUrl && String(envUrl).trim()) {
    return String(envUrl).trim().replace(/\/+$/, '');
  }

  // Cloudflare Workers/Pages static deployments only host the Vite frontend.
  // Keep API requests on the live Vercel backend instead of letting the SPA
  // fallback return index.html for /api/* and leave catalogs empty.
  const host = typeof window !== 'undefined' ? String(window.location.hostname || '').toLowerCase() : '';
  if (host.endsWith('.workers.dev') || host.endsWith('.pages.dev')) {
    return 'https://black-x-anime.me';
  }
  return '';
}

export function setServerUrl(url) {
  try {
    const clean = String(url || '').trim().replace(/\/+$/, '');
    if (clean) localStorage.setItem(SERVER_URL_KEY, clean);
    else localStorage.removeItem(SERVER_URL_KEY);
    return clean;
  } catch {
    return '';
  }
}

export function resolveApiUrl(path) {
  if (!path || typeof path !== 'string') return path;
  if (/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const base = getServerUrl();
  if (!base) return path;
  if (path.startsWith('/')) return `${base}${path}`;
  return `${base}/${path}`;
}

// Install global fetch wrapper so direct fetch('/api/...') or fetch('/search-anime...')
// calls across all components automatically route to the configured cloud server in APK mode.
if (typeof window !== 'undefined' && !window.__blackxFetchWrapped) {
  window.__blackxFetchWrapped = true;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/')) {
      const isBackendPath =
        input.startsWith('/api/') ||
        input.startsWith('/search-anime') ||
        input.startsWith('/get-episodes') ||
        input.startsWith('/get-episode-dl') ||
        input.startsWith('/latest-episodes') ||
        input.startsWith('/fetch-seasonals') ||
        input.startsWith('/get-anime-info');
      if (isBackendPath) {
        const base = getServerUrl();
        if (base) {
          input = `${base}${input}`;
        }
      }
    }
    return nativeFetch(input, init);
  };
}

async function request(path, { method = 'GET', body, headers = {}, signal } = {}) {
  let res;
  const token = getStoredToken();
  const reqHeaders = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers
  };

  const resolvedPath = resolveApiUrl(path);

  try {
    res = await fetch(resolvedPath, {
      method,
      credentials: 'include',
      headers: Object.keys(reqHeaders).length > 0 ? reqHeaders : undefined,
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
    if (res.status === 401 && path !== '/api/auth/me' && path !== '/api/auth/login') {
      setStoredToken(null);
    }
    const e = new Error(data.message || 'request_failed');
    e.code = data.error || 'request_failed';
    e.status = res.status;
    throw e;
  }
  return data;
}

export const api = {
  get: (path, opts) => request(path, opts),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' })
};
