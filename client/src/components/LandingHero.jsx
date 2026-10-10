import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { applyLiveColor, pushToast } from '../hooks/hooks.js';
import { auth, syncFavoriteToFirestore, removeFavoriteFromFirestore } from '../firebase.js';

export default function LandingHero({ items = [], onOpenAuth }) {
  const { t, lang, formatNumber } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  /* --------------------------- Carousel State --------------------------- */
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [favStatus, setFavStatus] = useState({}); // slug -> boolean
  const [favBusy, setFavBusy] = useState(false);

  // Normalize carousel items (ensuring valid playable slugs & metadata)
  const carouselItems = items && items.length > 0 ? items : [
    {
      slug: 'one-piece',
      titleEn: 'One Piece',
      titleAr: 'ون بيس',
      poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/nx21-6A18Y87b1h30.jpg',
      banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21-wf37VakJmZih.jpg',
      episode: 1180,
      score: 89,
      genres: ['Action', 'Adventure', 'Fantasy'],
      description: 'Monkey D. Luffy sets out to find the legendary treasure, One Piece, and conquer the Grand Line with his loyal crew of Straw Hat Pirates.',
      color: '#22d3ee'
    },
    {
      slug: 'steel-ball-run-jojo-no-kimyou-na-bouken',
      titleEn: "STEEL BALL RUN: JoJo's Bizarre Adventure",
      titleAr: 'مغامرات جوجو العجيبة: ستيل بول رن',
      poster: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx31708-Vv0Y5cW1jKk9.jpg',
      banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/210482-pYAD0IbzNbgS.jpg',
      episode: 4,
      score: 94,
      genres: ['Action', 'Adventure', 'Supernatural'],
      description: 'Set in the American West in 1890, competitors race across the continent on horseback in an epic cross-country race with miraculous stakes.',
      color: '#ec4899'
    },
    {
      slug: 'bleach-sennen-kessen-hen-kashin-tan',
      titleEn: 'Bleach: Thousand-Year Blood War',
      titleAr: 'بليتش: حرب الألف سنة الدموية',
      poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx159322-N8Y4iX8c2e9j.jpg',
      banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/159322-Nf5c7UuN1Csh.jpg',
      episode: 8,
      score: 91,
      genres: ['Action', 'Supernatural'],
      description: 'The peace between the Soul Society and the living world is shattered as the Quincy king initiates the final battle.',
      color: '#8b5cf6'
    },
    {
      slug: 'black-clover-2nd-season',
      titleEn: 'Black Clover Season 2',
      titleAr: 'بلاك كلوفر الموسم الثاني',
      poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx97940-b5A5wVlHwZ3x.jpg',
      banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/97940-b5A5wVlHwZ3x.jpg',
      episode: 1,
      score: 85,
      genres: ['Action', 'Comedy', 'Magic'],
      description: 'Asta and Yuno continue their climb through the Magic Knights to become the next Wizard King.',
      color: '#10b981'
    }
  ];

  const current = carouselItems[activeIndex] || carouselItems[0];

  /* ---------------- Live color sync on slide change ---------------- */
  useEffect(() => {
    if (current?.color) {
      applyLiveColor(current.color);
    }
  }, [current]);

  /* ---------------- Auto-Play Carousel Rotation ---------------- */
  useEffect(() => {
    if (isPaused) return undefined;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % carouselItems.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [isPaused, carouselItems.length]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);
  }, [carouselItems.length]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % carouselItems.length);
  }, [carouselItems.length]);

  /* ---------------- Favorite check for active show ---------------- */
  useEffect(() => {
    if (!user || !current?.slug) return undefined;
    let alive = true;
    api.get(`/api/library/favorites/${current.slug}`)
      .then((d) => {
        if (alive) {
          setFavStatus((prev) => ({ ...prev, [current.slug]: Boolean(d?.favorite) }));
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [user, current?.slug]);

  const handleToggleFav = async () => {
    if (!user) {
      onOpenAuth?.('login');
      return;
    }
    if (favBusy || !current) return;
    setFavBusy(true);
    const isFav = favStatus[current.slug];
    setFavStatus((prev) => ({ ...prev, [current.slug]: !isFav })); // optimistic
    try {
      if (isFav) {
        await api.del(`/api/library/favorites/${current.slug}`);
        if (auth.currentUser) {
          removeFavoriteFromFirestore(auth.currentUser.uid, current.slug).catch(() => {});
        }
        pushToast(t('toast.favoriteRemoved'), 'success');
      } else {
        const payload = {
          titleEn: current.titleEn,
          titleAr: current.titleAr,
          poster: current.poster,
          banner: current.banner,
          episodes: current.episode || current.episodes || 1
        };
        await api.put(`/api/library/favorites/${current.slug}`, payload);
        if (auth.currentUser) {
          syncFavoriteToFirestore(auth.currentUser.uid, { slug: current.slug, ...payload }).catch(() => {});
        }
        pushToast(t('toast.favoriteAdded'), 'success');
      }
    } catch {
      setFavStatus((prev) => ({ ...prev, [current.slug]: isFav }));
    } finally {
      setFavBusy(false);
    }
  };

  const displayTitle = (lang === 'ar' ? current.titleAr : current.titleEn) || current.titleEn || current.slug;
  const alternateTitle = lang === 'ar' ? current.titleEn : current.titleAr;
  const isCurrentFav = Boolean(favStatus[current?.slug]);

  return (
    <section
      className="hero hero-landing reveal"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Dynamic blurred background banner reflecting active anime */}
      <div
        className="hero-landing__backdrop"
        style={{
          backgroundImage: `url(${current.banner || current.poster || ''})`
        }}
      />
      <div className="hero-landing__scrim" />

      {/* ================= Featured Anime Carousel Showcase ================= */}
      <div className="hero-carousel">
        {/* Navigation Arrows */}
        <div className="hero-carousel__nav">
          <button
            type="button"
            className="hero-carousel__nav-arrow"
            onClick={handlePrev}
            aria-label={t('hero.prev')}
          >
            <span style={{ transform: 'scaleX(var(--flip))', display: 'inline-block' }}>‹</span>
          </button>
          <button
            type="button"
            className="hero-carousel__nav-arrow"
            onClick={handleNext}
            aria-label={t('hero.next')}
          >
            <span style={{ transform: 'scaleX(var(--flip))', display: 'inline-block' }}>›</span>
          </button>
        </div>

        {/* Carousel Slide Stage */}
        <div className="hero-carousel__stage">
          {/* Left: Metadata & CTAs */}
          <div className="hero-carousel__info">
            <div className="hero-carousel__badge-row">
              <span className="hero-carousel__spotlight-tag">
                ★ {t('hero.featuredBadge')} #{activeIndex + 1}
              </span>
              {current.score && (
                <span className="hero-carousel__score-tag">
                  ⭐ {current.score}%
                </span>
              )}
              {current.episode && (
                <span className="chip" style={{ fontSize: '0.78rem', padding: '0.28rem 0.65rem' }}>
                  {t('common.episode')} {formatNumber(current.episode)}
                </span>
              )}
            </div>

            <h1 className="hero-carousel__title">
              {displayTitle}
            </h1>

            {alternateTitle && (
              <div className="hero-carousel__alt-title">
                {alternateTitle}
              </div>
            )}

            {current.genres && current.genres.length > 0 && (
              <div className="hero-carousel__genres">
                {current.genres.slice(0, 4).map((g, idx) => (
                  <span key={g}>
                    {g}{idx < Math.min(3, current.genres.length - 1) ? ' · ' : ''}
                  </span>
                ))}
              </div>
            )}

            <p className="hero-carousel__desc">
              {current.description || t('app.taglineLong')}
            </p>

            <div className="hero-carousel__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => navigate(`/watch/${current.slug}/${current.episode || 1}`)}
              >
                <span className="btn__shine" />
                ▶ {t('dashboard.heroCta')}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => navigate(`/show/${current.slug}`)}
              >
                ℹ {t('hero.viewDetails')}
              </button>
              <button
                type="button"
                className={`hero-carousel__fav-btn ${isCurrentFav ? 'active' : ''}`}
                onClick={handleToggleFav}
                aria-label={isCurrentFav ? t('show.unfavorite') : t('show.favorite')}
                title={isCurrentFav ? t('show.unfavorite') : t('show.favorite')}
              >
                {isCurrentFav ? '♥' : '♡'}
              </button>
            </div>
          </div>

          {/* Right: Featured Poster Card */}
          <div className="hero-carousel__poster-column">
            <div
              className="hero-carousel__poster-card"
              onClick={() => navigate(`/show/${current.slug}`)}
              style={{ cursor: 'pointer' }}
            >
              <img
                src={current.poster || ''}
                alt={displayTitle}
                className="hero-carousel__poster-img"
                referrerPolicy="no-referrer"
              />
              <div className="hero-carousel__poster-overlay">
                <span className="hero-carousel__poster-overlay-title">{displayTitle}</span>
                <span className="hero-carousel__poster-overlay-meta">
                  HD · {t('watch.sub')} · {current.episode ? `Ep. ${current.episode}` : t('browse.series')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Footer: Pagination Dots & Thumbnail Rail */}
        <div className="hero-carousel__footer">
          {/* Pagination Indicators */}
          <div className="hero-carousel__dots" aria-label="Carousel pagination">
            {carouselItems.map((item, idx) => (
              <button
                key={item.slug || idx}
                type="button"
                className={`hero-carousel__dot ${idx === activeIndex ? 'active' : ''}`}
                onClick={() => setActiveIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Quick thumbnail jumper rail */}
          <div className="hero-carousel__rail" aria-label="Featured anime rail">
            {carouselItems.map((item, idx) => {
              const itemTitle = (lang === 'ar' ? item.titleAr : item.titleEn) || item.titleEn || item.slug;
              return (
                <button
                  key={item.slug || idx}
                  type="button"
                  className={`hero-carousel__rail-item ${idx === activeIndex ? 'active' : ''}`}
                  onClick={() => setActiveIndex(idx)}
                >
                  <img
                    src={item.poster || ''}
                    alt={itemTitle}
                    className="hero-carousel__rail-thumb"
                    referrerPolicy="no-referrer"
                  />
                  <span className="hero-carousel__rail-title">{itemTitle}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
