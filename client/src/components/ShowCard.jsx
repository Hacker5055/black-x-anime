import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import {
  isAnimeEpisodeAlertEnabled,
  toggleAnimeEpisodeAlert
} from '../utils/deviceNotifications.js';

/** Poster image with graceful fallback when the URL is missing or broken. */
function Poster({ src, alt, cls = '' }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return <div className={`anime-card__fallback ${cls}`}>{(alt || 'X').slice(0, 2)}</div>;
  }
  return (
    <img
      className={cls}
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
}

/**
 * WitAnime A-to-Z Anime Card (`anime-card-container` style from witanime.site)
 */
export default function ShowCard({ show, progress, onClick, delay = 0, meta }) {
  const { t, lang, formatNumber } = useI18n();
  const navigate = useNavigate();

  const title = (lang === 'ar' ? show.titleAr : show.titleEn) || show.titleEn || show.slug;
  const posterSrc = show.poster || show.coverUrl || show.banner || '';
  const targetSlug = show.slug || String(show.titleEn || 'anime').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const [subbed, setSubbed] = useState(() => isAnimeEpisodeAlertEnabled(targetSlug));

  const handleClick = () => {
    if (onClick) return onClick(show);
    navigate(`/show/${show.slug}`);
  };

  const handleBellClick = async (e) => {
    e.stopPropagation();
    const nextState = await toggleAnimeEpisodeAlert(
      {
        slug: targetSlug,
        titleAr: show.titleAr || title,
        titleEn: show.titleEn || title,
        poster: posterSrc,
        latestEpisode: show.episodes || 1
      },
      lang
    );
    setSubbed(nextState);
  };

  return (
    <article
      className="wit-anime-card anime-card reveal"
      data-delay={delay % 5}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label={title}
    >
      <div className="wit-anime-card__poster anime-card__poster">
        <Poster src={posterSrc} alt={title} />

        {/* WitAnime Top-Right Status Badge */}
        <span className="wit-badge wit-badge--status">
          {show.status === 'FINISHED'
            ? (lang === 'ar' ? 'مكتمل' : 'Completed')
            : (lang === 'ar' ? 'يعرض الان' : 'Airing')}
        </span>

        {/* WitAnime Top-Left Type / VIP FHD Badge */}
        <span className="wit-badge wit-badge--type">
          {show.kind === 'movie' ? 'MOVIE' : 'TV • FHD'}
        </span>

        {/* WitAnime Bottom-Right Episode Count Pill */}
        {show.episodes && (
          <span className="wit-badge wit-badge--ep">
            {lang === 'ar' ? `${formatNumber(show.episodes)} حلقة` : `${formatNumber(show.episodes)} EP`}
          </span>
        )}

        {/* Quick Notification Bell on Bottom-Left */}
        <button
          type="button"
          className={`wit-bell-btn ${subbed ? 'active' : ''}`}
          onClick={handleBellClick}
          title={lang === 'ar' ? 'تفعيل إشعارات الحلقات الجديدة على هاتفك/الكمبيوتر' : 'Enable Episode Alerts'}
        >
          {subbed ? '🔔' : '📲'}
        </button>

        {/* WitAnime Center Play Hover Overlay */}
        <div className="wit-anime-card__hover">
          <span className="wit-play-circle">▶</span>
        </div>
      </div>

      <div className="wit-anime-card__body anime-card__body">
        <h3 className="wit-anime-card__title anime-card__title" title={title}>
          {title}
        </h3>
        {meta && (
          <div className="wit-anime-card__meta anime-card__meta">
            <span>{meta}</span>
          </div>
        )}
        {progress != null && progress > 0 && (
          <div className="anime-card__progress" title={`${Math.round(progress * 100)}%`}>
            <div className="anime-card__progress-bar" style={{ width: `${Math.min(100, progress * 100)}%` }} />
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * WitAnime A-to-Z Episode Card (`episodes-card-container` from witanime.site)
 */
export function EpisodeTile({ item, onClick, delay = 0, progress }) {
  const { t, lang, formatNumber } = useI18n();
  const navigate = useNavigate();
  const title = (lang === 'ar' ? item.titleAr : item.titleEn) || item.titleEn || item.slug;
  const [subbed, setSubbed] = useState(() => isAnimeEpisodeAlertEnabled(item.slug));

  const handleBellClick = async (e) => {
    e.stopPropagation();
    const nextState = await toggleAnimeEpisodeAlert(
      {
        slug: item.slug,
        titleAr: item.titleAr || title,
        titleEn: item.titleEn || title,
        poster: item.poster,
        latestEpisode: item.episode || 1
      },
      lang
    );
    setSubbed(nextState);
  };

  return (
    <article
      className="wit-ep-card ep-tile reveal"
      data-delay={delay % 5}
      onClick={() => (onClick ? onClick(item) : navigate(`/watch/${item.slug}/${item.episode}`))}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/watch/${item.slug}/${item.episode}`)}
    >
      <div className="wit-ep-card__thumb ep-tile__thumb">
        <Poster src={item.poster} alt={title} />

        {/* WitAnime Episode Number Badge (Top Right / Bottom Right) */}
        <div className="wit-ep-card__num ep-tile__num">
          {lang === 'ar' ? `الحلقة ${formatNumber(item.episode)}` : `${t('common.ep')} ${formatNumber(item.episode)}`}
        </div>

        {/* WitAnime FHD VIP Tag (Top Left) */}
        <span className="wit-ep-card__vip">👑 FHD</span>

        {/* Quick Alert Bell */}
        <button
          type="button"
          className={`wit-bell-btn ${subbed ? 'active' : ''}`}
          onClick={handleBellClick}
          title={lang === 'ar' ? 'إشعارات الحلقات الجديدة' : 'Episode Notifications'}
        >
          {subbed ? '🔔' : '📲'}
        </button>

        <div className="wit-ep-card__play ep-tile__play">▶</div>

        {progress != null && (
          <div className="ep-tile__bar">
            <div style={{ width: `${Math.min(100, progress * 100)}%` }} />
          </div>
        )}
      </div>

      <div className="wit-ep-card__body ep-tile__body">
        <div className="wit-ep-card__title ep-tile__title" title={title}>
          {title}
        </div>
      </div>
    </article>
  );
}

/** Wide "continue watching" card with resume percent. */
export function ContinueCard({ entry, onClick, delay = 0 }) {
  const { t, lang, formatNumber } = useI18n();
  const navigate = useNavigate();
  const title = (lang === 'ar' ? entry.titleAr : entry.titleEn) || entry.titleEn || entry.slug;

  return (
    <article
      className="cont-card glass glass-hover reveal"
      data-delay={delay % 5}
      onClick={() => (onClick ? onClick(entry) : navigate(`/watch/${entry.slug}/${entry.episode}`))}
      role="button"
      tabIndex={0}
    >
      <div className="cont-card__poster">
        <Poster src={entry.poster} alt={title} />
        <div className="cont-card__play">▶</div>
      </div>
      <div className="cont-card__body">
        <div className="cont-card__title">{title}</div>
        <div className="cont-card__meta">
          {t('watch.episodePicker', { n: formatNumber(entry.episode) })} · {t('mylist.progress', { percent: formatNumber(entry.percent ?? 0) })}
        </div>
        <div className="anime-card__progress" style={{ marginBlockStart: '0.65rem' }}>
          <div className="anime-card__progress-bar" style={{ width: `${Math.min(100, entry.percent ?? 0)}%` }} />
        </div>
      </div>
    </article>
  );
}
