import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Backdrop, { Toasts } from './components/Backdrop.jsx';
import { AuthModal } from './components/Modals.jsx';
import { GooFilter } from './components/Loading.jsx';
import { useI18n } from './i18n/I18nProvider.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Browse from './pages/Browse.jsx';
import TrendingAnime from './pages/TrendingAnime.jsx';
import ShowDetail from './pages/ShowDetail.jsx';
import Watch from './pages/Watch.jsx';
import MyList from './pages/MyList.jsx';
import ProfileDashboard from './pages/ProfileDashboard.jsx';
import Rankings from './pages/Rankings.jsx';
import Community from './pages/Community.jsx';
import AnimeDiscover from './components/AnimeDiscover.jsx';
import MobileApkApp from './mobile/MobileApkApp.jsx';
import BlackXSplashVortex from './components/BlackXSplashVortex.jsx';
import { GlobalVipEnforcementGate } from './components/VipPlansAndDevCodes.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { api, isNativeApk } from './api.js';

/**
 * Floating Bottom Navigation Dock (Website — Custom Monochrome Liquid Glass SVG Icon Pack)
 */
function IosLiquidGlassFloatingDock({ onOpenAuth }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang } = useI18n();
  const { user } = useAuth();
  const path = location.pathname;

  const dockItems = [
    {
      id: 'home',
      match: (p) => p === '/',
      to: '/',
      labelAr: 'الرئيسية',
      labelEn: 'Home',
      renderIcon: (active) => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.3' : '1.9'} strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M3.5 10.2L12 3.2l8.5 7V19a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-8.8z"
            fill={active ? 'currentColor' : 'rgba(255,255,255,0.08)'}
          />
          <path
            d="M9.5 21v-6a2.5 2.5 0 0 1 5 0v6"
            stroke={active ? '#ffffff' : 'currentColor'}
            strokeWidth="2"
          />
        </svg>
      )
    },
    {
      id: 'search',
      match: (p) => p.startsWith('/trending'),
      to: '/trending',
      labelAr: 'البحث',
      labelEn: 'Search',
      renderIcon: (active) => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.4' : '2'} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" fill={active ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.07)'} />
          <path d="M8.5 8.8A3.5 3.5 0 0 1 11 7.5" strokeWidth="1.6" opacity="0.75" />
          <line x1="16.2" y1="16.2" x2="21" y2="21" strokeWidth="2.4" />
        </svg>
      )
    },
    {
      id: 'schedule',
      match: (p) => p.startsWith('/discover') || p.startsWith('/rankings'),
      to: '/discover',
      labelAr: 'الجدول',
      labelEn: 'Radar',
      renderIcon: (active) => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.9'} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="4.5" width="17" height="16" rx="3.5" fill={active ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.07)'} />
          <line x1="8" y1="2.8" x2="8" y2="6.2" strokeWidth="2.2" />
          <line x1="16" y1="2.8" x2="16" y2="6.2" strokeWidth="2.2" />
          <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
          <circle cx="8.5" cy="13.5" r="1.15" fill="currentColor" stroke="none" />
          <circle cx="12" cy="13.5" r="1.15" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="13.5" r="1.15" fill="currentColor" stroke="none" />
          <circle cx="8.5" cy="17" r="1.15" fill="currentColor" stroke="none" />
          <circle cx="12" cy="17" r="1.15" fill="currentColor" stroke="none" />
        </svg>
      )
    },
    {
      id: 'manga',
      match: (p) => p.startsWith('/browse'),
      to: '/browse',
      labelAr: 'المانجا',
      labelEn: 'Manga',
      renderIcon: (active) => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.9'} strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M2.5 5.5A3.5 3.5 0 0 1 6 4h4.5a2 2 0 0 1 1.5.7A2 2 0 0 1 13.5 4H18a3.5 3.5 0 0 1 3.5 1.5v13A2.5 2.5 0 0 0 18 17h-4.5a1.5 1.5 0 0 0-1.5 1.5A1.5 1.5 0 0 0 10.5 17H6a2.5 2.5 0 0 0-3.5 1.5v-13z"
            fill={active ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.07)'}
          />
          <line x1="12" y1="5" x2="12" y2="18.5" />
          <line x1="6" y1="8.5" x2="9.5" y2="8.5" strokeWidth="1.6" />
          <line x1="6" y1="11.5" x2="9.5" y2="11.5" strokeWidth="1.6" />
          <line x1="14.5" y1="8.5" x2="18" y2="8.5" strokeWidth="1.6" />
          <line x1="14.5" y1="11.5" x2="18" y2="11.5" strokeWidth="1.6" />
        </svg>
      )
    },
    {
      id: 'community',
      match: (p) => p.startsWith('/community'),
      to: '/community',
      labelAr: 'الساحة',
      labelEn: 'Arena',
      renderIcon: (active) => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.9'} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="11.5" r="7.5" fill={active ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.07)'} />
          <path
            d="M12 6.8l1.45 3.25 3.25 1.45-3.25 1.45L12 16.2l-1.45-3.25-3.25-1.45 3.25-1.45L12 6.8z"
            fill="currentColor"
            stroke="none"
          />
          <path d="M7.5 20.5h9" strokeWidth="2.1" />
        </svg>
      )
    },
    {
      id: 'profile',
      match: (p) => p.startsWith('/profile') || p.startsWith('/mylist'),
      to: '/profile',
      labelAr: 'حسابي',
      labelEn: 'Profile',
      renderIcon: (active) => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.9'} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8.2" r="3.6" fill={active ? 'currentColor' : 'rgba(255,255,255,0.12)'} />
          <path
            d="M5 19.5c0-3.4 3.1-5.8 7-5.8s7 2.4 7 5.8"
            fill={active ? 'currentColor' : 'rgba(255,255,255,0.08)'}
          />
        </svg>
      )
    }
  ];

  return (
    <div className="ios-lg-floating-dock-wrap">
      <nav
        className="ios-lg-capsule-track"
        aria-label="iOS Liquid Glass Dock"
        style={{
          padding: '0.45rem 0.6rem',
          gap: '0.45rem'
        }}
      >
        {dockItems.map((item) => {
          const isActive = item.match(path);
          if (isActive) {
            return (
              <button
                key={item.id}
                type="button"
                className="ios-lg-active-pill"
                onClick={() => navigate(item.to)}
                style={{
                  height: '44px',
                  minWidth: '96px',
                  padding: '0 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  justifyContent: 'center',
                  gap: '0.45rem'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                  {item.renderIcon(true)}
                </span>
                <span style={{ whiteSpace: 'nowrap' }}>{lang === 'ar' ? item.labelAr : item.labelEn}</span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              className="ios-lg-orb"
              title={lang === 'ar' ? item.labelAr : item.labelEn}
              onClick={() => {
                if (item.id === 'profile' && !user && typeof onOpenAuth === 'function') {
                  onOpenAuth('login');
                  return;
                }
                navigate(item.to);
              }}
              style={{ width: '42px', height: '42px' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                {item.renderIcon(false)}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname]);
  return null;
}

function Footer() {
  const { t } = useI18n();
  const [footerText, setFooterText] = useState(null);

  useEffect(() => {
    let alive = true;
    const fetchFooter = () => {
      api.get('/api/settings/footer')
        .then((data) => {
          if (alive && data) setFooterText(data);
        })
        .catch(() => {});
    };
    fetchFooter();
    window.addEventListener('site_settings_updated', fetchFooter);
    return () => {
      alive = false;
      window.removeEventListener('site_settings_updated', fetchFooter);
    };
  }, []);

  return (
    <footer className="footer sloth-footer">
      <div className="container sloth-footer__inner">
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.35rem 0.9rem 0.35rem 0.45rem',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.18)',
            marginBottom: '0.75rem'
          }}
        >
          <img
            src="/blackx-logo.png"
            alt="BLACK X"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              objectFit: 'cover',
              border: '1px solid rgba(255,255,255,0.32)'
            }}
          />
          <span style={{ fontWeight: 900, fontSize: '0.96rem', letterSpacing: '0.03em', color: '#ffffff' }}>
            BLACK X <span style={{ fontWeight: 500, opacity: 0.75 }}>original • slothUI Pro 2.0</span>
          </span>
        </div>
        <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#ffffff' }}>
          {footerText?.tagline || t('footer.tagline')}
        </div>
        <div style={{ marginTop: '0.35rem', opacity: 0.68, fontSize: '0.82rem' }}>
          © {new Date().getFullYear()} · {footerText?.notice || t('footer.rights')}
        </div>
      </div>
    </footer>
  );
}

class MobileErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error?.message || String(error) };
  }
  componentDidCatch(error, info) {
    console.error('[MobileApkApp ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#000000',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: '#ffffff',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.6rem',
              marginBottom: '1rem'
            }}
          >
            X
          </div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 900 }}>BLACK X MOBILE 120Hz</h2>
          <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>
            تم اكتشاف خطأ مؤقت في الذاكرة المحلية — اضغط لإعادة تشغيل الواجهة فوراً
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, errorMsg: '' });
              window.location.reload();
            }}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              background: '#ffffff',
              color: '#000000',
              border: 'none',
              fontWeight: 900,
              fontSize: '0.86rem',
              cursor: 'pointer'
            }}
          >
            ⚡ إعادة تحميل التطبيق
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [authModal, setAuthModal] = useState(null); // null | 'login' | 'register'
  const { user } = useAuth();
  const { lang } = useI18n();
  const openAuth = (mode = 'login') => setAuthModal(mode);
  const isApkRuntime =
    isNativeApk() ||
    import.meta.env.VITE_BUILD_TARGET === 'apk' ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('apk_ui') === '1');

  const [splashConfig, setSplashConfig] = useState(() => {
    try {
      const shouldShow = isApkRuntime || sessionStorage.getItem('bx_splash_played') !== '1';
      return {
        active: shouldShow,
        mode: undefined,
        durationMs: 4000,
        subtitleAr: '',
        subtitleEn: ''
      };
    } catch {
      return { active: true, mode: undefined, durationMs: 4000, subtitleAr: '', subtitleEn: '' };
    }
  });

  useEffect(() => {
    const handleReplay = (e) => {
      const detail = e?.detail || {};
      setSplashConfig({
        active: true,
        mode: detail.mode || undefined,
        durationMs: detail.durationMs || 4000,
        subtitleAr: detail.subtitleAr || '',
        subtitleEn: detail.subtitleEn || ''
      });
    };
    window.triggerBlackXMotion = (mode, durationMs = 1500, subtitleAr = '', subtitleEn = '') => {
      setSplashConfig({
        active: true,
        mode: mode || undefined,
        durationMs: Number(durationMs) || 1500,
        subtitleAr: subtitleAr || '',
        subtitleEn: subtitleEn || ''
      });
    };
    window.addEventListener('bx_replay_splash', handleReplay);
    window.addEventListener('bx_trigger_motion', handleReplay);
    return () => {
      window.removeEventListener('bx_replay_splash', handleReplay);
      window.removeEventListener('bx_trigger_motion', handleReplay);
    };
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref') || params.get('invite');
      if (ref) {
        localStorage.setItem('blackx_referral_code', ref.trim());
      }
    } catch {}
  }, []);

  // Global Capture-Phase Image Auto-Healer for Website (Fixes broken covers via AniList HD + /blackx-logo.png)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!window.__bxWebCoverCache) window.__bxWebCoverCache = {};

    const onImgError = (ev) => {
      const img = ev?.target;
      if (!img || img.tagName !== 'IMG') return;
      const curSrc = String(img.getAttribute('src') || '');
      if (curSrc.endsWith('/blackx-logo.png') || img.dataset.bxHealed === 'done') return;

      img.src = '/blackx-logo.png';
      img.dataset.bxHealed = 'pending';

      const rawTitle = String(img.getAttribute('alt') || '')
        .replace(/[^\w\s\u0621-\u064A]/g, ' ')
        .trim();
      if (!rawTitle || rawTitle.length < 2 || rawTitle.toLowerCase() === 'black x') {
        img.dataset.bxHealed = 'done';
        return;
      }

      if (window.__bxWebCoverCache[rawTitle]) {
        img.dataset.bxHealed = 'done';
        img.src = window.__bxWebCoverCache[rawTitle];
        return;
      }

      fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          query: `query($s: String) { Media(search: $s) { coverImage { extraLarge large } } }`,
          variables: { s: rawTitle.split(/\s+/).slice(0, 4).join(' ') }
        })
      })
        .then((r) => r.json())
        .then((d) => {
          const hdUrl = d?.data?.Media?.coverImage?.extraLarge || d?.data?.Media?.coverImage?.large;
          img.dataset.bxHealed = 'done';
          if (hdUrl) {
            window.__bxWebCoverCache[rawTitle] = hdUrl;
            img.src = hdUrl;
          }
        })
        .catch(() => {
          img.dataset.bxHealed = 'done';
        });
    };

    window.addEventListener('error', onImgError, true);
    return () => window.removeEventListener('error', onImgError, true);
  }, []);

  const handleSplashDone = () => {
    try {
      sessionStorage.setItem('bx_splash_played', '1');
    } catch {}
    setSplashConfig((prev) => ({ ...prev, active: false }));
  };

  if (isApkRuntime) {
    return (
      <MobileErrorBoundary>
        {splashConfig.active && (
          <BlackXSplashVortex
            durationMs={splashConfig.durationMs}
            initialMode={splashConfig.mode}
            customSubtitleAr={splashConfig.subtitleAr}
            customSubtitleEn={splashConfig.subtitleEn}
            lang={lang || 'ar'}
            enableSound={true}
            onComplete={handleSplashDone}
          />
        )}
        <MobileApkApp />
      </MobileErrorBoundary>
    );
  }

  return (
    <>
      {splashConfig.active && (
        <BlackXSplashVortex
          durationMs={splashConfig.durationMs}
          initialMode={splashConfig.mode}
          customSubtitleAr={splashConfig.subtitleAr}
          customSubtitleEn={splashConfig.subtitleEn}
          lang={lang || 'ar'}
          enableSound={true}
          onComplete={handleSplashDone}
        />
      )}
      <GooFilter />
      <Backdrop />
      <ScrollToTop />
      <div className="app-shell" style={{ position: 'relative', zIndex: 1, paddingBottom: '88px' }}>
        <main className="main" style={{ paddingTop: '0.85rem' }}>
          <div className="container">
            <Routes>
              <Route path="/" element={<Dashboard onOpenAuth={openAuth} />} />
              <Route path="/discover" element={<AnimeDiscover />} />
              <Route path="/trending" element={<TrendingAnime />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/community" element={<Community onOpenAuth={openAuth} />} />
              <Route path="/rankings" element={<Rankings onOpenAuth={openAuth} />} />
              <Route path="/show/:slug" element={<ShowDetail onOpenAuth={openAuth} />} />
              <Route path="/watch/:slug/:ep" element={<Watch onOpenAuth={openAuth} />} />
              <Route path="/mylist" element={<MyList onOpenAuth={openAuth} />} />
              <Route path="/profile" element={<ProfileDashboard onOpenAuth={openAuth} />} />
              <Route path="/account" element={<Navigate to="/profile" replace />} />
              <Route path="/settings" element={<Navigate to="/profile" replace />} />
              {/* legacy prediction-engine routes → home */}
              <Route path="/arena" element={<Navigate to="/" replace />} />
              <Route path="/leaderboard" element={<Navigate to="/" replace />} />
              <Route path="/watchlist" element={<Navigate to="/mylist" replace />} />
              <Route path="/anime/:id" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
        <Footer />
      </div>
      <IosLiquidGlassFloatingDock onOpenAuth={openAuth} />
      <GlobalVipEnforcementGate user={user} onOpenAuth={openAuth} />
      <Toasts />
      {authModal && <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} />}
    </>
  );
}
