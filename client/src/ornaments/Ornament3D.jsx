/**
 * ============================================================================
 *  Ornament3D — React wrapper around the framework-agnostic OrnamentEngine
 * ============================================================================
 *  `client/src/ornaments/core/engine.js` holds every Three.js concern; this
 *  file only owns: lazy mounting, sizing, avatar texture sync, reduced-motion
 *  and the 2D CSS fallback. That keeps the 3D code testable and keeps the app
 *  running even when WebGL is missing (SSR, old phones, data-saver mode…).
 *
 *  <Ornament3D ornament="cyber-neon" size={132}>{avatarNode}</Ornament3D>
 * ============================================================================
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ORNAMENT_PRESETS, resolveOrnamentId, detectQuality, WEBGL_PROBE } from './core/ornaments.js';

/* Lazily import the engine once per document — three.js is ~600 KB raw, so it
   must never land in the initial chunk. */
let enginePromise = null;
export function loadEngine() {
  if (!enginePromise) {
    enginePromise = import('./core/engine.js').catch((err) => {
      enginePromise = null;
      throw err;
    });
  }
  return enginePromise;
}

let webglSupport;
export function hasWebGL() {
  if (webglSupport !== undefined) return webglSupport;
  if (typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    webglSupport = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/* eslint-disable no-new-func */
const probe = () => {
  try {
    // eslint-disable-next-line no-new-func
    return new Function(WEBGL_PROBE)();
  } catch {
    return hasWebGL();
  }
};

/**
 * @param {string}  ornament        preset id ('default' / 'none' → children only)
 * @param {'frame'|'banner'} mode
 * @param {number}  size            square side (frame mode) in CSS px
 * @param {boolean} [enabled]       master switch
 * @param {boolean} [interactive]  pointer gyro / drag / wheel
 * @param {boolean} [eager]         mount even when offscreen (hero, previews)
 * @param {boolean} [withAvatar]    engine draws the clipped avatar disc
 * @param {string}  [avatarSrc]     image for the engine's clipped disc
 * @param {string}  [avatarLabel]   initials fallback
 * @param {string}  [avatarColor]
 * @param {object}  [overrides]     preset patch (sliders from the customizer)
 * @param {'cinematic'|'balanced'|'lite'|'css'|'auto'} [quality]
 * @param {(e:OrnamentEngine|null)=>void} [onEngine]
 */
export default function Ornament3D({
  ornament = 'default',
  mode = 'frame',
  size = 112,
  enabled = true,
  interactive = true,
  eager = false,
  withAvatar = false,
  avatarSrc = null,
  avatarLabel = 'X',
  avatarColor = '#22d3ee',
  overrides,
  quality = 'auto',
  /** 'auto'  = pointer-follow gyro only, never steals clicks (best for feeds)
   *  'block' = also drag-to-spin, wheel wind-up and click burst (preview stages)         */
  pointerMode = 'auto',
  className = '',
  style,
  children,
  onEngine
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [phase, setPhase] = useState('idle'); // idle | mounting | live | off
  const [motion, setMotion] = useState(false);

  const tier = useMemo(() => {
    if (quality !== 'auto') return quality;
    const { tier: t, reduceMotion } = detectQuality();
    return reduceMotion ? 'lite' : t;
  }, [quality]);

  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setMotion(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  /* `resolveOrnamentId` maps ids that only exist as CSS looks elsewhere in the
     app (e.g. 'dragon-flame' → 'royal-flame'), so a preset saved by any screen
     still mounts real geometry here. */
  const resolvedId = resolveOrnamentId(ornament);
  const preset = ORNAMENT_PRESETS[resolvedId || ornament];
  const active = enabled && tier !== 'css' && !!resolvedId;

  /* -------- mount / unmount (visible-driven) -------- */
  useEffect(() => {
    if (!active) return undefined;
    if (!probe()) { setPhase('off'); return undefined; }
    const host = hostRef.current;
    if (!host) return undefined;

    let alive = true;
    let io = null;
    let timer = null;

    const doMount = async () => {
      try {
        const mod = await loadEngine();
        if (!alive) return;
        const inst = await mod.mountOrnament({
          canvas: canvasRef.current,
          container: host,
          mode,
          ornament,
          overrides,
          quality: tier,
          interactive,
          pointerMode: interactive ? (pointerMode === 'block' ? 'block' : 'auto') : 'none',
          reduceMotion: motion,
          clip: withAvatar ? 'over' : 'off',
          avatarSrc: withAvatar ? avatarSrc : null,
          avatarLabel,
          avatarColor,
          ...(overrides || {})
        });
        if (!alive) { inst?.dispose?.(); return; }
        engineRef.current = inst;
        setPhase(inst ? 'live' : 'off');
        onEngine?.(inst || null);
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') console.warn('[Ornament3D]', err?.message || err);
        if (alive) setPhase('off');
      }
    };

    if (eager || typeof IntersectionObserver !== 'function') {
      timer = setTimeout(doMount, 0);
    } else {
      io = new IntersectionObserver((entries) => {
        // lazy first mount AND re-mount after the ornament scrolled away and
        // came back (the cleanup below frees the GL context in the meantime)
        const visible = entries.some((en) => en.isIntersecting);
        if (visible && !engineRef.current && alive) doMount();
      }, { rootMargin: '200px' });
      io.observe(host);
    }

    return () => {
      alive = false;
      io?.disconnect();
      clearTimeout(timer);
      engineRef.current?.dispose();
      engineRef.current = null;
      onEngine?.(null);
      setPhase('idle');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, mode, ornament, tier, eager, withAvatar]);

  /* -------- push option changes to the live instance -------- */
  useEffect(() => {
    const inst = engineRef.current;
    if (!inst) return;
    inst.setOptions({ ...(overrides || {}), tilt: overrides?.tilt, interactive, reduceMotion: motion, autoRotate: !motion && (overrides?.autoRotate !== false) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(overrides || null), motion, interactive, phase]);

  /* -------- avatar texture sync (kept out of the mount effect) -------- */
  useEffect(() => {
    const inst = engineRef.current;
    if (!inst || !withAvatar || phase !== 'live') return;
    inst.setAvatar({ src: avatarSrc, label: avatarLabel, color: avatarColor });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarSrc, avatarLabel, avatarColor, withAvatar, phase]);

  useEffect(() => () => engineRef.current?.dispose(), []);

  const isBanner = mode === 'banner';
  const boxStyle = isBanner
    ? { position: 'relative', width: '100%', height: '100%', ...style }
    : { position: 'relative', width: size, height: size, ...style };

  return (
    <div
      ref={hostRef}
      className={`ornament3d ${isBanner ? 'ornament3d--banner' : 'ornament3d--frame'} ${active && phase === 'live' ? 'is-live' : 'is-idle'} ${className}`}
      style={boxStyle}
      data-ornament={ornament}
      data-quality={tier}
    >
      {active && (
        <canvas
          ref={canvasRef}
          className="ornament3d__canvas"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            pointerEvents: !interactive ? 'none' : pointerMode === 'block' ? 'auto' : 'none'
          }}
          aria-hidden="true"
        />
      )}
      {children}
      {active && withAvatar && phase !== 'live' && preset?.css && (
        <span className={`ornament3d__boot avatar-frame avatar-frame--${ornament}`} aria-hidden="true" />
      )}
    </div>
  );
}

/** 2D CSS frame — the graceful path for `quality:'css'`, no WebGL, or data-saver. */
export function CssFrame({ ornament, children, size = 112, className = '' }) {
  const preset = ORNAMENT_PRESETS[ornament];
  return (
    <div className={`ornament3d ornament3d--css ${className}`} style={{ position: 'relative', width: size, height: size }}>
      {children}
      {preset && preset.id !== 'default' && <span className={`avatar-frame avatar-frame--${ornament}`} aria-hidden="true" />}
    </div>
  );
}

export { ORNAMENT_PRESETS };
