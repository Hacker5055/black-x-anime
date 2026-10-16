import React, { useEffect, useRef, useState } from 'react';
import BxIcon from './BxIcon.jsx';
import { haptic } from './haptics.js';
import { showToastMessage } from './toastStore.js';

/**
 * "Skip intro / recap / outro" button driven by real AniSkip timestamps. It
 * listens to the video's timeupdate itself, so only this button re-renders while
 * the video plays. Auto-skip (when the user enabled it) only uses real intervals —
 * never a blind jump to a fixed second.
 */
export function SkipSegmentOverlay({ videoRef, segments, autoSkip = false, isRtl, onOutroSkip, episodeId }) {
  const [current, setCurrent] = useState(null);
  const skipped = useRef(new Set());

  useEffect(() => {
    skipped.current = new Set();
    setCurrent(null);
  }, [episodeId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !Array.isArray(segments) || !segments.length) {
      setCurrent(null);
      return undefined;
    }
    const onTime = () => {
      const t = video.currentTime || 0;
      const seg = segments.find((s) => t >= s.start && t < s.end - 1) || null;
      if (seg && autoSkip && (seg.type === 'op' || seg.type === 'recap') && !skipped.current.has(`${seg.type}:${seg.start}`)) {
        skipped.current.add(`${seg.type}:${seg.start}`);
        video.currentTime = seg.end;
        showToastMessage(isRtl ? (seg.type === 'op' ? 'اتخطت المقدمة تلقائياً' : 'اتخطى الملخص تلقائياً') : 'Skipped automatically', 'skip-forward');
        setCurrent(null);
        return;
      }
      setCurrent((prev) => (prev === seg || (prev && seg && prev.start === seg.start && prev.type === seg.type) ? prev : seg));
    };
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('seeked', onTime);
    onTime();
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('seeked', onTime);
    };
  }, [videoRef, segments, autoSkip, isRtl, episodeId]);

  if (!current) return null;
  const label =
    current.type === 'op'
      ? isRtl ? 'تخطي المقدمة' : 'Skip intro'
      : current.type === 'recap'
        ? isRtl ? 'تخطي الملخص' : 'Skip recap'
        : isRtl ? 'تخطي النهاية' : 'Skip outro';
  return (
    <button
      type="button"
      className="bx-skip-btn bx-pop"
      onClick={(e) => {
        e.stopPropagation();
        haptic('tap');
        const video = videoRef.current;
        if (!video) return;
        const atEnd = current.type === 'ed' && (!video.duration || current.end >= video.duration - 10);
        if (atEnd && typeof onOutroSkip === 'function') onOutroSkip();
        else video.currentTime = current.end;
        setCurrent(null);
      }}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <BxIcon name="skip-forward" className="bx-ico-lead" />
      {label}
    </button>
  );
}

/** "Next episode in 5…" card shown when an episode ends (instead of an instant jump). */
export function NextEpisodeCountdown({ open, seconds = 5, title, subtitle, onPlay, onCancel, isRtl }) {
  const [left, setLeft] = useState(seconds);
  const playRef = useRef(onPlay);
  playRef.current = onPlay;

  useEffect(() => {
    if (!open) return undefined;
    setLeft(seconds);
    const started = Date.now();
    const timer = setInterval(() => {
      const remaining = seconds - Math.floor((Date.now() - started) / 1000);
      if (remaining <= 0) {
        clearInterval(timer);
        playRef.current?.();
      } else {
        setLeft(remaining);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [open, seconds]);

  if (!open) return null;
  return (
    <div className="bx-next-card bx-pop" role="dialog" aria-live="polite" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
      <div className="bx-next-ring" style={{ '--bx-next-dur': `${seconds}s` }} aria-hidden="true">
        <svg viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="19" className="bx-next-track" />
          <circle cx="22" cy="22" r="19" className="bx-next-progress" />
        </svg>
        <span>{left}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="bx-next-kicker">{isRtl ? 'الحلقة الجاية' : 'Next episode'}</div>
        <div className="bx-next-title">{title}</div>
        {subtitle && <div className="bx-next-sub">{subtitle}</div>}
      </div>
      <div className="bx-next-actions">
        <button
          type="button"
          className="bx-next-play"
          onClick={() => {
            haptic('success');
            playRef.current?.();
          }}
        >
          <BxIcon name="play" className="bx-ico-lead" />
          {isRtl ? 'شغّل' : 'Play'}
        </button>
        <button
          type="button"
          className="bx-next-cancel"
          onClick={() => {
            haptic('tap');
            onCancel?.();
          }}
        >
          {isRtl ? 'إلغاء' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}
