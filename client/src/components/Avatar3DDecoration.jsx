import React, { useState, useRef, useMemo } from 'react';
import { imgFallback } from '../hooks/hooks.js';

/**
 * Avatar3DDecoration
 * Renders an interactive 3D living animated ornament/frame around user avatars.
 * Supports:
 * - 3D Perspective & mouse-tracking gyro tilt
 * - Multi-layer depth (translateZ)
 * - Orbiting 3D particles & runes
 * - Animated 3D crowns, elemental halos, and holographic rings
 */
export default function Avatar3DDecoration({
  photoUrl,
  displayName = 'User',
  username = '',
  frameStyle = 'default',
  avatarColor = '#22d3ee',
  size = 110,
  interactive = true,
  className = '',
  style = {}
}) {
  const containerRef = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, isHovered: false });

  const handleMouseMove = (e) => {
    if (!interactive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    // max tilt ~15 degrees
    const rx = -(y / (rect.height / 2)) * 14;
    const ry = (x / (rect.width / 2)) * 14;
    setTilt({ rx, ry, isHovered: true });
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setTilt({ rx: 0, ry: 0, isHovered: false });
  };

  const initialLetter = useMemo(() => {
    return (displayName?.[0] || username?.[0] || 'A').toUpperCase();
  }, [displayName, username]);

  const activeStyle = frameStyle === 'dragon-flame' ? 'royal-flame' : frameStyle;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`avatar-3d-scene ${className}`}
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        perspective: '900px',
        display: 'inline-block',
        userSelect: 'none',
        ...style
      }}
    >
      <div
        className="avatar-3d-card"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transition: tilt.isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
      >
        {/* Layer 0: Deep Backlight / 3D Shadow Backdrop */}
        <div
          className={`avatar-3d-deep-glow avatar-3d-deep-glow--${activeStyle}`}
          style={{
            position: 'absolute',
            inset: '-10px',
            borderRadius: '50%',
            transform: 'translateZ(-25px)',
            pointerEvents: 'none'
          }}
        />

        {/* Layer 1: Avatar Core Base */}
        <div
          className="avatar-3d-core"
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: avatarColor,
            border: '3px solid rgba(255, 255, 255, 0.3)',
            boxShadow: `0 0 25px ${avatarColor}50, inset 0 0 15px rgba(0,0,0,0.4)`,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `${size * 0.45}px`,
            fontWeight: 800,
            color: '#fff',
            transform: 'translateZ(0px)'
          }}
        >
          {photoUrl ? (
            <img
              onError={imgFallback}
              src={photoUrl}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span>{initialLetter}</span>
          )}
        </div>

        {/* Layer 2: 3D Animated Decorative Ornament Specific Overlays */}
        {activeStyle && activeStyle !== 'default' && (
          <div
            className={`avatar-3d-ornament-layer avatar-3d-ornament--${activeStyle}`}
            style={{
              position: 'absolute',
              inset: '-8px',
              borderRadius: '50%',
              pointerEvents: 'none',
              transformStyle: 'preserve-3d'
            }}
          >
            {/* 3D Floating Crest / Crown (Z: +35px) */}
            {frameStyle === 'imperial-gold' && (
              <div className="ornament-3d-floating-crest ornament-3d-crown">
                <span className="crest-3d-icon" role="img" aria-label="Imperial Crown">👑</span>
                <div className="crest-3d-gem" />
              </div>
            )}

            {frameStyle === 'shadow-monarch' && (
              <div className="ornament-3d-floating-crest ornament-3d-shadow-horns">
                <span className="crest-3d-icon" role="img" aria-label="Shadow Monarch Horns">⚡</span>
                <div className="shadow-3d-mist" />
              </div>
            )}

            {activeStyle === 'royal-flame' && (
              <div className="ornament-3d-floating-crest ornament-3d-flame-crest">
                <span className="crest-3d-icon" role="img" aria-label="Dragon Crest">🔥</span>
                <div className="fire-3d-sparks" />
              </div>
            )}

            {frameStyle === 'cyber-neon' && (
              <div className="ornament-3d-floating-crest ornament-3d-cyber-visor">
                <div className="cyber-3d-badge">CYBER·01</div>
                <div className="cyber-3d-glitch-ring" />
              </div>
            )}

            {frameStyle === 'sakura-blossom' && (
              <div className="ornament-3d-floating-crest ornament-3d-sakura-petal">
                <span className="crest-3d-icon" role="img" aria-label="Sakura">🌸</span>
                <div className="sakura-3d-swirl" />
              </div>
            )}

            {frameStyle === 'prismatic-diamond' && (
              <div className="ornament-3d-floating-crest ornament-3d-diamond-gem">
                <span className="crest-3d-icon" role="img" aria-label="Diamond">💎</span>
                <div className="diamond-3d-shards" />
              </div>
            )}

            {frameStyle === 'celestial-void' && (
              <div className="ornament-3d-floating-crest ornament-3d-celestial-orb">
                <span className="crest-3d-icon" role="img" aria-label="Cosmos">🌌</span>
                <div className="celestial-3d-rings" />
              </div>
            )}

            {frameStyle === 'dragon-ascension' && (
              <div className="ornament-3d-floating-crest ornament-3d-dragon-head">
                <span className="crest-3d-icon" role="img" aria-label="Emerald Dragon">🐉</span>
                <div className="dragon-3d-aura" />
              </div>
            )}

            {/* 3D Tilted Orbiting Rings (Z: +15px) */}
            <div className="ornament-3d-ring ornament-3d-ring--primary" />
            <div className="ornament-3d-ring ornament-3d-ring--secondary" />

            {/* Orbiting 3D Energy Particles (Z: +25px) */}
            <div className="ornament-3d-particle-orbit">
              <span className="particle-3d-orb particle-3d-orb--1" />
              <span className="particle-3d-orb particle-3d-orb--2" />
              <span className="particle-3d-orb particle-3d-orb--3" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
