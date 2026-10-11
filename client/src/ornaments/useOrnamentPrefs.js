/**
 * useOrnamentPrefs — reads the persisted 3D ornament choices for a user.
 *
 *   const { frameStyle, bannerStyle, quality, enabled } = useOrnamentPrefs(userId);
 *
 * Cache order: localStorage (instant paint on reload) → /api/profile/profile
 * (source of truth) → defaults. Nothing here throws: when the API is down the
 * caller simply keeps the cached (or default) values and the CSS frame renders.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

const KEY = (id) => `blackx:ornaments:${id || 'anon'}`;

export const DEFAULT_ORNAMENT_PREFS = {
  frameStyle: 'default',
  bannerStyle: 'off',
  ornament: 'none',
  quality: 'auto',
  enabled: true
};

function readCache(id) {
  try {
    const raw = localStorage.getItem(KEY(id));
    return raw ? { ...DEFAULT_ORNAMENT_PREFS, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}
function writeCache(id, prefs) {
  try { localStorage.setItem(KEY(id), JSON.stringify(prefs)); } catch { /* private mode */ }
}

export function useOrnamentPrefs(userId, { fetch: shouldFetch = true } = {}) {
  const [prefs, setPrefs] = useState(() => readCache(userId) || DEFAULT_ORNAMENT_PREFS);

  useEffect(() => {
    const cached = readCache(userId);
    if (cached) setPrefs(cached);
  }, [userId]);

  useEffect(() => {
    if (!shouldFetch || !userId || typeof window === 'undefined') return undefined;
    let alive = true;
    api.get('/api/profile/profile')
      .then((res) => {
        if (!alive || !res?.data) return;
        const next = {
          ...DEFAULT_ORNAMENT_PREFS,
          ...(readCache(userId) || {}),
          frameStyle: res.data.frameStyle || 'default',
          bannerStyle: res.data.bannerStyle || 'off',
          ornament: res.data.ornament || 'none'
        };
        setPrefs(next);
        writeCache(userId, next);
      })
      .catch(() => { /* offline → keep cache */ });
    return () => { alive = false; };
  }, [userId, shouldFetch]);

  /* feed updates from the profile screen without a refetch */
  useEffect(() => {
    const onUpdated = (e) => {
      const detail = e?.detail;
      if (!detail) return;
      setPrefs((p) => {
        const next = { ...p, ...detail };
        writeCache(userId, next);
        return next;
      });
    };
    window.addEventListener('blackx:ornaments-updated', onUpdated);
    return () => window.removeEventListener('blackx:ornaments-updated', onUpdated);
  }, [userId]);

  const save = useCallback(async (patch) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    writeCache(userId, next);
    try {
      window.dispatchEvent(new CustomEvent('blackx:ornaments-updated', { detail: patch }));
    } catch { /* no DOM (tests) */ }
    await api.put('/api/profile/customize', {
      frameStyle: next.frameStyle,
      bannerStyle: next.bannerStyle,
      ornament: next.ornament
    });
    return next;
  }, [prefs, userId]);

  return { ...prefs, setPrefs, save };
}

export default useOrnamentPrefs;
