import { useEffect } from 'react';
import { haptic } from './haptics.js';

/**
 * Drag down to dismiss a full-screen sheet. Starts only when the sheet is
 * scrolled to the top and the finger moves down; follows the finger with a
 * transform (no re-render per frame) and either closes (far / fast enough) or
 * springs back. `ignore(target)` can exclude areas such as the video or sliders.
 */
export default function useSwipeDismiss(ref, onDismiss, { enabled = true, ignore, distance = 130, velocity = 0.65 } = {}) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || typeof onDismiss !== 'function') return undefined;
    let startY = 0;
    let startX = 0;
    let startT = 0;
    let dy = 0;
    let tracking = false;
    let dragging = false;
    const reset = (animate) => {
      el.style.transition = animate ? 'transform 300ms cubic-bezier(0.22,1,0.36,1)' : '';
      el.style.transform = '';
      if (animate) setTimeout(() => { el.style.transition = ''; }, 320);
    };
    const onStart = (e) => {
      if (e.touches.length !== 1 || el.scrollTop > 0) return;
      if (ignore && ignore(e.target)) return;
      const t = e.touches[0];
      startY = t.clientY;
      startX = t.clientX;
      startT = performance.now();
      dy = 0;
      tracking = true;
      dragging = false;
    };
    const onMove = (e) => {
      if (!tracking) return;
      const t = e.touches[0];
      const ddy = t.clientY - startY;
      const ddx = t.clientX - startX;
      if (!dragging) {
        if (Math.abs(ddy) < 10 && Math.abs(ddx) < 10) return;
        if (ddy <= 0 || Math.abs(ddx) > Math.abs(ddy) || el.scrollTop > 0) {
          tracking = false;
          return;
        }
        dragging = true;
        el.style.transition = 'none';
        el.style.willChange = 'transform';
      }
      dy = Math.max(0, ddy);
      if (e.cancelable) e.preventDefault();
      el.style.transform = `translate3d(0, ${Math.round(dy)}px, 0)`;
    };
    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      el.style.willChange = '';
      if (!dragging) return;
      const v = dy / Math.max(1, performance.now() - startT);
      if (dy > distance || v > velocity) {
        haptic('tap');
        el.style.transition = 'transform 200ms cubic-bezier(0.4,0,1,1)';
        el.style.transform = 'translate3d(0, 100%, 0)';
        setTimeout(() => {
          onDismiss();
          el.style.transition = '';
          el.style.transform = '';
        }, 190);
      } else {
        reset(true);
      }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
      reset(false);
    };
  }, [ref, onDismiss, enabled, ignore, distance, velocity]);
}
