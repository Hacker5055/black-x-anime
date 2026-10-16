import React, { useEffect, useState } from 'react';
import BxIcon from './BxIcon.jsx';
import { episodeKey, getPosition, subscribePositions } from './resumeStore.js';
import PosterCard from './PosterCard.jsx';
import SectionHead from './SectionHead.jsx';

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
    <section className="bx-section">
      <SectionHead title={isRtl ? 'كمّل المشاهدة' : 'Continue watching'} isRtl={isRtl} />
      <div className="bx-row bx-mob-scroll">
        {items.map((h, i) => {
          const ep = Number(h.episode) || 0;
          const pos = ep ? getPosition(episodeKey(h, ep)) : null;
          const pct = pos && pos.dur > 0 ? Math.min(100, Math.max(2, (pos.sec / pos.dur) * 100)) : null;
          const leftMin = pos && pos.dur > 0 && !pos.done ? Math.max(1, Math.ceil((pos.dur - pos.sec) / 60)) : null;
          // Non-breaking spaces keep "5" with "الحلقة" and "14 د" together.
          const nb = '\u00a0';
          let line = ep ? (isRtl ? `الحلقة${nb}${ep}` : `Episode${nb}${ep}`) : '';
          if (pos?.done) line += isRtl ? ` •${nb}خلصت` : ` •${nb}finished`;
          else if (leftMin) line += isRtl ? ` •${nb}فاضل${nb}${leftMin}${nb}د` : ` •${nb}${leftMin}${nb}min${nb}left`;
          const card = { ...h, objectID: h.objectID || h.slug, rating: '' };
          return (
            <PosterCard
              key={`${h.objectID || h.slug}-${i}`}
              item={card}
              width={128}
              badge={null}
              progress={pct ?? undefined}
              subtitle={line}
              overlay={
                <span className="bx-cw-play" aria-hidden="true">
                  <BxIcon name="play" filled />
                </span>
              }
              dataSaver={dataSaver}
              onOpen={() => onResume?.(h, pos?.done ? ep + 1 : ep || 1)}
              onPeek={onInfo ? () => onInfo(h) : undefined}
            />
          );
        })}
      </div>
    </section>
  );
}
