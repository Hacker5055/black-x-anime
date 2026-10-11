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

/* --------------------------- 0. Luxury Pitch-Black Glassy 3D Hero Stage --------------------------- */
function Hero3DStage({ items = [] }) {
  const { lang, formatNumber } = useI18n();
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return undefined;
    const id = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % Math.min(items.length, 5));
    }, 6500);
    return () => clearInterval(id);
  }, [items.length]);

  if (!items || items.length === 0) return null;
  const featuredList = items.slice(0, 5);
  const current = featuredList[activeIdx] || featuredList[0];
  const title = (lang === 'ar' ? current.titleAr : current.titleEn) || current.titleEn || current.slug;

  return (
    <section className="bx-hero-3d">
      <div
        className="bx-hero-3d__backdrop"
        style={{ backgroundImage: `url(${current.poster || ''})` }}
        aria-hidden="true"
      />
      <div className="bx-hero-3d__noise" aria-hidden="true" />

      <div className="bx-hero-3d__inner">
        <div className="bx-hero-3d__info">
          <div className="bx-hero-3d__badges">
            <span className="bx-glass-pill bx-glass-pill--gold">👑 VIP FHD 1080p</span>
            <span className="bx-glass-pill bx-glass-pill--cyan">✨ 3D GLASS EDITION</span>
            {current.episode && (
              <span className="bx-glass-pill">
                {lang === 'ar' ? `الحلقة ${formatNumber(current.episode)}` : `EP ${formatNumber(current.episode)}`}
              </span>
            )}
          </div>

          <h1 className="bx-hero-3d__title">{title}</h1>

          <p className="bx-hero-3d__desc">
            {lang === 'ar'
              ? 'استمتع بالمشاهدة الحصرية على سيرفرات BLACK X الزجاجية ثلاثية الأبعاد بجودة FHD 1080p بدون إعلانات، مع إشعارات فورية على هاتفك والكمبيوتر فور نزول الحلقات.'
              : 'Stream in ultra-crisp FHD 1080p on BLACK X Pitch-Black 3D Glass servers with instant device notifications.'}
          </p>

          <div className="bx-hero-3d__actions">
            <button
              type="button"
              className="bx-btn-3d bx-btn-3d--primary"
              onClick={() =>
                navigate(
                  current.episode
                    ? `/watch/${current.slug}/${current.episode}`
                    : `/show/${current.slug}`
                )
              }
            >
              <span>▶</span>
              <span>{lang === 'ar' ? 'مشاهدة الحلقة الآن' : 'Watch Episode Now'}</span>
            </button>
            <button
              type="button"
              className="bx-btn-3d bx-btn-3d--glass"
              onClick={() => navigate(`/show/${current.slug}`)}
            >
              <span>ℹ️</span>
              <span>{lang === 'ar' ? 'تفاصيل الأنمي' : 'Anime Details'}</span>
            </button>
          </div>

          <div className="bx-hero-3d__thumbs">
            {featuredList.map((it, idx) => (
              <button
                key={it.slug || idx}
                type="button"
                className={`bx-hero-3d__thumb ${idx === activeIdx ? 'active' : ''}`}
                onClick={() => setActiveIdx(idx)}
                title={it.titleAr || it.titleEn}
              >
                <img src={it.poster} alt={it.titleEn || ''} referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        </div>

        <div className="bx-hero-3d__showcase">
          <div
            className="bx-hero-3d__card-wrap"
            onClick={() => navigate(`/show/${current.slug}`)}
            role="button"
            tabIndex={0}
          >
            <div className="bx-hero-3d__aura" aria-hidden="true" />
            <div className="bx-hero-3d__card">
              <img src={current.poster} alt={title} referrerPolicy="no-referrer" />
              <div className="bx-hero-3d__card-shine" />
              <span className="bx-hero-3d__card-tag">
                {lang === 'ar' ? '🔥 يعرض الآن • 3D' : '🔥 AIRING • 3D'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------- 1. Pinned Anime (الأنميات المثبتة) --------------------------- */
function PinnedAnimeSection({ items = [], loading }) {
  const { lang } = useI18n();
  const navigate = useNavigate();

  return (
    <section className="wit-section" id="pinned-anime">
      <WitSectionHeader
        icon="📌"
        title={lang === 'ar' ? 'الأنميات المثبتة' : 'Pinned Season Anime'}
        sub={lang === 'ar' ? 'أقوى أنميات الموسم المختارة بجودة FHD 1080p' : 'Top featured seasonal anime in FHD 1080p'}
        linkTo="/trending"
        linkLabel={lang === 'ar' ? 'قائمة الأنمي ←' : 'All Anime →'}
      />

      {loading ? (
        <SkeletonGrid count={6} />
      ) : (
        <div className="wit-grid-anime grid-anime">
          {items.slice(0, 6).map((item, i) => (
            <ShowCard
              key={item.slug || i}
              show={{
                slug: item.slug,
                titleEn: item.titleEn,
                titleAr: item.titleAr,
                poster: item.poster,
                episodes: item.episode,
                color: item.color
              }}
              delay={i}
              onClick={() => navigate(`/show/${item.slug}`)}
            />
          ))}
        </div>
      )}
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
      {/* Quick Navigation Strip (Search form removed per user request) */}
      <div className="wit-top-strip">
        <div className="wit-quick-cats">
          <a href="#pinned-anime" className="wit-cat-pill active">📌 {lang === 'ar' ? 'الأنميات المثبتة' : 'Pinned'}</a>
          <a href="#latest-episodes" className="wit-cat-pill">🔥 {lang === 'ar' ? 'أحدث الحلقات' : 'Latest Episodes'}</a>
          <a href="#schedule-section" className="wit-cat-pill">📅 {lang === 'ar' ? 'مواعيد الحلقات' : 'Schedule'}</a>
          <Link to="/trending" className="wit-cat-pill">📋 {lang === 'ar' ? 'قائمة الأنمي والأعمال الرائجة' : 'Anime List'}</Link>
          <Link to="/browse" className="wit-cat-pill">📖 {lang === 'ar' ? 'المانجا والمانهوا' : 'Manga'}</Link>
          <Link to="/profile?tab=referrals" className="wit-cat-pill wit-cat-pill--vip">
            👑 {isVip ? (lang === 'ar' ? 'عضوية VIP مفعّلة ✓' : 'VIP Active ✓') : (lang === 'ar' ? 'اشترك في VIP (FHD 1080p)' : 'Get VIP FHD')}
          </Link>
        </div>
      </div>

      {/* 0. Luxury Pitch-Black Glassy 3D Hero Stage */}
      <Hero3DStage items={pinnedItems} />

      {/* 1. Pinned Season Anime (الأنميات المثبتة) */}
      <PinnedAnimeSection items={pinnedItems} loading={!latest} />

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
