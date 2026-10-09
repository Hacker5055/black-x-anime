import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ShowSearch } from './Modals.jsx';

function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang-toggle" data-lang={lang} role="group" aria-label={t('nav.language')}>
      <div className="lang-toggle__thumb" aria-hidden="true" />
      <button
        type="button"
        className={`lang-toggle__btn ${lang === 'en' ? 'active' : ''}`}
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
      >
        EN
      </button>
      <button
        type="button"
        className={`lang-toggle__btn ${lang === 'ar' ? 'active' : ''}`}
        onClick={() => setLang('ar')}
        aria-pressed={lang === 'ar'}
      >
        ع
      </button>
    </div>
  );
}

export default function Navbar({ onOpenAuth }) {
  const { t, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const links = [
    { to: '/', label: t('nav.home'), icon: '◈' },
    { to: '/browse', label: t('nav.browse'), icon: '⌕' },
    { to: '/mylist', label: t('nav.mylist'), icon: '♥' }
  ];

  return (
    <>
      <header className="nav">
        <div className="nav__inner">
          <NavLink to="/" className="nav__logo" aria-label="BLACK X">
            <span className="nav__logo-mark">
              <svg width="21" height="21" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                <path d="M14 14 L32 40 L18 50 M50 14 L32 40 L46 50" stroke="url(#xg)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="xg" x1="0" y1="0" x2="64" y2="64">
                    <stop stopColor="#22d3ee" />
                    <stop offset="0.55" stopColor="#8b5cf6" />
                    <stop offset="1" stopColor="#f472b6" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
            <span>
              BLACK <span className="nav__logo-x">X</span>
            </span>
          </NavLink>

          <nav className="nav__links" aria-label="Main">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => `nav__link ${isActive ? 'active' : ''}`}
                end={l.to === '/'}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="nav__spacer" />

          <div className="nav__actions">
            <ShowSearch variant="nav" />
            <LanguageToggle />
            {!user ? (
              <>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => onOpenAuth('login')}>
                  {t('nav.login')}
                </button>
                <button type="button" className="btn btn--primary btn--sm" onClick={() => onOpenAuth('register')}>
                  <span className="btn__shine" />
                  {t('nav.register')}
                </button>
              </>
            ) : (
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button type="button" className="user-chip" onClick={() => setMenuOpen((v) => !v)}>
                  <span className="avatar" style={{ background: user.avatarColor }}>
                    {user.displayName?.[0]?.toUpperCase() || 'X'}
                  </span>
                  <span className="user-chip__name">{user.displayName}</span>
                  <span style={{ color: 'var(--ink-faint)', fontSize: '0.7rem' }}>▼</span>
                </button>
                {menuOpen && (
                  <div className="user-menu" style={{ insetInlineEnd: 0, top: 'calc(100% + 10px)' }}>
                    <button
                      type="button"
                      className="user-menu__item"
                      onClick={() => { setMenuOpen(false); navigate('/mylist'); }}
                    >
                      <span>♥</span> {t('nav.mylist')}
                    </button>
                    <button
                      type="button"
                      className="user-menu__item user-menu__item--danger"
                      onClick={async () => { setMenuOpen(false); await logout(); navigate('/'); }}
                    >
                      <span>⏻</span> {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="nav-mobile-tabs" aria-label="Mobile">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : '')} end={l.to === '/'}>
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
        <a
          href="#lang"
          onClick={(e) => { e.preventDefault(); setLang(lang === 'ar' ? 'en' : 'ar'); }}
        >
          <span>🌐</span>
          <span>{lang === 'ar' ? 'EN' : 'ع'}</span>
        </a>
      </nav>
    </>
  );
}
