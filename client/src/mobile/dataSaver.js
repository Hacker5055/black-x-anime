/**
 * Data saver: 'auto' (follow Android's Data Saver / slow connections), 'cellular' (also on
 * mobile data — added 2026-10-17), 'on', 'off'.
 * When active the app loads smaller covers, never autoplays trailers, starts HLS at
 * the lowest quality and prefers lower-quality servers.
 */
import { useEffect, useState } from 'react';

const KEY = 'bx_mob_data_saver';
const listeners = new Set();

export function getDataSaverPref() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'on' || v === 'off' || v === 'cellular' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function setDataSaverPref(value) {
  const next = value === 'on' || value === 'off' || value === 'cellular' ? value : 'auto';
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

/** Mobile data, where the browser / WebView says so (Android; desktop browsers never do). */
export function connectionIsCellular() {
  const c = connection();
  return Boolean(c && c.type === 'cellular');
}

export function dataSaverFor(pref, slow, cellular) {
  if (pref === 'on') return true;
  if (pref === 'off') return false;
  if (pref === 'cellular') return Boolean(slow || cellular);
  return Boolean(slow);
}

export function isDataSaverActive(pref = getDataSaverPref()) {
  return dataSaverFor(pref, connectionIsSlow(), connectionIsCellular());
}

/** [active, pref, setPref] — updates when the setting or the connection changes. */
export function useDataSaver() {
  const [pref, setPref] = useState(getDataSaverPref);
  const [slow, setSlow] = useState(connectionIsSlow);
  const [cellular, setCellular] = useState(connectionIsCellular);
  useEffect(() => {
    const onPref = () => setPref(getDataSaverPref());
    listeners.add(onPref);
    const c = connection();
    const onConn = () => {
      setSlow(connectionIsSlow());
      setCellular(connectionIsCellular());
    };
    c?.addEventListener?.('change', onConn);
    return () => {
      listeners.delete(onPref);
      c?.removeEventListener?.('change', onConn);
    };
  }, []);
  const active = dataSaverFor(pref, slow, cellular);
  return [active, pref, setDataSaverPref];
}

/** Smaller cover for AniList images (medium ~100 px wide) when data saver is on. */
export function coverForMode(url, dataSaver) {
  const s = String(url || '');
  if (!dataSaver || !s) return s;
  return s.replace(/\/cover\/(?:extraLarge|large)\//, '/cover/medium/');
}
