import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Backdrop, { Toasts } from './components/Backdrop.jsx';
import { AuthModal } from './components/Modals.jsx';
import { GooFilter } from './components/Loading.jsx';
import { useI18n } from './i18n/I18nProvider.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Browse from './pages/Browse.jsx';
import ShowDetail from './pages/ShowDetail.jsx';
import Watch from './pages/Watch.jsx';
import MyList from './pages/MyList.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname]);
  return null;
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__logo">BLACK <span className="nav__logo-x">X</span></div>
        <div>{t('footer.tagline')}</div>
        <div style={{ marginTop: '0.35rem', opacity: 0.75 }}>© {new Date().getFullYear()} · {t('footer.rights')}</div>
      </div>
    </footer>
  );
}

export default function App() {
  const [authModal, setAuthModal] = useState(null); // null | 'login' | 'register'
  const openAuth = (mode = 'login') => setAuthModal(mode);

  return (
    <>
      <GooFilter />
      <Backdrop />
      <ScrollToTop />
      <div className="app-shell">
        <Navbar onOpenAuth={openAuth} />
        <main className="main">
          <div className="container">
            <Routes>
              <Route path="/" element={<Dashboard onOpenAuth={openAuth} />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/show/:slug" element={<ShowDetail onOpenAuth={openAuth} />} />
              <Route path="/watch/:slug/:ep" element={<Watch onOpenAuth={openAuth} />} />
              <Route path="/mylist" element={<MyList onOpenAuth={openAuth} />} />
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
      <Toasts />
      {authModal && <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} />}
    </>
  );
}
