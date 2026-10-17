import React from 'react';
import BxIcon from './BxIcon.jsx';

/**
 * StoryPreview: moved out of MobileApkApp.jsx unchanged (2026-10-17 split). It only renders —
 * the state and the actions stay in MobileApkApp and come in as props.
 */
export default function StoryPreview({
  favorites,
  handleOpenAnime,
  isRtl,
  popularList,
  setStoryPreviewAnime,
  storyPreviewAnime,
  toggleFavorite
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9880,
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden'
      }}
    >
      {/* Full-Bleed Vertical Story Poster */}
      <img
        src={storyPreviewAnime.item.poster}
        alt={storyPreviewAnime.item.titleEn}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'brightness(0.72) contrast(1.08)'
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.88) 75%, #000000 100%)',
          pointerEvents: 'none'
        }}
      />

      {/* Top Segmented Story Progress Bars & Header */}
      <div style={{ position: 'relative', zIndex: 5, padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '0.65rem' }}>
          {(storyPreviewAnime.pool || popularList.slice(0, 12)).map((poolItem, sIdx, pool) => (
            <div
              key={`sbar-${sIdx}`}
              onClick={() => setStoryPreviewAnime({ item: poolItem, index: sIdx, pool })}
              style={{
                flex: 1,
                height: '3px',
                borderRadius: '999px',
                background:
                  sIdx <= (storyPreviewAnime.index || 0) ? '#ffffff' : 'rgba(255,255,255,0.26)',
                cursor: 'pointer'
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <img
              src={storyPreviewAnime.item.poster}
              alt={storyPreviewAnime.item.titleEn}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid #ffffff'
              }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{storyPreviewAnime.item.titleEn}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                {storyPreviewAnime.pool ? (isRtl ? 'بتنزل النهارده' : 'Airing today') : isRtl ? 'الأكثر مشاهدة' : 'Most popular'}{` • ${(storyPreviewAnime.index || 0) + 1}/${(storyPreviewAnime.pool || popularList.slice(0, 12)).length}`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStoryPreviewAnime(null)}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer'
            }}
          >
            <BxIcon name="close" />
          </button>
        </div>
      </div>

      {/* Middle Invisible Left/Right Tap Zones to Cycle Stories */}
      <div style={{ position: 'relative', zIndex: 4, flex: 1, display: 'flex' }}>
        <div
          onClick={() => {
            const pool = storyPreviewAnime.pool || popularList.slice(0, 12);
            const prevIdx = ((storyPreviewAnime.index || 0) - 1 + pool.length) % pool.length;
            setStoryPreviewAnime({ item: pool[prevIdx], index: prevIdx, pool });
          }}
          style={{ flex: 1, cursor: 'pointer' }}
        />
        <div
          onClick={() => {
            const pool = storyPreviewAnime.pool || popularList.slice(0, 12);
            const nextIdx = ((storyPreviewAnime.index || 0) + 1) % pool.length;
            setStoryPreviewAnime({ item: pool[nextIdx], index: nextIdx, pool });
          }}
          style={{ flex: 1, cursor: 'pointer' }}
        />
      </div>

      {/* Bottom Story Details & Instant Action Deck */}
      <div style={{ position: 'relative', zIndex: 5, padding: '1rem 1.15rem 1.8rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {storyPreviewAnime.item.rating && (
            <span
              style={{
                padding: '0.18rem 0.55rem',
                borderRadius: '8px',
                background: '#ffffff',
                color: '#000000',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              <BxIcon name="star" className="bx-ico-lead" />{storyPreviewAnime.item.rating}
            </span>
          )}
          {[storyPreviewAnime.item.type, storyPreviewAnime.item.state].filter(Boolean).length > 0 && (
            <span
              style={{
                padding: '0.18rem 0.55rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.14)',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              {[storyPreviewAnime.item.type, storyPreviewAnime.item.state].filter(Boolean).join(' • ')}
            </span>
          )}
        </div>

        <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.375rem', fontWeight: 800, lineHeight: 1.25 }}>
          {storyPreviewAnime.item.titleEn}
        </h2>

        <p
          style={{
            margin: '0 0 1rem',
            fontSize: '0.9375rem',
            color: 'rgba(255,255,255,0.82)',
            lineHeight: 1.55,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {storyPreviewAnime.item.storyAr}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => {
              const target = storyPreviewAnime.item;
              setStoryPreviewAnime(null);
              handleOpenAnime(target, 1);
            }}
            style={{
              padding: '0.78rem 1rem',
              borderRadius: '12px',
              background: '#ffffff',
              color: '#000000',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer'
            }}
          >
            <BxIcon name="play" className="bx-ico-lead" />{isRtl ? 'تشغيل' : 'Play'}
          </button>

          <button
            type="button"
            onClick={() => {
              const target = storyPreviewAnime.item;
              setStoryPreviewAnime(null);
              handleOpenAnime(target);
            }}
            style={{
              padding: '0.78rem 0.9rem',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.12)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.26)',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            <BxIcon name="info" className="bx-ico-lead" />{isRtl ? 'التفاصيل' : 'Details'}
          </button>

          <button
            type="button"
            onClick={() => toggleFavorite(storyPreviewAnime.item)}
            style={{
              padding: '0.78rem 0.85rem',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.12)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.26)',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer'
            }}
          >
            {favorites.some((f) => f.objectID === storyPreviewAnime.item.objectID) ? <BxIcon name="check" /> : <BxIcon name="plus" />}
          </button>
        </div>
      </div>
    </div>
  );
}
