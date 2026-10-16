import React, { useEffect, useState } from 'react';
import BxIcon from './BxIcon.jsx';
import { episodeKey, getPosition, subscribePositions } from './resumeStore.js';
import { coverForMode } from './dataSaver.js';

/**
 * "Continue watching" with the real progress of each show's last episode
 * (resumeStore) — "Episode 5 • 12 min left". Shows without a known position get
 * no progress bar instead of an invented one.
 */
export default function ContinueWatchingRow({ history, isRtl, dataSaver = false, onResume, onInfo }) {
  const [, setTick] = useState(0);
  useEffect(() => subscribePositions(() => setTick((t) => t + 1)), []);
  const items = [];
  const seen = new Set();
  for (const h of Array.isArray(history) ? history : []) {
    const id = h?.objectID || h?.slug;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    items.push(h);
    if (items.length >= 12) break;
  }
  if (!items.length) return null;
  return (
    <section style={{ padding: '0.9rem 1rem 0.2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 900 }}>
          <BxIcon name="play" className="bx-ico-lead" />
          {isRtl ? 'كمّل المشاهدة' : 'Continue watching'}
        </h2>
      </div>
      <div className="bx-mob-scroll bx-stagger" style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
        {items.map((h, i) => {
          const ep = Number(h.episode) || 0;
          const pos = ep ? getPosition(episodeKey(h, ep)) : null;
          const pct = pos && pos.dur > 0 ? Math.min(100, Math.max(2, (pos.sec / pos.dur) * 100)) : null;
          const leftMin = pos && pos.dur > 0 && !pos.done ? Math.max(1, Math.ceil((pos.dur - pos.sec) / 60)) : null;
          // Non-breaking spaces keep "5" with "الحلقة" and "14 د" together; the line may
          // only wrap before the bullet.
          const nb = '\u00a0';
          let line = ep ? (isRtl ? `الحلقة${nb}${ep}` : `Episode${nb}${ep}`) : '';
          if (pos?.done) line += isRtl ? ` •${nb}خلصت` : ` •${nb}finished`;
          else if (leftMin) line += isRtl ? ` •${nb}فاضل${nb}${leftMin}${nb}د` : ` •${nb}${leftMin}${nb}min${nb}left`;
          return (
            <div
              key={`${h.objectID || h.slug}-${i}`}
              data-bx-oid={h.objectID || ''}
              className="bx-mob-card bx-press"
              role="button"
              tabIndex={0}
              aria-label={`${h.titleEn || h.titleAr || ''} ${line}`}
              onClick={() => onResume?.(h, pos?.done ? ep + 1 : ep || 1)}
              style={{ minWidth: '128px', maxWidth: '128px', background: '#09090c', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }}
            >
              <div style={{ position: 'relative', width: '128px', height: '168px' }}>
                <img
                  src={coverForMode(h.poster, dataSaver)}
                  alt={h.titleEn || h.titleAr || ''}
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.84)' }}
                />
                <span className="bx-cw-play" aria-hidden="true">
                  <BxIcon name="play" />
                </span>
                {pct !== null && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.22)' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#ffffff', borderRadius: '2px' }} />
                  </div>
                )}
                {onInfo && (
                  <button
                    type="button"
                    className="bx-icon-hit bx-cw-info"
                    aria-label={isRtl ? 'تفاصيل' : 'Details'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onInfo(h);
                    }}
                  >
                    <span>
                      <BxIcon name="info" />
                    </span>
                  </button>
                )}
              </div>
              <div style={{ padding: '0.45rem 0.55rem 0.5rem', background: '#0c0c10' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {h.titleEn || h.titleAr}
                </div>
                {line && <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.66)', lineHeight: 1.35 }}>{line}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
