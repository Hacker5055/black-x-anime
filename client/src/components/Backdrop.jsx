import React from 'react';
import { useToasts } from '../hooks/hooks.js';
import { useI18n } from '../i18n/I18nProvider.jsx';

/**
 * Fixed ambient layer: blurred orbs whose color follows --live
 * (set from the dominant color of the currently viewed poster).
 */
export default function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop__orb backdrop__orb--1" />
      <div className="backdrop__orb backdrop__orb--2" />
      <div className="backdrop__orb backdrop__orb--3" />
      <div className="backdrop__grid" />
      <div className="backdrop__noise" />
    </div>
  );
}

export function Toasts() {
  const toasts = useToasts();
  const { t } = useI18n();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.kind}`}>
          <span>{toast.kind === 'success' ? '✓' : toast.kind === 'error' ? '⚠' : '◆'}</span>
          <span>{toast.message || t('common.loading')}</span>
        </div>
      ))}
    </div>
  );
}
