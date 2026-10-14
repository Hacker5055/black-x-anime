import React from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';

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
