/**
 * Feature panels — ratings, gamification, follow, profile customization,
 * creator submissions and support tickets. Liquid-glass styling via the
 * existing classes; bilingual through useI18n.
 */
import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { pushToast } from '../hooks/hooks.js';

function LoginNote() {
  const { t } = useI18n();
  return (
    <p style={{ opacity: 0.75, margin: 0, fontSize: '0.9rem' }}>
      🔒 {t('account.loginFirst')}
    </p>
  );
}

function Panel({ icon, title, children }) {
  return (
    <section className="glass fx-panel">
      <h3 className="fx-panel__title">
        <span>{icon}</span> {title}
      </h3>
      {children}
    </section>
  );
}

/* ------------------------------ ratings ------------------------------ */

export function RatingPanel({ slug, title }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user) {
    return (
      <section className="glass fx-panel">
        <h3 className="fx-panel__title"><span>⭐</span> {t('account.rating')}</h3>
        <LoginNote />
      </section>
    );
  }

  const send = async (s) => {
    setBusy(true);
    setSaved(false);
    try {
      await api.post('/api/content/rate', { slug, title, score: s });
      setScore(s);
      setSaved(true);
      pushToast?.(t('account.rateSaved'), 'success');
    } catch (err) {
      pushToast?.(err.message || 'Error', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass fx-panel">
      <h3 className="fx-panel__title"><span>⭐</span> {t('account.rating')}</h3>
      <p style={{ opacity: 0.75, margin: '0 0 0.75rem', fontSize: '0.9rem' }}>{t('account.rateHint')}</p>
      <div className="stars" role="group" aria-label={t('account.rating')}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            className={`star-btn${n <= (score || 0) ? ' star-btn--on' : ''}`}
            disabled={busy}
            onClick={() => send(n)}
            aria-label={`${n}`}
          >
            {n <= (score || 0) ? '★' : '☆'}
          </button>
        ))}
      </div>
      {saved && <p className="fx-done">✓ {t('account.rateSaved')}</p>}
    </section>
  );
}

/* ---------------------------- gamification ---------------------------- */

export function GamificationPanel() {
  const { t, formatNumber } = useI18n();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!user) { setBusy(false); return undefined; }
    let alive = true;
    api.get('/api/gamification/stats')
      .then((d) => alive && setData(d.data))
      .catch(() => alive && setData(null))
      .finally(() => alive && setBusy(false));
    return () => { alive = false; };
  }, [user]);

  return (
    <Panel icon="🏆" title={t('account.statsTitle')}>
      {!user ? <LoginNote /> : busy ? (
        <p style={{ opacity: 0.6, margin: 0 }}>…</p>
      ) : !data ? (
        <p style={{ opacity: 0.6, margin: 0 }}>{t('error.generic')}</p>
      ) : (
        <>
          <div className="fx-grid fx-grid--stats">
            <div className="stat-tile">
              <div className="stat-tile__value">{formatNumber ? formatNumber(data.currentLevel) : data.currentLevel}</div>
              <div className="stat-tile__label">{t('account.level')}</div>
            </div>
            <div className="stat-tile">
              <div className="stat-tile__value">{formatNumber ? formatNumber(data.totalWatchTimeMin) : data.totalWatchTimeMin}</div>
              <div className="stat-tile__label">{t('account.watchTime')}</div>
            </div>
            <div className="stat-tile">
              <div className="stat-tile__value">{data.progressPercentage}%</div>
              <div className="stat-tile__label">{t('account.levelProgress')}</div>
            </div>
          </div>
          <div className="fx-progress" aria-hidden="true">
            <div className="fx-progress__fill" style={{ width: `${Math.min(100, data.progressPercentage)}%` }} />
          </div>
          <h4 style={{ margin: '1rem 0 0.5rem', fontWeight: 600, fontSize: '0.95rem' }}>🎖 {t('account.badges')}</h4>
          {data.unlockedBadges?.length ? (
            <div className="fx-badges">
              {data.unlockedBadges.map((b) => (
                <span key={b.name} className="chip" title={b.name}>
                  {b.iconUrl ? <img src={b.iconUrl} alt="" width={18} height={18} referrerPolicy="no-referrer" /> : '🏅'} {b.name}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ opacity: 0.65, margin: 0, fontSize: '0.88rem' }}>{t('account.noBadges')}</p>
          )}
        </>
      )}
    </Panel>
  );
}

/* ------------------------------- follow ------------------------------- */

export function FollowPanel() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await api.post('/api/community/follow', { targetUsername: name.trim() });
      pushToast?.(t('account.followed'), 'success');
      setName('');
    } catch (err) {
      pushToast?.(err.message || 'Error', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel icon="➕" title={t('account.followTitle')}>
      {!user ? <LoginNote /> : (
        <form onSubmit={send}>
          <p style={{ opacity: 0.75, margin: '0 0 0.75rem', fontSize: '0.9rem' }}>{t('account.followHint')}</p>
          <div className="fx-row">
            <input
              className="input"
              placeholder={t('account.followPh')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />
            <button type="submit" className="btn btn--primary" disabled={busy || !name.trim()}>
              <span className="btn__shine" /> {t('account.followBtn')}
            </button>
          </div>
        </form>
      )}
    </Panel>
  );
}

/* ----------------------------- customize ----------------------------- */

export function CustomizePanel() {
  const { t } = useI18n();
  const { user, refresh } = useAuth();
  const [bannerUrl, setBannerUrl] = useState('');
  const [theme, setTheme] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const body = {};
      if (bannerUrl.trim()) body.bannerUrl = bannerUrl.trim();
      if (theme.trim()) body.themePreference = theme.trim();
      await api.put('/api/profile/customize', body);
      pushToast?.(t('account.saved'), 'success');
      refresh?.();
    } catch (err) {
      pushToast?.(err.message || 'Error', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel icon="🎨" title={t('account.customizeTitle')}>
      {!user ? <LoginNote /> : (
        <form onSubmit={send}>
          <div className="field">
            <label className="field__label" htmlFor="fx-banner">{t('account.bannerUrl')}</label>
            <input id="fx-banner" className="input" placeholder="https://…" value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="fx-theme">{t('account.themePref')}</label>
            <input id="fx-theme" className="input" placeholder={t('account.themePh')} value={theme} onChange={(e) => setTheme(e.target.value)} />
          </div>
          <button type="submit" className="btn btn--primary" disabled={busy || (!bannerUrl.trim() && !theme.trim())}>
            <span className="btn__shine" /> {t('account.save')}
          </button>
        </form>
      )}
    </Panel>
  );
}

/* ------------------------------ creator ------------------------------ */

export function CreatorPanel() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setDone(false);
    try {
      await api.post('/api/creator/submit', { videoUrl: url.trim() });
      setDone(true);
      setUrl('');
      pushToast?.(t('account.creatorSent'), 'success');
    } catch (err) {
      pushToast?.(err.message || 'Error', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel icon="🎬" title={t('account.creatorTitle')}>
      {!user ? <LoginNote /> : (
        <form onSubmit={send}>
          <p style={{ opacity: 0.75, margin: '0 0 0.75rem', fontSize: '0.9rem' }}>{t('account.creatorHint')}</p>
          <div className="field">
            <input className="input" placeholder="https://tiktok.com/@user/video/…" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <button type="submit" className="btn btn--primary" disabled={busy || !url.trim()}>
            <span className="btn__shine" /> {t('account.creatorSend')}
          </button>
          {done && <p className="fx-done">✓ {t('account.creatorSent')}</p>}
        </form>
      )}
    </Panel>
  );
}

/* ------------------------------ support ------------------------------ */

export function SupportPanel() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || busy) return;
    setBusy(true);
    setDone(false);
    try {
      await api.post('/api/support/ticket', { subject: subject.trim(), message: message.trim() });
      setDone(true);
      setSubject('');
      setMessage('');
      pushToast?.(t('account.ticketSent'), 'success');
    } catch (err) {
      pushToast?.(err.message || 'Error', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel icon="🎧" title={t('account.supportTitle')}>
      {!user ? <LoginNote /> : (
        <form onSubmit={send}>
          <div className="field">
            <label className="field__label" htmlFor="fx-subject">{t('account.subject')}</label>
            <input id="fx-subject" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={160} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="fx-message">{t('account.message')}</label>
            <textarea id="fx-message" className="textarea" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <button type="submit" className="btn btn--primary" disabled={busy || !subject.trim() || !message.trim()}>
            <span className="btn__shine" /> {t('account.sendTicket')}
          </button>
          {done && <p className="fx-done">✓ {t('account.ticketSent')}</p>}
        </form>
      )}
    </Panel>
  );
}
