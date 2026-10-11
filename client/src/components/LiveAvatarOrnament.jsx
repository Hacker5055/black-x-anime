import React, { useEffect, useRef } from 'react';

/**
 * Maps any BLACK X frameStyle or bannerStyle id to its living creature archetype & palette.
 */
export function resolveCreatureTheme(styleId = 'dragon') {
  const id = String(styleId || '').toLowerCase();
  if (!id || id === 'default' || id === 'none' || id === 'off') return null;

  if (id.includes('shadow')) {
    return {
      kind: 'shadow',
      primary: '#a855f7',
      secondary: '#38bdf8',
      core: '#0f0720'
    };
  }
  if (id.includes('cyber') || id.includes('neo-tokyo')) {
    return {
      kind: 'cyber',
      primary: '#00f2fe',
      secondary: '#ff007f',
      core: '#082f49'
    };
  }
  if (id.includes('ascension')) {
    return {
      kind: 'dragon',
      primary: '#10b981',
      secondary: '#6ee7b7',
      core: '#064e3b',
      scheme: 'emerald'
    };
  }
  if (id.includes('imperial') || id.includes('gold')) {
    return {
      kind: 'dragon',
      primary: '#eab308',
      secondary: '#fef08a',
      core: '#713f12',
      scheme: 'gold'
    };
  }
  if (id.includes('sakura')) {
    return {
      kind: 'dragon',
      primary: '#f472b6',
      secondary: '#fbcfe8',
      core: '#831843',
      scheme: 'sakura'
    };
  }
  if (id.includes('diamond') || id.includes('celestial') || id.includes('thunder')) {
    return {
      kind: 'dragon',
      primary: '#38bdf8',
      secondary: '#c084fc',
      core: '#0c4a6e',
      scheme: 'thunder',
      isThunder: true
    };
  }
  // Default for 'royal-flame', 'dragon-flame', 'dragon', etc.
  return {
    kind: 'dragon',
    primary: '#ef4444',
    secondary: '#fde047',
    core: '#450a0a',
    scheme: 'fire'
  };
}

/**
 * LiveCreatureOverlay — renders an actual articulated living creature
 * (Dragon that slithers & breathes fire, Shadow Monarch that slashes,
 * Cyberpunk Mecha-Drone that scans with laser, Thunder Serpent that strikes lightning)
 * around any circular avatar or across any profile banner.
 */
export function LiveCreatureOverlay({
  ornament = 'royal-flame',
  mode = 'frame',
  size = 112,
  style = {}
}) {
  const canvasRef = useRef(null);
  const forcedAttackRef = useRef(0);
  const theme = resolveCreatureTheme(ornament);

  useEffect(() => {
    if (!theme) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let rafId = null;
    const startTime = performance.now();
    const fireParticles = [];
    let headAngle = -Math.PI * 0.35;

    // Listen for global "trigger creature attack" custom event from Profile page button
    const onTriggerAttack = () => {
      forcedAttackRef.current = performance.now() + 3600;
    };
    window.addEventListener('blackx:trigger-creature-attack', onTriggerAttack);

    function spawnFireBreath(hx, hy, aimAngle, W, scheme) {
      for (let i = 0; i < 6; i++) {
        const spread = (Math.random() - 0.5) * 0.48;
        const speed = (W * 0.0085) * (0.7 + Math.random() * 0.65);
        const a = aimAngle + spread;
        fireParticles.push({
          x: hx,
          y: hy,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: 1.0,
          decay: 0.017 + Math.random() * 0.014,
          size: (W * 0.024) * (0.7 + Math.random() * 0.7),
          scheme
        });
      }
    }

    function renderFrameMode(t, now) {
      const W = canvas.width;
      const H = canvas.height;
      const CX = W / 2;
      const CY = H / 2;
      const R = W * 0.27;

      ctx.clearRect(0, 0, W, H);

      const cycle = t % 5.8;
      const isAttacking = now < forcedAttackRef.current || cycle > 3.0;

      // Update & draw volumetric fire/plasma/shadow particles wrapping around the avatar
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = fireParticles.length - 1; i >= 0; i--) {
        const p = fireParticles[i];
        const toCenterA = Math.atan2(p.y - CY, p.x - CX);
        const tangentA = toCenterA + Math.PI / 2;
        p.vx = p.vx * 0.92 + Math.cos(tangentA) * (W * 0.0055);
        p.vy = p.vy * 0.92 + Math.sin(tangentA) * (W * 0.0055);
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) {
          fireParticles.splice(i, 1);
          continue;
        }
        const rad = p.size * (1.8 - p.life * 0.7);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        if (p.scheme === 'shadow') {
          g.addColorStop(0, `rgba(255,255,255,${p.life})`);
          g.addColorStop(0.4, `rgba(168,85,247,${p.life * 0.88})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
        } else if (p.scheme === 'cyber' || p.scheme === 'thunder') {
          g.addColorStop(0, `rgba(255,255,255,${p.life})`);
          g.addColorStop(0.4, `rgba(0,242,254,${p.life * 0.88})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
        } else if (p.scheme === 'emerald') {
          g.addColorStop(0, `rgba(255,255,255,${p.life})`);
          g.addColorStop(0.35, `rgba(110,231,183,${p.life * 0.9})`);
          g.addColorStop(0.7, `rgba(16,185,129,${p.life * 0.75})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
        } else if (p.scheme === 'sakura') {
          g.addColorStop(0, `rgba(255,255,255,${p.life})`);
          g.addColorStop(0.4, `rgba(244,114,182,${p.life * 0.9})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
        } else {
          g.addColorStop(0, `rgba(255,255,240,${p.life})`);
          g.addColorStop(0.3, `rgba(253,224,71,${p.life * 0.94})`);
          g.addColorStop(0.65, `rgba(255,69,0,${p.life * 0.78})`);
          g.addColorStop(1, 'rgba(127,29,29,0)');
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (theme.kind === 'dragon') {
        const speed = isAttacking ? 0.22 : 1.35;
        headAngle += speed * 0.016;
        const SEGMENTS = 32;
        const spine = [];
        for (let i = 0; i < SEGMENTS; i++) {
          const lag = i * 0.115;
          const a = headAngle - lag;
          const wave = Math.sin(t * 7 - i * 0.55) * (W * 0.018) * (1 - i / (SEGMENTS * 1.3));
          const rad = R + wave;
          spine.push({
            x: CX + Math.cos(a) * rad,
            y: CY + Math.sin(a) * rad,
            a: a + Math.PI / 2
          });
        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Dragon Claws / Legs
        [8, 20].forEach((sIdx) => {
          const seg = spine[sIdx];
          if (!seg) return;
          const legAngle = seg.a + 0.7 + Math.sin(t * 5 + sIdx) * 0.25;
          const kneeX = seg.x + Math.cos(legAngle) * (W * 0.042);
          const kneeY = seg.y + Math.sin(legAngle) * (W * 0.042);
          ctx.strokeStyle = theme.primary;
          ctx.lineWidth = Math.max(1.5, W * 0.01);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(seg.x, seg.y);
          ctx.lineTo(kneeX, kneeY);
          ctx.stroke();
        });

        // Dragon Body Scales & Dorsal Spines
        for (let i = SEGMENTS - 1; i >= 1; i--) {
          const p = spine[i];
          const pPrev = spine[i - 1];
          const dir = Math.atan2(pPrev.y - p.y, pPrev.x - p.x);
          const taper = Math.sin((1 - i / SEGMENTS) * Math.PI * 0.85);
          const radius = (W * 0.032) * Math.max(0.18, taper);

          const finLen = radius * 1.6;
          const nx = Math.cos(dir - Math.PI / 2);
          const ny = Math.sin(dir - Math.PI / 2);
          ctx.fillStyle = i % 2 === 0 ? theme.secondary : theme.primary;
          ctx.beginPath();
          ctx.moveTo(p.x + nx * radius * 0.5, p.y + ny * radius * 0.5);
          ctx.lineTo(
            p.x + nx * (radius + finLen) - Math.cos(dir) * radius * 0.65,
            p.y + ny * (radius + finLen) - Math.sin(dir) * radius * 0.65
          );
          ctx.lineTo(p.x - Math.cos(dir) * radius * 0.5, p.y - Math.sin(dir) * radius * 0.5);
          ctx.closePath();
          ctx.fill();

          const grad = ctx.createRadialGradient(p.x, p.y, radius * 0.1, p.x, p.y, radius);
          grad.addColorStop(0, theme.secondary);
          grad.addColorStop(0.55, theme.primary);
          grad.addColorStop(1, theme.core);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Articulated Dragon Head with Opening Jaw
        const head = spine[0];
        const neck = spine[1];
        const headDir = Math.atan2(head.y - neck.y, head.x - neck.x);
        const hs = W * 0.046;
        const jawOpen = isAttacking ? 0.52 + Math.sin(t * 26) * 0.08 : 0.08;

        ctx.save();
        ctx.translate(head.x, head.y);
        ctx.rotate(headDir);

        // Horns
        ctx.strokeStyle = theme.secondary;
        ctx.lineWidth = Math.max(1.5, W * 0.0085);
        [-1, 1].forEach((side) => {
          ctx.beginPath();
          ctx.moveTo(-hs * 0.2, side * hs * 0.45);
          ctx.quadraticCurveTo(-hs * 1.1, side * hs * 1.15, -hs * 1.6, side * hs * 0.85);
          ctx.stroke();
        });

        // Lower Jaw
        ctx.save();
        ctx.rotate(jawOpen);
        ctx.fillStyle = theme.core;
        ctx.beginPath();
        ctx.moveTo(0, hs * 0.15);
        ctx.lineTo(hs * 1.2, hs * 0.36);
        ctx.lineTo(hs * 0.9, hs * 0.62);
        ctx.lineTo(-hs * 0.2, hs * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Upper Snout
        ctx.save();
        ctx.rotate(-jawOpen * 0.5);
        ctx.fillStyle = theme.primary;
        ctx.beginPath();
        ctx.moveTo(-hs * 0.5, 0);
        ctx.lineTo(-hs * 0.15, -hs * 0.7);
        ctx.lineTo(hs * 1.35, -hs * 0.25);
        ctx.lineTo(hs * 1.4, hs * 0.12);
        ctx.lineTo(0, hs * 0.2);
        ctx.closePath();
        ctx.fill();

        // Glowing Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(hs * 0.28, -hs * 0.25, hs * 0.17, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.restore();

        // Breathe Volumetric Fire or Lightning!
        const mouthX = head.x + Math.cos(headDir) * (hs * 1.25);
        const mouthY = head.y + Math.sin(headDir) * (hs * 1.25);
        if (isAttacking) {
          spawnFireBreath(mouthX, mouthY, headDir + 0.18, W, theme.scheme);
          if (theme.isThunder) {
            ctx.strokeStyle = '#e0f2fe';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            let currA = headAngle + 0.2;
            ctx.moveTo(mouthX, mouthY);
            for (let s = 1; s <= 9; s++) {
              currA += 0.24;
              const jitter = (Math.random() - 0.5) * (W * 0.042);
              ctx.lineTo(CX + Math.cos(currA) * (R + jitter), CY + Math.sin(currA) * (R + jitter));
            }
            ctx.stroke();
          }
        }
        ctx.restore();
      } else if (theme.kind === 'shadow') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const mx = CX;
        const my = CY - R * 0.96 + Math.sin(t * 3) * (W * 0.01);
        const s = W * 0.095;
        ctx.fillStyle = 'rgba(15, 7, 32, 0.92)';
        ctx.strokeStyle = isAttacking ? '#38bdf8' : '#a855f7';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(mx, my - s * 1.1);
        ctx.lineTo(mx - s * 0.72, my - s * 0.35);
        ctx.lineTo(mx - s * 0.45, my + s * 0.55);
        ctx.lineTo(mx, my + s * 0.8);
        ctx.lineTo(mx + s * 0.45, my + s * 0.55);
        ctx.lineTo(mx + s * 0.72, my - s * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        [-1, 1].forEach((side) => {
          ctx.fillStyle = isAttacking ? '#38bdf8' : '#c084fc';
          ctx.beginPath();
          ctx.moveTo(mx + side * s * 0.12, my + s * 0.12);
          ctx.lineTo(mx + side * s * 0.44, my - s * 0.08);
          ctx.lineTo(mx + side * s * 0.26, my + s * 0.24);
          ctx.closePath();
          ctx.fill();
        });

        if (isAttacking) {
          for (let k = 0; k < 2; k++) {
            const slashStart = t * 9 + k * Math.PI;
            ctx.strokeStyle = k === 0 ? '#a855f7' : '#38bdf8';
            ctx.lineWidth = W * 0.022;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(CX, CY, R * (1.02 + k * 0.07), slashStart, slashStart + Math.PI * 0.75);
            ctx.stroke();
          }
          const randA = t * 8;
          spawnFireBreath(CX + Math.cos(randA) * R, CY + Math.sin(randA) * R, randA + Math.PI / 2, W, 'shadow');
        }
        ctx.restore();
      } else if (theme.kind === 'cyber') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const droneA = isAttacking ? -Math.PI / 2 + Math.sin(t * 3) * 0.35 : t * 1.15;
        const dx = CX + Math.cos(droneA) * (R * 1.02);
        const dy = CY + Math.sin(droneA) * (R * 1.02);
        const wingSpread = isAttacking ? 0.55 + Math.sin(t * 20) * 0.08 : 0.22;
        const ds = W * 0.068;

        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(droneA + Math.PI / 2);
        [-1, 1].forEach((side) => {
          for (let w = 0; w < 3; w++) {
            ctx.save();
            ctx.rotate(side * (wingSpread + w * 0.24));
            ctx.fillStyle = w % 2 === 0 ? 'rgba(0, 242, 254, 0.8)' : 'rgba(255, 0, 128, 0.8)';
            ctx.beginPath();
            ctx.moveTo(side * ds * 0.3, 0);
            ctx.lineTo(side * ds * (1.5 - w * 0.2), -ds * (0.35 + w * 0.15));
            ctx.lineTo(side * ds * (1.2 - w * 0.2), ds * 0.18);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        });
        ctx.fillStyle = isAttacking ? '#ff0055' : '#00f2fe';
        ctx.beginPath();
        ctx.arc(0, 0, ds * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (isAttacking) {
          const scanY = CY + Math.sin(t * 7) * (R * 0.76);
          const halfChord = Math.sqrt(Math.max(0, R * R - Math.pow(scanY - CY, 2)));
          ctx.strokeStyle = 'rgba(255, 0, 128, 0.9)';
          ctx.lineWidth = W * 0.012;
          ctx.beginPath();
          ctx.moveTo(CX - halfChord, scanY);
          ctx.lineTo(CX + halfChord, scanY);
          ctx.stroke();
          spawnFireBreath(dx, dy, droneA + Math.PI / 2, W, 'cyber');
        }
        ctx.restore();
      }
    }

    function renderBannerMode(t) {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const bx = ((t * 95) % (W * 1.35)) - W * 0.18;
      const by = H * 0.46 + Math.sin(t * 2.5) * (H * 0.14);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 24; i++) {
        const sx = bx - i * 14;
        const sy = by + Math.sin(t * 6 - i * 0.45) * 11;
        const sr = Math.max(3, 15 - i * 0.55);
        ctx.fillStyle = theme.primary;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }

      if (Math.sin(t * 2.2) > -0.25) {
        const plume = ctx.createRadialGradient(bx + 15, by, 2, bx + 85, by, 75);
        plume.addColorStop(0, '#ffffff');
        plume.addColorStop(0.35, theme.secondary);
        plume.addColorStop(0.7, theme.primary);
        plume.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = plume;
        ctx.beginPath();
        ctx.arc(bx + 70, by, 75, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function animate(now) {
      const t = (now - startTime) * 0.001;
      if (mode === 'banner') {
        renderBannerMode(t);
      } else {
        renderFrameMode(t, now);
      }
      rafId = requestAnimationFrame(animate);
    }

    rafId = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('blackx:trigger-creature-attack', onTriggerAttack);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [ornament, mode, size, theme]);

  if (!theme) return null;

  if (mode === 'banner') {
    return (
      <canvas
        ref={canvasRef}
        width={680}
        height={240}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 3,
          ...style
        }}
      />
    );
  }

  const overlaySize = Math.round(size * 1.88);

  return (
    <canvas
      ref={canvasRef}
      width={360}
      height={360}
      onClick={() => {
        forcedAttackRef.current = performance.now() + 3600;
      }}
      style={{
        position: 'absolute',
        width: `${overlaySize}px`,
        height: `${overlaySize}px`,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 12,
        ...style
      }}
    />
  );
}

export default LiveCreatureOverlay;
