import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { applyLiveColor, hexToRgbString } from '../hooks/hooks.js';

/** Poster card for a show (witanime). Hover feeds the ambient glow. */
export default function ShowCard({ show, progress, onClick, delay = 0, meta }) {
  const { t, lang, formatNumber } = useI18n();
  const navigate = useNavigate();

  const title = (lang === 'ar' ? show.titleAr : show.titleEn) || show.titleEn || show.slug;
  const handleClick = () => {
    if (onClick) return onClick(show);
    navigate(`/show/${show.slug}`);
  };

  return (
    <article
      className="anime-card reveal"
      data-delay={delay % 5}
      style={{ '--card-rgb': hexToRgbString(show.color || '#22d3ee') }}
      onMouseEnter={() => show.color && applyLiveColor(show.color)}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label={title}
    >
      <div className="anime-card__poster">
        {show.poster ? (
          <img src={show.poster} alt={title} loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <div className="anime-card__fallback">{title.slice(0, 2)}</div>
        )}
        <div className="anime-card__glowtag">▶</div>
      </div>
      <div className="anime-card__body">
        <h3 className="anime-card__title">{title}</h3>
        <div className="anime-card__meta">
          <span>{meta || (show.episodes ? t('show.episodeCount', { n: formatNumber(show.episodes) }) : show.kind === 'movie' ? '🎬' : '📺')}</span>
        </div>
        {progress != null && progress > 0 && (
          <div className="anime-card__progress" title={`${Math.round(progress * 100)}%`}>
            <div className="anime-card__progress-bar" style={{ width: `${Math.min(100, progress * 100)}%` }} />
          </div>
        )}
      </div>
    </article>
  );
}

/** Compact episode tile (poster thumb + episode number). */
export function EpisodeTile({ item, onClick, delay = 0, progress }) {
  const { t, lang, formatNumber } = useI18n();
  const navigate = useNavigate();
  const title = (lang === 'ar' ? item.titleAr : item.titleEn) || item.titleEn || item.slug;

  return (
    <article
      className="ep-tile reveal"
      data-delay={delay % 5}
      onClick={() => (onClick ? onClick(item) : navigate(`/watch/${item.slug}/${item.episode}`))}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/watch/${item.slug}/${item.episode}`)}
    >
      <div className="ep-tile__thumb">
        {item.poster ? (
          <img src={item.poster} alt="" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <div className="anime-card__fallback">{title.slice(0, 2)}</div>
        )}
        <div className="ep-tile__play">▶</div>
        <div className="ep-tile__num">{t('common.ep')} {formatNumber(item.episode)}</div>
        {progress != null && (
          <div className="ep-tile__bar">
            <div style={{ width: `${Math.min(100, progress * 100)}%` }} />
          </div>
        )}
      </div>
      <div className="ep-tile__body">
        <div className="ep-tile__title">{title}</div>
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
        {entry.poster ? (
          <img src={entry.poster} alt="" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <div className="anime-card__fallback">{title.slice(0, 2)}</div>
        )}
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
