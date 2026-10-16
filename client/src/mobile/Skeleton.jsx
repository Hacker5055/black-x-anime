import React from 'react';

/** Shimmering placeholders shaped like the real content (replaces spinners for lists). */
export function SkeletonBox({ width = '100%', height = 14, radius = 8, style, animated = true }) {
  return <span className={`bx-skel${animated ? '' : ' is-static'}`} style={{ display: 'block', width, height, borderRadius: radius, ...style }} />;
}

/** `animated={false}` for placeholders of rows that are not loading, just not on screen yet. */
export function SkeletonRow({ cards = 4, cardWidth = 116, cardHeight = 168, title = true, padding = '0.9rem 1rem 0.2rem', animated = true }) {
  return (
    <section style={{ padding }} aria-hidden="true">
      {title && <SkeletonBox width="42%" height={16} style={{ marginBottom: '0.7rem' }} animated={animated} />}
      <div style={{ display: 'flex', gap: '0.65rem', overflow: 'hidden' }}>
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} style={{ minWidth: cardWidth, maxWidth: cardWidth }}>
            <SkeletonBox height={cardHeight} radius={12} animated={animated} />
            <SkeletonBox width="80%" height={11} style={{ marginTop: '0.45rem' }} animated={animated} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function SkeletonGrid({ count = 6, columns = 3, ratio = 1.45, gap = '0.65rem', padding = '0.4rem 1rem' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap, padding }} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <span className="bx-skel" style={{ display: 'block', width: '100%', aspectRatio: `1 / ${ratio}`, borderRadius: 12 }} />
          <SkeletonBox width="75%" height={11} style={{ marginTop: '0.45rem' }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ count = 5, thumbWidth = 120, thumbHeight = 68, padding = '0.4rem 1rem' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', padding }} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <SkeletonBox width={thumbWidth} height={thumbHeight} radius={10} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <SkeletonBox width="70%" height={13} />
            <SkeletonBox width="45%" height={11} style={{ marginTop: '0.5rem' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonHero({ height = 515 }) {
  return (
    <div style={{ position: 'relative', height, overflow: 'hidden' }} aria-hidden="true">
      <span className="bx-skel" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <SkeletonBox width="55%" height={26} radius={10} />
        <SkeletonBox width="35%" height={12} />
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <SkeletonBox width={128} height={44} radius={999} />
          <SkeletonBox width={128} height={44} radius={999} />
        </div>
      </div>
    </div>
  );
}
