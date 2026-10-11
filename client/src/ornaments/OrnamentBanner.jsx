/**
 * ============================================================================
 *  OrnamentBanner — live 3D profile header
 * ============================================================================
 *  Three sources, in priority order (progressive enhancement):
 *    1. `style`  → a procedurally generated WebGL banner (skyline / rift /
 *                  ember variants) with pointer parallax + bloom.
 *    2. `src`    → an AI-generated (or uploaded) image; it is fed to the
 *                  engine as the plane texture so it still gets the curved
 *                  geometry, rim rails and bloom, and it stays a real image
 *                  for no-WebGL users.
 *    3. gradient → brand fallback, identical to the previous CSS banner.
 *
 *  Text legibility rule: the engine bakes a 94% black bottom fade into the
 *  texture, and `.profile-banner__overlay` doubles it in CSS — so usernames
 *  placed over any banner keep ≥ 4.5:1 contrast.
 * ============================================================================
 */
import React from 'react';
import Ornament3D from './Ornament3D.jsx';
import { BANNER_PRESETS } from './core/ornaments.js';

export default function OrnamentBanner({
  bannerStyle = 'off',
  src = null,
  size = 210,
  interactive = true,
  enabled = true,
  eager = false,
  quality = 'auto',
  overrides,
  className = '',
  children,
  onEngine
}) {
  const preset = BANNER_PRESETS[bannerStyle];
  const use3d = enabled && bannerStyle && bannerStyle !== 'off' && (preset || !!src);

  return (
    <div className={`profile-banner ${use3d ? 'profile-banner--3d' : ''} ${className}`} style={{ height: size }}>
      {use3d ? (
        <Ornament3D
          mode="banner"
          ornament={preset ? bannerStyle : 'neon-tokyo'}
          enabled={enabled}
          interactive={interactive}
          eager={eager}
          quality={quality}
          overrides={{ ...(preset?.plane ? { imageOverride: src || undefined } : { imageOverride: src || undefined }), ...(overrides || {}) }}
          onEngine={onEngine}
          style={{ position: 'absolute', inset: 0 }}
        />
      ) : (
        src ? (
          <img onError={(e) => { e.currentTarget.style.display = 'none'; }} src={src} alt="" className="profile-banner__img" loading="lazy" decoding="async" />
        ) : (
          <div className="profile-banner__fallback" />
        )
      )}

      <div className="profile-banner__overlay" />
      {children}
      {!use3d && src && preset && (
        <span className="profile-banner__badge" aria-hidden="true">3D · {preset.icon}</span>
      )}
    </div>
  );
}

export const AVATAR_GRADIENT = 'linear-gradient(135deg, #090d16 0%, #1e1b4b 60%, #06070d 100%)';
