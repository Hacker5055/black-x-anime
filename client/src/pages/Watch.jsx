import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { useAsync, applyLiveColor, useDominantColor, pushToast } from '../hooks/hooks.js';
import VideoPlayer from '../components/VideoPlayer.jsx';
import { DownloadModal } from '../components/DownloadModal.jsx';
import { LiquidLoader, EmptyState } from '../components/Loading.jsx';
import { auth, syncProgressToFirestore, syncFavoriteToFirestore, removeFavoriteFromFirestore } from '../firebase.js';

export default function Watch({ onOpenAuth }) {
  const { slug, ep } = useParams();
  const episode = Number(ep) || 1;
  const navigate = useNavigate();
  const { t, lang, formatNumber } = useI18n();
  const { user } = useAuth();

  const showQuery = useAsync(() => api.get(`/api/stream/show/${slug}`), [slug]);
  const [episodeData, setEpisodeData] = useState(null); // { entries, downloads, resolved, resolvedDownloads }
  const [sourcesError, setSourcesError] = useState(false);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [resumeAt, setResumeAt] = useState(0);
  const [fav, setFav] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const saveRef = useRef(null);
  const lastPos = useRef({ pos: 0, dur: 0 });

  const show = showQuery.data?.show;
  const color = useDominantColor(show?.poster, '#22d3ee');

  useEffect(() => {
    if (color) applyLiveColor(color);
    return () => applyLiveColor('#8b5cf6');
  }, [color]);

  /* ------------------------------ sources ------------------------------ */
  const loadSources = useCallback(() => {
    setSourcesLoading(true);
    setSourcesError(false);
    setEpisodeData(null);
    api.get(`/api/stream/episode/${slug}/${episode}`)
      .then((d) => {
        if (!d?.entries?.length && !d?.downloads?.length) throw new Error('empty');
        setEpisodeData({
          entries: d.entries || [],
          downloads: d.downloads || [],
          resolved: d.resolved || {},
          resolvedDownloads: d.resolvedDownloads || {}
        });
        // auto-resolve the first server so playback starts immediately
        const first = d.entries?.[0];
        if (first && !d.resolved?.[first.id]) {
          resolveEntryRef.current?.(first);
        }
      })
      .catch(() => setSourcesError(true))
      .finally(() => setSourcesLoading(false));
  }, [slug, episode]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  /** Resolve one manifest server on demand (stream gate → embed/direct). */
  const resolveEntry = useCallback(async (entry) => {
    try {
      const d = await api.post('/api/stream/resolve', {
        slug,
        episode,
        entryId: entry.id
      });
      setEpisodeData((prev) => (prev
        ? { ...prev, resolved: { ...prev.resolved, [entry.id]: d.source } }
        : prev));
      return d.source;
    } catch {
      pushToast(t('watch.sourceError'), 'error');
      return null;
    }
  }, [slug, episode, t]);
  const resolveEntryRef = useRef(null);
  resolveEntryRef.current = resolveEntry;

  /** Resolve one download server on demand (download gate → direct/link). */
  const resolveDownload = useCallback(async (entry) => {
    try {
      const d = await api.post('/api/stream/resolve-download', {
        slug,
        episode,
        entryId: entry.id
      });
      setEpisodeData((prev) => (prev
        ? {
            ...prev,
            resolvedDownloads: { ...(prev.resolvedDownloads || {}), [entry.id]: d.source }
          }
        : prev));
      return d.source;
    } catch {
      pushToast(t('watch.sourceError'), 'error');
      return null;
    }
  }, [slug, episode, t]);

  /* --------------------------- library state --------------------------- */
  useEffect(() => {
    if (!user) { setFav(false); setResumeAt(0); return undefined; }
    let alive = true;
    api.get(`/api/library/favorites/${slug}`).then((d) => alive && setFav(d.favorite)).catch(() => {});
    api.get(`/api/library/progress/${slug}/${episode}`)
      .then((d) => {
        if (!alive) return;
        const p = d.progress;
        if (p && !p.completed && p.position > 25 && p.duration && p.position / p.duration < 0.95) {
          setResumeAt(p.position);
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [user, slug, episode]);

  const saveProgress = useCallback(
    (position, duration, completed) => {
      if (!user) return;
      const pos = Math.max(0, Math.min(Number(position) || 0, 24 * 3600));
      const dur = Math.max(0, Math.min(Number(duration) || 0, 24 * 3600));
      if (!completed && dur > 0 && pos < 1) return; // don't spam t=0 rows
      const payload = {
        position: Math.floor(pos),
        duration: Math.floor(dur),
        completed: completed === true,
        titleEn: show?.titleEn || slug,
        titleAr: show?.titleAr || null,
        poster: show?.poster || null
      };
      api.put(`/api/library/progress/${slug}/${episode}`, payload).catch(() => {});
      if (auth.currentUser) {
        syncProgressToFirestore(auth.currentUser.uid, { slug, episode, ...payload }).catch(() => {});
      }
    },
    [user, slug, episode, show]
  );

  const markWatched = useCallback(() => {
    saveProgress(lastPos.current.pos || 0, lastPos.current.dur || 0, true);
    pushToast(t('toast.saved'), 'success');
  }, [saveProgress, t]);

  // debounce-ish save wrapper
  saveRef.current = saveProgress;

  const toggleFav = async () => {
    if (!user) { onOpenAuth('login'); return; }
    const prev = fav;
    setFav(!prev);
    try {
      if (prev) {
        await api.del(`/api/library/favorites/${slug}`);
        if (auth.currentUser) {
          removeFavoriteFromFirestore(auth.currentUser.uid, slug).catch(() => {});
        }
        pushToast(t('toast.favoriteRemoved'), 'success');
      } else {
        const favPayload = {
          titleEn: show?.titleEn || slug,
          titleAr: show?.titleAr,
          poster: show?.poster,
          banner: show?.banner,
          episodes: show?.episodeCount
        };
        await api.put(`/api/library/favorites/${slug}`, favPayload);
        if (auth.currentUser) {
          syncFavoriteToFirestore(auth.currentUser.uid, { slug, ...favPayload }).catch(() => {});
        }
        pushToast(t('toast.favoriteAdded'), 'success');
      }
    } catch {
      setFav(prev);
    }
  };

  /* ------------------------------ nav ------------------------------ */
  const episodes = show?.episodes || [];
  const idx = episodes.findIndex((e) => e.episode === episode);
  const prevEp = idx > 0 ? episodes[idx - 1] : null;
  const nextEp = idx >= 0 && idx < episodes.length - 1 ? episodes[idx + 1] : null;

  const title = show ? ((lang === 'ar' ? show.titleAr : show.titleEn) || show.titleEn) : slug;

  if (showQuery.loading && sourcesLoading) return <LiquidLoader />;
  if (showQuery.error && !show) {
    return (
      <div className="glass" style={{ padding: '2.5rem' }}>
        <EmptyState icon="🔍" title={t('show.notFound')}>
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/browse')}>{t('common.back')}</button>
        </EmptyState>
      </div>
    );
  }

  return (
    <>
      <div className="watch-layout">
        <div className="watch-main">
          {/* ---------- the player ---------- */}
          {sourcesLoading ? (
            <div className="player-shell glass">
              <div className="player-stage" style={{ display: 'grid', placeItems: 'center', minHeight: '320px' }}>
                <div className="liquid-loader">
                  <div className="liquid-loader__blobs">
                    <div className="liquid-loader__blob" />
                    <div className="liquid-loader__blob" />
                    <div className="liquid-loader__blob" />
                  </div>
                  <div>{t('watch.loadingSources')}</div>
                </div>
              </div>
            </div>
          ) : sourcesError || !episodeData ? (
            <div className="player-shell glass">
              <div className="player-stage" style={{ display: 'grid', placeItems: 'center', minHeight: '320px' }}>
                <EmptyState icon="📡" title={t('watch.noSources')} sub={t('dashboard.sourceDown')}>
                  <button type="button" className="btn btn--primary" onClick={loadSources}>
                    <span className="btn__shine" />
                    {t('common.retry')}
                  </button>
                </EmptyState>
              </div>
            </div>
          ) : (
            <VideoPlayer
              entries={episodeData.entries}
              resolved={episodeData.resolved}
              onResolve={resolveEntry}
              onOpenDownload={() => setDownloadModalOpen(true)}
              title={title}
              episodeLabel={t('watch.episodePicker', { n: formatNumber(episode) })}
              startTime={resumeAt}
              resumePrompt={resumeAt > 0}
              onProgress={(pos, dur) => {
                lastPos.current = { pos, dur };
                saveRef.current?.(pos, dur);
              }}
              onEnded={() => saveRef.current?.(lastPos.current.pos, lastPos.current.dur || lastPos.current.pos, true)}
              onPrev={prevEp ? () => navigate(`/watch/${slug}/${prevEp.episode}`) : null}
              onNext={nextEp ? () => navigate(`/watch/${slug}/${nextEp.episode}`) : null}
              nextLabel={nextEp ? t('watch.episodePicker', { n: formatNumber(nextEp.episode) }) : null}
            />
          )}

          {/* ---------- meta under player ---------- */}
          <div className="watch-meta glass reveal">
            <div style={{ flex: 1, minWidth: '220px' }}>
              <div className="watch-meta__kicker">
                <Link to={`/show/${slug}`}>{title}</Link>
                {show?.titleAr && lang !== 'ar' && <span> · {show.titleAr}</span>}
              </div>
              <h1 className="watch-meta__title">
                {t('watch.episodePicker', { n: formatNumber(episode) })}
              </h1>
              <div className="watch-meta__shortcuts">{t('watch.shortcuts')}</div>
            </div>
            <div className="watch-meta__actions">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => setDownloadModalOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                  color: '#fff',
                  fontWeight: 700
                }}
              >
                <span className="btn__shine" />
                📥 {t('watch.downloadEpisode')}
              </button>
              <button type="button" className={`btn btn--sm ${fav ? 'btn--violet' : 'btn--ghost'}`} onClick={toggleFav}>
                {fav ? '♥' : '♡'} {fav ? t('show.unfavorite') : t('show.favorite')}
              </button>
              {user && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={markWatched}
                >
                  ✓ {t('watch.markWatched')}
                </button>
              )}
              {nextEp && (
                <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate(`/watch/${slug}/${nextEp.episode}`)}>
                  <span className="btn__shine" />
                  {t('watch.nextEpisode')} →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ---------- episode sidebar ---------- */}
        <aside className={`watch-side glass ${sidebarOpen ? '' : 'collapsed'}`}>
          <div className="watch-side__head">
            <h2>🎬 {t('show.episodesList')}</h2>
            <button type="button" className="icon-btn" onClick={() => setSidebarOpen((v) => !v)}>
              {sidebarOpen ? '»' : '«'}
            </button>
          </div>
          {sidebarOpen && (
            <div className="watch-side__list">
              {(show?.episodes || []).map((e) => (
                <button
                  key={e.episode}
                  type="button"
                  className={`watch-ep ${e.episode === episode ? 'active' : ''}`}
                  onClick={() => navigate(`/watch/${slug}/${e.episode}`)}
                >
                  <span className="watch-ep__num">{formatNumber(e.episode)}</span>
                  <span className="watch-ep__label">
                    {t('watch.episodePicker', { n: formatNumber(e.episode) })}
                  </span>
                  {e.episode === episode && <span className="watch-ep__now">{t('show.playing')}</span>}
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>

      <DownloadModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        slug={slug}
        episode={episode}
        title={title}
        showPoster={show?.poster}
        entries={episodeData?.entries || []}
        resolved={episodeData?.resolved || {}}
        downloads={episodeData?.downloads || []}
        resolvedDownloads={episodeData?.resolvedDownloads || {}}
        onResolveDownload={resolveDownload}
        onResolveStreaming={resolveEntry}
      />
    </>
  );
}
