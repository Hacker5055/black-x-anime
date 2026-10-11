import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { VerifiedBadge } from './UserBadges.jsx';
import { pushToast } from '../hooks/hooks.js';

const SCREEN_REACTIONS = [
  { emoji: '🔥', labelAr: 'حماس ناري', labelEn: 'Fire' },
  { emoji: '⚔️', labelAr: 'قتال أسطوري', labelEn: 'Epic Fight' },
  { emoji: '😱', labelAr: 'صدمة!', labelEn: 'Shock!' },
  { emoji: '😂', labelAr: 'مضحك', labelEn: 'Haha' },
  { emoji: '😭', labelAr: 'مؤثر جداً', labelEn: 'Tears' },
  { emoji: '👑', labelAr: 'فخامة مطلقة', labelEn: 'Peak' },
  { emoji: '💜', labelAr: 'أحببته', labelEn: 'Love' }
];

function formatSec(sec = 0) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export default function WatchPartyPanel({ slug, episode, title, currentPosRef }) {
  const { lang } = useI18n();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const storageKey = `blackx.watchparty.${slug}.${episode}`;
  const urlParty = searchParams.get('party');

  const [roomCode, setRoomCode] = useState(() => urlParty || `BX-${String(slug || 'ANIME').slice(0, 3).toUpperCase()}${episode}9`);
  const [inParty, setInParty] = useState(Boolean(urlParty));
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [floatingItems, setFloatingItems] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [pinTimestamp, setPinTimestamp] = useState(true);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const recordTimerRef = useRef(null);

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'm1',
        author: 'Kuro_Kun',
        isDev: false,
        text: lang === 'ar' ? '🔥 الإخراج والتحريك في هذه الحلقة من عالم آخر!' : '🔥 The animation in this episode is unreal!',
        timestampSec: 45,
        timeAgo: lang === 'ar' ? 'منذ 3 د' : '3m ago'
      },
      {
        id: 'm2',
        author: 'Mirai_Sama',
        isDev: false,
        text: lang === 'ar' ? '👑 لحظة دخول البطل هنا فخامة مطلقة!' : '👑 The MC entrance at this timestamp is pure peak!',
        timestampSec: 128,
        timeAgo: lang === 'ar' ? 'منذ دقيقة' : '1m ago'
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40)));
    } catch {}
  }, [messages, storageKey]);

  const spawnFloatingOverlay = (text, color = '#22d3ee') => {
    const id = `${Date.now()}-${Math.random()}`;
    const top = 12 + Math.floor(Math.random() * 68);
    setFloatingItems((prev) => [...prev.slice(-16), { id, text, top, color }]);
    setTimeout(() => {
      setFloatingItems((prev) => prev.filter((item) => item.id !== id));
    }, 3600);
  };

  const handleCreateOrStartParty = () => {
    const code = roomCode || `BX-${Math.floor(1000 + Math.random() * 9000)}`;
    setRoomCode(code);
    setInParty(true);
    const next = new URLSearchParams(searchParams);
    next.set('party', code);
    setSearchParams(next, { replace: true });
    pushToast(
      lang === 'ar'
        ? `🎭 تم تفعيل غرفة المشاهدة الجماعية (${code})! شارك الرابط مع أصدقائك`
        : `🎭 Watch Party Room (${code}) is live! Share the link with friends`,
      'success'
    );
    spawnFloatingOverlay(`🎭 ${lang === 'ar' ? 'بدأت غرفة المشاهدة' : 'Watch Party Live'} (${code})`, '#a855f7');
  };

  const handleCopyInvite = () => {
    const url = `${window.location.origin}${window.location.pathname}?party=${encodeURIComponent(roomCode)}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    pushToast(
      lang === 'ar'
        ? '🔗 تم نسخ رابط دعوة غرفة المشاهدة الجماعية!'
        : '🔗 Watch Party invite link copied!',
      'success'
    );
  };

  const handleSyncTimestamp = () => {
    const sec = currentPosRef?.current?.pos || 0;
    const fmt = formatSec(sec);
    spawnFloatingOverlay(`⚡ ${lang === 'ar' ? `مزامنة الغرفة عند ${fmt}` : `Synced room at ${fmt}`}`, '#22d3ee');
    pushToast(
      lang === 'ar'
        ? `⚡ تمت مزامنة جميع المشاهدين في الغرفة عند الدقيقة ${fmt}`
        : `⚡ Synced all viewers in room to ${fmt}`,
      'info'
    );
  };

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    const sec = currentPosRef?.current?.pos || 0;
    const authorName = user?.displayName || user?.username || (lang === 'ar' ? 'مشاهد BLACK X' : 'BLACK X Viewer');
    const isDev = user?.role === 'developer' || user?.email?.toLowerCase() === 'mz0970mmz@gmail.com' || user?.isDeveloper;

    const newMsg = {
      id: `msg-${Date.now()}`,
      author: authorName,
      isDev,
      text: chatInput.trim(),
      timestampSec: pinTimestamp ? Math.floor(sec) : null,
      timeAgo: lang === 'ar' ? 'الآن' : 'Just now'
    };

    setMessages((prev) => [...prev, newMsg]);
    spawnFloatingOverlay(`${authorName}: ${chatInput.trim()}`, '#38bdf8');
    setChatInput('');
  };

  const handleToggleVoiceNote = () => {
    if (recordingVoice) {
      clearInterval(recordTimerRef.current);
      setRecordingVoice(false);
      const dur = Math.max(2, recordSec);
      setRecordSec(0);
      const sec = currentPosRef?.current?.pos || 0;
      const authorName = user?.displayName || user?.username || (lang === 'ar' ? 'مشاهد BLACK X' : 'BLACK X Viewer');
      const isDev = user?.role === 'developer' || user?.email?.toLowerCase() === 'mz0970mmz@gmail.com' || user?.isDeveloper;

      setMessages((prev) => [
        ...prev,
        {
          id: `voice-${Date.now()}`,
          author: authorName,
          isDev,
          isVoice: true,
          voiceDuration: dur,
          text: lang === 'ar' ? `🎙️ تعليق صوتي (${dur} ثانية)` : `🎙️ Voice Note (${dur}s)`,
          timestampSec: Math.floor(sec),
          timeAgo: lang === 'ar' ? 'الآن' : 'Just now'
        }
      ]);
      spawnFloatingOverlay(`🎙️ ${authorName} ${lang === 'ar' ? 'أرسل تعليقاً صوتياً!' : 'sent a voice note!'}`, '#f472b6');
      pushToast(lang === 'ar' ? '🎙️ تم نشر تعليقك الصوتي على الدقيقة الحالية!' : '🎙️ Voice note posted at current timestamp!', 'success');
    } else {
      setRecordingVoice(true);
      setRecordSec(1);
      recordTimerRef.current = setInterval(() => {
        setRecordSec((s) => s + 1);
      }, 1000);
    }
  };

  const playSimulatedVoice = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [320, 440, 520, 390, 480];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.06, ctx.currentTime + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (idx + 1) * 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.14);
        osc.stop(ctx.currentTime + (idx + 1) * 0.14);
      });
    } catch {}
  };

  return (
    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Floating Danmaku / Emoji Overlay across top of Watch Area */}
      {floatingItems.length > 0 && (
        <div
          style={{
            position: 'fixed',
            insetInline: 0,
            top: '90px',
            height: '340px',
            pointerEvents: 'none',
            zIndex: 80,
            overflow: 'hidden'
          }}
        >
          {floatingItems.map((it) => (
            <div
              key={it.id}
              style={{
                position: 'absolute',
                top: `${it.top}%`,
                insetInlineEnd: '4%',
                padding: '0.4rem 0.95rem',
                borderRadius: '999px',
                background: 'rgba(8, 10, 22, 0.82)',
                border: `1px solid ${it.color}`,
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.92rem',
                boxShadow: `0 0 18px ${it.color}66`,
                animation: 'watchPartyFloat 3.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                whiteSpace: 'nowrap'
              }}
            >
              {it.text}
            </div>
          ))}
        </div>
      )}

      {/* 1. Instant Screen Emoji & Danmaku Reaction Bar */}
      <div
        className="glass"
        style={{
          padding: '0.75rem 1.15rem',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--cyan)', marginInlineEnd: '0.35rem' }}>
            ✨ {lang === 'ar' ? 'تفاعل حي على الشاشة:' : 'Live Screen Reactions:'}
          </span>
          {SCREEN_REACTIONS.map((r) => (
            <button
              key={r.emoji}
              type="button"
              onClick={() => {
                const sec = formatSec(currentPosRef?.current?.pos || 0);
                spawnFloatingOverlay(`${r.emoji} ${lang === 'ar' ? r.labelAr : r.labelEn} [${sec}]`, '#ff5500');
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '999px',
                padding: '0.3rem 0.7rem',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
              }}
            >
              {r.emoji} {lang === 'ar' ? r.labelAr : r.labelEn}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={handleCreateOrStartParty}
          style={{
            background: inParty
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            fontWeight: 800,
            borderRadius: '999px'
          }}
        >
          🎭 {inParty
            ? (lang === 'ar' ? `غرفة نشطة: ${roomCode}` : `Party Live: ${roomCode}`)
            : (lang === 'ar' ? 'إنشاء غرفة مشاهدة مع الأصدقاء' : 'Start Watch Party Room')}
        </button>
      </div>

      {/* 2. Watch Party Room & Timestamped Comments Hub */}
      <div className="glass" style={{ padding: '1.35rem', borderRadius: '20px', border: '1px solid rgba(139, 92, 246, 0.28)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem', marginBottom: '1rem', paddingBottom: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🎭</span>
              {lang === 'ar' ? 'غرفة المشاهدة الجماعية والتعليقات الزمنية' : 'Live Watch Party & Timestamped Comments'}
              <span style={{ fontSize: '0.73rem', padding: '0.18rem 0.6rem', borderRadius: '99px', background: 'rgba(16, 185, 129, 0.18)', border: '1px solid rgba(16, 185, 129, 0.45)', color: '#34d399' }}>
                ● {lang === 'ar' ? 'متصل الآن (4 مشاهدين)' : '4 Watching Live'}
              </span>
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--ink-dim)' }}>
              {lang === 'ar'
                ? `كود الغرفة: ${roomCode} • شاهد الحلقة مع أصدقائك في نفس الثانية أو اترك تعليقاً صوتياً/نصياً عند الدقيقة الحالية`
                : `Room Code: ${roomCode} • Watch together in real-time or pin voice/text comments to the current timestamp`}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={handleSyncTimestamp}
              style={{ borderColor: 'rgba(34, 211, 238, 0.4)', color: 'var(--cyan)', fontWeight: 700 }}
            >
              ⚡ {lang === 'ar' ? 'مزامنة الثانية الحالية' : 'Sync Timestamp'}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={handleCopyInvite}
              style={{ borderColor: 'rgba(168, 85, 247, 0.45)', color: '#c084fc', fontWeight: 700 }}
            >
              🔗 {lang === 'ar' ? 'نسخ رابط الدعوة' : 'Copy Invite Link'}
            </button>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <input
                type="text"
                className="input"
                placeholder={lang === 'ar' ? 'أدخل كود غرفة...' : 'Join room code...'}
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                style={{ width: '130px', padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
              />
              {joinCodeInput.trim() && (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => {
                    setRoomCode(joinCodeInput.trim().toUpperCase());
                    setInParty(true);
                    setJoinCodeInput('');
                    pushToast(lang === 'ar' ? 'تم الانضمام للغرفة بنجاح!' : 'Joined Watch Party room!', 'success');
                  }}
                >
                  {lang === 'ar' ? 'انضمام' : 'Join'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Timestamped & Voice Messages Stream */}
        <div
          style={{
            maxHeight: '240px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.55rem',
            marginBottom: '0.95rem',
            paddingInlineEnd: '0.35rem'
          }}
        >
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.6rem 0.9rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.035)',
                border: '1px solid rgba(255, 255, 255, 0.07)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                {m.timestampSec !== null && m.timestampSec !== undefined && (
                  <span
                    style={{
                      padding: '0.15rem 0.5rem',
                      borderRadius: '6px',
                      background: 'rgba(34, 211, 238, 0.16)',
                      border: '1px solid rgba(34, 211, 238, 0.4)',
                      color: 'var(--cyan)',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      fontWeight: 800
                    }}
                  >
                    ⏱️ {formatSec(m.timestampSec)}
                  </span>
                )}
                <strong style={{ fontSize: '0.86rem', color: '#fff', display: 'inline-flex', alignItems: 'center' }}>
                  {m.author}
                  <VerifiedBadge isDev={m.isDev} size={15} />
                </strong>
                {m.isVoice ? (
                  <button
                    type="button"
                    onClick={playSimulatedVoice}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '999px',
                      background: 'linear-gradient(135deg, rgba(236,72,153,0.22), rgba(139,92,246,0.22))',
                      border: '1px solid rgba(236,72,153,0.5)',
                      color: '#f472b6',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    <span>▶</span>
                    <span>{m.text}</span>
                    <span style={{ letterSpacing: '2px', color: '#38bdf8' }}>ılılılılı</span>
                  </button>
                ) : (
                  <span style={{ fontSize: '0.86rem', color: '#e2e8f0' }}>{m.text}</span>
                )}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--ink-dim)', whiteSpace: 'nowrap' }}>{m.timeAgo}</span>
            </div>
          ))}
        </div>

        {/* Composer Row with Timestamp Pin & Voice Note Recorder */}
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.76rem',
              color: pinTimestamp ? 'var(--cyan)' : 'var(--ink-dim)',
              cursor: 'pointer',
              padding: '0.4rem 0.65rem',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <input
              type="checkbox"
              checked={pinTimestamp}
              onChange={(e) => setPinTimestamp(e.target.checked)}
            />
            ⏱️ {lang === 'ar' ? 'ربط بالثانية الحالية' : 'Pin Timestamp'}
          </label>

          <input
            type="text"
            className="input"
            placeholder={lang === 'ar' ? 'اكتب تعليقاً يظهر على شاشة الحلقة وفي الغرفة...' : 'Write a timestamped comment or Watch Party message...'}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
          />

          <button
            type="button"
            onClick={handleToggleVoiceNote}
            className="btn btn--ghost btn--sm"
            style={{
              borderColor: recordingVoice ? '#ef4444' : 'rgba(244, 114, 182, 0.45)',
              background: recordingVoice ? 'rgba(239, 68, 68, 0.22)' : 'rgba(244, 114, 182, 0.1)',
              color: recordingVoice ? '#fca5a5' : '#f472b6',
              fontWeight: 800
            }}
          >
            🎙️ {recordingVoice
              ? (lang === 'ar' ? `إيقاف وإرسال (${recordSec}ث)` : `Stop & Send (${recordSec}s)`)
              : (lang === 'ar' ? 'تعليق صوتي' : 'Voice Note')}
          </button>

          <button type="submit" className="btn btn--primary btn--sm" disabled={!chatInput.trim()}>
            <span className="btn__shine" />
            ➤ {lang === 'ar' ? 'إرسال' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
