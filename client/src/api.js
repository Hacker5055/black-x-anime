/**
 * Tiny API client — JSON over fetch with cookie auth + typed errors.
 */
async function request(path, { method = 'GET', body, signal } = {}) {
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

export const api = {
  get: (path, opts) => request(path, opts),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' })
};
