import React, { useEffect, useState } from 'react';
import PosterCard from './PosterCard.jsx';
import { SkeletonRow } from './Skeleton.jsx';

const CACHE_KEY = 'bx_mob_byw_v16';

/**
 * "Because you watched X": titles that share X's genres, computed on the phone
 * from the catalogue (no tracking, no server-side profile). Hidden when there is
 * nothing real to show.
 */
export default function BecauseYouWatchedRow({ seed, excludeIds, loadSimilar, onOpen, onPeek, isRtl, dataSaver = false }) {
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
    <section className="bx-section">
      <div className="bx-section-head">
        <h2 className="bx-section-title bx-ellipsis">
          {isRtl ? 'عشان اتفرجت على ' : 'Because you watched '}
          <bdi>{seedTitle}</bdi>
        </h2>
      </div>
      <div className="bx-row bx-mob-scroll">
        {state.items.map((item) => (
          <PosterCard key={item.objectID} item={item} onOpen={onOpen} onPeek={onPeek} dataSaver={dataSaver} />
        ))}
      </div>
    </section>
  );
}
