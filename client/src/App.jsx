import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
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
    <footer className="footer">
      <div className="container">
        <div className="footer__logo">BLACK <span className="nav__logo-x">X</span></div>
        <div style={{ fontSize: '0.94rem', fontWeight: 600 }}>
          {footerText?.tagline || t('footer.tagline')}
        </div>
        <div style={{ marginTop: '0.35rem', opacity: 0.75, fontSize: '0.84rem' }}>
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
      <div className="app-shell">
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
      <GlobalVipEnforcementGate user={user} onOpenAuth={openAuth} />
      <Toasts />
      {authModal && <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} />}
    </>
  );
}
