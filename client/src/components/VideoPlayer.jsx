import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';

const fmt = (s) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
};

const proxied = (url) => (url ? `/api/stream/proxy?url=${encodeURIComponent(url)}` : url);

/**
 * BLACK X custom player — liquid glass chrome over an HTML5 <video>,
 * with an embed fallback frame for servers without direct files.
 *
 * `entries`   — manifest servers (id, token, server, quality, version, lang)
 * `resolved`  — { [entryId]: { embedUrl, directUrl } }
 * `onResolve(entry)` — resolves one entry on demand (returns the source)
 */
export default function VideoPlayer({
  entries = [],
  resolved = {},
  onResolve,
  title,
  episodeLabel,
  startTime = 0,
  onProgress,
  onEnded,
  onNext,
  onPrev,
  nextLabel,
  resumePrompt = false
}) {
  const { t } = useI18n();
  const videoRef = useRef(null);
  const shellRef = useRef(null);
  const hideTimer = useRef(null);
  const lastSave = useRef(0);

  const [activeId, setActiveId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [buffering, setBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showResume, setShowResume] = useState(resumePrompt && startTime > 30);
  const [ended, setEnded] = useState(false);
  const [panel, setPanel] = useState(false);

  const active = useMemo(() => entries.find((e) => e.id === activeId) || entries[0] || null, [entries, activeId]);
  const activeSource = active ? resolved[active.id] : null;
  const embedMode = Boolean(activeSource && !activeSource.directUrl);

  // auto-pick the first entry (server side pre-resolves the best candidate)
  useEffect(() => {
    if (!activeId && entries.length) setActiveId(entries[0].id);
  }, [entries, activeId]);

  /* ------------------------------ controls ------------------------------ */
  const wake = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused) setShowControls(false);
    }, 2800);
  }, []);

  const save = useCallback(
    (force = false) => {
      const v = videoRef.current;
      if (!v || embedMode || !onProgress) return;
      const now = Date.now();
      if (!force && now - lastSave.current < 5000) return;
      lastSave.current = now;
      onProgress(v.currentTime, v.duration || 0);
    },
    [embedMode, onProgress]
  );

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (embedMode || !v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
    wake();
  }, [embedMode, wake]);

  const seekBy = useCallback(
    (delta) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
      wake();
    },
    [wake]
  );

  const pickSource = useCallback(
    async (entry) => {
      if (!entry) return;
      setEnded(false);
      setActiveId(entry.id);
      if (!resolved[entry.id] && onResolve) {
        setBusyId(entry.id);
        try {
          await onResolve(entry);
        } finally {
          setBusyId(null);
        }
      }
    },
    [resolved, onResolve]
  );

  // keyboard shortcuts
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowright':
          e.preventDefault();
          seekBy(5);
          break;
        case 'arrowleft':
          e.preventDefault();
          seekBy(-5);
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume((v) => Math.min(1, v + 0.1));
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume((v) => Math.max(0, v - 0.1));
          break;
        case 'm':
          setMuted((m) => !m);
          break;
        case 'f':
          toggleFullscreen();
          break;
        default:
      }
    };
    shell.addEventListener('keydown', onKey);
    return () => shell.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [togglePlay, seekBy]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    v.volume = volume;
    v.muted = muted;
    v.playbackRate = speed;
  }, [volume, muted, speed, active?.id, activeSource]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);
  useEffect(() => {
    const onHide = () => save(true);
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('beforeunload', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [save]);

  const toggleFullscreen = () => {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  };

  const togglePip = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch { /* unsupported */ }
  };

  const seekTo = (e) => {
    const v = videoRef.current;
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const rtl = document.documentElement.dir === 'rtl';
    const r = rtl ? 1 - ratio : ratio;
    if (v && duration) {
      v.currentTime = Math.max(0, Math.min(duration, r * duration));
      setCurrent(v.currentTime);
    }
    wake();
  };

  const percent = duration ? (current / duration) * 100 : 0;
  const resumingSource = active && !activeSource && busyId === active?.id;

  /* ------------------------------- render ------------------------------- */
  return (
    <div
      className="player-shell glass"
      ref={shellRef}
      tabIndex={0}
      onMouseMove={wake}
      onTouchStart={wake}
      data-controls={showControls || !playing ? 'on' : 'off'}
    >
      <div className="player-stage" onClick={embedMode ? undefined : togglePlay}>
        {resumingSource || (!activeSource && !ended) ? (
          <div className="player-stage" style={{ display: 'grid', placeItems: 'center', cursor: 'default' }}>
            <div className="liquid-loader">
              <div className="liquid-loader__blobs">
                <div className="liquid-loader__blob" />
                <div className="liquid-loader__blob" />
                <div className="liquid-loader__blob" />
              </div>
              <div>{t('watch.loadingSources')}</div>
            </div>
          </div>
        ) : embedMode ? (
          <iframe
            key={active.id}
            className="player-embed"
            src={activeSource.embedUrl}
            title={title}
            allow="autoplay *; encrypted-media *; picture-in-picture *; fullscreen *"
            allowFullScreen
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-orientation-lock"
          />
        ) : (
          <video
            key={active?.id || 'none'}
            ref={videoRef}
            className="player-video"
            src={activeSource ? proxied(activeSource.directUrl) : undefined}
            playsInline
            preload="metadata"
            onPlay={() => { setPlaying(true); setEnded(false); wake(); }}
            onPause={() => { setPlaying(false); setShowControls(true); save(true); }}
            onTimeUpdate={(e) => { setCurrent(e.target.currentTime); save(); }}
            onLoadedMetadata={(e) => {
              setDuration(e.target.duration || 0);
              if (startTime > 0 && e.target.currentTime < 1 && showResume) {
                e.target.currentTime = startTime;
              }
            }}
            onWaiting={() => setBuffering(true)}
            onPlaying={() => setBuffering(false)}
            onEnded={() => { setEnded(true); setPlaying(false); setShowControls(true); save(true); onEnded?.(); }}
            onError={() => setBuffering(false)}
          />
        )}

        {/* center play overlay */}
        {activeSource?.directUrl && !playing && !ended && (
          <button type="button" className="player-bigplay" onClick={togglePlay} aria-label={t('common.play')}>
            <span className="player-bigplay__ring" />
            <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5-11-6.5z" />
            </svg>
          </button>
        )}

        {buffering && activeSource?.directUrl && (
          <div className="player-buffer" role="status">
            <div className="liquid-loader__blobs">
              <div className="liquid-loader__blob" />
              <div className="liquid-loader__blob" />
              <div className="liquid-loader__blob" />
            </div>
            <span>{t('watch.buffering')}</span>
          </div>
        )}

        {showResume && activeSource?.directUrl && (
          <div className="player-resume glass glass--strong">
            <div className="player-resume__text">{t('watch.resumeAt', { time: fmt(startTime) })}</div>
            <div className="player-resume__row">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => {
                  const v = videoRef.current;
                  if (v) { v.currentTime = startTime; v.play().catch(() => {}); }
                  setShowResume(false);
                }}
              >
                <span className="btn__shine" />▶ {t('common.continue')}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  const v = videoRef.current;
                  if (v) { v.currentTime = 0; v.play().catch(() => {}); }
                  setShowResume(false);
                }}
              >
                ⟲ {t('watch.restart')}
              </button>
            </div>
          </div>
        )}

        {ended && (
          <div className="player-ended glass glass--strong">
            <div style={{ fontSize: '2.1rem' }}>🎉</div>
            <h3>{t('watch.ended')}</h3>
            <div className="player-ended__row">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  const v = videoRef.current;
                  if (v) { v.currentTime = 0; v.play().catch(() => {}); }
                  setEnded(false);
                }}
              >
                ⟲ {t('watch.restart')}
              </button>
              {onNext && (
                <button type="button" className="btn btn--primary btn--sm" onClick={onNext}>
                  <span className="btn__shine" />▶ {nextLabel || t('watch.nextEpisode')}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="player-top">
          <div className="player-top__title">
            <strong>{title}</strong>
            {episodeLabel && <span className="player-top__ep">{episodeLabel}</span>}
          </div>
          {embedMode && active && (
            <div className="player-top__via">{t('watch.playingVia', { server: active.server })}</div>
          )}
        </div>
      </div>

      {/* glass control bar */}
      {!embedMode && (
        <div className="player-bar">
          <div className="player-scrub" onClick={seekTo} role="slider" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
            <div className="player-scrub__track">
              <div className="player-scrub__fill" style={{ width: `${percent}%` }} />
              <div className="player-scrub__thumb" style={{ insetInlineStart: `${percent}%` }} />
            </div>
          </div>

          <div className="player-bar__row">
            <button type="button" className="player-btn" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2" /><rect x="14" y="5" width="4" height="14" rx="1.2" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>
              )}
            </button>
            {onPrev && (
              <button type="button" className="player-btn" onClick={onPrev} title={t('watch.prevEpisode')}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7 6h2v12H7zM19 6v12l-9-6 9-6z" /></svg>
              </button>
            )}
            {onNext && (
              <button type="button" className="player-btn" onClick={onNext} title={t('watch.nextEpisode')}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15 6h2v12h-2zM5 6v12l9-6-9-6z" /></svg>
              </button>
            )}

            <div className="player-time">
              <span>{fmt(current)}</span>
              <span className="player-time__sep">/</span>
              <span>{fmt(duration)}</span>
            </div>

            <div className="player-bar__spacer" />

            <div className="player-vol">
              <button type="button" className="player-btn" onClick={() => setMuted((m) => !m)} aria-label={t('watch.mute')}>
                {muted || volume === 0 ? '🔇' : '🔊'}
              </button>
              <input
                className="player-vol__range"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  setMuted(Number(e.target.value) === 0);
                }}
                aria-label={t('watch.volume')}
              />
            </div>

            <select
              className="player-speed"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              aria-label={t('watch.speed')}
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                <option key={s} value={s}>{s}×</option>
              ))}
            </select>

            <button type="button" className="player-btn" onClick={togglePip} title={t('watch.pip')}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="18" height="14" rx="2.5" />
                <rect x="12" y="11" width="7" height="6" rx="1.5" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <button type="button" className="player-btn" onClick={toggleFullscreen} title={t('watch.fullscreen')}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* sources drawer */}
      {entries.length > 0 && (
        <div className={`player-sources ${panel ? 'open' : ''}`}>
          <button type="button" className="player-sources__toggle" onClick={() => setPanel((v) => !v)}>
            <span>⚙</span> {t('watch.sources')}
            {active && <em>{active.server}{active.quality ? ` · ${active.quality}` : ''}</em>}
          </button>
          {panel && (
            <div className="player-sources__list glass glass--strong">
              {entries.map((e) => {
                const src = resolved[e.id];
                return (
                  <button
                    key={e.id}
                    type="button"
                    className={`chip ${active?.id === e.id ? 'active' : ''}`}
                    onClick={() => { pickSource(e); setPanel(false); }}
                  >
                    {busyId === e.id ? '⏳' : e.server}
                    <span style={{ opacity: 0.7 }}>
                      {[e.quality, e.version === 'dub' ? t('watch.dub') : t('watch.sub'),
                        src ? (src.directUrl ? 'MP4' : 'EMBED') : '…']
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
