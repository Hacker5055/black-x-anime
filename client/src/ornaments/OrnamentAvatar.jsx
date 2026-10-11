/**
 * ============================================================================
 *  OrnamentAvatar — 3D live frame around any avatar
 * ============================================================================
 *  Layering trick (the part that makes it look like a real object instead of
 *  a sticker): the engine renders a *clipped* avatar disc inside the WebGL
 *  scene, and the CSS frame paints the same image at the same geometry with
 *  the ring band masked out via an SVG clipPath. Result: the glass torus
 *  genuinely refracts the photo (MeshPhysicalMaterial transmission pass) and
 *  the rim highlights pass *in front of* the face — while the DOM <img> stays
 *  selectable / right-clickable for users without WebGL.
 *
 *      <OrnamentAvatar src={u.photoUrl} frameStyle="cyber-neon" size={110}>
 *        <img src={u.photoUrl} />
 *      </OrnamentAvatar>
 * ============================================================================
 */
import React, { useCallback, useMemo, useState } from 'react';
import Ornament3D, { CssFrame } from './Ornament3D.jsx';
import { ORNAMENT_PRESETS } from './core/ornaments.js';

export default function OrnamentAvatar({
  src,
  fallbackLabel = 'X',
  avatarColor = '#22d3ee',
  frameStyle = 'default',
  size = 112,
  interactive = true,
  pointerMode = 'auto',
  enabled = true,
  eager = false,
  quality = 'auto',
  overrides,
  className = '',
  style,
  children,
  onEngine
}) {
  const [engine, setEngine] = useState(null);
  const preset = ORNAMENT_PRESETS[frameStyle];
  const use3d = enabled && frameStyle !== 'default' && frameStyle !== 'none';
  const bandWidth = useMemo(() => Math.max(3, Math.round(size * 0.05)), [size]);

  const handleEngine = useCallback((inst) => {
    setEngine(inst);
    onEngine?.(inst);
  }, [onEngine]);

  /* The DOM disc is always rendered: it IS the avatar when WebGL is missing or
     still booting, and it fades out the moment the engine takes over (so the
     photo never gets painted twice). */
  const disc = children ?? (
    <div
      className="avatar3d__disc"
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        overflow: 'hidden',
        background: avatarColor,
        border: '2px solid rgba(255,255,255,0.2)',
        boxShadow: `0 0 ${Math.round(size * 0.32)}px ${avatarColor}44`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.36),
        fontWeight: 800,
        color: '#fff'
      }}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        (fallbackLabel || 'X').slice(0, 2).toUpperCase()
      )}
    </div>
  );

  if (!use3d || !preset) {
    return (
      <div className={`ornament3d ornament3d--plain ${className}`} style={{ position: 'relative', width: size, height: size, ...style }}>
        {disc}
      </div>
    );
  }

  return (
    <Ornament3D
      ornament={frameStyle}
      mode="frame"
      size={size}
      enabled={enabled}
      interactive={interactive}
      pointerMode={pointerMode}
      eager={eager}
      quality={quality}
      withAvatar
      avatarSrc={src || null}
      avatarLabel={fallbackLabel}
      avatarColor={avatarColor}
      overrides={overrides}
      onEngine={handleEngine}
      className={`ornament-avatar ${engine ? 'has-webgl is-live' : 'no-webgl'} ${className}`}
      style={style}
    >
      {/* CSS overlay: the same image with the ring band cut out, so the band
          reads as a solid object crossing the photo. */}
      <div className="ornament-avatar__overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            overflow: 'hidden',
            WebkitMaskImage: `radial-gradient(circle closest-side, #000 calc(100% - ${bandWidth}px), transparent calc(100% - ${bandWidth}px - 1px))`,
            maskImage: `radial-gradient(circle closest-side, #000 calc(100% - ${bandWidth}px), transparent calc(100% - ${bandWidth}px - 1px))`
          }}
        >
          {disc}
        </div>
      </div>
      {/* the animated CSS frame stays visible until the GL layer takes over,
          and always stays as the no-WebGL / quality:'css' path */}
      <span
        className={`avatar-frame avatar-frame--${frameStyle} avatar-frame--fallback`}
        aria-hidden="true"
      />
    </Ornament3D>
  );
}

export { CssFrame };
