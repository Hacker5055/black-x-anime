import React, { useCallback, useEffect, useRef, useState } from 'react';
import BxIcon from './BxIcon.jsx';

/**
 * Arrows are for mouse users. The first real mouse movement marks the page (`html.bx-has-mouse`);
 * touch never does, so phones and tablets keep plain finger-scrolled rails. (Media queries such
 * as `(hover: hover)` are wrong on many hybrid laptops and cannot be tested headless.)
 */
let mouseWatch = false;
function watchForMouse() {
  if (mouseWatch || typeof window === 'undefined') return;
  mouseWatch = true;
  const onMove = (e) => {
    if (e.pointerType !== 'mouse') return;
    document.documentElement.classList.add('bx-has-mouse');
    window.removeEventListener('pointermove', onMove, true);
  };
  window.addEventListener('pointermove', onMove, { capture: true, passive: true });
}

/**
 * A horizontal rail (`.bx-row.bx-mob-scroll`, finger-scrolled on phones) with previous / next
 * buttons for computers: they only show once a mouse is used (see above), only when the rail
 * can still move that way, and move it by about one screen of cards.
 * Works in RTL (Chrome reports a negative scrollLeft there).
 */
export default function ScrollRow({ className = '', children, label, rowRef: externalRef, ...rest }) {
  const innerRef = useRef(null);
  const ref = externalRef || innerRef;
  const [edges, setEdges] = useState({ back: false, forward: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft);
    const next = { back: pos > 4, forward: max - pos > 4 };
    setEdges((prev) => (prev.back === next.back && prev.forward === next.forward ? prev : next));
  }, [ref]);

  useEffect(() => {
    watchForMouse();
    const el = ref.current;
    if (!el) return undefined;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    let ro = null;
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    } else {
      window.addEventListener('resize', measure);
    }
    return () => {
      el.removeEventListener('scroll', measure);
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', measure);
    };
  }, [measure, ref]);

  // New cards (lazy lists) change the width without a resize.
  useEffect(() => {
    measure();
  });

  const move = (dir) => {
    const el = ref.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    const step = Math.max(160, el.clientWidth * 0.86) * dir * (rtl ? -1 : 1);
    try {
      el.scrollBy({ left: step, behavior: 'smooth' });
    } catch {
      el.scrollLeft += step;
    }
  };

  return (
    <div className="bx-rail-wrap">
      <div ref={ref} className={`bx-row bx-mob-scroll ${className}`.trim()} {...rest}>
        {children}
      </div>
      <button
        type="button"
        className={`bx-rail-arrow is-back${edges.back ? ' is-on' : ''}`}
        aria-label={label ? `${label} — back` : 'Back'}
        tabIndex={edges.back ? 0 : -1}
        onClick={() => move(-1)}
      >
        <BxIcon name="chevron-right" className="bx-rail-ico-back" />
      </button>
      <button
        type="button"
        className={`bx-rail-arrow is-forward${edges.forward ? ' is-on' : ''}`}
        aria-label={label ? `${label} — more` : 'More'}
        tabIndex={edges.forward ? 0 : -1}
        onClick={() => move(1)}
      >
        <BxIcon name="chevron-left" className="bx-rail-ico-forward" />
      </button>
    </div>
  );
}
