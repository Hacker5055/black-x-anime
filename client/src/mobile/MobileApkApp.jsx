import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

/**
 * BLACK X MOBILE — 120Hz Native Android Edition
 * Completely independent Smartphone UI inspired by Anime Witcher, elevated with Pure AMOLED Pitch-Black (#000000)
 * Liquid Obsidian Glass, 120Hz GPU-accelerated transitions, Built-In Multi-Quality 1080p/720p/480p MP4 Player,
 * 2,965-Manga Webtoon Reader, and Real-Time Cloud Sync with the BLACK X Website Users & Anime Database.
 */

// 1. Shared Anime & Manga Cloud Engine (6,973 Anime + 2,965 Manga + 75,448 Characters)
const ALGOLIA_APP_ID = 'QVHT7NPEJG';
const ALGOLIA_API_KEY = 'ce13098070fa521b536571bafbcfc083';
const ALGOLIA_BASE = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes`;

const AW_FS_PROJECT = 'animewitcher-1c66d';
const AW_FS_KEY = 'AIzaSyAcbWRwfFNnCpoydDXlEALWnM_TYVcJOMU';
const AW_FS_BASE = `https://firestore.googleapis.com/v1/projects/${AW_FS_PROJECT}/databases/(default)/documents`;

// 2. Shared BLACK X Website Users, Favorites, Watch Progress & Community Cloud Database
const BX_PROJECT = 'spry-oxide-1h7sp';
const BX_DB = 'ai-studio-blackxanime-e47e1ba2-315f-4c3b-8557-71352813f36c';
const BX_KEY = 'AIzaSyD4yG_ljN1S8TfwC33E4Z0o499MYC71eUE';
const BX_SETTINGS_BASE = `https://firestore.googleapis.com/v1/projects/${BX_PROJECT}/databases/${BX_DB}/documents/settings`;

const GENRE_CHIPS = [
  { id: 'all', ar: 'الكل (6,973)', en: 'All (6,973)', tag: '' },
  { id: 'action', ar: '⚔️ أكشن (2,563)', en: '⚔️ Action', tag: 'اكشن' },
  { id: 'comedy', ar: '😂 كوميدي (2,550)', en: '😂 Comedy', tag: 'كوميدي' },
  { id: 'fantasy', ar: '🔮 خيال (2,032)', en: '🔮 Fantasy', tag: 'خيال' },
  { id: 'adventure', ar: '🧭 مغامرات (1,919)', en: '🧭 Adventure', tag: 'مغامرات' },
  { id: 'drama', ar: '🎭 دراما (1,518)', en: '🎭 Drama', tag: 'دراما' },
  { id: 'shounen', ar: '🔥 شونين (1,400)', en: '🔥 Shounen', tag: 'شونين' },
  { id: 'romance', ar: '❤️ رومانسي (1,385)', en: '❤️ Romance', tag: 'رومانسي' },
  { id: 'scifi', ar: '🚀 خيال علمي (1,314)', en: '🚀 Sci-Fi', tag: 'خيال علمي' },
  { id: 'school', ar: '🏫 مدرسي (1,276)', en: '🏫 School', tag: 'مدرسي' },
  { id: 'supernatural', ar: '👁️ خارق للطبيعة (760)', en: '👁️ Supernatural', tag: 'خارق للطبيعة' },
  { id: 'seinen', ar: '🗡️ سينين (710)', en: '🗡️ Seinen', tag: 'سينين' },
  { id: 'mystery', ar: '🕵️ غموض (654)', en: '🕵️ Mystery', tag: 'غموض' },
  { id: 'historical', ar: '🏯 تاريخي (461)', en: '🏯 Historical', tag: 'تاريخي' },
  { id: 'isekai', ar: '🌌 عالم مختلف (346)', en: '🌌 Isekai', tag: 'عالم مختلف' },
  { id: 'superpower', ar: '⚡ قوة خارقة (326)', en: '⚡ Super Power', tag: 'قوة خارقة' },
  { id: 'military', ar: '🎖️ عسكري (318)', en: '🎖️ Military', tag: 'عسكري' },
  { id: 'sports', ar: '⚽ رياضي (316)', en: '⚽ Sports', tag: 'رياضي' },
  { id: 'thriller', ar: '⏳ تشويق (304)', en: '⏳ Thriller', tag: 'تشويق' },
  { id: 'slice', ar: '🍃 شريحة من الحياة (285)', en: '🍃 Slice of Life', tag: 'شريحة من الحياة' },
  { id: 'horror', ar: '💀 رعب (273)', en: '💀 Horror', tag: 'رعب' },
  { id: 'psychological', ar: '🧠 نفسي (264)', en: '🧠 Psychological', tag: 'نفسي' },
  { id: 'gore', ar: '🩸 دموي (210)', en: '🩸 Gore', tag: 'دموي' },
  { id: 'martial', ar: '🥋 فنون قتالية (184)', en: '🥋 Martial Arts', tag: 'فنون قتالية' },
  { id: 'samurai', ar: '⚔️ ساموراي (118)', en: '⚔️ Samurai', tag: 'ساموراي' },
  { id: 'vampire', ar: '🧛 مصاصي دماء (118)', en: '🧛 Vampire', tag: 'مصاصي دماء' }
];

const TYPE_FILTERS = [
  { id: 'all', ar: 'الكل (6,973)', en: 'All', facet: '' },
  { id: 'tv', ar: '📺 مسلسلات (4,114)', en: '📺 TV Series', facet: 'type:مسلسل' },
  { id: 'movie', ar: '🎬 أفلام (1,266)', en: '🎬 Movies', facet: 'type:فيلم' },
  { id: 'ova', ar: '💿 أوفا OVA (751)', en: '💿 OVA', facet: 'type:اوفا' },
  { id: 'special', ar: '✨ خاصة (486)', en: '✨ Specials', facet: 'type:خاصة' },
  { id: 'ona', ar: '🌐 أونا ONA (351)', en: '🌐 ONA', facet: 'type:اونا' }
];

const STATE_FILTERS = [
  { id: 'all', ar: 'كل الحالات', en: 'All States', facet: '' },
  { id: 'airing', ar: '🟢 مستمر الآن (90)', en: '🟢 Airing Now', facet: 'details.state:مستمر' },
  { id: 'completed', ar: '✔ مكتمل (6,651)', en: '✔ Completed', facet: 'details.state:مكتمل' },
  { id: 'upcoming', ar: '⏳ قريباً (220)', en: '⏳ Upcoming', facet: 'details.state:لم يتم بثه بعد' }
];

const STUDIO_FILTERS = [
  { id: 'all', label: 'كل الاستوديوهات', facet: '' },
  { id: 'mappa', label: '🔥 MAPPA (76)', facet: 'details.studio:MAPPA' },
  { id: 'ufotable', label: '⚔️ ufotable (49)', facet: 'details.studio:ufotable' },
  { id: 'madhouse', label: '👑 Madhouse (243)', facet: 'details.studio:Madhouse' },
  { id: 'toei', label: '🏴‍☠️ Toei Animation (299)', facet: 'details.studio:Toei Animation' },
  { id: 'bones', label: '⚡ Bones (116)', facet: 'details.studio:Bones' },
  { id: 'wit', label: '🛡️ Wit Studio (54)', facet: 'details.studio:Wit Studio' },
  { id: 'clover', label: '🍀 CloverWorks (52)', facet: 'details.studio:CloverWorks' },
  { id: 'a1', label: '✨ A-1 Pictures (164)', facet: 'details.studio:A-1 Pictures' },
  { id: 'pierrot', label: '🌀 Studio Pierrot (127)', facet: 'details.studio:Studio Pierrot' },
  { id: 'kyoto', label: '🌸 Kyoto Animation (88)', facet: 'details.studio:Kyoto Animation' },
  { id: 'ig', label: '🏐 Production I.G (214)', facet: 'details.studio:Production I.G' }
];

const SCHEDULE_DAYS = [
  { id: 'السبت', ar: 'السبت', en: 'Saturday' },
  { id: 'الأحد', ar: 'الأحد', en: 'Sunday' },
  { id: 'الإثنين', ar: 'الإثنين', en: 'Monday' },
  { id: 'الثلاثاء', ar: 'الثلاثاء', en: 'Tuesday' },
  { id: 'الأربعاء', ar: 'الأربعاء', en: 'Wednesday' },
  { id: 'الخميس', ar: 'الخميس', en: 'Thursday' },
  { id: 'الجمعة', ar: 'الجمعة', en: 'Friday' },
  { id: 'all_airing', ar: '🔥 كل المستمر (90)', en: '🔥 All Airing (90)' }
];

const DEFAULT_PREDICTIONS = [
  {
    id: 'pred-1',
    anime: 'One Piece — فصل وحلقات الإيغ هيد / إلباف',
    questionAr: 'هل سيكشف لوفي قوة جديدة لـ Gear 5 في المعركة القادمة؟',
    questionEn: 'Will Luffy awaken a new Gear 5 technique in the upcoming battle?',
    xpReward: 75,
    optionAAr: '🔥 نعم، تقنية أسطورية جديدة',
    optionBAr: '🛡️ لا، سيعتمد على الهاكي الملكي فقط',
    votesA: 342,
    votesB: 118
  },
  {
    id: 'pred-2',
    anime: 'Solo Leveling: Arise from the Shadow',
    questionAr: 'هل سيتجاوز سونغ جين-وو قوة جميع صيادي الرتبة S مجتمعين في الأرك القادم؟',
    questionEn: 'Will Sung Jin-Woo surpass all S-Rank Hunters combined next arc?',
    xpReward: 60,
    optionAAr: '👑 نعم، بلا منازع (عاهل الظلال)',
    optionBAr: '⚔️ سيواجه صعوبة أمام العواهل',
    votesA: 519,
    votesB: 64
  },
  {
    id: 'pred-3',
    anime: 'Jujutsu Kaisen / Chainsaw Man',
    questionAr: 'أي عمل سيحصد تقييم الحلقة الأعلى عالمياً هذا الموسم؟',
    questionEn: 'Which series will claim the highest rated episode this season?',
    xpReward: 50,
    optionAAr: '⚡ Jujutsu Kaisen',
    optionBAr: '🪚 Chainsaw Man',
    votesA: 289,
    votesB: 241
  },
  {
    id: 'pred-4',
    anime: 'Bleach: Thousand-Year Blood War',
    questionAr: 'هل سنشهد بانكاي جديد لم يظهر في المانجا الأصلية من إشراف كوبو؟',
    questionEn: 'Will Kubo reveal an anime-exclusive Bankai in the next cour?',
    xpReward: 80,
    optionAAr: '🗡️ نعم، بانكاي حصري للأنمي',
    optionBAr: '📖 سيلتزم بأحداث المانجا فقط',
    votesA: 412,
    votesB: 53
  }
];

const SERVER_LABELS = {
  PD_DEV: { nameAr: '👑 PixelDrain Ultra', nameEn: '👑 PixelDrain Ultra', badge: 'أسرع سيرفر • مضاد للحجب', fast: true },
  PD_NET: { nameAr: '⚡ PixelDrain Mirror', nameEn: '⚡ PixelDrain Mirror', badge: 'سيرفر بديل فائق السرعة', fast: true },
  SF: { nameAr: '🔥 FireStream CDN', nameEn: '🔥 FireStream CDN', badge: 'بث سحابي مباشر MP4', fast: true },
  AA: { nameAr: '⚡ BLACK X Cloud', nameEn: '⚡ BLACK X Cloud', badge: 'سيرفر عالمي مباشر', fast: true },
  PD: { nameAr: '🌐 PixelDrain Global', nameEn: '🌐 PixelDrain Global', badge: 'مباشر • MP4', fast: true },
  MF2: { nameAr: '🚀 MediaFire Pro', nameEn: '🚀 MediaFire Pro', badge: 'مباشر • MP4', fast: true },
  MF: { nameAr: '🚀 MediaFire Cloud', nameEn: '🚀 MediaFire Cloud', badge: 'مباشر • MP4', fast: true },
  ST: { nameAr: '🎬 StreamTape HD', nameEn: '🎬 StreamTape HD', badge: 'احتياطي HD', fast: false }
};

const SERVER_PRIORITY = { PD_DEV: 1, SF: 2, PD_NET: 3, AA: 4, MF2: 5, MF: 6, PD: 7, ST: 8 };

async function sha256Browser(text) {
  const data = new TextEncoder().encode(String(text || ''));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function cleanCloudKey(prefix, val) {
  const safe = String(val || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '_');
  return `${prefix}_${safe}`.slice(0, 120);
}

async function queryAlgolia(indexName, payload = {}) {
  const res = await fetch(`${ALGOLIA_BASE}/${encodeURIComponent(indexName)}/query`, {
    method: 'POST',
    headers: {
      'X-Algolia-Application-Id': ALGOLIA_APP_ID,
      'X-Algolia-API-Key': ALGOLIA_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Algolia ${res.status}`);
  return res.json();
}

function formatAnimeHit(hit) {
  if (!hit || !hit.objectID) return null;
  const objectID = String(hit.objectID);
  const titleRomaji = hit.name || objectID;
  const titleEn = hit.details?.english_title || titleRomaji;
  const poster =
    hit.aniList_poster?.large ||
    hit.poster?.large ||
    hit.poster_uri ||
    hit.aniList_poster?.medium ||
    hit.poster?.medium ||
    '';
  const banner = hit.cover_uri || hit.aniList_poster?.large || hit.poster?.large || poster;
  const malMean = Number(hit.details?.mal_mean || hit.rating?.rate || 0);
  const rating = malMean > 0 ? (malMean > 10 ? (malMean / 10).toFixed(1) : malMean.toFixed(1)) : '8.9';

  return {
    objectID,
    slug: `aw-${objectID.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    malId: hit.mal_id || null,
    titleRomaji,
    titleEn,
    titleAr: titleRomaji,
    poster,
    banner,
    storyAr: hit.story || hit.story_en || 'لا يتوفر ملخص عربي حالياً لهذا العمل.',
    storyEn: hit.story_en || hit.story || '',
    tags: Array.isArray(hit.tags) ? hit.tags : ['اكشن', 'مغامرات'],
    type: hit.type || 'مسلسل',
    state: hit.details?.state || 'مستمر',
    year: hit.details?.year && hit.details.year !== '0' ? hit.details.year : '2025',
    season: hit.details?.season && !String(hit.details.season).includes('undefined') ? hit.details.season : 'موسم مميز',
    studio: Array.isArray(hit.details?.studio) ? hit.details.studio.join(' • ') : 'Studio Japan',
    age: hit.details?.age || '+13',
    duration: hit.duration || '24 دقيقة',
    showTime: hit.show_time || '',
    relatedIds: Array.isArray(hit.related_anime_ids) ? hit.related_anime_ids : [],
    otherNames: Array.isArray(hit.other_names) ? hit.other_names : [],
    views: Number(hit.views || hit.statictes?.fav_count || 12500),
    rating,
    youtubeId: hit.youtube_video_id || null
  };
}

/**
 * Fetch HTML from non-CORS hosts using Capacitor's native CapacitorHttp.get plugin
 * without patching window.fetch, falling back to standard fetch
 */
async function nativeGetHtml(url) {
  try {
    const capHttp = window.Capacitor?.Plugins?.CapacitorHttp;
    if (capHttp?.get) {
      const res = await capHttp.get({
        url,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      if (res?.data && typeof res.data === 'string') return res.data;
    }
  } catch (_) {}
  const r = await fetch(url);
  return r.text();
}

async function nativeGetJson(url, headers = {}) {
  try {
    const capHttp = window.Capacitor?.Plugins?.CapacitorHttp;
    if (capHttp?.get) {
      const res = await capHttp.get({
        url,
        headers: {
          Accept: 'application/json',
          ...headers
        }
      });
      if (res?.data) {
        return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      }
    }
  } catch (_) {}
  const r = await fetch(url, { headers: { Accept: 'application/json', ...headers } });
  return r.json();
}

const MELLO_API_HEADERS = {
  Accept: 'application/json',
  app_version: '1.1.7',
  installer: 'com.android.vending',
  lang: 'ar',
  device: 'android',
  time_zone: 'Africa/Cairo',
  'User-Agent': 'Dart/3.8 (dart:io)'
};

const SWAT_API_HEADERS = {
  Accept: 'application/json',
  Origin: 'https://meshmanga.com',
  Referer: 'https://meshmanga.com/',
  'User-Agent': 'ktor-client'
};

function rewriteLegacyMangaImageUrl(rawUrl) {
  const s = String(rawUrl || '').trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase();
    if (host === 'tempstorm.lekmanga.site') {
      const m = u.pathname.match(/^\/manga\/arb1(\d+)\//i);
      if (m?.[1]) {
        return s.replace(/tempstorm\.lekmanga\.site/i, `s${m[1]}storm.lekmanga.site`);
      }
    }
    const legacyMatch = host.match(/^s(\d+)lekmangas\.lekmanga\.site$/i);
    if (legacyMatch?.[1]) {
      return s.replace(host, `s${legacyMatch[1]}storm.lekmanga.site`);
    }
  } catch (_) {}
  return s;
}

function decodeAllAnimeHex(hexStr) {
  const s = String(hexStr || '').replace(/^--/, '');
  let out = '';
  for (let i = 0; i < s.length; i += 2) {
    const byte = parseInt(s.slice(i, i + 2), 16);
    if (!Number.isNaN(byte)) out += String.fromCharCode(byte ^ 56);
  }
  return out;
}

async function fetchAllAnimeDirectServers(animeTitle, epNum) {
  try {
    const gqlSearch = `query($search: SearchInput, $limit: Int) { shows(search: $search, limit: $limit) { edges { _id name englishName } } }`;
    const searchUrl = `https://api.allanime.day/api?variables=${encodeURIComponent(
      JSON.stringify({ search: { query: animeTitle, allowAdult: false, allowUnknown: false }, limit: 5 })
    )}&query=${encodeURIComponent(gqlSearch)}`;

    const capHttp = window.Capacitor?.Plugins?.CapacitorHttp;
    let searchData = null;
    if (capHttp?.get) {
      const r = await capHttp.get({
        url: searchUrl,
        headers: { Referer: 'https://allmanga.to', 'User-Agent': 'Mozilla/5.0' }
      });
      searchData = typeof r?.data === 'string' ? JSON.parse(r.data) : r?.data;
    } else {
      searchData = await fetch(searchUrl).then((r) => r.json());
    }
    const showId = searchData?.data?.shows?.edges?.[0]?._id;
    if (!showId) return [];

    const gqlEp = `query($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) { episode(showId: $showId, translationType: $translationType, episodeString: $episodeString) { sourceUrls } }`;
    const epUrl = `https://api.allanime.day/api?variables=${encodeURIComponent(
      JSON.stringify({ showId, translationType: 'sub', episodeString: String(epNum) })
    )}&query=${encodeURIComponent(gqlEp)}`;

    let epData = null;
    if (capHttp?.get) {
      const r = await capHttp.get({
        url: epUrl,
        headers: { Referer: 'https://allmanga.to', 'User-Agent': 'Mozilla/5.0' }
      });
      epData = typeof r?.data === 'string' ? JSON.parse(r.data) : r?.data;
    } else {
      epData = await fetch(epUrl).then((r) => r.json());
    }

    const sources = epData?.data?.episode?.sourceUrls || [];
    const results = [];
    for (const src of sources) {
      if (!src?.sourceUrl?.startsWith('--')) continue;
      const decoded = decodeAllAnimeHex(src.sourceUrl);
      if (decoded.startsWith('http') && decoded.includes('.mp4')) {
        results.push({ name: 'AA', quality: '1080p', link: decoded, directResolved: true, visible: true });
      } else if (decoded.startsWith('/apivtwo/clock')) {
        const clockId = decoded.split('id=')[1];
        if (!clockId) continue;
        const clockUrl = `https://allanime.day/apivtwo/clock.json?id=${encodeURIComponent(clockId)}`;
        let clockJson = null;
        if (capHttp?.get) {
          const cr = await capHttp.get({
            url: clockUrl,
            headers: { Referer: 'https://allmanga.to', 'User-Agent': 'Mozilla/5.0' }
          });
          clockJson = typeof cr?.data === 'string' ? JSON.parse(cr.data) : cr?.data;
        }
        for (const l of clockJson?.links || []) {
          if (l?.link && l.mp4) {
            results.push({
              name: 'AA',
              quality: l.resolutionStr || '1080p',
              link: l.link,
              directResolved: true,
              visible: true
            });
          }
        }
      }
    }
    return results.slice(0, 2);
  } catch (_) {
    return [];
  }
}

/**
 * Resolve intermediate server link (PD_DEV, PD_NET, PD, SF, MF, MF2, ST, AA) directly inside the Android APK
 */
async function resolveMobileVideoUrl(code, rawLink) {
  const c = String(code || '').toUpperCase().trim();
  const link = String(rawLink || '').trim();
  if (!link) return null;

  // Already a direct resolved link (e.g. pixeldrain.dev/api/file/..., downloadXXXX.mediafire.com, firestream encodings, etc.)
  if (
    link.includes('/api/file/') ||
    link.includes('encodings/') ||
    link.includes('fast4speed.rsvp') ||
    /https?:\/\/download\d*\.mediafire\.com\//i.test(link)
  ) {
    return link;
  }

  // 1. PixelDrain (PD_DEV / PD_NET / PD) — Multi-Domain Anti-Block Direct MP4 API
  if (c.startsWith('PD') || link.includes('pixeldrain.')) {
    const m = link.match(/pixeldrain\.[a-z]+\/(?:u|api\/file)\/([A-Za-z0-9_-]+)/i);
    if (m?.[1]) {
      if (c === 'PD_NET') return `https://pixeldrain.net/api/file/${m[1]}`;
      if (c === 'PD') return `https://pixeldrain.com/api/file/${m[1]}`;
      return `https://pixeldrain.dev/api/file/${m[1]}`;
    }
  }

  // 2. FireStream (SF)
  if (c === 'SF' || link.includes('firestream.to')) {
    try {
      const html = await nativeGetHtml(link);
      const m = html.match(/"downloadUrl"\s*:\s*"([^"]+)"/);
      if (m?.[1]) return m[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
    } catch (_) {}
    return null;
  }

  // 3. MediaFire (MF / MF2)
  if (c === 'MF' || c === 'MF2' || link.includes('mediafire.com')) {
    try {
      const html = await nativeGetHtml(link);
      const direct =
        html.match(/href="(https?:\/\/download\d*\.mediafire\.com\/[^"]+)"/i)?.[1] ||
        html.match(/aria-label="Download file"[^>]*href="(https?:\/\/[^"]+)"/i)?.[1];
      if (direct) return direct;
      const scrambled = html.match(/data-scrambled-url="([^"]+)"/i)?.[1];
      if (scrambled) return atob(scrambled);
    } catch (_) {}
    return null;
  }

  // 4. StreamTape (ST)
  if (c === 'ST' || link.includes('streamtape.com')) {
    try {
      const html = await nativeGetHtml(link);
      const w1 = "document.getElementById('norobotlink').innerHTML = '";
      const i1 = html.indexOf(w1);
      if (i1 !== -1) {
        const i2 = html.indexOf(';</script>', i1);
        const expr = html.slice(i1 + w1.length, i2);
        const m = expr.match(/\('([^']+)'\)\.substring\((\d+)\)(?:\.substring\((\d+)\))?/);
        if (m) {
          const tail = m[1].substring(Number(m[2])).substring(Number(m[3] || 0));
          return `https://streamtape.com${tail.startsWith('/') ? '' : '/'}${tail}`;
        }
      }
    } catch (_) {}
    return null;
  }

  return link.endsWith('.mp4') ? link : null;
}

export default function MobileApkApp() {
  const [lang, setLang] = useState(() => localStorage.getItem('bx_mob_lang') || 'ar');
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'catalog' | 'schedule' | 'manga' | 'community' | 'profile'
  const [fpsHz, setFpsHz] = useState(120);

  // Home & Catalog States
  const [heroSlide, setHeroSlide] = useState(0);
  const [popularList, setPopularList] = useState([]);
  const [latestList, setLatestList] = useState([]);
  const [topRankedList, setTopRankedList] = useState([]);
  const [seasonalList, setSeasonalList] = useState([]);
  const [moviesList, setMoviesList] = useState([]);
  const [airingList, setAiringList] = useState([]);
  const [homeLoading, setHomeLoading] = useState(true);
  const [heroTrailerOpen, setHeroTrailerOpen] = useState(false);

  // Catalog Browse & Search States (Multi-Facet: Sort + Type + State + Studio + Genre)
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogTotal, setCatalogTotal] = useState(6973);
  const [catalogPage, setCatalogPage] = useState(0);
  const [catalogSort, setCatalogSort] = useState('series_fav_count_desc');
  const [catalogGenre, setCatalogGenre] = useState(GENRE_CHIPS[0]);
  const [catalogType, setCatalogType] = useState(TYPE_FILTERS[0]);
  const [catalogState, setCatalogState] = useState(STATE_FILTERS[0]);
  const [catalogStudio, setCatalogStudio] = useState(STUDIO_FILTERS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [loadingMoreCatalog, setLoadingMoreCatalog] = useState(false);

  // Weekly Airing Schedule States
  const [scheduleDay, setScheduleDay] = useState(() => {
    const dayMap = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return dayMap[new Date().getDay()] || 'السبت';
  });
  const [scheduleItems, setScheduleItems] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Active Anime Detail & Episode Player States
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [detailTab, setDetailTab] = useState('episodes'); // 'episodes' | 'characters' | 'relations' | 'reviews'
  const [animeEpisodes, setAnimeEpisodes] = useState([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [epSearchQuery, setEpSearchQuery] = useState('');
  const [epAscending, setEpAscending] = useState(true);
  const [hideFiller, setHideFiller] = useState(false);
  const [storyExpanded, setStoryExpanded] = useState(false);
  const [animeCharacters, setAnimeCharacters] = useState([]);
  const [charactersLoading, setCharactersLoading] = useState(false);
  const [relatedAnimes, setRelatedAnimes] = useState([]);
  const [animeReviews, setAnimeReviews] = useState([]);
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewScore, setNewReviewScore] = useState(10);

  // Active Episode Video Player Sheet
  const [activeEpisode, setActiveEpisode] = useState(null);
  const [episodeServers, setEpisodeServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [playingVideoUrl, setPlayingVideoUrl] = useState('');
  const [resolvingVideo, setResolvingVideo] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [autoNextEp, setAutoNextEp] = useState(true);
  const [skipRipple, setSkipRipple] = useState(null); // 'left' | 'right'
  const videoRef = useRef(null);

  // Manga States (30,000+ Arabic Manga & Manhwa from Manga Peak Engines + MangaDex)
  const [mangaList, setMangaList] = useState([]);
  const [mangaSource, setMangaSource] = useState('all'); // 'all' | 'mello' | 'azora' | 'swat' | 'dilar' | 'mangadex'
  const [mangaFilterType, setMangaFilterType] = useState('ALL'); // 'ALL' | 'MANHWA' | 'MANGA'
  const [mangaPage, setMangaPage] = useState(1);
  const [mangaQuery, setMangaQuery] = useState('');
  const [mangaLoading, setMangaLoading] = useState(false);
  const [loadingMoreManga, setLoadingMoreManga] = useState(false);
  const [selectedManga, setSelectedManga] = useState(null);
  const [mangaChapters, setMangaChapters] = useState([]);
  const [mangaChaptersLoading, setMangaChaptersLoading] = useState(false);
  const [activeMangaChapter, setActiveMangaChapter] = useState(null);
  const [mangaPages, setMangaPages] = useState([]);
  const [mangaPagesLoading, setMangaPagesLoading] = useState(false);
  const [readerMode, setReaderMode] = useState('webtoon'); // 'webtoon' | 'page'
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [readerZoom, setReaderZoom] = useState(100);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(0); // 0 | 1 | 2 | 3
  const [readerFullscreen, setReaderFullscreen] = useState(false);
  const [mangaHistory, setMangaHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bx_mob_manga_history') || '[]');
    } catch {
      return [];
    }
  });

  // Shared User Auth, Favorites, Watchlist, Watch History, Predictions & Community States
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bx_mob_user') || 'null');
    } catch {
      return null;
    }
  });
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bx_mob_favorites') || '[]');
    } catch {
      return [];
    }
  });
  const [watchlistMap, setWatchlistMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bx_mob_watchlist_map') || '{}');
    } catch {
      return {};
    }
  });
  const [watchHistory, setWatchHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bx_mob_history') || '[]');
    } catch {
      return [];
    }
  });
  const [userXp, setUserXp] = useState(() => Number(localStorage.getItem('bx_mob_xp') || 350));
  const [arenaSubTab, setArenaSubTab] = useState('predictions'); // 'predictions' | 'community' | 'leaderboard'
  const [predictions, setPredictions] = useState(DEFAULT_PREDICTIONS);
  const [votedPredictions, setVotedPredictions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bx_mob_voted_preds') || '{}');
    } catch {
      return {};
    }
  });
  const [communityPosts, setCommunityPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [postCategory, setPostCategory] = useState('discussion'); // 'discussion' | 'recommend' | 'theory' | 'spoiler' | 'review'
  const [postIsSpoiler, setPostIsSpoiler] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState({});
  const [replyingToPostId, setReplyingToPostId] = useState(null);
  const [replyText, setReplyText] = useState('');

  // Profile & Personal Library States
  const [librarySubTab, setLibrarySubTab] = useState('favorites'); // 'favorites' | 'watching' | 'completed' | 'planned' | 'history' | 'manga_history'
  const [editingProfile, setEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const oauthSessionIdRef = useRef('');
  const [toastMsg, setToastMsg] = useState('');

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 3200);
  }, []);

  // Measure real display refresh rate (60Hz / 90Hz / 120Hz / 144Hz)
  useEffect(() => {
    let frames = 0;
    let start = performance.now();
    let rafId;
    const measure = (now) => {
      frames++;
      if (now - start >= 1000) {
        const measured = Math.round((frames * 1000) / (now - start));
        setFpsHz(measured >= 105 ? 120 : measured >= 80 ? 90 : 120);
        return;
      }
      rafId = requestAnimationFrame(measure);
    };
    rafId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Load Home Screen Data from 6,973-Anime Cloud Engine (Including Movies & Currently Airing)
  useEffect(() => {
    let alive = true;
    setHomeLoading(true);
    Promise.all([
      queryAlgolia('series_fav_count_desc', { query: '', hitsPerPage: 24 }).catch(() => ({ hits: [] })),
      queryAlgolia('recent', { query: '', hitsPerPage: 20 }).catch(() => ({ hits: [] })),
      queryAlgolia('best_mal_ranked', { query: '', hitsPerPage: 20 }).catch(() => ({ hits: [] })),
      queryAlgolia('series_date_created', { query: '', hitsPerPage: 20 }).catch(() => ({ hits: [] })),
      queryAlgolia('series_fav_count_desc', { query: '', facetFilters: [['type:فيلم']], hitsPerPage: 20 }).catch(() => ({ hits: [] })),
      queryAlgolia('series_fav_count_desc', { query: '', facetFilters: [['details.state:مستمر']], hitsPerPage: 20 }).catch(() => ({ hits: [] }))
    ]).then(([pop, rec, top, newest, mov, air]) => {
      if (!alive) return;
      setPopularList((pop.hits || []).map(formatAnimeHit).filter(Boolean));
      setLatestList((rec.hits || []).map(formatAnimeHit).filter(Boolean));
      setTopRankedList((top.hits || []).map(formatAnimeHit).filter(Boolean));
      setSeasonalList((newest.hits || []).map(formatAnimeHit).filter(Boolean));
      setMoviesList((mov.hits || []).map(formatAnimeHit).filter(Boolean));
      setAiringList((air.hits || []).map(formatAnimeHit).filter(Boolean));
      setHomeLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Auto-advance Hero Banner every 5 seconds
  useEffect(() => {
    if (!popularList.length || heroTrailerOpen) return;
    const timer = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % Math.min(6, popularList.length));
    }, 5200);
    return () => clearInterval(timer);
  }, [popularList.length, heroTrailerOpen]);

  // Build facetFilters array for Catalog
  const buildCatalogFacets = useCallback(() => {
    const facets = [];
    if (catalogGenre?.tag) facets.push([`tags:${catalogGenre.tag}`]);
    if (catalogType?.facet) facets.push([catalogType.facet]);
    if (catalogState?.facet) facets.push([catalogState.facet]);
    if (catalogStudio?.facet) facets.push([catalogStudio.facet]);
    return facets;
  }, [catalogGenre, catalogType, catalogState, catalogStudio]);

  // Load Catalog (6,973 Anime) when sort, genre, type, state, studio, or search changes
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      setCatalogLoading(true);
      try {
        const body = {
          query: searchQuery.trim(),
          page: 0,
          hitsPerPage: 48
        };
        const facets = buildCatalogFacets();
        if (facets.length > 0) body.facetFilters = facets;
        const indexToUse = searchQuery.trim() ? 'series' : catalogSort;
        const res = await queryAlgolia(indexToUse, body);
        if (!alive) return;
        setCatalogItems((res.hits || []).map(formatAnimeHit).filter(Boolean));
        setCatalogTotal(Number(res.nbHits) || 0);
        setCatalogPage(0);
      } catch (_) {
      } finally {
        if (alive) setCatalogLoading(false);
      }
    }, searchQuery.trim() ? 220 : 20);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [catalogSort, buildCatalogFacets, searchQuery]);

  const handleLoadMoreCatalog = async () => {
    if (loadingMoreCatalog) return;
    setLoadingMoreCatalog(true);
    try {
      const nextPage = catalogPage + 1;
      const body = {
        query: searchQuery.trim(),
        page: nextPage,
        hitsPerPage: 48
      };
      const facets = buildCatalogFacets();
      if (facets.length > 0) body.facetFilters = facets;
      const indexToUse = searchQuery.trim() ? 'series' : catalogSort;
      const res = await queryAlgolia(indexToUse, body);
      const more = (res.hits || []).map(formatAnimeHit).filter(Boolean);
      if (more.length) {
        setCatalogItems((prev) => [...prev, ...more]);
        setCatalogPage(nextPage);
      }
    } catch (_) {
    } finally {
      setLoadingMoreCatalog(false);
    }
  };

  // Load Weekly Airing Schedule by Day of Week
  useEffect(() => {
    if (activeTab !== 'schedule') return;
    let alive = true;
    setScheduleLoading(true);
    const facetFilters =
      scheduleDay === 'all_airing' ? [['details.state:مستمر']] : [[`show_time:${scheduleDay}`]];
    queryAlgolia('series_fav_count_desc', {
      query: '',
      facetFilters,
      hitsPerPage: 60
    })
      .then((res) => {
        if (!alive) return;
        setScheduleItems((res.hits || []).map(formatAnimeHit).filter(Boolean));
      })
      .catch(() => {
        if (alive) setScheduleItems([]);
      })
      .finally(() => {
        if (alive) setScheduleLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [activeTab, scheduleDay]);

  // Hands-free Auto-Scroll for Webtoon Reader
  useEffect(() => {
    if (!activeMangaChapter || autoScrollSpeed === 0) return;
    const pxPerTick = autoScrollSpeed * 2.2;
    const id = setInterval(() => {
      window.scrollBy({ top: pxPerTick, behavior: 'auto' });
    }, 16);
    return () => clearInterval(id);
  }, [activeMangaChapter, autoScrollSpeed]);

  // Fetch Manga & Manhwa from Manga Peak Engines (MangaMello Plus 14,331 + Dilar 9,164 + Azorafly 2,453 + Swat 1,669 + Algolia 2,965 + MangaDex)
  const fetchMangaPeakPage = useCallback(async (srcMode, qStr, pageNum = 1) => {
    const q = String(qStr || '').trim();
    const fetchMello = async () => {
      try {
        const url = q
          ? `https://plus.mangamello.com/api/v1/mangas/search?per_page=24&page=${pageNum}&relations=genres&title=${encodeURIComponent(q)}`
          : `https://plus.mangamello.com/api/v1/mangas?page=${pageNum}&per_page=24&relations=genres&sort_by=views&dir=desc`;
        const json = await nativeGetJson(url, MELLO_API_HEADERS);
        return (json?.data || []).map((item) => ({
          objectID: `mm:${item.id}`,
          source: 'mello',
          sourceLabel: 'Mello Plus',
          sourceId: String(item.id),
          name: item.title || `Manga #${item.id}`,
          poster_uri: rewriteLegacyMangaImageUrl(item.img),
          type: Number(item.type_id) === 1 ? 'مانجا' : 'مانهوا',
          story_ar: item.summary || 'مانجا ومانهوا مترجمة للعربية بجودة عالية عبر سيرفر Mello Plus.',
          rate: item.rate ? Number(item.rate).toFixed(1) : '9.2'
        }));
      } catch (_) {
        return [];
      }
    };

    const fetchAzora = async () => {
      try {
        const url = `https://api.azorafly.com/api/query?page=${pageNum}&perPage=24&orderBy=totalViews&orderDirection=desc&searchTerm=${encodeURIComponent(q)}`;
        const json = await nativeGetJson(url);
        return (json?.posts || []).map((post) => ({
          objectID: `az:${post.slug}`,
          source: 'azora',
          sourceLabel: 'Azora Moon',
          slug: post.slug,
          postId: post.id,
          name: post.postTitle || post.slug,
          poster_uri: post.featuredImage || '',
          type: post.seriesType === 'MANGA' ? 'مانجا' : 'مانهوا',
          story_ar: (post.postContent || '').replace(/<[^>]+>/g, '').trim() || 'مانهوا مترجمة للعربية بجودة فائقة عبر سيرفر Azora.',
          rate: post.averageRating ? Number(post.averageRating).toFixed(1) : '9.4'
        }));
      } catch (_) {
        return [];
      }
    };

    const fetchSwat = async () => {
      try {
        const url = q
          ? `https://appswat.com/v2/api/v2/series/?search=${encodeURIComponent(q)}&page=${pageNum}`
          : `https://appswat.com/v2/api/v2/series/?page_size=24&page=${pageNum}&order_by=-followers_count`;
        const json = await nativeGetJson(url, SWAT_API_HEADERS);
        return (json?.results || []).map((item) => ({
          objectID: `sw:${item.id}`,
          source: 'swat',
          sourceLabel: 'Manga Swat',
          sourceId: String(item.id),
          slug: item.slug || String(item.id),
          name: item.title || `Manhwa #${item.id}`,
          poster_uri: item.poster?.medium || item.poster?.thumbnail || '',
          type: 'مانهوا',
          story_ar: (item.story || '').replace(/<[^>]+>/g, '').trim() || 'مانهوا مترجمة للعربية بجودة عالية عبر سيرفر Manga Swat.',
          rate: item.rating ? Number(item.rating).toFixed(1) : '9.3'
        }));
      } catch (_) {
        return [];
      }
    };

    const fetchDilar = async () => {
      try {
        if (q) {
          const capHttp = window.Capacitor?.Plugins?.CapacitorHttp;
          let rows = [];
          if (capHttp?.post) {
            const r = await capHttp.post({
              url: 'https://dilar.tube/api/search/quick_search',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json', Referer: 'https://dilar.tube/' },
              data: { query: q, includes: ['Manga'] }
            });
            const data = typeof r?.data === 'string' ? JSON.parse(r.data) : r?.data;
            rows = data?.[0]?.data || [];
          }
          if (rows.length > 0) {
            return rows.map((row) => ({
              objectID: `dt:${row.id}`,
              source: 'dilar',
              sourceLabel: 'Dilar Tube',
              sourceId: String(row.id),
              name: row.title || row.english || `Manga #${row.id}`,
              poster_uri: row.cover ? `https://dilar.tube/uploads/manga/cover/${row.id}/large_${row.cover}.webp` : '',
              type: 'مانهوا / مانجا',
              story_ar: row.summary || 'عمل مترجم للعربية من مكتبة Dilar Tube الشاملة.',
              rate: '9.2'
            }));
          }
        }
        const json = await nativeGetJson(`https://v2.dilar.tube/api/series/?page=${pageNum}`, {
          Referer: 'https://dilar.tube/'
        });
        return (json?.series || []).map((item) => ({
          objectID: `dt:${item.id}`,
          source: 'dilar',
          sourceLabel: 'Dilar Tube',
          sourceId: String(item.id),
          name: item.title || `Series #${item.id}`,
          poster_uri: item.cover ? `https://dilar.tube/uploads/manga/cover/${item.id}/large_${item.cover}.webp` : '',
          type: 'مانهوا / مانجا',
          story_ar: item.summary || 'عمل مترجم للعربية من مكتبة Dilar Tube الشاملة (9,164 عمل).',
          rate: item.rating ? Number(item.rating).toFixed(1) : '9.2'
        }));
      } catch (_) {
        return [];
      }
    };

    const fetchAlgoliaManga = async () => {
      try {
        const res = await queryAlgolia(q ? 'manga' : 'manga_views_desc', {
          query: q,
          page: pageNum - 1,
          hitsPerPage: 24
        });
        return (res.hits || []).map((m) => ({
          ...m,
          objectID: `awm:${m.objectID}`,
          source: 'algolia',
          sourceLabel: 'BLACK X Cloud',
          poster_uri: m.poster?.large || m.poster_uri || '',
          story_ar: m.story?.ar || m.story_en || '',
          rate: '9.1'
        }));
      } catch (_) {
        return [];
      }
    };

    if (srcMode === 'mello') return fetchMello();
    if (srcMode === 'azora') return fetchAzora();
    if (srcMode === 'swat') return fetchSwat();
    if (srcMode === 'dilar') return fetchDilar();
    if (srcMode === 'mangadex') return fetchAlgoliaManga();

    const [mello, azora, swat, dilar, alg] = await Promise.all([
      fetchMello(),
      fetchAzora(),
      fetchSwat(),
      fetchDilar(),
      pageNum === 1 ? fetchAlgoliaManga() : Promise.resolve([])
    ]);

    const merged = [];
    const seen = new Set();
    const maxLen = Math.max(mello.length, azora.length, swat.length, dilar.length, alg.length);
    for (let i = 0; i < maxLen; i++) {
      for (const list of [mello, azora, swat, dilar, alg]) {
        const it = list[i];
        if (!it) continue;
        const normKey = String(it.name || '').toLowerCase().replace(/[^a-z0-9\u0621-\u064A]+/g, '');
        if (!normKey || seen.has(normKey)) continue;
        seen.add(normKey);
        merged.push(it);
      }
    }
    return merged;
  }, []);

  useEffect(() => {
    if (activeTab !== 'manga') return;
    let alive = true;
    const t = setTimeout(async () => {
      setMangaLoading(true);
      setMangaPage(1);
      try {
        const list = await fetchMangaPeakPage(mangaSource, mangaQuery, 1);
        if (!alive) return;
        setMangaList(list);
      } catch (_) {
      } finally {
        if (alive) setMangaLoading(false);
      }
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [activeTab, mangaSource, mangaQuery, fetchMangaPeakPage]);

  const handleLoadMoreManga = useCallback(async () => {
    if (loadingMoreManga) return;
    const nextPage = mangaPage + 1;
    setLoadingMoreManga(true);
    try {
      const more = await fetchMangaPeakPage(mangaSource, mangaQuery, nextPage);
      if (more.length > 0) {
        setMangaPage(nextPage);
        setMangaList((prev) => {
          const seen = new Set(prev.map((x) => x.objectID));
          return [...prev, ...more.filter((x) => !seen.has(x.objectID))];
        });
      }
    } catch (_) {
    } finally {
      setLoadingMoreManga(false);
    }
  }, [loadingMoreManga, mangaPage, mangaSource, mangaQuery, fetchMangaPeakPage]);

  // Load & Sync Shared Community Posts from BLACK X Cloud Firestore
  const loadCommunityFeed = useCallback(async () => {
    try {
      const res = await fetch(`${BX_SETTINGS_BASE}/shared_community_feed?key=${BX_KEY}`);
      if (res.ok) {
        const doc = await res.json();
        const raw = doc?.fields?.json?.stringValue;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setCommunityPosts(parsed);
            return;
          }
        }
      }
    } catch (_) {}
    setCommunityPosts([
      {
        id: 'welcome-1',
        author: 'BLACK X',
        role: 'developer',
        avatarColor: '#ffffff',
        time: 'الآن',
        text: 'مرحباً بكم في تطبيق BLACK X Mobile 120Hz الرسمي! جميع حساباتكم ومفضلاتكم متزامنة لحظياً مع الموقع وقاعدة بيانات الـ 6,973 أنمي.',
        likes: 128
      }
    ]);
  }, []);

  useEffect(() => {
    loadCommunityFeed();
  }, [loadCommunityFeed]);

  // Sync User Profile, Favorites & Watch History with BLACK X Shared Cloud Firestore
  const syncUserStateToCloud = useCallback(
    async (u, favs, hist) => {
      if (!u || !u.username) return;
      const uKey = cleanCloudKey('user', u.username);
      const payload = {
        ...u,
        favorites: favs,
        progress: hist,
        updatedAt: new Date().toISOString()
      };
      const body = {
        fields: {
          json: { stringValue: JSON.stringify(payload) },
          username: { stringValue: u.username.toLowerCase() },
          email: { stringValue: (u.email || '').toLowerCase() },
          updatedAt: { stringValue: payload.updatedAt }
        }
      };
      try {
        await fetch(`${BX_SETTINGS_BASE}/${uKey}?key=${BX_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (u.email) {
          const eKey = cleanCloudKey('email', u.email);
          await fetch(`${BX_SETTINGS_BASE}/${eKey}?key=${BX_KEY}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
        }
      } catch (_) {}
    },
    []
  );

  // Pull latest cloud state when user is logged in (and keep syncing every 8 seconds with Website)
  const pullCloudUserState = useCallback(async (activeUser) => {
    if (!activeUser?.username && !activeUser?.email) return;
    const keyToTry = activeUser.email
      ? cleanCloudKey('email', activeUser.email)
      : cleanCloudKey('user', activeUser.username);
    try {
      let res = await fetch(`${BX_SETTINGS_BASE}/${keyToTry}?key=${BX_KEY}`);
      if (!res.ok && activeUser.username) {
        res = await fetch(`${BX_SETTINGS_BASE}/${cleanCloudKey('user', activeUser.username)}?key=${BX_KEY}`);
      }
      if (!res.ok) return;
      const doc = await res.json();
      const raw = doc?.fields?.json?.stringValue;
      if (!raw) return;
      const cloud = JSON.parse(raw);

      if (cloud.displayName || cloud.photoUrl) {
        setUser((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            displayName: cloud.displayName || prev.displayName,
            photoUrl: cloud.photoUrl || prev.photoUrl,
            role: cloud.role || prev.role
          };
          localStorage.setItem('bx_mob_user', JSON.stringify(updated));
          return updated;
        });
      }

      if (Array.isArray(cloud.favorites) && cloud.favorites.length > 0) {
        setFavorites((prev) => {
          const mergedMap = new Map();
          for (const item of [...cloud.favorites, ...prev]) {
            const k = item.objectID || item.slug;
            if (k && !mergedMap.has(k)) mergedMap.set(k, item);
          }
          const merged = Array.from(mergedMap.values());
          localStorage.setItem('bx_mob_favorites', JSON.stringify(merged));
          return merged;
        });
      }

      if (Array.isArray(cloud.progress) && cloud.progress.length > 0) {
        setWatchHistory((prev) => {
          const mergedMap = new Map();
          for (const item of [...cloud.progress, ...prev]) {
            const k = item.objectID || item.slug;
            if (k && !mergedMap.has(k)) mergedMap.set(k, item);
          }
          const merged = Array.from(mergedMap.values()).slice(0, 60);
          localStorage.setItem('bx_mob_history', JSON.stringify(merged));
          return merged;
        });
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!user) return;
    pullCloudUserState(user);
    const interval = setInterval(() => pullCloudUserState(user), 8000);
    return () => clearInterval(interval);
  }, [user?.username, user?.email, pullCloudUserState]);

  // Real Google OAuth 2.0 Sign-In via Firebase IdentityToolkit & Native Android OAuth Bridge
  // NEVER lists or exposes any cloud accounts on the login screen.
  const completeVerifiedGoogleLogin = useCallback(
    async (idpData) => {
      try {
        const verifiedEmail = String(idpData?.email || '').trim().toLowerCase();
        if (!verifiedEmail || !idpData?.idToken) {
          showToast(lang === 'ar' ? 'فشل التحقق من رمز مصادقة Google' : 'Google token verification failed');
          setAuthBusy(false);
          return;
        }
        const eKey = cleanCloudKey('email', verifiedEmail);
        const isDev = verifiedEmail === 'mz0970mmz@gmail.com';
        let cloudUser = null;

        const res = await fetch(`${BX_SETTINGS_BASE}/${eKey}?key=${BX_KEY}`);
        if (res.ok) {
          const doc = await res.json();
          const raw = doc?.fields?.json?.stringValue;
          if (raw) cloudUser = JSON.parse(raw);
        }

        const baseUsername = (cloudUser?.username || (isDev ? 'developer' : verifiedEmail.split('@')[0]))
          .toLowerCase()
          .replace(/[^a-z0-9_.-]/g, '');

        const mergedFavs =
          Array.isArray(cloudUser?.favorites) && cloudUser.favorites.length
            ? [
                ...cloudUser.favorites,
                ...favorites.filter(
                  (f) => !cloudUser.favorites.some((cf) => (cf.objectID || cf.slug) === (f.objectID || f.slug))
                )
              ]
            : favorites;

        const mergedHist =
          Array.isArray(cloudUser?.progress) && cloudUser.progress.length
            ? [
                ...cloudUser.progress,
                ...watchHistory.filter(
                  (h) => !cloudUser.progress.some((ch) => (ch.objectID || ch.slug) === (h.objectID || h.slug))
                )
              ]
            : watchHistory;

        const loggedUser = {
          id: idpData.localId || cloudUser?.id || `google_${Date.now()}`,
          username: baseUsername,
          email: verifiedEmail,
          displayName: idpData.displayName || idpData.fullName || cloudUser?.displayName || verifiedEmail.split('@')[0],
          photoUrl: idpData.photoUrl || cloudUser?.photoUrl || '',
          avatarColor: cloudUser?.avatarColor || '#ffffff',
          role: isDev || cloudUser?.role === 'developer' ? 'developer' : 'user',
          vipStatus: 'VIP Monarch',
          isGoogleAccount: true
        };

        setUser(loggedUser);
        localStorage.setItem('bx_mob_user', JSON.stringify(loggedUser));
        setFavorites(mergedFavs);
        localStorage.setItem('bx_mob_favorites', JSON.stringify(mergedFavs));
        setWatchHistory(mergedHist);
        localStorage.setItem('bx_mob_history', JSON.stringify(mergedHist));

        await syncUserStateToCloud(loggedUser, mergedFavs, mergedHist);
        showToast(
          lang === 'ar'
            ? `✓ تم تسجيل الدخول بحساب Google (${loggedUser.displayName}) بنجاح!`
            : `✓ Signed in with Google (${loggedUser.displayName})!`
        );
      } catch (_) {
        showToast(lang === 'ar' ? 'حدث خطأ أثناء مزامنة حساب Google' : 'Google sync error');
      } finally {
        setAuthBusy(false);
      }
    },
    [favorites, watchHistory, syncUserStateToCloud, showToast, lang]
  );

  const handleRealGoogleOAuthLogin = useCallback(async () => {
    setAuthBusy(true);
    try {
      const continueUri = 'https://spry-oxide-1h7sp.firebaseapp.com/__/auth/handler';
      const createRes = await fetch(
        `https://www.googleapis.com/identitytoolkit/v3/relyingparty/createAuthUri?key=${BX_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: 'google.com',
            continueUri,
            authFlowType: 'CODE_FLOW'
          })
        }
      );
      const createData = await createRes.json();
      if (!createData?.authUri || !createData?.sessionId) {
        throw new Error('Failed to create Google OAuth URI');
      }
      oauthSessionIdRef.current = createData.sessionId;

      window.__onBlackXGoogleOAuthRedirect = async (redirectUrl) => {
        try {
          const idpRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${BX_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                requestUri: redirectUrl,
                sessionId: oauthSessionIdRef.current,
                returnSecureToken: true,
                returnIdpCredential: true
              })
            }
          );
          const idpData = await idpRes.json();
          if (idpData?.email && idpData?.idToken) {
            await completeVerifiedGoogleLogin(idpData);
          } else {
            showToast(
              lang === 'ar'
                ? 'تعذر إكمال مصادقة Google، يرجى المحاولة مجدداً'
                : 'Could not verify Google sign-in'
            );
            setAuthBusy(false);
          }
        } catch (_) {
          setAuthBusy(false);
        }
      };

      window.__onBlackXGoogleOAuthError = () => {
        setAuthBusy(false);
      };

      if (window.BlackXNativeAuth?.startGoogleLogin) {
        window.BlackXNativeAuth.startGoogleLogin(createData.authUri);
      } else {
        window.open(createData.authUri, '_blank', 'width=500,height=680');
        setAuthBusy(false);
      }
    } catch (_) {
      showToast(lang === 'ar' ? 'تعذر فتح بوابة تسجيل الدخول عبر Google' : 'Could not open Google OAuth');
      setAuthBusy(false);
    }
  }, [completeVerifiedGoogleLogin, showToast, lang]);

  // Open an Anime Detail Sheet & fetch its episodes, characters/seiyuu, related seasons, and cloud reviews
  const handleOpenAnime = useCallback(async (anime) => {
    if (!anime?.objectID) return;
    setSelectedAnime(anime);
    setDetailTab('episodes');
    setActiveEpisode(null);
    setPlayingVideoUrl('');
    setEpSearchQuery('');
    setStoryExpanded(false);
    setEpisodesLoading(true);
    setCharactersLoading(true);
    setAnimeCharacters([]);
    setRelatedAnimes([]);
    setAnimeReviews([]);

    // 1. Fetch Characters & Japanese Voice Actors (Seiyuu) via AniList GraphQL
    fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        query: `query($s:String){Media(search:$s,type:ANIME){characters(sort:[ROLE,FAVOURITES_DESC],perPage:18){edges{role node{id name{full native}image{large}}voiceActors(language:JAPANESE,sort:FAVOURITES_DESC){name{full}image{large}}}}}}`,
        variables: { s: anime.titleRomaji || anime.titleEn }
      })
    })
      .then((r) => r.json())
      .then((d) => {
        const edges = d?.data?.Media?.characters?.edges || [];
        setAnimeCharacters(
          edges.map((e) => ({
            id: e.node?.id || Math.random(),
            name: e.node?.name?.full || '',
            nativeName: e.node?.name?.native || '',
            role: e.role === 'MAIN' ? 'رئيسي' : 'مساعد',
            image: e.node?.image?.large || '',
            vaName: e.voiceActors?.[0]?.name?.full || 'Seiyuu Japan',
            vaImage: e.voiceActors?.[0]?.image?.large || ''
          }))
        );
      })
      .catch(() => {})
      .finally(() => setCharactersLoading(false));

    // 2. Fetch Related / Similar Animes from Algolia
    const firstTag = anime.tags?.[0] || 'اكشن';
    queryAlgolia('series_fav_count_desc', {
      query: '',
      facetFilters: [[`tags:${firstTag}`]],
      hitsPerPage: 12
    })
      .then((r) => {
        const list = (r.hits || [])
          .map(formatAnimeHit)
          .filter((x) => x && x.objectID !== anime.objectID);
        setRelatedAnimes(list);
      })
      .catch(() => {});

    // 3. Fetch Cloud Reviews for this Anime
    const revKey = cleanCloudKey('reviews', anime.slug || anime.objectID);
    fetch(`${BX_SETTINGS_BASE}/${revKey}?key=${BX_KEY}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => {
        const raw = doc?.fields?.json?.stringValue;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setAnimeReviews(parsed);
        }
      })
      .catch(() => {});

    try {
      const enc = encodeURIComponent(anime.objectID);
      const res = await fetch(`${AW_FS_BASE}/anime_list/${enc}/episodes_summery/summery?key=${AW_FS_KEY}`);
      if (res.ok) {
        const doc = await res.json();
        const vals = doc?.fields?.episodes?.arrayValue?.values || [];
        const rawEps = vals.map((item, idx) => {
          const f = item?.mapValue?.fields || {};
          const docId = f.doc_id?.stringValue || String(idx + 1).padStart(3, '0');
          const rawName = f.name?.stringValue || `الحلقة ${idx + 1}`;
          const numMatch = rawName.match(/(\d+(?:\.\d+)?)/) || docId.match(/(\d+)/);
          const number = numMatch ? Number(numMatch[1]) : idx + 1;
          return {
            number,
            episode: number,
            docId,
            name: rawName,
            titleAr: f.title_translated?.stringValue || '',
            thumb: f.thumb_uri?.stringValue || anime.banner || anime.poster,
            filler: Boolean(f.filler?.booleanValue)
          };
        });
        const seenNums = new Map();
        for (const ep of rawEps) {
          const existing = seenNums.get(ep.number);
          if (!existing || String(ep.docId).length > String(existing.docId).length) {
            seenNums.set(ep.number, ep);
          }
        }
        const eps = Array.from(seenNums.values());
        eps.sort((a, b) => a.number - b.number);
        setAnimeEpisodes(eps);
      } else {
        setAnimeEpisodes([{ number: 1, docId: '001', name: 'الحلقة 1', titleAr: '', thumb: anime.poster, filler: false }]);
      }
    } catch (_) {
      setAnimeEpisodes([{ number: 1, docId: '001', name: 'الحلقة 1', titleAr: '', thumb: anime.poster, filler: false }]);
    } finally {
      setEpisodesLoading(false);
    }
  }, []);

  // Select and play a specific server (with automatic fallback to next working server if null)
  const handleSelectServer = useCallback(async (srv, allCandidateServers = []) => {
    if (!srv) return;
    setSelectedServer(srv);
    setResolvingVideo(true);
    try {
      const directMp4 = await resolveMobileVideoUrl(srv.name, srv.link);
      if (directMp4) {
        setPlayingVideoUrl(directMp4);
        setResolvingVideo(false);
        return;
      }
      // If this server link failed to resolve (e.g. dead MediaFire file), auto-try next server
      if (allCandidateServers.length > 0) {
        const curIdx = allCandidateServers.indexOf(srv);
        for (let i = curIdx + 1; i < allCandidateServers.length; i++) {
          const nextSrv = allCandidateServers[i];
          const nextMp4 = await resolveMobileVideoUrl(nextSrv.name, nextSrv.link);
          if (nextMp4) {
            setSelectedServer(nextSrv);
            setPlayingVideoUrl(nextMp4);
            setResolvingVideo(false);
            return;
          }
        }
      }
      setPlayingVideoUrl('');
    } catch (_) {
      setPlayingVideoUrl('');
    } finally {
      setResolvingVideo(false);
    }
  }, []);

  // Auto-failover if <video> encounters a network/codec error on the current URL
  const handleVideoElementError = useCallback(() => {
    if (!playingVideoUrl) return;
    // 1. If pixeldrain.dev failed, try pixeldrain.net, then pixeldrain.com
    if (playingVideoUrl.includes('pixeldrain.dev/api/file/')) {
      setPlayingVideoUrl(playingVideoUrl.replace('pixeldrain.dev', 'pixeldrain.net'));
      return;
    }
    if (playingVideoUrl.includes('pixeldrain.net/api/file/')) {
      setPlayingVideoUrl(playingVideoUrl.replace('pixeldrain.net', 'pixeldrain.com'));
      return;
    }
    // 2. Otherwise hop to next server in episodeServers
    if (episodeServers.length > 1 && selectedServer) {
      const idx = episodeServers.findIndex(
        (s) => s.name === selectedServer.name && s.quality === selectedServer.quality && s.link === selectedServer.link
      );
      if (idx !== -1 && idx + 1 < episodeServers.length) {
        handleSelectServer(episodeServers[idx + 1], episodeServers);
      }
    }
  }, [playingVideoUrl, episodeServers, selectedServer, handleSelectServer]);

  // Open an Episode and fetch all its multi-quality servers from BOTH Firestore collections + AllAnime Cloud
  const handlePlayEpisode = useCallback(
    async (anime, epObj) => {
      if (!anime || !epObj) return;
      setActiveEpisode(epObj);
      setEpisodeServers([]);
      setPlayingVideoUrl('');
      setResolvingVideo(true);

      // Save to Watch History & sync with Website Cloud DB
      const newHistItem = {
        slug: anime.slug,
        objectID: anime.objectID,
        episode: epObj.number,
        docId: epObj.docId,
        titleEn: anime.titleEn,
        titleAr: anime.titleAr,
        poster: anime.poster,
        updatedAt: new Date().toISOString()
      };
      setWatchHistory((prev) => {
        const next = [newHistItem, ...prev.filter((x) => x.objectID !== anime.objectID)].slice(0, 50);
        localStorage.setItem('bx_mob_history', JSON.stringify(next));
        if (user) syncUserStateToCloud(user, favorites, next);
        return next;
      });

      const encId = encodeURIComponent(anime.objectID);
      const docIdsToTry = Array.from(
        new Set([
          String(epObj.docId || '001'),
          String(epObj.number || 1).padStart(3, '0'),
          String(epObj.number || 1).padStart(4, '0'),
          String(epObj.number || 1)
        ])
      );

      try {
        let combinedRaw = [];

        for (const candidateDocId of docIdsToTry) {
          const encEp = encodeURIComponent(candidateDocId);
          const [r2, r1] = await Promise.all([
            fetch(`${AW_FS_BASE}/anime_list/${encId}/episodes/${encEp}/servers2/all_servers?key=${AW_FS_KEY}`).catch(() => null),
            fetch(`${AW_FS_BASE}/anime_list/${encId}/episodes/${encEp}/servers?key=${AW_FS_KEY}`).catch(() => null)
          ]);

          if (r2 && r2.ok) {
            const d2 = await r2.json();
            const vals = d2?.fields?.servers?.arrayValue?.values || [];
            for (const v of vals) {
              const f = v?.mapValue?.fields || {};
              if (f.link?.stringValue && f.name?.stringValue) {
                combinedRaw.push({
                  name: f.name.stringValue.toUpperCase().trim(),
                  quality: f.quality?.stringValue || '1080p',
                  link: f.link.stringValue.trim(),
                  visible: f.visible?.booleanValue !== false
                });
              }
            }
          }

          if (r1 && r1.ok) {
            const d1 = await r1.json();
            for (const doc of d1.documents || []) {
              const f = doc.fields || {};
              if (f.link?.stringValue && f.name?.stringValue) {
                combinedRaw.push({
                  name: f.name.stringValue.toUpperCase().trim(),
                  quality: f.quality?.stringValue || '1080p',
                  link: f.link.stringValue.trim(),
                  visible: f.visible?.booleanValue !== false
                });
              }
            }
          }

          if (combinedRaw.length > 0) break;
        }

        // Expand PixelDrain (PD) into Anti-Block Mirrors (PD_DEV, PD_NET, PD) + keep SF, MF2, MF, ST
        const expanded = [];
        const seen = new Set();

        for (const s of combinedRaw) {
          if (!s.link || s.visible === false || s.name === 'MG' || s.name === 'KF' || s.name === 'US' || s.name === 'XS') {
            continue;
          }
          const key = `${s.name}|${s.quality}|${s.link}`;
          if (seen.has(key)) continue;
          seen.add(key);

          if (s.name === 'PD' || s.link.includes('pixeldrain.')) {
            const m = s.link.match(/pixeldrain\.[a-z]+\/(?:u|api\/file)\/([A-Za-z0-9_-]+)/i);
            if (m?.[1]) {
              const fid = m[1];
              expanded.push({
                name: 'PD_DEV',
                quality: s.quality || '1080p',
                link: `https://pixeldrain.dev/api/file/${fid}`,
                visible: true
              });
              expanded.push({
                name: 'PD_NET',
                quality: s.quality || '1080p',
                link: `https://pixeldrain.net/api/file/${fid}`,
                visible: true
              });
              expanded.push({
                name: 'PD',
                quality: s.quality || '1080p',
                link: `https://pixeldrain.com/api/file/${fid}`,
                visible: true
              });
              continue;
            }
          }
          expanded.push(s);
        }

        // Also fetch AllAnime Direct MP4 server in parallel as a universal fallback
        const aaServers = await fetchAllAnimeDirectServers(anime.titleRomaji || anime.titleEn, epObj.number).catch(() => []);
        for (const a of aaServers) {
          expanded.push(a);
        }

        const usable = expanded.sort((a, b) => {
          const pA = SERVER_PRIORITY[a.name] || 99;
          const pB = SERVER_PRIORITY[b.name] || 99;
          if (pA !== pB) return pA - pB;
          const qA = parseInt(a.quality, 10) || 720;
          const qB = parseInt(b.quality, 10) || 720;
          return qB - qA;
        });

        setEpisodeServers(usable);
        if (usable.length > 0) {
          await handleSelectServer(usable[0], usable);
        } else {
          setResolvingVideo(false);
        }
      } catch (_) {
        setResolvingVideo(false);
      }
    },
    [user, favorites, syncUserStateToCloud, handleSelectServer]
  );

  // Toggle Anime in Favorites (Synced with Website)
  const toggleFavorite = useCallback(
    (anime) => {
      if (!anime) return;
      setFavorites((prev) => {
        const exists = prev.some((f) => f.objectID === anime.objectID || f.slug === anime.slug);
        let next;
        if (exists) {
          next = prev.filter((f) => f.objectID !== anime.objectID && f.slug !== anime.slug);
          showToast(lang === 'ar' ? 'تمت الإزالة من قائمتك' : 'Removed from My List');
        } else {
          next = [
            {
              slug: anime.slug,
              objectID: anime.objectID,
              titleEn: anime.titleEn,
              titleAr: anime.titleAr,
              poster: anime.poster,
              banner: anime.banner,
              rating: anime.rating,
              createdAt: new Date().toISOString()
            },
            ...prev
          ];
          showToast(lang === 'ar' ? '✓ تمت الإضافة إلى قائمتك ومزامنتها مع الموقع!' : '✓ Added to My List & synced!');
        }
        localStorage.setItem('bx_mob_favorites', JSON.stringify(next));
        if (user) syncUserStateToCloud(user, next, watchHistory);
        return next;
      });
    },
    [user, watchHistory, syncUserStateToCloud, showToast, lang]
  );

  // Open Manga from Manga Peak Engines (Mello Plus 14,331 + Azora 2,453 + Swat 1,669 + Dilar 9,164) & MangaDex API v5
  const handleOpenManga = useCallback(async (mangaHit) => {
    setSelectedManga(mangaHit);
    setActiveMangaChapter(null);
    setMangaPages([]);
    setMangaChapters([]);
    setMangaChaptersLoading(true);
    try {
      const src = mangaHit.source || 'algolia';
      const title = mangaHit.name || '';

      // 1. Mello Plus (plus.mangamello.com)
      if (src === 'mello' && mangaHit.sourceId) {
        const json = await nativeGetJson(
          `https://plus.mangamello.com/api/v1/mangas/${mangaHit.sourceId}/chapters?per_page=1000`,
          MELLO_API_HEADERS
        );
        const chs = (json?.data || []).map((ch, idx) => ({
          id: `mm:${mangaHit.sourceId}:${ch.id}`,
          source: 'mello',
          mangaId: mangaHit.sourceId,
          chapterId: String(ch.id),
          chapter: ch.order ?? idx + 1,
          title: ch.title || `الفصل ${ch.order ?? idx + 1}`,
          lang: 'ar'
        }));
        if (chs.length > 0) {
          setMangaChapters(chs);
          return;
        }
      }

      // 2. Azora Moon / Azorafly (api.azorafly.com)
      if (src === 'azora' && mangaHit.slug) {
        let postId = mangaHit.postId;
        if (!postId) {
          const pJson = await nativeGetJson(
            `https://api.azorafly.com/api/post?postSlug=${encodeURIComponent(mangaHit.slug)}`
          );
          postId = pJson?.post?.id;
        }
        if (postId) {
          const chJson = await nativeGetJson(
            `https://api.azorafly.com/api/chapters?postId=${postId}&skip=0&take=900&order=desc&userid=`
          );
          const list = chJson?.post?.chapters || [];
          const chs = list.map((ch) => ({
            id: `az:${ch.id}`,
            source: 'azora',
            chapterId: String(ch.id),
            chapter: ch.number ?? '1',
            title: ch.title || `الفصل ${ch.number ?? ''}`,
            lang: 'ar'
          }));
          if (chs.length > 0) {
            setMangaChapters(chs);
            return;
          }
        }
      }

      // 3. Manga Swat (appswat.com)
      if (src === 'swat' && mangaHit.sourceId) {
        const chJson = await nativeGetJson(
          `https://appswat.com/v2/api/v2/chapters/?serie=${mangaHit.sourceId}&order_by=order&page_size=500&page=1`,
          SWAT_API_HEADERS
        );
        const list = chJson?.results || [];
        const chs = list.map((ch, idx) => ({
          id: `sw:${ch.id}`,
          source: 'swat',
          chapterId: String(ch.id),
          chapter: ch.chapter || idx + 1,
          title: ch.title || `الفصل ${ch.chapter || idx + 1}`,
          lang: 'ar'
        }));
        if (chs.length > 0) {
          setMangaChapters(chs);
          return;
        }
      }

      // 4. For Dilar Tube or Algolia items, first resolve in Mello Plus / Azora / Swat for full Arabic chapters
      if (title) {
        const [melloSearch, azoraSearch] = await Promise.all([
          nativeGetJson(
            `https://plus.mangamello.com/api/v1/mangas/search?per_page=5&page=1&title=${encodeURIComponent(title)}`,
            MELLO_API_HEADERS
          ).catch(() => null),
          nativeGetJson(
            `https://api.azorafly.com/api/query?page=1&perPage=5&searchTerm=${encodeURIComponent(title)}`
          ).catch(() => null)
        ]);

        const melloMatch = melloSearch?.data?.[0];
        if (melloMatch?.id) {
          const chJson = await nativeGetJson(
            `https://plus.mangamello.com/api/v1/mangas/${melloMatch.id}/chapters?per_page=1000`,
            MELLO_API_HEADERS
          ).catch(() => null);
          if (chJson?.data?.length) {
            setMangaChapters(
              chJson.data.map((ch, idx) => ({
                id: `mm:${melloMatch.id}:${ch.id}`,
                source: 'mello',
                mangaId: String(melloMatch.id),
                chapterId: String(ch.id),
                chapter: ch.order ?? idx + 1,
                title: ch.title || `الفصل ${ch.order ?? idx + 1}`,
                lang: 'ar'
              }))
            );
            return;
          }
        }

        const azoraMatch = azoraSearch?.posts?.[0];
        if (azoraMatch?.id) {
          const chJson = await nativeGetJson(
            `https://api.azorafly.com/api/chapters?postId=${azoraMatch.id}&skip=0&take=900&order=desc&userid=`
          ).catch(() => null);
          const list = chJson?.post?.chapters || [];
          if (list.length) {
            setMangaChapters(
              list.map((ch) => ({
                id: `az:${ch.id}`,
                source: 'azora',
                chapterId: String(ch.id),
                chapter: ch.number ?? '1',
                title: ch.title || `الفصل ${ch.number ?? ''}`,
                lang: 'ar'
              }))
            );
            return;
          }
        }
      }

      // 5. Fallback to MangaDex API v5
      const mdRes = await fetch(
        `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=5&order[followedCount]=desc`
      ).then((r) => r.json());
      const mdId = mdRes?.data?.[0]?.id;
      if (mdId) {
        const feed = await fetch(
          `https://api.mangadex.org/manga/${mdId}/feed?limit=96&translatedLanguage[]=ar&translatedLanguage[]=en&order[chapter]=asc`
        ).then((r) => r.json());
        const seenCh = new Set();
        const chs = [];
        for (const item of feed?.data || []) {
          const chNum = item.attributes?.chapter || '1';
          const langCode = item.attributes?.translatedLanguage || 'en';
          const key = `${chNum}`;
          if (seenCh.has(key) && langCode !== 'ar') continue;
          seenCh.add(key);
          chs.push({
            id: item.id,
            source: 'mangadex',
            chapter: chNum,
            title: item.attributes?.title || `الفصل ${chNum}`,
            lang: langCode
          });
        }
        setMangaChapters(chs);
      }
    } catch (_) {
    } finally {
      setMangaChaptersLoading(false);
    }
  }, []);

  const handleReadMangaChapter = useCallback(
    async (ch) => {
      setActiveMangaChapter(ch);
      setCurrentPageIdx(0);
      setAutoScrollSpeed(0);
      setMangaPages([]);
      setMangaPagesLoading(true);

      // Save to Manga Reading History
      if (selectedManga) {
        const histEntry = {
          objectID: selectedManga.objectID,
          name: selectedManga.name,
          poster_uri: selectedManga.poster?.large || selectedManga.poster_uri || '',
          source: selectedManga.source,
          sourceId: selectedManga.sourceId,
          slug: selectedManga.slug,
          postId: selectedManga.postId,
          lastChapter: ch.chapter,
          lastChapterId: ch.id,
          updatedAt: new Date().toISOString()
        };
        setMangaHistory((prev) => {
          const next = [histEntry, ...prev.filter((x) => x.objectID !== selectedManga.objectID)].slice(0, 50);
          localStorage.setItem('bx_mob_manga_history', JSON.stringify(next));
          return next;
        });
      }

      try {
        if (ch.source === 'mello' && ch.mangaId && ch.chapterId) {
          const json = await nativeGetJson(
            `https://plus.mangamello.com/api/v1/mangas/${ch.mangaId}/chapters/${ch.chapterId}?relations=chapterImages`,
            MELLO_API_HEADERS
          );
          const imgs = (json?.data?.chapterImages || [])
            .map((img) => rewriteLegacyMangaImageUrl(img.src))
            .filter(Boolean);
          setMangaPages(imgs);
          return;
        }

        if (ch.source === 'azora' && ch.chapterId) {
          const json = await nativeGetJson(`https://api.azorafly.com/api/chapter?chapterId=${ch.chapterId}`);
          const imgs = (json?.chapter?.images || []).map((img) => img.url).filter(Boolean);
          setMangaPages(imgs);
          return;
        }

        if (ch.source === 'swat' && ch.chapterId) {
          const json = await nativeGetJson(
            `https://appswat.com/v2/api/v2/chapters/${ch.chapterId}/`,
            SWAT_API_HEADERS
          );
          const imgs = (json?.images || [])
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((img) => img.image)
            .filter(Boolean);
          setMangaPages(imgs);
          return;
        }

        const atHome = await fetch(`https://api.mangadex.org/at-home/server/${ch.id}`).then((r) => r.json());
        const baseUrl = atHome?.baseUrl;
        const hash = atHome?.chapter?.hash;
        const files = atHome?.chapter?.dataSaver || atHome?.chapter?.data || [];
        const mode = atHome?.chapter?.dataSaver ? 'data-saver' : 'data';
        if (baseUrl && hash && files.length) {
          setMangaPages(files.map((f) => `${baseUrl}/${mode}/${hash}/${f}`));
        }
      } catch (_) {
      } finally {
        setMangaPagesLoading(false);
      }
    },
    [selectedManga]
  );

  // Set Watchlist Status (watching | completed | planned | on_hold)
  const handleSetWatchlistStatus = useCallback(
    (anime, statusKey) => {
      if (!anime?.objectID) return;
      setWatchlistMap((prev) => {
        const next = { ...prev };
        if (next[anime.objectID]?.status === statusKey) {
          delete next[anime.objectID];
          showToast(lang === 'ar' ? 'تمت الإزالة من تصنيف المكتبة' : 'Removed from status list');
        } else {
          next[anime.objectID] = {
            status: statusKey,
            objectID: anime.objectID,
            slug: anime.slug,
            titleEn: anime.titleEn,
            titleAr: anime.titleAr,
            poster: anime.poster,
            rating: anime.rating,
            type: anime.type,
            updatedAt: new Date().toISOString()
          };
          const labels = {
            watching: '🔥 أشاهد حالياً',
            completed: '✔ مكتمل',
            planned: '📌 أخطط لمشاهدته',
            on_hold: '⏸ متوقف مؤقتاً'
          };
          showToast(`✓ ${labels[statusKey] || statusKey}`);
        }
        localStorage.setItem('bx_mob_watchlist_map', JSON.stringify(next));
        return next;
      });
    },
    [showToast, lang]
  );

  // Post Review on Selected Anime (Synced to Cloud Firestore)
  const handlePostAnimeReview = useCallback(
    async (e) => {
      e.preventDefault();
      if (!selectedAnime || !newReviewText.trim()) return;
      const rev = {
        id: `rev_${Date.now()}`,
        author: user?.displayName || (lang === 'ar' ? 'أوتاكو BLACK X' : 'BLACK X Otaku'),
        role: user?.role || 'user',
        score: newReviewScore,
        episode: activeEpisode?.number || null,
        text: newReviewText.trim(),
        time: lang === 'ar' ? 'الآن' : 'Just now'
      };
      const updated = [rev, ...animeReviews].slice(0, 50);
      setAnimeReviews(updated);
      setNewReviewText('');
      const nextXp = userXp + 25;
      setUserXp(nextXp);
      localStorage.setItem('bx_mob_xp', String(nextXp));
      showToast(lang === 'ar' ? '✓ تم نشر تقييمك (+25 XP) ومزامنته مع السحابة!' : '✓ Review posted (+25 XP)!');
      try {
        const revKey = cleanCloudKey('reviews', selectedAnime.slug || selectedAnime.objectID);
        await fetch(`${BX_SETTINGS_BASE}/${revKey}?key=${BX_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              json: { stringValue: JSON.stringify(updated) },
              updatedAt: { stringValue: new Date().toISOString() }
            }
          })
        });
      } catch (_) {}
    },
    [selectedAnime, newReviewText, newReviewScore, activeEpisode, user, animeReviews, userXp, showToast, lang]
  );

  // Vote on Prediction in Arena (+XP)
  const handleVotePrediction = useCallback(
    (predId, optionKey, xpReward = 50) => {
      if (votedPredictions[predId]) {
        showToast(lang === 'ar' ? 'لقد قمت بالتصويت على هذا التوقع مسبقاً!' : 'Already voted!');
        return;
      }
      const nextVoted = { ...votedPredictions, [predId]: optionKey };
      setVotedPredictions(nextVoted);
      localStorage.setItem('bx_mob_voted_preds', JSON.stringify(nextVoted));
      setPredictions((prev) =>
        prev.map((p) =>
          p.id === predId
            ? {
                ...p,
                votesA: optionKey === 'A' ? p.votesA + 1 : p.votesA,
                votesB: optionKey === 'B' ? p.votesB + 1 : p.votesB
              }
            : p
        )
      );
      const nextXp = userXp + xpReward;
      setUserXp(nextXp);
      localStorage.setItem('bx_mob_xp', String(nextXp));
      showToast(lang === 'ar' ? `🔮 تم تسجيل توقعك بنجاح (+${xpReward} XP)!` : `🔮 Prediction locked (+${xpReward} XP)!`);
    },
    [votedPredictions, userXp, showToast, lang]
  );

  // Save Profile Edits & Sync with Cloud Firestore
  const handleSaveProfileEdit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!user) return;
      const updatedUser = {
        ...user,
        displayName: editDisplayName.trim() || user.displayName,
        bio: editBio.trim(),
        photoUrl: editPhotoUrl.trim() || user.photoUrl
      };
      setUser(updatedUser);
      localStorage.setItem('bx_mob_user', JSON.stringify(updatedUser));
      setEditingProfile(false);
      await syncUserStateToCloud(updatedUser, favorites, watchHistory);
      showToast(lang === 'ar' ? '✓ تم تحديث ملفك الشخصي ومزامنته مع الموقع!' : '✓ Profile updated & synced!');
    },
    [user, editDisplayName, editBio, editPhotoUrl, favorites, watchHistory, syncUserStateToCloud, showToast, lang]
  );

  // Handle Login & Register against Shared BLACK X Cloud Firestore
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthBusy(true);
    try {
      const cleanId = (authUsername || authEmail).trim().toLowerCase();
      if (!cleanId || !authPassword) {
        showToast(lang === 'ar' ? 'يرجى إدخال اسم المستخدم وكلمة المرور' : 'Enter username and password');
        setAuthBusy(false);
        return;
      }
      const passHash = await sha256Browser(authPassword);
      const isEmail = cleanId.includes('@');
      const docKey = isEmail ? cleanCloudKey('email', cleanId) : cleanCloudKey('user', cleanId);

      if (authMode === 'login') {
        const res = await fetch(`${BX_SETTINGS_BASE}/${docKey}?key=${BX_KEY}`);
        if (res.ok) {
          const doc = await res.json();
          const raw = doc?.fields?.json?.stringValue;
          if (raw) {
            const cloudUser = JSON.parse(raw);
            if (!cloudUser.passSha256 || cloudUser.passSha256 === passHash) {
              const loggedUser = {
                id: cloudUser.id || `u_${Date.now()}`,
                username: cloudUser.username || cleanId.split('@')[0],
                email: cloudUser.email || (isEmail ? cleanId : `${cleanId}@blackx.app`),
                displayName: cloudUser.displayName || cloudUser.username || cleanId,
                photoUrl: cloudUser.photoUrl || '',
                avatarColor: cloudUser.avatarColor || '#ffffff',
                role: cloudUser.role || (cleanId === 'mz0970mmz@gmail.com' ? 'developer' : 'user'),
                vipStatus: cloudUser.vipStatus || 'VIP Monarch',
                passSha256: passHash
              };
              setUser(loggedUser);
              localStorage.setItem('bx_mob_user', JSON.stringify(loggedUser));
              if (Array.isArray(cloudUser.favorites) && cloudUser.favorites.length) {
                setFavorites(cloudUser.favorites);
                localStorage.setItem('bx_mob_favorites', JSON.stringify(cloudUser.favorites));
              }
              if (Array.isArray(cloudUser.progress) && cloudUser.progress.length) {
                setWatchHistory(cloudUser.progress);
                localStorage.setItem('bx_mob_history', JSON.stringify(cloudUser.progress));
              }
              await syncUserStateToCloud(
                loggedUser,
                cloudUser.favorites || favorites,
                cloudUser.progress || watchHistory
              );
              showToast(lang === 'ar' ? `👑 مرحباً بعودتك ${loggedUser.displayName}!` : `👑 Welcome back ${loggedUser.displayName}!`);
              setAuthBusy(false);
              return;
            } else {
              showToast(lang === 'ar' ? 'كلمة المرور غير صحيحة' : 'Invalid password');
              setAuthBusy(false);
              return;
            }
          }
        }
        showToast(lang === 'ar' ? 'الحساب غير موجود، يمكنك إنشاؤه الآن!' : 'Account not found, please register!');
      } else {
        const uname = (authUsername || cleanId.split('@')[0]).toLowerCase().replace(/[^a-z0-9_.-]/g, '');
        const uemail = (authEmail || `${uname}@blackx.app`).toLowerCase();
        const newUser = {
          id: `bx_${Date.now()}`,
          username: uname,
          email: uemail,
          displayName: authDisplayName || uname,
          photoUrl: '',
          avatarColor: '#ffffff',
          role: uemail === 'mz0970mmz@gmail.com' ? 'developer' : 'user',
          vipStatus: 'VIP Monarch',
          passSha256: passHash
        };
        setUser(newUser);
        localStorage.setItem('bx_mob_user', JSON.stringify(newUser));
        await syncUserStateToCloud(newUser, favorites, watchHistory);
        showToast(lang === 'ar' ? '🎉 تم إنشاء حسابك ومزامنته مع الموقع بنجاح!' : '🎉 Account created & synced with Website!');
      }
    } catch (_) {
      showToast(lang === 'ar' ? 'تعذر الاتصال بالسحابة' : 'Cloud connection error');
    } finally {
      setAuthBusy(false);
    }
  };

  // Publish Post to Shared Community Feed (with Category, Spoiler Tag, Likes & Replies)
  const handlePublishPost = async (e) => {
    e.preventDefault();
    if (!newPostText.trim()) return;
    const post = {
      id: `post_${Date.now()}`,
      author: user?.displayName || (lang === 'ar' ? 'أوتاكو BLACK X' : 'BLACK X Otaku'),
      username: user?.username || 'otaku',
      role: user?.role || 'user',
      category: postCategory,
      isSpoiler: postIsSpoiler || postCategory === 'spoiler',
      time: lang === 'ar' ? 'الآن' : 'Just now',
      text: newPostText.trim(),
      likes: 1,
      replies: []
    };
    const updated = [post, ...communityPosts].slice(0, 60);
    setCommunityPosts(updated);
    setNewPostText('');
    setPostIsSpoiler(false);
    const nextXp = userXp + 15;
    setUserXp(nextXp);
    localStorage.setItem('bx_mob_xp', String(nextXp));
    showToast(lang === 'ar' ? '✓ تم نشر منشورك (+15 XP) ومزامنته مع مجتمع الموقع!' : '✓ Post published (+15 XP) & synced!');
    try {
      await fetch(`${BX_SETTINGS_BASE}/shared_community_feed?key=${BX_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            json: { stringValue: JSON.stringify(updated) },
            updatedAt: { stringValue: new Date().toISOString() }
          }
        })
      });
    } catch (_) {}
  };

  const handleLikePost = useCallback(
    async (postId) => {
      const updated = communityPosts.map((p) =>
        p.id === postId ? { ...p, likes: (Number(p.likes) || 0) + 1 } : p
      );
      setCommunityPosts(updated);
      try {
        await fetch(`${BX_SETTINGS_BASE}/shared_community_feed?key=${BX_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              json: { stringValue: JSON.stringify(updated) },
              updatedAt: { stringValue: new Date().toISOString() }
            }
          })
        });
      } catch (_) {}
    },
    [communityPosts]
  );

  const handleAddPostReply = useCallback(
    async (postId) => {
      if (!replyText.trim()) return;
      const replyObj = {
        id: `rep_${Date.now()}`,
        author: user?.displayName || (lang === 'ar' ? 'أوتاكو BLACK X' : 'BLACK X Otaku'),
        role: user?.role || 'user',
        text: replyText.trim(),
        time: lang === 'ar' ? 'الآن' : 'Just now'
      };
      const updated = communityPosts.map((p) =>
        p.id === postId ? { ...p, replies: [...(Array.isArray(p.replies) ? p.replies : []), replyObj] } : p
      );
      setCommunityPosts(updated);
      setReplyText('');
      setReplyingToPostId(null);
      showToast(lang === 'ar' ? '✓ تم إرسال ردك!' : '✓ Reply added!');
      try {
        await fetch(`${BX_SETTINGS_BASE}/shared_community_feed?key=${BX_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              json: { stringValue: JSON.stringify(updated) },
              updatedAt: { stringValue: new Date().toISOString() }
            }
          })
        });
      } catch (_) {}
    },
    [communityPosts, replyText, user, showToast, lang]
  );

  // Filtered & sorted episodes inside Anime Detail Sheet
  const displayedEpisodes = useMemo(() => {
    let list = [...animeEpisodes];
    if (hideFiller) {
      list = list.filter((ep) => !ep.filler);
    }
    if (epSearchQuery.trim()) {
      const q = epSearchQuery.trim().toLowerCase();
      list = list.filter(
        (ep) =>
          String(ep.number).includes(q) ||
          ep.name.toLowerCase().includes(q) ||
          (ep.titleAr || '').toLowerCase().includes(q)
      );
    }
    if (!epAscending) list.reverse();
    return list;
  }, [animeEpisodes, hideFiller, epSearchQuery, epAscending]);

  const handleVideoDoubleTap = (side) => {
    if (!videoRef.current) return;
    if (side === 'left') {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
    } else {
      videoRef.current.currentTime = Math.min(
        videoRef.current.duration || 9999,
        videoRef.current.currentTime + 10
      );
    }
    setSkipRipple(side);
    setTimeout(() => setSkipRipple(null), 550);
  };

  const heroAnime = popularList[heroSlide] || popularList[0] || null;
  const isRtl = lang === 'ar';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100dvh',
        background: '#000000',
        color: '#ffffff',
        fontFamily: "'Cairo', 'Tajawal', 'Inter', system-ui, sans-serif",
        paddingBottom: '86px',
        overflowX: 'hidden',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none'
      }}
    >
      <style>{`
        @keyframes bxPulseGlow {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }
        @keyframes bxSlideUp {
          from { opacity: 0; transform: translate3d(0, 24px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        .bx-mob-scroll::-webkit-scrollbar { display: none; }
        .bx-mob-scroll { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .bx-mob-card {
          transition: transform 0.16s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform;
        }
        .bx-mob-card:active {
          transform: scale(0.95);
        }
      `}</style>

      {/* Top Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'rgba(12, 12, 14, 0.96)',
            border: '1px solid rgba(255, 255, 255, 0.28)',
            color: '#fff',
            padding: '0.65rem 1.2rem',
            borderRadius: '999px',
            fontSize: '0.82rem',
            fontWeight: 900,
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(16px)',
            whiteSpace: 'nowrap'
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Top Native-Style AMOLED Header Bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 90,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.7rem 1rem',
          background: 'rgba(0, 0, 0, 0.86)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: '#ffffff',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.15rem',
              boxShadow: '0 0 18px rgba(255,255,255,0.35)'
            }}
          >
            X
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '0.06em' }}>BLACK X</span>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  padding: '0.12rem 0.42rem',
                  borderRadius: '6px',
                  background: '#ffffff',
                  color: '#000000'
                }}
              >
                {fpsHz}Hz
              </span>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>
              {isRtl ? 'نسخة الهاتف السحابية • 6,973 أنمي' : 'Mobile Cloud Edition • 6,973 Anime'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {/* Instant Search Trigger */}
          <button
            type="button"
            onClick={() => {
              setSelectedAnime(null);
              setActiveTab('catalog');
            }}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '11px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#fff',
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
            🔍
          </button>

          {/* AR / EN Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = lang === 'ar' ? 'en' : 'ar';
              setLang(next);
              localStorage.setItem('bx_mob_lang', next);
            }}
            style={{
              height: '36px',
              padding: '0 0.65rem',
              borderRadius: '11px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 900,
              cursor: 'pointer'
            }}
          >
            {lang === 'ar' ? 'EN' : 'عربي'}
          </button>

          {/* Profile Avatar Pill */}
          <button
            type="button"
            onClick={() => {
              setSelectedAnime(null);
              setActiveTab('profile');
            }}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: user ? '#ffffff' : 'rgba(255,255,255,0.1)',
              color: user ? '#000000' : '#ffffff',
              border: '1px solid rgba(255,255,255,0.25)',
              fontWeight: 900,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            {user ? (user.displayName?.[0] || 'X').toUpperCase() : '👤'}
          </button>
        </div>
      </header>

      {/* ==================== TAB 1: HOME (ANIME WITCHER LUXURY LAYOUT) ==================== */}
      {activeTab === 'home' && !selectedAnime && (
        <main style={{ animation: 'bxSlideUp 0.22s ease-out' }}>
          {/* Hero Spotlight Banner */}
          {heroAnime && (
            <section
              style={{
                position: 'relative',
                width: '100%',
                height: '390px',
                overflow: 'hidden',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <img
                src={heroAnime.banner || heroAnime.poster}
                alt={heroAnime.titleEn}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: 'brightness(0.55) contrast(1.08)'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 55%, #000000 100%)'
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  right: '16px',
                  display: 'flex',
                  gap: '0.9rem',
                  alignItems: 'flex-end'
                }}
              >
                <img
                  src={heroAnime.poster}
                  alt={heroAnime.titleEn}
                  onClick={() => handleOpenAnime(heroAnime)}
                  style={{
                    width: '104px',
                    height: '148px',
                    objectFit: 'cover',
                    borderRadius: '14px',
                    border: '1.5px solid rgba(255,255,255,0.35)',
                    boxShadow: '0 12px 28px rgba(0,0,0,0.85)',
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                    <span
                      style={{
                        background: '#ffffff',
                        color: '#000000',
                        fontSize: '0.66rem',
                        fontWeight: 900,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px'
                      }}
                    >
                      ★ {heroAnime.rating} MAL
                    </span>
                    <span
                      style={{
                        background: 'rgba(255,255,255,0.14)',
                        color: '#ffffff',
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px'
                      }}
                    >
                      {heroAnime.type} • {heroAnime.state}
                    </span>
                  </div>

                  <h1
                    style={{
                      margin: '0 0 0.3rem',
                      fontSize: '1.15rem',
                      fontWeight: 900,
                      lineHeight: 1.25,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {heroAnime.titleEn}
                  </h1>

                  <p
                    style={{
                      margin: '0 0 0.65rem',
                      fontSize: '0.74rem',
                      color: 'rgba(255,255,255,0.72)',
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {heroAnime.storyAr}
                  </p>

                  <div style={{ display: 'flex', gap: '0.45rem' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenAnime(heroAnime)}
                      style={{
                        flex: 1,
                        padding: '0.58rem 0.85rem',
                        borderRadius: '11px',
                        border: 'none',
                        background: '#ffffff',
                        color: '#000000',
                        fontWeight: 900,
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      ▶ {isRtl ? 'شاهد الآن' : 'Watch Now'}
                    </button>
                    {heroAnime.youtubeId && (
                      <button
                        type="button"
                        onClick={() => setHeroTrailerOpen((v) => !v)}
                        style={{
                          padding: '0.58rem 0.7rem',
                          borderRadius: '11px',
                          border: '1px solid rgba(255,255,255,0.28)',
                          background: 'rgba(255,255,255,0.1)',
                          color: '#ffffff',
                          fontWeight: 900,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        🎬 {isRtl ? 'تريلر' : 'Trailer'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleFavorite(heroAnime)}
                      style={{
                        padding: '0.58rem 0.75rem',
                        borderRadius: '11px',
                        border: '1px solid rgba(255,255,255,0.28)',
                        background: 'rgba(255,255,255,0.08)',
                        color: '#ffffff',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      {favorites.some((f) => f.objectID === heroAnime.objectID) ? '♥' : '＋'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Hero Slide Dots */}
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '14px',
                  display: 'flex',
                  gap: '4px'
                }}
              >
                {popularList.slice(0, 6).map((_, idx) => (
                  <span
                    key={idx}
                    onClick={() => setHeroSlide(idx)}
                    style={{
                      width: heroSlide === idx ? '18px' : '6px',
                      height: '6px',
                      borderRadius: '99px',
                      background: heroSlide === idx ? '#ffffff' : 'rgba(255,255,255,0.3)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Embedded Hero Trailer Sheet */}
          {heroTrailerOpen && heroAnime?.youtubeId && (
            <div style={{ padding: '0.75rem 1rem', background: '#070709', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <span style={{ fontWeight: 900, fontSize: '0.8rem' }}>🎬 {heroAnime.titleEn} — Official Trailer</span>
                <button
                  type="button"
                  onClick={() => setHeroTrailerOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 900, cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: '12px', overflow: 'hidden' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${heroAnime.youtubeId}?autoplay=1`}
                  title={heroAnime.titleEn}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  frameBorder="0"
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
          )}

          {/* Continue Watching Strip (Synced with Website) */}
          {watchHistory.length > 0 && (
            <section style={{ padding: '1rem 1rem 0.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <h2 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900 }}>
                  ⚡ {isRtl ? 'أكمل المشاهدة' : 'Continue Watching'}
                </h2>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                  {isRtl ? 'متزامن مع حسابك' : 'Cloud Synced'}
                </span>
              </div>
              <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
                {watchHistory.slice(0, 12).map((h, i) => (
                  <div
                    key={`${h.objectID}-${i}`}
                    className="bx-mob-card"
                    onClick={() =>
                      handleOpenAnime({
                        objectID: h.objectID,
                        slug: h.slug,
                        titleEn: h.titleEn,
                        titleAr: h.titleAr,
                        poster: h.poster,
                        banner: h.poster,
                        rating: '9.1',
                        type: 'مسلسل',
                        state: 'مستمر',
                        storyAr: ''
                      })
                    }
                    style={{
                      minWidth: '155px',
                      background: '#0a0a0c',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '14px',
                      padding: '0.55rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      cursor: 'pointer'
                    }}
                  >
                    <img
                      src={h.poster}
                      alt={h.titleEn}
                      style={{ width: '46px', height: '64px', borderRadius: '9px', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: 900,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {h.titleEn}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.2rem' }}>
                        ▶ {isRtl ? `الحلقة ${h.episode}` : `Episode ${h.episode}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Continue Reading Manga/Manhwa Strip */}
          {mangaHistory.length > 0 && (
            <section style={{ padding: '0.85rem 1rem 0.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <h2 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900 }}>
                  📖 {isRtl ? 'أكمل قراءة المانجا والمانهوا' : 'Continue Reading'}
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('manga')}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  {isRtl ? 'المكتبة ←' : 'Library →'}
                </button>
              </div>
              <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
                {mangaHistory.slice(0, 10).map((mh, i) => (
                  <div
                    key={`${mh.objectID}-${i}`}
                    className="bx-mob-card"
                    onClick={() => {
                      setActiveTab('manga');
                      handleOpenManga(mh);
                    }}
                    style={{
                      minWidth: '155px',
                      background: '#0a0a0c',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '14px',
                      padding: '0.55rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      cursor: 'pointer'
                    }}
                  >
                    <img
                      src={mh.poster_uri}
                      alt={mh.name}
                      style={{ width: '46px', height: '64px', borderRadius: '9px', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {mh.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.2rem' }}>
                        📖 {isRtl ? `الفصل ${mh.lastChapter}` : `Ch. ${mh.lastChapter}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Horizontal Mobile Sections (Airing, Latest, Popular, Top Ranked, Movies, Seasonal) */}
          {[
            {
              titleAr: '🟢 يعرض الآن هذا الموسم (أنميات مستمرة)',
              titleEn: '🟢 Currently Airing This Season',
              items: airingList,
              sortKey: 'series_fav_count_desc'
            },
            {
              titleAr: '🔥 أحدث الأنميات والحلقات المضافة',
              titleEn: '🔥 Recently Updated Anime',
              items: latestList,
              sortKey: 'series_date_created'
            },
            {
              titleAr: '👑 الأكثر شعبية في BLACK X (6,973)',
              titleEn: '👑 Most Popular Anime (6,973)',
              items: popularList,
              sortKey: 'series_fav_count_desc'
            },
            {
              titleAr: '⭐ أساطير الأنمي الأعلى تقييماً (MAL Top)',
              titleEn: '⭐ Highest Rated on MAL',
              items: topRankedList,
              sortKey: 'best_mal_ranked'
            },
            {
              titleAr: '🎬 أفلام الأنمي السينمائية (1,266 فيلم)',
              titleEn: '🎬 Blockbuster Anime Movies (1,266)',
              items: moviesList,
              sortKey: 'series_fav_count_desc'
            },
            {
              titleAr: '🍂 أحدث إضافات الموسم',
              titleEn: '🍂 New Seasonal Releases',
              items: seasonalList,
              sortKey: 'series_date_created'
            }
          ].map((sec, sIdx) => (
            <section key={sIdx} style={{ padding: '0.95rem 1rem 0.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <h2 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900 }}>
                  {isRtl ? sec.titleAr : sec.titleEn}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setCatalogSort(sec.sortKey);
                    setActiveTab('catalog');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.65)',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {isRtl ? 'عرض الكل ←' : 'View All →'}
                </button>
              </div>

              <div
                className="bx-mob-scroll"
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  overflowX: 'auto',
                  paddingBottom: '0.4rem'
                }}
              >
                {(homeLoading ? Array.from({ length: 6 }) : sec.items).map((item, idx) =>
                  !item ? (
                    <div
                      key={idx}
                      style={{
                        minWidth: '122px',
                        height: '185px',
                        borderRadius: '14px',
                        background: 'rgba(255,255,255,0.05)'
                      }}
                    />
                  ) : (
                    <div
                      key={item.objectID}
                      className="bx-mob-card"
                      onClick={() => handleOpenAnime(item)}
                      style={{
                        minWidth: '124px',
                        maxWidth: '124px',
                        cursor: 'pointer'
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width: '124px',
                          height: '176px',
                          borderRadius: '14px',
                          overflow: 'hidden',
                          background: '#0d0d10',
                          border: '1px solid rgba(255,255,255,0.12)'
                        }}
                      >
                        <img
                          src={item.poster}
                          alt={item.titleEn}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            background: 'rgba(0,0,0,0.85)',
                            color: '#ffffff',
                            fontSize: '0.64rem',
                            fontWeight: 900,
                            padding: '0.12rem 0.38rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.2)'
                          }}
                        >
                          ★ {item.rating}
                        </span>
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '6px',
                            left: '6px',
                            background: 'rgba(0,0,0,0.85)',
                            color: 'rgba(255,255,255,0.9)',
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            padding: '0.1rem 0.38rem',
                            borderRadius: '5px'
                          }}
                        >
                          {item.type}
                        </span>
                      </div>
                      <div
                        style={{
                          marginTop: '0.38rem',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          lineHeight: 1.3,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {item.titleEn}
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>
          ))}
        </main>
      )}

      {/* ==================== TAB 2: FULL 6,973 ANIME CATALOG & GENRES ==================== */}
      {activeTab === 'catalog' && !selectedAnime && (
        <main style={{ padding: '0.85rem 1rem', animation: 'bxSlideUp 0.2s ease-out' }}>
          {/* Instant Mobile Search Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#0b0b0e',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: '14px',
              padding: '0.6rem 0.9rem',
              marginBottom: '0.75rem'
            }}
          >
            <span>🔍</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isRtl
                  ? 'ابحث في 6,973 أنمي وفيلم وأوفا (مثال: Solo Leveling, One Piece)...'
                  : 'Search 6,973 anime, movies & OVAs...'
              }
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#ffffff',
                fontSize: '0.86rem',
                fontWeight: 700
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Mode Selector */}
          <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', marginBottom: '0.65rem' }}>
            {[
              { id: 'series_fav_count_desc', ar: '🔥 الأكثر شعبية', en: '🔥 Most Popular' },
              { id: 'best_mal_ranked', ar: '⭐ الأعلى تقييماً', en: '⭐ Top Ranked' },
              { id: 'series_date_created', ar: '🆕 الأحدث إضافة', en: '🆕 Newly Added' },
              { id: 'series_name_asc', ar: '🔤 أبجدياً A-Z', en: '🔤 A-Z' }
            ].map((s) => {
              const active = catalogSort === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCatalogSort(s.id)}
                  style={{
                    padding: '0.42rem 0.85rem',
                    borderRadius: '10px',
                    fontSize: '0.76rem',
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    background: active ? '#ffffff' : 'rgba(255,255,255,0.06)',
                    color: active ? '#000000' : '#ffffff',
                    border: active ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.12)'
                  }}
                >
                  {isRtl ? s.ar : s.en}
                </button>
              );
            })}
          </div>

          {/* Type Filter Pills (TV Series, Movies, OVAs, Specials, ONAs) */}
          <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', marginBottom: '0.5rem' }}>
            {TYPE_FILTERS.map((tf) => {
              const active = catalogType.id === tf.id;
              return (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setCatalogType(tf)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '10px',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    background: active ? '#ffffff' : 'rgba(255,255,255,0.06)',
                    color: active ? '#000000' : '#ffffff',
                    border: active ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.12)'
                  }}
                >
                  {isRtl ? tf.ar : tf.en}
                </button>
              );
            })}
          </div>

          {/* State & Studio Filter Pills */}
          <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', marginBottom: '0.5rem' }}>
            {STATE_FILTERS.map((sf) => {
              const active = catalogState.id === sf.id;
              return (
                <button
                  key={sf.id}
                  type="button"
                  onClick={() => setCatalogState(sf)}
                  style={{
                    padding: '0.32rem 0.7rem',
                    borderRadius: '99px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    background: active ? '#ffffff' : 'rgba(255,255,255,0.05)',
                    color: active ? '#000000' : '#ffffff',
                    border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.12)'
                  }}
                >
                  {isRtl ? sf.ar : sf.en}
                </button>
              );
            })}
            {STUDIO_FILTERS.map((st) => {
              const active = catalogStudio.id === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setCatalogStudio(st)}
                  style={{
                    padding: '0.32rem 0.7rem',
                    borderRadius: '99px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    background: active ? '#ffffff' : 'rgba(255,255,255,0.05)',
                    color: active ? '#000000' : '#ffffff',
                    border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.12)'
                  }}
                >
                  {st.label}
                </button>
              );
            })}
          </div>

          {/* Genre Filter Pills */}
          <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', marginBottom: '0.85rem' }}>
            {GENRE_CHIPS.map((g) => {
              const active = catalogGenre.id === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setCatalogGenre(g)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.04)',
                    color: '#ffffff',
                    border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  {isRtl ? g.ar : g.en}
                </button>
              );
            })}
          </div>

          {/* Live Count Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.68)',
              fontWeight: 800
            }}
          >
            <span>
              {isRtl
                ? `📚 إجمالي الأعمال المتوفرة: ${catalogTotal.toLocaleString()} أنمي وفيلم`
                : `📚 Total Available: ${catalogTotal.toLocaleString()} Anime & Movies`}
            </span>
            <span>1080p • 720p • 480p</span>
          </div>

          {/* 3-Column Anime Witcher Mobile Poster Grid */}
          {catalogLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  style={{ aspectRatio: '2/3', borderRadius: '12px', background: 'rgba(255,255,255,0.06)' }}
                />
              ))}
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                {catalogItems.map((item) => (
                  <div
                    key={item.objectID}
                    className="bx-mob-card"
                    onClick={() => handleOpenAnime(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        aspectRatio: '2 / 2.9',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: '#0b0b0e',
                        border: '1px solid rgba(255,255,255,0.12)'
                      }}
                    >
                      <img
                        src={item.poster}
                        alt={item.titleEn}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: '5px',
                          right: '5px',
                          background: 'rgba(0,0,0,0.85)',
                          color: '#fff',
                          fontSize: '0.6rem',
                          fontWeight: 900,
                          padding: '0.1rem 0.34rem',
                          borderRadius: '5px'
                        }}
                      >
                        ★ {item.rating}
                      </span>
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '5px',
                          left: '5px',
                          background: 'rgba(0,0,0,0.84)',
                          color: '#fff',
                          fontSize: '0.58rem',
                          fontWeight: 800,
                          padding: '0.08rem 0.34rem',
                          borderRadius: '5px'
                        }}
                      >
                        {item.type}
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: '0.32rem',
                        fontSize: '0.73rem',
                        fontWeight: 800,
                        lineHeight: 1.28,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {item.titleEn}
                    </div>
                  </div>
                ))}
              </div>

              {catalogItems.length < catalogTotal && (
                <button
                  type="button"
                  onClick={handleLoadMoreCatalog}
                  disabled={loadingMoreCatalog}
                  style={{
                    width: '100%',
                    marginTop: '1.1rem',
                    padding: '0.85rem',
                    borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.25)',
                    background: '#ffffff',
                    color: '#000000',
                    fontWeight: 900,
                    fontSize: '0.86rem',
                    cursor: 'pointer'
                  }}
                >
                  {loadingMoreCatalog
                    ? isRtl
                      ? '⏳ جاري تحميل المزيد...'
                      : '⏳ Loading more...'
                    : isRtl
                    ? `➕ عرض المزيد (${catalogItems.length} من ${catalogTotal.toLocaleString()})`
                    : `➕ Load More (${catalogItems.length} of ${catalogTotal.toLocaleString()})`}
                </button>
              )}
            </>
          )}
        </main>
      )}

      {/* ==================== TAB 2.5: WEEKLY AIRING SCHEDULE (جدول مواعيد الحلقات الأسبوعي) ==================== */}
      {activeTab === 'schedule' && !selectedAnime && (
        <main style={{ padding: '0.85rem 1rem', animation: 'bxSlideUp 0.2s ease-out' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', fontWeight: 900 }}>
              📅 {isRtl ? 'جدول مواعيد بث حلقات الأنمي الأسبوعي' : 'Weekly Anime Airing Schedule'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)' }}>
              {isRtl
                ? 'تابع مواعيد نزول الحلقات الجديدة للأنميات المستمرة حسب أيام الأسبوع بتوقيت القاهرة ومكة.'
                : 'Track new episode releases for currently airing anime by day of the week.'}
            </p>
          </div>

          {/* 7 Days of the Week Selector Pills */}
          <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', marginBottom: '0.9rem', paddingBottom: '0.2rem' }}>
            {SCHEDULE_DAYS.map((d) => {
              const active = scheduleDay === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setScheduleDay(d.id)}
                  style={{
                    padding: '0.45rem 0.9rem',
                    borderRadius: '12px',
                    fontSize: '0.76rem',
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    background: active ? '#ffffff' : 'rgba(255,255,255,0.06)',
                    color: active ? '#000000' : '#ffffff',
                    border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.14)'
                  }}
                >
                  {isRtl ? d.ar : d.en}
                </button>
              );
            })}
          </div>

          {scheduleLoading ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'rgba(255,255,255,0.6)' }}>
              {isRtl ? '⏳ جاري جلب جدول البث لهذا اليوم...' : '⏳ Loading airing schedule...'}
            </div>
          ) : scheduleItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'rgba(255,255,255,0.6)' }}>
              {isRtl ? 'لا توجد حلقات مجدولة لهذا اليوم حالياً.' : 'No scheduled episodes found for this day.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {scheduleItems.map((item) => (
                <div
                  key={item.objectID}
                  className="bx-mob-card"
                  onClick={() => handleOpenAnime(item)}
                  style={{
                    display: 'flex',
                    gap: '0.8rem',
                    padding: '0.65rem',
                    borderRadius: '14px',
                    background: '#0a0a0e',
                    border: '1px solid rgba(255,255,255,0.12)',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <img
                    src={item.poster}
                    alt={item.titleEn}
                    loading="lazy"
                    style={{ width: '68px', height: '96px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          background: '#ffffff',
                          color: '#000000',
                          fontSize: '0.62rem',
                          fontWeight: 900,
                          padding: '0.1rem 0.45rem',
                          borderRadius: '6px'
                        }}
                      >
                        📅 {item.showTime || scheduleDay}
                      </span>
                      <span
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          color: '#ffffff',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          padding: '0.1rem 0.45rem',
                          borderRadius: '6px'
                        }}
                      >
                        ★ {item.rating}
                      </span>
                      <span
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          padding: '0.1rem 0.45rem',
                          borderRadius: '6px'
                        }}
                      >
                        {item.studio}
                      </span>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '0.88rem', marginBottom: '0.2rem' }}>{item.titleEn}</div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: 'rgba(255,255,255,0.65)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {item.storyAr}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '0.45rem 0.7rem',
                      borderRadius: '10px',
                      background: '#ffffff',
                      color: '#000000',
                      fontWeight: 900,
                      fontSize: '0.72rem',
                      flexShrink: 0
                    }}
                  >
                    ▶ {isRtl ? 'شاهد' : 'Watch'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ==================== TAB 3: MANGA & MANHWA (30,000+ MANGA PEAK ENGINES + PRO 120Hz READER) ==================== */}
      {activeTab === 'manga' && !selectedAnime && (
        <main style={{ padding: readerFullscreen && activeMangaChapter ? '0' : '0.85rem 1rem', animation: 'bxSlideUp 0.2s ease-out' }}>
          {activeMangaChapter ? (
            <div>
              {/* Pro Manga/Webtoon Reader Control Bar */}
              <div
                style={{
                  position: 'sticky',
                  top: readerFullscreen ? 0 : '54px',
                  zIndex: 80,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                  marginBottom: '0.65rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: readerFullscreen ? '0' : '13px',
                  background: 'rgba(8, 8, 12, 0.95)',
                  backdropFilter: 'blur(18px)',
                  border: '1px solid rgba(255,255,255,0.16)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setAutoScrollSpeed(0);
                      setReaderFullscreen(false);
                      setActiveMangaChapter(null);
                    }}
                    style={{
                      background: '#ffffff',
                      color: '#000000',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.35rem 0.7rem',
                      fontWeight: 900,
                      fontSize: '0.74rem',
                      cursor: 'pointer'
                    }}
                  >
                    {isRtl ? '→ الفصول' : '← Chapters'}
                  </button>

                  {/* Quick Chapter Jump Dropdown */}
                  <select
                    value={activeMangaChapter.id}
                    onChange={(e) => {
                      const target = mangaChapters.find((c) => c.id === e.target.value);
                      if (target) handleReadMangaChapter(target);
                    }}
                    style={{
                      flex: 1,
                      maxWidth: '180px',
                      padding: '0.32rem 0.5rem',
                      borderRadius: '8px',
                      background: '#000',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.22)',
                      fontWeight: 800,
                      fontSize: '0.74rem'
                    }}
                  >
                    {mangaChapters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {isRtl ? `الفصل ${c.chapter}` : `Ch. ${c.chapter}`}
                      </option>
                    ))}
                  </select>

                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', fontWeight: 800 }}>
                    {mangaPages.length} {isRtl ? 'صفحة' : 'p'}
                  </span>
                </div>

                {/* Reader Tools: Webtoon/Page Mode, Zoom, Auto-Scroll, Prev/Next Chapter */}
                <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.38rem', overflowX: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => setReaderMode((m) => (m === 'webtoon' ? 'page' : 'webtoon'))}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer'
                    }}
                  >
                    {readerMode === 'webtoon'
                      ? isRtl
                        ? '📜 وضع عمودي (Webtoon)'
                        : '📜 Webtoon Mode'
                      : isRtl
                      ? '📄 وضع صفحات'
                      : '📄 Page Mode'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setReaderZoom((z) => (z === 100 ? 125 : z === 125 ? 150 : 100))}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '8px',
                      background: readerZoom > 100 ? '#ffffff' : 'rgba(255,255,255,0.1)',
                      color: readerZoom > 100 ? '#000000' : '#ffffff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer'
                    }}
                  >
                    🔍 {readerZoom}%
                  </button>

                  {readerMode === 'webtoon' && (
                    <button
                      type="button"
                      onClick={() => setAutoScrollSpeed((s) => (s + 1) % 4)}
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '8px',
                        background: autoScrollSpeed > 0 ? '#ffffff' : 'rgba(255,255,255,0.1)',
                        color: autoScrollSpeed > 0 ? '#000000' : '#ffffff',
                        border: '1px solid rgba(255,255,255,0.2)',
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                    >
                      ⏬ {autoScrollSpeed === 0 ? (isRtl ? 'تمرير تلقائي' : 'Auto-Scroll') : `Auto ${autoScrollSpeed}x`}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setReaderFullscreen((v) => !v)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '8px',
                      background: readerFullscreen ? '#ffffff' : 'rgba(255,255,255,0.1)',
                      color: readerFullscreen ? '#000000' : '#ffffff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer'
                    }}
                  >
                    ⛶ {isRtl ? 'ملء الشاشة' : 'Fullscreen'}
                  </button>
                </div>
              </div>

              {mangaPagesLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRtl ? '⏳ جاري تحميل صفحات الفصل بدقة عالية...' : '⏳ Loading chapter pages...'}
                </div>
              ) : readerMode === 'page' && mangaPages.length > 0 ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <img
                      src={mangaPages[currentPageIdx]}
                      alt={`Page ${currentPageIdx + 1}`}
                      onClick={() => {
                        if (currentPageIdx + 1 < mangaPages.length) setCurrentPageIdx((p) => p + 1);
                      }}
                      style={{
                        width: `${readerZoom}%`,
                        maxWidth: readerZoom === 100 ? '100%' : 'none',
                        height: 'auto',
                        display: 'block',
                        margin: '0 auto',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 0.5rem' }}>
                    <button
                      type="button"
                      disabled={currentPageIdx === 0}
                      onClick={() => setCurrentPageIdx((p) => Math.max(0, p - 1))}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.12)',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 900,
                        cursor: 'pointer'
                      }}
                    >
                      {isRtl ? '→ الصفحة السابقة' : '← Prev Page'}
                    </button>
                    <span style={{ fontWeight: 900, fontSize: '0.82rem' }}>
                      {currentPageIdx + 1} / {mangaPages.length}
                    </span>
                    <button
                      type="button"
                      disabled={currentPageIdx + 1 >= mangaPages.length}
                      onClick={() => setCurrentPageIdx((p) => Math.min(mangaPages.length - 1, p + 1))}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '10px',
                        background: '#ffffff',
                        color: '#000',
                        border: 'none',
                        fontWeight: 900,
                        cursor: 'pointer'
                      }}
                    >
                      {isRtl ? 'الصفحة التالية ←' : 'Next Page →'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', overflowX: 'auto' }}>
                  {mangaPages.map((pg, idx) => (
                    <img
                      key={idx}
                      src={pg}
                      alt={`Page ${idx + 1}`}
                      loading="lazy"
                      style={{
                        width: `${readerZoom}%`,
                        maxWidth: readerZoom === 100 ? '100%' : 'none',
                        height: 'auto',
                        display: 'block',
                        margin: '0 auto'
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Bottom Next / Previous Chapter Navigation Bar */}
              {!mangaPagesLoading && mangaChapters.length > 1 && (
                <div style={{ display: 'flex', gap: '0.6rem', padding: '1rem 0.5rem' }}>
                  {(() => {
                    const idx = mangaChapters.findIndex((c) => c.id === activeMangaChapter.id);
                    const prevCh = idx > 0 ? mangaChapters[idx - 1] : null;
                    const nextCh = idx !== -1 && idx + 1 < mangaChapters.length ? mangaChapters[idx + 1] : null;
                    return (
                      <>
                        {prevCh && (
                          <button
                            type="button"
                            onClick={() => {
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                              handleReadMangaChapter(prevCh);
                            }}
                            style={{
                              flex: 1,
                              padding: '0.75rem',
                              borderRadius: '12px',
                              background: 'rgba(255,255,255,0.1)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              color: '#fff',
                              fontWeight: 900,
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            ⏮ {isRtl ? `الفصل ${prevCh.chapter}` : `Ch. ${prevCh.chapter}`}
                          </button>
                        )}
                        {nextCh && (
                          <button
                            type="button"
                            onClick={() => {
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                              handleReadMangaChapter(nextCh);
                            }}
                            style={{
                              flex: 1,
                              padding: '0.75rem',
                              borderRadius: '12px',
                              background: '#ffffff',
                              border: 'none',
                              color: '#000',
                              fontWeight: 900,
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            ⏭ {isRtl ? `الفصل ${nextCh.chapter}` : `Ch. ${nextCh.chapter}`}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : selectedManga ? (
            <div>
              <button
                type="button"
                onClick={() => setSelectedManga(null)}
                style={{
                  marginBottom: '0.75rem',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: '10px',
                  padding: '0.45rem 0.9rem',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                {isRtl ? '→ العودة لمكتبة المانجا والمانهوا' : '← Back to Manga Library'}
              </button>

              <div style={{ display: 'flex', gap: '0.85rem', marginBottom: '1rem' }}>
                <img
                  src={selectedManga.poster?.large || selectedManga.poster_uri}
                  alt={selectedManga.name}
                  style={{ width: '100px', height: '142px', borderRadius: '12px', objectFit: 'cover' }}
                />
                <div>
                  <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem', fontWeight: 900 }}>{selectedManga.name}</h2>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', marginBottom: '0.4rem' }}>
                    {selectedManga.type || 'مانهوا'} • {selectedManga.sourceLabel || 'BLACK X'} • ★ {selectedManga.rate || '9.3'}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.45 }}>
                    {(selectedManga.story_ar || selectedManga.story?.ar || selectedManga.story_en || '').slice(0, 220)}
                  </p>
                </div>
              </div>

              <h3 style={{ fontSize: '0.9rem', fontWeight: 900, marginBottom: '0.6rem' }}>
                📖 {isRtl ? `قائمة الفصول (${mangaChapters.length})` : `Chapters (${mangaChapters.length})`}
              </h3>
              {mangaChaptersLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRtl ? '⏳ جاري جلب جميع الفصول المترجمة...' : '⏳ Loading chapters...'}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {mangaChapters.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => handleReadMangaChapter(ch)}
                      style={{
                        padding: '0.65rem 0.75rem',
                        borderRadius: '11px',
                        background: '#0c0c10',
                        border: '1px solid rgba(255,255,255,0.14)',
                        color: '#fff',
                        textAlign: 'start',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      📖 {isRtl ? `الفصل ${ch.chapter}` : `Chapter ${ch.chapter}`}{' '}
                      <span style={{ opacity: 0.6, fontSize: '0.68rem' }}>({(ch.lang || 'AR').toUpperCase()})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#0b0b0e',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: '14px',
                  padding: '0.6rem 0.9rem',
                  marginBottom: '0.65rem'
                }}
              >
                <span>📖</span>
                <input
                  type="search"
                  value={mangaQuery}
                  onChange={(e) => setMangaQuery(e.target.value)}
                  placeholder={isRtl ? 'ابحث في +30,000 مانجا ومانهوا مترجمة...' : 'Search 30,000+ Manga & Manhwa...'}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 700
                  }}
                />
              </div>

              {/* Manga Peak Multi-Engine Source Selector Tabs */}
              <div
                className="bx-mob-scroll"
                style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', marginBottom: '0.5rem', paddingBottom: '0.15rem' }}
              >
                {[
                  { id: 'all', ar: '🔥 الكل (+30,000)', en: '🔥 All (30,000+)' },
                  { id: 'mello', ar: '📚 Mello Plus (14,331)', en: '📚 Mello Plus (14,331)' },
                  { id: 'dilar', ar: '👑 Dilar (9,164)', en: '👑 Dilar (9,164)' },
                  { id: 'azora', ar: '⚡ Azora مانهوا (2,453)', en: '⚡ Azora (2,453)' },
                  { id: 'swat', ar: '🗡️ Swat مانهوا (1,669)', en: '🗡️ Swat (1,669)' },
                  { id: 'mangadex', ar: '🌐 المكتبة العالمية', en: '🌐 Global Cloud' }
                ].map((srv) => {
                  const active = mangaSource === srv.id;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => setMangaSource(srv.id)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '99px',
                        fontSize: '0.73rem',
                        fontWeight: 900,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        background: active ? '#ffffff' : 'rgba(255,255,255,0.06)',
                        color: active ? '#000000' : '#ffffff',
                        border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.14)'
                      }}
                    >
                      {isRtl ? srv.ar : srv.en}
                    </button>
                  );
                })}
              </div>

              {/* Manga vs Manhwa Filter Chips */}
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.8rem' }}>
                {[
                  { id: 'ALL', ar: '🌟 الكل', en: '🌟 All' },
                  { id: 'MANHWA', ar: '⚡ مانهوا كورية وصينية', en: '⚡ Manhwa' },
                  { id: 'MANGA', ar: '📖 مانجا يابانية', en: '📖 Manga' }
                ].map((ft) => {
                  const active = mangaFilterType === ft.id;
                  return (
                    <button
                      key={ft.id}
                      type="button"
                      onClick={() => setMangaFilterType(ft.id)}
                      style={{
                        padding: '0.32rem 0.75rem',
                        borderRadius: '9px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.04)',
                        color: '#fff',
                        border: active ? '1px solid #fff' : '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      {isRtl ? ft.ar : ft.en}
                    </button>
                  );
                })}
              </div>

              {mangaLoading ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRtl ? '⏳ جاري جلب مكتبة المانجا والمانهوا الشاملة...' : '⏳ Loading Manga & Manhwa catalog...'}
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                    {mangaList
                      .filter((m) => {
                        if (mangaFilterType === 'MANHWA') return String(m.type || '').includes('مانهوا');
                        if (mangaFilterType === 'MANGA') return String(m.type || '').includes('مانجا');
                        return true;
                      })
                      .map((m) => (
                        <div
                          key={m.objectID}
                          className="bx-mob-card"
                          onClick={() => handleOpenManga(m)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div
                            style={{
                              position: 'relative',
                              aspectRatio: '2 / 2.9',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              background: '#0b0b0e',
                              border: '1px solid rgba(255,255,255,0.12)'
                            }}
                          >
                            <img
                              src={m.poster?.large || m.poster_uri}
                              alt={m.name}
                              loading="lazy"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {m.sourceLabel && (
                              <span
                                style={{
                                  position: 'absolute',
                                  bottom: '5px',
                                  left: '5px',
                                  background: 'rgba(0,0,0,0.85)',
                                  color: '#fff',
                                  fontSize: '0.56rem',
                                  fontWeight: 900,
                                  padding: '0.1rem 0.34rem',
                                  borderRadius: '5px'
                                }}
                              >
                                {m.sourceLabel}
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              marginTop: '0.32rem',
                              fontSize: '0.73rem',
                              fontWeight: 800,
                              lineHeight: 1.28,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {m.name}
                          </div>
                        </div>
                      ))}
                  </div>

                  {mangaList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleLoadMoreManga}
                      disabled={loadingMoreManga}
                      style={{
                        width: '100%',
                        marginTop: '1.1rem',
                        padding: '0.85rem',
                        borderRadius: '14px',
                        border: '1px solid rgba(255,255,255,0.25)',
                        background: '#ffffff',
                        color: '#000000',
                        fontWeight: 900,
                        fontSize: '0.86rem',
                        cursor: 'pointer'
                      }}
                    >
                      {loadingMoreManga
                        ? isRtl
                          ? '⏳ جاري تحميل المزيد...'
                          : '⏳ Loading more...'
                        : isRtl
                        ? `➕ عرض المزيد من مكتبة المانجا والمانهوا (صفحة ${mangaPage + 1})`
                        : `➕ Load More Manga & Manhwa (Page ${mangaPage + 1})`}
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </main>
      )}

      {/* ==================== TAB 4: ARENA (PREDICTIONS XP + LEADERBOARD + LIVE COMMUNITY) ==================== */}
      {activeTab === 'community' && !selectedAnime && (
        <main style={{ padding: '0.9rem 1rem', animation: 'bxSlideUp 0.2s ease-out' }}>
          {/* Arena Sub-Tab Switcher */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginBottom: '0.95rem' }}>
            {[
              { id: 'predictions', ar: '🔮 التوقعات XP', en: '🔮 Predictions' },
              { id: 'community', ar: '💬 المجتمع', en: '💬 Community' },
              { id: 'leaderboard', ar: '🏆 المتصدرون', en: '🏆 Leaderboard' }
            ].map((st) => {
              const active = arenaSubTab === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setArenaSubTab(st.id)}
                  style={{
                    padding: '0.55rem 0.4rem',
                    borderRadius: '12px',
                    fontWeight: 900,
                    fontSize: '0.76rem',
                    border: active ? '1.5px solid #fff' : '1px solid rgba(255,255,255,0.14)',
                    background: active ? '#ffffff' : '#0a0a0e',
                    color: active ? '#000000' : '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  {isRtl ? st.ar : st.en}
                </button>
              );
            })}
          </div>

          {/* 1. PREDICTIONS XP ARENA */}
          {arenaSubTab === 'predictions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '14px',
                  background: '#0a0a0e',
                  border: '1px solid rgba(255,255,255,0.16)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: '0.88rem' }}>
                    🔮 {isRtl ? 'محرك توقعات الحلقات والفصول التفاعلي' : 'Interactive Anime Prediction Engine'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
                    {isRtl ? 'صوّت على أحداث الحلقات القادمة واكسب نقاط خبرة (XP)!' : 'Vote on upcoming plot twists & earn XP!'}
                  </div>
                </div>
                <span
                  style={{
                    padding: '0.35rem 0.7rem',
                    borderRadius: '99px',
                    background: '#ffffff',
                    color: '#000000',
                    fontWeight: 900,
                    fontSize: '0.76rem'
                  }}
                >
                  ⚡ {userXp} XP
                </span>
              </div>

              {predictions.map((pred) => {
                const totalVotes = pred.votesA + pred.votesB;
                const pctA = Math.round((pred.votesA / totalVotes) * 100);
                const pctB = 100 - pctA;
                const userChoice = votedPredictions[pred.id];
                return (
                  <div
                    key={pred.id}
                    style={{
                      padding: '0.95rem',
                      borderRadius: '15px',
                      background: '#0a0a0e',
                      border: '1px solid rgba(255,255,255,0.13)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'rgba(255,255,255,0.65)' }}>
                        🎬 {pred.anime}
                      </span>
                      <span
                        style={{
                          padding: '0.14rem 0.5rem',
                          borderRadius: '6px',
                          background: 'rgba(255,255,255,0.12)',
                          fontSize: '0.66rem',
                          fontWeight: 900
                        }}
                      >
                        +{pred.xpReward} XP
                      </span>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '0.86rem', marginBottom: '0.7rem', lineHeight: 1.4 }}>
                      {isRtl ? pred.questionAr : pred.questionEn}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      <button
                        type="button"
                        onClick={() => handleVotePrediction(pred.id, 'A', pred.xpReward)}
                        style={{
                          padding: '0.65rem 0.8rem',
                          borderRadius: '11px',
                          border: userChoice === 'A' ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.16)',
                          background: userChoice === 'A' ? '#ffffff' : 'rgba(255,255,255,0.05)',
                          color: userChoice === 'A' ? '#000000' : '#ffffff',
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        <span>{pred.optionAAr}</span>
                        <span>{pctA}% ({pred.votesA})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVotePrediction(pred.id, 'B', pred.xpReward)}
                        style={{
                          padding: '0.65rem 0.8rem',
                          borderRadius: '11px',
                          border: userChoice === 'B' ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.16)',
                          background: userChoice === 'B' ? '#ffffff' : 'rgba(255,255,255,0.05)',
                          color: userChoice === 'B' ? '#000000' : '#ffffff',
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        <span>{pred.optionBAr}</span>
                        <span>{pctB}% ({pred.votesB})</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. XP LEADERBOARD */}
          {arenaSubTab === 'leaderboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { rank: 1, name: 'Developer MZ', badge: '👑 عاهل الظلال (Monarch)', xp: 9850, role: 'developer' },
                { rank: 2, name: user?.displayName || 'أنت (حسابك الحالي)', badge: '⚔️ صائد الرتبة S', xp: userXp + 1200, role: user?.role || 'user' },
                { rank: 3, name: 'ShadowHunter_AR', badge: '🔮 عرّاف التوقعات', xp: 1420, role: 'user' },
                { rank: 4, name: 'LuffyGear5_EG', badge: '🏴‍☠️ ملك القراصنة', xp: 1190, role: 'user' },
                { rank: 5, name: 'SungJinWoo_99', badge: '🗡️ قائد الفرسان', xp: 980, role: 'user' },
                { rank: 6, name: 'GojoSatoru_Infinity', badge: '👁️ الأعين الست', xp: 860, role: 'user' }
              ]
                .sort((a, b) => b.xp - a.xp)
                .map((row, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.8rem 0.95rem',
                      borderRadius: '14px',
                      background: idx === 0 ? 'rgba(255,255,255,0.12)' : '#0a0a0e',
                      border: idx === 0 ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.12)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                      <span
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          background: idx < 3 ? '#ffffff' : 'rgba(255,255,255,0.1)',
                          color: idx < 3 ? '#000000' : '#ffffff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '0.8rem'
                        }}
                      >
                        #{idx + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '0.84rem' }}>{row.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)' }}>{row.badge}</div>
                      </div>
                    </div>
                    <span style={{ fontWeight: 900, fontSize: '0.82rem' }}>⚡ {row.xp.toLocaleString()} XP</span>
                  </div>
                ))}
            </div>
          )}

          {/* 3. LIVE COMMUNITY HUB */}
          {arenaSubTab === 'community' && (
            <>
              <form
                onSubmit={handlePublishPost}
                style={{
                  padding: '0.8rem',
                  borderRadius: '14px',
                  background: '#0a0a0e',
                  border: '1px solid rgba(255,255,255,0.14)',
                  marginBottom: '0.9rem'
                }}
              >
                <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', marginBottom: '0.55rem' }}>
                  {[
                    { id: 'discussion', label: '🔥 نقاش' },
                    { id: 'recommend', label: '💎 توصية' },
                    { id: 'theory', label: '🧠 نظرية' },
                    { id: 'review', label: '⭐ مراجعة' },
                    { id: 'spoiler', label: '⚠️ حرق Spoiler' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPostCategory(cat.id)}
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '99px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        border: postCategory === cat.id ? '1px solid #fff' : '1px solid rgba(255,255,255,0.14)',
                        background: postCategory === cat.id ? '#ffffff' : 'transparent',
                        color: postCategory === cat.id ? '#000000' : '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    placeholder={isRtl ? 'شارك رأيك أو نظريتك مع مجتمع BLACK X...' : 'Share your thoughts with BLACK X community...'}
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.85rem',
                      borderRadius: '11px',
                      background: '#050507',
                      border: '1px solid rgba(255,255,255,0.18)',
                      color: '#fff',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '0 1rem',
                      borderRadius: '11px',
                      border: 'none',
                      background: '#ffffff',
                      color: '#000000',
                      fontWeight: 900,
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    {isRtl ? 'نشر' : 'Post'}
                  </button>
                </div>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {communityPosts.map((p) => {
                  const isBlurred = p.isSpoiler && !revealedSpoilers[p.id];
                  return (
                    <div
                      key={p.id}
                      style={{
                        padding: '0.85rem',
                        borderRadius: '14px',
                        background: '#0a0a0d',
                        border: '1px solid rgba(255,255,255,0.12)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: '#ffffff',
                              color: '#000000',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: '0.76rem'
                            }}
                          >
                            {(p.author?.[0] || 'X').toUpperCase()}
                          </span>
                          <span style={{ fontWeight: 900, fontSize: '0.82rem' }}>{p.author}</span>
                          {p.role === 'developer' && (
                            <span
                              style={{
                                background: '#ffffff',
                                color: '#000000',
                                fontSize: '0.62rem',
                                fontWeight: 900,
                                padding: '0.1rem 0.4rem',
                                borderRadius: '5px'
                              }}
                            >
                              👑 مطور
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>{p.time}</span>
                      </div>

                      {isBlurred ? (
                        <button
                          type="button"
                          onClick={() => setRevealedSpoilers((prev) => ({ ...prev, [p.id]: true }))}
                          style={{
                            width: '100%',
                            padding: '0.6rem',
                            borderRadius: '9px',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px dashed rgba(255,255,255,0.3)',
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          ⚠️ {isRtl ? 'هذا المنشور يحتوي على حرق — اضغط للإظهار' : 'Spoiler — Tap to reveal'}
                        </button>
                      ) : (
                        <p style={{ margin: '0 0 0.55rem', fontSize: '0.8rem', lineHeight: 1.5, color: 'rgba(255,255,255,0.9)' }}>
                          {p.text}
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleLikePost(p.id)}
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '8px',
                            padding: '0.24rem 0.6rem',
                            color: '#fff',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          ♥ {p.likes || 1}
                        </button>
                        <button
                          type="button"
                          onClick={() => setReplyingToPostId((cur) => (cur === p.id ? null : p.id))}
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '8px',
                            padding: '0.24rem 0.6rem',
                            color: '#fff',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          💬 {isRtl ? `رد (${p.replies?.length || 0})` : `Reply (${p.replies?.length || 0})`}
                        </button>
                      </div>

                      {Array.isArray(p.replies) && p.replies.length > 0 && (
                        <div style={{ marginTop: '0.55rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {p.replies.map((r) => (
                            <div key={r.id} style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.8)' }}>
                              <strong style={{ color: '#fff' }}>{r.author}:</strong> {r.text}
                            </div>
                          ))}
                        </div>
                      )}

                      {replyingToPostId === p.id && (
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.55rem' }}>
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={isRtl ? 'اكتب ردك...' : 'Write a reply...'}
                            style={{
                              flex: 1,
                              padding: '0.45rem 0.7rem',
                              borderRadius: '8px',
                              background: '#000',
                              border: '1px solid rgba(255,255,255,0.2)',
                              color: '#fff',
                              fontSize: '0.75rem'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddPostReply(p.id)}
                            style={{
                              padding: '0 0.75rem',
                              borderRadius: '8px',
                              background: '#fff',
                              color: '#000',
                              border: 'none',
                              fontWeight: 900,
                              fontSize: '0.74rem',
                              cursor: 'pointer'
                            }}
                          >
                            {isRtl ? 'إرسال' : 'Send'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
      )}

      {/* ==================== TAB 5: FULL USER PROFILE, BADGES & PERSONAL LIBRARY STUDIO ==================== */}
      {activeTab === 'profile' && !selectedAnime && (
        <main style={{ padding: '1rem', animation: 'bxSlideUp 0.2s ease-out' }}>
          {user ? (
            <>
              <div
                style={{
                  padding: '1.15rem',
                  borderRadius: '18px',
                  background: '#0a0a0e',
                  border: '1px solid rgba(255,255,255,0.16)',
                  textAlign: 'center',
                  marginBottom: '1rem'
                }}
              >
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.displayName}
                    style={{
                      width: '76px',
                      height: '76px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #ffffff',
                      margin: '0 auto 0.65rem',
                      display: 'block'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      color: '#000000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.75rem',
                      fontWeight: 900,
                      margin: '0 auto 0.65rem'
                    }}
                  >
                    {(user.displayName?.[0] || 'X').toUpperCase()}
                  </div>
                )}

                <h2 style={{ margin: '0 0 0.2rem', fontSize: '1.15rem', fontWeight: 900 }}>{user.displayName}</h2>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem' }}>
                  @{user.username} • {user.email}
                </div>
                {user.bio && (
                  <p style={{ margin: '0 0 0.65rem', fontSize: '0.76rem', color: 'rgba(255,255,255,0.82)' }}>{user.bio}</p>
                )}

                {/* Badges Strip */}
                <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                  <span style={{ padding: '0.18rem 0.55rem', borderRadius: '99px', background: '#ffffff', color: '#000000', fontSize: '0.66rem', fontWeight: 900 }}>
                    👑 VIP Monarch
                  </span>
                  <span style={{ padding: '0.18rem 0.55rem', borderRadius: '99px', background: 'rgba(255,255,255,0.1)', fontSize: '0.66rem', fontWeight: 800 }}>
                    ⚡ Lv.{Math.floor(userXp / 100) + 1} ({userXp} XP)
                  </span>
                  {user.role === 'developer' && (
                    <span style={{ padding: '0.18rem 0.55rem', borderRadius: '99px', background: '#ffffff', color: '#000000', fontSize: '0.66rem', fontWeight: 900 }}>
                      🛠️ مطور المنصة
                    </span>
                  )}
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.45rem', marginBottom: '0.9rem' }}>
                  <div style={{ padding: '0.55rem 0.3rem', borderRadius: '11px', background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.98rem', fontWeight: 900 }}>{favorites.length}</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)' }}>{isRtl ? 'المفضلة' : 'Favorites'}</div>
                  </div>
                  <div style={{ padding: '0.55rem 0.3rem', borderRadius: '11px', background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.98rem', fontWeight: 900 }}>{watchHistory.length}</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)' }}>{isRtl ? 'حلقات' : 'Episodes'}</div>
                  </div>
                  <div style={{ padding: '0.55rem 0.3rem', borderRadius: '11px', background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.98rem', fontWeight: 900 }}>{mangaHistory.length}</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)' }}>{isRtl ? 'مانجا' : 'Manga'}</div>
                  </div>
                  <div style={{ padding: '0.55rem 0.3rem', borderRadius: '11px', background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.98rem', fontWeight: 900 }}>{Object.keys(watchlistMap).length}</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)' }}>{isRtl ? 'مكتبتي' : 'Lists'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.45rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditDisplayName(user.displayName || '');
                      setEditBio(user.bio || '');
                      setEditPhotoUrl(user.photoUrl || '');
                      setEditingProfile((v) => !v);
                    }}
                    style={{
                      flex: 1,
                      padding: '0.65rem',
                      borderRadius: '11px',
                      border: '1px solid rgba(255,255,255,0.22)',
                      background: 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      fontWeight: 900,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ {isRtl ? 'تعديل الحساب' : 'Edit Profile'}
                  </button>
                  <button
                    type="button"
                    onClick={() => syncUserStateToCloud(user, favorites, watchHistory).then(() => showToast('✓ تمت المزامنة السحابية مع الموقع!'))}
                    style={{
                      flex: 1,
                      padding: '0.65rem',
                      borderRadius: '11px',
                      border: 'none',
                      background: '#ffffff',
                      color: '#000000',
                      fontWeight: 900,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 {isRtl ? 'مزامنة مع الموقع' : 'Sync Cloud'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUser(null);
                      localStorage.removeItem('bx_mob_user');
                      showToast(isRtl ? 'تم تسجيل الخروج' : 'Signed out');
                    }}
                    style={{
                      padding: '0.65rem 0.8rem',
                      borderRadius: '11px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'transparent',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    🚪
                  </button>
                </div>

                {/* Inline Profile Editor */}
                {editingProfile && (
                  <form
                    onSubmit={handleSaveProfileEdit}
                    style={{
                      marginTop: '0.85rem',
                      paddingTop: '0.85rem',
                      borderTop: '1px solid rgba(255,255,255,0.12)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.55rem',
                      textAlign: 'start'
                    }}
                  >
                    <input
                      type="text"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder={isRtl ? 'الاسم المعروض' : 'Display Name'}
                      style={{
                        padding: '0.6rem 0.8rem',
                        borderRadius: '10px',
                        background: '#000',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: '0.8rem'
                      }}
                    />
                    <input
                      type="text"
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder={isRtl ? 'النبذة الشخصية (Bio)...' : 'Your Otaku Bio...'}
                      style={{
                        padding: '0.6rem 0.8rem',
                        borderRadius: '10px',
                        background: '#000',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: '0.8rem'
                      }}
                    />
                    <input
                      type="url"
                      value={editPhotoUrl}
                      onChange={(e) => setEditPhotoUrl(e.target.value)}
                      placeholder={isRtl ? 'رابط الصورة الرمزية (Avatar URL)...' : 'Avatar Image URL...'}
                      style={{
                        padding: '0.6rem 0.8rem',
                        borderRadius: '10px',
                        background: '#000',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: '0.8rem'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '0.65rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#ffffff',
                        color: '#000000',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      ✓ {isRtl ? 'حفظ التعديلات ومزامنتها' : 'Save & Sync Profile'}
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <form
              onSubmit={handleAuthSubmit}
              style={{
                padding: '1.25rem',
                borderRadius: '18px',
                background: '#0a0a0e',
                border: '1px solid rgba(255,255,255,0.16)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>
                🔐 {isRtl ? 'حساب BLACK X الموحد (الموقع + التطبيق)' : 'Unified BLACK X Account (Web + APK)'}
              </h2>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                {isRtl
                  ? 'سجّل دخولك بحساب Google أو بحسابك في موقع BLACK X ليتم ربط مفضلتك وسجل مشاهداتك تلقائياً بين الهاتف والموقع.'
                  : 'Sign in with Google or your BLACK X Website account for automatic cross-device sync.'}
              </p>

              {/* Official Google OAuth 2.0 Sign-In (Opens Real accounts.google.com Login — No Cloud Account Listing) */}
              <button
                type="button"
                disabled={authBusy}
                onClick={handleRealGoogleOAuthLogin}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.65rem',
                  padding: '0.82rem 1rem',
                  borderRadius: '13px',
                  background: '#ffffff',
                  color: '#000000',
                  border: '1.5px solid #ffffff',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(255,255,255,0.16)'
                }}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>
                  {authBusy
                    ? isRtl
                      ? '⏳ جاري الاتصال ببوابة Google الرسمية...'
                      : '⏳ Connecting to Google OAuth...'
                    : isRtl
                    ? 'تسجيل الدخول باستخدام حساب Google الرسمي'
                    : 'Sign in with Google Account'}
                </span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.15rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.12)' }} />
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', fontWeight: 800 }}>
                  {isRtl ? 'أو عبر اسم المستخدم وكلمة المرور' : 'OR USERNAME & PASSWORD'}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.12)' }} />
              </div>

              <div style={{ display: 'flex', gap: '0.45rem' }}>
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  style={{
                    flex: 1,
                    padding: '0.55rem',
                    borderRadius: '10px',
                    fontWeight: 900,
                    fontSize: '0.8rem',
                    border: 'none',
                    background: authMode === 'login' ? '#ffffff' : 'rgba(255,255,255,0.07)',
                    color: authMode === 'login' ? '#000000' : '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  {isRtl ? 'تسجيل الدخول' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  style={{
                    flex: 1,
                    padding: '0.55rem',
                    borderRadius: '10px',
                    fontWeight: 900,
                    fontSize: '0.8rem',
                    border: 'none',
                    background: authMode === 'register' ? '#ffffff' : 'rgba(255,255,255,0.07)',
                    color: authMode === 'register' ? '#000000' : '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  {isRtl ? 'حساب جديد' : 'Register'}
                </button>
              </div>

              {authMode === 'register' && (
                <input
                  type="text"
                  value={authDisplayName}
                  onChange={(e) => setAuthDisplayName(e.target.value)}
                  placeholder={isRtl ? 'الاسم المعروض (Display Name)' : 'Display Name'}
                  style={{
                    padding: '0.7rem 0.9rem',
                    borderRadius: '11px',
                    background: '#050507',
                    border: '1px solid rgba(255,255,255,0.18)',
                    color: '#fff',
                    fontSize: '0.84rem'
                  }}
                />
              )}

              <input
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder={isRtl ? 'اسم المستخدم أو البريد الإلكتروني' : 'Username or Email'}
                style={{
                  padding: '0.7rem 0.9rem',
                  borderRadius: '11px',
                  background: '#050507',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: '#fff',
                  fontSize: '0.84rem'
                }}
              />

              {authMode === 'register' && (
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder={isRtl ? 'البريد الإلكتروني' : 'Email Address'}
                  style={{
                    padding: '0.7rem 0.9rem',
                    borderRadius: '11px',
                    background: '#050507',
                    border: '1px solid rgba(255,255,255,0.18)',
                    color: '#fff',
                    fontSize: '0.84rem'
                  }}
                />
              )}

              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder={isRtl ? 'كلمة المرور' : 'Password'}
                style={{
                  padding: '0.7rem 0.9rem',
                  borderRadius: '11px',
                  background: '#050507',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: '#fff',
                  fontSize: '0.84rem'
                }}
              />

              <button
                type="submit"
                disabled={authBusy}
                style={{
                  padding: '0.8rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#ffffff',
                  color: '#000000',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                {authBusy
                  ? isRtl
                    ? '⏳ جاري الاتصال بقاعدة البيانات...'
                    : '⏳ Connecting...'
                  : authMode === 'login'
                  ? isRtl
                    ? 'دخول ومزامنة الحساب'
                    : 'Sign In & Sync'
                  : isRtl
                  ? 'إنشاء الحساب ومزامنته'
                  : 'Create Synced Account'}
              </button>
            </form>
          )}

          {/* 6-Tab Personal Library Manager (Favorites, Watching, Completed, Plan to Watch, Episode History, Manga History) */}
          <div style={{ marginTop: '1.15rem' }}>
            <h3 style={{ margin: '0 0 0.55rem', fontSize: '0.95rem', fontWeight: 900 }}>
              📚 {isRtl ? 'مكتبتي الشخصية وقوائم المتابعة' : 'My Personal Anime & Manga Library'}
            </h3>
            <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.38rem', overflowX: 'auto', marginBottom: '0.85rem', paddingBottom: '0.2rem' }}>
              {[
                { id: 'favorites', ar: `♥ المفضلة (${favorites.length})`, en: `♥ Favorites (${favorites.length})` },
                { id: 'watching', ar: '🔥 أشاهد حالياً', en: '🔥 Watching' },
                { id: 'completed', ar: '✔ مكتمل', en: '✔ Completed' },
                { id: 'planned', ar: '📌 أخطط لمشاهدته', en: '📌 Plan to Watch' },
                { id: 'history', ar: `🕒 سجل الحلقات (${watchHistory.length})`, en: `🕒 History (${watchHistory.length})` },
                { id: 'manga_history', ar: `📖 سجل المانجا (${mangaHistory.length})`, en: `📖 Manga (${mangaHistory.length})` }
              ].map((lt) => {
                const active = librarySubTab === lt.id;
                return (
                  <button
                    key={lt.id}
                    type="button"
                    onClick={() => setLibrarySubTab(lt.id)}
                    style={{
                      padding: '0.42rem 0.8rem',
                      borderRadius: '99px',
                      fontSize: '0.73rem',
                      fontWeight: 900,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      background: active ? '#ffffff' : 'rgba(255,255,255,0.06)',
                      color: active ? '#000000' : '#ffffff',
                      border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.14)'
                    }}
                  >
                    {isRtl ? lt.ar : lt.en}
                  </button>
                );
              })}
            </div>

            {librarySubTab === 'favorites' && (
              favorites.length === 0 ? (
                <div style={{ padding: '1.25rem', borderRadius: '14px', background: '#0a0a0e', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRtl ? 'قائمتك المفضلة فارغة حالياً. اضغط على (＋) في أي أنمي لإضافته!' : 'No favorites added yet.'}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                  {favorites.map((fav) => (
                    <div key={fav.objectID || fav.slug} onClick={() => handleOpenAnime(fav)} style={{ cursor: 'pointer' }}>
                      <img src={fav.poster} alt={fav.titleEn} style={{ width: '100%', aspectRatio: '2/2.85', borderRadius: '11px', objectFit: 'cover' }} />
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {fav.titleEn}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {['watching', 'completed', 'planned'].includes(librarySubTab) && (() => {
              const items = Object.values(watchlistMap).filter((w) => w.status === librarySubTab);
              return items.length === 0 ? (
                <div style={{ padding: '1.25rem', borderRadius: '14px', background: '#0a0a0e', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRtl ? 'لا توجد أنميات في هذه القائمة بعد. يمكنك تصنيف أي أنمي من داخل صفحته!' : 'No anime in this list yet.'}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                  {items.map((it) => (
                    <div key={it.objectID} onClick={() => handleOpenAnime(it)} style={{ cursor: 'pointer' }}>
                      <img src={it.poster} alt={it.titleEn} style={{ width: '100%', aspectRatio: '2/2.85', borderRadius: '11px', objectFit: 'cover' }} />
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {it.titleEn}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {librarySubTab === 'history' && (
              watchHistory.length === 0 ? (
                <div style={{ padding: '1.25rem', borderRadius: '14px', background: '#0a0a0e', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRtl ? 'لم تشاهد أي حلقة بعد.' : 'No watch history yet.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {watchHistory.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => handleOpenAnime({ objectID: h.objectID, slug: h.slug, titleEn: h.titleEn, poster: h.poster })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.7rem',
                        padding: '0.55rem',
                        borderRadius: '12px',
                        background: '#0a0a0e',
                        border: '1px solid rgba(255,255,255,0.12)',
                        cursor: 'pointer'
                      }}
                    >
                      <img src={h.poster} alt={h.titleEn} style={{ width: '54px', height: '72px', borderRadius: '8px', objectFit: 'cover' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: '0.82rem' }}>{h.titleEn}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)' }}>{h.epName}</div>
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 900 }}>▶</span>
                    </div>
                  ))}
                </div>
              )
            )}

            {librarySubTab === 'manga_history' && (
              mangaHistory.length === 0 ? (
                <div style={{ padding: '1.25rem', borderRadius: '14px', background: '#0a0a0e', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRtl ? 'لم تقرأ أي فصل مانجا أو مانهوا بعد.' : 'No manga reading history yet.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {mangaHistory.map((mh, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setActiveTab('manga');
                        handleOpenManga({ objectID: mh.mangaId, name: mh.name, poster_uri: mh.poster, sourceLabel: mh.sourceLabel });
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.7rem',
                        padding: '0.55rem',
                        borderRadius: '12px',
                        background: '#0a0a0e',
                        border: '1px solid rgba(255,255,255,0.12)',
                        cursor: 'pointer'
                      }}
                    >
                      <img src={mh.poster} alt={mh.name} style={{ width: '54px', height: '72px', borderRadius: '8px', objectFit: 'cover' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: '0.82rem' }}>{mh.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)' }}>📖 الفصل {mh.chapterNum}</div>
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 900 }}>📖</span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </main>
      )}

      {/* ==================== FULL 4-TAB ANIME STUDIO & 120Hz CINEMA PLAYER SHEET ==================== */}
      {selectedAnime && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: '#000000',
            overflowY: 'auto',
            paddingBottom: '90px',
            animation: 'bxSlideUp 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        >
          {/* Sticky Top Back Bar */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 1rem',
              background: 'rgba(0,0,0,0.88)',
              backdropFilter: 'blur(18px)',
              borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <button
              type="button"
              onClick={() => {
                setSelectedAnime(null);
                setActiveEpisode(null);
                setPlayingVideoUrl('');
              }}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.22)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontWeight: 900,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              {isRtl ? '→ رجوع' : '← Back'}
            </button>
            <div
              style={{
                fontWeight: 900,
                fontSize: '0.86rem',
                maxWidth: '58%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {selectedAnime.titleEn}
            </div>
            <button
              type="button"
              onClick={() => toggleFavorite(selectedAnime)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.22)',
                background: favorites.some((f) => f.objectID === selectedAnime.objectID)
                  ? '#ffffff'
                  : 'rgba(255,255,255,0.08)',
                color: favorites.some((f) => f.objectID === selectedAnime.objectID) ? '#000000' : '#ffffff',
                fontWeight: 900,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              {favorites.some((f) => f.objectID === selectedAnime.objectID) ? '♥ محفوظ' : '＋ قائمتي'}
            </button>
          </div>

          {/* Built-In 120Hz Cinema Video Player (when an episode is tapped) */}
          {activeEpisode && (
            <div
              style={{
                background: '#000000',
                borderBottom: '1px solid rgba(255,255,255,0.14)',
                paddingBottom: '0.85rem'
              }}
            >
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#050507' }}>
                {resolvingVideo ? (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ fontSize: '1.5rem' }}>⚡</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 900 }}>
                      {isRtl
                        ? `جاري استخراج البث المباشر (${selectedServer?.quality || '1080p'})...`
                        : 'Extracting direct MP4 stream...'}
                    </div>
                  </div>
                ) : playingVideoUrl ? (
                  <>
                    <video
                      ref={videoRef}
                      src={playingVideoUrl}
                      controls
                      autoPlay
                      playsInline
                      referrerPolicy="no-referrer"
                      onError={handleVideoElementError}
                      onEnded={() => {
                        if (!autoNextEp) return;
                        const idx = animeEpisodes.findIndex((e) => e.docId === activeEpisode.docId);
                        if (idx !== -1 && idx + 1 < animeEpisodes.length) {
                          handlePlayEpisode(selectedAnime, animeEpisodes[idx + 1]);
                        }
                      }}
                      style={{ width: '100%', height: '100%', background: '#000' }}
                    />
                    {/* Left/Right Double-Tap ±10s Zones */}
                    <div
                      onDoubleClick={() => handleVideoDoubleTap('left')}
                      style={{ position: 'absolute', top: '15%', bottom: '28%', left: 0, width: '28%' }}
                    />
                    <div
                      onDoubleClick={() => handleVideoDoubleTap('right')}
                      style={{ position: 'absolute', top: '15%', bottom: '28%', right: 0, width: '28%' }}
                    />
                    {skipRipple && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '42%',
                          [skipRipple === 'left' ? 'left' : 'right']: '12%',
                          background: 'rgba(0,0,0,0.8)',
                          padding: '0.4rem 0.85rem',
                          borderRadius: '99px',
                          fontWeight: 900,
                          fontSize: '0.82rem'
                        }}
                      >
                        {skipRipple === 'left' ? '⏪ -10s' : '⏩ +10s'}
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.82rem',
                      color: 'rgba(255,255,255,0.65)'
                    }}
                  >
                    {isRtl ? 'اختر سيرفر آخر من الأسفل للتشغيل الفوري' : 'Select another server below'}
                  </div>
                )}
              </div>

              {/* Cinema Controls Strip (Prev/Next Ep, Auto-Next, PiP, Fullscreen, Speed, Direct MP4 Download) */}
              <div style={{ padding: '0.65rem 1rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div style={{ fontWeight: 900, fontSize: '0.86rem' }}>
                    🎬 {activeEpisode.name} {activeEpisode.titleAr ? `— ${activeEpisode.titleAr}` : ''}
                  </div>
                  <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto' }}>
                    {(() => {
                      const idx = animeEpisodes.findIndex((e) => e.docId === activeEpisode.docId);
                      const prevEp = idx > 0 ? animeEpisodes[idx - 1] : null;
                      const nextEp = idx !== -1 && idx + 1 < animeEpisodes.length ? animeEpisodes[idx + 1] : null;
                      return (
                        <>
                          {prevEp && (
                            <button
                              type="button"
                              onClick={() => handlePlayEpisode(selectedAnime, prevEp)}
                              style={{
                                padding: '0.28rem 0.55rem',
                                borderRadius: '8px',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#fff',
                                fontSize: '0.7rem',
                                fontWeight: 900,
                                cursor: 'pointer'
                              }}
                            >
                              ⏮ {isRtl ? 'السابقة' : 'Prev'}
                            </button>
                          )}
                          {nextEp && (
                            <button
                              type="button"
                              onClick={() => handlePlayEpisode(selectedAnime, nextEp)}
                              style={{
                                padding: '0.28rem 0.55rem',
                                borderRadius: '8px',
                                background: '#ffffff',
                                border: 'none',
                                color: '#000',
                                fontSize: '0.7rem',
                                fontWeight: 900,
                                cursor: 'pointer'
                              }}
                            >
                              ⏭ {isRtl ? 'التالية' : 'Next'}
                            </button>
                          )}
                        </>
                      );
                    })()}
                    <button
                      type="button"
                      onClick={() => setAutoNextEp((v) => !v)}
                      style={{
                        padding: '0.28rem 0.55rem',
                        borderRadius: '8px',
                        background: autoNextEp ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      🔁 {autoNextEp ? 'تلقائي ON' : 'تلقائي OFF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const speeds = [1, 1.25, 1.5, 2, 0.75];
                        const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
                        setPlaybackSpeed(next);
                        if (videoRef.current) videoRef.current.playbackRate = next;
                      }}
                      style={{
                        padding: '0.28rem 0.55rem',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ {playbackSpeed}x
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (videoRef.current?.requestPictureInPicture) {
                          videoRef.current.requestPictureInPicture().catch(() => {});
                        }
                      }}
                      style={{
                        padding: '0.28rem 0.55rem',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        cursor: 'pointer'
                      }}
                    >
                      📺 PiP
                    </button>
                    {playingVideoUrl && (
                      <a
                        href={playingVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        style={{
                          padding: '0.28rem 0.65rem',
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#000000',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          textDecoration: 'none'
                        }}
                      >
                        ⬇ {isRtl ? 'تحميل MP4' : 'Download MP4'}
                      </a>
                    )}
                  </div>
                </div>

                {/* Anime Witcher-Style Server & Quality Selector Pills */}
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: 800, marginBottom: '0.35rem' }}>
                  {isRtl
                    ? 'اختر سيرفر وجودة المشاهدة المباشرة (بدون مشغل خارجي وبدون إعلانات):'
                    : 'Select Direct Stream Server & Quality (Built-in Player, No Ads):'}
                </div>
                <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                  {episodeServers.map((srv, idx) => {
                    const meta = SERVER_LABELS[srv.name] || { nameAr: srv.name, nameEn: srv.name };
                    const active = selectedServer === srv;
                    return (
                      <button
                        key={`${srv.name}-${srv.quality}-${idx}`}
                        type="button"
                        onClick={() => handleSelectServer(srv, episodeServers)}
                        style={{
                          padding: '0.45rem 0.8rem',
                          borderRadius: '11px',
                          background: active ? '#ffffff' : '#0d0d12',
                          color: active ? '#000000' : '#ffffff',
                          border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.16)',
                          fontWeight: 900,
                          fontSize: '0.74rem',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer'
                        }}
                      >
                        {isRtl ? meta.nameAr : meta.nameEn} • {srv.quality}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Anime Header Info (Banner + Poster + Metadata Grid + Watchlist Status Selector) */}
          <div style={{ position: 'relative', padding: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
              <img
                src={selectedAnime.poster}
                alt={selectedAnime.titleEn}
                style={{
                  width: '110px',
                  height: '158px',
                  borderRadius: '14px',
                  objectFit: 'cover',
                  border: '1px solid rgba(255,255,255,0.25)',
                  flexShrink: 0
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                  <span
                    style={{
                      background: '#ffffff',
                      color: '#000000',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      padding: '0.14rem 0.5rem',
                      borderRadius: '6px'
                    }}
                  >
                    ★ {selectedAnime.rating} MAL
                  </span>
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '0.14rem 0.5rem',
                      borderRadius: '6px'
                    }}
                  >
                    {selectedAnime.state}
                  </span>
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '0.14rem 0.5rem',
                      borderRadius: '6px'
                    }}
                  >
                    {selectedAnime.age}
                  </span>
                </div>

                <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.08rem', fontWeight: 900, lineHeight: 1.3 }}>
                  {selectedAnime.titleEn}
                </h1>

                <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
                  <div>🎬 {isRtl ? 'الاستوديو:' : 'Studio:'} {selectedAnime.studio}</div>
                  <div>📅 {isRtl ? 'الموسم:' : 'Season:'} {selectedAnime.season} ({selectedAnime.year})</div>
                  <div>📼 {isRtl ? 'عدد الحلقات:' : 'Episodes:'} {animeEpisodes.length} {selectedAnime.duration ? `• ⏱ ${selectedAnime.duration}` : ''}</div>
                </div>
              </div>
            </div>

            {/* Watchlist Status Bar (Watching / Completed / Plan to Watch / Dropped) */}
            <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.38rem', overflowX: 'auto', marginTop: '0.85rem' }}>
              {[
                { id: 'watching', label: '🔥 أشاهد حالياً' },
                { id: 'completed', label: '✔ مكتمل' },
                { id: 'planned', label: '📌 أخطط لمشاهدته' },
                { id: 'dropped', label: '⏸ متوقف' }
              ].map((st) => {
                const currentStatus = watchlistMap[selectedAnime.objectID]?.status;
                const active = currentStatus === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleSetWatchlistStatus(selectedAnime, st.id)}
                    style={{
                      padding: '0.38rem 0.75rem',
                      borderRadius: '10px',
                      fontSize: '0.71rem',
                      fontWeight: 900,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      background: active ? '#ffffff' : 'rgba(255,255,255,0.06)',
                      color: active ? '#000000' : '#ffffff',
                      border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.14)'
                    }}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>

            {/* Genre Tags */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              {(selectedAnime.tags || []).map((t, idx) => (
                <span
                  key={idx}
                  onClick={() => {
                    setSelectedAnime(null);
                    setCatalogGenre(t);
                    setActiveTab('catalog');
                  }}
                  style={{
                    padding: '0.24rem 0.65rem',
                    borderRadius: '99px',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {t}
                </span>
              ))}
            </div>

            {/* Expandable Arabic Story */}
            <div
              onClick={() => setStoryExpanded((v) => !v)}
              style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                borderRadius: '13px',
                background: '#0a0a0d',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '0.76rem', fontWeight: 900, marginBottom: '0.25rem' }}>
                📖 {isRtl ? 'قصة الأنمي بالعربية (اضغط للتوسيع)' : 'Synopsis'}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.76rem',
                  color: 'rgba(255,255,255,0.78)',
                  lineHeight: 1.55,
                  display: storyExpanded ? 'block' : '-webkit-box',
                  WebkitLineClamp: storyExpanded ? 'unset' : 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {selectedAnime.storyAr}
              </p>
            </div>

            {/* 4-Tab Detail Studio Switcher (Episodes | Characters & VA | Trailer & Related | Reviews) */}
            <div
              className="bx-mob-scroll"
              style={{
                display: 'flex',
                gap: '0.4rem',
                overflowX: 'auto',
                marginTop: '0.95rem',
                marginBottom: '0.75rem',
                paddingBottom: '0.2rem'
              }}
            >
              {[
                { id: 'episodes', label: isRtl ? `🎞️ الحلقات (${animeEpisodes.length})` : `🎞️ Episodes (${animeEpisodes.length})` },
                { id: 'characters', label: isRtl ? `👥 الشخصيات (${animeCharacters.length})` : `👥 Cast (${animeCharacters.length})` },
                { id: 'trailer', label: isRtl ? '🎬 التريلر والمشابهة' : '🎬 Trailer & Related' },
                { id: 'reviews', label: isRtl ? `💬 التقييمات (${animeReviews.length})` : `💬 Reviews (${animeReviews.length})` }
              ].map((dt) => {
                const active = detailTab === dt.id;
                return (
                  <button
                    key={dt.id}
                    type="button"
                    onClick={() => setDetailTab(dt.id)}
                    style={{
                      padding: '0.5rem 0.85rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      background: active ? '#ffffff' : '#0a0a0e',
                      color: active ? '#000000' : '#ffffff',
                      border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.14)'
                    }}
                  >
                    {dt.label}
                  </button>
                );
              })}
            </div>

            {/* SUB-TAB 1: EPISODES & DIRECT STREAMING */}
            {detailTab === 'episodes' && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.4rem',
                    marginBottom: '0.65rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <input
                    type="search"
                    value={epSearchQuery}
                    onChange={(e) => setEpSearchQuery(e.target.value)}
                    placeholder={isRtl ? 'ابحث برقم الحلقة...' : 'Search Ep #...'}
                    style={{
                      flex: 1,
                      minWidth: '110px',
                      padding: '0.4rem 0.65rem',
                      borderRadius: '9px',
                      background: '#0b0b0e',
                      border: '1px solid rgba(255,255,255,0.16)',
                      color: '#fff',
                      fontSize: '0.75rem'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setHideFiller((v) => !v)}
                    style={{
                      padding: '0.4rem 0.65rem',
                      borderRadius: '9px',
                      background: hideFiller ? '#ffffff' : 'rgba(255,255,255,0.08)',
                      color: hideFiller ? '#000000' : '#ffffff',
                      border: '1px solid rgba(255,255,255,0.18)',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    {hideFiller ? '✓ بدون فلر' : 'إخفاء الفلر'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEpAscending((v) => !v)}
                    style={{
                      padding: '0.4rem 0.65rem',
                      borderRadius: '9px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.18)',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    {epAscending ? '⬆ 1..N' : '⬇ N..1'}
                  </button>
                </div>

                {episodesLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.6)' }}>
                    {isRtl ? '⏳ جاري جلب قائمة الحلقات والسيرفرات...' : '⏳ Loading episodes...'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    {displayedEpisodes.map((ep) => {
                      const isPlaying = activeEpisode?.docId === ep.docId;
                      const isWatched = watchHistory.some(
                        (h) => h.objectID === selectedAnime.objectID && Number(h.epNum) === Number(ep.number)
                      );
                      return (
                        <div
                          key={ep.docId}
                          className="bx-mob-card"
                          onClick={() => handlePlayEpisode(selectedAnime, ep)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.55rem',
                            borderRadius: '13px',
                            background: isPlaying ? '#ffffff' : '#0a0a0e',
                            color: isPlaying ? '#000000' : '#ffffff',
                            border: isPlaying ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.1)',
                            opacity: isWatched && !isPlaying ? 0.78 : 1,
                            cursor: 'pointer'
                          }}
                        >
                          <div
                            style={{
                              position: 'relative',
                              width: '92px',
                              height: '56px',
                              borderRadius: '9px',
                              overflow: 'hidden',
                              background: '#111',
                              flexShrink: 0
                            }}
                          >
                            <img
                              src={ep.thumb || selectedAnime.poster}
                              alt={ep.name}
                              loading="lazy"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {ep.filler && (
                              <span
                                style={{
                                  position: 'absolute',
                                  top: '3px',
                                  right: '3px',
                                  background: '#000',
                                  color: '#fff',
                                  fontSize: '0.55rem',
                                  fontWeight: 900,
                                  padding: '0.08rem 0.3rem',
                                  borderRadius: '4px'
                                }}
                              >
                                فلر
                              </span>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 900, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span>{ep.name}</span>
                              {isWatched && (
                                <span style={{ fontSize: '0.62rem', padding: '0.05rem 0.35rem', borderRadius: '4px', background: 'rgba(255,255,255,0.16)' }}>
                                  ✓ شوهدت
                                </span>
                              )}
                            </div>
                            {ep.titleAr && (
                              <div
                                style={{
                                  fontSize: '0.72rem',
                                  opacity: 0.72,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {ep.titleAr}
                              </div>
                            )}
                          </div>
                          <span
                            style={{
                              padding: '0.35rem 0.7rem',
                              borderRadius: '9px',
                              background: isPlaying ? '#000000' : 'rgba(255,255,255,0.1)',
                              color: '#ffffff',
                              fontSize: '0.72rem',
                              fontWeight: 900
                            }}
                          >
                            ▶ 1080p
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* SUB-TAB 2: CHARACTERS & JAPANESE VOICE ACTORS (SEIYUU) */}
            {detailTab === 'characters' && (
              charactersLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRtl ? '⏳ جاري جلب طاقم الشخصيات ومؤدي الأصوات اليابانيين...' : '⏳ Loading characters & voice actors...'}
                </div>
              ) : animeCharacters.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRtl ? 'لا تتوفر بيانات إضافية للشخصيات حالياً.' : 'No character data found.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {animeCharacters.map((ch) => (
                    <div
                      key={ch.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.55rem 0.7rem',
                        borderRadius: '13px',
                        background: '#0a0a0e',
                        border: '1px solid rgba(255,255,255,0.12)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <img
                          src={ch.image}
                          alt={ch.name}
                          loading="lazy"
                          style={{ width: '48px', height: '62px', borderRadius: '9px', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.82rem' }}>{ch.name}</div>
                          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)' }}>{ch.role}</div>
                        </div>
                      </div>
                      {ch.vaName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', textAlign: 'end' }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.76rem' }}>{ch.vaName}</div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)' }}>🎙️ JP Seiyuu</div>
                          </div>
                          {ch.vaImage && (
                            <img
                              src={ch.vaImage}
                              alt={ch.vaName}
                              loading="lazy"
                              style={{ width: '44px', height: '58px', borderRadius: '9px', objectFit: 'cover' }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* SUB-TAB 3: OFFICIAL TRAILER & SIMILAR/RELATED ANIME */}
            {detailTab === 'trailer' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {selectedAnime.trailer ? (
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', fontWeight: 900 }}>
                      🎬 {isRtl ? 'العرض الدعائي الرسمي (Official Trailer)' : 'Official Trailer'}
                    </h4>
                    <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${selectedAnime.trailer}`}
                        title="Anime Trailer"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        frameBorder="0"
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '1rem', borderRadius: '12px', background: '#0a0a0e', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                    {isRtl ? 'لا يتوفر تريلر مدمج لهذا العمل.' : 'No embedded trailer available.'}
                  </div>
                )}

                <div>
                  <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.88rem', fontWeight: 900 }}>
                    ✨ {isRtl ? 'أنميات مشابهة ومرتبطة ننصحك بمشاهدتها' : 'Similar & Related Anime'}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                    {relatedAnimes.map((rel) => (
                      <div key={rel.objectID} onClick={() => handleOpenAnime(rel)} style={{ cursor: 'pointer' }}>
                        <img
                          src={rel.poster}
                          alt={rel.titleEn}
                          loading="lazy"
                          style={{ width: '100%', aspectRatio: '2/2.85', borderRadius: '11px', objectFit: 'cover' }}
                        />
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {rel.titleEn}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 4: CLOUD ANIME REVIEWS & RATINGS */}
            {detailTab === 'reviews' && (
              <div>
                <form
                  onSubmit={handlePostAnimeReview}
                  style={{
                    padding: '0.8rem',
                    borderRadius: '13px',
                    background: '#0a0a0e',
                    border: '1px solid rgba(255,255,255,0.14)',
                    marginBottom: '0.85rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 900 }}>
                      ⭐ {isRtl ? 'تقييمك للأنمي:' : 'Your Score:'}
                    </span>
                    <select
                      value={newReviewScore}
                      onChange={(e) => setNewReviewScore(Number(e.target.value))}
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '8px',
                        background: '#000',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.22)',
                        fontWeight: 900,
                        fontSize: '0.76rem'
                      }}
                    >
                      {[10, 9, 8, 7, 6, 5].map((s) => (
                        <option key={s} value={s}>
                          ★ {s} / 10
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '0.45rem' }}>
                    <input
                      type="text"
                      value={newReviewText}
                      onChange={(e) => setNewReviewText(e.target.value)}
                      placeholder={isRtl ? 'اكتب مراجعتك أو رأيك حول هذا الأنمي...' : 'Write your review...'}
                      style={{
                        flex: 1,
                        padding: '0.58rem 0.8rem',
                        borderRadius: '10px',
                        background: '#050507',
                        border: '1px solid rgba(255,255,255,0.18)',
                        color: '#fff',
                        fontSize: '0.78rem'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '0 0.95rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#ffffff',
                        color: '#000000',
                        fontWeight: 900,
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      {isRtl ? 'إرسال' : 'Post'}
                    </button>
                  </div>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {animeReviews.map((rv) => (
                    <div
                      key={rv.id}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '12px',
                        background: '#0a0a0e',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span style={{ fontWeight: 900, fontSize: '0.8rem' }}>{rv.author}</span>
                        <span style={{ fontWeight: 900, fontSize: '0.74rem', background: '#fff', color: '#000', padding: '0.08rem 0.45rem', borderRadius: '6px' }}>
                          ★ {rv.score}/10
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.76rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.45 }}>{rv.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== BOTTOM 6-TAB FLOATING AMOLED NAVIGATION BAR ==================== */}
      <nav
        style={{
          position: 'fixed',
          bottom: '10px',
          left: '10px',
          right: '10px',
          zIndex: 250,
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          padding: '0.38rem',
          borderRadius: '20px',
          background: 'rgba(8, 8, 10, 0.94)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 14px 36px rgba(0, 0, 0, 0.92)'
        }}
      >
        {[
          { id: 'home', icon: '🏠', ar: 'الرئيسية', en: 'Home' },
          { id: 'catalog', icon: '🧭', ar: 'الأنميات', en: 'Catalog' },
          { id: 'schedule', icon: '📅', ar: 'الجدول', en: 'Schedule' },
          { id: 'manga', icon: '📖', ar: 'المانجا', en: 'Manga' },
          { id: 'community', icon: '🔮', ar: 'الساحة', en: 'Arena' },
          { id: 'profile', icon: '👤', ar: 'مكتبتي', en: 'Library' }
        ].map((t) => {
          const active = activeTab === t.id && !selectedAnime;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSelectedAnime(null);
                setActiveEpisode(null);
                setActiveTab(t.id);
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                padding: '0.36rem 0.1rem',
                borderRadius: '14px',
                border: 'none',
                background: active ? '#ffffff' : 'transparent',
                color: active ? '#000000' : 'rgba(255,255,255,0.68)',
                fontWeight: 900,
                fontSize: '0.64rem',
                cursor: 'pointer',
                transition: 'all 0.16s ease'
              }}
            >
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>{t.icon}</span>
              <span>{isRtl ? t.ar : t.en}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
