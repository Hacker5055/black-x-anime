/**
 * The website pages (computers and tablets, or anyone who chose "computer version").
 * Phones get the app interface instead: see webUi.js and main.jsx.
 */
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { I18nProvider } from './i18n/I18nProvider.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './styles/app.css';

export default function SiteRoot() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
