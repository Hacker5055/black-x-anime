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
  const isAniProject = sourceParam === 'aniproject' || String(slug).startsWith('ap-');
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
  const eps = (show.episodes || []).map((e, idx) => ({
    ...e,
    episode: Number(e.episode ?? e.number) > 0 ? Number(e.episode ?? e.number) : idx + 1,
    number: Number(e.number ?? e.episode) > 0 ? Number(e.number ?? e.episode) : idx + 1
  }));
  const continueEp = eps.find((e) => progress[e.episode] && !progress[e.episode].completed) || eps[0];

  return (
    <>
      <button
        type="button"
        className="btn btn--ghost btn--sm reveal"
        style={{
          marginBlockEnd: '1.15rem',
          borderRadius: '999px',
          padding: '0.48rem 1.05rem',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.22)'
        }}
        onClick={() => navigate(-1)}
      >
        <span style={{ transform: 'scaleX(var(--flip))', display: 'inline-block' }}>←</span> {t('common.back')}
      </button>

      <section
        className="detail-hero glass reveal sloth-show-hub"
        style={{
          borderRadius: '28px',
          background: '#050508',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 28px 70px rgba(0,0,0,0.95)',
          overflow: 'hidden'
        }}
      >
        <div className="detail-hero__banner" style={{ backgroundImage: `url(${show.banner || show.poster || ''})` }} />
        <div className="detail-hero__veil" />
        <div className="detail-hero__content">
          <div className="detail-poster" style={{ borderRadius: '22px', overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.28)' }}>
            {show.poster ? (
              <img onError={imgFallback} src={show.poster} alt={title} referrerPolicy="no-referrer" />
            ) : (
              <img src="/blackx-logo.png" alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>

          <div>
            {/* Official slothUI Pro [BLACK X] original Seal */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.28rem 0.78rem 0.28rem 0.38rem',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.26)'
                }}
              >
                <img
                  src="/blackx-logo.png"
                  alt="BLACK X"
                  style={{ width: '22px', height: '22px', borderRadius: '6px', objectFit: 'cover' }}
                />
                <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.02em' }}>
                  BLACK X <span style={{ fontWeight: 500, opacity: 0.78 }}>original</span>
                </span>
              </div>
              <span
                style={{
                  padding: '0.24rem 0.68rem',
                  borderRadius: '999px',
                  background: '#ffffff',
                  color: '#000000',
                  fontSize: '0.68rem',
                  fontWeight: 900
                }}
              >
                {isAniProject ? 'BLACK X 4' : '4K Ultra • 120Hz'}
              </span>
            </div>

            <h1 style={{ fontSize: 'clamp(1.75rem, 3.6vw, 2.65rem)', margin: '0.25rem 0 0', fontWeight: 900 }}>{title}</h1>
            {otherTitle && <p className="detail-title-ar" style={{ color: 'rgba(255,255,255,0.68)' }}>{otherTitle}</p>}

            <div className="detail-meta" style={{ marginTop: '0.6rem' }}>
              <span className="badge badge--cat" style={{ borderRadius: '999px', background: '#ffffff', color: '#000000', fontWeight: 900 }}>
                {show.episodeCount ? t('show.episodeCount', { n: formatNumber(show.episodeCount) }) : `${eps.length} EP`}
              </span>
              {!isAniProject && (
                <>
                  <span className="badge badge--open" style={{ borderRadius: '999px', background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.22)' }}>
                    {t('watch.sub')}
                  </span>
                  <span className="badge" style={{ borderRadius: '999px', background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.22)', fontWeight: 900 }}>
                    👑 FHD 1080p • VIP
                  </span>
                </>
              )}
            </div>

            {/* Do not invent popularity, quality or release figures for the search-only source. */}
            {isAniProject ? (
              <p style={{ margin: '0.95rem 0', color: 'rgba(255,255,255,0.72)', fontSize: '0.85rem' }}>
                {lang === 'ar'
                  ? 'الحلقات المتاحة من BLACK X 4 مدرجة أدناه. جودة البث والترجمة تعتمد على الخادم المصدر.'
                  : 'Available BLACK X 4 episodes are listed below. Playback quality and subtitles depend on the upstream source.'}
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
                  gap: '0.4rem',
                  padding: '0.75rem 0.5rem',
                  margin: '0.95rem 0',
                  borderRadius: '20px',
                  background: 'rgba(12, 12, 18, 0.9)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  textAlign: 'center'
                }}
              >
                {[
                  { icon: '🎞️', val: show.episodeCount || eps.length || '12', lbl: lang === 'ar' ? 'حلقات' : 'Eps' },
                  { icon: '♥', val: '1.4K', lbl: lang === 'ar' ? 'إعجاب' : 'Likes' },
                  { icon: '👁', val: '24.8K', lbl: lang === 'ar' ? 'مشاهدة' : 'Views' },
                  { icon: '💬', val: '186', lbl: lang === 'ar' ? 'تقييم' : 'Reviews' },
                  { icon: '🧬', val: '98%', lbl: lang === 'ar' ? 'تطابق' : 'Match' },
                  { icon: '★', val: '9.5', lbl: lang === 'ar' ? 'التقييم' : 'Score' }
                ].map((st, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '0.92rem', lineHeight: 1 }}>{st.icon}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#ffffff' }}>{st.val}</span>
                    <span style={{ fontSize: '0.64rem', fontWeight: 700, color: 'rgba(255,255,255,0.58)' }}>{st.lbl}</span>
                  </div>
                ))}
              </div>
            )}

            {show.description && (
              <p className="detail-synopsis" style={{ color: 'rgba(255,255,255,0.82)' }}>{show.description}</p>
            )}

            {/* Official slothUI Pro Metadata Grid */}
            <div className="wit-meta-grid">
              <div className="wit-meta-item">
                <span className="wit-meta-label">{lang === 'ar' ? 'النوع:' : 'Type:'}</span>
                <span className="wit-meta-val">{isAniProject ? (lang === 'ar' ? 'أنمي' : 'Anime') : 'TV • 120Hz'}</span>
              </div>
              <div className="wit-meta-item">
                <span className="wit-meta-label">{lang === 'ar' ? 'حالة الأنمي:' : 'Status:'}</span>
                <span className="wit-meta-val" style={{ color: '#ffffff' }}>{isAniProject ? (show.status || '—') : (lang === 'ar' ? 'يعرض الآن' : 'Airing')}</span>
              </div>
              <div className="wit-meta-item">
                <span className="wit-meta-label">{lang === 'ar' ? 'عدد الحلقات:' : 'Episodes:'}</span>
                <span className="wit-meta-val">{show.episodeCount || eps.length || '?'}</span>
              </div>
              <div className="wit-meta-item">
                <span className="wit-meta-label">{lang === 'ar' ? 'مدة الحلقة:' : 'Duration:'}</span>
                <span className="wit-meta-val">{isAniProject ? '—' : (lang === 'ar' ? '24 دقيقة' : '24 min')}</span>
              </div>
              <div className="wit-meta-item">
                <span className="wit-meta-label">{lang === 'ar' ? 'المصدر:' : 'Source:'}</span>
                <span className="wit-meta-val">{isAniProject ? 'BLACK X 4' : (lang === 'ar' ? 'مانجا يابانية' : 'Manga')}</span>
              </div>
              <div className="wit-meta-item">
                <span className="wit-meta-label">{lang === 'ar' ? 'الجودة المتوفرة:' : 'Quality:'}</span>
                <span className="wit-meta-val" style={{ color: '#ffffff' }}>{isAniProject ? (lang === 'ar' ? 'حسب المصدر' : 'Varies by source') : '👑 FHD 1080p VIP / HD'}</span>
              </div>
            </div>

            {/* Official slothUI Pro Capsule CTA + Circular Orbs Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap', marginBlockStart: '1.15rem' }}>
              {continueEp && (
                <button
                  type="button"
                  onClick={() => navigate(`/watch/${slug}/${continueEp.episode}${srcSuffix}`)}
                  style={{
                    padding: '0.78rem 1.65rem',
                    borderRadius: '999px',
                    background: '#ffffff',
                    color: '#000000',
                    border: '1.5px solid #ffffff',
                    fontWeight: 900,
                    fontSize: '0.9rem',
                    boxShadow: '0 10px 28px rgba(255,255,255,0.24)',
                    cursor: 'pointer'
                  }}
                >
                  ▶ {progress[continueEp.episode] ? t('common.continue') : t('common.watchNow')} · {t('common.ep')} {continueEp.episode}
                </button>
              )}
              <button
                type="button"
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
                style={{
                  padding: '0.76rem 1.25rem',
                  borderRadius: '999px',
                  background: alertEnabled ? '#ffffff' : 'rgba(255,255,255,0.08)',
                  color: alertEnabled ? '#000000' : '#ffffff',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  fontWeight: 900,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                {alertEnabled
                  ? (lang === 'ar' ? '🔔 إشعارات الحلقات مفعّلة ✓' : '🔔 Episode Alerts On ✓')
                  : (lang === 'ar' ? '🔔 تفعيل إشعارات الحلقات' : '🔔 Notify on New Episodes')}
              </button>
              <button
                type="button"
                onClick={toggleFav}
                disabled={favBusy}
                style={{
                  padding: '0.76rem 1.25rem',
                  borderRadius: '999px',
                  background: fav ? '#ffffff' : 'rgba(255,255,255,0.08)',
                  color: fav ? '#000000' : '#ffffff',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  fontWeight: 900,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                {fav ? '♥ ' : '＋ '}{fav ? t('show.unfavorite') : t('show.favorite')}
              </button>
              {eps.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate(`/watch/${slug}/${continueEp?.episode || 1}${srcSuffix}`)}
                  title={t('watch.downloadEpisode')}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.28)',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  ⬇
                </button>
              )}
            </div>
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
                padding: '0.42rem 0.9rem',
                borderRadius: '999px',
                background: '#08080c',
                border: '1px solid rgba(255,255,255,0.22)',
                color: '#fff',
                fontSize: '0.8rem',
                width: '185px'
              }}
            />
            <span
              style={{
                fontSize: '0.76rem',
                fontWeight: 800,
                padding: '0.32rem 0.85rem',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.24)',
                color: '#ffffff'
              }}
            >
              {isAniProject
                ? (lang === 'ar' ? '🔎 الحلقات المتاحة من سيرفر BLACK X 4' : '🔎 Episodes available on BLACK X 4')
                : vipTier === 'free'
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
                const isLatest = !isAniProject && eps.length > 1 && Number(e.episode) === maxEp;
                return (
                  <button
                    key={e.episode}
                    type="button"
                    className={`ep-chip ${p?.completed ? 'watched' : ''}`}
                    onClick={() => navigate(`/watch/${slug}/${e.episode}${srcSuffix}`)}
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
