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
 * 1:1 3D Obsidian & Liquid Chrome Wave Ribbon Stage + SVG Optical Refraction Filter
 * Matches the flowing metallic S-curve background behind the glass cards in
 * https://liquidglassdesign.com/gallery/ios-liquid-glass-effect-smart-home-ui
 */
function IosLiquidGlassWaveStage() {
  return (
    <div className="ios-lg-wave-stage" aria-hidden="true">
      <svg className="ios-lg-wave-svg" viewBox="0 0 1600 1200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="ios-liquid-glass-refraction" x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence type="fractalNoise" baseFrequency="0.011 0.017" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="16" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feSpecularLighting in="noise" surfaceScale="3.5" specularConstant="1.15" specularExponent="34" lightingColor="#ffffff" result="spec">
              <fePointLight x="320" y="180" z="260" />
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceAlpha" operator="in" result="specMask" />
            <feMerge>
              <feMergeNode in="displaced" />
              <feMergeNode in="specMask" />
            </feMerge>
          </filter>

          <linearGradient id="iosLgRibbonMain" x1="260" y1="120" x2="1280" y2="1080" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#000000" stopOpacity="0" />
            <stop offset="18%" stopColor="#1e1e24" stopOpacity="0.68" />
            <stop offset="36%" stopColor="#d4d4dc" stopOpacity="0.52" />
            <stop offset="48%" stopColor="#09090c" stopOpacity="0.95" />
            <stop offset="63%" stopColor="#ffffff" stopOpacity="0.62" />
            <stop offset="79%" stopColor="#1c1c22" stopOpacity="0.74" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="iosLgRibbonRim" x1="360" y1="180" x2="1160" y2="1020" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="30%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="52%" stopColor="#27272f" stopOpacity="0.18" />
            <stop offset="72%" stopColor="#ffffff" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <radialGradient id="iosLgCenterChrome" cx="52%" cy="52%" r="42%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="48%" stopColor="#71717a" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="830" cy="600" rx="540" ry="420" fill="url(#iosLgCenterChrome)" />

        {/* Deep 3D Liquid Chrome S-Curve Fold 1 */}
        <path
          d="M360 150 C 640 190, 960 390, 820 590 C 680 790, 510 860, 860 1050 C 1090 1160, 1250 960, 1110 740 C 970 520, 740 420, 880 240 Z"
          fill="url(#iosLgRibbonMain)"
          filter="blur(12px)"
        />

        {/* Razor Specular Chrome Fold 2 (passes right behind the glass cards' bottom-right edges) */}
        <path
          d="M420 220 C 700 280, 910 430, 770 620 C 630 810, 620 940, 940 1030"
          stroke="url(#iosLgRibbonRim)"
          strokeWidth="64"
          strokeLinecap="round"
          filter="blur(8px)"
        />
        <path
          d="M440 240 C 720 300, 920 440, 780 625 C 640 810, 640 935, 955 1020"
          stroke="url(#iosLgRibbonRim)"
          strokeWidth="14"
          strokeLinecap="round"
          filter="blur(1.5px)"
        />
        <path
          d="M520 310 C 780 370, 860 510, 725 690 C 590 870, 730 960, 1020 990"
          stroke="rgba(255,255,255,0.34)"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/**
 * 1:1 Floating Bottom Navigation Dock from iOS Liquid Glass Effect - Smart Home UI
 * Active item is an expanded glowing capsule pill ([ 🏠 Home ]) + 4 circular glass orbs (( 🔍 ) ( 🎛️ ) ( ⊕ ) ( 📄 ))
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
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3L4 9.5V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9.5L12 3z" />
        </svg>
      )
    },
    {
      id: 'search',
      match: (p) => p.startsWith('/trending') || p.startsWith('/discover'),
      to: '/trending',
      labelAr: 'بحث الأنمي',
      labelEn: 'Search',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
      )
    },
    {
      id: 'filters',
      match: (p) => p.startsWith('/rankings') || p.startsWith('/community'),
      to: '/rankings',
      labelAr: 'التصنيفات',
      labelEn: 'Filters',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <circle cx="9" cy="6" r="2" fill="#ffffff" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <circle cx="15" cy="12" r="2" fill="#ffffff" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="10" cy="18" r="2" fill="#ffffff" />
        </svg>
      )
    },
    {
      id: 'add',
      match: (p) => p.startsWith('/profile') || p.startsWith('/mylist'),
      to: '/profile',
      labelAr: 'حسابي',
      labelEn: 'Profile',
      icon: (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="8.5" />
          <line x1="12" y1="8.5" x2="12" y2="15.5" />
          <line x1="8.5" y1="12" x2="15.5" y2="12" />
        </svg>
      )
    },
    {
      id: 'manga',
      match: (p) => p.startsWith('/browse'),
      to: '/browse',
      labelAr: 'المانهوا والمانجا',
      labelEn: 'Manga',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="5" y="3.5" width="14" height="17" rx="3" />
          <line x1="8.5" y1="8.5" x2="15.5" y2="8.5" />
          <line x1="8.5" y1="12" x2="15.5" y2="12" />
          <line x1="8.5" y1="15.5" x2="12.5" y2="15.5" />
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
          padding: '0.52rem 0.68rem',
          gap: '0.55rem'
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
                  padding: '0.62rem 1.25rem',
                  fontSize: '0.86rem'
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    filter: 'drop-shadow(0 0 10px #ffffff) drop-shadow(0 0 18px rgba(255,255,255,0.85))'
                  }}
                >
                  {item.icon}
                </span>
                <span>{lang === 'ar' ? item.labelAr : item.labelEn}</span>
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
                if (item.id === 'add' && !user && typeof onOpenAuth === 'function') {
                  onOpenAuth('login');
                  return;
                }
                navigate(item.to);
              }}
              style={{ width: '44px', height: '44px' }}
            >
              {item.icon}
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
        <IosLiquidGlassWaveStage />
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
      <IosLiquidGlassWaveStage />
      <Backdrop />
      <ScrollToTop />
      <div className="app-shell" style={{ position: 'relative', zIndex: 1, paddingBottom: '88px' }}>
        <Navbar onOpenAuth={openAuth} />
        <main className="main">
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
