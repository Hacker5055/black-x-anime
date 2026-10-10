import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { useAsync, useDominantColor, applyLiveColor, pushToast } from '../hooks/hooks.js';
import { LiquidLoader, EmptyState } from '../components/Loading.jsx';
import { auth, syncFavoriteToFirestore, removeFavoriteFromFirestore } from '../firebase.js';

export default function ShowDetail({ onOpenAuth }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t, lang, formatNumber } = useI18n();
  const { user } = useAuth();

  const { data, loading, error } = useAsync(() => api.get(`/api/stream/show/${slug}`), [slug]);
  const [fav, setFav] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  const [progress, setProgress] = useState({});

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
              <img src={show.poster} alt={title} referrerPolicy="no-referrer" />
            ) : (
              <div style={{ aspectRatio: '2/2.85', background: `linear-gradient(150deg, ${color}, #0a0d18)` }} />
            )}
          </div>

          <div>
            <div className="hero__badge">
              <span className="hero__badge-dot" />
              {t('browse.sourceNote')}
            </div>
            <h1 style={{ fontSize: 'clamp(1.75rem, 3.6vw, 2.65rem)', margin: '0.35rem 0 0' }}>{title}</h1>
            {otherTitle && <p className="detail-title-ar">{otherTitle}</p>}

            <div className="detail-meta">
              <span className="badge badge--cat">{show.episodeCount ? t('show.episodeCount', { n: formatNumber(show.episodeCount) }) : '?'}</span>
              <span className="badge badge--open">{t('watch.sub')}</span>
              <span className="badge badge--score">HD</span>
            </div>

            {show.description && (
              <p className="detail-synopsis">{show.description}</p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBlockStart: '1.15rem' }}>
              {continueEp && (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => navigate(`/watch/${slug}/${continueEp.episode}`)}
                >
                  <span className="btn__shine" />
                  ▶ {progress[continueEp.episode] ? t('common.continue') : t('common.watchNow')} · {t('common.ep')} {continueEp.episode}
                </button>
              )}
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
                  onClick={() => navigate(`/watch/${slug}/${continueEp?.episode || 1}`)}
                  title={t('watch.downloadEpisode')}
                >
                  📥 {t('watch.downloadEpisode')}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">🎬 {t('show.episodesList')}</h2>
          <span className="chip" style={{ cursor: 'default' }}>{formatNumber(eps.length)} {t('common.episodes')}</span>
        </div>

        {eps.length === 0 ? (
          <div className="glass">
            <EmptyState icon="📼" title={t('browse.empty')} />
          </div>
        ) : (
          <div className="ep-grid reveal">
            {eps.map((e) => {
              const p = progress[e.episode];
              const pct = p && p.duration ? Math.min(1, p.position / p.duration) : p?.completed ? 1 : 0;
              return (
                <button
                  key={e.episode}
                  type="button"
                  className={`ep-chip ${p?.completed ? 'watched' : ''}`}
                  onClick={() => navigate(`/watch/${slug}/${e.episode}`)}
                >
                  <span>{formatNumber(e.episode)}</span>
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
