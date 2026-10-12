import { imgFallback } from '../hooks/hooks.js';
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { useAsync, useDominantColor, applyLiveColor, pushToast } from '../hooks/hooks.js';
import { LiquidLoader, EmptyState } from '../components/Loading.jsx';
import { RatingPanel } from '../components/Features.jsx';
import { resolveUserVipTier } from '../components/VipPlansAndDevCodes.jsx';
import {
  isAnimeEpisodeAlertEnabled,
  toggleAnimeEpisodeAlert
} from '../utils/deviceNotifications.js';
import { auth, syncFavoriteToFirestore, removeFavoriteFromFirestore } from '../firebase.js';

export default function ShowDetail({ onOpenAuth }) {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const sourceParam = (searchParams.get('source') || '').toLowerCase();
  const srcSuffix = sourceParam ? `?source=${sourceParam}` : '';
  const navigate = useNavigate();
  const { t, lang, formatNumber } = useI18n();
  const { user } = useAuth();

  const { data, loading, error } = useAsync(() => api.get(`/api/stream/show/${slug}${srcSuffix}`), [slug, srcSuffix]);
  const [fav, setFav] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  const [progress, setProgress] = useState({});
  const [epFilter, setEpFilter] = useState('');
  const [alertEnabled, setAlertEnabled] = useState(() => isAnimeEpisodeAlertEnabled(slug));
  const vipTier = resolveUserVipTier(user);

  useEffect(() => {
    setAlertEnabled(isAnimeEpisodeAlertEnabled(slug));
  }, [slug]);

  const show = data?.show;
  const activeSource = 'witanime';
  const effectiveSuffix = '';

  const currentServerName = '👑 سيرفر BLACK X';

  const color = useDominantColor(show?.poster, '#22d3ee');

  useEffect(() => {
    if (color) applyLiveColor(color);
    return () => applyLiveColor('#8b5cf6');
  }, [color]);

  useEffect(() => {
    if (!user || !slug) { setFav(false); return undefined; }
    let alive = true;
    api.get(`/api/library/favorites/${slug}`)
      .then((d) => alive && setFav(d.favorite))
      .catch(() => alive && setFav(false));
    api.get('/api/library/continue')
      .then((d) => {
        if (!alive) return;
        const map = {};
        (d.history || []).forEach((h) => { if (h.slug === slug) map[h.episode] = h; });
        setProgress(map);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [user, slug]);

  const toggleFav = async () => {
    if (!user) { onOpenAuth('login'); return; }
    setFavBusy(true);
    const prev = fav;
    setFav(!prev); // optimistic
    try {
      if (prev) {
        await api.del(`/api/library/favorites/${slug}`);
        if (auth.currentUser) {
          removeFavoriteFromFirestore(auth.currentUser.uid, slug).catch(() => {});
        }
        pushToast(t('toast.favoriteRemoved'), 'success');
      } else {
        const favPayload = {
          titleEn: show.titleEn,
          titleAr: show.titleAr,
          poster: show.poster,
          banner: show.banner,
          episodes: show.episodeCount
        };
        await api.put(`/api/library/favorites/${slug}`, favPayload);
        if (auth.currentUser) {
          syncFavoriteToFirestore(auth.currentUser.uid, { slug, ...favPayload }).catch(() => {});
        }
        pushToast(t('toast.favoriteAdded'), 'success');
      }
    } catch {
      setFav(prev);
    } finally {
      setFavBusy(false);
    }
  };

  if (loading) return <LiquidLoader />;
  if (error || !show) {
    return (
      <div className="glass" style={{ padding: '2.5rem' }}>
        <EmptyState icon="🔍" title={t('show.notFound')}>
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/browse')}>{t('common.back')}</button>
        </EmptyState>
      </div>
    );
  }

  const title = (lang === 'ar' ? show.titleAr : show.titleEn) || show.titleEn;
  const otherTitle = lang === 'ar' ? show.titleEn : show.titleAr;
  const eps = show.episodes || [];
  const continueEp = eps.find((e) => progress[e.episode] && !progress[e.episode].completed) || eps[0];

  return (
    <>
      <button type="button" className="btn btn--ghost btn--sm reveal" style={{ marginBlockEnd: '1.15rem' }} onClick={() => navigate(-1)}>
        <span style={{ transform: 'scaleX(var(--flip))', display: 'inline-block' }}>←</span> {t('common.back')}
      </button>

      <section className="detail-hero glass reveal">
        <div className="detail-hero__banner" style={{ backgroundImage: `url(${show.banner || show.poster || ''})` }} />
        <div className="detail-hero__veil" />
        <div className="detail-hero__content">
          <div className="detail-poster">
            {show.poster ? (
              <img onError={imgFallback} src={show.poster} alt={title} referrerPolicy="no-referrer" />
            ) : (
              <div style={{ aspectRatio: '2/2.85', background: `linear-gradient(150deg, ${color}, #0a0d18)` }} />
            )}
          </div>

          <div>
            <div className="hero__badge">
              <span className="hero__badge-dot" />
              {show.sourceName || t('browse.sourceNote')}
            </div>
            <h1 style={{ fontSize: 'clamp(1.75rem, 3.6vw, 2.65rem)', margin: '0.35rem 0 0' }}>{title}</h1>
            {otherTitle && <p className="detail-title-ar">{otherTitle}</p>}

            <div className="detail-meta">
              <span className="badge badge--cat">{show.episodeCount ? t('show.episodeCount', { n: formatNumber(show.episodeCount) }) : '?'}</span>
              <span className="badge badge--open">{t('watch.sub')}</span>
              <span className="badge badge--score">HD</span>
              <span className="badge" style={{ background: 'rgba(234,179,8,0.22)', color: '#fde047', fontWeight: 900 }}>
                👑 FHD 1080p • VIP
              </span>
            </div>

            {show.description && (
              <p className="detail-synopsis">{show.description}</p>
            )}

            {/* WitAnime Metadata Grid (معلومات الأنمي) */}
            <div className="wit-meta-grid">
              <div className="wit-meta-item">
                <span className="wit-meta-label">{lang === 'ar' ? 'النوع:' : 'Type:'}</span>
                <span className="wit-meta-val">TV</span>
              </div>
              <div className="wit-meta-item">
                <span className="wit-meta-label">{lang === 'ar' ? 'حالة الأنمي:' : 'Status:'}</span>
                <span className="wit-meta-val" style={{ color: '#10b981' }}>{lang === 'ar' ? 'يعرض الان' : 'Airing'}</span>
              </div>
              <div className="wit-meta-item">
                <span className="wit-meta-label">{lang === 'ar' ? 'عدد الحلقات:' : 'Episodes:'}</span>
                <span className="wit-meta-val">{show.episodeCount || eps.length || '?'}</span>
              </div>
              <div className="wit-meta-item">
                <span className="wit-meta-label">{lang === 'ar' ? 'مدة الحلقة:' : 'Duration:'}</span>
                <span className="wit-meta-val">{lang === 'ar' ? '24 دقيقة' : '24 min'}</span>
              </div>
              <div className="wit-meta-item">
                <span className="wit-meta-label">{lang === 'ar' ? 'المصدر:' : 'Source:'}</span>
                <span className="wit-meta-val">{lang === 'ar' ? 'مانجا يابانية' : 'Manga'}</span>
              </div>
              <div className="wit-meta-item">
                <span className="wit-meta-label">{lang === 'ar' ? 'الجودة المتوفرة:' : 'Quality:'}</span>
                <span className="wit-meta-val" style={{ color: '#fde047' }}>👑 FHD 1080p VIP / HD</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBlockStart: '1.15rem' }}>
              {continueEp && (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => navigate(`/watch/${slug}/${continueEp.episode}${effectiveSuffix}`)}
                >
                  <span className="btn__shine" />
                  ▶ {progress[continueEp.episode] ? t('common.continue') : t('common.watchNow')} · {t('common.ep')} {continueEp.episode}
                </button>
              )}
              <button
                type="button"
                className={`btn ${alertEnabled ? 'btn--primary' : 'btn--ghost'}`}
                onClick={async () => {
                  const maxEp = eps.length ? Math.max(...eps.map((e) => Number(e.episode || 0))) : 1;
                  const nextState = await toggleAnimeEpisodeAlert(
                    {
                      slug,
                      titleAr: show.titleAr || title,
                      titleEn: show.titleEn || title,
                      poster: show.poster || '',
                      latestEpisode: maxEp
                    },
                    lang
                  );
                  setAlertEnabled(nextState);
                }}
                style={
                  alertEnabled
                    ? { background: 'linear-gradient(135deg, #10b981, #06b6d4)', color: '#041016', fontWeight: 900 }
                    : { borderColor: 'rgba(34,211,238,0.45)', color: 'var(--cyan)', fontWeight: 800 }
                }
              >
                {alertEnabled
                  ? (lang === 'ar' ? '🔔 إشعارات الحلقات مفعّلة على جهازك ✓' : '🔔 Episode Device Alerts On ✓')
                  : (lang === 'ar' ? '📲 تفعيل إشعارات الحلقات الجديدة' : '📲 Notify Me on New Episodes')}
              </button>
              <button
                type="button"
                className={`btn ${fav ? 'btn--violet' : 'btn--ghost'}`}
                onClick={toggleFav}
                disabled={favBusy}
              >
                {fav ? '♥ ' : '♡ '}{fav ? t('show.unfavorite') : t('show.favorite')}
              </button>
              {eps.length > 0 && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => navigate(`/watch/${slug}/${continueEp?.episode || 1}${effectiveSuffix}`)}
                  title={t('watch.downloadEpisode')}
                >
                  📥 {t('watch.downloadEpisode')}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 📡 سيرفرات المشاهدة والمصادر الرسمية المتاحة لهذا الأنمي */}
      <section
        className="glass reveal"
        style={{
          marginTop: '1.25rem',
          padding: '1.25rem 1.45rem',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          background: 'radial-gradient(circle at 90% 10%, rgba(34, 211, 238, 0.12), rgba(6, 9, 20, 0.94) 75%)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.35rem' }}>📡</span>
            <div>
              <div style={{ fontWeight: 900, fontSize: '0.98rem' }}>
                {lang === 'ar' ? 'سيرفر البث الرسمي لهذا الأنمي (BLACK X):' : 'Official BLACK X Streaming Server:'}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--ink-dim)' }}>
                {lang === 'ar'
                  ? 'تشغيل مباشر بدقة FHD 1080p وترجمة عربية وسيرفرات فائقة السرعة بدون إعلانات'
                  : 'Stream episodes directly in FHD 1080p without ads'}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '0.3rem 0.85rem',
              borderRadius: '99px',
              fontSize: '0.76rem',
              fontWeight: 800,
              background: 'rgba(34, 211, 238, 0.15)',
              border: '1px solid rgba(34, 211, 238, 0.45)',
              color: 'var(--cyan)'
            }}
          >
            {lang === 'ar' ? 'السيرفر: 👑 BLACK X' : 'Server: 👑 BLACK X'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 1.15rem',
              borderRadius: '12px',
              fontWeight: 900,
              fontSize: '0.84rem',
              background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
              color: '#040d1a',
              border: '1px solid transparent',
              boxShadow: '0 4px 18px rgba(34, 211, 238, 0.35)'
            }}
          >
            <span>👑</span>
            <span>{lang === 'ar' ? 'سيرفر BLACK X' : 'BLACK X Server'}</span>
            <span style={{ fontSize: '0.72rem', background: 'rgba(0,0,0,0.35)', color: '#fff', padding: '0.15rem 0.45rem', borderRadius: '6px' }}>
              ✓ {lang === 'ar' ? 'مفعّل ورسمي' : 'Active & Verified'}
            </span>
          </div>
        </div>
      </section>

      <RatingPanel slug={slug} title={title} />

      <section className="section">
        <div className="section__head" style={{ flexWrap: 'wrap', gap: '0.6rem' }}>
          <h2 className="section__title">🎬 {t('show.episodesList')}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={epFilter}
              onChange={(e) => setEpFilter(e.target.value)}
              placeholder={lang === 'ar' ? '🔍 ابحث برقم الحلقة...' : '🔍 Filter episode #...'}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                background: '#131926',
                border: '1px solid #28344b',
                color: '#fff',
                fontSize: '0.8rem',
                width: '165px'
              }}
            />
            <span
              style={{
                fontSize: '0.76rem',
                fontWeight: 800,
                padding: '0.28rem 0.75rem',
                borderRadius: '99px',
                background: vipTier === 'free' ? 'rgba(245, 158, 11, 0.14)' : 'rgba(16, 185, 129, 0.14)',
                border: vipTier === 'free' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                color: vipTier === 'free' ? '#fde047' : '#34d399'
              }}
            >
              {vipTier === 'free'
                ? (lang === 'ar' ? '⏳ الحلقات الرسمية الجديدة تفتح لمشتركي VIP في نفس اليوم، وتتأخر 24 ساعة للنسخة المجانية' : '⏳ Official new episodes drop same-day for VIP, 24h delay for Free')
                : (lang === 'ar' ? '👑 عضويتك VIP: جميع الحلقات الرسمية تنزل لك في نفس اليوم وبجودة FHD 1080p!' : '👑 VIP Active: Same-day official episodes & FHD 1080p unlocked!')}
            </span>
            <span className="chip" style={{ cursor: 'default' }}>{formatNumber(eps.length)} {t('common.episodes')}</span>
          </div>
        </div>

        {eps.length === 0 ? (
          <div className="glass">
            <EmptyState icon="📼" title={t('browse.empty')} />
          </div>
        ) : (
          <div className="ep-grid reveal">
            {eps
              .filter((e) => !epFilter.trim() || String(e.episode).includes(epFilter.trim()))
              .map((e) => {
                const p = progress[e.episode];
                const pct = p && p.duration ? Math.min(1, p.position / p.duration) : p?.completed ? 1 : 0;
                const maxEp = eps.length ? Math.max(...eps.map((item) => Number(item.episode || 0))) : 0;
                const isLatest = eps.length > 1 && Number(e.episode) === maxEp;
                return (
                  <button
                    key={e.episode}
                    type="button"
                    className={`ep-chip ${p?.completed ? 'watched' : ''}`}
                    onClick={() => navigate(`/watch/${slug}/${e.episode}${effectiveSuffix}`)}
                    style={
                      isLatest
                        ? {
                            borderColor: vipTier === 'free' ? '#f59e0b' : '#10b981',
                            position: 'relative'
                          }
                        : undefined
                    }
                  >
                    <span>{lang === 'ar' ? `الحلقة ${formatNumber(e.episode)}` : `EP ${formatNumber(e.episode)}`}</span>
                    {isLatest && (
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 900,
                          color: vipTier === 'free' ? '#fde047' : '#34d399',
                          display: 'block',
                          marginTop: '2px'
                        }}
                      >
                        {vipTier === 'free' ? '⏳ VIP اليوم' : '👑 VIP'}
                      </span>
                    )}
                    {p && (
                      <span className="ep-chip__bar">
                        <span style={{ width: `${Math.max(6, pct * 100)}%` }} />
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        )}
      </section>
    </>
  );
}
