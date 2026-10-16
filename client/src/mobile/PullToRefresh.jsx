import React, { useEffect, useRef, useState } from 'react';
import BxIcon from './BxIcon.jsx';
import { haptic } from './haptics.js';

const THRESHOLD = 72;
const MAX_PULL = 120;

/**
 * Pull down at the top of the page to refresh. Only the indicator moves (one
 * transform per frame, no React state while dragging), horizontal swipes on rows
 * are ignored, and nothing happens unless the page is scrolled to the very top.
 */
export default function PullToRefresh({ onRefresh, disabled = false, children, label = 'اسحب للتحديث', releaseLabel = 'سيب للتحديث' }) {
  const indicatorRef = useRef(null);
  const textRef = useRef(null);
  const state = useRef({ startY: 0, startX: 0, pull: 0, active: false, decided: false, armed: false });
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (disabled) return undefined;
    const paint = (pull, animate = false) => {
      const el = indicatorRef.current;
      if (!el) return;
      const p = Math.min(1, pull / THRESHOLD);
      el.style.transition = animate ? 'transform 260ms cubic-bezier(0.22,1,0.36,1), opacity 200ms ease' : 'none';
      el.style.transform = `translate3d(-50%, ${Math.round(pull * 0.62 - 44)}px, 0) rotate(${Math.round(p * 270)}deg)`;
      el.style.opacity = String(Math.min(1, pull / 28));
    };
    const onStart = (e) => {
      if (busy.current || e.touches.length !== 1 || window.scrollY > 2) return;
      const t = e.touches[0];
      state.current = { startY: t.clientY, startX: t.clientX, pull: 0, active: true, decided: false, armed: false };
    };
    const onMove = (e) => {
      const s = state.current;
      if (!s.active) return;
      const t = e.touches[0];
      const dy = t.clientY - s.startY;
      const dx = t.clientX - s.startX;
      if (!s.decided) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        s.decided = true;
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || window.scrollY > 2) {
          s.active = false;
          return;
        }
      }
      s.pull = Math.min(MAX_PULL, Math.max(0, dy * 0.55));
      if (e.cancelable) e.preventDefault();
      const armed = s.pull >= THRESHOLD;
      if (armed !== s.armed) {
        s.armed = armed;
        if (armed) haptic('select');
        if (textRef.current) textRef.current.textContent = armed ? releaseLabel : label;
      }
      paint(s.pull);
    };
    const onEnd = async () => {
      const s = state.current;
      if (!s.active) return;
      s.active = false;
      if (s.pull >= THRESHOLD && typeof onRefresh === 'function') {
        busy.current = true;
        setRefreshing(true);
        paint(THRESHOLD, true);
        const started = Date.now();
        try {
          await onRefresh();
        } catch {
          /* the page shows its own error state */
        }
        const wait = Math.max(0, 650 - (Date.now() - started));
        setTimeout(() => {
          busy.current = false;
          setRefreshing(false);
          paint(0, true);
        }, wait);
      } else {
        paint(0, true);
      }
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [disabled, onRefresh, label, releaseLabel]);

  return (
    <>
      {!disabled && (
        <div ref={indicatorRef} className={`bx-ptr${refreshing ? ' is-refreshing' : ''}`} aria-hidden={!refreshing} role="status">
          <BxIcon name={refreshing ? 'loader' : 'refresh'} size="1.05em" strokeWidth={2.4} />
          <span ref={textRef} className="bx-ptr-label">{label}</span>
        </div>
      )}
      {children}
    </>
  );
}
