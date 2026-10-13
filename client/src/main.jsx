import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { I18nProvider } from './i18n/I18nProvider.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './styles/app.css';

// Unregister any injected proxy service worker (_service-worker.js on *.ai.studio)
// that intercepts <video> Range requests and breaks video streaming
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  const cleanSw = () => {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        for (const r of regs) {
          if (r.active?.scriptURL?.includes('_service-worker.js') || r.installing?.scriptURL?.includes('_service-worker.js')) {
            r.unregister().catch(() => {});
          }
        }
      })
      .catch(() => {});
  };
  cleanSw();
  window.addEventListener('load', () => setTimeout(cleanSw, 600));
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>
);
