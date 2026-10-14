import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { useAsync } from '../hooks/hooks.js';
import ShowCard, { EpisodeTile, ContinueCard } from '../components/ShowCard.jsx';
import { SkeletonGrid, EmptyState } from '../components/Loading.jsx';
import { resolveUserVipTier } from '../components/VipPlansAndDevCodes.jsx';
import AnimeDiscover from '../components/AnimeDiscover.jsx';

const WEEK_DAYS = [
  { id: 6, ar: 'السبت', en: 'Saturday' },
  { id: 0, ar: 'الأحد', en: 'Sunday' },
  { id: 1, ar: 'الإثنين', en: 'Monday' },
  { id: 2, ar: 'الثلاثاء', en: 'Tuesday' },
  { id: 3, ar: 'الأربعاء', en: 'Wednesday' },
  { id: 4, ar: 'الخميس', en: 'Thursday' },
  { id: 5, ar: 'الجمعة', en: 'Friday' }
];

/* --------------------------- Official slothUI Pro 2.0 Section Header --------------------------- */
function WitSectionHeader({ icon, title, sub, linkTo, linkLabel }) {
  return (
    <div
      className="wit-sec-header sloth-sec-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
        marginBottom: '1.15rem',
        padding: '0.85rem 1.15rem',
        borderRadius: '22px',
        background: 'rgba(10, 10, 15, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        backdropFilter: 'blur(20px)'
      }}
    >
      <div className="wit-sec-header__right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <img
          src="/blackx-logo.png"
          alt="BLACK X"
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            objectFit: 'cover',
            border: '1px solid rgba(255,255,255,0.32)',
            flexShrink: 0
          }}
        />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '2px' }}>
            <span style={{ fontSize: '0.64rem', fontWeight: 900, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.68)' }}>
              BLACK X ORIGINAL • SLOTHUI PRO
            </span>
          </div>
          <h2 className="wit-sec-header__title" style={{ margin: 0, fontSize: '1.22rem', fontWeight: 900 }}>
            {icon && <span>{icon}</span>} {title}
          </h2>
          {sub && (
            <p className="wit-sec-header__sub" style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.62)' }}>
              {sub}
            </p>
          )}
        </div>
      </div>
      {linkTo && (
        <Link
          className="wit-sec-header__more sloth-pill-cta"
          to={linkTo}
          style={{
            padding: '0.48rem 1.05rem',
            borderRadius: '999px',
            background: '#ffffff',
            color: '#000000',
            fontWeight: 900,
            fontSize: '0.8rem',
            border: '1.5px solid #ffffff',
            boxShadow: '0 6px 20px rgba(255,255,255,0.18)'
          }}
        >
          {linkLabel || 'المزيد ←'}
        </Link>
      )}
    </div>
  );
}

const DEFAULT_HERO_SLIDES = [
  {
    slug: 'bleach-sennen-kessen-hen',
    titleEn: 'BLEACH: Sennen Kessen-hen - Soukoku-tan',
    titleAr: 'القسم الثالث من حرب الألفية الدموية متاح الآن بجودة عالية.',
    episodes: 14,
    score: 89,
    poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/169755-82wS1kG2a1kZ.jpg'
  },
  {
    slug: 'solo-leveling',
    titleEn: 'Solo Leveling: Arise from the Shadow',
    titleAr: 'الموسم الجديد متاح الآن بجودة FHD 1080p.',
    episodes: 12,
    score: 88,
    poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37yfQA3ym8PA.jpg'
  }
];

/* --------------------------- 0. Official slothUI Pro 2.0 Cinema Hero Banner ("Handmaiden Tales" + "Houses & Dragons") --------------------------- */
function Hero3DStage({ items = [], trending = [] }) {
  const { lang, formatNumber } = useI18n();
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = useState(0);

  const heroPool = useMemo(() => {
    const merged = [];
    const seen = new Set();
    for (const item of [...(items || []), ...(trending || [])]) {
      const key = item.slug || item.id || item.titleEn || item.titleEnglish || item.titleRomaji;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
      if (merged.length >= 6) break;
    }
    return merged.length > 0 ? merged : DEFAULT_HERO_SLIDES;
  }, [items, trending]);

  useEffect(() => {
    if (heroPool.length <= 1) return undefined;
    const id = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % heroPool.length);
    }, 6500);
    return () => clearInterval(id);
  }, [heroPool.length]);

  const current = heroPool[activeIdx] || heroPool[0];
  const displayTitle =
    current.titleEn ||
    current.titleEnglish ||
    current.titleRomaji ||
    current.titleAr ||
    current.titleArabic ||
    current.slug;
  const arabicSub = current.titleAr || current.titleArabic;
  const subLine =
    arabicSub && arabicSub !== displayTitle
      ? arabicSub
      : lang === 'ar'
      ? 'القسم الجديد من الموسم متاح الآن بجودة FHD 1080p وسرعة 120Hz عبر سيرفرات BLACK X.'
      : 'New season episodes streaming now in Full HD 1080p on BLACK X.';
  const epCount = current.episodes || current.episode || 12;
  const score = current.score ? (Number(current.score) / 10).toFixed(1) : '9.4';
  const artwork =
    current.banner ||
    current.bannerUrl ||
    current.poster ||
    current.coverUrl ||
    '/blackx-logo.png';

  const heroGenres =
    lang === 'ar'
      ? ['أكشن', 'فانتازيا', 'شونين']
      : ['Action', 'Fantasy', 'Shonen'];

  return (
    <div style={{ marginBottom: '1.6rem' }}>
      <section
        className="wit-cinema-hero sloth-pro-hero"
        style={{
          position: 'relative',
          borderRadius: '28px',
          overflow: 'hidden',
          minHeight: '440px',
          background: '#050508',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 28px 70px rgba(0,0,0,0.95)'
        }}
      >
        {/* Full-Bleed Artwork with slothUI Pro Bottom & Side Vignette */}
        <div className="wit-cinema-hero__art-wrap" aria-hidden="true">
          <img
            src={artwork}
            alt={displayTitle}
            className="wit-cinema-hero__art"
            referrerPolicy="no-referrer"
          />
          <div className="wit-cinema-hero__fade" />
        </div>

        {/* Top-Right/Left Official [BLACK X] original Seal */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            insetInlineStart: '22px',
            zIndex: 4,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.32rem 0.85rem 0.32rem 0.42rem',
            borderRadius: '999px',
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.24)'
          }}
        >
          <img
            src="/blackx-logo.png"
            alt="BLACK X"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '7px',
              objectFit: 'cover',
              border: '1px solid rgba(255,255,255,0.35)'
            }}
          />
          <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.02em' }}>
            BLACK X <span style={{ fontWeight: 500, opacity: 0.78 }}>original</span>
          </span>
          <span
            style={{
              padding: '0.1rem 0.5rem',
              borderRadius: '999px',
              background: '#ffffff',
              color: '#000000',
              fontSize: '0.64rem',
              fontWeight: 900
            }}
          >
            4K • 120Hz
          </span>
        </div>

        {/* Right/Center Content Area (Official slothUI Pro Layout) */}
        <div className="wit-cinema-hero__content" style={{ position: 'relative', zIndex: 3, paddingTop: '3.6rem' }}>
          {/* 1. slothUI Pro Genre Pills ABOVE Title */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.7rem' }}>
            {heroGenres.map((g, i) => (
              <span
                key={i}
                style={{
                  padding: '0.26rem 0.82rem',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(14px)',
                  border: '1px solid rgba(255,255,255,0.28)',
                  color: '#ffffff',
                  fontSize: '0.74rem',
                  fontWeight: 800
                }}
              >
                {g}
              </span>
            ))}
            <span
              style={{
                padding: '0.26rem 0.75rem',
                borderRadius: '999px',
                background: '#ffffff',
                color: '#000000',
                fontSize: '0.72rem',
                fontWeight: 900
              }}
            >
              TV-MA • 2026
            </span>
          </div>

          {/* 2. Giant Bold Title */}
          <h1
            className="wit-cinema-hero__title"
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.85rem)',
              fontWeight: 900,
              lineHeight: 1.12,
              marginBottom: '0.6rem',
              textShadow: '0 8px 28px rgba(0,0,0,0.95)'
            }}
          >
            {displayTitle}
          </h1>

          {/* 3. slothUI Pro Metadata Bar */}
          <div className="wit-cinema-hero__meta" style={{ marginBottom: '0.75rem' }}>
            <span
              style={{
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                background: '#ffffff',
                color: '#000000',
                fontWeight: 900,
                fontSize: '0.76rem'
              }}
            >
              ★ {score}
            </span>
            <span
              style={{
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.24)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.74rem'
              }}
            >
              🧬 98% Match
            </span>
            <span className="wit-cinema-hero__meta-text" style={{ fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
              • {formatNumber(epCount)} {lang === 'ar' ? 'حلقات' : 'Episodes'} • FHD 1080p
            </span>
          </div>

          <p className="wit-cinema-hero__desc" style={{ maxWidth: '620px', color: 'rgba(255,255,255,0.78)' }}>
            {subLine}
          </p>

          {/* 4. slothUI Pro Dual Capsule CTA + Circular Orbs */}
          <div
            className="wit-cinema-hero__cta-row"
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginTop: '0.9rem' }}
          >
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
              style={{
                padding: '0.76rem 1.65rem',
                borderRadius: '999px',
                background: '#ffffff',
                color: '#000000',
                border: '1.5px solid #ffffff',
                fontWeight: 900,
                fontSize: '0.9rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 10px 30px rgba(255,255,255,0.25)',
                cursor: 'pointer'
              }}
            >
              <span>▶</span>
              <span>{lang === 'ar' ? 'شاهد الآن' : 'Watch Now'}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  current.slug
                    ? `/show/${current.slug}`
                    : `/trending?q=${encodeURIComponent(displayTitle)}`
                )
              }
              style={{
                padding: '0.76rem 1.35rem',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(16px)',
                color: '#ffffff',
                border: '1.5px solid rgba(255,255,255,0.3)',
                fontWeight: 900,
                fontSize: '0.86rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                cursor: 'pointer'
              }}
            >
              <span>ℹ️</span>
              <span>{lang === 'ar' ? 'تفاصيل الأنمي' : 'Show Hub'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/discover')}
              title={lang === 'ar' ? 'عجلة الاكتشاف الذكية' : 'Smart Discovery'}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.28)',
                color: '#ffffff',
                fontSize: '1rem',
                fontWeight: 900,
                cursor: 'pointer'
              }}
            >
              🎲
            </button>
          </div>

          {/* Pagination Capsule Dots */}
          <div className="wit-hero-dots" role="tablist" style={{ marginTop: '1.15rem' }}>
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

      {/* Official slothUI Pro 2.0 Quick Category Capsule Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.55rem',
          overflowX: 'auto',
          padding: '0.85rem 0.15rem 0.15rem',
          scrollbarWidth: 'none'
        }}
      >
        {[
          { ar: '🔥 جميع الأنميات (6,973)', en: '🔥 All Anime (6,973)', to: '/trending', active: true },
          { ar: '⚔️ أكشن وقتال', en: '⚔️ Action', to: '/trending?q=Action' },
          { ar: '🔮 خيال وسحر', en: '🔮 Fantasy', to: '/trending?q=Fantasy' },
          { ar: '🎬 أفلام الأنمي', en: '🎬 Anime Movies', to: '/trending?type=movie' },
          { ar: '📖 المانجا والمانهوا (30,000+)', en: '📖 Manga & Manhwa', to: '/browse' },
          { ar: '🏆 تصنيفات الأوتاكو', en: '🏆 Rankings', to: '/rankings' },
          { ar: '💬 ساحة المجتمع', en: '💬 Community Arena', to: '/community' }
        ].map((pill, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => navigate(pill.to)}
            style={{
              padding: '0.52rem 1.05rem',
              borderRadius: '999px',
              background: pill.active ? '#ffffff' : 'rgba(255,255,255,0.06)',
              color: pill.active ? '#000000' : '#ffffff',
              border: pill.active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.16)',
              fontWeight: 900,
              fontSize: '0.78rem',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              boxShadow: pill.active ? '0 8px 22px rgba(255,255,255,0.2)' : 'none'
            }}
          >
            {lang === 'ar' ? pill.ar : pill.en}
          </button>
        ))}
      </div>
    </div>
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
      cover: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx105398-b673Vt5ZS2qp.jpg'
    },
    {
      id: 'omniscient-readers-viewpoint',
      titleAr: 'وجهة نظر القارئ العليم',
      titleEn: "Omniscient Reader's Viewpoint",
      type: 'مانهوا',
      rating: '9.9',
      chapters: '220 فصل',
      cover: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx119257-R3N93C4X9M5G.jpg'
    },
    {
      id: 'one-piece',
      titleAr: 'ون بيس (One Piece)',
      titleEn: 'One Piece',
      type: 'مانجا',
      rating: '9.9',
      chapters: '1160 فصل',
      cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/nx21-6A18Y87b1h30.jpg'
    },
    {
      id: 'jujutsu-kaisen',
      titleAr: 'جوجوتسو كايسن',
      titleEn: 'Jujutsu Kaisen',
      type: 'مانجا',
      rating: '9.8',
      chapters: '270 فصل',
      cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-bbBWj4pEFseh.jpg'
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

/* --------------------------- 00. 1:1 iOS Liquid Glass Smart Control Deck --------------------------- */
function IosLiquidGlassSmartDeck({ onOpenAuth, featuredItems = [] }) {
  const { lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeRoom, setActiveRoom] = useState('living');
  const [acOn, setAcOn] = useState(true);
  const [lockOn, setLockOn] = useState(true);
  const [vacOn, setVacOn] = useState(false);
  const [selectedDeg, setSelectedDeg] = useState('22°');
  const [activeDockBtn, setActiveDockBtn] = useState('home');

  const rooms = [
    { id: 'living', labelAr: 'صالة السينما', labelEn: 'Living Room', route: null },
    { id: 'kitchen', labelAr: 'الأنمي الرائج', labelEn: 'Kitchen', route: '/trending' },
    { id: 'bathroom', labelAr: 'المانهوا والمانجا', labelEn: 'Bathroom', route: '/browse' },
    { id: 'bedroom', labelAr: 'الأعلى تقييماً', labelEn: 'Bedroom', route: '/rankings' }
  ];

  const degreeScale = ['16°', '18°', '20°', '22°', '24°', '26°'];
  const featuredShow = featuredItems[0] || {
    slug: 'solo-leveling',
    titleAr: 'سولو ليفلينج (Solo Leveling)',
    titleEn: 'Solo Leveling',
    poster: '/blackx-logo.png'
  };

  const userDisplayName = user?.username || user?.name || (lang === 'ar' ? 'Michael • الملك' : 'Michael');

  return (
    <section className="ios-lg-smart-deck" dir="ltr" aria-label="iOS Liquid Glass Smart Control Deck">
      {/* ==================== LEFT COLUMN ==================== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        {/* 1. Top Row: Profile Capsule + Bell Orb (with glowing white dot) + 4-Dot Grid Orb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.85rem' }}>
          <div
            className="ios-lg-capsule-track"
            onClick={() => (user ? navigate('/profile') : onOpenAuth?.('login'))}
            style={{
              padding: '0.45rem 1.35rem 0.45rem 0.52rem',
              gap: '0.78rem',
              cursor: 'pointer'
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '1.5px solid rgba(255,255,255,0.68)',
                boxShadow: '0 0 14px rgba(255,255,255,0.25)',
                background: '#0a0a0f',
                flexShrink: 0
              }}
            >
              <img
                src={user?.avatar || '/blackx-logo.png'}
                alt={userDisplayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.52)', fontWeight: 600 }}>
                {lang === 'ar' ? 'Hello, مرحباً' : 'Hello,'}
              </span>
              <span style={{ fontSize: '1.05rem', color: '#ffffff', fontWeight: 800, letterSpacing: '-0.01em' }}>
                {userDisplayName}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Notification Bell Orb with Glowing Pure-White Dot */}
            <button
              type="button"
              className="ios-lg-orb"
              title={lang === 'ar' ? 'إشعارات الحلقات الجديدة' : 'Episode Notifications'}
              onClick={async () => {
                const ok = await sendNativeDeviceNotification({
                  title: lang === 'ar' ? `🔔 BLACK X 120Hz: ${featuredShow.titleAr}` : `🔔 BLACK X 120Hz: ${featuredShow.titleEn}`,
                  body:
                    lang === 'ar'
                      ? 'تم تفعيل نظام إشعارات iOS Liquid Glass للحلقات والفصول الجديدة!'
                      : 'iOS Liquid Glass live notifications active!',
                  icon: featuredShow.poster || '/blackx-logo.png',
                  url: `/show/${featuredShow.slug}`
                });
                pushToast(
                  ok
                    ? (lang === 'ar' ? '🔔 تم إرسال إشعار فوري إلى جهازك!' : '🔔 Sent instant device notification!')
                    : (lang === 'ar' ? '🔔 نظام الإشعارات الذكي نشط!' : '🔔 Smart notification center active!'),
                  'success'
                );
              }}
            >
              <span className="ios-lg-orb-dot" />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
              </svg>
            </button>

            {/* 4-Dot Bento Grid Orb */}
            <button
              type="button"
              className="ios-lg-orb"
              title={lang === 'ar' ? 'مكتبة المانهوا والمانجا الشاملة (+120K)' : 'Master Library (+120K)'}
              onClick={() => navigate('/browse')}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <circle cx="5.5" cy="5.5" r="2.2" />
                <circle cx="14.5" cy="5.5" r="2.2" />
                <circle cx="5.5" cy="14.5" r="2.2" />
                <circle cx="14.5" cy="14.5" r="2.2" />
              </svg>
            </button>
          </div>
        </div>

        {/* 2. Middle Row: Full-Capsule Category Track (+ Orb + Living Room Active Pill + Tabs) */}
        <div
          className="ios-lg-capsule-track"
          style={{
            padding: '0.42rem 0.65rem',
            justifyContent: 'space-between',
            gap: '0.4rem',
            overflowX: 'auto'
          }}
        >
          <button
            type="button"
            className="ios-lg-orb"
            onClick={() => navigate('/trending')}
            style={{ width: '38px', height: '38px', fontSize: '1.15rem', fontWeight: 600 }}
            title={lang === 'ar' ? 'استكشاف كل الأعمال' : 'Explore All'}
          >
            +
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1, justifyContent: 'space-around' }}>
            {rooms.map((rm) => {
              const active = activeRoom === rm.id;
              return (
                <button
                  key={rm.id}
                  type="button"
                  className={active ? 'ios-lg-active-pill' : ''}
                  onClick={() => {
                    setActiveRoom(rm.id);
                    if (rm.route) navigate(rm.route);
                  }}
                  style={
                    active
                      ? {
                          padding: '0.52rem 1.15rem',
                          fontSize: '0.84rem',
                          whiteSpace: 'nowrap'
                        }
                      : {
                          background: 'transparent',
                          border: 'none',
                          color: 'rgba(255,255,255,0.62)',
                          fontSize: '0.83rem',
                          fontWeight: 600,
                          padding: '0.5rem 0.75rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }
                  }
                >
                  {lang === 'ar' ? rm.labelAr : rm.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Bottom-Left Wide Liquid Glass Card (Air Conditioner / LG XM70_125 -> 120Hz Cinema Engine + Scale) */}
        <div
          className="ios-lg-surface"
          style={{
            padding: '1.65rem 1.75rem 1.45rem',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '225px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <div
              onClick={() => navigate(`/show/${featuredShow.slug}`)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                {lang === 'ar' ? 'Air Conditioner • محرك 120Hz' : 'Air Conditioner'}
              </div>
              <div style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.52)', fontWeight: 600, marginTop: '0.22rem' }}>
                LG XM70_125 • {lang === 'ar' ? featuredShow.titleAr : featuredShow.titleEn}
              </div>
            </div>

            <button
              type="button"
              aria-label="Toggle Cinema Engine"
              className={`ios-lg-toggle ${acOn ? 'is-on' : ''}`}
              onClick={() => setAcOn((v) => !v)}
            >
              <span className="ios-lg-toggle__thumb" />
            </button>
          </div>

          {/* Exact Bottom Tick Ruler Scale: 16°  18°  20°  [22°]  24°  26° */}
          <div className="ios-lg-ruler">
            {degreeScale.map((deg) => {
              const isCenter = deg === selectedDeg;
              return (
                <button
                  key={deg}
                  type="button"
                  onClick={() => setSelectedDeg(deg)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '0.15rem 0.35rem',
                    cursor: 'pointer',
                    color: isCenter ? '#ffffff' : 'rgba(255,255,255,0.44)',
                    fontSize: isCenter ? '2.15rem' : '0.92rem',
                    fontWeight: isCenter ? 800 : 600,
                    letterSpacing: '-0.02em',
                    textShadow: isCenter ? '0 0 22px rgba(255,255,255,0.65)' : 'none',
                    transition: 'all 0.22s ease'
                  }}
                >
                  {deg}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==================== RIGHT COLUMN ==================== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', justifyContent: 'space-between' }}>
        {/* 1. Top Row: Two Side-by-Side Square Bento Squircles (Door Lock & MOP/VAC) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.15rem', flex: 1 }}>
          {/* Square Card 1: Door Lock / Locked with 3D Keypad & Pure White Glowing Ring */}
          <div
            className="ios-lg-surface"
            style={{
              padding: '1.4rem 1.35rem 0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '248px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '1.12rem', fontWeight: 800, color: '#ffffff' }}>
                  Door Lock
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.72)', marginTop: '0.2rem' }}>
                  <span>🔒</span>
                  <span>{lockOn ? (lang === 'ar' ? 'Locked • محمي' : 'Locked') : (lang === 'ar' ? 'Unlocked' : 'Unlocked')}</span>
                </div>
              </div>
              <button
                type="button"
                aria-label="Toggle Door Lock"
                className={`ios-lg-toggle ${lockOn ? 'is-on' : ''}`}
                onClick={() => setLockOn((v) => !v)}
              >
                <span className="ios-lg-toggle__thumb" />
              </button>
            </div>

            {/* 1:1 3D Angled Smart Lock Keypad with Glowing Pure White/Chrome Ring */}
            <div
              onClick={() => navigate('/trending')}
              style={{
                position: 'relative',
                height: '148px',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden'
              }}
            >
              <svg width="190" height="148" viewBox="0 0 190 148" fill="none">
                <defs>
                  <linearGradient id="keypadBody" x1="30" y1="10" x2="150" y2="148" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#2a2a32" />
                    <stop offset="45%" stopColor="#111116" />
                    <stop offset="100%" stopColor="#050508" />
                  </linearGradient>
                  <filter id="whiteRingGlow" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <g transform="rotate(24 105 92)">
                  <rect x="44" y="10" width="106" height="165" rx="34" fill="#09090d" stroke="rgba(255,255,255,0.38)" strokeWidth="2.5" />
                  <rect x="48" y="14" width="98" height="157" rx="30" fill="url(#keypadBody)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
                  {/* Glowing Pure-White Neon Ring */}
                  <circle
                    cx="97"
                    cy="50"
                    r="17"
                    stroke="#ffffff"
                    strokeWidth="3.2"
                    filter="url(#whiteRingGlow)"
                  />
                  {/* Keypad Digits 1 2 3 / 4 5 6 / 7 8 9 */}
                  <text x="73" y="92" fill="rgba(255,255,255,0.78)" fontSize="11" fontWeight="700" fontFamily="sans-serif">1</text>
                  <text x="94" y="92" fill="rgba(255,255,255,0.78)" fontSize="11" fontWeight="700" fontFamily="sans-serif">2</text>
                  <text x="115" y="92" fill="rgba(255,255,255,0.78)" fontSize="11" fontWeight="700" fontFamily="sans-serif">3</text>
                  <text x="73" y="112" fill="rgba(255,255,255,0.78)" fontSize="11" fontWeight="700" fontFamily="sans-serif">4</text>
                  <text x="94" y="112" fill="rgba(255,255,255,0.78)" fontSize="11" fontWeight="700" fontFamily="sans-serif">5</text>
                  <text x="115" y="112" fill="rgba(255,255,255,0.78)" fontSize="11" fontWeight="700" fontFamily="sans-serif">6</text>
                  <text x="73" y="132" fill="rgba(255,255,255,0.78)" fontSize="11" fontWeight="700" fontFamily="sans-serif">7</text>
                  <text x="94" y="132" fill="rgba(255,255,255,0.78)" fontSize="11" fontWeight="700" fontFamily="sans-serif">8</text>
                  <text x="115" y="132" fill="rgba(255,255,255,0.78)" fontSize="11" fontWeight="700" fontFamily="sans-serif">9</text>
                </g>
              </svg>
            </div>
          </div>

          {/* Square Card 2: MOP/VAC / Cleaning with 3D Glossy Metallic Smart Disc */}
          <div
            className="ios-lg-surface"
            style={{
              padding: '1.4rem 1.35rem 0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '248px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '1.12rem', fontWeight: 800, color: '#ffffff' }}>
                  MOP/VAC
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.72)', marginTop: '0.2rem' }}>
                  <span>✨</span>
                  <span>{lang === 'ar' ? 'Cleaning • +120K' : 'Cleaning'}</span>
                </div>
              </div>
              <button
                type="button"
                aria-label="Toggle MOP/VAC"
                className={`ios-lg-toggle ${vacOn ? 'is-on' : ''}`}
                onClick={() => setVacOn((v) => !v)}
              >
                <span className="ios-lg-toggle__thumb" />
              </button>
            </div>

            {/* 1:1 3D Glossy Obsidian & Chrome Smart Disc */}
            <div
              onClick={() => navigate('/browse')}
              style={{
                position: 'relative',
                height: '148px',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden'
              }}
            >
              <svg width="200" height="142" viewBox="0 0 200 142" fill="none">
                <defs>
                  <radialGradient id="vacTopChrome" cx="50%" cy="32%" r="58%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="28%" stopColor="#8e8e99" stopOpacity="0.72" />
                    <stop offset="65%" stopColor="#18181f" stopOpacity="0.96" />
                    <stop offset="100%" stopColor="#050508" stopOpacity="1" />
                  </radialGradient>
                  <linearGradient id="vacRim" x1="15" y1="45" x2="185" y2="135" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                    <stop offset="50%" stopColor="#27272f" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.75" />
                  </linearGradient>
                </defs>
                {/* Base Chassis */}
                <ellipse cx="100" cy="98" rx="76" ry="38" fill="#07070b" stroke="url(#vacRim)" strokeWidth="2.5" />
                {/* Glossy Top Dome */}
                <ellipse cx="100" cy="84" rx="72" ry="34" fill="url(#vacTopChrome)" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" />
                {/* Center LiDAR Turret Ring */}
                <ellipse cx="100" cy="76" rx="22" ry="10.5" fill="#18181f" stroke="#ffffff" strokeWidth="2" />
                <ellipse cx="100" cy="75" rx="10" ry="4.8" fill="#ffffff" />
                {/* Front Button Pill */}
                <rect x="93" y="94" width="14" height="12" rx="6" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.65)" strokeWidth="1.2" />
              </svg>
            </div>
          </div>
        </div>

        {/* 2. Bottom Row of Right Column: 1:1 Reference Dock ([ 🏠 Home ] ( 🔍 ) ( 🎛️ ) ( ⊕ ) ( 📄 )) */}
        <div
          className="ios-lg-capsule-track"
          style={{
            padding: '0.62rem 0.85rem',
            justifyContent: 'space-between',
            gap: '0.65rem'
          }}
        >
          <button
            type="button"
            className="ios-lg-active-pill"
            onClick={() => {
              setActiveDockBtn('home');
              navigate('/');
            }}
            style={{
              padding: '0.68rem 1.45rem',
              fontSize: '0.9rem'
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                color: '#ffffff',
                filter: 'drop-shadow(0 0 10px #ffffff) drop-shadow(0 0 20px rgba(255,255,255,0.95))'
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3L4 9.5V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9.5L12 3z" />
              </svg>
            </span>
            <span>Home</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.62rem' }}>
            <button
              type="button"
              className="ios-lg-orb"
              onClick={() => {
                setActiveDockBtn('search');
                navigate('/trending');
              }}
              title={lang === 'ar' ? 'بحث الأنمي' : 'Search'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" />
              </svg>
            </button>

            <button
              type="button"
              className="ios-lg-orb"
              onClick={() => {
                setActiveDockBtn('sliders');
                navigate('/rankings');
              }}
              title={lang === 'ar' ? 'الترتيب والفلاتر' : 'Filters'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <circle cx="9" cy="7" r="2" fill="#ffffff" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <circle cx="15" cy="12" r="2" fill="#ffffff" />
                <line x1="4" y1="17" x2="20" y2="17" />
                <circle cx="10" cy="17" r="2" fill="#ffffff" />
              </svg>
            </button>

            <button
              type="button"
              className="ios-lg-orb"
              onClick={() => {
                setActiveDockBtn('add');
                if (user) navigate('/profile');
                else onOpenAuth?.('login');
              }}
              title={lang === 'ar' ? 'إضافة / حسابي' : 'Add / Profile'}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="8.5" />
                <line x1="12" y1="8.5" x2="12" y2="15.5" />
                <line x1="8.5" y1="12" x2="15.5" y2="12" />
              </svg>
            </button>

            <button
              type="button"
              className="ios-lg-orb"
              onClick={() => {
                setActiveDockBtn('docs');
                navigate('/browse');
              }}
              title={lang === 'ar' ? 'مكتبة المانهوا والمانجا' : 'Manga & Manhwa'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="8.5" />
                <line x1="9" y1="10" x2="15" y2="10" />
                <line x1="9" y1="12.5" x2="15" y2="12.5" />
                <line x1="9" y1="15" x2="13" y2="15" />
              </svg>
            </button>
          </div>
        </div>
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
      {/* 00. 1:1 iOS Liquid Glass Smart Home UI Control Deck (Pure Monochrome Liquid Glass) */}
      <IosLiquidGlassSmartDeck onOpenAuth={onOpenAuth} featuredItems={pinnedItems} />

      {/* 0. Exact WitAnime Cinema Hero Banner */}
      <Hero3DStage items={pinnedItems} trending={trending || []} />

      {/* 1. Continue Watching (if logged in) */}
      <ContinueSection onOpenAuth={onOpenAuth} />

      {/* 2. Latest Added Episodes (أحدث الحلقات المضافة) */}
      <LatestSection items={latest || []} loading={!latest} error={error} onRetry={loadLatest} />

      {/* 2.5. Luxury Liquid Glass Anime Discovery Oracle */}
      <AnimeDiscover compact />

      {/* 3. Weekly Airing Schedule (مواعيد الحلقات) */}
      <WeeklyScheduleSection items={pinnedItems} />

      {/* 4. Manga & Manhwa Library */}
      <LibraryShowcaseSection />

      {/* 5. User Favorites */}
      <FavoritesSection onOpenAuth={onOpenAuth} />
    </div>
  );
}
