import React from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';

/** SVG gooey filter used by the liquid loader (blob fusion effect). */
export function GooFilter() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <filter id="goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}

export function LiquidLoader({ label }) {
  const { t } = useI18n();
  return (
    <div className="liquid-loader" role="status" aria-live="polite">
      <div className="liquid-loader__blobs">
        <div className="liquid-loader__blob" />
        <div className="liquid-loader__blob" />
        <div className="liquid-loader__blob" />
      </div>
      <div>{label || t('common.loading')}</div>
    </div>
  );
}

export function SkeletonCard({ height = 330 }) {
  return <div className="skeleton skeleton-card" style={{ height }} />;
}

export function SkeletonGrid({ count = 8, height = 330 }) {
  return (
    <div className="grid-anime">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height={height} />
      ))}
    </div>
  );
}

export function SkeletonLines({ lines = 3 }) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton skeleton-line ${i === lines - 1 ? 'short' : i === 0 ? '' : 'tiny'}`} />
      ))}
    </div>
  );
}

export function EmptyState({ icon = '🫧', title, sub, children }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <h3>{title}</h3>
      {sub && <p>{sub}</p>}
      {children}
    </div>
  );
}
