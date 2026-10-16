import React, { useEffect, useState } from 'react';
import BxIcon from './BxIcon.jsx';
import { bxImageProxyUrl, normalizeMangaPageUrl } from './bxServers.js';

/**
 * One reader page. Tries the page URL directly (no Referer, which most image
 * hosts accept), then the website's /api/proxy/image (which sends the source's
 * Referer), then shows an honest "tap to retry" tile. It never substitutes a
 * different image, and `data-bx-no-heal` keeps the global cover healer away.
 */
export default function MangaPageImage({ src, alt, style, onClick, loading = 'lazy', isRtl = true }) {
  const direct = normalizeMangaPageUrl(src);
  const proxy = bxImageProxyUrl(direct);
  const [attempt, setAttempt] = useState(0); // 0 = direct, 1 = website proxy, 2 = failed
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    setAttempt(0);
  }, [direct]);

  if (!direct || attempt >= 2) {
    return (
      <div
        role="button"
        tabIndex={0}
        data-bx-no-heal="1"
        onClick={(e) => {
          e.stopPropagation();
          setAttempt(0);
          setRetryNonce((n) => n + 1);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setAttempt(0);
            setRetryNonce((n) => n + 1);
          }
        }}
        style={{
          width: '100%',
          maxWidth: '100vw',
          minHeight: '220px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
          background: '#0b0b10',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.75)',
          fontSize: '0.8rem',
          fontWeight: 800,
          lineHeight: 1.5,
          textAlign: 'center',
          padding: '1rem',
          cursor: 'pointer'
        }}
      >
        <BxIcon name="retry" style={{ fontSize: '1.4rem' }} />
        <span>
          {isRtl ? `تعذّر تحميل ${alt || 'الصفحة'} — اضغط لإعادة المحاولة` : `${alt || 'This page'} failed to load — tap to retry`}
        </span>
      </div>
    );
  }

  const url = attempt === 0 ? direct : proxy;
  return (
    <img
      key={`${url}#${retryNonce}`}
      src={url}
      alt={alt}
      data-bx-no-heal="1"
      referrerPolicy="no-referrer"
      loading={loading}
      decoding="async"
      onClick={onClick}
      onError={() => setAttempt((a) => (a === 0 && proxy && proxy !== direct ? 1 : 2))}
      style={style}
    />
  );
}
