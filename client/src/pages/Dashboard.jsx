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

/* ------------------------ expanded library showcase ------------------------ */
function LibraryShowcaseSection() {
  const { lang } = useI18n();
  const libraryCategories = [
    {
      id: 'manga',
      titleAr: '📖 المانجا اليابانية',
      titleEn: '📖 Manga Library',
      descAr: 'فصول مترجمة لأقوى سلاسل المانجا الأسبوعية والشهرية',
      descEn: 'Popular translated weekly and monthly manga chapters',
      color: '#f472b6',
      badge: 'MANGA',
      cover: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30013-ul2E8b4b7p1T.png'
    },
    {
      id: 'manhwa',
      titleAr: '⚡ المانهوا الكورية',
      titleEn: '⚡ Korean Manhwa',
      descAr: 'أعمال ملونة بالكامل، من سولو ليفلينج إلى وجهات النظر الشاملة',
      descEn: 'Full-color webtoons, action dungeons, and rebirth epics',
      color: '#a78bfa',
      badge: 'MANHWA',
      cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'novel',
      titleAr: '📚 الروايات الخفيفة',
      titleEn: '📚 Light Novels',
      descAr: 'الروايات الأصلية المقتبس منها أشهر الأنميات العالمية',
      descEn: 'Original web and light novels behind major anime adaptations',
      color: '#38bdf8',
      badge: 'NOVEL',
      cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'book',
      titleAr: '📕 الكتب والمراجع',
      titleEn: '📕 Books & Literature',
      descAr: 'كتب الفكر والخيال العلمي والأدب الكلاسيكي العالمي',
      descEn: 'Classics, world literature, philosophy, and mind-expanding books',
      color: '#fb923c',
      badge: 'BOOK',
      cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80'
    }
  ];

  return (
    <section className="section">
      <div className="section__head">
        <div>
          <h2 className="section__title">
            📚 {lang === 'ar' ? 'المكتبة الموسعة: مانجا، مانهوا، روايات، وكتب' : 'Expanded Library: Manga, Manhwa, Novels & Books'}
          </h2>
          <p className="section__sub">
            {lang === 'ar'
              ? 'تصفح واقرأ آلاف الفصول والكتب مع تسجيل مدة القراءة وزيادة مستواك (XP) تلقائياً!'
              : 'Explore and read chapters while tracking reading time to level up your rank!'}
          </p>
        </div>
        <Link className="section__link" to="/browse?category=manga">
          {lang === 'ar' ? 'استعراض الكل' : 'Browse All'} →
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {libraryCategories.map((cat) => (
          <Link
            key={cat.id}
            to={`/browse?category=${cat.id}`}
            className="glass glass-hover"
            style={{
              padding: '1.25rem',
              borderRadius: '18px',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              border: `1px solid ${cat.color}35`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span className={`media-tag-badge media-tag-badge--${cat.id}`}>
                {cat.badge}
              </span>
              <span style={{ fontSize: '0.82rem', color: cat.color, fontWeight: 700 }}>
                {lang === 'ar' ? 'تصفح الآن ←' : 'Explore →'}
              </span>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.4rem', color: '#fff' }}>
              {lang === 'ar' ? cat.titleAr : cat.titleEn}
            </h3>

            <p style={{ fontSize: '0.84rem', color: 'var(--ink-dim)', margin: '0 0 1rem', lineHeight: 1.45, flex: 1 }}>
              {lang === 'ar' ? cat.descAr : cat.descEn}
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.04)',
              fontSize: '0.76rem',
              color: 'var(--cyan)'
            }}>
              <span>⚡</span>
              <span>{lang === 'ar' ? 'قراءة فصول تكسبك نقاط XP فورية' : 'Earn XP while reading'}</span>
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
