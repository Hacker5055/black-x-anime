import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { useAsync, applyLiveColor, useDominantColor, pushToast } from '../hooks/hooks.js';
import VideoPlayer from '../components/VideoPlayer.jsx';
import LiveArabicSubtitlesPanel from '../components/LiveArabicSubtitlesPanel.jsx';
import WatchPartyPanel from '../components/WatchPartyPanel.jsx';
import { resolveUserVipTier } from '../components/VipPlansAndDevCodes.jsx';
import {
  isEpisodeDelayedForFreeUser,
  isAnimeEpisodeAlertEnabled,
  toggleAnimeEpisodeAlert
} from '../utils/deviceNotifications.js';
import { DownloadModal } from '../components/DownloadModal.jsx';
import { LiquidLoader, EmptyState } from '../components/Loading.jsx';
import { auth, syncProgressToFirestore, syncFavoriteToFirestore, removeFavoriteFromFirestore } from '../firebase.js';

export default function Watch({ onOpenAuth }) {
  const { slug, ep } = useParams();
  const [searchParams] = useSearchParams();
  const sourceParam = (searchParams.get('source') || '').toLowerCase();
  const srcSuffix = sourceParam ? `?source=${sourceParam}` : '';
  const episode = Number(ep) > 0 ? Number(ep) : 1;
  const navigate = useNavigate();
  const { t, lang, formatNumber } = useI18n();
  const { user } = useAuth();

  useEffect(() => {
    if (!ep || ep === 'undefined' || ep === 'NaN' || !(Number(ep) > 0)) {
      navigate(`/watch/${slug}/${episode}${srcSuffix}`, { replace: true });
      return;
    }
    window.triggerBlackXMotion?.(
      'katana',
      1350,
      `⚔️ الحلقة ${episode} · ضربة سيف الكاتانا 120Hz`,
      `⚔️ EPISODE ${episode} · KATANA X-SLASH 120Hz`
    );
  }, [ep, slug, episode, srcSuffix, navigate]);

  const showQuery = useAsync(() => api.get(`/api/stream/show/${slug}${srcSuffix}`), [slug, srcSuffix]);
  const [episodeData, setEpisodeData] = useState(null); // { entries, downloads, resolved, resolvedDownloads }
  const [scraperDownloads, setScraperDownloads] = useState(null); // { cloudHosts, qualities }
  const [resolvingDlId, setResolvingDlId] = useState(null);
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
    api.get(`/api/stream/episode/${slug}/${episode}${srcSuffix}`)
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

    // Fetch multi-quality download links from 3v1ltw1n0x01/anime_scraper + WitAnime manifest
    api.get(`/api/stream/download-sources/${slug}/${episode}`)
      .then((dlRes) => setScraperDownloads(dlRes))
      .catch(() => {});
  }, [slug, episode, srcSuffix]);

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
  const episodes = (show?.episodes || []).map((e, i) => ({
    ...e,
    episode: Number(e.episode ?? e.number) > 0 ? Number(e.episode ?? e.number) : i + 1,
    number: Number(e.number ?? e.episode) > 0 ? Number(e.number ?? e.episode) : i + 1
  }));
  const idx = episodes.findIndex((e) => e.episode === episode);
  const prevEp = idx > 0 ? episodes[idx - 1] : null;
  const nextEp = idx >= 0 && idx < episodes.length - 1 ? episodes[idx + 1] : null;

  const title = show ? ((lang === 'ar' ? show.titleAr : show.titleEn) || show.titleEn) : slug;
  const vipTier = resolveUserVipTier(user);
  const isVipMember = vipTier === 'vip_basic' || vipTier === 'vip_monarch';
  const [vipFastCdn, setVipFastCdn] = useState(() => isVipMember);
  const [monarch4kHdr, setMonarch4kHdr] = useState(() => vipTier === 'vip_monarch');

  // Broadcast active stream session to the Website Mini Floating Player
  useEffect(() => {
    if (!episodeData?.resolved) return;
    const resolvedList = Object.values(episodeData.resolved).filter((s) => s && s.url);
    const activeSrc = resolvedList[0];
    if (activeSrc?.url && typeof window !== 'undefined') {
      const detail = {
        slug,
        episode,
        title: show?.titleEn || title || slug,
        poster: show?.poster || '/blackx-logo.png',
        url: activeSrc.url,
        kind: activeSrc.kind || 'embed'
      };
      window.__bxMiniPlayer = detail;
      window.dispatchEvent(new CustomEvent('bx_mini_player_update', { detail }));
    }
  }, [episodeData, slug, episode, show, title]);
  const [alertEnabled, setAlertEnabled] = useState(() => isAnimeEpisodeAlertEnabled(slug));

  useEffect(() => {
    setAlertEnabled(isAnimeEpisodeAlertEnabled(slug));
  }, [slug]);

  const maxEpisodeNum = episodes.length ? Math.max(...episodes.map((e) => Number(e.episode || 0))) : 0;
  const isLatestOfficialEp = episodes.length > 1 && Number(episode) === maxEpisodeNum;
  const isDelayedForFree = isEpisodeDelayedForFreeUser({
    episodeNumber: episode,
    totalEpisodes: maxEpisodeNum,
    vipTier
  });

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
          {isDelayedForFree ? (
            <div className="player-shell glass">
              <div
                className="player-stage"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '390px',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  background: '#050508',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <div style={{ fontSize: '3.2rem', marginBottom: '0.75rem' }}>⏳👑</div>
                <span
                  style={{
                    padding: '0.32rem 0.95rem',
                    borderRadius: '999px',
                    background: '#ffffff',
                    border: '1px solid #ffffff',
                    color: '#000000',
                    fontWeight: 900,
                    fontSize: '0.8rem',
                    marginBottom: '0.85rem'
                  }}
                >
                  {lang === 'ar'
                    ? '👑 عرض اليوم الرسمي — متاح فوراً لمشتركي VIP فقط'
                    : '👑 Official Release Day — Instant Access for VIP Members'}
                </span>
                <h2 style={{ margin: '0 0 0.6rem', fontSize: '1.45rem', fontWeight: 900 }}>
                  {lang === 'ar'
                    ? `الحلقة ${formatNumber(episode)} متاحة الآن لمشتركي VIP، وتفتح للنسخة المجانية بعد 24 ساعة`
                    : `Episode ${formatNumber(episode)} is live now for VIP members, and unlocks for Free users in 24 hours`}
                </h2>
                <p style={{ maxWidth: '560px', color: 'rgba(255,255,255,0.72)', fontSize: '0.92rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
                  {lang === 'ar'
                    ? 'مشتركو باقات ⚡ VIP Basic و 🔮 VIP Monarch يشاهدون الحلقات الرسمية في نفس يوم صدورها وبجودة FHD 1080p / 4K بدون تأخير.'
                    : '⚡ VIP Basic and 🔮 VIP Monarch members watch official episodes on release day in FHD 1080p / 4K with zero delay.'}
                </p>

                <div
                  style={{
                    padding: '0.65rem 1.4rem',
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.28)',
                    fontFamily: 'monospace',
                    fontSize: '1.1rem',
                    fontWeight: 900,
                    color: '#ffffff',
                    marginBottom: '1.5rem'
                  }}
                >
                  ⏱️ {lang === 'ar' ? 'الوقت المتبقي للنسخة المجانية: 23 ساعة و 59 دقيقة' : 'Free Release Countdown: 23h 59m'}
                </div>

                <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => navigate('/profile?tab=referrals')}
                    style={{
                      background: '#ffffff',
                      color: '#000000',
                      border: '1.5px solid #ffffff',
                      fontWeight: 900,
                      padding: '0.85rem 1.6rem',
                      borderRadius: '999px',
                      cursor: 'pointer'
                    }}
                  >
                    👑 {lang === 'ar' ? 'اشترك في VIP أو فعّل كودك للمشاهدة فوراً' : 'Upgrade to VIP / Redeem Code to Watch Now'}
                  </button>
                  {prevEp && (
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => navigate(`/watch/${slug}/${prevEp.episode}`)}
                      style={{ fontWeight: 800, padding: '0.85rem 1.35rem', borderRadius: '999px' }}
                    >
                      🎬 {lang === 'ar' ? `مشاهدة الحلقة السابقة المتاحة مجاناً (${formatNumber(prevEp.episode)})` : `Watch Previous Free Episode (${formatNumber(prevEp.episode)})`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : sourcesLoading ? (
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
            <div style={monarch4kHdr ? { filter: 'contrast(1.1) saturate(1.18) brightness(1.03)', transition: 'filter 0.3s ease' } : undefined}>
              <VideoPlayer
                entries={episodeData.entries}
                resolved={episodeData.resolved}
                onResolve={resolveEntry}
                onOpenDownload={() => setDownloadModalOpen(true)}
                title={title}
                episodeLabel={t('watch.episodePicker', { n: formatNumber(episode) })}
                startTime={resumeAt}
                resumePrompt={resumeAt > 0}
                vipTier={vipTier}
                onRequireVip={() => navigate('/profile?tab=referrals')}
                onProgress={(pos, dur) => {
                  lastPos.current = { pos, dur };
                  saveRef.current?.(pos, dur);
                }}
                onEnded={() => saveRef.current?.(lastPos.current.pos, lastPos.current.dur || lastPos.current.pos, true)}
                onPrev={prevEp ? () => navigate(`/watch/${slug}/${prevEp.episode}${srcSuffix}`) : null}
                onNext={nextEp ? () => navigate(`/watch/${slug}/${nextEp.episode}${srcSuffix}`) : null}
                nextLabel={nextEp ? t('watch.episodePicker', { n: formatNumber(nextEp.episode) }) : null}
              />

              {/* ---------- Live English -> Arabic AI Subtitle Translator Bar ---------- */}
              <LiveArabicSubtitlesPanel
                slug={slug}
                episode={episode}
                titleEn={show?.titleEn || title}
                lang={lang}
                autoEnable={sourceParam === 'english' || String(slug).startsWith('en-') || String(slug).startsWith('mal-')}
                currentPosRef={lastPos}
              />
            </div>
          )}

          {/* ---------- VIP Fast CDN & 4K HDR 60FPS Streaming Bar ---------- */}
          <div
            className="glass"
            style={{
              marginTop: '0.85rem',
              padding: '0.75rem 1.15rem',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              border: monarch4kHdr ? '1px solid rgba(168,85,247,0.55)' : vipFastCdn ? '1px solid rgba(245,158,11,0.45)' : '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', fontWeight: 900, color: '#ffffff' }}>
                <img src="/blackx-logo.png" alt="BLACK X" style={{ width: '18px', height: '18px', borderRadius: '5px', objectFit: 'cover' }} />
                <span>{lang === 'ar' ? 'محرك البث (Streaming Engine):' : 'Streaming Engine:'}</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  if (vipTier === 'free') {
                    pushToast(
                      lang === 'ar'
                        ? '🔒 سيرفرات VIP Fast CDN فائقة السرعة بدون ضغط متاحة لباقة ⚡ VIP Basic (99 ج.م) أو 🔮 VIP Monarch!'
                        : '🔒 VIP Fast CDN requires ⚡ VIP Basic or 🔮 VIP Monarch!',
                      'info'
                    );
                    navigate('/profile?tab=referrals');
                    return;
                  }
                  setVipFastCdn((v) => !v);
                  pushToast(lang === 'ar' ? '🚀 تم التبديل إلى سيرفر VIP Fast CDN فائق السرعة بدون ضغط!' : '🚀 Switched to VIP Fast CDN!', 'success');
                }}
                style={{
                  padding: '0.38rem 0.9rem',
                  borderRadius: '999px',
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  background: vipFastCdn ? '#ffffff' : 'rgba(255,255,255,0.08)',
                  color: vipFastCdn ? '#000000' : '#ffffff',
                  border: vipFastCdn ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.22)'
                }}
              >
                ⚡ VIP Fast CDN {vipFastCdn ? '✓' : '🔒'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (vipTier !== 'vip_monarch') {
                    pushToast(
                      lang === 'ar'
                        ? '🔒 البث بدقة 4K HDR ومعدل إطارات 60fps متاح حصرياً لباقة 🔮 VIP Monarch (إمبراطور الظلال - 199 ج.م)!'
                        : '🔒 4K HDR 60fps streaming requires 🔮 VIP Monarch!',
                      'info'
                    );
                    navigate('/profile?tab=referrals');
                    return;
                  }
                  setMonarch4kHdr((v) => !v);
                  pushToast(lang === 'ar' ? '🔮 تم تفعيل معالج البث 4K HDR • 60FPS الفائق!' : '🔮 4K HDR • 60FPS Mode Active!', 'success');
                }}
                style={{
                  padding: '0.38rem 0.9rem',
                  borderRadius: '999px',
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  background: monarch4kHdr ? '#ffffff' : 'rgba(255,255,255,0.08)',
                  color: monarch4kHdr ? '#000000' : '#ffffff',
                  border: monarch4kHdr ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.22)'
                }}
              >
                🔮 4K HDR • 60FPS {monarch4kHdr ? '✓' : '🔒'}
              </button>

              {vipTier === 'vip_monarch' && (
                <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#000000', padding: '0.2rem 0.65rem', borderRadius: '999px', background: '#ffffff' }}>
                  ⏳ {lang === 'ar' ? 'وصول مبكر (Early Access مفعّل)' : 'Early Access Unlocked'}
                </span>
              )}
            </div>

            {vipTier === 'free' && (
              <button
                type="button"
                onClick={() => navigate('/profile?tab=referrals')}
                style={{
                  fontSize: '0.76rem',
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '0.42rem 0.95rem',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                👑 {lang === 'ar' ? 'ترقية إلى VIP / تفعيل كود اشتراك' : 'Upgrade to VIP / Redeem Code'}
              </button>
            )}
          </div>

          {/* ---------- meta under player ---------- */}
          <div className="watch-meta glass reveal" style={{ borderRadius: '26px', background: '#050508', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <div className="watch-meta__kicker" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                <Link to={`/show/${slug}${srcSuffix}`} style={{ color: '#ffffff', fontWeight: 800 }}>{title}</Link>
                {show?.titleAr && lang !== 'ar' && <span> · {show.titleAr}</span>}
                <span style={{ fontSize: '0.72rem', padding: '0.16rem 0.65rem', borderRadius: '999px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.28)', color: '#ffffff', fontWeight: 900 }}>
                  {show?.sourceName || (sourceParam === 'english' ? '🌐 سيرفر BLACK X 3' : sourceParam === 'anime3rb' ? '⚡ سيرفر BLACK X 2' : '👑 سيرفر BLACK X 1')}
                </span>
              </div>
              <h1 className="watch-meta__title">
                {t('watch.episodePicker', { n: formatNumber(episode) })}
              </h1>
              <div className="watch-meta__shortcuts">{t('watch.shortcuts')}</div>
            </div>
            <div className="watch-meta__actions">
              <button
                type="button"
                className={`btn btn--sm ${alertEnabled ? 'btn--primary' : 'btn--ghost'}`}
                onClick={async () => {
                  const nextState = await toggleAnimeEpisodeAlert(
                    {
                      slug,
                      titleAr: show?.titleAr || title,
                      titleEn: show?.titleEn || title,
                      poster: show?.poster || '/blackx-logo.png',
                      latestEpisode: maxEpisodeNum || episode
                    },
                    lang
                  );
                  setAlertEnabled(nextState);
                }}
              >
                {alertEnabled
                  ? (lang === 'ar' ? '🔔 إشعارات الجهاز مفعّلة ✓' : '🔔 Device Alerts On ✓')
                  : (lang === 'ar' ? '📲 تفعيل إشعارات الحلقات' : '📲 Enable Episode Alerts')}
              </button>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => setDownloadModalOpen(true)}
              >
                📥 {t('watch.downloadEpisode')}
              </button>
              <button type="button" className={`btn btn--sm ${fav ? 'btn--primary' : 'btn--ghost'}`} onClick={toggleFav}>
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
                <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate(`/watch/${slug}/${nextEp.episode}${srcSuffix}`)}>
                  {t('watch.nextEpisode')} →
                </button>
              )}
            </div>
          </div>

          {/* ---------- WitAnime & anime_scraper Direct Multi-Quality Download Table (جدول تحميل الحلقة) ---------- */}
          {(episodeData?.entries?.length > 0 || episodeData?.downloads?.length > 0 || scraperDownloads?.cloudHosts?.length > 0) && (() => {
            const allDownloads = (scraperDownloads?.cloudHosts?.length ? scraperDownloads.cloudHosts : (episodeData?.downloads || [])).map((d, idx) => {
              const res = episodeData?.resolvedDownloads?.[d.id] || {};
              return {
                id: d.id || `dl-${idx}`,
                server: d.server || d.label || `Server ${idx + 1}`,
                quality: String(d.quality || 'FHD').toUpperCase(),
                url: d.url || res.downloadUrl || res.directUrl || null,
                directUrl: d.directUrl || res.directUrl || null
              };
            });

            const fhdLinks = allDownloads.filter((d) => d.quality.includes('FHD') || d.quality.includes('1080'));
            const hdLinks = allDownloads.filter((d) => (d.quality.includes('HD') && !d.quality.includes('FHD')) || d.quality.includes('720'));
            const sdLinks = allDownloads.filter((d) => d.quality.includes('SD') || d.quality.includes('480') || d.quality.includes('360'));

            const handleDirectTableClick = async (dlItem, requireVip = false) => {
              if (requireVip && !isVipMember) {
                pushToast(
                  lang === 'ar'
                    ? '👑 تحميل جودة FHD 1080p متاح لمشتركي VIP فقط! يمكنك التحميل بجودة HD أو SD مجاناً.'
                    : '👑 FHD 1080p download is exclusive to VIP members! Download HD/SD for free.',
                  'info'
                );
                navigate('/profile?tab=referrals');
                return;
              }
              let targetUrl = dlItem.directUrl || dlItem.url;
              if (!targetUrl && dlItem.id) {
                setResolvingDlId(dlItem.id);
                const resolved = await resolveDownload(dlItem);
                setResolvingDlId(null);
                targetUrl = resolved?.directUrl || resolved?.downloadUrl || null;
              }
              if (targetUrl) {
                window.open(targetUrl, '_blank', 'noopener,noreferrer');
                pushToast(lang === 'ar' ? `جاري فتح رابط التحميل (${dlItem.server})...` : `Opening download (${dlItem.server})...`, 'success');
              } else {
                setDownloadModalOpen(true);
              }
            };

            return (
              <div className="wit-section" style={{ marginTop: '0.85rem' }}>
                <div className="wit-sec-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.65rem' }}>
                  <div className="wit-sec-header__right">
                    <span className="wit-sec-header__bar" />
                    <h3 className="wit-sec-header__title" style={{ fontSize: '1rem' }}>
                      <span>📥</span> {lang === 'ar' ? 'جدول تحميل الحلقة المباشر (BLACK X)' : 'Direct Episode Download Table (BLACK X)'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="wit-sec-header__more"
                    onClick={() => setDownloadModalOpen(true)}
                    style={{ cursor: 'pointer' }}
                  >
                    {lang === 'ar' ? 'كل روابط التحميل ←' : 'All Download Links →'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {/* Row 1: الجودة الخارقة FHD (1080p) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.6rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      background: 'rgba(6, 6, 6, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.22)'
                    }}
                  >
                    <span style={{ fontWeight: 900, fontSize: '0.84rem', color: '#ffffff' }}>
                      👑 {lang === 'ar' ? 'الجودة الخارقة FHD (1080p)' : 'Full HD (1080p)'}
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {(fhdLinks.length ? fhdLinks : allDownloads.slice(0, 5)).map((dl) => (
                        <button
                          key={`dl-fhd-${dl.id}`}
                          type="button"
                          className="wit-server-tab wit-server-tab--vip"
                          disabled={resolvingDlId === dl.id}
                          onClick={() => handleDirectTableClick(dl, true)}
                        >
                          <span>📥 {resolvingDlId === dl.id ? '...' : dl.server}</span>
                          <small>{isVipMember ? '1080p' : '🔒 VIP'}</small>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Row 2: الجودة العالية HD (720p • مجاناً) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.6rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      background: 'rgba(6, 6, 6, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.14)'
                    }}
                  >
                    <span style={{ fontWeight: 900, fontSize: '0.84rem', color: '#d4d4d8' }}>
                      🖥️ {lang === 'ar' ? 'الجودة العالية HD (720p • مجاناً)' : 'High Definition HD (720p • Free)'}
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {(hdLinks.length ? hdLinks : allDownloads.slice(0, 5)).map((dl) => (
                        <button
                          key={`dl-hd-${dl.id}`}
                          type="button"
                          className="wit-server-tab"
                          disabled={resolvingDlId === dl.id}
                          onClick={() => handleDirectTableClick(dl, false)}
                        >
                          <span>📥 {resolvingDlId === dl.id ? '...' : dl.server}</span>
                          <small>720p</small>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Row 3: الجودة المتوسطة SD (480p • مجاناً) */}
                  {sdLinks.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.6rem',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        background: 'rgba(6, 6, 6, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <span style={{ fontWeight: 900, fontSize: '0.84rem', color: '#a1a1aa' }}>
                        📱 {lang === 'ar' ? 'الجودة المتوسطة SD (480p • مجاناً)' : 'Standard Definition SD (480p • Free)'}
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {sdLinks.map((dl) => (
                          <button
                            key={`dl-sd-${dl.id}`}
                            type="button"
                            className="wit-server-tab"
                            disabled={resolvingDlId === dl.id}
                            onClick={() => handleDirectTableClick(dl, false)}
                          >
                            <span>📥 {resolvingDlId === dl.id ? '...' : dl.server}</span>
                            <small>480p</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ---------- Watch Party Rooms & Timestamped / Voice Comments ---------- */}
          <WatchPartyPanel
            slug={slug}
            episode={episode}
            title={title}
            currentPosRef={lastPos}
          />
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
              {(show?.episodes || []).map((e) => {
                const isLatest = episodes.length > 1 && Number(e.episode) === maxEpisodeNum;
                return (
                  <button
                    key={e.episode}
                    type="button"
                    className={`watch-ep ${e.episode === episode ? 'active' : ''}`}
                    onClick={() => navigate(`/watch/${slug}/${e.episode}${srcSuffix}`)}
                  >
                    <span className="watch-ep__num">{formatNumber(e.episode)}</span>
                    <span className="watch-ep__label">
                      {t('watch.episodePicker', { n: formatNumber(e.episode) })}
                    </span>
                    {isLatest && (
                      <span
                        style={{
                          fontSize: '0.66rem',
                          fontWeight: 900,
                          padding: '0.12rem 0.45rem',
                          borderRadius: '99px',
                          background: vipTier === 'free' ? 'rgba(245,158,11,0.22)' : 'rgba(16,185,129,0.22)',
                          color: vipTier === 'free' ? '#fde047' : '#34d399',
                          border: vipTier === 'free' ? '1px solid #f59e0b' : '1px solid #10b981'
                        }}
                      >
                        {vipTier === 'free' ? '⏳ 24س / VIP 👑' : '👑 يوم العرض VIP'}
                      </span>
                    )}
                    {e.episode === episode && <span className="watch-ep__now">{t('show.playing')}</span>}
                  </button>
                );
              })}
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
