import React, { useEffect, useRef } from 'react';
import BxIcon from './BxIcon.jsx';
import { SkeletonList } from './Skeleton.jsx';
import { coverForMode } from './dataSaver.js';
import { useLongPress } from './PosterCard.jsx';
import { SCHEDULE_DAYS, todayScheduleId } from './scheduleDays.js';

function ScheduleRow({ item, isRtl, dataSaver, fav, onOpen, onPeek, onToggleFavorite }) {
  const { handlers, consumeClick } = useLongPress(onPeek ? () => onPeek(item) : null);
  const meta = [item.type, item.state].filter(Boolean);
  return (
    <div
      className="bx-sched-row bx-mob-card"
      data-bx-oid={item.objectID}
      role="button"
      tabIndex={0}
      {...handlers}
      onClick={() => {
        if (consumeClick()) return;
        onOpen(item);
      }}
    >
      <img className="bx-sched-thumb" src={coverForMode(item.poster, dataSaver)} alt="" loading="lazy" decoding="async" draggable={false} />
      <div className="bx-sched-copy">
        <div className="bx-sched-title" dir="auto">
          {item.titleEn}
        </div>
        <div className="bx-sched-meta">
          {item.rating ? (
            <span className="bx-sched-rating">
              <BxIcon name="star" size="0.95em" filled />
              {item.rating}
            </span>
          ) : null}
          {meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>
      <button
        type="button"
        className={`bx-icon-btn bx-icon-btn-sm${fav ? ' is-on' : ''}`}
        aria-label={fav ? (isRtl ? 'في قائمتي' : 'In my list') : isRtl ? 'أضف لقائمتي' : 'Add to my list'}
        aria-pressed={fav}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(item);
        }}
      >
        <BxIcon name={fav ? 'check' : 'plus'} />
      </button>
    </div>
  );
}

/**
 * Airing schedule: day chips (today is marked and scrolled into view), then one compact
 * row per show. The list is the real catalogue `show_time` of that weekday.
 */
export default function ScheduleTab({
  pageClassName = 'bx-page',
  isRtl,
  day,
  onDay,
  items,
  loading,
  favorites,
  dataSaver,
  onOpen,
  onPeek,
  onToggleFavorite,
  onAlerts
}) {
  const railRef = useRef(null);
  const today = todayScheduleId();

  useEffect(() => {
    const chip = railRef.current?.querySelector('[aria-pressed="true"]');
    if (!chip) return;
    try {
      chip.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    } catch (_) {
      /* old WebView */
    }
  }, [day]);

  const count = items.length;
  const countLabel = isRtl
    ? count === 0
      ? ''
      : count === 1
      ? 'حلقة واحدة'
      : count === 2
      ? 'حلقتين'
      : count <= 10
      ? `${count} حلقات`
      : `${count} حلقة`
    : `${count} ${count === 1 ? 'show' : 'shows'}`;

  return (
    <main className={pageClassName} style={{ padding: '0.25rem 1rem 1rem' }}>
      <div className="bx-row bx-chip-row bx-day-rail" ref={railRef} role="tablist" aria-label={isRtl ? 'أيام الأسبوع' : 'Days'}>
        {SCHEDULE_DAYS.map((d) => {
          const active = d.id === day;
          const isToday = d.id === today;
          return (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-pressed={active}
              className={`bx-chip bx-day-chip${active ? ' is-active' : ''}${isToday ? ' is-today' : ''}`}
              onClick={() => onDay(d.id)}
            >
              {isRtl ? d.ar : d.en}
              {isToday ? <span className="bx-today-tag">{isRtl ? 'النهارده' : 'Today'}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="bx-sched-bar">
        <span>{loading ? '' : countLabel ? `${countLabel} • ${isRtl ? 'حسب الشعبية' : 'by popularity'}` : ''}</span>
        <button type="button" className="bx-chip" onClick={onAlerts}>
          <BxIcon name="bell" size="1em" />
          {isRtl ? 'التنبيهات' : 'Alerts'}
        </button>
      </div>

      {loading ? (
        <SkeletonList count={6} thumbWidth={56} thumbHeight={80} padding="0" />
      ) : items.length === 0 ? (
        <div className="bx-empty">
          <BxIcon name="calendar" size="2rem" />
          <p>{isRtl ? 'مفيش حلقات متسجلة لليوم ده.' : 'Nothing is scheduled for this day.'}</p>
        </div>
      ) : (
        <div className="bx-sched-list bx-stagger">
          {items.map((item) => (
            <ScheduleRow
              key={item.objectID}
              item={item}
              isRtl={isRtl}
              dataSaver={dataSaver}
              fav={favorites.some((f) => f.objectID === item.objectID)}
              onOpen={onOpen}
              onPeek={onPeek}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </main>
  );
}
