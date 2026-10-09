import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { useAsync, applyLiveColor, useDominantColor, pushToast } from '../hooks/hooks.js';
import ShowCard, { EpisodeTile, ContinueCard } from '../components/ShowCard.jsx';
import { LiquidLoader, SkeletonGrid, EmptyState } from '../components/Loading.jsx';

/* -------------------------------- hero -------------------------------- */
function Hero({ featured, loading, onOpenAuth }) {
  const { t, lang, formatNumber } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const color = useDominantColor(featured?.poster, '#8b5cf6');

  useEffect(() => {
    if (color) applyLiveColor(color);
  }, [color]);

  if (loading) return <LiquidLoader />;
  if (!featured) return null;

  const title = (lang === 'ar' ? featured.titleAr : featured.titleEn) || featured.titleEn || featured.slug;

  return (
    <section className="hero glass reveal">
      <div className="hero__bg" style={{ backgroundImage: `url(${featured.poster || ''})` }} />
      <div className="hero__veil" />
      <div className="hero__content">
        <div>
          <div className="hero__badge">
            <span className="hero__badge-dot" />
            {t('dashboard.heroBadge')}
          </div>
          <h1 className="hero__title">{t('app.taglineLong')}</h1>
          <p className="hero__desc">
            <strong style={{ color: 'var(--ink)' }}>{title}</strong>
            {featured.description ? ` — ${featured.description.slice(0, 170)}…` : ''}
          </p>
          <div className="hero__cta-row">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => navigate(`/watch/${featured.slug}/${featured.episode || 1}`)}
            >
              <span className="btn__shine" />
              ▶ {t('dashboard.heroCta')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => navigate(`/show/${featured.slug}`)}>
              ▣ {t('dashboard.heroCta2')}
            </button>
          </div>
          <div className="hero__stats">
            <div className="stat-card">
              <div className="stat-card__num">{formatNumber(featured.episode || 1)}</div>
              <div className="stat-card__label">{t('common.episode')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__num">HD</div>
              <div className="stat-card__label">{t('watch.quality')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__num">{t('watch.sub')}</div>
              <div className="stat-card__label">{t('watch.lang')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__num">FREE</div>
              <div className="stat-card__label">{t('browse.sourceNote')}</div>
            </div>
          </div>
        </div>

        <div className="hero__poster-wrap">
          <div className="hero__poster-glow" />
          <div className="hero__poster">
            {featured.poster ? (
              <img src={featured.poster} alt={title} referrerPolicy="no-referrer" />
            ) : (
              <div style={{ width: '100%', height: '100%', background: `linear-gradient(150deg, ${color}, #0a0d18)` }} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------- continue watching --------------------------- */
function ContinueSection({ onOpenAuth }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!user) { setData({ continueWatching: [] }); return undefined; }
    let alive = true;
    api.get('/api/library/continue')
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ continueWatching: [] }));
    return () => { alive = false; };
  }, [user]);

  const items = data?.continueWatching || [];

  return (
    <section className="section">
      <div className="section__head">
        <div>
          <h2 className="section__title">▶️ {t('dashboard.continue')}</h2>
          <p className="section__sub">{t('dashboard.continueSub')}</p>
        </div>
        {user && items.length > 0 && <Link className="section__link" to="/mylist">{t('common.more')} →</Link>}
      </div>

      {!user ? (
        <div className="glass" style={{ padding: '1.75rem' }}>
          <EmptyState icon="🍿" title={t('dashboard.loginPrompt')} sub={t('auth.demoHint')}>
            <button type="button" className="btn btn--primary" onClick={() => onOpenAuth('login')}>
              <span className="btn__shine" />
              {t('nav.login')}
            </button>
          </EmptyState>
        </div>
      ) : items.length === 0 ? (
        <div className="glass" style={{ padding: '1.35rem' }}>
          <EmptyState icon="🫧" title={t('dashboard.emptyContinue')} />
        </div>
      ) : (
        <div className="cont-row">
          {items.slice(0, 6).map((e, i) => (
            <ContinueCard key={`${e.slug}-${e.episode}`} entry={e} delay={i} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------ latest eps ------------------------------ */
function LatestSection({ items, loading, error, onRetry }) {
  const { t } = useI18n();
  return (
    <section className="section">
      <div className="section__head">
        <div>
          <h2 className="section__title">🔥 {t('dashboard.latest')}</h2>
          <p className="section__sub">{t('dashboard.latestSub')}</p>
        </div>
        <Link className="section__link" to="/browse">{t('nav.browse')} →</Link>
      </div>

      {loading ? (
        <SkeletonGrid count={8} height={280} />
      ) : error || items.length === 0 ? (
        <div className="glass" style={{ padding: '1.5rem' }}>
          <EmptyState icon="📡" title={t('dashboard.sourceDown')}>
            <button type="button" className="btn btn--ghost" onClick={onRetry}>{t('common.retry')}</button>
          </EmptyState>
        </div>
      ) : (
        <div className="grid-episodes">
          {items.slice(0, 12).map((it, i) => (
            <EpisodeTile key={`${it.slug}-${it.episode}`} item={it} delay={i} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------- favorites ------------------------------- */
function FavoritesSection({ onOpenAuth, version }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [favs, setFavs] = useState(null);

  useEffect(() => {
    if (!user) { setFavs([]); return undefined; }
    let alive = true;
    api.get('/api/library/favorites')
      .then((d) => alive && setFavs(d.favorites || []))
      .catch(() => alive && setFavs([]));
    return () => { alive = false; };
  }, [user, version]);

  const items = favs || [];

  return (
    <section className="section">
      <div className="section__head">
        <div>
          <h2 className="section__title">❤️ {t('dashboard.favorites')}</h2>
        </div>
        {user && items.length > 0 && <Link className="section__link" to="/mylist">{t('common.more')} →</Link>}
      </div>

      {!user ? null : items.length === 0 ? (
        <div className="glass" style={{ padding: '1.35rem' }}>
          <EmptyState icon="💜" title={t('dashboard.emptyFavorites')} />
        </div>
      ) : (
        <div className="grid-anime">
          {items.slice(0, 6).map((s, i) => (
            <ShowCard
              key={s.slug}
              show={{ ...s, episodes: s.episodes }}
              delay={i}
              meta={s.episodes ? t('show.episodeCount', { n: s.episodes }) : ''}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------- trending ------------------------------- */
function TrendingSection() {
  const { t, animeTitle } = useI18n();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => api.get('/api/anime/trending'), []);
  const items = data?.anime || [];

  return (
    <section className="section">
      <div className="section__head">
        <div>
          <h2 className="section__title">📈 {t('dashboard.trending')}</h2>
          <p className="section__sub">{t('dashboard.trendingSub')}</p>
        </div>
      </div>

      {loading ? (
        <SkeletonGrid count={6} />
      ) : error || items.length === 0 ? (
        <div className="glass" style={{ padding: '1.5rem' }}>
          <EmptyState icon="📡" title={t('error.upstream')}>
            <button type="button" className="btn btn--ghost" onClick={reload}>{t('common.retry')}</button>
          </EmptyState>
        </div>
      ) : (
        <div className="grid-anime">
          {items.slice(0, 12).map((a, i) => (
            <ShowCard
              key={a.id}
              show={{
                slug: `find-${a.id}`,
                titleEn: a.titleEnglish || a.titleRomaji,
                titleAr: a.titleArabic,
                poster: a.coverUrl,
                color: a.color,
                episodes: a.episodes
              }}
              delay={i}
              onClick={() => navigate(`/browse?q=${encodeURIComponent(a.titleEnglish || a.titleRomaji || '')}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------ dashboard ------------------------------ */
export default function Dashboard({ onOpenAuth }) {
  const [latest, setLatest] = useState(null);
  const [error, setError] = useState(false);

  const loadLatest = useCallback(() => {
    setLatest(null);
    setError(false);
    api.get('/api/stream/latest')
      .then((d) => setLatest(d.items || []))
      .catch(() => { setLatest([]); setError(true); });
  }, []);

  useEffect(() => { loadLatest(); }, [loadLatest]);

  const featured = latest && latest.length > 0 ? latest[0] : null;

  return (
    <>
      <Hero featured={featured} loading={!latest} onOpenAuth={onOpenAuth} />
      <ContinueSection onOpenAuth={onOpenAuth} />
      <LatestSection items={latest || []} loading={!latest} error={error} onRetry={loadLatest} />
      <FavoritesSection onOpenAuth={onOpenAuth} />
      <TrendingSection />
    </>
  );
}
