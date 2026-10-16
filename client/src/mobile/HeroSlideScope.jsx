import { useEffect, useRef, useState } from 'react';
import { haptic } from './haptics.js';

/**
 * Owns the hero slide index + auto-advance timer, so the 5-second slide change
 * re-renders only the hero area instead of the whole app. Also provides swipe
 * handlers (left/right) for the hero. Render prop: children(slide, setSlide, swipe).
 */
export default function HeroSlideScope({ count, paused = false, intervalMs = 5200, children }) {
  const [slide, setSlide] = useState(0);
  const [hold, setHold] = useState(false);
  const touch = useRef(null);

  useEffect(() => {
    if (count > 0 && slide >= count) setSlide(0);
  }, [count, slide]);

  useEffect(() => {
    if (!count || paused || hold) return undefined;
    const timer = setInterval(() => setSlide((prev) => (prev + 1) % count), intervalMs);
    return () => clearInterval(timer);
  }, [count, paused, hold, intervalMs]);

  const swipe = {
    onTouchStart: (e) => {
      if (e.touches.length !== 1) return;
      touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
      setHold(true);
    },
    onTouchEnd: (e) => {
      const start = touch.current;
      touch.current = null;
      setHold(false);
      if (!start || !count) return;
      const t = e.changedTouches?.[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
      const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
      const forward = rtl ? dx > 0 : dx < 0;
      haptic('select');
      setSlide((prev) => (forward ? (prev + 1) % count : (prev - 1 + count) % count));
    },
    onTouchCancel: () => {
      touch.current = null;
      setHold(false);
    }
  };

  return children(slide, setSlide, swipe);
}
