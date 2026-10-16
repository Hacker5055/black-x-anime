import React, { useState } from 'react';
import BxIcon from './BxIcon.jsx';
import { BX_APK_VERSION, compareVersions } from './bxServers.js';
import { haptic } from './haptics.js';

const DISMISS_KEY = 'bx_mob_update_dismissed';

/** Opens a URL outside the app (Capacitor hands non-app URLs to the system browser). */
export function openExternal(url) {
  try {
    const w = window.open(url, '_system');
    if (!w) window.location.href = url;
  } catch {
    window.location.href = url;
  }
}

/**
 * "New version available" card. The APK is installed from the website, so this
 * banner (fed by /api/app/config) is how people learn about updates. Builds below
 * `minSupported` get a banner that cannot be dismissed.
 */
export default function UpdateBanner({ release, lang = 'ar' }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) || '';
    } catch {
      return '';
    }
  });
  if (!release?.version || !release?.url) return null;
  if (compareVersions(release.version, BX_APK_VERSION) <= 0) return null;
  const forced = release.minSupported && compareVersions(BX_APK_VERSION, release.minSupported) < 0;
  if (!forced && dismissed === release.version) return null;
  const isAr = lang === 'ar';
  const notes = (isAr ? release.notesAr : release.notesEn) || [];
  return (
    <div className="bx-update-card bx-pop" role="region" aria-label={isAr ? 'تحديث جديد' : 'Update available'}>
      <div className="bx-update-head">
        <span className="bx-update-ico">
          <BxIcon name="download" size="1.05em" strokeWidth={2.4} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bx-update-title">
            {isAr ? `فيه تحديث جديد — v${release.version}` : `Update available — v${release.version}`}
          </div>
          <div className="bx-update-sub">
            {isAr ? `نسختك الحالية v${BX_APK_VERSION}` : `You have v${BX_APK_VERSION}`}
            {forced ? (isAr ? ' • لازم تحدّث عشان التطبيق يشتغل' : ' • required to keep working') : ''}
          </div>
        </div>
        {!forced && (
          <button
            type="button"
            className="bx-round-btn bx-update-close"
            aria-label={isAr ? 'بعدين' : 'Later'}
            onClick={() => {
              haptic('tap');
              try {
                localStorage.setItem(DISMISS_KEY, release.version);
              } catch {
                /* ignore */
              }
              setDismissed(release.version);
            }}
          >
            <BxIcon name="close" />
          </button>
        )}
      </div>
      {notes.length > 0 && (
        <ul className="bx-update-notes">
          {notes.slice(0, 4).map((n) => (
            <li key={n}>
              <BxIcon name="check" size="0.95em" strokeWidth={2.6} />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="bx-update-cta"
        onClick={() => {
          haptic('success');
          openExternal(release.url);
        }}
      >
        <BxIcon name="download" className="bx-ico-lead" />
        {isAr ? 'نزّل التحديث' : 'Download update'}
      </button>
    </div>
  );
}
