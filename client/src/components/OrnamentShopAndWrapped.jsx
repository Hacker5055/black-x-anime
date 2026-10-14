import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { LiveCreatureOverlay } from './LiveAvatarOrnament.jsx';
import { VerifiedBadge } from './UserBadges.jsx';
import { api } from '../api.js';
import { pushToast } from '../hooks/hooks.js';

const SHOP_ITEMS = [
  {
    id: 'royal-flame',
    category: 'frame',
    nameAr: 'تنين اللهب الإمبراطوري الحي 🔥',
    nameEn: 'Imperial Fire Dragon (Live) 🔥',
    descAr: 'تنين مفصلي يسبح حول صورتك ويفتح فكيه لينفث سيلاً من اللهب الحجمي المتدرج',
    descEn: 'Articulated dragon that orbits your avatar and breathes volumetric fire',
    price: 400,
    rarity: 'MYTHIC',
    color: '#ff5500'
  },
  {
    id: 'shadow-monarch',
    category: 'frame',
    nameAr: 'عاهل الظلال — سولو ليفلينج 👑',
    nameEn: 'Shadow Monarch Arise (Live) 👑',
    descAr: 'فارس ظلال مدرّع يرتفع خلف صورتك ويمزق المحيط بنصلي الظلال الأرجوانيين',
    descEn: 'Armored shadow knight with glowing eyes and dual shadow dagger slashes',
    price: 500,
    rarity: 'MONARCH',
    color: '#a855f7'
  },
  {
    id: 'cyber-neon',
    category: 'frame',
    nameAr: 'حارس السايبربانك الآلي ⚡',
    nameEn: 'Cyberpunk Mecha-Drone (Live) ⚡',
    descAr: 'درون ميكا بأجنحة متحركة يطوف حول الحساب ويمسحه بشعاع ليزر وبلازما',
    descEn: 'Winged mecha sentinel drone with laser scan and plasma cannons',
    price: 450,
    rarity: 'LEGENDARY',
    color: '#00f2fe'
  },
  {
    id: 'dragon-ascension',
    category: 'frame',
    nameAr: 'التنين السماوي الزمردي 🐉',
    nameEn: 'Emerald Shenlong Dragon 🐉',
    descAr: 'تنين سماوي زمردي يلتف حول الحساب وينفث لهباً أخضر زمردياً مضيئاً',
    descEn: 'Celestial emerald dragon that breathes jade dragonfire around your avatar',
    price: 550,
    rarity: 'MYTHIC',
    color: '#10b981'
  },
  {
    id: 'imperial-gold',
    category: 'frame',
    nameAr: 'العنقاء والتنين الإمبراطوري الذهبي ⚜️',
    nameEn: 'Golden Imperial Sovereign ⚜️',
    descAr: 'زخرفة ملكية ذهبية حية تطلق لهباً شمسياً ذهبياً حول إطار صورتك',
    descEn: 'Sovereign golden dragon ornament breathing molten solar gold flames',
    price: 600,
    rarity: 'SOVEREIGN',
    color: '#eab308'
  },
  {
    id: 'sakura-blossom',
    category: 'frame',
    nameAr: 'ثعلب الكيتسوني وأزهار الساكورا 🌸',
    nameEn: 'Sakura Kitsune Spirit 🌸',
    descAr: 'روح الكيتسوني الوردية تطوف حول الحساب وتنفث نيران الساكورا المتوهجة',
    descEn: 'Spirit foxfire swirling with glowing pink sakura petals',
    price: 380,
    rarity: 'EPIC',
    color: '#f472b6'
  },
  {
    id: 'celestial-void',
    category: 'frame',
    nameAr: 'أفعى الرعد والفضاء الكوني 🌌',
    nameEn: 'Celestial Thunder Serpent 🌌',
    descAr: 'ثعبان برق كوني يلتف بسرعة خاطفة ويضرب حواف الحساب بصواعق متفرعة',
    descEn: 'Astral lightning serpent striking branching cosmic thunderbolts',
    price: 520,
    rarity: 'MYTHIC',
    color: '#38bdf8'
  },
  // Exclusive Titles
  {
    id: 'title:Monarch of Shadows 👑',
    category: 'title',
    titleTextAr: 'عاهل الظلال المطلق 👑',
    titleTextEn: 'Monarch of Shadows 👑',
    nameAr: 'لقب: عاهل الظلال المطلق 👑',
    nameEn: 'Title: Monarch of Shadows 👑',
    descAr: 'لقب ملكي متوهج يظهر بجانب اسمك في الملف الشخصي وبطاقة المجتمع',
    descEn: 'Glowing sovereign badge displayed on your profile header and hover card',
    price: 300,
    rarity: 'TITLE',
    color: '#a855f7'
  },
  {
    id: 'title:Dragon Emperor 🔥',
    category: 'title',
    titleTextAr: 'إمبراطور لهب التنين 🔥',
    titleTextEn: 'Dragon Flame Emperor 🔥',
    nameAr: 'لقب: إمبراطور لهب التنين 🔥',
    nameEn: 'Title: Dragon Flame Emperor 🔥',
    descAr: 'لقب ناري أسطوري يميز حسابك في المنصة والمجتمع',
    descEn: 'Fiery mythic title badge for your profile and community posts',
    price: 300,
    rarity: 'TITLE',
    color: '#ff5500'
  },
  {
    id: 'title:S-Rank Hunter ⚡',
    category: 'title',
    titleTextAr: 'صائد الرتبة S العالمي ⚡',
    titleTextEn: 'S-Rank Global Hunter ⚡',
    nameAr: 'لقب: صائد الرتبة S العالمي ⚡',
    nameEn: 'Title: S-Rank Global Hunter ⚡',
    descAr: 'لقب خاص بنخبة مشاهدي الأنمي وقراء المانجا في BLACK X',
    descEn: 'Elite S-Rank Hunter badge for top anime & manga enthusiasts',
    price: 250,
    rarity: 'TITLE',
    color: '#22d3ee'
  }
];

export function OrnamentShop({
  user,
  gamificationStats,
  frameStyle,
  onSelectFrame,
  bannerStyle,
  onSelectBanner,
  customTitle,
  onSelectTitle
}) {
  const { lang, formatNumber } = useI18n();
  const [filterCat, setFilterCat] = useState('all');

  const baseShards = (gamificationStats?.points || (gamificationStats?.totalWatchTimeMin || 0) * 5 || (user?.watchTimeMinutes || 0) * 5 || 0);
  const [spentShards, setSpentShards] = useState(() => {
    try { return Number(localStorage.getItem('blackx.spentShards') || 0); } catch { return 0; }
  });
  const [bonusShards, setBonusShards] = useState(() => {
    try { return Number(localStorage.getItem('blackx.bonusShards') || 0); } catch { return 0; }
  });
  const [ownedIds, setOwnedIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('blackx.ownedShopItems') || '[]');
      return Array.from(new Set(['royal-flame', 'shadow-monarch', ...saved]));
    } catch {
      return ['royal-flame', 'shadow-monarch'];
    }
  });
  const [claimedToday, setClaimedToday] = useState(() => {
    try {
      return localStorage.getItem('blackx.dailyShardDate') === new Date().toISOString().slice(0, 10);
    } catch {
      return false;
    }
  });

  const currentShards = Math.max(0, baseShards + bonusShards - spentShards);

  const handleClaimDaily = () => {
    if (claimedToday) return;
    const nextBonus = bonusShards + 350;
    setBonusShards(nextBonus);
    setClaimedToday(true);
    try {
      localStorage.setItem('blackx.bonusShards', String(nextBonus));
      localStorage.setItem('blackx.dailyShardDate', new Date().toISOString().slice(0, 10));
    } catch {}
    pushToast(
      lang === 'ar'
        ? '💎 تم استلام +350 شظية سوداء (Black Shards) مكافأة التفاعل اليومية!'
        : '💎 Claimed +350 Black Shards daily interaction bonus!',
      'success'
    );
  };

  const handleBuyOrEquip = (item) => {
    const isOwned = ownedIds.includes(item.id);
    if (!isOwned) {
      if (currentShards < item.price) {
        pushToast(
          lang === 'ar'
            ? '⚠️ رصيدك من الشظايا السوداء غير كافٍ! استلم المكافأة اليومية أو شاهد المزيد من الحلقات.'
            : '⚠️ Not enough Black Shards! Claim your daily bonus or watch more episodes.',
          'error'
        );
        return;
      }
      const nextSpent = spentShards + item.price;
      const nextOwned = [...ownedIds, item.id];
      setSpentShards(nextSpent);
      setOwnedIds(nextOwned);
      try {
        localStorage.setItem('blackx.spentShards', String(nextSpent));
        localStorage.setItem('blackx.ownedShopItems', JSON.stringify(nextOwned));
      } catch {}
    }

    if (item.category === 'frame') {
      onSelectFrame?.(item.id);
      api.put('/api/profile/customize', { frameStyle: item.id }).catch(() => {});
      pushToast(
        lang === 'ar'
          ? `🐉 تم تجهيز «${item.nameAr}» على صورة حسابك بنجاح!`
          : `🐉 Equipped "${item.nameEn}" on your profile avatar!`,
        'success'
      );
    } else if (item.category === 'title') {
      const titleVal = lang === 'ar' ? item.titleTextAr : item.titleTextEn;
      onSelectTitle?.(titleVal);
      try { localStorage.setItem('blackx.customTitle', titleVal); } catch {}
      pushToast(
        lang === 'ar'
          ? `👑 تم تجهيز اللقب الحصري «${titleVal}» على حسابك!`
          : `👑 Equipped exclusive title "${titleVal}"!`,
        'success'
      );
    }
  };

  const visibleItems = SHOP_ITEMS.filter((it) => filterCat === 'all' || it.category === filterCat);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Wallet & Daily Bonus Banner */}
      <div
        className="glass"
        style={{
          padding: '1.6rem 2rem',
          borderRadius: '22px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(46, 16, 101, 0.78))',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.8rem' }}>💎</span>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>
              {lang === 'ar' ? 'متجر الزخارف الحية والألقاب (Black Shards Shop)' : 'Black Shards Ornament & Title Shop'}
            </h2>
          </div>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--ink-dim)', fontSize: '0.9rem' }}>
            {lang === 'ar'
              ? 'استبدل نقاط تفاعلك ومشاهدتك للحلقات والمانجا بكائنات ثلاثية الأبعاد حية وألقاب ملكية حصرية مجاناً!'
              : 'Redeem your watch & reading XP for living 3D avatar creatures and exclusive sovereign titles!'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '16px',
              background: 'rgba(0, 0, 0, 0.48)',
              border: '1px solid rgba(34, 211, 238, 0.45)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem'
            }}
          >
            <span style={{ fontSize: '1.35rem' }}>💎</span>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--ink-dim)' }}>
                {lang === 'ar' ? 'رصيد الشظايا السوداء' : 'Your Black Shards'}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--cyan)' }}>
                {formatNumber(currentShards)} <span style={{ fontSize: '0.78rem' }}>SHARDS</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn--primary"
            disabled={claimedToday}
            onClick={handleClaimDaily}
            style={{
              background: claimedToday
                ? 'rgba(255,255,255,0.08)'
                : 'linear-gradient(135deg, #f59e0b, #ef4444)',
              color: '#fff',
              fontWeight: 800,
              borderRadius: '14px',
              padding: '0.75rem 1.25rem'
            }}
          >
            🎁 {claimedToday
              ? (lang === 'ar' ? '✓ تم استلام مكافأة اليوم' : '✓ Daily Bonus Claimed')
              : (lang === 'ar' ? 'استلام +350 💎 هدية اليوم' : 'Claim +350 💎 Daily Bonus')}
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        {[
          { id: 'all', labelAr: '🌟 كل المعروضات', labelEn: '🌟 All Items' },
          { id: 'frame', labelAr: '🐉 الكائنات والإطارات الحية', labelEn: '🐉 Living 3D Creatures' },
          { id: 'title', labelAr: '👑 الألقاب الملكية الحصرية', labelEn: '👑 Exclusive Titles' }
        ].map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip ${filterCat === c.id ? 'active' : ''}`}
            onClick={() => setFilterCat(c.id)}
            style={{ fontWeight: 800, padding: '0.5rem 1.1rem' }}
          >
            {lang === 'ar' ? c.labelAr : c.labelEn}
          </button>
        ))}
      </div>

      {/* Shop Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(265px, 1fr))',
          gap: '1.25rem'
        }}
      >
        {visibleItems.map((item) => {
          const isOwned = ownedIds.includes(item.id);
          const isEquipped =
            (item.category === 'frame' && frameStyle === item.id) ||
            (item.category === 'title' && (customTitle === item.titleTextAr || customTitle === item.titleTextEn));

          return (
            <div
              key={item.id}
              className="glass"
              style={{
                padding: '1.35rem',
                borderRadius: '20px',
                border: isEquipped ? `2px solid ${item.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: isEquipped ? `0 0 28px ${item.color}44` : 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      padding: '0.18rem 0.6rem',
                      borderRadius: '99px',
                      background: `${item.color}22`,
                      border: `1px solid ${item.color}66`,
                      color: item.color
                    }}
                  >
                    {item.rarity}
                  </span>
                  <span style={{ fontWeight: 900, color: '#fde047', fontSize: '0.88rem' }}>
                    {isOwned ? (lang === 'ar' ? '✓ مملوك' : '✓ OWNED') : `💎 ${item.price}`}
                  </span>
                </div>

                {/* Live Creature Preview Stage inside Card */}
                {item.category === 'frame' ? (
                  <div
                    style={{
                      position: 'relative',
                      width: '124px',
                      height: '124px',
                      margin: '0.5rem auto 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div
                      style={{
                        width: '84px',
                        height: '84px',
                        borderRadius: '50%',
                        background: '#0f172a',
                        border: `2px solid ${item.color}`,
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 900,
                        fontSize: '1.45rem',
                        color: '#fff',
                        overflow: 'hidden'
                      }}
                    >
                      {(user?.photoUrl || user?.photoURL) ? (
                        <img src={user.photoUrl || user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        (user?.displayName?.[0] || 'Z').toUpperCase()
                      )}
                    </div>
                    <LiveCreatureOverlay ornament={item.id} mode="frame" size={88} />
                  </div>
                ) : (
                  <div
                    style={{
                      height: '92px',
                      display: 'grid',
                      placeItems: 'center',
                      margin: '0.5rem 0 1rem',
                      borderRadius: '14px',
                      background: 'rgba(0,0,0,0.45)',
                      border: `1px dashed ${item.color}66`
                    }}
                  >
                    <span
                      style={{
                        padding: '0.4rem 1rem',
                        borderRadius: '99px',
                        background: `${item.color}28`,
                        border: `1px solid ${item.color}`,
                        color: '#fff',
                        fontWeight: 900,
                        fontSize: '0.92rem',
                        boxShadow: `0 0 18px ${item.color}55`
                      }}
                    >
                      {lang === 'ar' ? item.titleTextAr : item.titleTextEn}
                    </span>
                  </div>
                )}

                <h4 style={{ margin: '0 0 0.35rem', fontSize: '1rem', fontWeight: 800 }}>
                  {lang === 'ar' ? item.nameAr : item.nameEn}
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--ink-dim)', lineHeight: 1.5 }}>
                  {lang === 'ar' ? item.descAr : item.descEn}
                </p>
              </div>

              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => handleBuyOrEquip(item)}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: isEquipped
                    ? 'rgba(16, 185, 129, 0.22)'
                    : isOwned
                    ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
                    : `linear-gradient(135deg, ${item.color}, #ec4899)`,
                  border: isEquipped ? '1px solid #10b981' : 'none',
                  color: '#fff',
                  fontWeight: 800,
                  padding: '0.6rem'
                }}
              >
                {isEquipped
                  ? (lang === 'ar' ? '✓ مُجهّز حالياً على حسابك' : '✓ Currently Equipped')
                  : isOwned
                  ? (lang === 'ar' ? '⚡ تجهيز الآن' : '⚡ Equip Now')
                  : (lang === 'ar' ? `🔓 شراء وتجهيز (${item.price} 💎)` : `🔓 Unlock & Equip (${item.price} 💎)`)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * BLACK X Wrapped 2026 — Shareable & Downloadable Annual/Monthly Anime & Manga Summary Card
 */
export function WrappedCardPanel({
  user,
  stats,
  gamificationStats,
  bookmarks = [],
  readingHistory = [],
  userRatings = [],
  customTitle = 'Shadow Monarch 👑'
}) {
  const { lang, formatNumber } = useI18n();
  const [sharing, setSharing] = useState(false);

  const watchMinutes = gamificationStats?.totalWatchTimeMin || ((stats?.watchedEpisodes || 42) * 24);
  const watchHours = Math.max(12, Math.round(watchMinutes / 60));
  const chaptersRead = Math.max(28, (readingHistory?.length || 0) * 6 + (bookmarks?.length || 0) * 4 + 34);
  const episodesCount = Math.max(48, stats?.watchedEpisodes || 64);
  const level = gamificationStats?.currentLevel || 75;

  const handleDownloadPng = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');

    // Deep Cyber-Abyss Background
    const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
    bg.addColorStop(0, '#060712');
    bg.addColorStop(0.5, '#1e1035');
    bg.addColorStop(1, '#04060d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1080, 1350);

    // Glowing Aura Orbs
    const orb1 = ctx.createRadialGradient(540, 320, 20, 540, 320, 420);
    orb1.addColorStop(0, 'rgba(168, 85, 247, 0.42)');
    orb1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = orb1;
    ctx.fillRect(0, 0, 1080, 1350);

    // Border Frame
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.55)';
    ctx.lineWidth = 6;
    ctx.strokeRect(44, 44, 992, 1262);

    // Header
    ctx.fillStyle = '#22d3ee';
    ctx.font = '900 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BLACK X • WRAPPED 2026', 540, 135);

    // User Name & Handle
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px sans-serif';
    ctx.fillText(`${user?.displayName || user?.username || 'ZIAD AL SHAFY'} ✓`, 540, 255);

    ctx.fillStyle = '#c084fc';
    ctx.font = '800 34px sans-serif';
    ctx.fillText(`@${user?.username || 'Ziad007'} • ${customTitle} • LVL ${level}`, 540, 315);

    // Stats Boxes
    const statItems = [
      { label: 'HOURS WATCHED / ساعات المشاهدة', val: `${watchHours} hrs`, col: '#22d3ee' },
      { label: 'EPISODES COMPLETED / الحلقات', val: `${episodesCount} EP`, col: '#f472b6' },
      { label: 'MANGA CHAPTERS / فصول المانجا', val: `${chaptersRead} CH`, col: '#a855f7' },
      { label: 'GLOBAL RANK / التصنيف العالمي', val: 'TOP 1% 🌍', col: '#fde047' }
    ];

    statItems.forEach((st, idx) => {
      const y = 410 + idx * 185;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(120, y, 840, 145);
      ctx.strokeStyle = st.col;
      ctx.lineWidth = 3;
      ctx.strokeRect(120, y, 840, 145);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 26px sans-serif';
      ctx.fillText(st.label, 540, y + 52);

      ctx.fillStyle = st.col;
      ctx.font = '900 54px sans-serif';
      ctx.fillText(st.val, 540, y + 118);
    });

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 26px sans-serif';
    ctx.fillText('black-x-anime.me • Official Global Anime & Manga Card', 540, 1245);

    const link = document.createElement('a');
    link.download = `black-x-wrapped-${user?.username || 'profile'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    pushToast(
      lang === 'ar'
        ? '📥 تم توليد وتحميل بطاقة ملخصك السنوي (BLACK X Wrapped PNG) بنجاح!'
        : '📥 Downloaded your BLACK X Wrapped HD PNG card!',
      'success'
    );
  };

  const handleShareToCommunity = async () => {
    setSharing(true);
    try {
      const text = lang === 'ar'
        ? `📈 ملخصي على منصة BLACK X لعام 2026!\n⚡ المستوى: LVL ${level} (${customTitle})\n🎬 ساعات المشاهدة: ${watchHours} ساعة (${episodesCount} حلقة)\n📖 فصول المانجا والروايات المقروءة: ${chaptersRead} فصل\n🌍 الرتبة العالمية: ضمن أعلى 1% من عشاق الأنمي والمانجا!`
        : `📈 My 2026 BLACK X Wrapped!\n⚡ Level: LVL ${level} (${customTitle})\n🎬 Watch Time: ${watchHours} hrs (${episodesCount} episodes)\n📖 Manga Chapters Read: ${chaptersRead}\n🌍 Global Rank: Top 1% Worldwide!`;

      await api.post('/api/community/posts', {
        content: text,
        tag: 'general',
        tagName: '📈 ملخص BLACK X',
        authorName: user?.displayName || user?.username || 'ZIAD AL SHAFY',
        authorUsername: user?.username || '',
        authorAvatar: user?.photoUrl || user?.photoURL || '',
        authorRole: user?.role || 'user',
        uid: user?.uid || user?.id || user?.email
      });
      pushToast(
        lang === 'ar'
          ? '🚀 تمت مشاركة بطاقة ملخصك في مجتمع BLACK X بنجاح!'
          : '🚀 Shared your BLACK X Wrapped card to the Community!',
        'success'
      );
    } catch (err) {
      pushToast(err.message || 'Share error', 'error');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="glass" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid rgba(34, 211, 238, 0.3)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '2rem', alignItems: 'center' }}>
        {/* Left Visual Wrapped Card Preview */}
        <div
          style={{
            padding: '2rem 1.75rem',
            borderRadius: '24px',
            background: 'radial-gradient(circle at 50% 20%, rgba(168, 85, 247, 0.35), rgba(6, 8, 18, 0.96) 70%)',
            border: '2px solid rgba(34, 211, 238, 0.45)',
            boxShadow: '0 25px 65px rgba(0, 0, 0, 0.75)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.12em', color: 'var(--cyan)', marginBottom: '0.75rem' }}>
            ✨ BLACK X • OFFICIAL WRAPPED 2026 ✨
          </div>

          <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            {user?.displayName || user?.username}
            <VerifiedBadge isDev={user?.role === 'developer'} size={21} />
          </h2>
          <div style={{ color: '#c084fc', fontWeight: 800, fontSize: '0.88rem', marginTop: '0.25rem', marginBottom: '1.35rem' }}>
            @{user?.username} • {customTitle} • LVL {level}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.95rem', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(34,211,238,0.35)' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--cyan)' }}>{formatNumber(watchHours)}h</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--ink-dim)' }}>{lang === 'ar' ? 'ساعات مشاهدة الأنمي' : 'Anime Watch Hours'}</div>
            </div>
            <div style={{ padding: '0.95rem', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(168,85,247,0.35)' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#c084fc' }}>{formatNumber(chaptersRead)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--ink-dim)' }}>{lang === 'ar' ? 'فصول مانجا وروايات' : 'Chapters Read'}</div>
            </div>
            <div style={{ padding: '0.95rem', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(244,114,182,0.35)' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f472b6' }}>{formatNumber(episodesCount)}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--ink-dim)' }}>{lang === 'ar' ? 'حلقات مكتملة' : 'Episodes Completed'}</div>
            </div>
            <div style={{ padding: '0.95rem', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(250,204,21,0.4)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fde047' }}>TOP 1%</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--ink-dim)' }}>{lang === 'ar' ? 'التصنيف العالمي' : 'Global Percentile'}</div>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700 }}>
            🏆 {lang === 'ar' ? 'التصنيف المفضل: خيال مظلم وأكشن (Dark Fantasy & Action)' : 'Top Genre: Dark Fantasy & Action'}
          </div>
        </div>

        {/* Right Actions & Explanation */}
        <div>
          <h3 style={{ margin: '0 0 0.65rem', fontSize: '1.45rem', fontWeight: 900 }}>
            📈 {lang === 'ar' ? 'بطاقة ملخصك العالمي (BLACK X Wrapped)' : 'Your Global BLACK X Wrapped Card'}
          </h3>
          <p style={{ color: 'var(--ink-dim)', fontSize: '0.94rem', lineHeight: 1.65, marginBottom: '1.5rem' }}>
            {lang === 'ar'
              ? 'بطاقة جرافيكية تفاعلية تجمع إنجازاتك في مشاهدة الأنمي وقراءة المانجا والروايات ومستواك العالمي. يمكنك تحميلها كصورة عالية الدقة (PNG) أو نشرها بضغطة زر واحدة في المجتمع!'
              : 'An interactive graphic card summarizing your anime watch hours, manga chapters read, and global rank. Download it as an HD PNG or share it directly to the Community!'}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem' }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleDownloadPng}
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                color: '#fff',
                fontWeight: 800,
                padding: '0.8rem 1.4rem',
                borderRadius: '14px'
              }}
            >
              📥 {lang === 'ar' ? 'تحميل البطاقة كصورة PNG عالية الدقة' : 'Download HD PNG Card'}
            </button>

            <button
              type="button"
              className="btn btn--ghost"
              disabled={sharing}
              onClick={handleShareToCommunity}
              style={{
                borderColor: 'rgba(244, 114, 182, 0.5)',
                color: '#f472b6',
                fontWeight: 800,
                padding: '0.8rem 1.4rem',
                borderRadius: '14px'
              }}
            >
              ↗️ {sharing
                ? (lang === 'ar' ? 'جارٍ النشر...' : 'Sharing...')
                : (lang === 'ar' ? 'مشاركة الملخص في المجتمع' : 'Share Wrapped to Community')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
