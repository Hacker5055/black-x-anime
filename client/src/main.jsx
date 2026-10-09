import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { I18nProvider } from './i18n/I18nProvider.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './styles/app.css';

// GH Pages serves the app at /<repo>/ — honor Vite's base as router basename
const BASENAME = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={BASENAME}>
      <I18nProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>
);
