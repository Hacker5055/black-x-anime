import React from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';

export const BADGE_DEFINITIONS = {
  blue_verified: {
    id: 'blue_verified',
    nameAr: 'شارة زرقاء (حساب موثّق)',
    nameEn: 'Blue Badge (Verified)',
    descAr: 'حساب موثّق رسمي ومتحقق من الهوية',
    descEn: 'Official verified account',
    color: '#0ea5e9',
    bg: 'rgba(14, 165, 233, 0.15)',
    border: 'rgba(14, 165, 233, 0.4)',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" />
      </svg>
    )
  },
  gold_vip: {
    id: 'gold_vip',
    nameAr: 'شارة ذهبية (عضوية VIP)',
    nameEn: 'Gold Badge (VIP Member)',
    descAr: 'عضوية VIP ذهبية مميزة ودعم خاص',
    descEn: 'Exclusive Gold VIP member',
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.15)',
    border: 'rgba(234, 179, 8, 0.4)',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1v-1h14v1z" />
      </svg>
    )
  },
  success_partner: {
    id: 'success_partner',
    nameAr: 'مشارك في قصة النجاح',
    nameEn: 'Success Story Contributor',
    descAr: 'من المساهمين والشركاء في قصة نجاح المنصة',
    descEn: 'Contributor to the platform success story',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.15)',
    border: 'rgba(139, 92, 246, 0.4)',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M9.19 6.35c-2.04 2.29-3.44 5.58-3.57 5.89-.17.39-.08.84.23 1.13.31.29.77.35 1.14.15.34-.18 3.51-1.8 5.76-3.9 1.48-1.38 2.2-3.08 2.25-3.21.14-.38.04-.81-.25-1.09-.29-.28-.72-.37-1.1-.23-.15.06-1.92.83-3.46 2.26zm6.82 2.65c-.24.23-.39.55-.39.89 0 .7.57 1.27 1.27 1.27.34 0 .66-.14.89-.38.7-.72 1.34-1.52 1.9-2.39-1.02.21-2.42.36-3.67.61zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79.9 1.77 2.45 3.32 4.3 4.41.97.57 2.05.99 3.19 1.21-.46 1.39-.67 2.82-.7 4.1z" />
      </svg>
    )
  },
  veteran_viewer: {
    id: 'veteran_viewer',
    nameAr: 'مشاهد مخضرم',
    nameEn: 'Veteran Viewer',
    descAr: 'من أقدم وأوفياء مشاهدي الأنمي',
    descEn: 'Veteran anime enthusiast and long-time viewer',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.15)',
    border: 'rgba(249, 115, 22, 0.4)',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
      </svg>
    )
  },
  celebrity: {
    id: 'celebrity',
    nameAr: 'شخص مشهور',
    nameEn: 'Celebrity',
    descAr: 'شخصية عامة ومشهورة في مجتمع الأنمي',
    descEn: 'Public figure & community celebrity',
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.15)',
    border: 'rgba(236, 72, 153, 0.4)',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
    )
  }
};

export function UserBadges({ badges = [], size = 'sm', showLabels = false, className = '' }) {
  const { lang } = useI18n();

  if (!Array.isArray(badges) || badges.length === 0) return null;

  const validBadges = badges
    .map((b) => BADGE_DEFINITIONS[b])
    .filter(Boolean);

  if (validBadges.length === 0) return null;

  const isSmall = size === 'sm';

  return (
    <div
      className={`user-badges-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '0.25rem' : '0.45rem',
        verticalAlign: 'middle',
        flexWrap: 'wrap'
      }}
    >
      {validBadges.map((b) => {
        const title = lang === 'ar' ? b.nameAr : b.nameEn;
        const desc = lang === 'ar' ? b.descAr : b.descEn;
        return (
          <span
            key={b.id}
            title={`${title} — ${desc}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              background: b.bg,
              border: `1px solid ${b.border}`,
              color: b.color,
              borderRadius: '999px',
              padding: isSmall ? '0.12rem 0.35rem' : '0.2rem 0.6rem',
              fontSize: isSmall ? '0.72rem' : '0.82rem',
              fontWeight: 700,
              boxShadow: `0 0 10px ${b.bg}`,
              cursor: 'help',
              transition: 'transform 0.15s ease'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              {b.icon}
            </span>
            {showLabels && <span>{title}</span>}
          </span>
        );
      })}
    </div>
  );
}

export default UserBadges;
