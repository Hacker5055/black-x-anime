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
