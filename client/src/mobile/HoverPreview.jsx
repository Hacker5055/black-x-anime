import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import BxIcon from './BxIcon.jsx';
import { coverForMode } from './dataSaver.js';
import { hoverClose, hoverKeep, hoverLeave, setHoverListener } from './hoverPreview.js';

const NO_STORY = new Set(['مفيش ملخص للعمل ده لسه.', '']);

/**
 * Computer only (website): rest the mouse on a poster and this card opens over it with the
 * title's real details — the catalogue fields it has, nothing filled in — and play / details
 * / my-list buttons. Mounted once by MobileApkApp on the website; posters report the hover
 * through hoverPreview.js.
 */
export default function HoverPreview({ isRtl, dataSaver, isFavorite, onPlay, onToggleFavorite }) {
  const [state, setState] = useState(null);
  const [pos, setPos] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    setHoverListener(setState);
    return () => setHoverListener(null);
  }, []);

  useEffect(() => {
    if (!state) return undefined;
    const close = () => hoverClose();
    const onKey = (e) => {
      if (e.key === 'Escape') hoverClose();
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', close);
    };
  }, [state]);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!state || !el) {
      setPos(null);
      return;
    }
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const r = state.rect;
    const left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2));
    const top = Math.max(12, Math.min(window.innerHeight - h - 12, r.top + r.height / 2 - h / 2));
    setPos({ left, top });
  }, [state]);

  if (!state) return null;
  const { item, onOpen } = state;
  const title = item.titleEn || item.titleAr || item.name || '';
  const meta = [item.year, item.type, item.state, item.season, item.rating ? `★ ${item.rating}` : ''].map((x) => String(x || '').trim()).filter(Boolean);
  const tags = (Array.isArray(item.tags) ? item.tags : []).slice(0, 4);
  const rawStory = String((isRtl ? item.storyAr : item.storyEn || item.storyAr) || '').trim();
  const story = NO_STORY.has(rawStory) ? '' : rawStory;
  const fav = Boolean(isFavorite?.(item));

  return (
    <div
      ref={cardRef}
      className={`bx-hover-card${pos ? ' is-in' : ''}`}
      style={pos ? { left: `${pos.left}px`, top: `${pos.top}px` } : { left: 0, top: 0, visibility: 'hidden' }}
      onPointerEnter={hoverKeep}
      onPointerLeave={hoverLeave}
      role="dialog"
      aria-label={title}
      data-bx-hover={item.objectID || ''}
    >
      <button
        type="button"
        className="bx-hover-art"
        onClick={() => {
          hoverClose();
          onOpen?.(item);
        }}
        aria-label={isRtl ? 'التفاصيل' : 'Details'}
      >
        <img src={coverForMode(item.banner || item.poster, dataSaver)} alt="" draggable={false} />
      </button>
      <div className="bx-hover-body">
        <h3 dir="auto">{title}</h3>
        {meta.length ? <p className="bx-hover-meta">{meta.join(' • ')}</p> : null}
        {tags.length ? (
          <div className="bx-hover-tags">
            {tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        ) : null}
        {story ? (
          <p className="bx-hover-story" dir="auto">
            {story}
          </p>
        ) : null}
        <div className="bx-hover-actions">
          <button
            type="button"
            className="bx-btn"
            onClick={() => {
              hoverClose();
              onPlay?.(item);
            }}
          >
            <BxIcon name="play" filled />
            {isRtl ? 'شاهد' : 'Play'}
          </button>
          <button
            type="button"
            className="bx-btn bx-btn-outline"
            onClick={() => {
              hoverClose();
              onOpen?.(item);
            }}
          >
            <BxIcon name="info" />
            {isRtl ? 'التفاصيل' : 'Details'}
          </button>
          <button
            type="button"
            className={`bx-icon-btn${fav ? ' is-active' : ''}`}
            aria-label={fav ? (isRtl ? 'شيل من قائمتي' : 'Remove from my list') : isRtl ? 'ضيف لقائمتي' : 'Add to my list'}
            aria-pressed={fav}
            onClick={() => onToggleFavorite?.(item)}
          >
            <BxIcon name={fav ? 'check' : 'plus'} />
          </button>
        </div>
      </div>
    </div>
  );
}
