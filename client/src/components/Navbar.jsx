import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ShowSearch } from './Modals.jsx';
import { UserBadges } from './UserBadges.jsx';

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
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const isDev = user?.role === 'developer' || user?.email?.toLowerCase() === 'mz0970mmz@gmail.com' || user?.isDeveloper;
  const hasVerified = isDev || (user?.badges || []).includes('blue_verified') || (user?.badges || []).includes('gold_vip') || (user?.badges || []).length > 0;

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
    { to: '/community', label: t('nav.community'), icon: '💬' },
    { to: '/rankings', label: t('nav.rankings'), icon: '🏆' },
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
              <div className="nav__auth-group">
                <button type="button" className="btn btn--ghost btn--sm nav-auth-btn nav-auth-btn--login" onClick={() => onOpenAuth('login')}>
                  {t('nav.login')}
                </button>
                <button type="button" className="btn btn--primary btn--sm nav-auth-btn nav-auth-btn--reg" onClick={() => onOpenAuth('register')}>
                  <span className="btn__shine" />
                  {t('nav.register')}
                </button>
              </div>
            ) : (
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="user-avatar-btn"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label={user.displayName || 'User profile'}
                >
                  <div className="user-avatar-wrapper">
                    <span className="avatar user-avatar-circle" style={{ background: user.avatarColor, overflow: 'hidden' }}>
                      {(user.photoURL || user.photoUrl) ? (
                        <img src={user.photoURL || user.photoUrl} alt={user.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        user.displayName?.[0]?.toUpperCase() || 'X'
                      )}
                    </span>
                    {/* Verification badges attached directly beside/on user picture like Facebook and Instagram */}
                    {isDev ? (
                      <span className="avatar-badge avatar-badge--dev" title="👑 مطور BLACK X">👑</span>
                    ) : hasVerified ? (
                      <span className="avatar-badge avatar-badge--verified" title="✔ حساب موثّق">
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" />
                        </svg>
                      </span>
                    ) : null}
                  </div>
                </button>
                {menuOpen && (
                  <div className="user-menu" style={{ insetInlineEnd: 0, top: 'calc(100% + 10px)' }}>
                    <div className="user-menu__header">
                      <div className="user-menu__name">{user.displayName}</div>
                      <div className="user-menu__role">
                        {isDev ? '👑 مطور BLACK X' : `@${user.username || 'user'}`}
                      </div>
                      <UserBadges badges={user.badges} size="sm" />
                    </div>
                    <div className="user-menu__divider" />
                    <button
                      type="button"
                      className="user-menu__item"
                      onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                    >
                      <span>👤</span> {t('nav.profile')}
                    </button>
                    {(user.role === 'developer' || user.email?.toLowerCase() === 'mz0970mmz@gmail.com' || user.isDeveloper) && (
                      <button
                        type="button"
                        className="user-menu__item"
                        style={{ color: '#f472b6', fontWeight: 700 }}
                        onClick={() => { setMenuOpen(false); navigate('/profile?tab=developer'); }}
                      >
                        <span>👑</span> {t('nav.devConsole')}
                      </button>
                    )}
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
      </nav>
    </>
  );
}
