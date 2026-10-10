/**
 * Tiny API client — JSON over fetch with cookie auth + typed errors.
 */
const TOKEN_KEY = 'blackx_token';

export function getStoredToken() {
  try { return localStorage.getItem(TOKEN_KEY) || null; } catch { return null; }
}

export function setStoredToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function request(path, { method = 'GET', body, headers = {}, signal } = {}) {
  let res;
  const token = getStoredToken();
  const reqHeaders = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers
  };

  try {
    res = await fetch(path, {
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
