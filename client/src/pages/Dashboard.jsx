import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { useAsync, applyLiveColor, useDominantColor, pushToast } from '../hooks/hooks.js';
import ShowCard, { EpisodeTile, ContinueCard } from '../components/ShowCard.jsx';
import { LiquidLoader, SkeletonGrid, EmptyState } from '../components/Loading.jsx';
import LandingHero from '../components/LandingHero.jsx';



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
  const [trending, setTrending] = useState(null);
  const [error, setError] = useState(false);

  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const loadLatest = useCallback(() => {
    setLatest(null);
    setError(false);
    api.get('/api/stream/latest')
      .then((d) => setLatest(d.items || []))
      .catch(() => { setLatest([]); setError(true); });
  }, []);

  useEffect(() => { loadLatest(); }, [loadLatest]);

  useEffect(() => {
    api.get('/api/anime/trending')
      .then((d) => setTrending(d.anime || []))
      .catch(() => setTrending([]));
  }, []);

  // Build rich featured carousel anime items
  const carouselItems = useMemo(() => {
    if (!latest || latest.length === 0) return [];
    const seen = new Set();
    const unique = [];
    for (const item of latest) {
      if (!seen.has(item.slug)) {
        seen.add(item.slug);
        unique.push(item);
      }
      if (unique.length >= 6) break;
    }

    return unique.map((item, idx) => {
      const match = (trending || []).find((t) => {
        const titleL = (item.titleEn || '').toLowerCase();
        const tRomaji = (t.titleRomaji || '').toLowerCase();
        const tEng = (t.titleEnglish || '').toLowerCase();
        return tRomaji.includes(titleL) || titleL.includes(tRomaji) || tEng.includes(titleL) || titleL.includes(tEng);
      }) || (trending && trending[idx]);

      return {
        slug: item.slug,
        titleEn: item.titleEn || match?.titleEnglish || match?.titleRomaji || item.slug,
        titleAr: item.titleAr || match?.titleArabic || null,
        poster: item.poster || match?.coverUrl,
        banner: match?.bannerUrl || item.poster,
        episode: item.episode || 1,
        score: match?.score || (86 + (idx % 10)),
        genres: match?.genres || ['Action', 'Adventure', 'Fantasy'],
        description: match?.description ? match.description.replace(/<[^>]+>/g, '') : null,
        color: match?.color || '#22d3ee'
      };
    });
  }, [latest, trending]);

/* ------------------------ Unified Manga & Manhwa Library Showcase ------------------------ */
function LibraryShowcaseSection() {
  const { lang } = useI18n();

  const trendingPicks = [
    {
      id: 'solo-leveling',
      titleAr: 'سولو ليفلينج (Solo Leveling)',
      titleEn: 'Solo Leveling',
      badge: 'MANHWA',
      type: 'مانهو كورية',
      rating: '9.9',
      chapters: '205 فصلاً',
      cover: 'https://io.mangalik.net/wp-content/uploads/2020/05/Solo-Leveling-1.jpg',
      color: '#8b5cf6'
    },
    {
      id: 'omniscient-readers-viewpoint',
      titleAr: 'وجهة نظر القارئ العليم',
      titleEn: "Omniscient Reader's Viewpoint",
      badge: 'MANHWA',
      type: 'مانهو كورية',
      rating: '9.9',
      chapters: '220 فصلاً',
      cover: 'https://io.mangalik.net/wp-content/uploads/2020/05/1-2-193x278-1.jpg',
      color: '#6366f1'
    },
    {
      id: 'one-piece',
      titleAr: 'ون بيس (One Piece)',
      titleEn: 'One Piece',
      badge: 'MANGA',
      type: 'مانجا يابانية',
      rating: '9.9',
      chapters: '1160 فصلاً',
      cover: 'https://io.mangalik.net/wp-content/uploads/2020/05/One-Piece-1-193x278.jpg',
      color: '#06b6d4'
    },
    {
      id: 'jujutsu-kaisen',
      titleAr: 'جوجوتسو كايسن',
      titleEn: 'Jujutsu Kaisen',
      badge: 'MANGA',
      type: 'مانجا يابانية',
      rating: '9.8',
      chapters: '270 فصلاً',
      cover: 'https://io.mangalik.net/wp-content/uploads/2020/11/Jujutsu-Kaisen-193x278.jpg',
      color: '#f43f5e'
    }
  ];

  return (
    <section className="section">
      <div className="section__head">
        <div>
          <h2 className="section__title">
            📖 {lang === 'ar' ? 'المكتبة (أشهر المانهوا والمانجا الرائجة)' : 'The Library (Trending Manga & Manhwa)'}
          </h2>
          <p className="section__sub">
            {lang === 'ar'
              ? 'اختر مباشرة من بين أشهر أعمال المانهوا والمانجا لقراءتها فورياً ومجاناً عبر منصة BLACK X.'
              : 'Pick from the highest-rated Korean Manhwa and Japanese Manga powered by BLACK X.'}
          </p>
        </div>
        <Link className="section__link" to="/browse">
          {lang === 'ar' ? 'دخول المكتبة الكاملة' : 'Open Full Library'} →
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {trendingPicks.map((pick) => (
          <Link
            key={pick.id}
            to="/browse"
            className="glass glass-hover"
            style={{
              padding: '1rem',
              borderRadius: '16px',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              border: `1px solid ${pick.color}35`,
              transition: 'transform 0.2s ease, border-color 0.2s ease'
            }}
          >
            <div style={{ width: '100%', height: '230px', borderRadius: '12px', overflow: 'hidden', marginBottom: '0.85rem', position: 'relative' }}>
              <img
                src={pick.cover}
                alt={pick.titleEn}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: '8px',
                  insetInlineStart: '8px',
                  background: pick.color,
                  color: '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px'
                }}
              >
                {pick.type}
              </span>
              <span
                style={{
                  position: 'absolute',
                  top: '8px',
                  insetInlineEnd: '8px',
                  background: 'rgba(0, 0, 0, 0.8)',
                  color: '#fbbf24',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px'
                }}
              >
                ★ {pick.rating}
              </span>
            </div>

            <h3 style={{ fontSize: '1.02rem', fontWeight: 800, margin: '0 0 0.35rem', color: '#fff', lineHeight: 1.3 }}>
              {lang === 'ar' ? pick.titleAr : pick.titleEn}
            </h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--ink-dim)', fontWeight: 600 }}>
                {pick.chapters}
              </span>
              <span style={{ fontSize: '0.82rem', color: pick.color, fontWeight: 700 }}>
                {lang === 'ar' ? 'اقرأ الآن 📖' : 'Read Now 📖'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

  return (
    <>
      <LandingHero
        items={carouselItems}
        onOpenAuth={onOpenAuth}
      />

      <ContinueSection onOpenAuth={onOpenAuth} />
      <LatestSection items={latest || []} loading={!latest} error={error} onRetry={loadLatest} />
      <LibraryShowcaseSection />
      <FavoritesSection onOpenAuth={onOpenAuth} />
      <TrendingSection />
    </>
  );
}
