import React, { useRef } from 'react';
import BxIcon from './BxIcon.jsx';
import { coverForMode } from './dataSaver.js';
import { haptic } from './haptics.js';

const LONG_PRESS_MS = 460;
const MOVE_TOLERANCE = 10;

/**
 * The finger that made a long press is still down when the quick peek opens. When it is
 * lifted the browser may still send a click, and that click hits whatever opened under
 * the finger (the peek backdrop, which closed itself at once). Swallow exactly that one
 * click: anything after the release window is a new, deliberate tap.
 */
function swallowReleaseClick() {
  if (typeof document === 'undefined') return;
  let timer = 0;
  const done = () => {
    clearTimeout(timer);
    document.removeEventListener('click', swallow, true);
    window.removeEventListener('pointerup', onRelease, true);
    window.removeEventListener('pointercancel', onRelease, true);
  };
  const swallow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    done();
  };
  const onRelease = () => {
    clearTimeout(timer);
    timer = setTimeout(done, 350); // the click follows the release right away
  };
  document.addEventListener('click', swallow, true);
  window.addEventListener('pointerup', onRelease, true);
  window.addEventListener('pointercancel', onRelease, true);
  timer = setTimeout(done, 15000); // never keep listening if the release was missed
}

/**
 * Long-press support for cards: a press held still for ~0.46 s calls `onLongPress`
 * (the quick peek sheet) and swallows the click that the same finger's release makes.
 * Moving the finger (scrolling) or lifting early cancels it, so a normal tap still
 * opens the title.
 */
export function useLongPress(onLongPress) {
  const timer = useRef(null);
  const origin = useRef(null);
  const fired = useRef(false);

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  if (typeof onLongPress !== 'function') return { handlers: {}, consumeClick: () => false };

  const handlers = {
    onPointerDown: (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      fired.current = false;
      origin.current = { x: e.clientX, y: e.clientY };
      clear();
      timer.current = setTimeout(() => {
        timer.current = null;
        fired.current = true;
        haptic('select');
        swallowReleaseClick();
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e) => {
      if (!timer.current || !origin.current) return;
      if (Math.abs(e.clientX - origin.current.x) > MOVE_TOLERANCE || Math.abs(e.clientY - origin.current.y) > MOVE_TOLERANCE) clear();
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onContextMenu: (e) => e.preventDefault()
  };

  /** true when the click that follows a long-press must be ignored */
  const consumeClick = () => {
    if (!fired.current) return false;
    fired.current = false;
    return true;
  };

  return { handlers, consumeClick };
}

/**
 * The single poster card used by every rail and grid of the APK: cover art, ONE badge
 * (the real rating, or a rank/progress where that is the point of the row) and a title
 * that is laid out by its own script direction (English titles inside the Arabic UI).
 */
export default function PosterCard({
  item,
  onOpen,
  onPeek,
  dataSaver = false,
  width,
  subtitle,
  progress,
  badge,
  overlay,
  className = '',
  style
}) {
  const { handlers, consumeClick } = useLongPress(onPeek ? () => onPeek(item) : null);
  if (!item) return null;
  const title = item.titleEn || item.titleAr || item.name || '';
  const pct = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : null;
  const badgeNode =
    badge !== undefined ? (
      badge
    ) : item.rating ? (
      <>
        <BxIcon name="star" size="0.9em" filled />
        {item.rating}
      </>
    ) : null;

  return (
    <div
      className={`bx-poster bx-mob-card ${className}`.trim()}
      data-bx-oid={item.objectID}
      role="button"
      tabIndex={0}
      aria-label={title}
      style={width ? { ...style, '--w': typeof width === 'number' ? `${width}px` : width } : style}
      {...handlers}
      onClick={(e) => {
        if (consumeClick()) {
          e.preventDefault();
          return;
        }
        onOpen?.(item);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen?.(item);
      }}
    >
      <div className="bx-poster-art">
        <img src={coverForMode(item.poster || item.poster_uri, dataSaver)} alt="" loading="lazy" decoding="async" draggable={false} />
        {overlay || null}
        {badgeNode ? <span className="bx-badge">{badgeNode}</span> : null}
        {pct !== null && pct > 0 ? (
          <span className="bx-poster-progress" aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </span>
        ) : null}
      </div>
      <div className="bx-poster-title" dir="auto">
        {title}
      </div>
      {subtitle ? (
        <div className="bx-poster-sub" dir="auto">
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}
