/**
 * ============================================================================
 *  OrnamentGallery — the "زخارف الملفات الشخصية" picker (3D live previews)
 * ============================================================================
 *  Replaces the emoji-button list in the profile customiser with a real
 *  preview stage. Performance model:
 *
 *    • every tile is a pure-CSS poster (0 GL contexts, cheap in a long grid)
 *    • ONE WebGL context lives in the preview stage and re-targets on hover /
 *      focus / selection, so you can *see* the ornament before saving it
 *    • the stage pauses itself offscreen (engine's IntersectionObserver)
 *
 *  Emits `onChange({ frameStyle })` / `onChange({ bannerStyle })` so the
 *  caller just forwards it to `PUT /api/profile/customize`.
 * ============================================================================
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';

import Ornament3D from './Ornament3D.jsx';
import { ORNAMENT_PRESETS, BANNER_PRESETS, QUALITY_TIERS, detectQuality } from './core/ornaments.js';
import { LiveCreatureOverlay } from '../components/LiveAvatarOrnament.jsx';

const OFF_PRESET = {
  id: 'default',
  icon: '⚪',
  labelAr: 'بدون زخرفة',
  labelEn: 'Clean (no ornament)',
  colors: { primary: '#94a3b8' },
  css: null
};

const SLIDERS = [
  { key: 'tilt', label: 'Gyro tilt · الميل الجيروسكوبي', min: 0, max: 0.5, step: 0.01 },
  { key: 'spin', label: 'Idle spin · الدوران الخامل', min: 0, max: 0.35, step: 0.005 },
  { key: 'glassTransmission', label: 'Transmission · الانكسار', min: 0, max: 1, step: 0.01 },
  { key: 'glassRoughness', label: 'Roughness · الخشونة', min: 0.01, max: 0.5, step: 0.01 },
  { key: 'glassIor', label: 'IOR · معامل الانكسار', min: 1, max: 2.3, step: 0.01 },
  { key: 'emissive', label: 'Emissive · شدة التوهج', min: 0, max: 5, step: 0.05 },
  { key: 'bloomStrength', label: 'Bloom · الهالة', min: 0, max: 1.8, step: 0.01 },
  { key: 'particleSpeed', label: 'Particles · سرعة الجسيمات', min: 0, max: 2, step: 0.05 }
];

export default function OrnamentGallery({
  mode = 'frame',
  value = 'default',
  onChange,
  avatar = {},
  showStage = true,
  showAdvanced = true,
  compact = false,
  disabled = false,
  threeDEnabled = true,
  quality: qualityProp,
  onQualityChange
}) {
  const { lang, t } = useI18n();
  const isBanner = mode === 'banner';
  const catalog = isBanner ? BANNER_PRESETS : ORNAMENT_PRESETS;
  const ids = useMemo(() => Object.keys(catalog), [catalog]);
  const [selected, setSelected] = useState(value);
  const [hovered, setHovered] = useState(null);
  const [innerQuality, setInnerQuality] = useState('auto');
  const quality = qualityProp ?? innerQuality;
  const setQuality = useCallback((q) => { onQualityChange ? onQualityChange(q) : setInnerQuality(q); }, [onQualityChange]);
  const [advanced, setAdvanced] = useState(false);
  const [options, setOptions] = useState({});
  const [stats, setStats] = useState(null);
  const stageRef = useRef(null);

  useEffect(() => { setSelected(value); }, [value]);

  const autoTier = useMemo(() => {
    if (!threeDEnabled) return 'css';
    return quality === 'auto' ? detectQuality().tier : quality;
  }, [quality, threeDEnabled]);
  const preview = hovered || selected;
  const previewPreset = preview === 'default' || preview === 'off' ? OFF_PRESET : catalog[preview];

  const choose = useCallback((id) => {
    setSelected(id);
    onChange?.(isBanner ? { bannerStyle: id } : { frameStyle: id });
  }, [onChange, isBanner]);

  const setOpt = useCallback((key, v) => setOptions((o) => ({ ...o, [key]: v })), []);

  const tiles = [
    isBanner ? { ...OFF_PRESET, labelAr: 'خلفية ثابتة', labelEn: 'Flat / image only' } : OFF_PRESET,
    ...ids.map((id) => catalog[id])
  ];

  return (
    <div className={`orn-gallery ${compact ? 'orn-gallery--compact' : ''}`} data-mode={mode}>
      {showStage && (
        <div className="orn-gallery__stage glass" style={{ background: previewPreset?.background || '#05070d' }}>
          <Ornament3D
            mode={isBanner ? 'banner' : 'frame'}
            ornament={previewPreset?.id || 'default'}
            size={isBanner ? undefined : 190}
            eager
            interactive
            quality={autoTier}
            withAvatar={!isBanner}
            avatarSrc={avatar.photoUrl || null}
            avatarLabel={avatar.label || 'X'}
            avatarColor={avatar.color || '#22d3ee'}
            overrides={options}
            enabled={threeDEnabled}
            onEngine={(inst) => {
              stageRef.current = inst;
              if (inst?.getStats) setStats(inst.getStats());
              else setStats(null);
            }}
            style={isBanner ? { position: 'absolute', inset: 0 } : undefined}
          />
          <div className="orn-gallery__stage-meta">
            <div className="orn-gallery__stage-name">
              <span aria-hidden="true">{previewPreset?.icon}</span>
              <b>{lang === 'ar' ? previewPreset?.labelAr : previewPreset?.labelEn}</b>
            </div>
            <div className="orn-gallery__stats">
              {stats ? `${stats.tris > 999 ? `${(stats.tris / 1000).toFixed(1)}k` : stats.tris} tris · ${stats.calls} calls · dpr ${stats.dpr?.toFixed(2)} · ${stats.quality}` : autoTier}
            </div>
          </div>
        </div>
      )}

      <div className="orn-gallery__tiles" role="radiogroup" aria-label={isBanner ? '3D banners' : '3D ornaments'}>
        {tiles.map((p) => {
          const isOff = p.id === 'default' || p.id === 'off';
          const active = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`orn-tile ${active ? 'is-active' : ''} ${isOff ? 'orn-tile--off' : ''}`}
              style={{ '--orn-color': p.colors?.primary || '#94a3b8' }}
              onClick={() => choose(isOff ? (isBanner ? 'off' : 'default') : p.id)}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(p.id)}
              onBlur={() => setHovered(null)}
              disabled={disabled}
            >
              <span className="orn-tile__poster" style={{ background: p.background || 'transparent', position: 'relative' }}>
                {!isOff && p.css && <span className={`avatar-frame avatar-frame--${p.id}`} />}
                {!isOff && !p.css && p.skyline && <span className="orn-tile__city" style={{ background: p.colors?.primary }} />}
                {!isOff && !isBanner && <LiveCreatureOverlay ornament={p.id} mode="frame" size={44} />}
                <span className="orn-tile__ava">
                  {avatar.photoUrl ? <img src={avatar.photoUrl} alt="" loading="lazy" /> : (avatar.label || 'X').slice(0, 2).toUpperCase()}
                </span>
              </span>
              <span className="orn-tile__label">
                <i aria-hidden="true">{p.icon}</i>
                <span>{lang === 'ar' ? p.labelAr : p.labelEn}</span>
              </span>
              {active && <span className="orn-tile__check" aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>

      {showAdvanced && (
        <div className="orn-gallery__advanced">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAdvanced((a) => !a)} aria-expanded={advanced}>
            ⚙ {advanced ? t('profile.ornHideTune') : t('profile.ornFineTune')}
          </button>
          <div className="orn-gallery__quality" role="group" aria-label="quality tier">
            {['auto', ...Object.keys(QUALITY_TIERS)].map((k) => (
              <button key={k} type="button" className={quality === k ? 'active' : ''} onClick={() => setQuality(k)} title={QUALITY_TIERS[k]?.label || k}>
                {k === 'auto' ? (lang === 'ar' ? 'تلقائي' : 'Auto') : QUALITY_TIERS[k].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showAdvanced && advanced && (
        <div className="orn-gallery__sliders">
          {SLIDERS.map((s) => (
            <label key={s.key} className="orn-slider">
              <span>{s.label}</span>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={options[s.key] ?? defaultFor(s.key, previewPreset)}
                onChange={(e) => setOpt(s.key, parseFloat(e.target.value))}
              />
              <output>{Number(options[s.key] ?? defaultFor(s.key, previewPreset)).toFixed(2)}</output>
            </label>
          ))}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setOptions({})}
          >
            ↺ {t('profile.ornReset')}
          </button>
          <p className="hint">{t('profile.ornPreviewHint')}</p>
        </div>
      )}
    </div>
  );
}

function defaultFor(key, preset) {
  switch (key) {
    case 'tilt': return preset?.tilt ?? 0.26;
    case 'spin': return preset?.rig?.spin ?? 0.06;
    case 'glassTransmission': return 0.9;
    case 'glassRoughness': return 0.08;
    case 'glassIor': return 1.52;
    case 'emissive': return 2.4;
    case 'bloomStrength': return preset?.bloom?.strength ?? 0.8;
    case 'particleSpeed': return 1;
    default: return 0;
  }
}
