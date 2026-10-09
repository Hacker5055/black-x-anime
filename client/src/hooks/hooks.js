import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Extract a vivid dominant color from an image URL (canvas sampling).
 * Falls back to the given default (usually AniList's coverImage.color).
 */
export function useDominantColor(imageUrl, fallback = '#8b5cf6') {
  const [color, setColor] = useState(fallback);

  useEffect(() => {
    setColor(fallback); // reset when the image changes
    if (!imageUrl) return undefined;

    let cancelled = false;
    let retried = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (cancelled) return;
      try {
        const size = 40;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let best = null;
        let bestScore = -1;
        for (let i = 0; i < data.length; i += 16) { // sample every 4th pixel
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          const lum = (r + g + b) / 765;
          // prefer saturated mid-tones — vivid poster colors
          const score = sat * 1.8 + (lum > 0.18 && lum < 0.82 ? 0.6 : 0) + lum * 0.25;
          if (score > bestScore) {
            bestScore = score;
            best = { r, g, b };
          }
        }
        if (best && !cancelled) {
          const hex = '#' + [best.r, best.g, best.b].map((v) => v.toString(16).padStart(2, '0')).join('');
          setColor(hex);
        }
      } catch {
        // CORS or decode failure — keep fallback
      }
    };

    img.onerror = () => {
      // One retry through our same-origin proxy (CORS-proof color extraction).
      if (!cancelled && !retried && imageUrl.includes('s4.anilist.co')) {
        retried = true;
        img.src = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
      }
      // else: keep the fallback color
    };
    // Prefer the same-origin proxy for AniList CDN assets (avoids CORS flakiness).
    img.src = imageUrl.includes('s4.anilist.co')
      ? `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
      : imageUrl;
    return () => { cancelled = true; };
  }, [imageUrl, fallback]);

  return color;
}

/**
 * Push a hex color into CSS custom properties so the whole app's glow
 * (backdrop orbs, hover shadows, hero) reflects the viewed poster.
 */
export function applyLiveColor(hex) {
  if (!hex || typeof document === 'undefined') return;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const root = document.documentElement.style;
  root.setProperty('--live', hex);
  root.setProperty('--live-rgb', `${r}, ${g}, ${b}`);
}

export function hexToRgbString(hex, fallback = '139, 92, 246') {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/** Simple async fetcher with reload support. */
export function useAsync(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    fnRef.current()
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [...deps, reload]);

  return { data, error, loading, reload, setData };
}

/** Flashy toast queue (module-level so any component can push). */
const toastListeners = new Set();
let toastId = 0;
export function pushToast(message, kind = 'info') {
  const payload = { id: ++toastId, message, kind };
  toastListeners.forEach((fn) => fn(payload));
}
export function useToasts() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const fn = (payload) => {
      setToasts((t) => [...t, payload]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== payload.id)), 2600);
    };
    toastListeners.add(fn);
    return () => toastListeners.delete(fn);
  }, []);
  return toasts;
}
