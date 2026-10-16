import React, { useEffect, useState } from 'react';
import BxIcon from './BxIcon.jsx';
import { SkeletonRow } from './Skeleton.jsx';
import { coverForMode } from './dataSaver.js';

const CACHE_KEY = 'bx_mob_byw_v16';

/**
 * "Because you watched X": titles that share X's genres, computed on the phone
 * from the catalogue (no tracking, no server-side profile). Hidden when there is
 * nothing real to show.
 */
export default function BecauseYouWatchedRow({ seed, excludeIds, loadSimilar, onOpen, isRtl, dataSaver = false }) {
  const seedId = seed?.objectID || '';
  const [state, setState] = useState(() => {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (cached?.seedId === seedId && Array.isArray(cached.items)) return { loading: false, items: cached.items };
    } catch {
      /* ignore */
    }
    return { loading: Boolean(seedId), items: [] };
  });

  useEffect(() => {
    if (!seedId || typeof loadSimilar !== 'function') return undefined;
    let alive = true;
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (cached?.seedId === seedId && Array.isArray(cached.items)) {
        setState({ loading: false, items: cached.items });
        return undefined;
      }
    } catch {
      /* ignore */
    }
    setState({ loading: true, items: [] });
    loadSimilar(seed)
      .then((list) => {
        if (!alive) return;
        const skip = new Set([seedId, ...(excludeIds || [])]);
        const items = (Array.isArray(list) ? list : []).filter((x) => x?.objectID && !skip.has(x.objectID)).slice(0, 16);
        setState({ loading: false, items });
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ seedId, items }));
        } catch {
          /* ignore */
        }
      })
      .catch(() => alive && setState({ loading: false, items: [] }));
    return () => {
      alive = false;
    };
    // excludeIds only filters; re-querying on every history change is not needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedId, loadSimilar]);

  if (!seedId) return null;
  if (state.loading) return <SkeletonRow cards={4} />;
  if (state.items.length < 3) return null;
  const seedTitle = seed.titleEn || seed.titleAr || '';
  return (
    <section style={{ padding: '0.9rem 1rem 0.2rem' }}>
      <h2 style={{ margin: '0 0 0.55rem', fontSize: '1rem', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <BxIcon name="sparkles" className="bx-ico-lead" />
        {isRtl ? `عشان اتفرجت على ${seedTitle}` : `Because you watched ${seedTitle}`}
      </h2>
      <div className="bx-mob-scroll bx-stagger" style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
        {state.items.map((item) => (
          <div
            key={item.objectID}
            data-bx-oid={item.objectID}
            className="bx-mob-card bx-press"
            role="button"
            tabIndex={0}
            aria-label={item.titleEn}
            onClick={() => onOpen?.(item)}
            style={{ minWidth: '116px', maxWidth: '116px', cursor: 'pointer' }}
          >
            <img
              src={coverForMode(item.poster, dataSaver)}
              alt={item.titleEn}
              loading="lazy"
              decoding="async"
              style={{ width: '116px', height: '164px', objectFit: 'cover', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', background: '#0b0b0e' }}
            />
            <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.titleEn}
            </div>
            {(item.year || item.type) && (
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>
                {[item.type, item.year].filter(Boolean).join(' • ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
