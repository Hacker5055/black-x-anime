/**
 * Data saver: 'auto' (follow Android's Data Saver / slow connections), 'on', 'off'.
 * When active the app loads smaller covers, never autoplays trailers, starts HLS at
 * the lowest quality and prefers lower-quality servers.
 */
import { useEffect, useState } from 'react';

const KEY = 'bx_mob_data_saver';
const listeners = new Set();

export function getDataSaverPref() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'on' || v === 'off' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function setDataSaverPref(value) {
  const next = value === 'on' || value === 'off' ? value : 'auto';
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

function connection() {
  if (typeof navigator === 'undefined') return null;
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
}

export function connectionIsSlow() {
  const c = connection();
  if (!c) return false;
  if (c.saveData) return true;
  return ['slow-2g', '2g', '3g'].includes(String(c.effectiveType || ''));
}

export function isDataSaverActive(pref = getDataSaverPref()) {
  return pref === 'on' || (pref === 'auto' && connectionIsSlow());
}

/** [active, pref, setPref] — updates when the setting or the connection changes. */
export function useDataSaver() {
  const [pref, setPref] = useState(getDataSaverPref);
  const [slow, setSlow] = useState(connectionIsSlow);
  useEffect(() => {
    const onPref = () => setPref(getDataSaverPref());
    listeners.add(onPref);
    const c = connection();
    const onConn = () => setSlow(connectionIsSlow());
    c?.addEventListener?.('change', onConn);
    return () => {
      listeners.delete(onPref);
      c?.removeEventListener?.('change', onConn);
    };
  }, []);
  const active = pref === 'on' || (pref === 'auto' && slow);
  return [active, pref, setDataSaverPref];
}

/** Smaller cover for AniList images (medium ~100 px wide) when data saver is on. */
export function coverForMode(url, dataSaver) {
  const s = String(url || '');
  if (!dataSaver || !s) return s;
  return s.replace(/\/cover\/(?:extraLarge|large)\//, '/cover/medium/');
}
