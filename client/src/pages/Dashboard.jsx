import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { useAsync } from '../hooks/hooks.js';
import ShowCard, { EpisodeTile, ContinueCard } from '../components/ShowCard.jsx';
import { SkeletonGrid, EmptyState } from '../components/Loading.jsx';
import { resolveUserVipTier } from '../components/VipPlansAndDevCodes.jsx';

const WEEK_DAYS = [
  { id: 6, ar: 'السبت', en: 'Saturday' },
  { id: 0, ar: 'الأحد', en: 'Sunday' },
  { id: 1, ar: 'الإثنين', en: 'Monday' },
  { id: 2, ar: 'الثلاثاء', en: 'Tuesday' },
  { id: 3, ar: 'الأربعاء', en: 'Wednesday' },
  { id: 4, ar: 'الخميس', en: 'Thursday' },
  { id: 5, ar: 'الجمعة', en: 'Friday' }
];

/* --------------------------- WitAnime Section Header --------------------------- */
function WitSectionHeader({ icon, title, sub, linkTo, linkLabel }) {
  return (
    <div className="wit-sec-header">
      <div className="wit-sec-header__right">
        <span className="wit-sec-header__bar" />
        <div>
          <h2 className="wit-sec-header__title">
            {icon && <span>{icon}</span>} {title}
          </h2>
          {sub && <p className="wit-sec-header__sub">{sub}</p>}
        </div>
      </div>
      {linkTo && (
        <Link className="wit-sec-header__more" to={linkTo}>
          {linkLabel || 'المزيد ←'}
        </Link>
      )}
    </div>
  );
}

/* --------------------------- 0. Exact WitAnime Cinema Hero Banner --------------------------- */
function Hero3DStage({ items = [], trending = [] }) {
  const { lang, formatNumber } = useI18n();
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = useState(0);

  const heroPool = useMemo(() => {
    const merged = [];
    const seen = new Set();
    for (const item of [...(items || []), ...(trending || [])]) {
      const key = item.slug || item.id || item.titleEn;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
      if (merged.length >= 6) break;
    }
    return merged;
  }, [items, trending]);

  useEffect(() => {
    if (heroPool.length <= 1) return undefined;
    const id = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % heroPool.length);
    }, 6500);
    return () => clearInterval(id);
  }, [heroPool.length]);

  if (!heroPool.length) return null;
  const current = heroPool[activeIdx] || heroPool[0];
  const displayTitle = current.titleEn || current.titleAr || current.slug;
  const subLine =
    current.titleAr && current.titleAr !== displayTitle
      ? current.titleAr
      : lang === 'ar'
      ? 'القسم الجديد من الموسم متاح الآن بجودة عالية.'
      : 'New season episodes streaming now in Full HD.';
  const epCount = current.episodes || current.episode || 12;
  const score = current.score ? (Number(current.score) / 10).toFixed(1) : '8.8';
  const artwork = current.banner || current.poster || current.coverUrl || '';

  return (
    <section className="wit-cinema-hero">
      {/* Left Artwork Area (in RTL) with seamless black edge fade */}
      <div className="wit-cinema-hero__art-wrap" aria-hidden="true">
        <img
          src={artwork}
          alt={displayTitle}
          className="wit-cinema-hero__art"
          referrerPolicy="no-referrer"
        />
        <div className="wit-cinema-hero__fade" />
      </div>

      {/* Right Content Area (in RTL) */}
      <div className="wit-cinema-hero__content">
        <h1 className="wit-cinema-hero__title">{displayTitle}</h1>

        <div className="wit-cinema-hero__meta">
          <span className="wit-cinema-hero__tv-pill">TV</span>
          <span className="wit-cinema-hero__score-pill">★ {score}</span>
          <span className="wit-cinema-hero__meta-text">
            • 2026 • {formatNumber(epCount)} {lang === 'ar' ? 'حلقات' : 'Episodes'} •{' '}
            {lang === 'ar' ? 'مستمر • أكشن، مغامرة، شونين' : 'Airing • Action, Adventure, Shonen'}
          </span>
        </div>

        <p className="wit-cinema-hero__desc">{subLine}</p>

        <div className="wit-cinema-hero__cta-row">
          <button
            type="button"
            className="wit-watch-pill-btn"
            onClick={() =>
              navigate(
                current.episode && current.slug
                  ? `/watch/${current.slug}/${current.episode}`
                  : current.slug
                  ? `/show/${current.slug}`
                  : `/trending?q=${encodeURIComponent(displayTitle)}`
              )
            }
          >
            <span className="wit-watch-pill-btn__arrow">▶</span>
            <span>{lang === 'ar' ? 'شاهد الآن' : 'Watch Now'}</span>
          </button>
        </div>

        {/* Pagination Dots */}
        <div className="wit-hero-dots" role="tablist">
          {heroPool.map((it, idx) => (
            <button
              key={it.slug || it.id || idx}
              type="button"
              className={`wit-hero-dot ${idx === activeIdx ? 'active' : ''}`}
              onClick={() => setActiveIdx(idx)}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- 1. Split Row: الأكثر مشاهدة (1..6) + أشهر أنميات الموسم --------------------------- */
function MostWatchedAndSeasonSplit({ latestItems = [], seasonItems = [], loading }) {
  const { lang, formatNumber } = useI18n();
  const navigate = useNavigate();

  const rankedEpisodes = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const item of latestItems || []) {
      if (!seen.has(item.slug)) {
        seen.add(item.slug);
        list.push(item);
      }
      if (list.length >= 6) break;
    }
    return list;
  }, [latestItems]);

  const sideAnime = useMemo(() => {
    const source = seasonItems && seasonItems.length > 0 ? seasonItems : rankedEpisodes;
    return source.slice(0, 6);
  }, [seasonItems, rankedEpisodes]);

  return (
    <section className="wit-split-showcase" id="pinned-anime">
      {/* Right Column in RTL: الأكثر مشاهدة (حلقات) */}
      <div className="wit-split-showcase__main">
        <div className="wit-bar-head">
          <span className="wit-bar-head__line" />
          <h2 className="wit-bar-head__title">{lang === 'ar' ? 'الأكثر مشاهدة' : 'Most Watched'}</h2>
          <span className="wit-bar-head__tag">{lang === 'ar' ? 'حلقات' : 'Episodes'}</span>
        </div>

        {loading ? (
          <SkeletonGrid count={6} />
        ) : (
          <div className="wit-ranked-grid">
            {rankedEpisodes.map((item, idx) => {
              const title = item.titleEn || item.titleAr || item.slug;
              return (
                <div key={item.slug || idx} className="bx-3d-stage">
                  <article
                    className="wit-ranked-card bx-3d-card"
                    onClick={() => navigate(`/watch/${item.slug}/${item.episode || 1}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="wit-ranked-card__poster">
                      <img src={item.poster} alt={title} loading="lazy" referrerPolicy="no-referrer" />
                      <div className="wit-ranked-card__shade" />

                      {/* Top-Right White Rank Square (1, 2, 3, 4, 5, 6) */}
                      <span className="wit-rank-num">{idx + 1}</span>

                      {/* Top-Left Dark Episode Pill (الحلقة X) */}
                      <span className="wit-rank-ep">
                        {lang === 'ar'
                          ? `الحلقة ${formatNumber(item.episode || 1)}`
                          : `EP ${formatNumber(item.episode || 1)}`}
                      </span>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Left Sidebar in RTL: أشهر أنميات الموسم */}
      <aside className="wit-split-showcase__side">
        <div className="wit-bar-head">
          <span className="wit-bar-head__line" />
          <h2 className="wit-bar-head__title">{lang === 'ar' ? 'أشهر أنميات الموسم' : 'Popular This Season'}</h2>
        </div>

        <div className="wit-season-side-box">
          {sideAnime.map((item, idx) => {
            const name = item.titleEn || item.titleAr || item.slug;
            const poster = item.poster || item.coverUrl || '';
            return (
              <div
                key={item.slug || item.id || idx}
                className="wit-season-side-item"
                onClick={() =>
                  navigate(
                    item.slug
                      ? `/show/${item.slug}`
                      : `/trending?q=${encodeURIComponent(name)}`
                  )
                }
                role="button"
                tabIndex={0}
              >
                <div className="wit-season-side-item__thumb">
                  <img src={poster} alt={name} loading="lazy" referrerPolicy="no-referrer" />
                </div>
                <div className="wit-season-side-item__info">
                  <div className="wit-season-side-item__title">{name}</div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </section>
  );
}

/* --------------------------- 2. Latest Added Episodes (أحدث الحلقات المضافة) --------------------------- */
function LatestSection({ items, loading, error, onRetry }) {
  const { t, lang } = useI18n();
  return (
    <section className="wit-section" id="latest-episodes">
      <WitSectionHeader
        icon="🔥"
        title={lang === 'ar' ? 'أحدث الحلقات المضافة' : t('dashboard.latest')}
        sub={
          lang === 'ar'
            ? 'تنزل الحلقات الرسمية في نفس اليوم لمشتركي VIP (وتتأخر 24 ساعة للنسخة المجانية)'
            : t('dashboard.latestSub')
        }
        linkTo="/trending"
        linkLabel={lang === 'ar' ? 'عرض كل الحلقات ←' : 'All Episodes →'}
      />

      {loading ? (
        <SkeletonGrid count={12} height={240} />
      ) : error || items.length === 0 ? (
        <div className="wit-panel" style={{ padding: '1.5rem' }}>
          <EmptyState icon="📡" title={t('dashboard.sourceDown')}>
            <button type="button" className="btn btn--ghost" onClick={onRetry}>{t('common.retry')}</button>
          </EmptyState>
        </div>
      ) : (
        <div className="wit-grid-episodes grid-episodes">
          {items.slice(0, 18).map((it, i) => (
            <EpisodeTile key={`${it.slug}-${it.episode}-${i}`} item={it} delay={i} />
          ))}
        </div>
      )}
    </section>
  );
}

/* --------------------------- 3. WitAnime Weekly Airing Schedule (مواعيد الحلقات) --------------------------- */
function WeeklyScheduleSection({ items = [] }) {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const todayJs = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(todayJs);

  const dayItems = useMemo(() => {
    if (!items.length) return [];
    return items.filter((_, idx) => idx % 7 === selectedDay % 7 || idx < 6).slice(0, 6);
  }, [items, selectedDay]);

  return (
    <section className="wit-section" id="schedule-section">
      <WitSectionHeader
        icon="📅"
        title={lang === 'ar' ? 'مواعيد عرض الحلقات الأسبوعية' : 'Weekly Episode Airing Schedule'}
        sub={lang === 'ar' ? 'اختر اليوم لمعرفة الأنميات التي تعرض فيه' : 'Select a day of the week to view airing anime'}
      />

      <div className="wit-days-bar">
        {WEEK_DAYS.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`wit-day-tab ${selectedDay === d.id ? 'active' : ''}`}
            onClick={() => setSelectedDay(d.id)}
          >
            {lang === 'ar' ? d.ar : d.en}
            {d.id === todayJs && (
              <span className="wit-day-tab__today">{lang === 'ar' ? 'اليوم' : 'Today'}</span>
            )}
          </button>
        ))}
      </div>

      <div className="wit-grid-anime grid-anime">
        {dayItems.map((it, i) => (
          <ShowCard
            key={`sched-${it.slug}-${i}`}
            show={{
              slug: it.slug,
              titleEn: it.titleEn,
              titleAr: it.titleAr,
              poster: it.poster,
              episodes: it.episode
            }}
            delay={i}
            onClick={() => navigate(`/show/${it.slug}`)}
          />
        ))}
      </div>
    </section>
  );
}

/* --------------------------- 4. Continue Watching --------------------------- */
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
  if (!user || items.length === 0) return null;

  return (
    <section className="wit-section">
      <WitSectionHeader
        icon="▶️"
        title={t('dashboard.continue')}
        sub={t('dashboard.continueSub')}
        linkTo="/mylist"
        linkLabel={lang === 'ar' ? 'قائمتي ←' : 'My List →'}
      />
      <div className="cont-row">
        {items.slice(0, 6).map((e, i) => (
          <ContinueCard key={`${e.slug}-${e.episode}`} entry={e} delay={i} />
        ))}
      </div>
    </section>
  );
}

/* --------------------------- 5. Season Trending Anime (أنميات الموسم) --------------------------- */
function TrendingSection() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => api.get('/api/anime/trending'), []);
  const items = data?.anime || [];

  return (
    <section className="wit-section">
      <WitSectionHeader
        icon="🍂"
        title={lang === 'ar' ? 'أنميات الموسم الأكثر شعبية' : t('dashboard.trending')}
        sub={lang === 'ar' ? 'الأعمال الأعلى مشاهدة وتقييماً هذا الموسم' : t('dashboard.trendingSub')}
        linkTo="/trending"
        linkLabel={lang === 'ar' ? 'كل الأعمال الرائجة ←' : 'Explore All →'}
      />

      {loading ? (
        <SkeletonGrid count={6} />
      ) : error || items.length === 0 ? (
        <div className="wit-panel" style={{ padding: '1.5rem' }}>
          <EmptyState icon="📡" title={t('error.upstream')}>
            <button type="button" className="btn btn--ghost" onClick={reload}>{t('common.retry')}</button>
          </EmptyState>
        </div>
      ) : (
        <div className="wit-grid-anime grid-anime">
          {items.slice(0, 12).map((a, i) => (
            <ShowCard
              key={a.id}
              show={{
                slug: `find-${a.id}`,
                titleEn: a.titleEnglish || a.titleRomaji,
                titleAr: a.titleArabic,
                poster: a.coverUrl,
                color: a.color,
                episodes: a.episodes,
                status: a.status
              }}
              delay={i}
              onClick={() => navigate(`/trending?q=${encodeURIComponent(a.titleEnglish || a.titleRomaji || '')}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* --------------------------- 6. Manga & Manhwa Section --------------------------- */
function LibraryShowcaseSection() {
  const { lang } = useI18n();

  const trendingPicks = [
    {
      id: 'solo-leveling',
      titleAr: 'سولو ليفلينج (Solo Leveling)',
      titleEn: 'Solo Leveling',
      type: 'مانهوا',
      rating: '9.9',
      chapters: '205 فصل',
      cover: 'https://io.mangalik.net/wp-content/uploads/2020/05/Solo-Leveling-1.jpg'
    },
    {
      id: 'omniscient-readers-viewpoint',
      titleAr: 'وجهة نظر القارئ العليم',
      titleEn: "Omniscient Reader's Viewpoint",
      type: 'مانهوا',
      rating: '9.9',
      chapters: '220 فصل',
      cover: 'https://io.mangalik.net/wp-content/uploads/2020/05/1-2-193x278-1.jpg'
    },
    {
      id: 'one-piece',
      titleAr: 'ون بيس (One Piece)',
      titleEn: 'One Piece',
      type: 'مانجا',
      rating: '9.9',
      chapters: '1160 فصل',
      cover: 'https://io.mangalik.net/wp-content/uploads/2020/05/One-Piece-1-193x278.jpg'
    },
    {
      id: 'jujutsu-kaisen',
      titleAr: 'جوجوتسو كايسن',
      titleEn: 'Jujutsu Kaisen',
      type: 'مانجا',
      rating: '9.8',
      chapters: '270 فصل',
      cover: 'https://io.mangalik.net/wp-content/uploads/2020/11/Jujutsu-Kaisen-193x278.jpg'
    }
  ];

  return (
    <section className="wit-section">
      <WitSectionHeader
        icon="📖"
        title={lang === 'ar' ? 'أحدث فصول المانجا والمانهوا' : 'Trending Manga & Manhwa'}
        sub={lang === 'ar' ? 'قراءة مباشرة لجميع الفصول المترجمة بالعربية' : 'Read high-res chapters directly'}
        linkTo="/browse"
        linkLabel={lang === 'ar' ? 'دخول المكتبة ←' : 'Full Library →'}
      />

      <div className="wit-grid-anime grid-anime">
        {trendingPicks.map((pick, i) => (
          <ShowCard
            key={pick.id}
            show={{
              slug: pick.id,
              titleAr: pick.titleAr,
              titleEn: pick.titleEn,
              poster: pick.cover
            }}
            meta={pick.chapters}
            delay={i}
            onClick={() => { window.location.href = '/browse'; }}
          />
        ))}
      </div>
    </section>
  );
}

/* --------------------------- 7. Favorites --------------------------- */
function FavoritesSection() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [favs, setFavs] = useState([]);

  useEffect(() => {
    if (!user) { setFavs([]); return undefined; }
    let alive = true;
    api.get('/api/library/favorites')
      .then((d) => alive && setFavs(d.favorites || []))
      .catch(() => alive && setFavs([]));
    return () => { alive = false; };
  }, [user]);

  if (!user || favs.length === 0) return null;

  return (
    <section className="wit-section">
      <WitSectionHeader
        icon="❤️"
        title={t('dashboard.favorites')}
        linkTo="/mylist"
        linkLabel={lang === 'ar' ? 'عرض الكل ←' : 'View All →'}
      />
      <div className="wit-grid-anime grid-anime">
        {favs.slice(0, 6).map((s, i) => (
          <ShowCard key={s.slug} show={s} delay={i} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ Main WitAnime Home Page ------------------------------ */
export default function Dashboard({ onOpenAuth }) {
  const [latest, setLatest] = useState(null);
  const [trending, setTrending] = useState(null);
  const [error, setError] = useState(false);

  const { lang } = useI18n();
  const { user } = useAuth();
  const vipTier = resolveUserVipTier(user);
  const isVip = vipTier === 'vip_basic' || vipTier === 'vip_monarch';

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

  const pinnedItems = useMemo(() => {
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
    return unique;
  }, [latest]);

  return (
    <div className="wit-home-wrap">
      {/* 0. Exact WitAnime Cinema Hero Banner */}
      <Hero3DStage items={pinnedItems} trending={trending || []} />

      {/* 1. Split Row: الأكثر مشاهدة (1..6) + أشهر أنميات الموسم */}
      <MostWatchedAndSeasonSplit
        latestItems={latest || []}
        seasonItems={trending || []}
        loading={!latest}
      />

      {/* 2. Continue Watching (if logged in) */}
      <ContinueSection onOpenAuth={onOpenAuth} />

      {/* 3. Latest Added Episodes (أحدث الحلقات المضافة) */}
      <LatestSection items={latest || []} loading={!latest} error={error} onRetry={loadLatest} />

      {/* 4. Weekly Airing Schedule (مواعيد الحلقات) */}
      <WeeklyScheduleSection items={pinnedItems} />

      {/* 5. Seasonal Trending Anime (أنميات الموسم) */}
      <TrendingSection />

      {/* 6. Manga & Manhwa Library */}
      <LibraryShowcaseSection />

      {/* 7. User Favorites */}
      <FavoritesSection onOpenAuth={onOpenAuth} />
    </div>
  );
}
