import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { pushToast } from '../hooks/hooks.js';

export function Modal({ title, sub, onClose, children, wide = false }) {
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal glass glass--strong ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <button type="button" className="modal__close" onClick={onClose} aria-label={t('common.close')}>✕</button>
        <h2 className="modal__title">{title}</h2>
        {sub && <p className="modal__sub">{sub}</p>}
        {children}
      </div>
    </div>
  );
}

export function AuthModal({ initialMode = 'login', onClose }) {
  const { t } = useI18n();
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const u = await login(form.username.trim(), form.password);
        pushToast(t('auth.loginSuccess', { name: u.displayName }), 'success');
      } else {
        await register({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          displayName: form.displayName.trim() || form.username.trim()
        });
        pushToast(t('auth.registerSuccess'), 'success');
      }
      onClose();
    } catch (err) {
      setError(err.message || t('auth.errGeneric'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
      sub={t('auth.subtitle')}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="auth-username">{t('auth.username')}</label>
          <input id="auth-username" className="input" value={form.username} onChange={set('username')} required autoFocus />
        </div>
        {mode === 'register' && (
          <>
            <div className="field">
              <label className="label" htmlFor="auth-email">{t('auth.email')}</label>
              <input id="auth-email" type="email" className="input" value={form.email} onChange={set('email')} required />
            </div>
            <div className="field">
              <label className="label" htmlFor="auth-display">{t('auth.displayName')}</label>
              <input id="auth-display" className="input" value={form.displayName} onChange={set('displayName')} placeholder={t('common.optional') || ''} />
            </div>
          </>
        )}
        <div className="field">
          <label className="label" htmlFor="auth-password">{t('auth.password')}</label>
          <input id="auth-password" type="password" className="input" value={form.password} onChange={set('password')} required minLength={6} />
        </div>

        {error && (
          <div style={{ color: 'var(--red)', fontSize: '0.88rem', fontWeight: 600, marginBlockEnd: '1rem' }}>{error}</div>
        )}

        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          <span className="btn__shine" />
          {mode === 'login' ? t('auth.login') : t('auth.register')}
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.15rem', color: 'var(--ink-dim)', fontSize: '0.92rem' }}>
          {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
          <button
            type="button"
            style={{ background: 'none', border: 0, color: 'var(--cyan)', fontWeight: 700, cursor: 'pointer' }}
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? t('auth.register') : t('auth.login')}
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: '0.85rem', color: 'var(--ink-faint)', fontSize: '0.82rem' }}>
          {t('auth.demoHint')}
        </div>
      </form>
    </Modal>
  );
}

/** Global show search (witanime) used in the navbar. */
export function ShowSearch({ variant = 'nav' }) {
  const { t, lang } = useI18n();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const boxRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const run = useCallback(async (term) => {
    if (!term.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await api.get(`/api/stream/search?q=${encodeURIComponent(term)}`);
      setResults(data.items || []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onChange = (e) => {
    const term = e.target.value;
    setQ(term);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => run(term), 350);
  };

  return (
    <div className={variant === 'nav' ? 'nav-search' : 'search-inline'} ref={boxRef}>
      <span className="search-inline__icon">⌕</span>
      <input
        className="input"
        value={q}
        onChange={onChange}
        placeholder={t('nav.search')}
        aria-label={t('common.search')}
        lang={lang}
      />
      {open && (results.length > 0 || loading) && (
        <div className="nav-search__results">
          {loading && <div className="anime-picker__option">{t('common.loading')}</div>}
          {results.map((s) => (
            <button
              type="button"
              key={`${s.kind}-${s.slug}`}
              className="anime-picker__option"
              onClick={() => {
                setOpen(false);
                setQ('');
                navigate(`/show/${s.slug}`);
              }}
            >
              {s.poster ? (
                <img src={s.poster} alt="" referrerPolicy="no-referrer" />
              ) : (
                <div style={{ width: 38, height: 52, borderRadius: 6, background: '#1b2138' }} />
              )}
              <span>{(lang === 'ar' ? s.titleAr : s.titleEn) || s.titleEn || s.slug}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
