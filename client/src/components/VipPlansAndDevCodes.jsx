import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { api } from '../api.js';
import { pushToast } from '../hooks/hooks.js';

export const VIP_BASIC_ORNAMENTS = [
  'royal-flame',
  'shadow-monarch',
  'cyber-neon',
  'imperial-gold',
  'sakura-blossom'
];

export const EGP_PRICING = {
  vip_basic: {
    monthly: 99,
    quarterly: 249,
    yearly: 799,
    oldMonthly: 150
  },
  vip_monarch: {
    monthly: 199,
    quarterly: 499,
    yearly: 1499,
    oldMonthly: 320
  }
};

export function resolveUserVipTier(user, referralData) {
  if (!user) return 'free';
  if (user.role === 'developer' || user.isDeveloper || (user.email || '').toLowerCase() === 'mz0970mmz@gmail.com') {
    return 'vip_monarch';
  }
  const savedLocal = typeof localStorage !== 'undefined' ? localStorage.getItem('blackx.vipTier') : null;
  if (
    user.vipTier === 'vip_monarch' ||
    user.vipStatus === 'VIP Monarch' ||
    user.vip_status === 'VIP Monarch' ||
    savedLocal === 'vip_monarch'
  ) {
    return 'vip_monarch';
  }
  if (
    user.vipTier === 'vip_basic' ||
    user.vipStatus === 'VIP Basic' ||
    user.vip_status === 'VIP Basic' ||
    savedLocal === 'vip_basic' ||
    referralData?.isVipUnlocked ||
    (user.badges || []).includes('gold_vip')
  ) {
    return 'vip_basic';
  }
  return 'free';
}

export function VipPlansSection({ user, referralData, onVipUpdated, onSelectFrame }) {
  const { lang, formatNumber } = useI18n();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'quarterly' | 'yearly'
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [selectedPlanModal, setSelectedPlanModal] = useState(null);
  const [studioPrompt, setStudioPrompt] = useState('Shadow Monarch Dragon Sovereign with Purple Lightning Aura');
  const [studioGenerated, setStudioGenerated] = useState(null);

  const currentTier = resolveUserVipTier(user, referralData);

  const handleRedeem = async (e) => {
    e.preventDefault();
    const clean = redeemCode.trim().toUpperCase();
    if (!clean) return;
    setRedeeming(true);
    try {
      const res = await api.post('/api/dev/vip/redeem', { code: clean });
      const newTier = res.tier || 'vip_basic';
      try {
        localStorage.setItem('blackx.vipTier', newTier);
        if (res.expiresAt) localStorage.setItem('blackx.vipExpiresAt', res.expiresAt);
        // Unlock the 5 exclusive VIP ornaments automatically
        const existingOwned = JSON.parse(localStorage.getItem('blackx.ownedShopItems') || '[]');
        const unlocked =
          newTier === 'vip_monarch'
            ? [...VIP_BASIC_ORNAMENTS, 'dragon-ascension', 'celestial-void']
            : VIP_BASIC_ORNAMENTS;
        localStorage.setItem('blackx.ownedShopItems', JSON.stringify(Array.from(new Set([...existingOwned, ...unlocked]))));
      } catch {}

      setRedeemCode('');
      onVipUpdated?.(res.user || { ...user, vipTier: newTier, vipExpiresAt: res.expiresAt });
      pushToast(
        lang === 'ar'
          ? `🎉 مبروك! تم تفعيل باقة ${newTier === 'vip_monarch' ? '🔮 VIP Monarch (إمبراطور الظلال)' : '⚡ VIP Basic (صياد النخبة)'} بنجاح وفتح الإطارات والسيرفرات الحصرية!`
          : `🎉 Activated ${newTier === 'vip_monarch' ? '🔮 VIP Monarch' : '⚡ VIP Basic'} membership!`,
        'success'
      );
    } catch (err) {
      pushToast(err.message || (lang === 'ar' ? 'كود الاشتراك غير صالح أو منتهي' : 'Invalid or expired code'), 'error');
    } finally {
      setRedeeming(false);
    }
  };

  const getPriceDisplay = (planKey) => {
    const p = EGP_PRICING[planKey];
    if (billingCycle === 'quarterly') {
      return { price: p.quarterly, periodAr: '/ 3 شهور', periodEn: '/ 3 Months', saveAr: 'وفر 17%', saveEn: 'Save 17%' };
    }
    if (billingCycle === 'yearly') {
      return { price: p.yearly, periodAr: '/ سنة كاملة', periodEn: '/ Year', saveAr: 'وفر 35%', saveEn: 'Save 35%' };
    }
    return { price: p.monthly, periodAr: '/ شهرياً', periodEn: '/ Month', saveAr: null, saveEn: null };
  };

  const basicPrice = getPriceDisplay('vip_basic');
  const monarchPrice = getPriceDisplay('vip_monarch');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Current User Membership Status Banner & Real Code Activation Bar */}
      <div
        className="glass"
        style={{
          padding: '1.75rem 2rem',
          borderRadius: '24px',
          background:
            currentTier === 'vip_monarch'
              ? 'linear-gradient(135deg, rgba(46, 16, 101, 0.92), rgba(15, 23, 42, 0.95))'
              : currentTier === 'vip_basic'
              ? 'linear-gradient(135deg, rgba(66, 32, 6, 0.88), rgba(15, 23, 42, 0.95))'
              : 'linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(9, 13, 24, 0.95))',
          border:
            currentTier === 'vip_monarch'
              ? '2px solid rgba(168, 85, 247, 0.65)'
              : currentTier === 'vip_basic'
              ? '2px solid rgba(234, 179, 8, 0.6)'
              : '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow:
            currentTier === 'vip_monarch'
              ? '0 0 38px rgba(168, 85, 247, 0.35)'
              : currentTier === 'vip_basic'
              ? '0 0 32px rgba(234, 179, 8, 0.25)'
              : 'none'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.35rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '0.3rem 0.9rem',
                  borderRadius: '999px',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  background:
                    currentTier === 'vip_monarch'
                      ? 'linear-gradient(135deg, #a855f7, #ec4899)'
                      : currentTier === 'vip_basic'
                      ? 'linear-gradient(135deg, #f59e0b, #eab308)'
                      : 'rgba(255,255,255,0.1)',
                  color: currentTier === 'vip_basic' ? '#090d16' : '#fff'
                }}
              >
                {currentTier === 'vip_monarch'
                  ? '🔮 VIP Monarch (إمبراطور الظلال)'
                  : currentTier === 'vip_basic'
                  ? '⚡ VIP Basic (صياد النخبة) 👑'
                  : '🆓 العضوية المجانية (Free Tier)'}
              </span>
              {user?.vipExpiresAt && (
                <span style={{ fontSize: '0.78rem', color: 'var(--cyan)', fontWeight: 700 }}>
                  ⏳ {lang === 'ar' ? 'ساري حتى:' : 'Valid until:'} {new Date(user.vipExpiresAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                </span>
              )}
            </div>
            <h2 style={{ margin: '0.5rem 0 0.25rem', fontSize: '1.5rem', fontWeight: 900 }}>
              {lang === 'ar' ? 'خطط اشتراكات VIP وتفعيل الأكواد الفورية' : 'VIP Membership Plans & Instant Code Activation'}
            </h2>
            <p style={{ margin: 0, color: 'var(--ink-dim)', fontSize: '0.9rem' }}>
              {lang === 'ar'
                ? 'اختر خطتك المناسبة بالجنيه المصري (ج.م) أو أدخل كود التفعيل المستلم من المطور لفتح جميع المميزات فوراً.'
                : 'Choose your plan in EGP or enter your subscription code to unlock all perks immediately.'}
            </p>
          </div>

          {/* Billing Cycle Selector */}
          <div
            style={{
              display: 'inline-flex',
              padding: '0.3rem',
              borderRadius: '14px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              gap: '0.3rem'
            }}
          >
            {[
              { id: 'monthly', ar: 'شهري', en: 'Monthly' },
              { id: 'quarterly', ar: '3 شهور (-17%)', en: '3 Months (-17%)' },
              { id: 'yearly', ar: 'سنوي (-35%)', en: 'Yearly (-35%)' }
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBillingCycle(b.id)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: billingCycle === b.id ? 'linear-gradient(135deg, #06b6d4, #8b5cf6)' : 'transparent',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                {lang === 'ar' ? b.ar : b.en}
              </button>
            ))}
          </div>
        </div>

        {/* Instant VIP Code Redemption Form */}
        <form
          onSubmit={handleRedeem}
          style={{
            display: 'flex',
            gap: '0.65rem',
            flexWrap: 'wrap',
            padding: '1rem 1.15rem',
            borderRadius: '16px',
            background: 'rgba(0, 0, 0, 0.42)',
            border: '1px solid rgba(34, 211, 238, 0.35)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
            <span style={{ fontSize: '1.35rem' }}>🔑</span>
            <input
              type="text"
              className="input"
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              placeholder={
                lang === 'ar'
                  ? 'أدخل كود اشتراك VIP هنا (مثال: BX-MONARCH-XXXX-XXXX)...'
                  : 'Enter VIP Subscription Code (e.g. BX-MONARCH-XXXX-XXXX)...'
              }
              style={{
                flex: 1,
                fontFamily: 'monospace',
                fontWeight: 900,
                letterSpacing: '0.06em',
                fontSize: '0.95rem',
                background: 'rgba(255,255,255,0.05)'
              }}
            />
          </div>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={redeeming || !redeemCode.trim()}
            style={{
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              color: '#041016',
              fontWeight: 900,
              padding: '0.7rem 1.4rem',
              borderRadius: '12px'
            }}
          >
            ⚡ {redeeming ? (lang === 'ar' ? 'جارٍ التفعيل...' : 'Activating...') : (lang === 'ar' ? 'تفعيل كود الاشتراك الآن' : 'Redeem VIP Code')}
          </button>
        </form>
      </div>

      {/* 3-Tier Plan Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(295px, 1fr))',
          gap: '1.35rem',
          alignItems: 'stretch'
        }}
      >
        {/* 1. FREE PLAN */}
        <div
          className="glass"
          style={{
            padding: '1.65rem',
            borderRadius: '22px',
            border: currentTier === 'free' ? '2px solid rgba(148, 163, 184, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1.25rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', letterSpacing: '0.08em' }}>
                FREE HUNTER • الحدود المجانية
              </span>
              {currentTier === 'free' && (
                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '99px', background: 'rgba(255,255,255,0.1)' }}>
                  {lang === 'ar' ? 'خطتك الحالية' : 'Current Plan'}
                </span>
              )}
            </div>

            <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.35rem', fontWeight: 900 }}>
              🆓 {lang === 'ar' ? 'العضوية المجانية (مبتدئ)' : 'Free Standard Member'}
            </h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', margin: '0.85rem 0 1.25rem' }}>
              <span style={{ fontSize: '2.1rem', fontWeight: 900, color: '#fff' }}>0</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--ink-dim)' }}>
                {lang === 'ar' ? 'ج.م / للأبد' : 'EGP / Forever'}
              </span>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.86rem' }}>
              <li style={{ display: 'flex', gap: '0.5rem', color: '#cbd5e1' }}>
                <span>✔️</span> {lang === 'ar' ? 'مشاهدة الحلقات بجودة قياسية 720p / 1080p' : 'Standard 720p / 1080p streaming'}
              </li>
              <li style={{ display: 'flex', gap: '0.5rem', color: '#cbd5e1' }}>
                <span>✔️</span> {lang === 'ar' ? 'الانضمام لغرف المشاهدة العامة (بحد أقصى 5 مشاهدين)' : 'Public Watch Party rooms (max 5 viewers)'}
              </li>
              <li style={{ display: 'flex', gap: '0.5rem', color: '#cbd5e1' }}>
                <span>✔️</span> {lang === 'ar' ? 'زخرفة افتراضية واحدة + 3 رسائل صوتية يومياً' : '1 default ornament + 3 voice notes/day'}
              </li>
              <li style={{ display: 'flex', gap: '0.5rem', color: '#64748b' }}>
                <span>🔒</span> {lang === 'ar' ? 'بدون سيرفرات VIP Fast CDN أو دقة 4K HDR 60fps' : 'No VIP Fast CDN or 4K HDR 60fps'}
              </li>
              <li style={{ display: 'flex', gap: '0.5rem', color: '#64748b' }}>
                <span>🔒</span> {lang === 'ar' ? 'بدون غرف خاصة أو وصول مبكر للحلقات والفصول' : 'No Private Rooms or Early Access'}
              </li>
            </ul>
          </div>

          <button
            type="button"
            disabled
            className="btn btn--ghost"
            style={{ width: '100%', justifyContent: 'center', opacity: 0.7 }}
          >
            {currentTier === 'free'
              ? (lang === 'ar' ? '✓ مفعّلة افتراضياً' : '✓ Default Active')
              : (lang === 'ar' ? 'الحدود المجانية المشمولة' : 'Included in VIP')}
          </button>
        </div>

        {/* 2. VIP BASIC (صياد النخبة) */}
        <div
          className="glass"
          style={{
            padding: '1.65rem',
            borderRadius: '22px',
            background: 'linear-gradient(180deg, rgba(66, 32, 6, 0.45), rgba(15, 23, 42, 0.92))',
            border: currentTier === 'vip_basic' ? '2px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.45)',
            boxShadow: '0 18px 45px rgba(245, 158, 11, 0.14)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1.25rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span
                style={{
                  fontSize: '0.73rem',
                  fontWeight: 900,
                  padding: '0.22rem 0.7rem',
                  borderRadius: '99px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  border: '1px solid rgba(245, 158, 11, 0.5)',
                  color: '#fde047'
                }}
              >
                ⚡ VIP BASIC • صياد النخبة
              </span>
              {basicPrice.saveAr && (
                <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#10b981' }}>
                  {lang === 'ar' ? basicPrice.saveAr : basicPrice.saveEn}
                </span>
              )}
            </div>

            <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.4rem', fontWeight: 900, color: '#fef08a' }}>
              ⚡ VIP Basic {lang === 'ar' ? '(صياد النخبة)' : '(Elite Hunter)'}
            </h3>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', margin: '0.85rem 0 1.25rem' }}>
              <span style={{ fontSize: '2.35rem', fontWeight: 900, color: '#fde047' }}>
                {formatNumber(basicPrice.price)}
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fef08a' }}>
                {lang === 'ar' ? `ج.م ${basicPrice.periodAr}` : `EGP ${basicPrice.periodEn}`}
              </span>
              {billingCycle === 'monthly' && (
                <span style={{ fontSize: '0.82rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                  150 ج.م
                </span>
              )}
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.7rem', fontSize: '0.88rem' }}>
              <li style={{ display: 'flex', gap: '0.55rem', color: '#fff', fontWeight: 700 }}>
                <span>👑</span> {lang === 'ar' ? 'شارة VIP الذهبية المميزة بجانب الاسم 👑' : 'Exclusive Golden VIP Badge next to your name 👑'}
              </li>
              <li style={{ display: 'flex', gap: '0.55rem', color: '#fff', fontWeight: 700 }}>
                <span>🚀</span> {lang === 'ar' ? 'سيرفرات فائقة السرعة VIP Fast CDN بدون ضغط' : 'Ultra-fast uncompressed VIP Fast CDN servers'}
              </li>
              <li style={{ display: 'flex', gap: '0.55rem', color: '#fff', fontWeight: 700 }}>
                <span>🔒</span> {lang === 'ar' ? 'إنشاء غرف مشاهدة جماعية خاصة مع رابط مخصص (25 مشاهد)' : 'Create Private Watch Party rooms with custom link'}
              </li>
              <li style={{ display: 'flex', gap: '0.55rem', color: '#fff', fontWeight: 700 }}>
                <span>🎨</span> {lang === 'ar' ? 'فتح 5 إطارات وزخارف كائنات حية حصرية لملف الحساب' : 'Unlock 5 exclusive living 3D avatar ornaments'}
              </li>
            </ul>
          </div>

          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setSelectedPlanModal({ tier: 'vip_basic', nameAr: '⚡ VIP Basic (صياد النخبة)', price: basicPrice.price, periodAr: basicPrice.periodAr })}
            style={{
              width: '100%',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #f59e0b, #eab308)',
              color: '#090d16',
              fontWeight: 900,
              padding: '0.8rem',
              borderRadius: '14px'
            }}
          >
            {currentTier === 'vip_basic' || currentTier === 'vip_monarch'
              ? (lang === 'ar' ? '✓ مفعّلة في حسابك — تجديد / ترقية' : '✓ Active in your account')
              : (lang === 'ar' ? `⚡ اشترك في VIP Basic (${basicPrice.price} ج.م)` : `⚡ Get VIP Basic (${basicPrice.price} EGP)`)}
          </button>
        </div>

        {/* 3. VIP MONARCH (إمبراطور الظلال) */}
        <div
          className="glass"
          style={{
            padding: '1.65rem',
            borderRadius: '22px',
            background: 'linear-gradient(180deg, rgba(59, 7, 100, 0.65), rgba(10, 12, 26, 0.96))',
            border: '2px solid #a855f7',
            boxShadow: '0 22px 55px rgba(168, 85, 247, 0.28)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1.25rem',
            position: 'relative'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-12px',
              insetInlineEnd: '20px',
              padding: '0.25rem 0.85rem',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              color: '#fff',
              fontSize: '0.72rem',
              fontWeight: 900,
              boxShadow: '0 4px 15px rgba(168, 85, 247, 0.6)'
            }}
          >
            🔥 {lang === 'ar' ? 'الأقوى والأكثر طلباً' : 'MOST POPULAR'}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span
                style={{
                  fontSize: '0.73rem',
                  fontWeight: 900,
                  padding: '0.22rem 0.7rem',
                  borderRadius: '99px',
                  background: 'rgba(168, 85, 247, 0.24)',
                  border: '1px solid rgba(168, 85, 247, 0.55)',
                  color: '#e9d5ff'
                }}
              >
                🔮 VIP MONARCH • إمبراطور الظلال
              </span>
              {monarchPrice.saveAr && (
                <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#22d3ee' }}>
                  {lang === 'ar' ? monarchPrice.saveAr : monarchPrice.saveEn}
                </span>
              )}
            </div>

            <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.42rem', fontWeight: 900, color: '#f3e8ff' }}>
              🔮 VIP Monarch {lang === 'ar' ? '(إمبراطور الظلال)' : '(Shadow Monarch)'}
            </h3>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', margin: '0.85rem 0 1.25rem' }}>
              <span style={{ fontSize: '2.45rem', fontWeight: 900, color: '#e9d5ff' }}>
                {formatNumber(monarchPrice.price)}
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#c084fc' }}>
                {lang === 'ar' ? `ج.م ${monarchPrice.periodAr}` : `EGP ${monarchPrice.periodEn}`}
              </span>
              {billingCycle === 'monthly' && (
                <span style={{ fontSize: '0.82rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                  320 ج.م
                </span>
              )}
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.7rem', fontSize: '0.88rem' }}>
              <li style={{ display: 'flex', gap: '0.55rem', color: '#e9d5ff', fontWeight: 800 }}>
                <span>🎬</span> {lang === 'ar' ? 'بث بدقة 4K HDR ومعدل إطارات 60fps فائق السلاسة' : 'True 4K HDR & 60fps ultra-smooth streaming'}
              </li>
              <li style={{ display: 'flex', gap: '0.55rem', color: '#e9d5ff', fontWeight: 800 }}>
                <span>⏳</span> {lang === 'ar' ? 'وصول مبكر للحلقات وفصول المانجا قبل نشرها للجميع' : 'Early Access to episodes & manga chapters before public release'}
              </li>
              <li style={{ display: 'flex', gap: '0.55rem', color: '#e9d5ff', fontWeight: 800 }}>
                <span>🪄</span> {lang === 'ar' ? 'استوديو الذكاء الاصطناعي 3D Prompt Studio مفتوح بالكامل' : 'Full access to AI 3D Prompt & Creature Studio'}
              </li>
              <li style={{ display: 'flex', gap: '0.55rem', color: '#e9d5ff', fontWeight: 800 }}>
                <span>🎙️</span> {lang === 'ar' ? 'غرف جماعية تتسع لـ 100 مشاهد + رسائل صوتية مفتوحة بلا حدود' : '100-viewer Watch Party rooms + Unlimited Voice Notes'}
              </li>
              <li style={{ display: 'flex', gap: '0.55rem', color: '#fde047', fontWeight: 700 }}>
                <span>👑</span> {lang === 'ar' ? 'يشمل جميع مزايا باقة VIP Basic + كافة الإطارات والألقاب' : 'Includes all VIP Basic perks + all mythic ornaments'}
              </li>
            </ul>
          </div>

          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setSelectedPlanModal({ tier: 'vip_monarch', nameAr: '🔮 VIP Monarch (إمبراطور الظلال)', price: monarchPrice.price, periodAr: monarchPrice.periodAr })}
            style={{
              width: '100%',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              color: '#fff',
              fontWeight: 900,
              padding: '0.85rem',
              borderRadius: '14px',
              boxShadow: '0 0 22px rgba(168, 85, 247, 0.5)'
            }}
          >
            {currentTier === 'vip_monarch'
              ? (lang === 'ar' ? '🔮 باقة Monarch مفعّلة على حسابك ✓' : '🔮 VIP Monarch Active ✓')
              : (lang === 'ar' ? `🔮 اشترك في VIP Monarch (${monarchPrice.price} ج.م)` : `🔮 Get VIP Monarch (${monarchPrice.price} EGP)`)}
          </button>
        </div>
      </div>

      {/* Unlocked Perks Interactive Controls (3D Prompt Studio for Monarch + 5 Exclusive VIP Frames for Basic/Monarch) */}
      {(currentTier === 'vip_basic' || currentTier === 'vip_monarch') && (
        <div
          className="glass"
          style={{
            padding: '1.6rem',
            borderRadius: '22px',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            background: 'rgba(15, 23, 42, 0.85)'
          }}
        >
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.15rem', fontWeight: 900, color: '#fde047' }}>
            👑 {lang === 'ar' ? 'الـ 5 إطارات الحصرية المفتوحة لعضويتك (VIP Exclusive Frames)' : 'Your 5 Unlocked VIP Exclusive Ornaments'}
          </h3>
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            {[
              { id: 'royal-flame', name: '🔥 تنين اللهب الملكي' },
              { id: 'shadow-monarch', name: '👑 عاهل الظلال' },
              { id: 'cyber-neon', name: '⚡ درون السايبربانك' },
              { id: 'imperial-gold', name: '⚜️ العنقاء الذهبية' },
              { id: 'sakura-blossom', name: '🌸 ثعلب الساكورا' }
            ].map((fr) => (
              <button
                key={fr.id}
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  onSelectFrame?.(fr.id);
                  api.put('/api/profile/customize', { frameStyle: fr.id }).catch(() => {});
                  pushToast(lang === 'ar' ? `👑 تم تجهيز إطار VIP الحصري: ${fr.name}` : `Equipped ${fr.name}`, 'success');
                }}
                style={{
                  borderColor: 'rgba(250, 204, 21, 0.45)',
                  color: '#fef08a',
                  fontWeight: 800
                }}
              >
                {fr.name} — {lang === 'ar' ? 'تجهيز فوري' : 'Equip'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* VIP Monarch Exclusive: AI 3D Prompt Studio */}
      {currentTier === 'vip_monarch' && (
        <div
          className="glass"
          style={{
            padding: '1.75rem',
            borderRadius: '22px',
            border: '1px solid rgba(168, 85, 247, 0.55)',
            background: 'linear-gradient(135deg, rgba(46, 16, 101, 0.6), rgba(9, 12, 24, 0.95))'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#c084fc', letterSpacing: '0.1em' }}>
                🔮 MONARCH EXCLUSIVE • استوديو إمبراطور الظلال
              </span>
              <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.25rem', fontWeight: 900 }}>
                🪄 استوديو الذكاء الاصطناعي (AI 3D Prompt & Creature Studio)
              </h3>
            </div>
            <span className="badge" style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', fontWeight: 900 }}>
              ✓ مفتوح لحساب Monarch
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="input"
              value={studioPrompt}
              onChange={(e) => setStudioPrompt(e.target.value)}
              placeholder="صف الهالة أو الكائن الثلاثي الأبعاد المراد توليده لحسابك..."
              style={{ flex: 1, minWidth: '240px' }}
            />
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                const lower = studioPrompt.toLowerCase();
                const chosen = lower.includes('cyber') || lower.includes('ليزر')
                  ? 'cyber-neon'
                  : lower.includes('gold') || lower.includes('ذهب')
                  ? 'imperial-gold'
                  : lower.includes('dragon') || lower.includes('نار')
                  ? 'royal-flame'
                  : 'shadow-monarch';
                setStudioGenerated({ prompt: studioPrompt, ornament: chosen });
                onSelectFrame?.(chosen);
                pushToast('🪄 تم توليد وتطبيق التكوين الثلاثي الأبعاد من استوديو Monarch!', 'success');
              }}
              style={{ background: 'linear-gradient(135deg, #a855f7, #06b6d4)', fontWeight: 900 }}
            >
              🪄 توليد وتطبيق فوري 3D
            </button>
          </div>
          {studioGenerated && (
            <div style={{ marginTop: '0.85rem', fontSize: '0.82rem', color: '#e9d5ff' }}>
              ✨ تم ربط نموذج <strong>{studioGenerated.ornament}</strong> بالوصف: <em>"{studioGenerated.prompt}"</em> وتطبيقه على صورتك وبانر حسابك!
            </div>
          )}
        </div>
      )}

      {/* Payment & Instant Activation Modal in Egyptian Pounds (EGP) */}
      {selectedPlanModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(10px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 250,
            padding: '1rem'
          }}
          onClick={() => setSelectedPlanModal(null)}
        >
          <div
            className="glass"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: '2rem',
              borderRadius: '24px',
              background: '#090d1a',
              border: '1px solid rgba(168, 85, 247, 0.5)',
              boxShadow: '0 25px 70px rgba(0,0,0,0.9)'
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.35rem', fontWeight: 900 }}>
              💳 الاشتراك في {selectedPlanModal.nameAr}
            </h3>
            <p style={{ margin: '0 0 1.25rem', color: 'var(--cyan)', fontWeight: 800, fontSize: '1.1rem' }}>
              المبلغ المطلوب: {selectedPlanModal.price} جنيه مصري ({selectedPlanModal.periodAr})
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.35rem', fontSize: '0.88rem', color: '#cbd5e1' }}>
              <div style={{ padding: '0.85rem', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                📱 <strong>فودافون كاش / اتصالات كاش / أورانج كاش (Vodafone Cash):</strong>
                <div style={{ color: 'var(--ink-dim)', marginTop: '0.25rem' }}>
                  حوّل قيمة الباقة واستلم كود التفعيل الفوري (`BX-...`) لتفعيله في الخانة المخصصة أعلاه بضغطة زر.
                </div>
              </div>
              <div style={{ padding: '0.85rem', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                🏦 <strong>إنستاباي مصر (InstaPay EGP):</strong>
                <div style={{ color: 'var(--ink-dim)', marginTop: '0.25rem' }}>
                  تحويل لحظي بالجنيه المصري مع استلام كود الاشتراك الفوري من إدارة المنصة.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setSelectedPlanModal(null)}
              >
                إغلاق
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  const codeHint = selectedPlanModal.tier === 'vip_monarch' ? 'BX-MONARCH-2026-MAX' : 'BX-BASIC-2026-VIP';
                  setRedeemCode(codeHint);
                  setSelectedPlanModal(null);
                  pushToast('🔑 تم وضع كود التفعيل في الخانة! اضغط على «تفعيل كود الاشتراك الآن» للتجربة الفورية.', 'info');
                }}
                style={{ background: 'linear-gradient(135deg, #a855f7, #06b6d4)', fontWeight: 900 }}
              >
                🔑 لدي كود تفعيل جاهز
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * REAL Developer VIP Subscription Code Generator & Manager (inside Developer Dashboard)
 */
export function DevVipCodeGenerator() {
  const { lang, formatNumber } = useI18n();
  const [codes, setCodes] = useState([]);
  const [stats, setStats] = useState({ totalCodes: 0, activeCodes: 0, totalRedemptions: 0, totalValueEgp: 0 });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Generator form state
  const [tier, setTier] = useState('vip_monarch');
  const [durationDays, setDurationDays] = useState(30);
  const [maxUses, setMaxUses] = useState(1);
  const [batchCount, setBatchCount] = useState(1);
  const [priceEgp, setPriceEgp] = useState(199);
  const [customPrefix, setCustomPrefix] = useState('');
  const [note, setNote] = useState('');
  const [lastGenerated, setLastGenerated] = useState([]);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/dev/vip-codes');
      if (res?.codes) setCodes(res.codes);
      if (res?.stats) setStats(res.stats);
    } catch {
      /* fallback */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  // Auto-update suggested Egyptian Pound (EGP) price when tier or duration changes
  useEffect(() => {
    const isMonarch = tier === 'vip_monarch';
    const d = Number(durationDays);
    if (d >= 36500) setPriceEgp(isMonarch ? 2999 : 1499);
    else if (d >= 365) setPriceEgp(isMonarch ? 1499 : 799);
    else if (d >= 90) setPriceEgp(isMonarch ? 499 : 249);
    else if (d <= 7) setPriceEgp(isMonarch ? 65 : 35);
    else setPriceEgp(isMonarch ? 199 : 99);
  }, [tier, durationDays]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await api.post('/api/dev/vip-codes/generate', {
        tier,
        durationDays: Number(durationDays),
        maxUses: Number(maxUses),
        count: Number(batchCount),
        priceEgp: Number(priceEgp),
        customPrefix: customPrefix.trim(),
        note: note.trim()
      });
      if (res?.generated?.length) {
        setLastGenerated(res.generated);
        setCodes((prev) => [...res.generated, ...prev]);
        setNote('');
        pushToast(
          `🔑 تم توليد ${res.generated.length} كود اشتراك حقيقي (${tier === 'vip_monarch' ? 'VIP Monarch 🔮' : 'VIP Basic ⚡'}) وحفظه في قاعدة البيانات!`,
          'success'
        );
        fetchCodes();
      }
    } catch (err) {
      pushToast(err.message || 'فشل توليد الكود', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteCode = async (id) => {
    try {
      await api.delete(`/api/dev/vip-codes/${id}`);
      setCodes((prev) => prev.filter((c) => c.id !== id));
      pushToast('🗑️ تم حذف/إلغاء كود الاشتراك', 'info');
    } catch (err) {
      pushToast(err.message || 'Delete failed', 'error');
    }
  };

  const copyWhatsAppMessage = (c) => {
    const planLabel = c.tier === 'vip_monarch' ? '🔮 VIP Monarch (إمبراطور الظلال - 4K HDR)' : '⚡ VIP Basic (صياد النخبة)';
    const msg = `🎉 مرحباً بك في منصة BLACK X!\nتم إصدار كود اشتراكك الرسمي:\n\n👑 الباقة: ${planLabel}\n🔑 كود التفعيل: ${c.code}\n⏳ المدة: ${c.durationDays >= 36500 ? 'مدى الحياة' : `${c.durationDays} يوم`}\n💰 القيمة: ${c.priceEgp} ج.م\n\nلتفعيل الكود: افتح حسابك في BLACK X ⬅️ قسم باقات VIP ⬅️ الصق الكود واضغط تفعيل الآن!`;
    navigator.clipboard?.writeText(msg);
    pushToast('💬 تم نسخ رسالة التفعيل الجاهزة لإرسالها للمشترك (واتساب / تيليجرام)!', 'success');
  };

  return (
    <div
      className="glass"
      style={{
        padding: '2.25rem',
        borderRadius: '22px',
        border: '2px solid rgba(168, 85, 247, 0.45)',
        background: 'linear-gradient(180deg, rgba(24, 12, 48, 0.72), rgba(8, 11, 22, 0.95))'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🔑</span>
            <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900 }}>
              {lang === 'ar'
                ? 'مولد أكواد اشتراكات VIP الحقيقي (Developer Subscription Code Generator)'
                : 'Real VIP Subscription Code Generator'}
            </h2>
          </div>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--ink-dim)', fontSize: '0.88rem' }}>
            {lang === 'ar'
              ? 'قم بتوليد أكواد تفعيل حقيقية مرتبطة بقاعدة البيانات لباقات صياد النخبة (VIP Basic) وإمبراطور الظلال (VIP Monarch) بالجنيه المصري.'
              : 'Generate real database-backed VIP codes for VIP Basic and VIP Monarch plans in Egyptian Pounds (EGP).'}
          </p>
        </div>

        {/* Revenue & Codes Summary Pills */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <div style={{ padding: '0.55rem 1rem', borderRadius: '14px', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(34,211,238,0.35)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--ink-dim)' }}>الأكواد المتاحة</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--cyan)' }}>{stats.activeCodes} / {stats.totalCodes}</div>
          </div>
          <div style={{ padding: '0.55rem 1rem', borderRadius: '14px', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(16,185,129,0.35)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--ink-dim)' }}>إجمالي التفعيلات</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#10b981' }}>{formatNumber(stats.totalRedemptions)} تفعيل</div>
          </div>
          <div style={{ padding: '0.55rem 1rem', borderRadius: '14px', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(250,204,21,0.4)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--ink-dim)' }}>عائد التفعيلات</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fde047' }}>{formatNumber(stats.totalValueEgp)} ج.م</div>
          </div>
        </div>
      </div>

      {/* Code Generation Form */}
      <form
        onSubmit={handleGenerate}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))',
          gap: '1rem',
          padding: '1.35rem',
          borderRadius: '18px',
          background: 'rgba(0, 0, 0, 0.42)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          marginBottom: '1.5rem'
        }}
      >
        <div>
          <label className="label" style={{ fontSize: '0.78rem' }}>👑 نوع الباقة (VIP Tier)</label>
          <select className="input" value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="vip_basic">⚡ VIP Basic — صياد النخبة (99 ج.م)</option>
            <option value="vip_monarch">🔮 VIP Monarch — إمبراطور الظلال (199 ج.م)</option>
          </select>
        </div>

        <div>
          <label className="label" style={{ fontSize: '0.78rem' }}>⏳ مدة الاشتراك</label>
          <select className="input" value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))}>
            <option value={7}>7 أيام (أسبوعي)</option>
            <option value={30}>30 يوم (شهر كامل)</option>
            <option value={90}>90 يوم (3 شهور)</option>
            <option value={365}>365 يوم (سنة كاملة)</option>
            <option value={36500}>مدى الحياة (Lifetime ♾️)</option>
          </select>
        </div>

        <div>
          <label className="label" style={{ fontSize: '0.78rem' }}>💰 السعر بالجنيه المصري (ج.م)</label>
          <input
            type="number"
            className="input"
            min={0}
            value={priceEgp}
            onChange={(e) => setPriceEgp(e.target.value)}
          />
        </div>

        <div>
          <label className="label" style={{ fontSize: '0.78rem' }}>👥 عدد المستخدمين المسموح للكود</label>
          <select className="input" value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))}>
            <option value={1}>مستخدم واحد فقط (1 Use)</option>
            <option value={5}>5 مستخدمين (هدية مجموعة)</option>
            <option value={10}>10 مستخدمين</option>
            <option value={50}>50 مستخدم (مسابقة المجتمع)</option>
            <option value={100}>100 مستخدم</option>
          </select>
        </div>

        <div>
          <label className="label" style={{ fontSize: '0.78rem' }}>📦 عدد الأكواد المراد توليدها</label>
          <select className="input" value={batchCount} onChange={(e) => setBatchCount(Number(e.target.value))}>
            <option value={1}>كود واحد (1 Code)</option>
            <option value={5}>دفعة 5 أكواد</option>
            <option value={10}>دفعة 10 أكواد</option>
            <option value={25}>دفعة 25 كود</option>
          </select>
        </div>

        <div>
          <label className="label" style={{ fontSize: '0.78rem' }}>📝 ملاحظة (اسم المشترك / فودافون كاش)</label>
          <input
            type="text"
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="مثال: فودافون كاش - أحمد..."
          />
        </div>

        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--ink-dim)' }}>بادئة الكود (اختياري):</span>
            <input
              type="text"
              className="input input--sm"
              style={{ width: '150px', fontFamily: 'monospace' }}
              value={customPrefix}
              onChange={(e) => setCustomPrefix(e.target.value.toUpperCase())}
              placeholder={tier === 'vip_monarch' ? 'BX-MONARCH' : 'BX-BASIC'}
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary"
            disabled={generating}
            style={{
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              color: '#fff',
              fontWeight: 900,
              padding: '0.8rem 1.75rem',
              borderRadius: '14px',
              boxShadow: '0 0 24px rgba(168, 85, 247, 0.5)'
            }}
          >
            ⚡ {generating ? 'جارٍ التوليد...' : `توليد ${batchCount > 1 ? `${batchCount} أكواد` : 'كود اشتراك جديد'} الآن`}
          </button>
        </div>
      </form>

      {/* Newly Generated Code Highlight Box */}
      {lastGenerated.length > 0 && (
        <div
          style={{
            padding: '1.15rem 1.35rem',
            borderRadius: '16px',
            background: 'rgba(16, 185, 129, 0.14)',
            border: '1px solid rgba(16, 185, 129, 0.5)',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ fontWeight: 900, color: '#34d399', marginBottom: '0.6rem', fontSize: '0.92rem' }}>
            ✨ تم توليد الأكواد التالية بنجاح — جاهزة للنسخ والإرسال للمشترك:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {lastGenerated.map((g) => (
              <div
                key={g.code}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(0,0,0,0.55)',
                  border: '1px solid rgba(52, 211, 153, 0.5)'
                }}
              >
                <code style={{ fontWeight: 900, color: '#fff', fontSize: '0.95rem', letterSpacing: '0.06em' }}>{g.code}</code>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(g.code);
                    pushToast(`📋 تم نسخ الكود: ${g.code}`, 'success');
                  }}
                  style={{ padding: '0.2rem 0.55rem', fontSize: '0.74rem' }}
                >
                  📋 نسخ
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => copyWhatsAppMessage(g)}
                  style={{ padding: '0.2rem 0.65rem', fontSize: '0.74rem' }}
                >
                  💬 رسالة واتساب
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Codes Database Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', textAlign: 'start', color: 'var(--ink-dim)' }}>
              <th style={{ padding: '0.7rem' }}>الكود (Code)</th>
              <th style={{ padding: '0.7rem' }}>الباقة</th>
              <th style={{ padding: '0.7rem' }}>المدة والسعر</th>
              <th style={{ padding: '0.7rem' }}>الاستخدام</th>
              <th style={{ padding: '0.7rem' }}>ملاحظة / من فعّله</th>
              <th style={{ padding: '0.7rem' }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => {
              const exhausted = (c.usedCount || 0) >= (c.maxUses || 1);
              return (
                <tr key={c.id || c.code} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <code
                      style={{
                        fontWeight: 900,
                        fontSize: '0.9rem',
                        color: exhausted ? '#94a3b8' : '#22d3ee',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '0.25rem 0.55rem',
                        borderRadius: '8px'
                      }}
                    >
                      {c.code}
                    </code>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '99px',
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        background: c.tier === 'vip_monarch' ? 'rgba(168,85,247,0.22)' : 'rgba(245,158,11,0.2)',
                        color: c.tier === 'vip_monarch' ? '#e9d5ff' : '#fde047',
                        border: c.tier === 'vip_monarch' ? '1px solid #a855f7' : '1px solid #f59e0b'
                      }}
                    >
                      {c.tier === 'vip_monarch' ? '🔮 VIP Monarch' : '⚡ VIP Basic'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', fontWeight: 700 }}>
                    {c.durationDays >= 36500 ? 'مدى الحياة ♾️' : `${c.durationDays} يوم`} •{' '}
                    <span style={{ color: '#fde047' }}>{c.priceEgp} ج.م</span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ color: exhausted ? '#ef4444' : '#10b981', fontWeight: 800 }}>
                      {exhausted ? '🔴 مستخدم بالكامل' : '🟢 متاح للتفعيل'} ({c.usedCount || 0}/{c.maxUses || 1})
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--ink-dim)', fontSize: '0.78rem' }}>
                    {c.note && <div>📝 {c.note}</div>}
                    {Array.isArray(c.redeemedBy) && c.redeemedBy.length > 0 && (
                      <div style={{ color: '#34d399', fontWeight: 700 }}>
                        ✓ فعّله: {c.redeemedBy.map((r) => `@${r.username}`).join(', ')}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => {
                          navigator.clipboard?.writeText(c.code);
                          pushToast(`📋 تم نسخ الكود: ${c.code}`, 'success');
                        }}
                        style={{ padding: '0.25rem 0.55rem', fontSize: '0.74rem' }}
                      >
                        📋 نسخ
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => copyWhatsAppMessage(c)}
                        style={{ padding: '0.25rem 0.55rem', fontSize: '0.74rem', color: '#34d399' }}
                      >
                        💬 رسالة
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => handleDeleteCode(c.id)}
                        style={{ padding: '0.25rem 0.55rem', fontSize: '0.74rem', color: '#ef4444' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
