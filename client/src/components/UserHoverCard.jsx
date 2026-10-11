import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { LiveCreatureOverlay } from './LiveAvatarOrnament.jsx';
import { UserBadges, VerifiedBadge } from './UserBadges.jsx';
import { imgFallback } from '../hooks/hooks.js';

export const ANIME_MEME_STICKERS = [
  { id: 'cinema', emoji: '🙌', labelAr: 'سينما مطلقة (Absolute Cinema)', labelEn: 'Absolute Cinema 🙌', bg: 'linear-gradient(135deg, #f59e0b, #b45309)' },
  { id: 'arise', emoji: '🟣', labelAr: 'انهض! (ARISE — Solo Leveling)', labelEn: 'ARISE! 🟣', bg: 'linear-gradient(135deg, #9333ea, #3b82f6)' },
  { id: 'domain', emoji: '🤞', labelAr: 'توسيع المجال (Domain Expansion)', labelEn: 'Domain Expansion 🤞', bg: 'linear-gradient(135deg, #0284c7, #1e1b4b)' },
  { id: 'gear5', emoji: '⚡', labelAr: 'الجير الخامس (Gear 5 Peak)', labelEn: 'Gear 5 Peak ⚡', bg: 'linear-gradient(135deg, #ec4899, #8b5cf6)' },
  { id: 'nahwin', emoji: '😎', labelAr: 'سأنتصر حتماً (Nah, I’d Win)', labelEn: "Nah, I'd Win 😎", bg: 'linear-gradient(135deg, #06b6d4, #2563eb)' },
  { id: 'hinokami', emoji: '🔥', labelAr: 'تنفس الشمس (Hinokami Kagura)', labelEn: 'Hinokami Kagura 🔥', bg: 'linear-gradient(135deg, #ef4444, #f97316)' }
];

export function VoiceNoteWavePlayer({ duration = 5, label }) {
  const { lang } = useI18n();
  const [playing, setPlaying] = useState(false);

  const handlePlay = () => {
    setPlaying(true);
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        [340, 440, 520, 410, 490].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.frequency.value = freq;
          g.gain.setValueAtTime(0.05, ctx.currentTime + i * 0.14);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (i + 1) * 0.14);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.14);
          osc.stop(ctx.currentTime + (i + 1) * 0.14);
        });
      }
    } catch {}
    setTimeout(() => setPlaying(false), 1200);
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.65rem',
        padding: '0.45rem 0.95rem',
        borderRadius: '999px',
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(34, 211, 238, 0.18))',
        border: '1px solid rgba(34, 211, 238, 0.45)',
        marginTop: '0.45rem'
      }}
    >
      <button
        type="button"
        onClick={handlePlay}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: 'none',
          background: playing ? '#ec4899' : '#22d3ee',
          color: '#04060e',
          fontWeight: 900,
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center'
        }}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff' }}>
        {label || (lang === 'ar' ? `🎙️ تعليق صوتي (${duration}ث)` : `🎙️ Voice Note (${duration}s)`)}
      </span>
      <span style={{ letterSpacing: '2px', color: playing ? '#f472b6' : 'var(--cyan)', fontWeight: 900 }}>
        ılılıllılılıllı
      </span>
    </div>
  );
}

/**
 * UserHoverCard — Discord Nitro / X style interactive 3D Mini Profile Hover Card
 */
export default function UserHoverCard({
  authorName,
  authorAvatar,
  authorFrame = 'royal-flame',
  isDev = false,
  isFollowing = false,
  onToggleFollow,
  canFollow = true,
  children
}) {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);

  const handleEnter = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(true), 140);
  };

  const handleLeave = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(false), 220);
  };

  return (
    <span
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
    >
      {children}

      {open && (
        <div
          className="glass"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            insetInlineStart: 0,
            width: '295px',
            borderRadius: '20px',
            overflow: 'hidden',
            background: 'rgba(8, 10, 22, 0.97)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.88)',
            zIndex: 150,
            textAlign: 'start',
            pointerEvents: 'auto'
          }}
        >
          {/* Mini 3D Animated Banner Header */}
          <div style={{ position: 'relative', width: '100%', height: '84px', background: 'radial-gradient(circle at 50% 35%, #2e1065, #050711)', overflow: 'hidden' }}>
            <LiveCreatureOverlay ornament={authorFrame || 'royal-flame'} mode="banner" />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,10,22,0.96), transparent)' }} />
          </div>

          {/* Overlapping Avatar + Living Creature */}
          <div style={{ padding: '0 1rem 1rem', marginTop: '-34px', position: 'relative', zIndex: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.55rem' }}>
              <div style={{ position: 'relative', width: '64px', height: '64px', display: 'grid', placeItems: 'center' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: isDev ? '#ec4899' : '#1e1b4b',
                    border: '2px solid rgba(255,255,255,0.28)',
                    overflow: 'hidden',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 900,
                    color: '#fff',
                    fontSize: '1.2rem'
                  }}
                >
                  {authorAvatar ? (
                    <img onError={imgFallback} src={authorAvatar} alt={authorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (authorName?.[0] || 'U').toUpperCase()
                  )}
                </div>
                <LiveCreatureOverlay ornament={authorFrame || 'royal-flame'} mode="frame" size={58} />
              </div>

              <span
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '99px',
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 900
                }}
              >
                ⚡ LVL {isDev ? 99 : 75}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 900, fontSize: '1rem', color: '#fff' }}>
              <span>{authorName}</span>
              <VerifiedBadge isDev={isDev} size={17} />
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--cyan)', fontWeight: 700, marginBottom: '0.45rem' }}>
              @{String(authorName || 'member').replace(/\s+/g, '')} • Shadow Monarch 👑
            </div>

            <div style={{ marginBottom: '0.65rem' }}>
              <UserBadges badges={isDev ? ['gold_vip', 'blue_verified', 'celebrity'] : ['blue_verified', 'veteran_viewer']} size="sm" />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.55rem' }}>
              {canFollow && onToggleFollow && (
                <button
                  type="button"
                  onClick={() => onToggleFollow(authorName)}
                  className="btn btn--primary btn--sm"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    fontSize: '0.76rem',
                    padding: '0.4rem 0.65rem',
                    background: isFollowing ? 'rgba(16, 185, 129, 0.25)' : 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                    border: isFollowing ? '1px solid #10b981' : 'none'
                  }}
                >
                  {isFollowing ? (lang === 'ar' ? '✓ تتابعه' : '✓ Following') : (lang === 'ar' ? '+ متابعة سريعة' : '+ Quick Follow')}
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="btn btn--ghost btn--sm"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem' }}
              >
                👤 {lang === 'ar' ? 'البروفايل' : 'Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
