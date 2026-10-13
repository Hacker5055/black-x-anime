import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * BLACK X — 120Hz Shadow Vortex Motion Graphics Splash Screen (بوابة الظلال والجزيئات)
 * Pure Monochrome (#000000 & #FFFFFF) · 4.0s Cinematic Timeline · Web Audio API Procedural SFX
 */
export default function BlackXSplashVortex({
  durationMs = 4000,
  onComplete,
  lang = 'ar',
  enableSound = true
}) {
  const canvasRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0); // 0: vortex, 1: implosion/slash, 2: logo lock, 3: exit portal
  const [exiting, setExiting] = useState(false);
  const [measuredHz, setMeasuredHz] = useState(120);
  const [soundMuted, setSoundMuted] = useState(!enableSound);
  const audioCtxRef = useRef(null);
  const soundPlayedRef = useRef(false);
  const impactPlayedRef = useRef(false);
  const completedRef = useRef(false);

  const isRtl = lang === 'ar';

  // Procedural Web Audio API Cinematic Sound Engine (Dark Vortex -> Implosion -> Crystal Impact)
  const triggerVortexAudio = useCallback(() => {
    if (soundMuted || soundPlayedRef.current) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioCtxRef.current || new AudioCtx();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      soundPlayedRef.current = true;

      const now = ctx.currentTime;

      // 1. Deep Sub-Bass Vortex Drone (0.0s -> 2.0s)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(36, now);
      subOsc.frequency.exponentialRampToValueAtTime(92, now + 1.8);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + 2.4);

      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.28, now + 0.45);
      subGain.gain.linearRampToValueAtTime(0.36, now + 1.75);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 3.6);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 3.65);

      // 2. Swirling Dark Wind Noise Whoosh (Filtered White Noise)
      const bufferSize = ctx.sampleRate * 3.5;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(140, now);
      bandpass.frequency.exponentialRampToValueAtTime(1400, now + 1.8);
      bandpass.frequency.exponentialRampToValueAtTime(220, now + 3.4);
      bandpass.Q.setValueAtTime(3.2, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.linearRampToValueAtTime(0.14, now + 0.8);
      noiseGain.gain.linearRampToValueAtTime(0.24, now + 1.8);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);

      whiteNoise.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      whiteNoise.start(now);
      whiteNoise.stop(now + 3.5);
    } catch (_) {}
  }, [soundMuted]);

  const triggerImpactBoom = useCallback(() => {
    if (soundMuted || impactPlayedRef.current) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioCtxRef.current || new AudioCtx();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      impactPlayedRef.current = true;

      const now = ctx.currentTime;

      // Cinematic Impact Boom + Harmonic Shimmer Chord
      const impactOsc = ctx.createOscillator();
      const impactGain = ctx.createGain();
      impactOsc.type = 'triangle';
      impactOsc.frequency.setValueAtTime(150, now);
      impactOsc.frequency.exponentialRampToValueAtTime(28, now + 1.2);

      impactGain.gain.setValueAtTime(0.42, now);
      impactGain.gain.exponentialRampToValueAtTime(0.001, now + 1.35);

      impactOsc.connect(impactGain);
      impactGain.connect(ctx.destination);
      impactOsc.start(now);
      impactOsc.stop(now + 1.4);

      // Metallic Crystalline Harmonics (Monochrome Sci-Fi/Anime Chime)
      [528, 792, 1056].forEach((freq, idx) => {
        const chime = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(freq, now);
        chime.frequency.exponentialRampToValueAtTime(freq * 0.995, now + 1.6);

        chimeGain.gain.setValueAtTime(0.08 / (idx + 1), now);
        chimeGain.gain.exponentialRampToValueAtTime(0.0008, now + 1.6);

        chime.connect(chimeGain);
        chimeGain.connect(ctx.destination);
        chime.start(now);
        chime.stop(now + 1.65);
      });
    } catch (_) {}
  }, [soundMuted]);

  const finishSplash = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setExiting(true);
    setTimeout(() => {
      try {
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close().catch(() => {});
        }
      } catch (_) {}
      onComplete?.();
    }, 340);
  }, [onComplete]);

  useEffect(() => {
    triggerVortexAudio();
    const unlockAudio = () => {
      if (!soundPlayedRef.current) triggerVortexAudio();
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [triggerVortexAudio]);

  // 120Hz High-Precision Canvas Vortex & Particle Singularity Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Create 380 Vortex Particles in 3D Cylindrical Spiral Coordinates
    const PARTICLE_COUNT = 380;
    const maxRadius = Math.hypot(width, height) * 0.68;
    const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const arm = i % 4; // 4 spiral arms forming the X-vortex symmetry
      const baseAngle = (arm * Math.PI) / 2 + Math.random() * 0.9;
      const distRatio = Math.pow(Math.random(), 0.72);
      return {
        angle: baseAngle + distRatio * Math.PI * 3.2,
        radius: 18 + distRatio * maxRadius,
        initialRadius: 18 + distRatio * maxRadius,
        z: Math.random() * 2 - 1,
        speed: 1.4 + (1 - distRatio) * 3.8 + Math.random() * 0.8,
        size: 1.0 + Math.random() * 2.4,
        alpha: 0.25 + Math.random() * 0.75,
        trailLen: 0.06 + Math.random() * 0.14,
        burstVx: (Math.random() - 0.5) * 2,
        burstVy: (Math.random() - 0.5) * 2
      };
    });

    // Shockwave rings triggered at t = 1.8s (Implosion climax)
    const shockwaves = [
      { radius: 0, maxR: Math.max(width, height) * 0.75, speed: 950, width: 3.5, alpha: 0.95, delay: 0 },
      { radius: 0, maxR: Math.max(width, height) * 0.55, speed: 640, width: 1.8, alpha: 0.65, delay: 0.12 },
      { radius: 0, maxR: Math.max(width, height) * 0.4, speed: 420, width: 1.0, alpha: 0.45, delay: 0.24 }
    ];

    const startTime = performance.now();
    let lastFrameTime = startTime;
    let frameCounter = 0;
    let fpsTimer = startTime;
    let rafId;

    const render = (now) => {
      const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
      lastFrameTime = now;

      // Measure real display Hz (60 / 90 / 120 / 144Hz)
      frameCounter++;
      if (now - fpsTimer >= 450) {
        const currentFps = Math.round((frameCounter * 1000) / (now - fpsTimer));
        setMeasuredHz(currentFps >= 105 ? 120 : currentFps >= 80 ? 90 : 120);
        frameCounter = 0;
        fpsTimer = now;
      }

      const elapsed = now - startTime;
      const tNorm = Math.min(elapsed / durationMs, 1);
      const tSec = elapsed / 1000;

      setProgress(Math.round(tNorm * 100));

      // Timeline Phase Updates
      if (tSec < 1.35) {
        setPhase(0);
      } else if (tSec < 1.95) {
        setPhase(1);
      } else if (tSec < 3.45) {
        setPhase(2);
        if (!impactPlayedRef.current) triggerImpactBoom();
      } else {
        setPhase(3);
      }

      const cx = width / 2;
      const cy = height / 2 - 18;

      // Motion-blur pitch-black clear
      ctx.fillStyle = tSec < 1.8 ? 'rgba(0, 0, 0, 0.28)' : 'rgba(0, 0, 0, 0.36)';
      ctx.fillRect(0, 0, width, height);

      // Subtle radial core luminance (Monochrome white/silver only)
      const coreIntensity =
        tSec < 1.8
          ? Math.min(0.22, (tSec / 1.8) * 0.22)
          : tSec < 2.15
          ? 0.55 - ((tSec - 1.8) / 0.35) * 0.35
          : 0.18;
      const coreRadius =
        tSec < 1.8
          ? 70 + (1 - tSec / 1.8) * 140
          : tSec < 2.2
          ? 240
          : 170 + Math.sin(tSec * 5) * 12;

      const radialGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
      radialGrad.addColorStop(0, `rgba(255, 255, 255, ${coreIntensity})`);
      radialGrad.addColorStop(0.45, `rgba(255, 255, 255, ${coreIntensity * 0.28})`);
      radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = radialGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // Rotating Dimensional Vortex Rings (Sacred Monochrome Geometry)
      ctx.save();
      ctx.translate(cx, cy);
      const ringCount = 3;
      for (let r = 0; r < ringCount; r++) {
        const ringBaseR = 64 + r * 38;
        const squeeze =
          tSec < 1.8
            ? 1 - Math.pow(tSec / 1.8, 2.2) * 0.68
            : Math.min(1.08, 0.32 + (tSec - 1.8) * 1.4);
        const currentR = ringBaseR * squeeze;
        const rot = tSec * (r % 2 === 0 ? 2.4 : -3.1) * (1 + r * 0.35);

        ctx.save();
        ctx.rotate(rot);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.14 - r * 0.03})`;
        ctx.lineWidth = 1.1;
        ctx.setLineDash([14 + r * 8, 10 + r * 6]);
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(4, currentR), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // Update & Draw 380 Spiraling Vortex Particles
      ctx.lineCap = 'round';
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];

        if (tSec < 1.8) {
          // Spiraling inward into the Shadow Singularity
          const pullFactor = 1 + Math.pow(tSec / 1.8, 2.4) * 5.2;
          p.angle += p.speed * pullFactor * dt;
          const targetCollapse = Math.max(2, p.initialRadius * (1 - Math.pow(tSec / 1.8, 1.85)));
          p.radius = targetCollapse;

          const x1 = cx + Math.cos(p.angle) * p.radius;
          const y1 = cy + Math.sin(p.angle) * p.radius;
          const prevAngle = p.angle - p.trailLen * pullFactor * 0.45;
          const prevRadius = p.radius + 8 * (tSec / 1.8);
          const x0 = cx + Math.cos(prevAngle) * prevRadius;
          const y0 = cy + Math.sin(prevAngle) * prevRadius;

          ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, p.alpha * (0.4 + (tSec / 1.8) * 0.7))})`;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        } else {
          // Post-implosion: Crisp orbital halo + X-diagonal energy filaments
          const postT = tSec - 1.8;
          p.angle += p.speed * 0.45 * dt;
          const expansionR = 46 + (p.initialRadius * 0.62) * Math.min(1, Math.pow(postT / 0.55, 0.58));
          p.radius = expansionR + Math.sin(tSec * 3 + i) * 4;

          const x = cx + Math.cos(p.angle) * p.radius;
          const y = cy + Math.sin(p.angle) * p.radius;

          const fadeOut = tSec > 3.4 ? Math.max(0, 1 - (tSec - 3.4) / 0.6) : 1;
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.68 * fadeOut})`;
          ctx.beginPath();
          ctx.arc(x, y, p.size * 0.75, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // At t >= 1.8s: Render Expanding Monochrome Shockwaves & X-Blade Light Streaks
      if (tSec >= 1.8) {
        const postT = tSec - 1.8;

        // Expanding Shockwave Rings
        for (const sw of shockwaves) {
          const swTime = postT - sw.delay;
          if (swTime > 0) {
            const r = Math.min(sw.maxR, swTime * sw.speed);
            const prog = r / sw.maxR;
            const alpha = Math.max(0, sw.alpha * (1 - Math.pow(prog, 0.85)));
            if (alpha > 0.01) {
              ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
              ctx.lineWidth = sw.width * (1 - prog * 0.5);
              ctx.beginPath();
              ctx.arc(cx, cy, r, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }

        // Diagonal X-Slash Light Beams across the Vortex Core
        const slashAlpha = postT < 0.35 ? 1 - postT / 0.35 : Math.max(0, 0.22 - (postT - 0.35) * 0.12);
        if (slashAlpha > 0.01) {
          const slashLen = Math.min(Math.max(width, height) * 0.55, postT * 2600);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.strokeStyle = `rgba(255, 255, 255, ${slashAlpha})`;
          ctx.lineWidth = postT < 0.18 ? 4.5 : 2.0;
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 24;

          // Blade 1 (\)
          ctx.beginPath();
          ctx.moveTo(-slashLen * 0.7, -slashLen * 0.7);
          ctx.lineTo(slashLen * 0.7, slashLen * 0.7);
          ctx.stroke();

          // Blade 2 (/)
          ctx.beginPath();
          ctx.moveTo(slashLen * 0.7, -slashLen * 0.7);
          ctx.lineTo(-slashLen * 0.7, slashLen * 0.7);
          ctx.stroke();
          ctx.restore();
        }
      }

      if (elapsed >= durationMs) {
        finishSplash();
        return;
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [durationMs, finishSplash, triggerImpactBoom]);

  const logoVisible = phase >= 1;
  const textVisible = phase >= 2;
  const portalZoom = phase === 3 || exiting;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#000000',
        color: '#ffffff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        opacity: exiting ? 0 : 1,
        transform: portalZoom ? 'scale(1.45)' : 'scale(1)',
        transition: 'opacity 0.36s cubic-bezier(0.16, 1, 0.3, 1), transform 0.52s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* 120Hz Vortex Particle Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />

      {/* Top HUD Telemetry Bar (120Hz Engine + Sound Toggle + Instant Skip) */}
      <div
        style={{
          position: 'absolute',
          top: 'max(1rem, env(safe-area-inset-top, 1rem))',
          left: '1.1rem',
          right: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 5
        }}
      >
        {/* 120Hz Telemetry Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.32rem 0.75rem',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            fontSize: '0.68rem',
            fontWeight: 900,
            letterSpacing: '0.08em',
            fontFamily: 'monospace'
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#ffffff',
              boxShadow: '0 0 10px #ffffff'
            }}
          />
          <span>{measuredHz}Hz VORTEX ENGINE</span>
        </div>

        {/* Sound & Skip Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => {
              const nextMuted = !soundMuted;
              setSoundMuted(nextMuted);
              if (!nextMuted) {
                triggerVortexAudio();
              }
            }}
            style={{
              padding: '0.34rem 0.65rem',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.22)',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            {soundMuted ? '🔇' : '🔊'}
          </button>

          <button
            type="button"
            onClick={finishSplash}
            style={{
              padding: '0.34rem 0.85rem',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.28)',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 900,
              cursor: 'pointer',
              letterSpacing: '0.04em'
            }}
          >
            {isRtl ? 'تخطي ⏭' : 'SKIP ⏭'}
          </button>
        </div>
      </div>

      {/* Central Vector Emblem & Kinetic Typography */}
      <div
        style={{
          position: 'relative',
          zIndex: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 1.5rem',
          pointerEvents: 'none'
        }}
      >
        {/* 3D Precision Vector X Monolith Emblem */}
        <div
          style={{
            position: 'relative',
            width: '116px',
            height: '116px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.35rem',
            transform: logoVisible ? 'scale(1) rotate(0deg)' : 'scale(0.18) rotate(-135deg)',
            opacity: logoVisible ? 1 : 0,
            transition:
              'transform 0.68s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.38s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Outer Rotating Diamond Frame */}
          <svg
            viewBox="0 0 140 140"
            style={{
              position: 'absolute',
              inset: '-12px',
              width: '140px',
              height: '140px',
              overflow: 'visible',
              filter: 'drop-shadow(0 0 22px rgba(255,255,255,0.55))'
            }}
          >
            {/* Outer Precision Octagon / Vortex Shield */}
            <polygon
              points="70,4 120,20 136,70 120,120 70,136 20,120 4,70 20,20"
              fill="rgba(0,0,0,0.82)"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeDasharray={textVisible ? '420' : '90 30'}
              style={{
                transition: 'stroke-dasharray 0.7s ease'
              }}
            />
            {/* Inner Geometric Ring */}
            <circle
              cx="70"
              cy="70"
              r="54"
              fill="none"
              stroke="rgba(255,255,255,0.32)"
              strokeWidth="1"
              strokeDasharray="6 6"
            />
            {/* Iconic Razor-Sharp BLACK X Vector Blades */}
            <path
              d="M34 28 L52 28 L70 55 L88 28 L106 28 L80 70 L108 112 L90 112 L70 83 L50 112 L32 112 L60 70 Z"
              fill="#ffffff"
            />
            {/* Center Core Cutout Line */}
            <circle cx="70" cy="70" r="3.2" fill="#000000" />
          </svg>
        </div>

        {/* Kinetic Brand Title: BLACK X */}
        <div
          style={{
            opacity: textVisible ? 1 : 0,
            transform: textVisible ? 'translateY(0) scale(1)' : 'translateY(18px) scale(0.92)',
            transition: 'all 0.55s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div
            style={{
              fontSize: 'clamp(2.1rem, 7vw, 3.1rem)',
              fontWeight: 900,
              letterSpacing: textVisible ? '0.26em' : '0.65em',
              paddingLeft: textVisible ? '0.26em' : '0.65em',
              color: '#ffffff',
              textShadow: '0 0 28px rgba(255,255,255,0.65)',
              lineHeight: 1.05,
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
              transition: 'letter-spacing 0.75s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            BLACK X
          </div>

          {/* Bilingual Cinematic Subtitle */}
          <div
            style={{
              marginTop: '0.6rem',
              fontSize: '0.84rem',
              fontWeight: 800,
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: '0.06em'
            }}
          >
            {isRtl
              ? 'بوابة الأنمي والمانهوا · سرعة 120Hz الفائقة'
              : 'UNLIMITED ANIME & MANHWA · 120Hz ENGINE'}
          </div>

          <div
            style={{
              marginTop: '0.32rem',
              fontSize: '0.66rem',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.48)',
              letterSpacing: '0.22em',
              fontFamily: 'monospace'
            }}
          >
            SHADOW VORTEX · MONOCHROME EDITION
          </div>
        </div>
      </div>

      {/* Bottom Cinematic Loader Bar & Phase Status */}
      <div
        style={{
          position: 'absolute',
          bottom: 'max(1.8rem, env(safe-area-inset-bottom, 1.8rem))',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(320px, 82vw)',
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.68rem',
            fontWeight: 800,
            color: 'rgba(255,255,255,0.72)',
            fontFamily: 'monospace'
          }}
        >
          <span>
            {phase === 0
              ? isRtl
                ? '⚡ فتح بوابة الظلال...'
                : '⚡ OPENING SHADOW VORTEX...'
              : phase === 1
              ? isRtl
                ? '⚔️ تجميع طاقة السيرفرات...'
                : '⚔️ CONVERGING CORE...'
              : isRtl
              ? '👑 جاهز للانطلاق بسرعة 120Hz'
              : '👑 120Hz ENGINE LOCKED'}
          </span>
          <span>{progress}%</span>
        </div>

        {/* Ultra-Sleek Monochrome Progress Track */}
        <div
          style={{
            width: '100%',
            height: '3px',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.14)',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: '#ffffff',
              boxShadow: '0 0 14px #ffffff',
              transition: 'width 0.06s linear'
            }}
          />
        </div>
      </div>
    </div>
  );
}
