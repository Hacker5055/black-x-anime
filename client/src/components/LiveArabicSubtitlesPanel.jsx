import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api.js';
import { pushToast } from '../hooks/hooks.js';

function formatClock(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export default function LiveArabicSubtitlesPanel({
  slug,
  episode,
  titleEn,
  lang = 'ar',
  autoEnable = false,
  currentPosRef
}) {
  const [enabled, setEnabled] = useState(Boolean(autoEnable));
  const [loading, setLoading] = useState(false);
  const [subData, setSubData] = useState(null); // { cues, cueCount, fileName, vttUrl, srtUrl }
  const [clockSec, setClockSec] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [offsetSec, setOffsetSec] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const fileInputRef = useRef(null);

  const loadEpisodeSubtitles = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const qTitle = titleEn || slug;
      const res = await api.get(
        `/api/stream/subtitles/${encodeURIComponent(slug)}/${episode}?title=${encodeURIComponent(qTitle)}`
      );
      if (res?.ok && Array.isArray(res.cues) && res.cues.length > 0) {
        setSubData(res);
        setTimerRunning(true);
        pushToast(
          lang === 'ar'
            ? `🌐 تم ترجمة ومزامنة ${res.cueCount} سطر حوار من الإنجليزية إلى العربية بنجاح!`
            : `🌐 Translated & synced ${res.cueCount} subtitle lines to Arabic!`,
          'success'
        );
      } else {
        setSubData({ ok: false, cues: [], cueCount: 0 });
      }
    } catch {
      setSubData({ ok: false, cues: [], cueCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [slug, episode, titleEn, lang]);

  useEffect(() => {
    setSubData(null);
    setClockSec(0);
    if (autoEnable) {
      setEnabled(true);
      loadEpisodeSubtitles();
    }
  }, [slug, episode, autoEnable, loadEpisodeSubtitles]);

  // Listen to native player time or postMessage timeupdate from embed players (VidLink Pro, etc.)
  useEffect(() => {
    if (!enabled) return undefined;

    const onMessage = (e) => {
      try {
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        const t =
          d?.currentTime ??
          d?.data?.currentTime ??
          d?.time ??
          (d?.event === 'timeupdate' ? d?.seconds : null);
        if (typeof t === 'number' && Number.isFinite(t) && t >= 0) {
          setClockSec(t);
        }
      } catch {
        // ignore non-JSON messages
      }
    };
    window.addEventListener('message', onMessage);

    const interval = setInterval(() => {
      const nativePos = currentPosRef?.current?.pos;
      if (typeof nativePos === 'number' && nativePos > 0) {
        setClockSec(nativePos);
      } else if (timerRunning) {
        setClockSec((prev) => prev + 0.25);
      }
    }, 250);

    return () => {
      window.removeEventListener('message', onMessage);
      clearInterval(interval);
    };
  }, [enabled, timerRunning, currentPosRef]);

  const effectiveTime = Math.max(0, clockSec + offsetSec);
  const cues = subData?.cues || [];
  const activeCue =
    cues.find((c) => effectiveTime >= c.startSec && effectiveTime <= c.endSec + 0.35) || null;

  const handleUploadCustomSub = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setEnabled(true);
    try {
      const rawText = await file.text();
      const res = await api.post('/api/stream/translate-subtitle', { text: rawText });
      if (res?.ok && Array.isArray(res.cues) && res.cues.length) {
        setSubData({
          ok: true,
          fileName: file.name,
          cueCount: res.cueCount,
          cues: res.cues
        });
        setTimerRunning(true);
        pushToast(
          lang === 'ar'
            ? `🌐 تم ترجمة ملف (${file.name}) من الإنجليزية إلى العربية (${res.cueCount} سطر)!`
            : `🌐 Translated ${file.name} to Arabic (${res.cueCount} lines)!`,
          'success'
        );
      } else {
        pushToast(lang === 'ar' ? 'تعذر قراءة ملف الترجمة' : 'Could not parse subtitle file', 'error');
      }
    } catch {
      pushToast(lang === 'ar' ? 'حدث خطأ أثناء ترجمة الملف' : 'Subtitle translation error', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="glass"
      style={{
        marginTop: '0.75rem',
        padding: '0.9rem 1.15rem',
        borderRadius: '16px',
        background: 'rgba(5, 5, 5, 0.94)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '0.22rem 0.65rem',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#000000',
              fontSize: '0.74rem',
              fontWeight: 900
            }}
          >
            🌐 AI SUBTITLE TRANSLATOR
          </span>
          <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>
            {lang === 'ar'
              ? 'مترجم الحلقات الفوري (من الإنجليزية إلى العربية)'
              : 'Instant Episode Translator (English ➔ Arabic)'}
          </strong>
          {subData?.cueCount > 0 && (
            <span style={{ fontSize: '0.74rem', color: '#a1a1aa', fontWeight: 700 }}>
              ({subData.cueCount} {lang === 'ar' ? 'سطر مترجم للعربية' : 'Arabic lines'})
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".srt,.vtt,.ass"
            style={{ display: 'none' }}
            onChange={handleUploadCustomSub}
          />
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => fileInputRef.current?.click()}
            style={{ fontSize: '0.75rem', fontWeight: 800 }}
          >
            📤 {lang === 'ar' ? 'رفع ملف ترجمة إنجليزي (.SRT/.VTT) لترجمته' : 'Upload EN .SRT/.VTT'}
          </button>

          {subData?.srtUrl && (
            <a
              href={subData.srtUrl}
              download
              className="btn btn--ghost btn--sm"
              style={{ fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none' }}
            >
              📥 {lang === 'ar' ? 'تحميل الترجمة العربية (.SRT)' : 'Download Arabic .SRT'}
            </a>
          )}

          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={loading}
            onClick={() => {
              if (!enabled) {
                setEnabled(true);
                if (!subData) loadEpisodeSubtitles();
              } else if (!subData) {
                loadEpisodeSubtitles();
              } else {
                setEnabled(false);
              }
            }}
            style={{
              background: enabled ? '#ffffff' : 'rgba(255,255,255,0.12)',
              color: enabled ? '#000000' : '#ffffff',
              fontWeight: 900,
              fontSize: '0.78rem'
            }}
          >
            {loading
              ? (lang === 'ar' ? '⏳ جاري ترجمة الحلقة للعربية...' : '⏳ Translating to Arabic...')
              : enabled
              ? (lang === 'ar' ? '🌐 الترجمة العربية الفورية: مفعّلة ✓' : '🌐 Arabic Subtitles: ON ✓')
              : (lang === 'ar' ? '🌐 تفعيل الترجمة العربية الفورية' : '🌐 Enable Instant Arabic Subtitles')}
          </button>
        </div>
      </div>

      {/* Live Cinema Arabic Subtitle Display Box */}
      {enabled && (
        <div
          style={{
            padding: '0.95rem 1.2rem',
            borderRadius: '12px',
            background: '#000000',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            textAlign: 'center',
            minHeight: '74px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem'
          }}
        >
          {loading ? (
            <div style={{ color: '#e4e4e7', fontWeight: 800, fontSize: '0.92rem' }}>
              ⏳ {lang === 'ar' ? 'جاري سحب ملف الترجمة الإنجليزي وترجمته إلى العربية بالذكاء الاصطناعي...' : 'Fetching English subtitles & translating to Arabic...'}
            </div>
          ) : cues.length === 0 ? (
            <div style={{ color: '#a1a1aa', fontSize: '0.84rem', fontWeight: 700 }}>
              {lang === 'ar'
                ? 'لم يتم العثور على ملف ترجمة خارجي تلقائي لهذه الحلقة — يمكنك رفع أي ملف (.SRT / .VTT) إنجليزي من الزر أعلاه لترجمته فوراً للعربية!'
                : 'No automatic external subtitle found — upload any English .SRT/.VTT file above to translate it instantly to Arabic!'}
            </div>
          ) : (
            <>
              <div
                dir="rtl"
                style={{
                  fontSize: 'clamp(1.05rem, 2vw, 1.32rem)',
                  fontWeight: 900,
                  color: '#ffffff',
                  textShadow: '0 2px 10px rgba(0,0,0,0.95)',
                  lineHeight: 1.5
                }}
              >
                {activeCue ? activeCue.textAr : (lang === 'ar' ? '⋯ بانتظار الحوار التالي في المشهد ⋯' : '⋯ Waiting for next dialogue cue ⋯')}
              </div>
              {activeCue && (
                <div style={{ fontSize: '0.78rem', color: '#a1a1aa', fontWeight: 600 }}>
                  {activeCue.textEn}
                </div>
              )}
            </>
          )}

          {/* Synchronization Controls Bar */}
          {cues.length > 0 && (
            <div
              style={{
                marginTop: '0.45rem',
                paddingTop: '0.55rem',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
                fontSize: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="wit-server-tab"
                  onClick={() => setTimerRunning((v) => !v)}
                  style={{ padding: '0.25rem 0.65rem' }}
                >
                  {timerRunning ? '⏸ إيقاف المؤقت' : '▶ تشغيل مؤقت الترجمة'}
                </button>
                <span style={{ fontWeight: 900, color: '#ffffff', fontFamily: 'monospace', fontSize: '0.84rem' }}>
                  ⏱ {formatClock(effectiveTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(1500, Math.ceil(cues[cues.length - 1]?.endSec || 1440))}
                  value={Math.floor(effectiveTime)}
                  onChange={(e) => setClockSec(Number(e.target.value) - offsetSec)}
                  style={{ width: '140px', accentColor: '#ffffff', cursor: 'pointer' }}
                  title={lang === 'ar' ? 'تقديم/تأخير توقيت الترجمة' : 'Scrub subtitle timeline'}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="wit-server-tab"
                  onClick={() => setOffsetSec((s) => s - 1)}
                  style={{ padding: '0.2rem 0.5rem' }}
                >
                  -1s
                </button>
                <button
                  type="button"
                  className="wit-server-tab"
                  onClick={() => setOffsetSec((s) => s + 1)}
                  style={{ padding: '0.2rem 0.5rem' }}
                >
                  +1s
                </button>
                <button
                  type="button"
                  className="wit-server-tab"
                  onClick={() => setShowTranscript((v) => !v)}
                  style={{ padding: '0.2rem 0.65rem' }}
                >
                  📜 {showTranscript ? (lang === 'ar' ? 'إخفاء النص الكامل' : 'Hide Transcript') : (lang === 'ar' ? 'عرض نص الحلقة مترجماً' : 'Full Arabic Transcript')}
                </button>
              </div>
            </div>
          )}

          {/* Full Interactive Arabic Episode Transcript */}
          {showTranscript && cues.length > 0 && (
            <div
              dir="rtl"
              style={{
                marginTop: '0.5rem',
                maxHeight: '220px',
                overflowY: 'auto',
                width: '100%',
                textAlign: 'right',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                padding: '0.5rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.03)'
              }}
            >
              {cues.map((c) => {
                const isActive = activeCue?.index === c.index;
                return (
                  <div
                    key={c.index}
                    onClick={() => setClockSec(c.startSec - offsetSec)}
                    style={{
                      padding: '0.35rem 0.6rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: isActive ? 'rgba(255,255,255,0.16)' : 'transparent',
                      border: isActive ? '1px solid rgba(255,255,255,0.35)' : '1px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem'
                    }}
                  >
                    <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.84rem' }}>{c.textAr}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#a1a1aa', flexShrink: 0 }}>
                      {c.start.slice(0, 8)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
