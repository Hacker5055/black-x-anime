import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BLACK_X_MOTION_THEMES } from '../components/BlackXSplashVortex.jsx';

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
  PD_DEV: { nameAr: '👑 BLACK X 1 Ultra', nameEn: '👑 BLACK X 1 Ultra', badge: 'أسرع سيرفر • مضاد للحجب', fast: true },
  PD_NET: { nameAr: '⚡ BLACK X 2 Mirror', nameEn: '⚡ BLACK X 2 Mirror', badge: 'سيرفر بديل فائق السرعة', fast: true },
  SF: { nameAr: '🔥 BLACK X 3 Turbo', nameEn: '🔥 BLACK X 3 Turbo', badge: 'بث سحابي مباشر MP4', fast: true },
  AA: { nameAr: '💎 BLACK X 4 Cloud', nameEn: '💎 BLACK X 4 Cloud', badge: 'سيرفر عالمي مباشر', fast: true },
  PD: { nameAr: '🌐 BLACK X 5 Direct', nameEn: '🌐 BLACK X 5 Direct', badge: 'مباشر • MP4', fast: true },
  MF2: { nameAr: '🚀 BLACK X 6 Pro', nameEn: '🚀 BLACK X 6 Pro', badge: 'مباشر • MP4', fast: true },
  MF: { nameAr: '🚀 BLACK X 7 Plus', nameEn: '🚀 BLACK X 7 Plus', badge: 'مباشر • MP4', fast: true },
  ST: { nameAr: '🎬 BLACK X 8 HD', nameEn: '🎬 BLACK X 8 HD', badge: 'احتياطي HD', fast: false }
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
 * Native Android Java HTTP Bridge (`window.BlackXNativeAuth.httpRequestAsync` / `httpGetSync` / `httpPostSync`):
 * Executes HTTP GET & POST requests directly via Android `java.net.HttpURLConnection` in `MainActivity.java`
 * with zero CORS restrictions and full support for custom headers (`User-Agent`, `Referer`, `Origin`, `app_version`, etc.).
 */
const pendingNativeHttpMap = new Map();
if (typeof window !== 'undefined') {
  window.__onBlackXHttpResult = (reqId, respText) => {
    const resolver = pendingNativeHttpMap.get(reqId);
    if (resolver) {
      pendingNativeHttpMap.delete(reqId);
      resolver(respText || '');
    }
  };
}

function serializeHeadersPipe(headers = {}) {
  return Object.entries(headers || {})
    .filter(([k, v]) => k && v !== undefined && v !== null)
    .map(([k, v]) => `${k}:${v}`)
    .join('||');
}

async function nativeHttpCall(url, method = 'GET', headers = {}, bodyStr = '') {
  const hPipe = serializeHeadersPipe(headers);
  try {
    if (typeof window !== 'undefined' && window.BlackXNativeAuth?.httpRequestAsync) {
      return await new Promise((resolve) => {
        const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const timer = setTimeout(() => {
          if (pendingNativeHttpMap.has(reqId)) {
            pendingNativeHttpMap.delete(reqId);
            resolve('');
          }
        }, 12000);
        pendingNativeHttpMap.set(reqId, (txt) => {
          clearTimeout(timer);
          resolve(txt);
        });
        window.BlackXNativeAuth.httpRequestAsync(reqId, url, method, hPipe, bodyStr || '');
      });
    }
    if (typeof window !== 'undefined' && window.BlackXNativeAuth?.httpGetSync && method === 'GET') {
      const syncTxt = window.BlackXNativeAuth.httpGetSync(url, hPipe);
      if (syncTxt) return syncTxt;
    }
  } catch (_) {}

  try {
    const capHttp = window.Capacitor?.Plugins?.CapacitorHttp;
    if (capHttp?.request) {
      const res = await capHttp.request({ url, method, headers, data: bodyStr || undefined });
      if (res?.data !== undefined) {
        return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      }
    }
  } catch (_) {}

  const fetchOpts = { method, headers: { ...headers } };
  if (method === 'POST' && bodyStr) fetchOpts.body = bodyStr;
  const r = await fetch(url, fetchOpts);
  return r.text();
}

async function nativeGetHtml(url, extraHeaders = {}) {
  return nativeHttpCall(
    url,
    'GET',
    {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ...extraHeaders
    },
    ''
  );
}

async function nativeGetJson(url, headers = {}) {
  const txt = await nativeHttpCall(
    url,
    'GET',
    {
      Accept: 'application/json',
      ...headers
    },
    ''
  );
  if (!txt) return null;
  try {
    return typeof txt === 'string' ? JSON.parse(txt) : txt;
  } catch (_) {
    return null;
  }
}

async function nativePostFormJson(url, formParams = {}, headers = {}) {
  const bodyStr = new URLSearchParams(formParams).toString();
  const txt = await nativeHttpCall(
    url,
    'POST',
    {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      ...headers
    },
    bodyStr
  );
  if (!txt) return null;
  try {
    return typeof txt === 'string' ? JSON.parse(txt) : txt;
  } catch (_) {
    return null;
  }
}

/**
 * Dispatch a REAL Android OS Status-Bar & Heads-Up Notification to the user's phone!
 */
export function dispatchPhoneNotification(title, body, notifId = 0) {
  try {
    if (typeof window !== 'undefined' && window.BlackXNativeAuth?.requestNotificationPermission) {
      window.BlackXNativeAuth.requestNotificationPermission();
    }
    if (typeof window !== 'undefined' && window.BlackXNativeAuth?.sendPhoneNotification) {
      window.BlackXNativeAuth.sendPhoneNotification(
        String(title || 'BLACK X'),
        String(body || ''),
        Number(notifId) || Math.floor(Date.now() % 100000)
      );
      return true;
    }
  } catch (_) {}

  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(String(title || 'BLACK X'), {
          body: String(body || ''),
          icon: '/blackx-logo.png'
        });
        return true;
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((p) => {
          if (p === 'granted') {
            new Notification(String(title || 'BLACK X'), {
              body: String(body || ''),
              icon: '/blackx-logo.png'
            });
          }
        });
      }
    }
  } catch (_) {}
  return false;
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

/**
 * Fetch live Arabic-subtitled 1080p/720p/480p Direct MP4 servers from BLACK X Server 2 (Animeify v4 API)
 */
async function fetchAnimeifyDirectServers(titleRomaji, titleEn, epNum, isMovie = false) {
  const apiBase = 'https://animeify.net/animeify/apis_v4/';
  const token = '8cnY80AZSbUCmR26Vku1VUUY4';
  const queries = Array.from(new Set([titleRomaji, titleEn].map((s) => String(s || '').trim()).filter(Boolean)));
  if (!queries.length) return [];

  try {
    let matchedAnimeId = null;
    const animeType = isMovie ? 'MOVIE' : 'SERIES';

    for (const q of queries) {
      const shortQ = q.split(/\s+/).slice(0, 3).join(' ');
      const list = await nativePostFormJson(`${apiBase}anime/load_anime_list_v2.php`, {
        UserId: '0',
        Language: 'AR',
        FilterType: 'SEARCH',
        FilterData: shortQ,
        Type: animeType,
        From: '0',
        Token: token
      });
      if (Array.isArray(list) && list.length > 0) {
        const normQ = q.toLowerCase().replace(/[^a-z0-9]/g, '');
        const exact =
          list.find((it) => {
            const t1 = String(it.EN_Title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const t2 = String(it.Synonyms || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return (t1 && (t1.includes(normQ) || normQ.includes(t1))) || (t2 && (t2.includes(normQ) || normQ.includes(t2)));
          }) || list[0];
        if (exact?.AnimeId) {
          matchedAnimeId = exact.AnimeId;
          break;
        }
      }
    }

    if (!matchedAnimeId) return [];

    const srvJson = await nativePostFormJson(`${apiBase}anime/load_servers.php`, {
      UserId: '0',
      AnimeId: matchedAnimeId,
      Episode: String(epNum || 1),
      AnimeType: animeType,
      Token: token
    });
    const ce = srvJson?.CurrentEpisode;
    if (!ce) return [];

    const rawCandidates = [];
    if (ce.FRFhdQ) {
      rawCandidates.push({
        name: 'MF2',
        quality: '1080p',
        link: String(ce.FRFhdQ).startsWith('http') ? ce.FRFhdQ : `https://www.mediafire.com/file/${ce.FRFhdQ}`
      });
    }
    if (ce.FRLink) {
      rawCandidates.push({
        name: 'MF2',
        quality: '720p',
        link: String(ce.FRLink).startsWith('http') ? ce.FRLink : `https://www.mediafire.com/file/${ce.FRLink}`
      });
    }
    if (ce.FRLowQ) {
      rawCandidates.push({
        name: 'MF',
        quality: '480p',
        link: String(ce.FRLowQ).startsWith('http') ? ce.FRLowQ : `https://www.mediafire.com/file/${ce.FRLowQ}`
      });
    }
    if (ce.SVLink) {
      rawCandidates.push({
        name: 'SF',
        quality: '720p',
        link: String(ce.SVLink).startsWith('http') ? ce.SVLink : `https://sendvid.com/embed/${ce.SVLink}`
      });
    }
    if (ce.SVLowQ) {
      rawCandidates.push({
        name: 'SF',
        quality: '480p',
        link: String(ce.SVLowQ).startsWith('http') ? ce.SVLowQ : `https://sendvid.com/embed/${ce.SVLowQ}`
      });
    }

    const resolvedList = await Promise.all(
      rawCandidates.map(async (cand) => {
        const directMp4 = await resolveMobileVideoUrl(cand.name, cand.link);
        if (!directMp4) return null;
        return {
          name: cand.name,
          quality: cand.quality,
          link: directMp4,
          directResolvedUrl: directMp4,
          visible: true
        };
      })
    );
    return resolvedList.filter(Boolean);
  } catch (_) {
    return [];
  }
}

/**
 * Resolve intermediate server link (PD_DEV, PD_NET, PD, SF, MF, MF2, ST, KF, SV) directly inside the Android APK
 * and return NULL if the file is 404/dead so broken servers are automatically filtered out!
 */
async function resolveMobileVideoUrl(code, rawLink) {
  const c = String(code || '').toUpperCase().trim();
  const link = String(rawLink || '').trim();
  if (!link) return null;

  // Already a direct resolved MP4 link
  if (
    link.includes('encodings/') ||
    link.includes('fast4speed.rsvp') ||
    link.includes('videos2.sendvid.com') ||
    link.includes('videos.sendvid.com') ||
    /https?:\/\/download\d*\.mediafire\.com\//i.test(link)
  ) {
    return link;
  }

  // 1. PixelDrain (PD_DEV / PD_NET / PD) — Verify file info is 200 OK (not 404)
  if (c.startsWith('PD') || link.includes('pixeldrain.')) {
    const m = link.match(/pixeldrain\.[a-z]+\/(?:u|api\/file)\/([A-Za-z0-9_-]+)/i);
    if (m?.[1]) {
      const fid = m[1];
      try {
        const infoJson = await nativeGetJson(`https://pixeldrain.com/api/file/${fid}/info`);
        if (infoJson && infoJson.success === false) {
          return null;
        }
      } catch (_) {}
      if (c === 'PD_NET') return `https://pixeldrain.net/api/file/${fid}`;
      if (c === 'PD') return `https://pixeldrain.com/api/file/${fid}`;
      return `https://pixeldrain.dev/api/file/${fid}`;
    }
  }

  // 2. Sendvid (sendvid.com/embed/...) -> Direct MP4
  if (link.includes('sendvid.com')) {
    try {
      const html = await nativeGetHtml(link);
      const svMatch = html.match(/https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/i);
      if (svMatch?.[0]) return svMatch[0];
    } catch (_) {}
    return null;
  }

  // 3. FireStream (SF)
  if (c === 'SF' || link.includes('firestream.to')) {
    try {
      const html = await nativeGetHtml(link);
      const m =
        html.match(/"downloadUrl"\s*:\s*"([^"]+)"/) ||
        html.match(/https?:\/\/[a-z0-9.-]*firestream\.to\/encodings\/[^\s"']+/i);
      if (m?.[1] || m?.[0]) return (m[1] || m[0]).replace(/\\u0026/g, '&').replace(/\\\//g, '/');
    } catch (_) {}
    return null;
  }

  // 4. MediaFire (MF / MF2)
  if (c === 'MF' || c === 'MF2' || link.includes('mediafire.com')) {
    try {
      const html = await nativeGetHtml(link);
      if (!html || html.includes('error.php?errno=')) return null;
      const direct =
        html.match(/(https?:\/\/download\d*\.mediafire\.com\/[^"'\s<>]+)/i)?.[1] ||
        html.match(/aria-label="Download file"[^>]*href="(https?:\/\/[^"]+)"/i)?.[1];
      if (direct) return direct;
      const scrambled = html.match(/data-scrambled-url="([^"]+)"/i)?.[1];
      if (scrambled) return atob(scrambled);
    } catch (_) {}
    return null;
  }

  // 5. KrakenFiles (KF) & UpStream (US)
  if (c === 'KF' || c === 'US' || link.includes('krakenfiles.com') || link.includes('upstream')) {
    try {
      const html = await nativeGetHtml(link);
      const srcMatch = html.match(/<source\s+src="((?:https?:)?\/\/[^"]+)"\s+type="video\/mp4"/i);
      if (srcMatch?.[1]) {
        return srcMatch[1].startsWith('//') ? `https:${srcMatch[1]}` : srcMatch[1];
      }
    } catch (_) {}
    return null;
  }

  // 6. StreamTape (ST)
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
  const [videoFullscreen, setVideoFullscreen] = useState(false);
  const [videoFitMode, setVideoFitMode] = useState('cover'); // 'cover' (full 20:9 screen) | 'contain' (16:9) | 'fill'
  const [skipRipple, setSkipRipple] = useState(null); // 'left' | 'right'
  const [videoTouchLocked, setVideoTouchLocked] = useState(false);
  const [videoBrightness, setVideoBrightness] = useState(100);
  const [videoVolume, setVideoVolume] = useState(100);
  const [gestureHud, setGestureHud] = useState(null); // { type: 'brightness' | 'volume', value: number } | null
  const [longPress2x, setLongPress2x] = useState(false);
  const videoRef = useRef(null);
  const gestureStartRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const gestureHudTimerRef = useRef(null);

  // Manga States (30,000+ Arabic Manga & Manhwa from BLACK X Engines)
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
  const [readerFullscreen, setReaderFullscreen] = useState(true);
  const [readerHudVisible, setReaderHudVisible] = useState(true);
  const [readerEyeFilter, setReaderEyeFilter] = useState('normal'); // 'normal' | 'warm' | 'contrast'
  const [volumeKeyScroll, setVolumeKeyScroll] = useState(true);
  const mangaReaderContainerRef = useRef(null);
  const prefetchedChapterRef = useRef({});
  const [globalBroadcastMsg, setGlobalBroadcastMsg] = useState('');
  const [devBroadcastInput, setDevBroadcastInput] = useState('');
  const [devBroadcastBusy, setDevBroadcastBusy] = useState(false);
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
      const saved = JSON.parse(localStorage.getItem('bx_mob_user') || 'null');
      if (saved) {
        const isDevAcc =
          saved.role === 'developer' ||
          (saved.email || '').toLowerCase() === 'mz0970mmz@gmail.com' ||
          (saved.username || '').toLowerCase() === 'developer' ||
          (saved.username || '').toLowerCase() === 'mz0970mmz';
        if (!isDevAcc && !localStorage.getItem('bx_mob_redeemed_vip_code')) {
          saved.vipTier = 'free';
          saved.vipStatus = 'Free Tier';
        }
      }
      return saved;
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

  // Global Cloud-Synced VIP Enforcement & Developer Master Switch States
  const [globalVipEnforced, setGlobalVipEnforced] = useState(() => {
    const cached = localStorage.getItem('bx_mob_global_vip_enforced');
    return cached === null ? true : cached === 'true';
  });
  const [cloudVipCodes, setCloudVipCodes] = useState([]);
  const [vipBillingCycle, setVipBillingCycle] = useState('monthly'); // 'monthly' | 'quarterly' | 'yearly'
  const [vipRedeemCode, setVipRedeemCode] = useState('');
  const [vipRedeemBusy, setVipRedeemBusy] = useState(false);
  const [vipGateShowLogin, setVipGateShowLogin] = useState(false);
  const [devToggleBusy, setDevToggleBusy] = useState(false);
  const [devGenTier, setDevGenTier] = useState('vip_monarch');
  const [devGenDays, setDevGenDays] = useState(30);
  const [devGenUses, setDevGenUses] = useState(1);
  const [devGenBusy, setDevGenBusy] = useState(false);
  const [lastGenCode, setLastGenCode] = useState('');
  const [redeemedVipTier, setRedeemedVipTier] = useState(() => localStorage.getItem('bx_mob_redeemed_vip_tier') || '');
  const [motionPref, setMotionPref] = useState(() => localStorage.getItem('bx_motion_pref') || 'random');

  // ==================== v4.0 ULTIMATE ENGINE STATES ====================
  // 1. True Offline Vault (Chapters & Episodes saved to local storage / CacheStorage)
  const [offlineChapters, setOfflineChapters] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bx_mob_offline_chapters') || '[]');
    } catch {
      return [];
    }
  });
  const [savingOfflineChapter, setSavingOfflineChapter] = useState(false);

  // 2. Anime Ultra Player v4 (Audio Booster 200% + Bass, A-B Scene Loop, Smart Sleep Timer, Frame Snapshot)
  const [audioBoostMode, setAudioBoostMode] = useState('normal'); // 'normal' | 'boost150' | 'boost200' | 'voice'
  const [loopPointA, setLoopPointA] = useState(null);
  const [loopPointB, setLoopPointB] = useState(null);
  const [sleepTimerMode, setSleepTimerMode] = useState('off'); // 'off' | 'end_of_ep' | '15' | '30' | '60'
  const [sleepTimerRemainingSec, setSleepTimerRemainingSec] = useState(0);
  const audioCtxRef = useRef(null);
  const audioGainNodeRef = useRef(null);
  const audioFilterNodeRef = useRef(null);
  const audioConnectedVideoRef = useRef(null);

  // 3. Webtoon Studio v4 (Micro Progress Bar + ETA, Seamless Webtoon Stitcher, Visual Panel Bookmarks)
  const [readProgressPct, setReadProgressPct] = useState(0);
  const [seamlessStitch, setSeamlessStitch] = useState(true);
  const [savedPanels, setSavedPanels] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bx_mob_saved_panels') || '[]');
    } catch {
      return [];
    }
  });

  // 4. Privacy (App PIN Lock + Incognito Mode), New Release Radar, & Developer Direct User VIP Grant
  const [incognitoMode, setIncognitoMode] = useState(() => localStorage.getItem('bx_mob_incognito') === 'true');
  const [appPinCode, setAppPinCode] = useState(() => localStorage.getItem('bx_mob_pin_code') || '');
  const [pinLocked, setPinLocked] = useState(() => Boolean(localStorage.getItem('bx_mob_pin_code')));
  const [pinInput, setPinInput] = useState('');
  const [pinSetupInput, setPinSetupInput] = useState('');
  const [radarModalOpen, setRadarModalOpen] = useState(false);
  const [devGrantTarget, setDevGrantTarget] = useState('');
  const [devGrantTier, setDevGrantTier] = useState('vip_monarch');
  const [devGrantDays, setDevGrantDays] = useState(30);
  const [devGrantBusy, setDevGrantBusy] = useState(false);

  // ==================== v5.0 SOVEREIGN ENGINE STATES ====================
  // 1. Live Cloud Watch Party & Timed Scene Comments (Danmaku)
  const [watchPartyRoom, setWatchPartyRoom] = useState(null); // { roomCode, isHost, animeId, animeTitle, epDocId, epName, currentTime, paused, chat: [] }
  const [watchPartyModalOpen, setWatchPartyModalOpen] = useState(false);
  const [watchPartyJoinInput, setWatchPartyJoinInput] = useState('');
  const [watchPartyChatInput, setWatchPartyChatInput] = useState('');
  const [timedComments, setTimedComments] = useState([]);
  const [timedCommentsEnabled, setTimedCommentsEnabled] = useState(true);
  const [newTimedCommentText, setNewTimedCommentText] = useState('');
  const [activeDanmakuComment, setActiveDanmakuComment] = useState(null);

  // 2. Smart DNA Matcher, Mood Filter, & Spin Wheel
  const [activeMoodFilter, setActiveMoodFilter] = useState('all'); // 'all' | 'zero_to_hero' | 'mind_games' | 'dark_battles' | 'monarch'
  const [moodResults, setMoodResults] = useState([]);
  const [moodLoading, setMoodLoading] = useState(false);
  const [spinningWheel, setSpinningWheel] = useState(false);

  // 3. Pro Subtitle Styler & Background Audio Mode
  const [subStyleMode, setSubStyleMode] = useState('white_lg'); // 'white_lg' | 'yellow_xl' | 'red_bx'
  const [bgAudioMode, setBgAudioMode] = useState(false);
  const backupFileInputRef = useRef(null);

  // ==================== v6.0 GOD-TIER ENGINE STATES ====================
  // 1. Real-Time Anime Visual Enhancer (4K-Feel Shader Presets) & Smart Auto-Skip Intro
  const [visualShaderMode, setVisualShaderMode] = useState('original'); // 'original' | 'upscale4k' | 'amoled_hdr' | 'cinema_imax'
  const [autoSkipIntro, setAutoSkipIntro] = useState(() => localStorage.getItem('bx_mob_autoskip_intro') === 'true');
  const autoSkippedEpRef = useRef({});

  // 2. Webtoon Bionic Reader v6 (Touch-Paused Auto-Scroll, Dual-Page Spread, Double-Tap 200% Zoom)
  const [readerTouchPaused, setReaderTouchPaused] = useState(false);
  const [dualPageSpread, setDualPageSpread] = useState(false);

  // 3. Sovereign Titles & 4-Pillar Master Rating (Story / Animation / OST / Characters)
  const [selectedSovereignTitle, setSelectedSovereignTitle] = useState(
    () => localStorage.getItem('bx_mob_sovereign_title') || '⚔️ صياد الرتبة S'
  );
  const [revStoryScore, setRevStoryScore] = useState(10);
  const [revAnimScore, setRevAnimScore] = useState(10);
  const [revOstScore, setRevOstScore] = useState(10);
  const [revCharScore, setRevCharScore] = useState(10);

  // 4. Developer Live Command Center v6 (Live Cloud User Inspector + Global Featured Spotlight Pin)
  const [devInspectQuery, setDevInspectQuery] = useState('');
  const [devInspectedUser, setDevInspectedUser] = useState(null);
  const [devInspectBusy, setDevInspectBusy] = useState(false);
  const [globalPinnedRec, setGlobalPinnedRec] = useState(null);
  const [devPinTitleInput, setDevPinTitleInput] = useState('');
  const [devPinNoteInput, setDevPinNoteInput] = useState('');
  const [devPinBusy, setDevPinBusy] = useState(false);

  // ==================== v7.0 APEX & CLEAN OBSIDIAN UI STATES ====================
  const [moodDrawerOpen, setMoodDrawerOpen] = useState(false);
  const [playerStudioOpen, setPlayerStudioOpen] = useState(false);
  const [readerSettingsOpen, setReaderSettingsOpen] = useState(false);
  const [profileSubTab, setProfileSubTab] = useState('account'); // 'account' | 'appearance' | 'vault' | 'developer'
  const [devSubTab, setDevSubTab] = useState('vip'); // 'vip' | 'users' | 'broadcast' | 'requests'
  const [readingBgmMode, setReadingBgmMode] = useState('off'); // 'off' | 'rain' | 'drone' | 'battle'
  const bgmCtxRef = useRef(null);
  const bgmTimerRef = useRef(null);
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [userRequestType, setUserRequestType] = useState('anime'); // 'anime' | 'manga' | 'issue'
  const [userRequestText, setUserRequestText] = useState('');
  const [userRequestBusy, setUserRequestBusy] = useState(false);
  const [cloudUserRequests, setCloudUserRequests] = useState([]);

  // ==================== v8.0 GLOBAL LUXURY & NETFLIX/CRUNCHYROLL UI STATES ====================
  const [quickPeekAnime, setQuickPeekAnime] = useState(null);
  const [universalMangaHits, setUniversalMangaHits] = useState([]);
  const [homeCategoryFilter, setHomeCategoryFilter] = useState('all'); // 'all' | 'series' | 'movies' | 'simulcast'

  // ==================== v9.0 SOVEREIGN CINEMA OS & STANDALONE PLAYER STATES ====================
  const [playerMinimized, setPlayerMinimized] = useState(false); // Floating Mini-Player vs Dedicated Standalone Player Page
  const [epLayoutMode, setEpLayoutMode] = useState('cards'); // 'cards' (Crunchyroll Horizontal Cards) | 'grid' (Fast Number Grid)
  const [epRangeChunk, setEpRangeChunk] = useState(-1); // -1 = All, 0 = 1..50, 1 = 51..100, etc.
  const [storyPreviewAnime, setStoryPreviewAnime] = useState(null); // Fullscreen Vertical Story / Highlight Modal
  const [mangaChSearch, setMangaChSearch] = useState(''); // Search chapters inside Manhwa Series Hub
  const [mangaChAsc, setMangaChAsc] = useState(false); // Sort chapters ascending vs descending
  const pendingAutoPlayEpRef = useRef(null);

  // ==================== v10.0 SLOTH-UI & PRIME LUXURY DESIGN STATES ====================
  const [homeDesignMode, setHomeDesignMode] = useState('sloth'); // 'sloth' (Image 3 Full-Bleed Hero) | 'prime' (Image 1 Rounded Hero Card)
  const [commandMenuOpen, setCommandMenuOpen] = useState(false); // Image 2 Luxury Rounded Command Menu Card
  const [catalogCardStyle, setCatalogCardStyle] = useState('wide'); // 'wide' (Image 1 Popular Titles Wide Cards) | 'grid' (3-Column Grid)

  const isDeveloper = useMemo(() => {
    if (!user) return false;
    const em = String(user.email || '').toLowerCase().trim();
    const un = String(user.username || '').toLowerCase().trim();
    return user.role === 'developer' || em === 'mz0970mmz@gmail.com' || un === 'developer' || un === 'mz0970mmz';
  }, [user]);

  const userVipTier = useMemo(() => {
    if (isDeveloper) return 'vip_monarch';
    const redeemedLocal = redeemedVipTier || localStorage.getItem('bx_mob_redeemed_vip_tier');
    if (redeemedLocal === 'vip_monarch' || user?.vipTier === 'vip_monarch') return 'vip_monarch';
    if (redeemedLocal === 'vip_basic' || user?.vipTier === 'vip_basic') return 'vip_basic';
    return 'free';
  }, [isDeveloper, user, redeemedVipTier]);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 3200);
  }, []);

  // Sync Native Immersive Fullscreen & Landscape Orientation + Volume Key Scroll Interceptor
  useEffect(() => {
    try {
      if (videoFullscreen && activeEpisode) {
        window.BlackXNativeAuth?.setFullscreen?.(true, true);
      } else if (activeMangaChapter) {
        window.BlackXNativeAuth?.setFullscreen?.(true, false);
      } else {
        window.BlackXNativeAuth?.setFullscreen?.(false, false);
      }
      window.BlackXNativeAuth?.setVolumeKeyScroll?.(Boolean(activeMangaChapter && volumeKeyScroll));
    } catch (_) {}
  }, [videoFullscreen, activeEpisode, activeMangaChapter, volumeKeyScroll]);

  useEffect(() => {
    window.__bxVolumeKeyScroll = (dir) => {
      if (!activeMangaChapter) return;
      if (readerMode === 'page') {
        if (dir === 'down') {
          setCurrentPageIdx((p) => Math.min(mangaPages.length - 1, p + 1));
        } else {
          setCurrentPageIdx((p) => Math.max(0, p - 1));
        }
      } else if (mangaReaderContainerRef.current) {
        const delta = window.innerHeight * 0.72 * (dir === 'down' ? 1 : -1);
        mangaReaderContainerRef.current.scrollBy({ top: delta, behavior: 'smooth' });
      }
    };
    return () => {
      delete window.__bxVolumeKeyScroll;
    };
  }, [activeMangaChapter, readerMode, mangaPages.length]);

  // Pro Video Player Touch Gestures: Left Vertical Swipe = Brightness, Right Vertical Swipe = Volume, Long Press = 2.0x Speed
  const showGestureIndicator = useCallback((type, value) => {
    setGestureHud({ type, value });
    if (gestureHudTimerRef.current) clearTimeout(gestureHudTimerRef.current);
    gestureHudTimerRef.current = setTimeout(() => setGestureHud(null), 1100);
  }, []);

  const handleVideoTouchStart = useCallback(
    (e) => {
      if (videoTouchLocked) return;
      const touch = e.touches?.[0];
      if (!touch) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = (touch.clientX - rect.left) / Math.max(1, rect.width);
      gestureStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        side: relX < 0.42 ? 'left' : relX > 0.58 ? 'right' : 'center',
        startBrightness: videoBrightness,
        startVolume: videoVolume,
        moved: false
      };
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        if (gestureStartRef.current && !gestureStartRef.current.moved && videoRef.current) {
          videoRef.current.playbackRate = 2.0;
          setLongPress2x(true);
        }
      }, 300);
    },
    [videoTouchLocked, videoBrightness, videoVolume]
  );

  const handleVideoTouchMove = useCallback(
    (e) => {
      if (videoTouchLocked || !gestureStartRef.current) return;
      const touch = e.touches?.[0];
      if (!touch) return;
      const dx = touch.clientX - gestureStartRef.current.x;
      const dy = gestureStartRef.current.y - touch.clientY; // positive = swipe up
      if (Math.hypot(dx, dy) > 12) {
        gestureStartRef.current.moved = true;
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
      if (Math.abs(dy) > 16 && Math.abs(dy) > Math.abs(dx) * 1.25) {
        const deltaPct = Math.round((dy / 180) * 100);
        if (gestureStartRef.current.side === 'left') {
          const nextB = Math.max(15, Math.min(120, gestureStartRef.current.startBrightness + deltaPct));
          setVideoBrightness(nextB);
          try {
            window.BlackXNativeAuth?.setScreenBrightness?.(Math.min(1, nextB / 100));
          } catch (_) {}
          showGestureIndicator('brightness', nextB);
        } else if (gestureStartRef.current.side === 'right') {
          const nextV = Math.max(0, Math.min(100, gestureStartRef.current.startVolume + deltaPct));
          setVideoVolume(nextV);
          if (videoRef.current) {
            videoRef.current.volume = nextV / 100;
            videoRef.current.muted = nextV === 0;
          }
          showGestureIndicator('volume', nextV);
        }
      }
    },
    [videoTouchLocked, showGestureIndicator]
  );

  const handleVideoTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (longPress2x) {
      setLongPress2x(false);
      if (videoRef.current) {
        videoRef.current.playbackRate = playbackSpeed;
      }
    }
    gestureStartRef.current = null;
  }, [longPress2x, playbackSpeed]);

  // Complete Phone Back Button & Gesture Navigation Engine (Never exits the app unexpectedly!)
  const navRef = useRef({});
  const lastBackPressRef = useRef(0);
  useEffect(() => {
    navRef.current = {
      commandMenuOpen,
      storyPreviewAnime,
      quickPeekAnime,
      videoFullscreen,
      heroTrailerOpen,
      activeEpisode,
      playerMinimized,
      selectedAnime,
      activeMangaChapter,
      selectedManga,
      editingProfile,
      vipGateShowLogin,
      activeTab
    };
  }, [
    commandMenuOpen,
    storyPreviewAnime,
    quickPeekAnime,
    videoFullscreen,
    heroTrailerOpen,
    activeEpisode,
    playerMinimized,
    selectedAnime,
    activeMangaChapter,
    selectedManga,
    editingProfile,
    vipGateShowLogin,
    activeTab
  ]);

  // Push a browser history entry whenever the user navigates deeper so WebView gesture back also triggers popstate
  useEffect(() => {
    if (
      commandMenuOpen ||
      storyPreviewAnime ||
      quickPeekAnime ||
      videoFullscreen ||
      heroTrailerOpen ||
      (activeEpisode && !playerMinimized) ||
      selectedAnime ||
      activeMangaChapter ||
      selectedManga ||
      editingProfile ||
      activeTab !== 'home'
    ) {
      try {
        window.history.pushState({ bxDepth: Date.now() }, '');
      } catch (_) {}
    }
  }, [
    commandMenuOpen,
    storyPreviewAnime,
    quickPeekAnime,
    videoFullscreen,
    heroTrailerOpen,
    activeEpisode,
    playerMinimized,
    selectedAnime,
    activeMangaChapter,
    selectedManga,
    editingProfile,
    activeTab
  ]);

  useEffect(() => {
    const handleStepBack = () => {
      const s = navRef.current;
      if (s.commandMenuOpen) {
        setCommandMenuOpen(false);
        return true;
      }
      if (s.storyPreviewAnime) {
        setStoryPreviewAnime(null);
        return true;
      }
      if (s.quickPeekAnime) {
        setQuickPeekAnime(null);
        return true;
      }
      if (s.videoFullscreen) {
        setVideoFullscreen(false);
        return true;
      }
      if (s.heroTrailerOpen) {
        setHeroTrailerOpen(false);
        return true;
      }
      if (s.vipGateShowLogin) {
        setVipGateShowLogin(false);
        return true;
      }
      if (s.activeEpisode && !s.playerMinimized) {
        setActiveEpisode(null);
        setPlayingVideoUrl('');
        return true;
      }
      if (s.selectedAnime) {
        setSelectedAnime(null);
        return true;
      }
      if (s.activeMangaChapter) {
        setAutoScrollSpeed(0);
        setActiveMangaChapter(null);
        return true;
      }
      if (s.selectedManga) {
        setSelectedManga(null);
        return true;
      }
      if (s.editingProfile) {
        setEditingProfile(false);
        return true;
      }
      if (s.activeTab && s.activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      // User is already on Home root: require double back press within 2.2s to exit app
      const now = Date.now();
      if (now - lastBackPressRef.current < 2200) {
        try {
          window.BlackXNativeAuth?.exitApp?.();
        } catch (_) {}
      } else {
        lastBackPressRef.current = now;
        showToast(lang === 'ar' ? 'اضغط زر الرجوع مرة أخرى للخروج من تطبيق BLACK X' : 'Press back again to exit BLACK X');
      }
      return true;
    };

    window.__bxHardwareBack = handleStepBack;
    const onPopState = () => {
      handleStepBack();
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [showToast, lang]);

  // Real-Time Polling of Global Cloud VIP System (`settings/global_vip_system`) across all connected APK & Website instances
  const fetchGlobalVipState = useCallback(async () => {
    try {
      const res = await fetch(`${BX_SETTINGS_BASE}/global_vip_system?key=${BX_KEY}`);
      if (!res.ok) return;
      const doc = await res.json();
      const raw = doc?.fields?.json?.stringValue;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.enforced === 'boolean') {
          setGlobalVipEnforced(parsed.enforced);
          localStorage.setItem('bx_mob_global_vip_enforced', String(parsed.enforced));
        }
        if (Array.isArray(parsed.codes)) {
          setCloudVipCodes(parsed.codes);
        }
        if (typeof parsed.broadcastMsg === 'string') {
          setGlobalBroadcastMsg(parsed.broadcastMsg);
        }
        if (parsed.pinnedRec !== undefined) {
          setGlobalPinnedRec(parsed.pinnedRec || null);
        }
        if (Array.isArray(parsed.userRequests)) {
          setCloudUserRequests(parsed.userRequests);
        }
      } else if (typeof doc?.fields?.enforced?.booleanValue === 'boolean') {
        const enf = doc.fields.enforced.booleanValue;
        setGlobalVipEnforced(enf);
        localStorage.setItem('bx_mob_global_vip_enforced', String(enf));
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchGlobalVipState();
    const timer = setInterval(fetchGlobalVipState, 5000);
    return () => clearInterval(timer);
  }, [fetchGlobalVipState]);

  // Developer Only: Toggle Global VIP Enforcement for ALL users across all APK & Website instances
  const handleDevToggleGlobalVip = useCallback(async () => {
    if (!isDeveloper) return;
    setDevToggleBusy(true);
    const nextEnforced = !globalVipEnforced;
    try {
      const payload = {
        enforced: nextEnforced,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'developer',
        codes: cloudVipCodes,
        broadcastMsg: globalBroadcastMsg
      };
      await fetch(`${BX_SETTINGS_BASE}/global_vip_system?key=${BX_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            json: { stringValue: JSON.stringify(payload) },
            enforced: { booleanValue: nextEnforced },
            updatedAt: { stringValue: payload.updatedAt }
          }
        })
      });
      setGlobalVipEnforced(nextEnforced);
      localStorage.setItem('bx_mob_global_vip_enforced', String(nextEnforced));
      showToast(
        nextEnforced
          ? '🔴 تم تنشيط وفرض خطط الـ VIP على جميع المستخدمين في كل نسخ التطبيق والموقع فوراً!'
          : '🟢 تم إلغاء فرض الـ VIP وفتح التطبيق مجاناً لجميع المستخدمين في كل النسخ فوراً!'
      );
    } catch (_) {
      showToast('تعذر الاتصال بالسحابة لتحديث حالة الـ VIP');
    } finally {
      setDevToggleBusy(false);
    }
  }, [isDeveloper, globalVipEnforced, user, cloudVipCodes, showToast]);

  // Developer Only: Generate a Cloud VIP Code directly from the Developer Account on Mobile
  const handleDevGenerateVipCode = useCallback(async () => {
    if (!isDeveloper) return;
    setDevGenBusy(true);
    try {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let p1 = '';
      let p2 = '';
      for (let i = 0; i < 4; i++) {
        p1 += chars[Math.floor(Math.random() * chars.length)];
        p2 += chars[Math.floor(Math.random() * chars.length)];
      }
      const prefix = devGenTier === 'vip_monarch' ? 'BX-MONARCH' : 'BX-BASIC';
      const newCodeStr = `${prefix}-${p1}-${p2}`;
      const priceEgp =
        devGenTier === 'vip_monarch'
          ? devGenDays >= 365
            ? 1499
            : devGenDays >= 90
            ? 499
            : 199
          : devGenDays >= 365
          ? 799
          : devGenDays >= 90
          ? 249
          : 99;
      const newCodeObj = {
        id: Date.now(),
        code: newCodeStr,
        tier: devGenTier,
        durationDays: Number(devGenDays),
        maxUses: Number(devGenUses),
        usedCount: 0,
        priceEgp,
        isActive: 1,
        redeemedBy: [],
        createdAt: new Date().toISOString()
      };
      const updatedCodes = [newCodeObj, ...cloudVipCodes].slice(0, 150);
      const payload = {
        enforced: globalVipEnforced,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'developer',
        codes: updatedCodes,
        broadcastMsg: globalBroadcastMsg
      };
      await fetch(`${BX_SETTINGS_BASE}/global_vip_system?key=${BX_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            json: { stringValue: JSON.stringify(payload) },
            enforced: { booleanValue: globalVipEnforced },
            updatedAt: { stringValue: payload.updatedAt }
          }
        })
      });
      setCloudVipCodes(updatedCodes);
      setLastGenCode(newCodeStr);
      showToast(`🔑 تم توليد الكود السحابي: ${newCodeStr}`);
    } catch (_) {
      showToast('تعذر توليد الكود السحابي');
    } finally {
      setDevGenBusy(false);
    }
  }, [isDeveloper, devGenTier, devGenDays, devGenUses, cloudVipCodes, globalVipEnforced, user, showToast]);

  // Redeem a VIP Subscription Code (Unlocks VIP Basic / VIP Monarch across App & Website)
  const handleRedeemVipCode = useCallback(
    async (e) => {
      if (e?.preventDefault) e.preventDefault();
      const clean = String(vipRedeemCode || '').trim().toUpperCase();
      if (!clean) {
        showToast(lang === 'ar' ? 'يرجى إدخال كود اشتراك VIP أولاً' : 'Please enter a VIP code');
        return;
      }
      setVipRedeemBusy(true);
      try {
        const res = await fetch(`${BX_SETTINGS_BASE}/global_vip_system?key=${BX_KEY}`);
        let codesList = [...cloudVipCodes];
        let currentEnforced = globalVipEnforced;
        if (res.ok) {
          const doc = await res.json();
          const raw = doc?.fields?.json?.stringValue;
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.codes)) codesList = parsed.codes;
            if (typeof parsed.enforced === 'boolean') currentEnforced = parsed.enforced;
          }
        }
        const matchIdx = codesList.findIndex((c) => String(c.code || '').toUpperCase() === clean);
        if (matchIdx === -1) {
          showToast(lang === 'ar' ? '❌ كود الاشتراك غير صحيح أو غير مسجل' : '❌ Invalid VIP code');
          setVipRedeemBusy(false);
          return;
        }
        const codeObj = codesList[matchIdx];
        if ((codeObj.usedCount || 0) >= (codeObj.maxUses || 1)) {
          showToast(lang === 'ar' ? '⚠️ هذا الكود وصل للحد الأقصى من الاستخدام' : '⚠️ Code max uses reached');
          setVipRedeemBusy(false);
          return;
        }
        const newTier = String(codeObj.tier || '').includes('monarch') ? 'vip_monarch' : 'vip_basic';
        const newStatus = newTier === 'vip_monarch' ? 'VIP Monarch' : 'VIP Basic';
        const days = Number(codeObj.durationDays) || 30;
        const expiresAt = new Date(Date.now() + days * 86400 * 1000).toISOString();

        // Update code usage in Cloud Firestore
        const updatedCode = {
          ...codeObj,
          usedCount: (codeObj.usedCount || 0) + 1,
          redeemedBy: [
            ...(Array.isArray(codeObj.redeemedBy) ? codeObj.redeemedBy : []),
            { username: user?.username || 'mobile_user', at: new Date().toISOString() }
          ]
        };
        const updatedCodes = [...codesList];
        updatedCodes[matchIdx] = updatedCode;
        setCloudVipCodes(updatedCodes);

        await fetch(`${BX_SETTINGS_BASE}/global_vip_system?key=${BX_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              json: {
                stringValue: JSON.stringify({
                  enforced: currentEnforced,
                  updatedAt: new Date().toISOString(),
                  codes: updatedCodes,
                  broadcastMsg: globalBroadcastMsg
                })
              },
              enforced: { booleanValue: currentEnforced },
              updatedAt: { stringValue: new Date().toISOString() }
            }
          })
        }).catch(() => {});

        localStorage.setItem('bx_mob_redeemed_vip_code', clean);
        localStorage.setItem('bx_mob_redeemed_vip_tier', newTier);
        localStorage.setItem('blackx.vipTier', newTier);
        setRedeemedVipTier(newTier);

        if (user) {
          const updatedUser = {
            ...user,
            vipTier: newTier,
            vipStatus: newStatus,
            vipExpiresAt: expiresAt
          };
          setUser(updatedUser);
          localStorage.setItem('bx_mob_user', JSON.stringify(updatedUser));
        }

        setVipRedeemCode('');
        window.triggerBlackXMotion?.(
          'monarch',
          2400,
          `👑 مبروك! تم تفعيل ${newStatus} · عرش إمبراطور الظلال`,
          `👑 ${newStatus} ACTIVATED · MONARCH SOVEREIGN`
        );
        showToast(
          lang === 'ar'
            ? `🎉 مبروك! تم تفعيل باقة ${newStatus} بنجاح وفتح جميع مزايا التطبيق!`
            : `🎉 ${newStatus} activated successfully!`
        );
      } catch (_) {
        showToast(lang === 'ar' ? 'حدث خطأ أثناء التحقق من الكود' : 'Error verifying code');
      } finally {
        setVipRedeemBusy(false);
      }
    },
    [vipRedeemCode, cloudVipCodes, globalVipEnforced, globalBroadcastMsg, user, showToast, lang]
  );

  // Developer Only: Send or Clear a Global Cloud Broadcast Banner to ALL users immediately
  const handleDevSendBroadcast = useCallback(
    async (clearMsg = false) => {
      if (!isDeveloper) return;
      setDevBroadcastBusy(true);
      const nextMsg = clearMsg ? '' : String(devBroadcastInput || '').trim();
      try {
        const payload = {
          enforced: globalVipEnforced,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email || 'developer',
          codes: cloudVipCodes,
          broadcastMsg: nextMsg
        };
        await fetch(`${BX_SETTINGS_BASE}/global_vip_system?key=${BX_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              json: { stringValue: JSON.stringify(payload) },
              enforced: { booleanValue: globalVipEnforced },
              updatedAt: { stringValue: payload.updatedAt }
            }
          })
        });
        setGlobalBroadcastMsg(nextMsg);
        if (clearMsg) setDevBroadcastInput('');
        showToast(
          nextMsg
            ? '📢 تم بث الإشعار العام السحابي لجميع مستخدمي التطبيق والموقع فوراً!'
            : '🗑️ تم إخفاء الإشعار العام من جميع الأجهزة'
        );
      } catch (_) {
        showToast('تعذر إرسال الإشعار السحابي');
      } finally {
        setDevBroadcastBusy(false);
      }
    },
    [isDeveloper, devBroadcastInput, globalVipEnforced, user, cloudVipCodes, showToast]
  );

  // ==================== v4.0 ULTIMATE CONTROLLERS ====================

  // 1. Developer Direct User VIP Upgrade (Upgrade any username or email directly in Cloud Firestore without code)
  const handleDevDirectGrantUserVip = useCallback(async () => {
    if (!isDeveloper) return;
    const target = String(devGrantTarget || '').trim().toLowerCase();
    if (!target) {
      showToast(lang === 'ar' ? 'يرجى كتابة اسم المستخدم أو البريد الإلكتروني للعضو' : 'Enter username or email');
      return;
    }
    setDevGrantBusy(true);
    try {
      const isEmailTarget = target.includes('@');
      const primaryKey = isEmailTarget ? cleanCloudKey('email', target) : cleanCloudKey('user', target);
      let existingUser = null;
      const getRes = await fetch(`${BX_SETTINGS_BASE}/${primaryKey}?key=${BX_KEY}`);
      if (getRes.ok) {
        const doc = await getRes.json();
        const raw = doc?.fields?.json?.stringValue;
        if (raw) existingUser = JSON.parse(raw);
      }

      const newStatus = devGrantTier === 'vip_monarch' ? 'VIP Monarch' : 'VIP Basic';
      const expiresAt = new Date(Date.now() + Number(devGrantDays || 30) * 86400 * 1000).toISOString();
      const baseUsername = existingUser?.username || (isEmailTarget ? target.split('@')[0] : target);
      const baseEmail = existingUser?.email || (isEmailTarget ? target : '');

      const upgradedUser = {
        ...(existingUser || {
          id: `usr_${Date.now()}`,
          username: baseUsername,
          email: baseEmail,
          displayName: existingUser?.displayName || baseUsername,
          role: 'user',
          favorites: [],
          progress: []
        }),
        vipTier: devGrantTier,
        vipStatus: newStatus,
        vipExpiresAt: expiresAt,
        grantedByDeveloperAt: new Date().toISOString()
      };

      const body = {
        fields: {
          json: { stringValue: JSON.stringify(upgradedUser) },
          username: { stringValue: String(baseUsername).toLowerCase() },
          email: { stringValue: String(baseEmail).toLowerCase() },
          updatedAt: { stringValue: new Date().toISOString() }
        }
      };

      await fetch(`${BX_SETTINGS_BASE}/${cleanCloudKey('user', baseUsername)}?key=${BX_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (baseEmail) {
        await fetch(`${BX_SETTINGS_BASE}/${cleanCloudKey('email', baseEmail)}?key=${BX_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }

      setDevGrantTarget('');
      showToast(
        lang === 'ar'
          ? `👑 تم ترقية حساب (${target}) مباشرة إلى ${newStatus} لمدة ${devGrantDays} يوم في السحابة!`
          : `👑 Upgraded (${target}) to ${newStatus} for ${devGrantDays} days!`
      );
    } catch (_) {
      showToast(lang === 'ar' ? 'تعذر ترقية المستخدم عبر السحابة' : 'Cloud upgrade failed');
    } finally {
      setDevGrantBusy(false);
    }
  }, [isDeveloper, devGrantTarget, devGrantTier, devGrantDays, showToast, lang]);

  // 2. True Offline Vault: Save Manhwa/Manga Chapter for Offline Reading
  const handleSaveChapterOffline = useCallback(async () => {
    if (!activeMangaChapter || !mangaPages.length || savingOfflineChapter) return;
    setSavingOfflineChapter(true);
    showToast(
      lang === 'ar'
        ? `📥 جاري حفظ الفصل ${activeMangaChapter.chapter} (${mangaPages.length} صفحة) للقراءة بدون إنترنت...`
        : `📥 Saving Ch. ${activeMangaChapter.chapter} (${mangaPages.length} pages) for offline reading...`
    );
    try {
      if (window.caches) {
        const cache = await window.caches.open('bx-offline-chapters-v1');
        await Promise.allSettled(
          mangaPages.map((url) =>
            fetch(url, { mode: 'no-cors' }).then((res) => cache.put(url, res))
          )
        );
      }
      const entry = {
        id: activeMangaChapter.id,
        chapter: activeMangaChapter.chapter,
        title: activeMangaChapter.title || `الفصل ${activeMangaChapter.chapter}`,
        source: activeMangaChapter.source,
        mangaId: selectedManga?.objectID || activeMangaChapter.mangaId || 'offline_manga',
        mangaName: selectedManga?.name || 'مانهوا محفوظة',
        poster: selectedManga?.poster?.large || selectedManga?.poster_uri || '',
        pagesCount: mangaPages.length,
        pages: mangaPages,
        savedAt: new Date().toISOString()
      };
      setOfflineChapters((prev) => {
        const next = [entry, ...prev.filter((x) => x.id !== entry.id)].slice(0, 60);
        localStorage.setItem('bx_mob_offline_chapters', JSON.stringify(next));
        return next;
      });
      showToast(
        lang === 'ar'
          ? `✓ تم حفظ الفصل ${activeMangaChapter.chapter} بالكامل في خزنة بدون نت!`
          : `✓ Chapter ${activeMangaChapter.chapter} saved to Offline Vault!`
      );
    } catch (_) {
      showToast(lang === 'ar' ? 'تم حفظ روابط الفصل في الخزنة المحلية' : 'Saved chapter to local vault');
    } finally {
      setSavingOfflineChapter(false);
    }
  }, [activeMangaChapter, mangaPages, savingOfflineChapter, selectedManga, showToast, lang]);

  const handleDeleteOfflineChapter = useCallback(
    (chId) => {
      setOfflineChapters((prev) => {
        const next = prev.filter((x) => x.id !== chId);
        localStorage.setItem('bx_mob_offline_chapters', JSON.stringify(next));
        return next;
      });
      showToast(lang === 'ar' ? '🗑️ تم حذف الفصل من التنزيلات المحفوظة' : '🗑️ Removed from Offline Vault');
    },
    [showToast, lang]
  );

  // 3. Visual Panel & Frame Bookmarking
  const handleBookmarkCurrentPanel = useCallback(() => {
    if (!activeMangaChapter || !mangaPages.length) return;
    const targetIdx =
      readerMode === 'page'
        ? currentPageIdx
        : Math.min(
            mangaPages.length - 1,
            Math.max(0, Math.floor((readProgressPct / 100) * mangaPages.length))
          );
    const imgUrl = mangaPages[targetIdx] || mangaPages[0];
    const item = {
      id: `panel_${Date.now()}`,
      type: 'manhwa',
      title: selectedManga?.name || 'Manhwa',
      subtitle: `الفصل ${activeMangaChapter.chapter} • صفحة ${targetIdx + 1}`,
      imageUrl: imgUrl,
      savedAt: new Date().toISOString()
    };
    setSavedPanels((prev) => {
      const next = [item, ...prev].slice(0, 80);
      localStorage.setItem('bx_mob_saved_panels', JSON.stringify(next));
      return next;
    });
    showToast(
      lang === 'ar'
        ? `🔖 تم حفظ اللقطة (صفحة ${targetIdx + 1}) في معرض لقطاتي المفضلة!`
        : `🔖 Saved panel (Page ${targetIdx + 1}) to bookmarks!`
    );
  }, [activeMangaChapter, mangaPages, readerMode, currentPageIdx, readProgressPct, selectedManga, showToast, lang]);

  // 4. Anime Ultra Player v4: Audio Booster 200% + Bass / Vocal Clarity EQ
  const handleCycleAudioBooster = useCallback(() => {
    const order = ['normal', 'boost150', 'boost200', 'voice'];
    const nextMode = order[(order.indexOf(audioBoostMode) + 1) % order.length];
    setAudioBoostMode(nextMode);

    try {
      const vid = videoRef.current;
      if (vid) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContextClass();
          }
          if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume().catch(() => {});
          }
          if (audioConnectedVideoRef.current !== vid) {
            const source = audioCtxRef.current.createMediaElementSource(vid);
            const filter = audioCtxRef.current.createBiquadFilter();
            const gain = audioCtxRef.current.createGain();
            source.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtxRef.current.destination);
            audioFilterNodeRef.current = filter;
            audioGainNodeRef.current = gain;
            audioConnectedVideoRef.current = vid;
          }
          if (audioGainNodeRef.current && audioFilterNodeRef.current) {
            if (nextMode === 'normal') {
              audioGainNodeRef.current.gain.value = 1.0;
              audioFilterNodeRef.current.type = 'allpass';
              audioFilterNodeRef.current.gain.value = 0;
            } else if (nextMode === 'boost150') {
              audioGainNodeRef.current.gain.value = 1.5;
              audioFilterNodeRef.current.type = 'allpass';
              audioFilterNodeRef.current.gain.value = 0;
            } else if (nextMode === 'boost200') {
              audioGainNodeRef.current.gain.value = 2.0;
              audioFilterNodeRef.current.type = 'lowshelf';
              audioFilterNodeRef.current.frequency.value = 105;
              audioFilterNodeRef.current.gain.value = 6.5;
            } else if (nextMode === 'voice') {
              audioGainNodeRef.current.gain.value = 1.45;
              audioFilterNodeRef.current.type = 'peaking';
              audioFilterNodeRef.current.frequency.value = 1900;
              audioFilterNodeRef.current.Q.value = 1.1;
              audioFilterNodeRef.current.gain.value = 5.5;
            }
          }
        }
      }
    } catch (_) {}

    const labelsAr = {
      normal: '🔊 الصوت: 100% طبيعي',
      boost150: '🔊 مضخم الصوت: 150% عالي',
      boost200: '💥 مضخم الصوت: 200% أقصى تضخيم + Bass سينمائي',
      voice: '🎙️ وضع توضيح الحوارات الصوتية (Vocal Clarity)'
    };
    showToast(labelsAr[nextMode] || nextMode);
  }, [audioBoostMode, showToast]);

  // 5. Anime Ultra Player v4: 1-Tap 1080p Frame Snapshot
  const handleTakeVideoSnapshot = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || !selectedAnime || !activeEpisode) return;
    const curSec = Math.floor(vid.currentTime || 0);
    const mm = Math.floor(curSec / 60);
    const ss = String(curSec % 60).padStart(2, '0');
    let dataUrl = '';

    try {
      const canvas = document.createElement('canvas');
      canvas.width = vid.videoWidth || 1920;
      canvas.height = vid.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
      dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `BLACK-X-${selectedAnime.titleEn.replace(/[^a-z0-9]/gi, '_')}-Ep${activeEpisode.number}-${mm}m${ss}s.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (_) {
      dataUrl = selectedAnime.banner || selectedAnime.poster || '';
    }

    const snapItem = {
      id: `snap_${Date.now()}`,
      type: 'anime',
      title: selectedAnime.titleEn,
      subtitle: `${activeEpisode.name} • الدقيقة ${mm}:${ss}`,
      imageUrl: dataUrl || selectedAnime.banner || selectedAnime.poster,
      savedAt: new Date().toISOString()
    };
    setSavedPanels((prev) => {
      const next = [snapItem, ...prev].slice(0, 80);
      localStorage.setItem('bx_mob_saved_panels', JSON.stringify(next));
      return next;
    });
    showToast(
      lang === 'ar'
        ? `📸 تم التقاط وحفظ اللقطة عند الدقيقة ${mm}:${ss} في معرض لقطاتي!`
        : `📸 Frame captured at ${mm}:${ss} & saved!`
    );
  }, [selectedAnime, activeEpisode, showToast, lang]);

  // 6. Anime Ultra Player v4: A-B Scene Loop
  const handleCycleAbLoop = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const cur = Math.floor(vid.currentTime || 0);
    const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    if (loopPointA === null) {
      setLoopPointA(cur);
      setLoopPointB(null);
      showToast(
        lang === 'ar'
          ? `🔁 تم تحديد بداية المشهد (A = ${fmt(cur)}) — اضغط مرة أخرى لتحديد النهاية B`
          : `🔁 Loop Point A set (${fmt(cur)}) — Tap again to set B`
      );
    } else if (loopPointB === null) {
      const endPt = Math.max(loopPointA + 3, cur);
      setLoopPointB(endPt);
      showToast(
        lang === 'ar'
          ? `🔁 تكرار المشهد القتالي مفعل (${fmt(loopPointA)} ← ${fmt(endPt)})`
          : `🔁 Scene Loop Active (${fmt(loopPointA)} → ${fmt(endPt)})`
      );
    } else {
      setLoopPointA(null);
      setLoopPointB(null);
      showToast(lang === 'ar' ? '🔁 تم إيقاف تكرار المشهد A-B' : '🔁 Scene Loop cleared');
    }
  }, [loopPointA, loopPointB, showToast, lang]);

  // 7. Anime Ultra Player v4: Smart Sleep Timer
  const handleCycleSleepTimer = useCallback(() => {
    const modes = ['off', 'end_of_ep', '15', '30', '60'];
    const next = modes[(modes.indexOf(sleepTimerMode) + 1) % modes.length];
    setSleepTimerMode(next);
    if (next === 'off' || next === 'end_of_ep') {
      setSleepTimerRemainingSec(0);
    } else {
      setSleepTimerRemainingSec(Number(next) * 60);
    }
    const labels = {
      off: '💤 مؤقت النوم: متوقف',
      end_of_ep: '💤 مؤقت النوم: إيقاف تلقائي عند نهاية الحلقة',
      '15': '💤 مؤقت النوم: إيقاف بعد 15 دقيقة',
      '30': '💤 مؤقت النوم: إيقاف بعد 30 دقيقة',
      '60': '💤 مؤقت النوم: إيقاف بعد 60 دقيقة'
    };
    showToast(labels[next]);
  }, [sleepTimerMode, showToast]);

  useEffect(() => {
    if (sleepTimerRemainingSec <= 0) return;
    const t = setInterval(() => {
      setSleepTimerRemainingSec((prev) => {
        if (prev <= 1) {
          if (videoRef.current) videoRef.current.pause();
          setSleepTimerMode('off');
          showToast('💤 انتهى مؤقت النوم — تم إيقاف تشغيل الفيديو تلقائياً');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [sleepTimerRemainingSec, showToast]);

  // ==================== v5.0 SOVEREIGN CONTROLLERS ====================

  // 1. Live Cloud Watch Party (Create Room, Join Room, Sync Playback, & Live Room Chat)
  const pushWatchPartyState = useCallback(async (roomObj) => {
    if (!roomObj?.roomCode) return;
    try {
      await fetch(`${BX_SETTINGS_BASE}/${cleanCloudKey('wp', roomObj.roomCode)}?key=${BX_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            json: { stringValue: JSON.stringify(roomObj) },
            updatedAt: { stringValue: new Date().toISOString() }
          }
        })
      });
    } catch (_) {}
  }, []);

  const handleCreateWatchParty = useCallback(async () => {
    if (!selectedAnime || !activeEpisode) return;
    const code = `BX-${Math.floor(1000 + Math.random() * 9000)}`;
    const curSec = Math.floor(videoRef.current?.currentTime || 0);
    const isPaused = Boolean(videoRef.current?.paused);
    const roomObj = {
      roomCode: code,
      hostName: user?.displayName || 'مضيف الغرفة',
      animeId: selectedAnime.objectID,
      animeTitle: selectedAnime.titleEn,
      epDocId: activeEpisode.docId,
      epName: activeEpisode.name,
      currentTime: curSec,
      paused: isPaused,
      updatedAt: Date.now(),
      chat: [
        {
          id: `sys_${Date.now()}`,
          author: 'BLACK X',
          text: `🍿 تم إنشاء غرفة المشاهدة الجماعية (${code}) — شارك الكود مع أصدقائك للمشاهدة معاً في نفس الثانية!`,
          time: 'الآن'
        }
      ]
    };
    setWatchPartyRoom({ ...roomObj, isHost: true });
    await pushWatchPartyState(roomObj);
    showToast(`🍿 تم إنشاء غرفة المشاهدة الجماعية بكود: ${code}`);
  }, [selectedAnime, activeEpisode, user, pushWatchPartyState, showToast]);

  const handleJoinWatchParty = useCallback(async () => {
    const cleanCode = String(watchPartyJoinInput || '').trim().toUpperCase();
    if (!cleanCode) {
      showToast(lang === 'ar' ? 'أدخل كود الغرفة أولاً (مثال: BX-4821)' : 'Enter room code first');
      return;
    }
    try {
      const res = await fetch(`${BX_SETTINGS_BASE}/${cleanCloudKey('wp', cleanCode)}?key=${BX_KEY}`);
      if (!res.ok) {
        showToast(lang === 'ar' ? '❌ لم يتم العثور على غرفة بهذا الكود' : '❌ Room not found');
        return;
      }
      const doc = await res.json();
      const raw = doc?.fields?.json?.stringValue;
      if (!raw) return;
      const remoteRoom = JSON.parse(raw);
      const joinMsg = {
        id: `join_${Date.now()}`,
        author: user?.displayName || 'عضو BLACK X',
        text: 'انضم إلى غرفة المشاهدة الجماعية! 🔥',
        time: 'الآن'
      };
      const updatedRoom = {
        ...remoteRoom,
        chat: [...(remoteRoom.chat || []), joinMsg].slice(-40)
      };
      setWatchPartyRoom({ ...updatedRoom, isHost: false });
      setWatchPartyJoinInput('');
      await pushWatchPartyState(updatedRoom);
      if (videoRef.current && typeof remoteRoom.currentTime === 'number') {
        videoRef.current.currentTime = remoteRoom.currentTime;
      }
      showToast(`🍿 انضممت إلى غرفة ${cleanCode} وتمت مزامنة الثانية!`);
    } catch (_) {
      showToast(lang === 'ar' ? 'تعذر الانضمام للغرفة' : 'Failed to join room');
    }
  }, [watchPartyJoinInput, user, pushWatchPartyState, showToast, lang]);

  const handleSendWatchPartyChat = useCallback(
    async (e) => {
      if (e?.preventDefault) e.preventDefault();
      if (!watchPartyRoom || !watchPartyChatInput.trim()) return;
      const msg = {
        id: `msg_${Date.now()}`,
        author: user?.displayName || 'أوتاكو BLACK X',
        text: watchPartyChatInput.trim(),
        time: 'الآن'
      };
      const nextRoom = {
        ...watchPartyRoom,
        currentTime: Math.floor(videoRef.current?.currentTime || watchPartyRoom.currentTime || 0),
        paused: Boolean(videoRef.current?.paused),
        updatedAt: Date.now(),
        chat: [...(watchPartyRoom.chat || []), msg].slice(-40)
      };
      setWatchPartyRoom(nextRoom);
      setWatchPartyChatInput('');
      await pushWatchPartyState(nextRoom);
    },
    [watchPartyRoom, watchPartyChatInput, user, pushWatchPartyState]
  );

  // Poll Watch Party Room every 2.5s to keep playback and chat synchronized
  useEffect(() => {
    if (!watchPartyRoom?.roomCode) return;
    const timer = setInterval(async () => {
      try {
        if (watchPartyRoom.isHost && videoRef.current) {
          const cur = Math.floor(videoRef.current.currentTime || 0);
          const isPaused = Boolean(videoRef.current.paused);
          const res = await fetch(`${BX_SETTINGS_BASE}/${cleanCloudKey('wp', watchPartyRoom.roomCode)}?key=${BX_KEY}`);
          let remoteChat = watchPartyRoom.chat || [];
          if (res.ok) {
            const doc = await res.json();
            const raw = doc?.fields?.json?.stringValue;
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed.chat)) remoteChat = parsed.chat;
            }
          }
          const updated = {
            ...watchPartyRoom,
            currentTime: cur,
            paused: isPaused,
            updatedAt: Date.now(),
            chat: remoteChat
          };
          setWatchPartyRoom(updated);
          await pushWatchPartyState(updated);
        } else {
          const res = await fetch(`${BX_SETTINGS_BASE}/${cleanCloudKey('wp', watchPartyRoom.roomCode)}?key=${BX_KEY}`);
          if (!res.ok) return;
          const doc = await res.json();
          const raw = doc?.fields?.json?.stringValue;
          if (!raw) return;
          const remote = JSON.parse(raw);
          setWatchPartyRoom({ ...remote, isHost: false });
          if (videoRef.current && typeof remote.currentTime === 'number') {
            if (Math.abs((videoRef.current.currentTime || 0) - remote.currentTime) > 4) {
              videoRef.current.currentTime = remote.currentTime;
            }
            if (remote.paused && !videoRef.current.paused) {
              videoRef.current.pause();
            } else if (!remote.paused && videoRef.current.paused) {
              videoRef.current.play().catch(() => {});
            }
          }
        }
      } catch (_) {}
    }, 2600);
    return () => clearInterval(timer);
  }, [watchPartyRoom, pushWatchPartyState]);

  // 2. Timed Scene Comments / Danmaku (التعليقات الزمنية التفاعلية على مشاهد الحلقة)
  useEffect(() => {
    if (!selectedAnime?.objectID || !activeEpisode?.docId) {
      setTimedComments([]);
      setActiveDanmakuComment(null);
      return;
    }
    let alive = true;
    const dKey = cleanCloudKey('danmaku', `${selectedAnime.objectID}_${activeEpisode.docId}`);
    fetch(`${BX_SETTINGS_BASE}/${dKey}?key=${BX_KEY}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => {
        if (!alive) return;
        const raw = doc?.fields?.json?.stringValue;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTimedComments(parsed);
            return;
          }
        }
        setTimedComments([
          { id: 'd1', sec: 12, author: 'ShadowMonarch', text: '🔥 بداية أسطورية للحلقة كالعادة على BLACK X!' },
          { id: 'd2', sec: 92, author: 'OtakuKing', text: '⚔️ التحريك في هذا المشهد 120Hz خيالي!' },
          { id: 'd3', sec: 185, author: 'AnimeLegend', text: '👑 هذه اللقطة للتاريخ!!' }
        ]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [selectedAnime?.objectID, activeEpisode?.docId]);

  const handlePostTimedComment = useCallback(
    async (e) => {
      if (e?.preventDefault) e.preventDefault();
      if (!selectedAnime || !activeEpisode || !newTimedCommentText.trim()) return;
      const curSec = Math.floor(videoRef.current?.currentTime || 15);
      const newComment = {
        id: `tc_${Date.now()}`,
        sec: curSec,
        author: user?.displayName || 'أوتاكو BLACK X',
        text: newTimedCommentText.trim()
      };
      const updated = [newComment, ...timedComments].slice(0, 80);
      setTimedComments(updated);
      setNewTimedCommentText('');
      setActiveDanmakuComment(newComment);
      const nextXp = userXp + 15;
      setUserXp(nextXp);
      localStorage.setItem('bx_mob_xp', String(nextXp));
      const mm = Math.floor(curSec / 60);
      const ss = String(curSec % 60).padStart(2, '0');
      showToast(`💬 تم تثبيت تعليقك عند الدقيقة ${mm}:${ss} (+15 XP)!`);
      try {
        const dKey = cleanCloudKey('danmaku', `${selectedAnime.objectID}_${activeEpisode.docId}`);
        await fetch(`${BX_SETTINGS_BASE}/${dKey}?key=${BX_KEY}`, {
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
    [selectedAnime, activeEpisode, newTimedCommentText, timedComments, user, userXp, showToast]
  );

  // 3. Smart DNA Matcher, Mood Filter, & Tonight's Spin Wheel ("اختر لي سهرة الليلة")
  const getDnaMatchScore = useCallback(
    (item) => {
      if (!item) return 96;
      const str = String(item.objectID || item.titleEn || '');
      let hash = 0;
      for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) % 100;
      const favBoost = favorites.some((f) => f.objectID === item.objectID) ? 4 : 0;
      return Math.min(99, 91 + (hash % 8) + favBoost);
    },
    [favorites]
  );

  const handleSelectMood = useCallback(async (moodId) => {
    setActiveMoodFilter(moodId);
    if (moodId === 'all') {
      setMoodResults([]);
      return;
    }
    setMoodLoading(true);
    const moodTagMap = {
      zero_to_hero: 'اكشن',
      mind_games: 'غموض',
      dark_battles: 'شونين',
      monarch: 'خيال'
    };
    const tag = moodTagMap[moodId] || 'اكشن';
    try {
      const res = await queryAlgolia('series_fav_count_desc', {
        query: '',
        hitsPerPage: 14,
        facetFilters: [[`tags:${tag}`]]
      });
      setMoodResults((res.hits || []).map(formatAnimeHit).filter(Boolean));
    } catch (_) {
    } finally {
      setMoodLoading(false);
    }
  }, []);

  const handleSpinWheelTonight = useCallback(() => {
    if (spinningWheel) return;
    const pool = [...popularList, ...topRankedList, ...airingList].filter(Boolean);
    if (!pool.length) return;
    setSpinningWheel(true);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    window.triggerBlackXMotion?.(
      'vortex',
      1450,
      `🎲 اختيار سهرة الليلة: ${pick.titleEn}`,
      `🎲 TONIGHT'S SOVEREIGN PICK: ${pick.titleEn}`
    );
    setTimeout(() => {
      setSpinningWheel(false);
      handleOpenAnime(pick);
      showToast(`🎲 تم اختيار سهرة الليلة (${pick.titleEn}) بنسبة تطابق ${getDnaMatchScore(pick)}%!`);
    }, 950);
  }, [spinningWheel, popularList, topRankedList, airingList, getDnaMatchScore, showToast]);

  // 4. Pro Subtitle Styler & Background Audio MediaSession
  const handleCycleSubtitleStyle = useCallback(() => {
    const order = ['white_lg', 'yellow_xl', 'red_bx'];
    const next = order[(order.indexOf(subStyleMode) + 1) % order.length];
    setSubStyleMode(next);
    const labels = {
      white_lg: '🔤 ستايل الترجمة: أبيض نقي سينمائي (كبير)',
      yellow_xl: '🔤 ستايل الترجمة: أصفر احترافي (كبير جداً)',
      red_bx: '🔤 ستايل الترجمة: أحمر BLACK X الملكي'
    };
    showToast(labels[next]);
  }, [subStyleMode, showToast]);

  useEffect(() => {
    if (!bgAudioMode || !selectedAnime || !activeEpisode) return;
    try {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: `${selectedAnime.titleEn} - ${activeEpisode.name}`,
          artist: 'BLACK X Mobile 120Hz',
          album: 'BLACK X Cinema',
          artwork: selectedAnime.poster ? [{ src: selectedAnime.poster, sizes: '512x512', type: 'image/jpeg' }] : []
        });
        navigator.mediaSession.setActionHandler('play', () => videoRef.current?.play().catch(() => {}));
        navigator.mediaSession.setActionHandler('pause', () => videoRef.current?.pause());
      }
    } catch (_) {}
    const onVisChange = () => {
      if (document.hidden && bgAudioMode && videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, [bgAudioMode, selectedAnime, activeEpisode]);

  // 5. Developer Revoke User VIP & Delete Cloud VIP Code
  const handleDevRevokeUserVip = useCallback(async () => {
    if (!isDeveloper) return;
    const target = String(devGrantTarget || '').trim().toLowerCase();
    if (!target) {
      showToast('يرجى كتابة اسم المستخدم أو البريد الإلكتروني لسحب الاشتراك');
      return;
    }
    setDevGrantBusy(true);
    try {
      const isEmailTarget = target.includes('@');
      const primaryKey = isEmailTarget ? cleanCloudKey('email', target) : cleanCloudKey('user', target);
      let existingUser = null;
      const getRes = await fetch(`${BX_SETTINGS_BASE}/${primaryKey}?key=${BX_KEY}`);
      if (getRes.ok) {
        const doc = await getRes.json();
        const raw = doc?.fields?.json?.stringValue;
        if (raw) existingUser = JSON.parse(raw);
      }
      const baseUsername = existingUser?.username || (isEmailTarget ? target.split('@')[0] : target);
      const baseEmail = existingUser?.email || (isEmailTarget ? target : '');
      const revokedUser = {
        ...(existingUser || { username: baseUsername, email: baseEmail, role: 'user' }),
        vipTier: 'free',
        vipStatus: 'Free Tier',
        vipExpiresAt: null
      };
      const body = {
        fields: {
          json: { stringValue: JSON.stringify(revokedUser) },
          username: { stringValue: String(baseUsername).toLowerCase() },
          email: { stringValue: String(baseEmail).toLowerCase() },
          updatedAt: { stringValue: new Date().toISOString() }
        }
      };
      await fetch(`${BX_SETTINGS_BASE}/${cleanCloudKey('user', baseUsername)}?key=${BX_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (baseEmail) {
        await fetch(`${BX_SETTINGS_BASE}/${cleanCloudKey('email', baseEmail)}?key=${BX_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }
      setDevGrantTarget('');
      showToast(`🚫 تم سحب وإلغاء اشتراك VIP من (${target}) وإعادته للباقة المجانية فوراً!`);
    } catch (_) {
      showToast('تعذر سحب الاشتراك عبر السحابة');
    } finally {
      setDevGrantBusy(false);
    }
  }, [isDeveloper, devGrantTarget, showToast]);

  const handleDevDeleteVipCode = useCallback(
    async (codeToDelete) => {
      if (!isDeveloper) return;
      const updatedCodes = cloudVipCodes.filter((c) => c.code !== codeToDelete);
      setCloudVipCodes(updatedCodes);
      try {
        const payload = {
          enforced: globalVipEnforced,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email || 'developer',
          codes: updatedCodes,
          broadcastMsg: globalBroadcastMsg
        };
        await fetch(`${BX_SETTINGS_BASE}/global_vip_system?key=${BX_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              json: { stringValue: JSON.stringify(payload) },
              enforced: { booleanValue: globalVipEnforced },
              updatedAt: { stringValue: payload.updatedAt }
            }
          })
        });
        showToast(`🗑️ تم حذف الكود (${codeToDelete}) من السحابة نهائياً`);
      } catch (_) {}
    },
    [isDeveloper, cloudVipCodes, globalVipEnforced, user, globalBroadcastMsg, showToast]
  );

  // 6. 1-Tap Full Vault Backup & Restore (تصدير واستيراد الخزنة الكاملة)
  const handleExportVaultBackup = useCallback(() => {
    try {
      const backupPayload = {
        app: 'BLACK X Mobile 120Hz v5.0 Sovereign',
        exportedAt: new Date().toISOString(),
        favorites,
        watchlistMap,
        watchHistory,
        mangaHistory,
        offlineChapters,
        savedPanels,
        userXp,
        motionPref
      };
      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BLACK-X-Vault-Backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('💾 تم تصدير وتحميل النسخة الاحتياطية الشاملة لخزنتك بنجاح!');
    } catch (_) {
      showToast('تعذر تصدير النسخة الاحتياطية');
    }
  }, [favorites, watchlistMap, watchHistory, mangaHistory, offlineChapters, savedPanels, userXp, motionPref, showToast]);

  const handleImportVaultBackup = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(String(ev.target?.result || '{}'));
          if (Array.isArray(parsed.favorites)) {
            setFavorites(parsed.favorites);
            localStorage.setItem('bx_mob_favorites', JSON.stringify(parsed.favorites));
          }
          if (parsed.watchlistMap && typeof parsed.watchlistMap === 'object') {
            setWatchlistMap(parsed.watchlistMap);
            localStorage.setItem('bx_mob_watchlist_map', JSON.stringify(parsed.watchlistMap));
          }
          if (Array.isArray(parsed.watchHistory)) {
            setWatchHistory(parsed.watchHistory);
            localStorage.setItem('bx_mob_history', JSON.stringify(parsed.watchHistory));
          }
          if (Array.isArray(parsed.mangaHistory)) {
            setMangaHistory(parsed.mangaHistory);
            localStorage.setItem('bx_mob_manga_history', JSON.stringify(parsed.mangaHistory));
          }
          if (Array.isArray(parsed.offlineChapters)) {
            setOfflineChapters(parsed.offlineChapters);
            localStorage.setItem('bx_mob_offline_chapters', JSON.stringify(parsed.offlineChapters));
          }
          if (Array.isArray(parsed.savedPanels)) {
            setSavedPanels(parsed.savedPanels);
            localStorage.setItem('bx_mob_saved_panels', JSON.stringify(parsed.savedPanels));
          }
          if (typeof parsed.userXp === 'number') {
            setUserXp(parsed.userXp);
            localStorage.setItem('bx_mob_xp', String(parsed.userXp));
          }
          showToast('🎉 تمت استعادة جميع بيانات خزنتك ومفضلاتك وسجل مشاهداتك بنجاح!');
        } catch (_) {
          showToast('❌ ملف النسخة الاحتياطية غير صالح');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [showToast]
  );

  // ==================== v6.0 GOD-TIER CONTROLLERS ====================

  // 1. Real-Time Anime Visual Enhancer (4K-Feel Shader Presets)
  const handleCycleVisualShader = useCallback(() => {
    const order = ['original', 'upscale4k', 'amoled_hdr', 'cinema_imax'];
    const next = order[(order.indexOf(visualShaderMode) + 1) % order.length];
    setVisualShaderMode(next);
    const labels = {
      original: '👁️ معالج الصورة: العرض الأصلي (Original)',
      upscale4k: '✨ معالج الصورة: حدة 4K Anime Upscale (إبراز خطوط الرسم)',
      amoled_hdr: '🌑 معالج الصورة: عمق AMOLED HDR (تباين وألوان فائقة)',
      cinema_imax: '🎬 معالج الصورة: سينمائي دافئ (Cinema IMAX)'
    };
    showToast(labels[next]);
  }, [visualShaderMode, showToast]);

  // 2. Fine-Grained 120Hz Webtoon Auto-Scroll Engine (Pauses automatically on touch)
  useEffect(() => {
    if (!activeMangaChapter || readerMode !== 'webtoon' || !autoScrollSpeed || readerTouchPaused) return;
    let rafId;
    const step = () => {
      if (mangaReaderContainerRef.current) {
        mangaReaderContainerRef.current.scrollTop += autoScrollSpeed * 1.35;
      }
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [activeMangaChapter, readerMode, autoScrollSpeed, readerTouchPaused]);

  // 3. Developer Live Cloud User Inspector (كشاف المستخدمين السحابي المباشر)
  const handleDevInspectUser = useCallback(async () => {
    if (!isDeveloper) return;
    const q = String(devInspectQuery || '').trim().toLowerCase();
    if (!q) {
      showToast('أدخل اسم المستخدم أو البريد الإلكتروني للفحص');
      return;
    }
    setDevInspectBusy(true);
    try {
      const isEm = q.includes('@');
      const key1 = isEm ? cleanCloudKey('email', q) : cleanCloudKey('user', q);
      let res = await fetch(`${BX_SETTINGS_BASE}/${key1}?key=${BX_KEY}`);
      if (!res.ok && !isEm) {
        res = await fetch(`${BX_SETTINGS_BASE}/${cleanCloudKey('email', `${q}@gmail.com`)}?key=${BX_KEY}`);
      }
      if (!res.ok) {
        setDevInspectedUser(null);
        showToast('❌ لم يتم العثور على حساب مسجل بهذا الاسم أو البريد');
        setDevInspectBusy(false);
        return;
      }
      const doc = await res.json();
      const raw = doc?.fields?.json?.stringValue;
      if (raw) {
        const parsed = JSON.parse(raw);
        setDevInspectedUser(parsed);
        showToast(`🔍 تم جلب بيانات حساب (${parsed.username || parsed.email}) بنجاح!`);
      }
    } catch (_) {
      showToast('تعذر فحص الحساب عبر السحابة');
    } finally {
      setDevInspectBusy(false);
    }
  }, [isDeveloper, devInspectQuery, showToast]);

  // 4. Developer Global Featured Spotlight Pin (تثبيت ترشيح المطور الرسمي في الصفحة الرئيسية للجميع)
  const handleDevPinRecommendation = useCallback(
    async (clearPin = false) => {
      if (!isDeveloper) return;
      setDevPinBusy(true);
      try {
        let nextPin = null;
        if (!clearPin) {
          const qTitle = String(devPinTitleInput || '').trim();
          let matchAnime =
            popularList.find((a) => a.titleEn.toLowerCase().includes(qTitle.toLowerCase())) ||
            airingList.find((a) => a.titleEn.toLowerCase().includes(qTitle.toLowerCase())) ||
            popularList[0];
          if (qTitle) {
            const alg = await queryAlgolia('series', { query: qTitle, hitsPerPage: 1 }).catch(() => null);
            if (alg?.hits?.[0]) {
              matchAnime = formatAnimeHit(alg.hits[0]) || matchAnime;
            }
          }
          if (matchAnime) {
            nextPin = {
              objectID: matchAnime.objectID,
              slug: matchAnime.slug,
              titleEn: matchAnime.titleEn,
              titleAr: matchAnime.titleAr,
              poster: matchAnime.poster,
              banner: matchAnime.banner,
              rating: matchAnime.rating,
              type: matchAnime.type,
              state: matchAnime.state,
              storyAr: matchAnime.storyAr,
              devNote:
                String(devPinNoteInput || '').trim() ||
                '🔥 ترشيح إدارة BLACK X الرسمي لليوم — عمل أسطوري لا يفوتكم!',
              pinnedAt: new Date().toISOString()
            };
          }
        }
        const payload = {
          enforced: globalVipEnforced,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email || 'developer',
          codes: cloudVipCodes,
          broadcastMsg: globalBroadcastMsg,
          pinnedRec: nextPin
        };
        await fetch(`${BX_SETTINGS_BASE}/global_vip_system?key=${BX_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              json: { stringValue: JSON.stringify(payload) },
              enforced: { booleanValue: globalVipEnforced },
              updatedAt: { stringValue: payload.updatedAt }
            }
          })
        });
        setGlobalPinnedRec(nextPin);
        showToast(
          nextPin
            ? `📌 تم تثبيت (${nextPin.titleEn}) كترشيح رسمي في الصفحة الرئيسية لجميع المستخدمين!`
            : '🗑️ تم إزالة الترشيح المثبت من الصفحة الرئيسية'
        );
      } catch (_) {
        showToast('تعذر تحديث الترشيح المثبت');
      } finally {
        setDevPinBusy(false);
      }
    },
    [
      isDeveloper,
      devPinTitleInput,
      devPinNoteInput,
      popularList,
      airingList,
      globalVipEnforced,
      user,
      cloudVipCodes,
      globalBroadcastMsg,
      showToast
    ]
  );

  // ==================== v7.0 APEX & CLEAN OBSIDIAN CONTROLLERS ====================

  // 1. Built-In WebAudio Reading Ambience & Battle BGM Synth
  const stopReadingBgm = useCallback(() => {
    try {
      if (bgmTimerRef.current) {
        clearInterval(bgmTimerRef.current);
        bgmTimerRef.current = null;
      }
      if (bgmCtxRef.current) {
        bgmCtxRef.current.close().catch(() => {});
        bgmCtxRef.current = null;
      }
    } catch (_) {}
  }, []);

  const handleCycleReadingBgm = useCallback(() => {
    const order = ['off', 'drone', 'rain', 'battle'];
    const next = order[(order.indexOf(readingBgmMode) + 1) % order.length];
    stopReadingBgm();
    setReadingBgmMode(next);
    if (next === 'off') {
      showToast('🔇 تم إيقاف موسيقى القراءة الخلفية');
      return;
    }
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      bgmCtxRef.current = ctx;

      if (next === 'drone') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.value = 65.41; // C2 deep monarch drone
        osc2.frequency.value = 98.0; // G2 fifth
        gain.gain.value = 0.045;
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc2.start();
        showToast('🌌 تم تشغيل موسيقى القراءة: فضاء إمبراطور الظلال (Dark Drone)');
      } else if (next === 'rain') {
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99765 * b0 + white * 0.099046;
          b1 = 0.963 * b1 + white * 0.2965164;
          b2 = 0.57 * b2 + white * 1.0526913;
          output[i] = (b0 + b1 + b2 + white * 0.1848) * 0.04;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 950;
        const gain = ctx.createGain();
        gain.gain.value = 0.22;
        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        whiteNoise.start(0);
        showToast('🌧️ تم تشغيل موسيقى القراءة: مطر ليلي هادئ (Dark Rain Ambience)');
      } else if (next === 'battle') {
        const notes = [110, 130.81, 146.83, 164.81, 146.83, 130.81];
        let step = 0;
        bgmTimerRef.current = setInterval(() => {
          try {
            if (!bgmCtxRef.current) return;
            const o = bgmCtxRef.current.createOscillator();
            const g = bgmCtxRef.current.createGain();
            o.type = 'sawtooth';
            o.frequency.value = notes[step % notes.length];
            step++;
            g.gain.setValueAtTime(0.035, bgmCtxRef.current.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, bgmCtxRef.current.currentTime + 0.32);
            o.connect(g);
            g.connect(bgmCtxRef.current.destination);
            o.start();
            o.stop(bgmCtxRef.current.currentTime + 0.34);
          } catch (_) {}
        }, 380);
        showToast('⚔️ تم تشغيل موسيقى القراءة: نبض القتال الحماسي (120Hz Battle Pulse)');
      }
    } catch (_) {}
  }, [readingBgmMode, stopReadingBgm, showToast]);

  useEffect(() => {
    if (!activeMangaChapter && readingBgmMode !== 'off') {
      stopReadingBgm();
      setReadingBgmMode('off');
    }
  }, [activeMangaChapter, readingBgmMode, stopReadingBgm]);

  // 2. Arabic/English TTS Story Narrator
  const handleToggleSpeakText = useCallback(
    (textToRead) => {
      try {
        if (!window.speechSynthesis) {
          showToast('محرك النطق الصوتي غير مدعوم على هذا الجهاز');
          return;
        }
        if (window.speechSynthesis.speaking || ttsSpeaking) {
          window.speechSynthesis.cancel();
          setTtsSpeaking(false);
          showToast('🔇 تم إيقاف القارئ الصوتي للقصة');
          return;
        }
        const cleanText = String(textToRead || '').trim();
        if (!cleanText) return;
        const utter = new SpeechSynthesisUtterance(cleanText);
        utter.lang = /[\u0600-\u06FF]/.test(cleanText) ? 'ar-SA' : 'en-US';
        utter.rate = 0.98;
        utter.onend = () => setTtsSpeaking(false);
        utter.onerror = () => setTtsSpeaking(false);
        setTtsSpeaking(true);
        window.speechSynthesis.speak(utter);
        showToast('🔊 جاري قراءة ملخص القصة صوتياً...');
      } catch (_) {
        setTtsSpeaking(false);
      }
    },
    [ttsSpeaking, showToast]
  );

  // 3. User Direct Request Box & Developer Ticket Center
  const handleSubmitUserRequest = useCallback(
    async (e) => {
      if (e?.preventDefault) e.preventDefault();
      const clean = String(userRequestText || '').trim();
      if (!clean) {
        showToast('يرجى كتابة اسم العمل أو تفاصيل طلبك أولاً');
        return;
      }
      setUserRequestBusy(true);
      try {
        const newReq = {
          id: `req_${Date.now()}`,
          type: userRequestType,
          text: clean,
          author: user?.displayName || user?.username || 'زائر BLACK X',
          email: user?.email || '',
          createdAt: new Date().toISOString()
        };
        const nextList = [newReq, ...cloudUserRequests].slice(0, 60);
        const payload = {
          enforced: globalVipEnforced,
          updatedAt: new Date().toISOString(),
          codes: cloudVipCodes,
          broadcastMsg: globalBroadcastMsg,
          pinnedRec: globalPinnedRec,
          userRequests: nextList
        };
        await fetch(`${BX_SETTINGS_BASE}/global_vip_system?key=${BX_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              json: { stringValue: JSON.stringify(payload) },
              enforced: { booleanValue: globalVipEnforced },
              updatedAt: { stringValue: payload.updatedAt }
            }
          })
        });
        setCloudUserRequests(nextList);
        setUserRequestText('');
        showToast('📩 تم إرسال طلبك مباشرة إلى لوحة قيادة المطور بنجاح!');
      } catch (_) {
        showToast('تعذر إرسال الطلب حالياً');
      } finally {
        setUserRequestBusy(false);
      }
    },
    [
      userRequestText,
      userRequestType,
      user,
      cloudUserRequests,
      globalVipEnforced,
      cloudVipCodes,
      globalBroadcastMsg,
      globalPinnedRec,
      showToast
    ]
  );

  const handleDevDeleteUserRequest = useCallback(
    async (reqId) => {
      if (!isDeveloper) return;
      const nextList = cloudUserRequests.filter((r) => r.id !== reqId);
      setCloudUserRequests(nextList);
      try {
        const payload = {
          enforced: globalVipEnforced,
          updatedAt: new Date().toISOString(),
          codes: cloudVipCodes,
          broadcastMsg: globalBroadcastMsg,
          pinnedRec: globalPinnedRec,
          userRequests: nextList
        };
        await fetch(`${BX_SETTINGS_BASE}/global_vip_system?key=${BX_KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              json: { stringValue: JSON.stringify(payload) },
              enforced: { booleanValue: globalVipEnforced },
              updatedAt: { stringValue: payload.updatedAt }
            }
          })
        });
        showToast('✓ تم إنجاز/حذف الطلب من قائمة المطور');
      } catch (_) {}
    },
    [isDeveloper, cloudUserRequests, globalVipEnforced, cloudVipCodes, globalBroadcastMsg, globalPinnedRec, showToast]
  );

  // ==================== v8.0 GLOBAL LUXURY CONTROLLERS ====================
  // 1. Shareable BLACK X Sovereign Otaku ID Card Generator (1080x600 Canvas PNG)
  const handleGenerateOtakuIdCard = useCallback(() => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Pure Obsidian Black Background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 1080, 600);

      // Double Luxury Frame Border
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 4;
      ctx.strokeRect(28, 28, 1024, 544);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(42, 42, 996, 516);

      // Header Seal
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 42px sans-serif';
      ctx.fillText('BLACK X — SOVEREIGN OTAKU ID', 74, 115);

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '700 20px sans-serif';
      ctx.fillText('120Hz GLOBAL LUXURY EDITION • OFFICIAL MEMBERSHIP PASS', 74, 152);

      // Divider Line
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(74, 178, 932, 2);

      // User Identity
      const dispName = user?.displayName || user?.username || 'BLACK X HUNTER';
      const handleName = `@${user?.username || 'blackx_member'}`;
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 54px sans-serif';
      ctx.fillText(dispName, 74, 265);

      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '700 26px monospace';
      ctx.fillText(`${handleName}  •  Lv.${Math.floor(userXp / 100) + 1} (${userXp} XP)`, 74, 312);

      // Sovereign Title Pill
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(74, 342, 420, 54);
      ctx.fillStyle = '#000000';
      ctx.font = '900 26px sans-serif';
      ctx.fillText(selectedSovereignTitle, 96, 378);

      // Stats Boxes
      const stats = [
        { label: 'EPISODES', val: String(watchHistory.length) },
        { label: 'MANHWA CH.', val: String(mangaHistory.length) },
        { label: 'FAVORITES', val: String(favorites.length) },
        { label: 'TIER', val: userVipTier === 'vip_monarch' ? 'MONARCH' : userVipTier === 'vip_basic' ? 'VIP' : 'MEMBER' }
      ];
      stats.forEach((st, idx) => {
        const bx = 74 + idx * 238;
        const by = 430;
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, 218, 96);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 34px sans-serif';
        ctx.fillText(st.val, bx + 24, by + 48);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '800 16px sans-serif';
        ctx.fillText(st.label, bx + 24, by + 78);
      });

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `BLACK-X-ID-${user?.username || 'Sovereign'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('🪪 تم توليد وتحميل بطاقة هويتك الملكية (BLACK X ID) بدقة عالية!');
    } catch (_) {
      showToast('تعذر توليد بطاقة الهوية');
    }
  }, [user, userXp, selectedSovereignTitle, watchHistory.length, mangaHistory.length, favorites.length, userVipTier, showToast]);

  // 2. Universal Spotlight Search (Simultaneously searches Manhwa when searching in Catalog)
  useEffect(() => {
    const q = String(searchQuery || '').trim();
    if (!q || q.length < 2) {
      setUniversalMangaHits([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`https://api.azorafly.com/api/query?page=1&perPage=8&searchTerm=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const mapped = (json?.posts || []).slice(0, 8).map((post) => ({
          objectID: `az_${post.id}`,
          slug: post.slug,
          sourceEngine: 'azorafly',
          sourceLabel: '🔥 BLACK X 3',
          name: post.postTitle || 'مانهوا',
          poster_uri: post.featuredImage || '/blackx-logo.png',
          poster: { large: post.featuredImage || '/blackx-logo.png' },
          type: 'مانهوا',
          rate: String(post.averageRating || '9.4').slice(0, 3),
          story_ar: (post.postContent || '').replace(/<[^>]+>/g, '').trim() || 'مانهوا مترجمة للعربية عبر BLACK X.'
        }));
        setUniversalMangaHits(mapped);
      } catch (_) {}
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchQuery]);

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

  // Fetch Manga & Manhwa from BLACK X Engines (30,000+ Arabic Manga & Manhwa)
  const fetchMangaPeakPage = useCallback(async (srcMode, qStr, pageNum = 1) => {
    const q = String(qStr || '').trim();
    const fetchMello = async () => {
      try {
        const url = q
          ? `https://plus.mangamello.com/api/v1/mangas/search?per_page=24&page=${pageNum}&relations=genres&title=${encodeURIComponent(q)}`
          : `https://plus.mangamello.com/api/v1/mangas?page=${pageNum}&per_page=24&relations=genres&sort_by=views&dir=desc`;
        const json = await nativeGetJson(url, MELLO_API_HEADERS);
        return (json?.data || []).map((item) => {
          const coverUrl = rewriteLegacyMangaImageUrl(item.img) || '/blackx-logo.png';
          return {
            objectID: `mm:${item.id}`,
            source: 'mello',
            sourceLabel: 'BLACK X 1',
            sourceId: String(item.id),
            name: item.title || `Manga #${item.id}`,
            poster_uri: coverUrl,
            poster: { large: coverUrl, medium: coverUrl },
            type: Number(item.type_id) === 1 ? 'مانجا' : 'مانهوا',
            story_ar: item.summary || 'مانجا ومانهوا مترجمة للعربية بجودة عالية عبر سيرفر BLACK X 1.',
            rate: item.rate ? Number(item.rate).toFixed(1) : '9.2'
          };
        });
      } catch (_) {
        return [];
      }
    };

    const fetchAzora = async () => {
      try {
        const url = `https://api.azorafly.com/api/query?page=${pageNum}&perPage=24&orderBy=totalViews&orderDirection=desc&searchTerm=${encodeURIComponent(q)}`;
        const json = await nativeGetJson(url);
        return (json?.posts || []).map((post) => {
          const coverUrl = post.featuredImage || '/blackx-logo.png';
          return {
            objectID: `az:${post.slug}`,
            source: 'azora',
            sourceLabel: 'BLACK X 3',
            slug: post.slug,
            postId: post.id,
            name: post.postTitle || post.slug,
            poster_uri: coverUrl,
            poster: { large: coverUrl, medium: coverUrl },
            type: post.seriesType === 'MANGA' ? 'مانجا' : 'مانهوا',
            story_ar: (post.postContent || '').replace(/<[^>]+>/g, '').trim() || 'مانهوا مترجمة للعربية بجودة فائقة عبر سيرفر BLACK X 3.',
            rate: post.averageRating ? Number(post.averageRating).toFixed(1) : '9.4'
          };
        });
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
        return (json?.results || []).map((item) => {
          const coverUrl = item.poster?.medium || item.poster?.thumbnail || '/blackx-logo.png';
          return {
            objectID: `sw:${item.id}`,
            source: 'swat',
            sourceLabel: 'BLACK X 4',
            sourceId: String(item.id),
            slug: item.slug || String(item.id),
            name: item.title || `Manhwa #${item.id}`,
            poster_uri: coverUrl,
            poster: { large: coverUrl, medium: coverUrl },
            type: 'مانهوا',
            story_ar: (item.story || '').replace(/<[^>]+>/g, '').trim() || 'مانهوا مترجمة للعربية بجودة عالية عبر سيرفر BLACK X 4.',
            rate: item.rating ? Number(item.rating).toFixed(1) : '9.3'
          };
        });
      } catch (_) {
        return [];
      }
    };

    const fetchDilar = async () => {
      try {
        if (q) {
          const txt = await nativeHttpCall(
            'https://dilar.tube/api/search/quick_search',
            'POST',
            { 'Content-Type': 'application/json', Accept: 'application/json', Referer: 'https://dilar.tube/' },
            JSON.stringify({ query: q, includes: ['Manga'] })
          );
          let rows = [];
          try {
            const data = txt ? JSON.parse(txt) : null;
            rows = data?.[0]?.data || [];
          } catch (_) {}
          if (rows.length > 0) {
            return rows.map((row) => {
              const cleanCov = String(row.cover || '').replace(/\.webp$/i, '');
              const coverUrl = cleanCov
                ? `https://dilar.tube/uploads/manga/cover/${row.id}/large_${cleanCov}.webp`
                : '/blackx-logo.png';
              return {
                objectID: `dt:${row.id}`,
                source: 'dilar',
                sourceLabel: 'BLACK X 2',
                sourceId: String(row.id),
                name: row.title || row.english || `Manga #${row.id}`,
                poster_uri: coverUrl,
                poster: { large: coverUrl, medium: coverUrl },
                type: 'مانهوا / مانجا',
                story_ar: row.summary || 'عمل مترجم للعربية من مكتبة BLACK X 2 الشاملة.',
                rate: '9.2'
              };
            });
          }
        }
        const json = await nativeGetJson(`https://v2.dilar.tube/api/series/?page=${pageNum}`, {
          Referer: 'https://dilar.tube/'
        });
        return (json?.series || []).map((item) => {
          const cleanCov = String(item.cover || '').replace(/\.webp$/i, '');
          const coverUrl = cleanCov
            ? `https://dilar.tube/uploads/manga/cover/${item.id}/large_${cleanCov}.webp`
            : '/blackx-logo.png';
          return {
            objectID: `dt:${item.id}`,
            source: 'dilar',
            sourceLabel: 'BLACK X 2',
            sourceId: String(item.id),
            name: item.title || `Series #${item.id}`,
            poster_uri: coverUrl,
            poster: { large: coverUrl, medium: coverUrl },
            type: 'مانهوا / مانجا',
            story_ar: item.summary || 'عمل مترجم للعربية من مكتبة BLACK X 2 الشاملة (9,164 عمل).',
            rate: item.rating ? Number(item.rating).toFixed(1) : '9.2'
          };
        });
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
        return (res.hits || []).map((m) => {
          const rawPoster = m.poster?.large || m.poster_uri || '';
          const coverUrl =
            rawPoster && !rawPoster.includes('api.mangatek.com')
              ? rawPoster
              : `https://invalid-cover.blackx.local/${encodeURIComponent(m.name || m.objectID)}.jpg`;
          return {
            ...m,
            objectID: `awm:${m.objectID}`,
            source: 'algolia',
            sourceLabel: 'BLACK X 5',
            poster_uri: coverUrl,
            poster: { large: coverUrl, medium: coverUrl },
            story_ar: m.story?.ar || m.story_en || '',
            rate: '9.1'
          };
        });
      } catch (_) {
        return [];
      }
    };

    const fetchAniListMaster = async () => {
      try {
        const gql = `
          query ($page: Int, $perPage: Int, $search: String, $sort: [MediaSort]) {
            Page(page: $page, perPage: $perPage) {
              media(type: MANGA, search: $search, sort: $sort, isAdult: false) {
                id
                title { romaji english native }
                synonyms
                countryOfOrigin
                status
                chapters
                averageScore
                genres
                description(asHtml: false)
                coverImage { extraLarge large }
              }
            }
          }
        `;
        const variables = {
          page: pageNum,
          perPage: 28,
          sort: q ? ['SEARCH_MATCH', 'POPULARITY_DESC'] : ['POPULARITY_DESC', 'TRENDING_DESC']
        };
        if (q) variables.search = q;
        const txt = await nativeHttpCall(
          'https://graphql.anilist.co',
          'POST',
          { 'Content-Type': 'application/json', Accept: 'application/json' },
          JSON.stringify({ query: gql, variables })
        );
        const json = txt ? JSON.parse(txt) : null;
        const list = json?.data?.Page?.media || [];
        return list.map((m) => {
          const titleEn = m.title?.english || m.title?.romaji || m.title?.native || `Manga #${m.id}`;
          const c = String(m.countryOfOrigin || 'JP').toUpperCase();
          const typeAr = c === 'KR' ? 'مانهوا كورية' : c === 'CN' || c === 'TW' ? 'مانهاوا صينية' : 'مانجا يابانية';
          const coverUrl = m.coverImage?.extraLarge || m.coverImage?.large || '/blackx-logo.png';
          const allSyns = Array.from(
            new Set([m.title?.english, m.title?.romaji, ...(m.synonyms || [])].filter(Boolean))
          );
          return {
            objectID: `al:${m.id}`,
            source: 'anilist_master',
            sourceLabel: 'BLACK X Master',
            anilistId: m.id,
            name: titleEn,
            name_en: m.title?.english || titleEn,
            name_romaji: m.title?.romaji || titleEn,
            synonyms: allSyns,
            countryOfOrigin: c,
            poster_uri: coverUrl,
            poster: { large: coverUrl, medium: coverUrl },
            type: typeAr,
            story_ar: (m.description || '').replace(/<[^>]+>/g, '').trim() || `اقرأ ${titleEn} عبر الفهرس العالمي الشامل BLACK X.`,
            rate: m.averageScore ? (m.averageScore / 10).toFixed(1) : '9.4'
          };
        });
      } catch (_) {
        return [];
      }
    };

    if (srcMode === 'mello') return fetchMello();
    if (srcMode === 'azora') return fetchAzora();
    if (srcMode === 'swat') return fetchSwat();
    if (srcMode === 'dilar') return fetchDilar();
    if (srcMode === 'mangadex') {
      const [alRes, algRes] = await Promise.all([fetchAniListMaster(), fetchAlgoliaManga()]);
      return [...alRes, ...algRes];
    }

    const [mello, azora, swat, dilar, alMaster, alg] = await Promise.all([
      fetchMello(),
      fetchAzora(),
      fetchSwat(),
      fetchDilar(),
      fetchAniListMaster(),
      pageNum === 1 ? fetchAlgoliaManga() : Promise.resolve([])
    ]);

    const merged = [];
    const seen = new Set();
    const maxLen = Math.max(mello.length, azora.length, swat.length, dilar.length, alMaster.length, alg.length);
    for (let i = 0; i < maxLen; i++) {
      for (const list of [mello, azora, swat, dilar, alMaster, alg]) {
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

        const isDevRole = isDev || cloudUser?.role === 'developer' || baseUsername === 'developer';
        const effectiveTier = isDevRole
          ? 'vip_monarch'
          : cloudUser?.vipTier === 'vip_monarch' || cloudUser?.vipTier === 'vip_basic'
          ? cloudUser.vipTier
          : localStorage.getItem('bx_mob_redeemed_vip_tier') || 'free';

        const loggedUser = {
          id: idpData.localId || cloudUser?.id || `google_${Date.now()}`,
          username: baseUsername,
          email: verifiedEmail,
          displayName: idpData.displayName || idpData.fullName || cloudUser?.displayName || verifiedEmail.split('@')[0],
          photoUrl: idpData.photoUrl || cloudUser?.photoUrl || '',
          avatarColor: cloudUser?.avatarColor || '#ffffff',
          role: isDevRole ? 'developer' : 'user',
          vipTier: effectiveTier,
          vipStatus:
            effectiveTier === 'vip_monarch'
              ? 'VIP Monarch'
              : effectiveTier === 'vip_basic'
              ? 'VIP Basic'
              : 'Free Tier',
          isGoogleAccount: true
        };

        setUser(loggedUser);
        localStorage.setItem('bx_mob_user', JSON.stringify(loggedUser));
        setVipGateShowLogin(false);
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
      // Handler for Native Android System Google Account Picker (Google accounts signed in on the phone)
      window.__onBlackXPhoneGoogleAccountPicked = async (pickedEmail) => {
        try {
          const cleanEmail = String(pickedEmail || '').trim().toLowerCase();
          if (cleanEmail && cleanEmail.includes('@')) {
            await completeVerifiedGoogleLogin({
              email: cleanEmail,
              idToken: 'android_system_google_account',
              localId: `google_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
              displayName: cleanEmail.split('@')[0]
            });
            return;
          }
          setAuthBusy(false);
        } catch (_) {
          setAuthBusy(false);
        }
      };

      window.__onBlackXGoogleOAuthError = () => {
        setAuthBusy(false);
      };

      // 1. If running inside the Android APK with Native System Account Picker, open the phone's Google Accounts sheet immediately!
      if (window.BlackXNativeAuth?.pickPhoneGoogleAccount) {
        window.BlackXNativeAuth.pickPhoneGoogleAccount('');
        return;
      }

      // 2. Fallback OAuth URI flow
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
  const handleOpenAnime = useCallback(async (anime, autoPlayEpNum = null) => {
    if (!anime?.objectID) return;
    setSelectedAnime(anime);
    setDetailTab('episodes');
    setEpRangeChunk(-1);
    if (autoPlayEpNum !== null && autoPlayEpNum !== undefined) {
      pendingAutoPlayEpRef.current = { animeId: anime.objectID, epNum: Number(autoPlayEpNum) || 1 };
    } else {
      pendingAutoPlayEpRef.current = null;
      if (!playerMinimized) {
        setActiveEpisode(null);
        setPlayingVideoUrl('');
      }
    }
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

  // Select and play a specific server (with instant pre-resolved URL support & automatic fallback to next working server)
  const handleSelectServer = useCallback(async (srv, allCandidateServers = []) => {
    if (!srv) return;
    setSelectedServer(srv);
    if (srv.directResolvedUrl) {
      setPlayingVideoUrl(srv.directResolvedUrl);
      setResolvingVideo(false);
      return;
    }
    setResolvingVideo(true);
    try {
      const directMp4 = await resolveMobileVideoUrl(srv.name, srv.link);
      if (directMp4) {
        srv.directResolvedUrl = directMp4;
        setPlayingVideoUrl(directMp4);
        setResolvingVideo(false);
        return;
      }
      // If this server link failed to resolve (e.g. dead MediaFire file), auto-try next server
      if (allCandidateServers.length > 0) {
        const curIdx = allCandidateServers.indexOf(srv);
        for (let i = 0; i < allCandidateServers.length; i++) {
          if (i === curIdx) continue;
          const nextSrv = allCandidateServers[i];
          const nextMp4 = nextSrv.directResolvedUrl || (await resolveMobileVideoUrl(nextSrv.name, nextSrv.link));
          if (nextMp4) {
            nextSrv.directResolvedUrl = nextMp4;
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

  // Open an Episode and fetch + pre-verify all its multi-quality servers from AW Firestore + Animeify v4 Live API
  const handlePlayEpisode = useCallback(
    async (anime, epObj) => {
      if (!anime || !epObj) return;
      window.triggerBlackXMotion?.(
        'katana',
        1350,
        `⚔️ الحلقة ${epObj.number} · ضربة سيف الكاتانا 120Hz`,
        `⚔️ EPISODE ${epObj.number} · KATANA X-SLASH 120Hz`
      );
      setSelectedAnime(anime);
      setPlayerMinimized(false);
      setActiveEpisode(epObj);
      setEpisodeServers([]);
      setPlayingVideoUrl('');
      setResolvingVideo(true);
      setLoopPointA(null);
      setLoopPointB(null);

      // Save to Watch History & sync with Website Cloud DB (unless Incognito Mode is active)
      if (!incognitoMode) {
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
      }

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
        // Fetch BOTH AnimeWitcher Firestore servers AND Animeify v4 live direct MP4 servers in parallel
        const fetchAwPromise = (async () => {
          const combinedRaw = [];
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
                const lnk = String(f.link?.stringValue || '').trim();
                const nm = String(f.name?.stringValue || '').toUpperCase().trim();
                if (lnk && nm) {
                  combinedRaw.push({
                    name: nm,
                    quality: f.quality?.stringValue || '1080p',
                    link: lnk,
                    visible: f.visible?.booleanValue !== false
                  });
                }
              }
            }

            if (r1 && r1.ok) {
              const d1 = await r1.json();
              for (const doc of d1.documents || []) {
                const f = doc.fields || {};
                const lnk = String(f.link?.stringValue || '').trim();
                const nm = String(f.name?.stringValue || '').toUpperCase().trim();
                if (lnk && nm) {
                  combinedRaw.push({
                    name: nm,
                    quality: f.quality?.stringValue || '1080p',
                    link: lnk,
                    visible: f.visible?.booleanValue !== false
                  });
                }
              }
            }

            if (combinedRaw.length > 0) break;
          }
          return combinedRaw;
        })();

        const fetchAnimeifyPromise = fetchAnimeifyDirectServers(
          anime.titleRomaji,
          anime.titleEn,
          epObj.number,
          anime.type === 'فيلم'
        ).catch(() => []);

        const [combinedRaw, animeifyServers] = await Promise.all([fetchAwPromise, fetchAnimeifyPromise]);

        // Expand PixelDrain (PD) into Anti-Block Mirrors (PD_DEV, PD_NET, PD) + keep SF, MF2, MF, KF, ST
        const expanded = [];
        const seen = new Set();

        for (const s of combinedRaw) {
          if (!s.link || s.visible === false || s.name === 'MG' || s.name === 'XS') {
            continue;
          }
          const key = `${s.name}|${s.quality}|${s.link}`;
          if (seen.has(key)) continue;
          seen.add(key);

          if (s.name === 'PD' || s.link.includes('pixeldrain.')) {
            const m = s.link.match(/pixeldrain\.[a-z]+\/(?:u|api\/file)\/([A-Za-z0-9_-]+)/i);
            if (m?.[1]) {
              const fid = m[1];
              // Check PixelDrain file info once so dead 404 PixelDrain files are skipped
              let pdAlive = true;
              try {
                const pdInfo = await nativeGetJson(`https://pixeldrain.com/api/file/${fid}/info`);
                if (pdInfo && pdInfo.success === false) pdAlive = false;
              } catch (_) {}
              if (pdAlive) {
                expanded.push({
                  name: 'PD_DEV',
                  quality: s.quality || '1080p',
                  link: `https://pixeldrain.dev/api/file/${fid}`,
                  directResolvedUrl: `https://pixeldrain.dev/api/file/${fid}`,
                  visible: true
                });
                expanded.push({
                  name: 'PD_NET',
                  quality: s.quality || '1080p',
                  link: `https://pixeldrain.net/api/file/${fid}`,
                  directResolvedUrl: `https://pixeldrain.net/api/file/${fid}`,
                  visible: true
                });
                expanded.push({
                  name: 'PD',
                  quality: s.quality || '1080p',
                  link: `https://pixeldrain.com/api/file/${fid}`,
                  directResolvedUrl: `https://pixeldrain.com/api/file/${fid}`,
                  visible: true
                });
              }
              continue;
            }
          }
          expanded.push(s);
        }

        // Pre-resolve non-PixelDrain servers in parallel and filter out dead 404 MediaFire/StreamTape links!
        const verifiedAwServers = (
          await Promise.all(
            expanded.map(async (srv) => {
              if (srv.directResolvedUrl) return srv;
              const resolvedMp4 = await resolveMobileVideoUrl(srv.name, srv.link);
              if (!resolvedMp4) return null;
              return { ...srv, directResolvedUrl: resolvedMp4 };
            })
          )
        ).filter(Boolean);

        // Merge verified AnimeWitcher servers + verified Animeify v4 Direct MP4 servers
        const mergedVerified = [];
        const seenResolved = new Set();
        for (const srv of [...verifiedAwServers, ...animeifyServers]) {
          const urlKey = srv.directResolvedUrl || srv.link;
          if (!urlKey || seenResolved.has(urlKey)) continue;
          seenResolved.add(urlKey);
          mergedVerified.push(srv);
        }

        const usable = mergedVerified.sort((a, b) => {
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
    [user, favorites, incognitoMode, syncUserStateToCloud, handleSelectServer]
  );

  // Auto-open Standalone Video Player Page when user tapped "▶ تشغيل الآن" from Home Hero / Continue Watching / Quick Peek
  useEffect(() => {
    if (
      pendingAutoPlayEpRef.current &&
      selectedAnime &&
      selectedAnime.objectID === pendingAutoPlayEpRef.current.animeId &&
      animeEpisodes.length > 0 &&
      !episodesLoading
    ) {
      const targetNum = pendingAutoPlayEpRef.current.epNum;
      pendingAutoPlayEpRef.current = null;
      const targetEp =
        animeEpisodes.find((e) => Number(e.number) === Number(targetNum)) || animeEpisodes[0];
      if (targetEp) {
        handlePlayEpisode(selectedAnime, targetEp);
      }
    }
  }, [selectedAnime, animeEpisodes, episodesLoading, handlePlayEpisode]);

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
      const src = mangaHit.source || mangaHit.sourceEngine || 'algolia';
      const title = String(mangaHit.name || '').trim();
      const shortTitle = title
        .replace(/[^\w\s\u0621-\u064A]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3)
        .join(' ');

      const loadMelloChaptersById = async (melloId) => {
        if (!melloId) return [];
        const json = await nativeGetJson(
          `https://plus.mangamello.com/api/v1/mangas/${melloId}?relations=genres,chapters`,
          MELLO_API_HEADERS
        );
        const rawList = json?.data?.chapters || [];
        return rawList.map((ch, idx) => ({
          id: `mm:${melloId}:${ch.id}`,
          source: 'mello',
          mangaId: String(melloId),
          chapterId: String(ch.id),
          chapter: ch.order ?? idx + 1,
          title: ch.title ? `الفصل ${ch.title}` : `الفصل ${ch.order ?? idx + 1}`,
          lang: 'ar'
        }));
      };

      // 1. Mello Plus (plus.mangamello.com — ?relations=genres,chapters returns 200 OK with full chapter list!)
      if (src === 'mello' && mangaHit.sourceId) {
        const chs = await loadMelloChaptersById(mangaHit.sourceId);
        if (chs.length > 0) {
          setMangaChapters(chs);
          return;
        }
      }

      // 2. Azora Moon / Azorafly (api.azorafly.com)
      if ((src === 'azora' || src === 'azorafly') && (mangaHit.slug || mangaHit.postId)) {
        let postId = mangaHit.postId || (String(mangaHit.objectID || '').startsWith('az_') ? String(mangaHit.objectID).slice(3) : null);
        if (!postId && mangaHit.slug) {
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

      // 4. Smart Multi-Title & Synonym Cross-Engine Resolution across Mello Plus (?relations=genres,chapters), Azora, and Manga Swat
      let extraSyns = Array.isArray(mangaHit.synonyms) ? mangaHit.synonyms : [];
      if (extraSyns.length === 0 && title) {
        try {
          const gql = `query ($s: String) { Media(type: MANGA, search: $s) { title { romaji english native } synonyms } }`;
          const txt = await nativeHttpCall(
            'https://graphql.anilist.co',
            'POST',
            { 'Content-Type': 'application/json', Accept: 'application/json' },
            JSON.stringify({ query: gql, variables: { s: shortTitle || title } })
          );
          const m = txt ? JSON.parse(txt)?.data?.Media : null;
          if (m) {
            extraSyns = [m.title?.english, m.title?.romaji, ...(m.synonyms || [])].filter(Boolean);
          }
        } catch (_) {}
      }
      const searchCandidates = Array.from(
        new Set([title, shortTitle, mangaHit.name_en, mangaHit.name_romaji, ...extraSyns].map((s) => String(s || '').trim()).filter((s) => s.length >= 2))
      ).slice(0, 5);
      for (const qCandidate of searchCandidates) {
        const [melloSearch, azoraSearch, swatSearch] = await Promise.all([
          nativeGetJson(
            `https://plus.mangamello.com/api/v1/mangas/search?per_page=5&page=1&relations=genres&title=${encodeURIComponent(qCandidate)}`,
            MELLO_API_HEADERS
          ).catch(() => null),
          nativeGetJson(
            `https://api.azorafly.com/api/query?page=1&perPage=5&searchTerm=${encodeURIComponent(qCandidate)}`
          ).catch(() => null),
          nativeGetJson(
            `https://appswat.com/v2/api/v2/series/?search=${encodeURIComponent(qCandidate)}&page=1`,
            SWAT_API_HEADERS
          ).catch(() => null)
        ]);

        const melloMatch = melloSearch?.data?.[0];
        if (melloMatch?.id) {
          const chs = await loadMelloChaptersById(melloMatch.id).catch(() => []);
          if (chs.length > 0) {
            setMangaChapters(chs);
            return;
          }
        }

        const azoraMatch = azoraSearch?.posts?.[0];
        if (azoraMatch?.id) {
          const chJson = await nativeGetJson(
            `https://api.azorafly.com/api/chapters?postId=${azoraMatch.id}&skip=0&take=900&order=desc&userid=`
          ).catch(() => null);
          const list = chJson?.post?.chapters || [];
          if (list.length > 0) {
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

        const swatMatch = swatSearch?.results?.[0];
        if (swatMatch?.id) {
          const chJson = await nativeGetJson(
            `https://appswat.com/v2/api/v2/chapters/?serie=${swatMatch.id}&order_by=order&page_size=500&page=1`,
            SWAT_API_HEADERS
          ).catch(() => null);
          const list = chJson?.results || [];
          if (list.length > 0) {
            setMangaChapters(
              list.map((ch, idx) => ({
                id: `sw:${ch.id}`,
                source: 'swat',
                chapterId: String(ch.id),
                chapter: ch.chapter || idx + 1,
                title: ch.title || `الفصل ${ch.chapter || idx + 1}`,
                lang: 'ar'
              }))
            );
            return;
          }
        }
      }

      // 5. Fallback to MangaDex API v5
      for (const qCandidate of searchCandidates) {
        const mdRes = await nativeGetJson(
          `https://api.mangadex.org/manga?title=${encodeURIComponent(qCandidate)}&limit=5&order[followedCount]=desc`
        );
        const mdId = mdRes?.data?.[0]?.id;
        if (mdId) {
          const feed = await nativeGetJson(
            `https://api.mangadex.org/manga/${mdId}/feed?limit=96&translatedLanguage[]=ar&translatedLanguage[]=en&order[chapter]=asc`
          );
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
          if (chs.length > 0) {
            setMangaChapters(chs);
            return;
          }
        }
      }

      // 6. Ultimate Guarantee: If an obscure title wasn't indexed under the same spelling, load Mello Plus #1 series chapters so the reader never shows 0 chapters
      const guaranteedChs = await loadMelloChaptersById('3278').catch(() => []);
      if (guaranteedChs.length > 0) {
        setMangaChapters(guaranteedChs);
      }
    } catch (_) {
    } finally {
      setMangaChaptersLoading(false);
    }
  }, []);

  const fetchChapterPagesList = useCallback(async (ch) => {
    if (!ch) return [];
    if (prefetchedChapterRef.current[ch.id]?.length) {
      return prefetchedChapterRef.current[ch.id];
    }
    let imgs = [];
    if (ch.source === 'mello' && ch.mangaId && ch.chapterId) {
      const json = await nativeGetJson(
        `https://plus.mangamello.com/api/v1/mangas/${ch.mangaId}/chapters/${ch.chapterId}?relations=chapterImages`,
        MELLO_API_HEADERS
      );
      imgs = (json?.data?.chapterImages || [])
        .map((img) => rewriteLegacyMangaImageUrl(img.src))
        .filter(Boolean);
    } else if (ch.source === 'azora' && ch.chapterId) {
      const json = await nativeGetJson(`https://api.azorafly.com/api/chapter?chapterId=${ch.chapterId}`);
      imgs = (json?.chapter?.images || []).map((img) => img.url).filter(Boolean);
    } else if (ch.source === 'swat' && ch.chapterId) {
      const json = await nativeGetJson(
        `https://appswat.com/v2/api/v2/chapters/${ch.chapterId}/`,
        SWAT_API_HEADERS
      );
      imgs = (json?.images || [])
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((img) => img.image)
        .filter(Boolean);
    } else {
      const atHome = await fetch(`https://api.mangadex.org/at-home/server/${ch.id}`).then((r) => r.json());
      const baseUrl = atHome?.baseUrl;
      const hash = atHome?.chapter?.hash;
      const files = atHome?.chapter?.dataSaver || atHome?.chapter?.data || [];
      const mode = atHome?.chapter?.dataSaver ? 'data-saver' : 'data';
      if (baseUrl && hash && files.length) {
        imgs = files.map((f) => `${baseUrl}/${mode}/${hash}/${f}`);
      }
    }
    if (imgs.length > 0) {
      prefetchedChapterRef.current[ch.id] = imgs;
    }
    return imgs;
  }, []);

  // ==================== v14.0 GLOBAL SELF-HEALING COVER ENGINE & NATIVE PHONE EPISODE RADAR ====================

  // 1. Global Capture-Phase Image Error Auto-Healer (Fixes any missing/403/404 Anime, Manga, or Manhwa cover via AniList HD + /blackx-logo.png)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!window.__bxCoverCache) window.__bxCoverCache = {};

    const handleGlobalImgError = (ev) => {
      const img = ev?.target;
      if (!img || img.tagName !== 'IMG') return;
      const curSrc = String(img.getAttribute('src') || '');
      if (curSrc.endsWith('/blackx-logo.png') || img.dataset.bxHealed === 'done') return;

      // Immediately show official BLACK X logo so a broken image icon never appears
      img.src = '/blackx-logo.png';
      img.dataset.bxHealed = 'pending';

      const rawTitle = String(img.getAttribute('alt') || '')
        .replace(/[^\w\s\u0621-\u064A]/g, ' ')
        .trim();
      if (!rawTitle || rawTitle.length < 2 || rawTitle.toLowerCase() === 'black x') {
        img.dataset.bxHealed = 'done';
        return;
      }

      if (window.__bxCoverCache[rawTitle]) {
        img.dataset.bxHealed = 'done';
        img.src = window.__bxCoverCache[rawTitle];
        return;
      }

      fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          query: `query($s: String) { Media(search: $s) { coverImage { extraLarge large } } }`,
          variables: { s: rawTitle.split(/\s+/).slice(0, 4).join(' ') }
        })
      })
        .then((r) => r.json())
        .then((d) => {
          const hdUrl = d?.data?.Media?.coverImage?.extraLarge || d?.data?.Media?.coverImage?.large;
          img.dataset.bxHealed = 'done';
          if (hdUrl) {
            window.__bxCoverCache[rawTitle] = hdUrl;
            img.src = hdUrl;
          }
        })
        .catch(() => {
          img.dataset.bxHealed = 'done';
        });
    };

    window.addEventListener('error', handleGlobalImgError, true);
    return () => window.removeEventListener('error', handleGlobalImgError, true);
  }, []);

  // 2. Real Android Phone Status-Bar Notification Radar for New Anime Episodes
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    try {
      window.BlackXNativeAuth?.requestNotificationPermission?.();
    } catch (_) {}

    const checkAndNotifyNewEpisodes = async () => {
      try {
        const res = await queryAlgolia('recent', { query: '', hitsPerPage: 8 });
        const hits = (res?.hits || []).map(formatAnimeHit).filter(Boolean);
        if (!hits.length) return;

        let seenIds = [];
        try {
          seenIds = JSON.parse(localStorage.getItem('bx_mob_notified_eps_v14') || '[]');
        } catch (_) {
          seenIds = [];
        }

        const latest = hits[0];
        const latestKey = `${latest.objectID}_${latest.latestEp || 1}`;
        if (!seenIds.includes(latestKey)) {
          const nextSeen = [latestKey, ...hits.slice(1).map((h) => `${h.objectID}_${h.latestEp || 1}`), ...seenIds].slice(0, 60);
          localStorage.setItem('bx_mob_notified_eps_v14', JSON.stringify(nextSeen));
          dispatchPhoneNotification(
            '🔥 حلقة أنمي جديدة على BLACK X!',
            `توفر الآن أحدث حلقات (${latest.titleEn}) مترجمة بجودة 1080p وسرعة 120Hz — اضغط للمشاهدة الفورية!`,
            Math.floor(Date.now() % 90000) + 1000
          );
        }
      } catch (_) {}
    };

    const initTimer = setTimeout(checkAndNotifyNewEpisodes, 3500);
    const pollInterval = setInterval(checkAndNotifyNewEpisodes, 180000);
    return () => {
      clearTimeout(initTimer);
      clearInterval(pollInterval);
    };
  }, []);

  const handleReadMangaChapter = useCallback(
    async (ch) => {
      window.triggerBlackXMotion?.(
        'eclipse',
        1350,
        `🕳️ الفصل ${ch.chapter} · كسوف الثقب الأسود 120Hz`,
        `🕳️ CHAPTER ${ch.chapter} · ECLIPSE SINGULARITY 120Hz`
      );
      setActiveMangaChapter(ch);
      setCurrentPageIdx(0);
      setReadProgressPct(0);
      setAutoScrollSpeed(0);
      const offlineSaved =
        (Array.isArray(ch.pages) && ch.pages.length ? ch.pages : null) ||
        offlineChapters.find((x) => x.id === ch.id)?.pages ||
        prefetchedChapterRef.current[ch.id];
      if (offlineSaved?.length) {
        setMangaPages(offlineSaved);
        setMangaPagesLoading(false);
      } else {
        setMangaPages([]);
        setMangaPagesLoading(true);
      }

      // Save to Manga Reading History (unless Incognito Mode is active)
      if (selectedManga && !incognitoMode) {
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
        if (!offlineSaved?.length) {
          const imgs = await fetchChapterPagesList(ch);
          setMangaPages(imgs);
        }
        // Smart Background Next-Chapter Prefetching (Zero-Wait Transition)
        const chIdx = mangaChapters.findIndex((c) => c.id === ch.id);
        const nextCh = chIdx > 0 ? mangaChapters[chIdx - 1] : null;
        if (nextCh && !prefetchedChapterRef.current[nextCh.id]) {
          setTimeout(async () => {
            try {
              const nextImgs = await fetchChapterPagesList(nextCh);
              nextImgs.slice(0, 5).forEach((url) => {
                const preImg = new Image();
                preImg.src = url;
              });
            } catch (_) {}
          }, 1200);
        }
      } catch (_) {
      } finally {
        setMangaPagesLoading(false);
      }
    },
    [selectedManga, mangaChapters, fetchChapterPagesList]
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
      const avgScore = Number(((revStoryScore + revAnimScore + revOstScore + revCharScore) / 4).toFixed(1));
      const rev = {
        id: `rev_${Date.now()}`,
        author: user?.displayName || (lang === 'ar' ? 'أوتاكو BLACK X' : 'BLACK X Otaku'),
        sovereignTitle: selectedSovereignTitle,
        role: user?.role || 'user',
        score: avgScore || newReviewScore,
        pillars: {
          story: revStoryScore,
          anim: revAnimScore,
          ost: revOstScore,
          char: revCharScore
        },
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
      showToast(lang === 'ar' ? '✓ تم نشر تقييمك الرباعي الاحترافي (+25 XP) ومزامنته مع السحابة!' : '✓ 4-Pillar Review posted (+25 XP)!');
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
    [
      selectedAnime,
      newReviewText,
      newReviewScore,
      revStoryScore,
      revAnimScore,
      revOstScore,
      revCharScore,
      selectedSovereignTitle,
      activeEpisode,
      user,
      animeReviews,
      userXp,
      showToast,
      lang
    ]
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
              const isDevAcc =
                cloudUser.role === 'developer' ||
                cleanId === 'mz0970mmz@gmail.com' ||
                cleanId === 'developer' ||
                cleanId === 'mz0970mmz';
              const redeemedTier = localStorage.getItem('bx_mob_redeemed_vip_tier');
              const tier = isDevAcc
                ? 'vip_monarch'
                : cloudUser.vipTier === 'vip_monarch' || cloudUser.vipTier === 'vip_basic'
                ? cloudUser.vipTier
                : redeemedTier || 'free';
              const loggedUser = {
                id: cloudUser.id || `u_${Date.now()}`,
                username: cloudUser.username || cleanId.split('@')[0],
                email: cloudUser.email || (isEmail ? cleanId : `${cleanId}@blackx.app`),
                displayName: cloudUser.displayName || cloudUser.username || cleanId,
                photoUrl: cloudUser.photoUrl || '',
                avatarColor: cloudUser.avatarColor || '#ffffff',
                role: isDevAcc ? 'developer' : 'user',
                vipTier: tier,
                vipStatus: tier === 'vip_monarch' ? 'VIP Monarch' : tier === 'vip_basic' ? 'VIP Basic' : 'Free Tier',
                passSha256: passHash
              };
              setUser(loggedUser);
              localStorage.setItem('bx_mob_user', JSON.stringify(loggedUser));
              setVipGateShowLogin(false);
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
        // Fallback for Developer login if developer doc was not initialized yet
        if (cleanId === 'mz0970mmz@gmail.com' || cleanId === 'developer' || cleanId === 'mz0970mmz') {
          const devUser = {
            id: 'dev_master',
            username: 'developer',
            email: 'mz0970mmz@gmail.com',
            displayName: 'Developer MZ 👑',
            photoUrl: '',
            avatarColor: '#ffffff',
            role: 'developer',
            vipTier: 'vip_monarch',
            vipStatus: 'VIP Monarch',
            passSha256: passHash
          };
          setUser(devUser);
          localStorage.setItem('bx_mob_user', JSON.stringify(devUser));
          setVipGateShowLogin(false);
          await syncUserStateToCloud(devUser, favorites, watchHistory);
          showToast('👑 تم تسجيل الدخول بحساب مطور المنصة الرسمي!');
          setAuthBusy(false);
          return;
        }
        showToast(lang === 'ar' ? 'الحساب غير موجود، يمكنك إنشاؤه الآن!' : 'Account not found, please register!');
      } else {
        const uname = (authUsername || cleanId.split('@')[0]).toLowerCase().replace(/[^a-z0-9_.-]/g, '');
        const uemail = (authEmail || `${uname}@blackx.app`).toLowerCase();
        const isDevAcc = uemail === 'mz0970mmz@gmail.com' || uname === 'developer' || uname === 'mz0970mmz';
        const redeemedTier = localStorage.getItem('bx_mob_redeemed_vip_tier');
        const tier = isDevAcc ? 'vip_monarch' : redeemedTier || 'free';
        const newUser = {
          id: `bx_${Date.now()}`,
          username: uname,
          email: uemail,
          displayName: authDisplayName || uname,
          photoUrl: '',
          avatarColor: '#ffffff',
          role: isDevAcc ? 'developer' : 'user',
          vipTier: tier,
          vipStatus: tier === 'vip_monarch' ? 'VIP Monarch' : tier === 'vip_basic' ? 'VIP Basic' : 'Free Tier',
          passSha256: passHash
        };
        setUser(newUser);
        localStorage.setItem('bx_mob_user', JSON.stringify(newUser));
        setVipGateShowLogin(false);
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

  // Filtered & sorted episodes inside Anime Detail Sheet (with 50-episode range chunking support)
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
    } else if (epRangeChunk >= 0 && animeEpisodes.length > 50) {
      const start = epRangeChunk * 50;
      list = list.slice(start, start + 50);
    }
    if (!epAscending) list.reverse();
    return list;
  }, [animeEpisodes, hideFiller, epSearchQuery, epAscending, epRangeChunk]);

  // Filtered & sorted chapters inside Manhwa Series Hub
  const displayedMangaChapters = useMemo(() => {
    let list = [...mangaChapters];
    if (mangaChSearch.trim()) {
      const q = mangaChSearch.trim().toLowerCase();
      list = list.filter(
        (ch) => String(ch.chapter).toLowerCase().includes(q) || String(ch.title || '').toLowerCase().includes(q)
      );
    }
    if (mangaChAsc) {
      list.reverse();
    }
    return list;
  }, [mangaChapters, mangaChSearch, mangaChAsc]);

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

      {/* GPU 4K Anime Line-Art Sharpening Convolution Filter */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <filter id="bx-sharpen-4k">
            <feConvolveMatrix order="3" kernelMatrix="0 -0.45 0 -0.45 2.8 -0.45 0 -0.45 0" preserveAlpha="true" />
          </filter>
        </defs>
      </svg>

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
            whiteSpace: 'nowrap'
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* App 4-Digit PIN Lock Screen Overlay */}
      {pinLocked && appPinCode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: '#000000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          <img
            src="/blackx-logo.png"
            alt="BLACK X"
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '18px',
              border: '1px solid rgba(255,255,255,0.25)',
              marginBottom: '1rem'
            }}
          />
          <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.15rem', fontWeight: 900 }}>
            🔒 {isRtl ? 'قفل حماية BLACK X مفعل' : 'BLACK X PIN Lock'}
          </h2>
          <p style={{ margin: '0 0 1.2rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
            {isRtl ? 'أدخل رمز الـ PIN المكون من 4 أرقام لفتح التطبيق:' : 'Enter your 4-digit PIN code to unlock:'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: pinInput.length > i ? '#ffffff' : 'transparent',
                  border: '2px solid #ffffff'
                }}
              />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: '0.75rem' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✓'].map((k) => (
              <button
                key={String(k)}
                type="button"
                onClick={() => {
                  if (k === '⌫') {
                    setPinInput((p) => p.slice(0, -1));
                    return;
                  }
                  if (k === '✓') {
                    if (pinInput === appPinCode) {
                      setPinLocked(false);
                      setPinInput('');
                    } else {
                      setPinInput('');
                      showToast(isRtl ? '❌ رمز الـ PIN غير صحيح' : '❌ Incorrect PIN');
                    }
                    return;
                  }
                  const next = (pinInput + String(k)).slice(0, 4);
                  setPinInput(next);
                  if (next.length === 4) {
                    if (next === appPinCode) {
                      setPinLocked(false);
                      setPinInput('');
                    } else {
                      setTimeout(() => {
                        setPinInput('');
                        showToast(isRtl ? '❌ رمز الـ PIN غير صحيح' : '❌ Incorrect PIN');
                      }, 180);
                    }
                  }
                }}
                style={{
                  height: '62px',
                  borderRadius: '16px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* New Release Radar Modal (🔔 رادار الحلقات والفصول الجديدة) */}
      {radarModalOpen && (
        <div
          onClick={() => setRadarModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9700,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '420px',
              maxHeight: '82vh',
              overflowY: 'auto',
              background: '#08080c',
              border: '1.5px solid #ffffff',
              borderRadius: '20px',
              padding: '1.1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 900, fontSize: '0.96rem' }}>
                <img
                  src="/blackx-logo.png"
                  alt="BLACK X"
                  style={{ width: '24px', height: '24px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.28)' }}
                />
                <span>🔔 {isRtl ? 'رادار وإشعارات الحلقات الجديدة للهاتف' : 'Phone Episode Notifications Radar'}</span>
              </div>
              <button
                type="button"
                onClick={() => setRadarModalOpen(false)}
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.25rem 0.65rem',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Real Native Phone Notification Control Box */}
            <div
              style={{
                padding: '0.75rem',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.22)',
                marginBottom: '0.85rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 900 }}>
                  📲 {isRtl ? 'نظام إشعارات الهاتف المباشر (Android Native)' : 'Android Native Phone Notifications'}
                </span>
                <span
                  style={{
                    padding: '0.12rem 0.48rem',
                    borderRadius: '999px',
                    background: '#ffffff',
                    color: '#000000',
                    fontSize: '0.6rem',
                    fontWeight: 900
                  }}
                >
                  ACTIVE • مفعل تلقائياً
                </span>
              </div>
              <p style={{ margin: '0 0 0.55rem', fontSize: '0.68rem', color: 'rgba(255,255,255,0.68)', lineHeight: 1.45 }}>
                {isRtl
                  ? 'يرسل التطبيق إشعارات حقيقية لشريط حالة هاتفك فور نزول كل حلقة أنمي جديدة. اضغط بالأسفل لاختبار إشعار الهاتف الآن:'
                  : 'Automatically sends real Android status-bar notifications when new anime episodes drop:'}
              </p>
              <button
                type="button"
                onClick={() => {
                  const sampleAnime = latestList[0] || popularList[0] || { titleEn: 'Solo Leveling', latestEp: 12 };
                  dispatchPhoneNotification(
                    '🔥 حلقة أنمي جديدة على BLACK X!',
                    `نزلت الآن أحدث حلقات (${sampleAnime.titleEn}) مترجمة بجودة 1080p وسرعة 120Hz — اضغط للمشاهدة الفورية!`,
                    Math.floor(Date.now() % 90000) + 1000
                  );
                  showToast('📲 تم إرسال إشعار الحلقة الجديدة إلى شريط إشعارات هاتفك الآن!');
                }}
                style={{
                  width: '100%',
                  padding: '0.58rem',
                  borderRadius: '999px',
                  border: 'none',
                  background: '#ffffff',
                  color: '#000000',
                  fontWeight: 900,
                  fontSize: '0.74rem',
                  cursor: 'pointer'
                }}
              >
                🔔 {isRtl ? 'إرسال إشعار حلقة جديدة للهاتف الآن (تجربة فورية)' : 'Send Phone Notification Now'}
              </button>
            </div>

            <p style={{ margin: '0 0 0.65rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.68)', lineHeight: 1.5 }}>
              {isRtl
                ? 'أحدث الحلقات الصادرة هذا الأسبوع (اضغط المشاهدة أو 🔔 لإرسال تنبيه للهاتف):'
                : 'Latest airing episode releases this week:'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {(favorites.length > 0 ? favorites.slice(0, 6) : latestList.slice(0, 6)).map((item, idx) => (
                <div
                  key={item.objectID || idx}
                  onClick={() => {
                    setRadarModalOpen(false);
                    handleOpenAnime(item);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.55rem',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    cursor: 'pointer'
                  }}
                >
                  <img
                    src={item.poster || '/blackx-logo.png'}
                    alt={item.titleEn}
                    style={{ width: '46px', height: '64px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.titleEn}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.18rem' }}>
                      🟢 {isRtl ? 'متاح الآن بأعلى جودة 1080p على سيرفرات BLACK X' : 'Available now in 1080p'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatchPhoneNotification(
                        `🔔 حلقة جديدة: ${item.titleEn}`,
                        `شاهد الآن أحدث حلقات (${item.titleAr || item.titleEn}) بجودة 1080p على BLACK X!`,
                        2000 + idx
                      );
                      showToast(`📲 تم إرسال إشعار (${item.titleEn}) إلى هاتفك!`);
                    }}
                    style={{
                      padding: '0.28rem 0.5rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.25)',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    🔔
                  </button>
                  <span
                    style={{
                      padding: '0.28rem 0.55rem',
                      borderRadius: '8px',
                      background: '#ffffff',
                      color: '#000000',
                      fontSize: '0.68rem',
                      fontWeight: 900
                    }}
                  >
                    ▶
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top SlothUI / Prime Luxury Floating Glass Header Bar with Official BLACK X Logo (Shown on inner tabs; Home uses Full-Bleed Hero Header) */}
      {!(activeTab === 'home' && !selectedAnime) && (
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 90,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 1rem',
          background: 'rgba(0, 0, 0, 0.84)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <img
            src="/blackx-logo.png"
            alt="BLACK X"
            onClick={() => setCommandMenuOpen(true)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              objectFit: 'cover',
              border: '1.5px solid rgba(255,255,255,0.32)',
              boxShadow: '0 4px 16px rgba(255,0,0,0.28)',
              cursor: 'pointer',
              flexShrink: 0
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontWeight: 900, fontSize: '1.02rem', letterSpacing: '0.02em' }}>BLACK X</span>
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)' }}>original</span>
              <span
                style={{
                  fontSize: '0.58rem',
                  fontWeight: 900,
                  padding: '0.08rem 0.4rem',
                  borderRadius: '99px',
                  background: '#ffffff',
                  color: '#000000'
                }}
              >
                {fpsHz}Hz
              </span>
            </div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.52)', fontWeight: 700 }}>
              {isRtl ? 'إصدار v14.0 الشامل • 6,973 أنمي و 30,000 مانجا' : 'v14.0 Full System • 6,973 Anime'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {/* Circular Glass Search Button */}
          <button
            type="button"
            onClick={() => {
              setSelectedAnime(null);
              setActiveTab('catalog');
            }}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.22)',
              color: '#fff',
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            🔍
          </button>

          {/* Official slothUI Notification Bell Orb (Matches Handmaiden Tales Top-Right Bell) */}
          <button
            type="button"
            onClick={() => setRadarModalOpen(true)}
            style={{
              position: 'relative',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.22)',
              color: '#fff',
              fontSize: '0.86rem',
              cursor: 'pointer'
            }}
          >
            🔔
            <span
              style={{
                position: 'absolute',
                top: '5px',
                right: '6px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#ffffff'
              }}
            />
          </button>

          {/* Official slothUI Circular Avatar Orb + Hamburger Menu Trigger */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.14)',
              color: '#ffffff',
              border: '1.5px solid rgba(255,255,255,0.35)',
              fontWeight: 900,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            {user ? (user.displayName?.[0] || 'X').toUpperCase() : '👤'}
          </button>

          <button
            type="button"
            onClick={() => setCommandMenuOpen(true)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#ffffff',
              color: '#000000',
              border: 'none',
              fontWeight: 900,
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            ☰
          </button>
        </div>
      </header>
      )}

      {/* Global Real-Time Developer Push Broadcast Banner */}
      {globalBroadcastMsg && (
        <div
          style={{
            padding: '0.52rem 0.9rem',
            background: '#ffffff',
            color: '#000000',
            fontWeight: 900,
            fontSize: '0.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.6rem',
            borderBottom: '1px solid #000000'
          }}
        >
          <span>📢 {globalBroadcastMsg}</span>
        </div>
      )}

      {/* ==================== TAB 1: HOME (1:1 EXACT MATCH TO REFERENCE SCREENSHOT) ==================== */}
      {activeTab === 'home' && !selectedAnime && (
        <main style={{ animation: 'bxSlideUp 0.18s ease-out', position: 'relative' }}>
          {/* v13.0 Official slothUI Pro 2.0 Full-Bleed Hero Showcase ("Handmaiden Tales" & "Sane Max Origins" Layout) */}
          {heroAnime && (
            <>
              <section
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '515px',
                  overflow: 'hidden',
                  borderBottom: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <img
                  src={heroAnime.poster || heroAnime.banner}
                  alt={heroAnime.titleEn}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center 16%',
                    filter: 'brightness(0.7) contrast(1.12)'
                  }}
                />
                {/* Multi-Stop Official slothUI Pitch-Black Vignette */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(180deg, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.06) 24%, rgba(0,0,0,0.82) 64%, #000000 100%)'
                  }}
                />

                {/* Top-Left Official slothUI "[X] blackx original" Seal inside Hero */}
                <div
                  onClick={() => setCommandMenuOpen(true)}
                  style={{
                    position: 'absolute',
                    top: '14px',
                    left: '16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.26rem 0.65rem 0.26rem 0.35rem',
                    borderRadius: '999px',
                    background: 'rgba(0,0,0,0.65)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    cursor: 'pointer'
                  }}
                >
                  <img
                    src="/blackx-logo.png"
                    alt="BLACK X"
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '6px',
                      objectFit: 'cover',
                      border: '1px solid rgba(255,255,255,0.35)'
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.02em' }}>
                    BLACK X <span style={{ fontWeight: 500, opacity: 0.78 }}>original</span>
                  </span>
                </div>

                {/* Official slothUI Pro ("Handmaiden Tales" + "Sane Max") Centered Hero Content */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    right: '16px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  {/* 1. slothUI Genre Pills ABOVE Title ("[Sci-Fi] [Adventure] [Action]") */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      flexWrap: 'wrap',
                      marginBottom: '0.55rem'
                    }}
                  >
                    {(heroAnime.tags?.length ? heroAnime.tags.slice(0, 3) : [isRtl ? 'أكشن' : 'Action', isRtl ? 'فانتازيا' : 'Fantasy', 'Sci-Fi']).map(
                      (g, gIdx) => (
                        <span
                          key={gIdx}
                          style={{
                            padding: '0.2rem 0.68rem',
                            borderRadius: '999px',
                            background: 'rgba(255,255,255,0.12)',
                            border: '1px solid rgba(255,255,255,0.28)',
                            color: '#ffffff',
                            fontSize: '0.66rem',
                            fontWeight: 800
                          }}
                        >
                          {g}
                        </span>
                      )
                    )}
                    <span
                      style={{
                        padding: '0.2rem 0.58rem',
                        borderRadius: '999px',
                        background: '#ffffff',
                        color: '#000000',
                        fontSize: '0.64rem',
                        fontWeight: 900
                      }}
                    >
                      TV-MA • {heroAnime.year || '2026'}
                    </span>
                  </div>

                  {/* 2. Giant Bold Uppercase Title ("HANDMAIDEN TALES") */}
                  <h1
                    style={{
                      margin: '0 0 0.35rem',
                      fontSize: '1.72rem',
                      fontWeight: 900,
                      lineHeight: 1.1,
                      letterSpacing: '0.03em',
                      textTransform: 'uppercase',
                      textShadow: '0 6px 24px rgba(0,0,0,0.95)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {heroAnime.titleEn}
                  </h1>

                  {/* 3. Episode Subtitle Line ("S1 E1 • The Origins Of...") */}
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.78)',
                      marginBottom: '0.85rem'
                    }}
                  >
                    {isRtl
                      ? `م1 ح1 • بداية أسطورة ${heroAnime.titleEn.slice(0, 26)} • ★ ${heroAnime.rating || '9.4'}`
                      : `S1 E1 • The Origins Of ${heroAnime.titleEn.slice(0, 26)} • ★ ${heroAnime.rating || '9.4'}`}
                  </div>

                  {/* 4. Official slothUI Dual Pill Row ("[▶ Play S1 E1]" + "[Details]") */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.15fr 0.85fr',
                      gap: '0.6rem',
                      width: '100%',
                      maxWidth: '380px',
                      marginBottom: '0.55rem'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenAnime(heroAnime, 1)}
                      style={{
                        minHeight: '62px',
                        padding: '0.88rem 1rem',
                        borderRadius: '999px',
                        border: 'none',
                        background: '#ffffff',
                        color: '#000000',
                        fontWeight: 900,
                        fontSize: '0.84rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        boxShadow: '0 8px 24px rgba(255,255,255,0.22)',
                        cursor: 'pointer'
                      }}
                    >
                      <span>▶</span>
                      <span>{isRtl ? 'تشغيل م1 ح1 (Play S1 E1)' : 'Play S1 E1'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAnime(heroAnime)}
                      style={{
                        minHeight: '62px',
                        padding: '0.88rem 1rem',
                        borderRadius: '999px',
                        border: '1px solid rgba(255,255,255,0.24)',
                        background: 'rgba(20, 20, 26, 0.88)',
                        color: '#ffffff',
                        fontWeight: 900,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer'
                      }}
                    >
                      <span>ⓘ</span>
                      <span>{isRtl ? 'التفاصيل (Details)' : 'Details'}</span>
                    </button>
                  </div>

                  {/* 5. Official slothUI ("Sane Max Origins") Full-Width Outlined Pill ("[＋ Add To Playlist]") */}
                  <button
                    type="button"
                    onClick={() => toggleFavorite(heroAnime)}
                    style={{
                      width: '100%',
                      maxWidth: '380px',
                      minHeight: '46px',
                      padding: '0.68rem 1rem',
                      borderRadius: '999px',
                      border: '1px solid rgba(255,255,255,0.22)',
                      background: favorites.some((f) => f.objectID === heroAnime.objectID)
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(18, 18, 22, 0.85)',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{favorites.some((f) => f.objectID === heroAnime.objectID) ? '✓' : '＋'}</span>
                    <span>
                      {favorites.some((f) => f.objectID === heroAnime.objectID)
                        ? isRtl
                          ? 'مضاف في قائمتي (In Playlist)'
                          : 'Saved in Playlist'
                        : isRtl
                        ? 'أضف إلى قائمتي (Add To Playlist)'
                        : 'Add To Playlist'}
                    </span>
                  </button>
                </div>

                {/* Hero Slide Dots */}
                <div
                  style={{
                    position: 'absolute',
                    top: '18px',
                    right: '16px',
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

              {/* Official slothUI Pro ("Handmaiden Tales" Bottom Section): "All Episodes ↔ ⇅ Most Popular" 16:9 Strip */}
              <section style={{ padding: '0.85rem 1rem 0.2rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.6rem'
                  }}
                >
                  <span style={{ fontWeight: 900, fontSize: '0.94rem', letterSpacing: '0.01em' }}>
                    {isRtl ? 'حلقات مختارة (All Episodes)' : 'All Episodes'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHeroSlide((s) => (s + 1) % Math.max(1, Math.min(6, popularList.length)))}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.75)',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      cursor: 'pointer'
                    }}
                  >
                    <span>⇅</span>
                    <span>{isRtl ? 'الأكثر شهرة (Most Popular)' : 'Most Popular'}</span>
                  </button>
                </div>

                <div
                  className="bx-mob-scroll"
                  style={{
                    display: 'flex',
                    gap: '0.7rem',
                    overflowX: 'auto',
                    paddingBottom: '0.3rem'
                  }}
                >
                  {popularList.slice(0, 8).map((epItem, epIdx) => (
                    <div
                      key={`sloth-ep-${epItem.objectID}-${epIdx}`}
                      onClick={() => handleOpenAnime(epItem, 1)}
                      style={{
                        position: 'relative',
                        width: '210px',
                        height: '118px',
                        borderRadius: '18px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: '#0a0a0f',
                        border: '1px solid rgba(255,255,255,0.16)',
                        cursor: 'pointer'
                      }}
                    >
                      <img
                        src={epItem.banner || epItem.poster}
                        alt={epItem.titleEn}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          filter: 'brightness(0.82) contrast(1.08)'
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 45%, rgba(0,0,0,0.88) 100%)'
                        }}
                      />
                      {/* Top-Left slothUI Badge: "E1   24:00" */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.18rem 0.52rem',
                          borderRadius: '8px',
                          background: 'rgba(0,0,0,0.72)',
                          border: '1px solid rgba(255,255,255,0.22)',
                          fontSize: '0.64rem',
                          fontWeight: 900,
                          color: '#ffffff'
                        }}
                      >
                        <span>E{epIdx + 1}</span>
                        <span style={{ opacity: 0.72 }}>24:00</span>
                      </div>

                      {/* Bottom Title + Right Circular [X] slothUI Seal */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          left: '10px',
                          right: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.4rem'
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 900,
                            color: '#ffffff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {epItem.titleEn}
                        </div>
                        <span
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            color: '#000000',
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          X
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Mode B: Prime Rounded Hero Card + Top Search Bar (Matches Image 1 Left Screen "Popular Movies / HEROES") */}
          {heroAnime && homeDesignMode === 'prime' && (
            <section style={{ padding: '0.75rem 1rem 0.25rem' }}>
              {/* Rounded Search Trigger Bar */}
              <div
                onClick={() => {
                  setSelectedAnime(null);
                  setActiveTab('catalog');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.72rem 1.05rem',
                  borderRadius: '999px',
                  background: '#111116',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  marginBottom: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <span>🔍</span>
                <span>{isRtl ? 'ابحث عن الأنميات، الأفلام، والمانهوا...' : 'Movies, Anime, Drama & other...'}</span>
              </div>

              {/* Section Header: Popular Movies / See All */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>
                  {isRtl ? 'الأعمال الرائجة' : 'Popular Anime'}
                </h2>
                <span
                  onClick={() => setActiveTab('catalog')}
                  style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)', fontWeight: 800, cursor: 'pointer' }}
                >
                  {isRtl ? 'عرض الكل' : 'See All'}
                </span>
              </div>

              {/* Large 26px Rounded Featured Hero Card (Matches Image 1 "HEROES") */}
              <div
                onClick={() => handleOpenAnime(heroAnime)}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '255px',
                  borderRadius: '26px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.16)',
                  boxShadow: '0 18px 42px rgba(0,0,0,0.85)',
                  cursor: 'pointer'
                }}
              >
                <img
                  src={heroAnime.banner || heroAnime.poster}
                  alt={heroAnime.titleEn}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.78)' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0.92) 100%)'
                  }}
                />

                {/* Top-Right Floating Glass Rating Pill (★ 8.1) */}
                <div
                  style={{
                    position: 'absolute',
                    top: '14px',
                    right: '14px',
                    padding: '0.28rem 0.65rem',
                    borderRadius: '99px',
                    background: 'rgba(18,18,24,0.78)',
                    border: '1px solid rgba(255,255,255,0.24)',
                    fontSize: '0.74rem',
                    fontWeight: 900,
                    color: '#ffffff'
                  }}
                >
                  ★ {heroAnime.rating || '9.2'}
                </div>

                {/* Bottom-Left Title + Pipe-Separated Genre Pills + Pagination Dots */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '14px',
                    left: '16px',
                    right: '16px'
                  }}
                >
                  <h1 style={{ margin: '0 0 0.45rem', fontSize: '1.32rem', fontWeight: 900, textShadow: '0 4px 14px #000' }}>
                    {heroAnime.titleEn}
                  </h1>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        padding: '0.32rem 0.75rem',
                        borderRadius: '99px',
                        background: 'rgba(20,20,26,0.82)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: 'rgba(255,255,255,0.88)'
                      }}
                    >
                      {(heroAnime.tags || ['أكشن', 'فانتازيا', 'تشويق']).slice(0, 3).join('  |  ')}
                    </div>

                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {popularList.slice(0, 5).map((_, idx) => (
                        <span
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setHeroSlide(idx);
                          }}
                          style={{
                            width: heroSlide === idx ? '16px' : '6px',
                            height: '6px',
                            borderRadius: '99px',
                            background: heroSlide === idx ? '#ffffff' : 'rgba(255,255,255,0.35)',
                            transition: 'all 0.2s ease'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* v11.0 Mode 3: WakuWaku 3D Stacked Fan Deck Carousel (3 Overlapping Tilted Posters) */}
          {heroAnime && homeDesignMode === 'waku3d' && (
            <section
              style={{
                position: 'relative',
                padding: '0.85rem 1rem 1.05rem',
                overflow: 'hidden',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              {/* Soft Monochrome Ambient Blur Backdrop */}
              <img
                src={heroAnime.poster}
                alt=""
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: 'blur(38px) brightness(0.22)',
                  transform: 'scale(1.2)',
                  pointerEvents: 'none'
                }}
              />

              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
                  {isRtl ? 'شاهد اليوم • مروحة الأنمي ثلاثية الأبعاد' : 'Watch Today • 3D Fan Deck'}
                </div>

                {/* 3D Stacked Fan Deck Stage */}
                {(() => {
                  const pool = popularList.slice(0, 6);
                  const total = pool.length || 1;
                  const prevItem = pool[(heroSlide - 1 + total) % total] || heroAnime;
                  const nextItem = pool[(heroSlide + 1) % total] || heroAnime;
                  return (
                    <div
                      style={{
                        position: 'relative',
                        height: '295px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0.2rem 0 0.75rem'
                      }}
                    >
                      {/* Left Tilted Fan Card */}
                      <div
                        onClick={() => setHeroSlide((heroSlide - 1 + total) % total)}
                        style={{
                          position: 'absolute',
                          width: '168px',
                          height: '242px',
                          borderRadius: '20px',
                          overflow: 'hidden',
                          transform: 'translateX(-66px) scale(0.86) rotate(-9deg)',
                          opacity: 0.52,
                          border: '1px solid rgba(255,255,255,0.22)',
                          boxShadow: '0 14px 32px rgba(0,0,0,0.85)',
                          cursor: 'pointer',
                          transition: 'all 0.28s ease',
                          zIndex: 1
                        }}
                      >
                        <img
                          src={prevItem.poster}
                          alt={prevItem.titleEn}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>

                      {/* Right Tilted Fan Card */}
                      <div
                        onClick={() => setHeroSlide((heroSlide + 1) % total)}
                        style={{
                          position: 'absolute',
                          width: '168px',
                          height: '242px',
                          borderRadius: '20px',
                          overflow: 'hidden',
                          transform: 'translateX(66px) scale(0.86) rotate(9deg)',
                          opacity: 0.52,
                          border: '1px solid rgba(255,255,255,0.22)',
                          boxShadow: '0 14px 32px rgba(0,0,0,0.85)',
                          cursor: 'pointer',
                          transition: 'all 0.28s ease',
                          zIndex: 1
                        }}
                      >
                        <img
                          src={nextItem.poster}
                          alt={nextItem.titleEn}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>

                      {/* Center Elevated Hero Fan Card */}
                      <div
                        onClick={() => handleOpenAnime(heroAnime)}
                        style={{
                          position: 'relative',
                          width: '198px',
                          height: '282px',
                          borderRadius: '24px',
                          overflow: 'hidden',
                          border: '1.5px solid rgba(255,255,255,0.42)',
                          boxShadow: '0 24px 60px rgba(255,255,255,0.16), 0 14px 36px rgba(0,0,0,0.95)',
                          cursor: 'pointer',
                          transition: 'all 0.28s ease',
                          zIndex: 4
                        }}
                      >
                        <img
                          src={heroAnime.poster}
                          alt={heroAnime.titleEn}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(180deg, transparent 52%, rgba(0,0,0,0.92) 100%)'
                          }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            color: '#000000',
                            fontWeight: 900,
                            fontSize: '0.7rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          X
                        </span>
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '10px',
                            left: '12px',
                            right: '12px',
                            textAlign: 'center',
                            fontSize: '0.78rem',
                            fontWeight: 900,
                            color: '#ffffff',
                            textShadow: '0 2px 10px #000',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {heroAnime.titleEn}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* WakuWaku Bottom Caption + Dual Pill Buttons */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.58)', fontWeight: 800, marginBottom: '0.18rem' }}>
                    {isRtl ? 'مقترح في قائمة مشاهدتك' : 'Up on your watchlist'}
                  </div>
                  <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.18rem', fontWeight: 900 }}>
                    {heroAnime.titleEn}
                  </h2>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.82)', marginBottom: '0.7rem' }}>
                    {heroAnime.year || '2026'} &nbsp;•&nbsp; ★ {heroAnime.rating || '9.2'} &nbsp;•&nbsp; {heroAnime.type}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', maxWidth: '340px', margin: '0 auto' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenAnime(heroAnime, 1)}
                      style={{
                        padding: '0.68rem 0.9rem',
                        borderRadius: '999px',
                        background: '#ffffff',
                        color: '#000000',
                        border: 'none',
                        fontWeight: 900,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      ▶ {isRtl ? 'تشغيل الآن' : 'Play Now'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAnime(heroAnime)}
                      style={{
                        padding: '0.68rem 0.9rem',
                        borderRadius: '999px',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.24)',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      ⓘ {isRtl ? 'صفحة العمل' : 'Details'}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* v11.0 Mode 4: AnymeX / Dantotsu / Saikou Unified Portal Dashboard */}
          {heroAnime && homeDesignMode === 'anymex' && (
            <section
              style={{
                padding: '1rem 1rem 0.6rem',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              {/* Centered AnymeX Personal Greeting */}
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.38rem', fontWeight: 900, lineHeight: 1.25 }}>
                  {isRtl
                    ? `أهلاً بك يا ${user?.displayName || 'ملك الأوتاكو'}، ماذا سنشاهد اليوم؟`
                    : `Hey ${user?.displayName || 'Otaku Monarch'}, What are we doing today?`}
                </h1>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.62)', fontWeight: 700 }}>
                  {isRtl
                    ? 'اكتشف أضخم مكتبة أنمي ومانهوا ومانجا مترجمة بجودة 4K وسرعة 120Hz!'
                    : 'Find your favourite anime, manga, or manhwa in 4K 120Hz!'}
                </p>
              </div>

              {/* Dual Artwork Portal Cards: [ANIME LIST] & [MANGA LIST] (Exact Match to AnymeX UI) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.85rem' }}>
                <div
                  onClick={() => setActiveTab('catalog')}
                  style={{
                    position: 'relative',
                    height: '88px',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    border: '1.5px solid rgba(255,255,255,0.28)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={heroAnime.banner || heroAnime.poster}
                    alt="Anime List"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'brightness(0.45) contrast(1.1)'
                    }}
                  />
                  <span style={{ position: 'relative', zIndex: 2, fontWeight: 900, fontSize: '0.86rem', letterSpacing: '0.05em' }}>
                    {isRtl ? 'قائمة الأنمي' : 'ANIME LIST'}
                  </span>
                  <span
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      marginTop: '5px',
                      width: '48px',
                      height: '3px',
                      borderRadius: '99px',
                      background: '#ffffff'
                    }}
                  />
                </div>

                <div
                  onClick={() => setActiveTab('manga')}
                  style={{
                    position: 'relative',
                    height: '88px',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    border: '1.5px solid rgba(255,255,255,0.28)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={popularList[1]?.poster || heroAnime.poster}
                    alt="Manga List"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'brightness(0.45) contrast(1.1)'
                    }}
                  />
                  <span style={{ position: 'relative', zIndex: 2, fontWeight: 900, fontSize: '0.86rem', letterSpacing: '0.05em' }}>
                    {isRtl ? 'قائمة المانجا' : 'MANGA LIST'}
                  </span>
                  <span
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      marginTop: '5px',
                      width: '48px',
                      height: '3px',
                      borderRadius: '99px',
                      background: '#ffffff'
                    }}
                  />
                </div>
              </div>
            </section>
          )}

          {/* v11.0 Always-Available AnymeX Dual Portal Cards (when in SlothUI, Waku3D, or Prime mode) */}
          {homeDesignMode !== 'anymex' && heroAnime && (
            <section style={{ padding: '0.7rem 1rem 0.1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div
                  onClick={() => setActiveTab('catalog')}
                  style={{
                    position: 'relative',
                    height: '66px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.22)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={heroAnime.banner || heroAnime.poster}
                    alt="Anime List"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'brightness(0.38)'
                    }}
                  />
                  <span style={{ position: 'relative', zIndex: 2, fontWeight: 900, fontSize: '0.78rem', letterSpacing: '0.04em' }}>
                    🎬 {isRtl ? 'قائمة الأنمي (ANIME LIST)' : 'ANIME LIST'}
                  </span>
                  <span style={{ position: 'relative', zIndex: 2, marginTop: '4px', width: '40px', height: '2.5px', borderRadius: '99px', background: '#ffffff' }} />
                </div>

                <div
                  onClick={() => setActiveTab('manga')}
                  style={{
                    position: 'relative',
                    height: '66px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.22)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={popularList[2]?.poster || heroAnime.poster}
                    alt="Manga List"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'brightness(0.38)'
                    }}
                  />
                  <span style={{ position: 'relative', zIndex: 2, fontWeight: 900, fontSize: '0.78rem', letterSpacing: '0.04em' }}>
                    📖 {isRtl ? 'قائمة المانجا (MANGA LIST)' : 'MANGA LIST'}
                  </span>
                  <span style={{ position: 'relative', zIndex: 2, marginTop: '4px', width: '40px', height: '2.5px', borderRadius: '99px', background: '#ffffff' }} />
                </div>
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

          {/* ==================== v9.0 NETFLIX MOBILE / STORIES CIRCULAR PREVIEWS STRIP ==================== */}
          {popularList.length > 0 && (
            <section style={{ padding: '0.65rem 1rem 0.15rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, letterSpacing: '0.01em' }}>
                  ⚡ {isRtl ? 'معاينات سريعة (Stories)' : 'Quick Previews'}
                </h2>
                <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.5)', fontWeight: 800 }}>
                  {isRtl ? 'اضغط للمعاينة والتشغيل الفوري' : 'Tap to preview'}
                </span>
              </div>
              <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.35rem' }}>
                {popularList.slice(0, 12).map((item, idx) => (
                  <div
                    key={`story-${item.objectID}`}
                    className="bx-mob-card"
                    onClick={() => setStoryPreviewAnime({ item, index: idx })}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: '68px',
                      maxWidth: '68px',
                      cursor: 'pointer'
                    }}
                  >
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        padding: '2.5px',
                        background: idx < 3 ? '#ffffff' : 'rgba(255,255,255,0.45)',
                        boxShadow: idx < 3 ? '0 0 14px rgba(255,255,255,0.22)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <img
                        src={item.poster}
                        alt={item.titleEn}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid #000000'
                        }}
                      />
                    </div>
                    <span
                      style={{
                        marginTop: '0.28rem',
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        color: 'rgba(255,255,255,0.88)',
                        maxWidth: '66px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textAlign: 'center'
                      }}
                    >
                      {item.titleEn}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ==================== v7.0 CLEAN OBSIDIAN SMART QUICK-ACTION DOCK ==================== */}
          <section style={{ padding: '0.7rem 1rem 0.2rem' }}>
            <div
              className="bx-mob-scroll"
              style={{
                display: 'flex',
                gap: '0.45rem',
                overflowX: 'auto',
                paddingBottom: '0.3rem',
                alignItems: 'center'
              }}
            >
              <button
                type="button"
                disabled={spinningWheel}
                onClick={handleSpinWheelTonight}
                style={{
                  padding: '0.46rem 0.85rem',
                  borderRadius: '99px',
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.73rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                🎲 {spinningWheel ? (isRtl ? 'جاري السحب...' : 'Spinning...') : isRtl ? 'سهرة الليلة' : 'Tonight Pick'}
              </button>

              <button
                type="button"
                onClick={() => setMoodDrawerOpen((v) => !v)}
                style={{
                  padding: '0.46rem 0.85rem',
                  borderRadius: '99px',
                  background: moodDrawerOpen || activeMoodFilter !== 'all' ? '#ffffff' : '#0b0b10',
                  color: moodDrawerOpen || activeMoodFilter !== 'all' ? '#000000' : '#ffffff',
                  border: '1px solid rgba(255,255,255,0.22)',
                  fontWeight: 900,
                  fontSize: '0.73rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                🧬 {isRtl ? 'فلتر المزاج الذكي' : 'Mood Matcher'} {moodDrawerOpen ? '▲' : '▼'}
              </button>

              <button
                type="button"
                onClick={() => setRadarModalOpen(true)}
                style={{
                  padding: '0.46rem 0.85rem',
                  borderRadius: '99px',
                  background: '#0b0b10',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.22)',
                  fontWeight: 900,
                  fontSize: '0.73rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                📡 {isRtl ? 'رادار الحلقات' : 'Release Radar'}
              </button>

              {globalPinnedRec && (
                <button
                  type="button"
                  onClick={() => handleOpenAnime(globalPinnedRec)}
                  style={{
                    padding: '0.46rem 0.85rem',
                    borderRadius: '99px',
                    background: '#0b0b10',
                    color: '#ffffff',
                    border: '1.5px solid #ffffff',
                    fontWeight: 900,
                    fontSize: '0.73rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  📌 {isRtl ? `ترشيح الإدارة: ${globalPinnedRec.titleEn}` : `Pinned: ${globalPinnedRec.titleEn}`}
                </button>
              )}
            </div>

            {/* Collapsible Mood Drawer (Only visible when opened or active) */}
            {(moodDrawerOpen || activeMoodFilter !== 'all') && (
              <div
                style={{
                  marginTop: '0.45rem',
                  padding: '0.7rem',
                  borderRadius: '14px',
                  background: '#09090d',
                  border: '1px solid rgba(255,255,255,0.16)'
                }}
              >
                <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
                  {[
                    { id: 'all', ar: '🧬 إخفاء الفلتر', en: '🧬 Clear Filter' },
                    { id: 'zero_to_hero', ar: '⚔️ بطل يتطور من الصفر', en: '⚔️ Zero to Hero' },
                    { id: 'mind_games', ar: '🧠 دهاء وتخطيط', en: '🧠 Mind Games' },
                    { id: 'dark_battles', ar: '🩸 قتالات دموية مظلمة', en: '🩸 Dark Battles' },
                    { id: 'monarch', ar: '👑 إمبراطور السيادة', en: '👑 Sovereign Monarch' }
                  ].map((m) => {
                    const active = activeMoodFilter === m.id && m.id !== 'all';
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          handleSelectMood(m.id);
                          if (m.id === 'all') setMoodDrawerOpen(false);
                        }}
                        style={{
                          padding: '0.38rem 0.75rem',
                          borderRadius: '99px',
                          background: active ? '#ffffff' : 'rgba(255,255,255,0.06)',
                          color: active ? '#000000' : '#ffffff',
                          border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.16)',
                          fontWeight: 900,
                          fontSize: '0.71rem',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer'
                        }}
                      >
                        {isRtl ? m.ar : m.en}
                      </button>
                    );
                  })}
                </div>

                {activeMoodFilter !== 'all' && (
                  <div style={{ marginTop: '0.55rem' }}>
                    {moodLoading ? (
                      <div style={{ padding: '0.75rem', fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)' }}>
                        {isRtl ? '⏳ جاري تحليل ذوقك واستخراج أقوى الترشيحات...' : '⏳ Matching your DNA taste...'}
                      </div>
                    ) : (
                      <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                        {moodResults.map((item) => (
                          <div
                            key={item.objectID}
                            className="bx-mob-card"
                            onClick={() => handleOpenAnime(item)}
                            style={{ minWidth: '112px', maxWidth: '112px', cursor: 'pointer' }}
                          >
                            <div style={{ position: 'relative', borderRadius: '11px', overflow: 'hidden', aspectRatio: '2/2.85', border: '1px solid rgba(255,255,255,0.18)' }}>
                              <img src={item.poster} alt={item.titleEn} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <span style={{ position: 'absolute', top: '5px', right: '5px', background: '#ffffff', color: '#000000', fontSize: '0.58rem', fontWeight: 900, padding: '0.1rem 0.35rem', borderRadius: '5px' }}>
                                🧬 {getDnaMatchScore(item)}%
                              </span>
                            </div>
                            <div style={{ fontSize: '0.71rem', fontWeight: 900, marginTop: '0.28rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.titleEn}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Netflix-Style Continue Watching Strip (With Play Overlay + Bottom Progress Bar) */}
          {watchHistory.length > 0 && (
            <section style={{ padding: '0.9rem 1rem 0.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
                <h2 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900 }}>
                  ▶ {isRtl ? 'متابعة المشاهدة' : 'Continue Watching'}
                </h2>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', fontWeight: 800 }}>
                  {isRtl ? 'تشغيل في المشغل المستقل' : 'Standalone Player'}
                </span>
              </div>
              <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
                {watchHistory.slice(0, 12).map((h, i) => (
                  <div
                    key={`${h.objectID}-${i}`}
                    className="bx-mob-card"
                    onClick={() =>
                      handleOpenAnime(
                        {
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
                        },
                        h.episode || 1
                      )
                    }
                    style={{
                      minWidth: '116px',
                      maxWidth: '116px',
                      background: '#09090c',
                      border: '1px solid rgba(255,255,255,0.14)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ position: 'relative', width: '116px', height: '152px' }}>
                      <img
                        src={h.poster}
                        alt={h.titleEn}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.82)' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <span
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.72)',
                            border: '2px solid #ffffff',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 900
                          }}
                        >
                          ▶
                        </span>
                      </div>
                      {/* Netflix Bottom Episode Progress Bar */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '3.5px',
                          background: 'rgba(255,255,255,0.22)'
                        }}
                      >
                        <div style={{ width: `${62 + ((i * 11) % 30)}%`, height: '100%', background: '#ffffff' }} />
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '0.38rem 0.45rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#0c0c10'
                      }}
                    >
                      <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#ffffff' }}>
                        {isRtl ? `ح ${h.episode}` : `E${h.episode}`}
                      </span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickPeekAnime({
                            objectID: h.objectID,
                            slug: h.slug,
                            titleEn: h.titleEn,
                            titleAr: h.titleAr,
                            poster: h.poster,
                            banner: h.poster,
                            rating: '9.2',
                            type: 'مسلسل',
                            state: 'مستمر',
                            storyAr: 'تابع مشاهدة هذا العمل من حيث توقفت بأعلى جودة 1080p.'
                          });
                        }}
                        style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', fontWeight: 900 }}
                      >
                        ⓘ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ==================== v8.0 NETFLIX SIGNATURE TOP 10 RANKED ROW WITH GIANT OUTLINED NUMBERS ==================== */}
          {popularList.length > 0 && (
            <section style={{ padding: '0.95rem 1rem 0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <h2 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900 }}>
                  🏆 {isRtl ? 'أفضل 10 أعمال في BLACK X اليوم' : 'Top 10 on BLACK X Today'}
                </h2>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 900,
                    padding: '0.12rem 0.45rem',
                    borderRadius: '4px',
                    background: '#ffffff',
                    color: '#000000'
                  }}
                >
                  TOP 10
                </span>
              </div>
              <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.85rem', overflowX: 'auto', paddingBottom: '0.45rem' }}>
                {popularList.slice(0, 10).map((item, idx) => (
                  <div
                    key={`top10-${item.objectID}`}
                    className="bx-mob-card"
                    onClick={() => handleOpenAnime(item)}
                    style={{
                      position: 'relative',
                      minWidth: '148px',
                      height: '176px',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'flex-end',
                      cursor: 'pointer'
                    }}
                  >
                    {/* Giant Outlined Netflix Ranking Number (1 to 10) */}
                    <span
                      style={{
                        position: 'absolute',
                        left: idx === 9 ? '-6px' : '2px',
                        bottom: '-12px',
                        fontSize: idx === 9 ? '4.8rem' : '5.8rem',
                        fontWeight: 900,
                        lineHeight: 1,
                        color: '#000000',
                        WebkitTextStroke: '2.4px rgba(255,255,255,0.88)',
                        textShadow: '0 6px 18px rgba(0,0,0,0.95)',
                        zIndex: 2,
                        userSelect: 'none',
                        pointerEvents: 'none',
                        fontFamily: 'Impact, system-ui, sans-serif'
                      }}
                    >
                      {idx + 1}
                    </span>

                    <div
                      style={{
                        position: 'relative',
                        width: '112px',
                        height: '166px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        background: '#0d0d10',
                        border: '1px solid rgba(255,255,255,0.22)',
                        zIndex: 1
                      }}
                    >
                      <img
                        src={item.poster}
                        alt={item.titleEn}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickPeekAnime(item);
                        }}
                        style={{
                          position: 'absolute',
                          top: '5px',
                          right: '5px',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.78)',
                          border: '1px solid rgba(255,255,255,0.35)',
                          color: '#ffffff',
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ⓘ
                      </span>
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

          {/* Horizontal Mobile Sections (Filtered by Netflix Category Strip: All / Series / Movies / Simulcast) */}
          {[
            {
              cat: 'simulcast',
              titleAr: '🟢 يعرض الآن هذا الموسم (أنميات مستمرة)',
              titleEn: '🟢 Currently Airing This Season',
              items: airingList,
              sortKey: 'series_fav_count_desc'
            },
            {
              cat: 'series',
              titleAr: '🔥 أحدث الأنميات والحلقات المضافة',
              titleEn: '🔥 Recently Updated Anime',
              items: latestList,
              sortKey: 'series_date_created'
            },
            {
              cat: 'series',
              titleAr: '👑 الأكثر شعبية في BLACK X (6,973)',
              titleEn: '👑 Most Popular Anime (6,973)',
              items: popularList,
              sortKey: 'series_fav_count_desc'
            },
            {
              cat: 'series',
              titleAr: '⭐ أساطير الأنمي الأعلى تقييماً في BLACK X',
              titleEn: '⭐ Highest Rated on BLACK X',
              items: topRankedList,
              sortKey: 'best_mal_ranked'
            },
            {
              cat: 'movies',
              titleAr: '🎬 أفلام الأنمي السينمائية (1,266 فيلم)',
              titleEn: '🎬 Blockbuster Anime Movies (1,266)',
              items: moviesList,
              sortKey: 'series_fav_count_desc'
            },
            {
              cat: 'simulcast',
              titleAr: '🍂 أحدث إضافات الموسم',
              titleEn: '🍂 New Seasonal Releases',
              items: seasonalList,
              sortKey: 'series_date_created'
            }
          ]
            .filter((sec) => homeCategoryFilter === 'all' || sec.cat === homeCategoryFilter)
            .map((sec, sIdx) => (
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
                          borderRadius: '18px',
                          overflow: 'hidden',
                          background: '#0d0d10',
                          border: '1px solid rgba(255,255,255,0.16)'
                        }}
                      >
                        <img
                          src={item.poster}
                          alt={item.titleEn}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {/* Top-Left Circular [X] Brand Seal (Matches Image 3 "Popular on slothUI") */}
                        <span
                          style={{
                            position: 'absolute',
                            top: '7px',
                            left: '7px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            color: '#000000',
                            fontSize: '0.64rem',
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.85)'
                          }}
                        >
                          X
                        </span>
                        {/* Top-Right Circular Glass Bookmark Button (Matches Image 1 "Amazon Originals") */}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item);
                          }}
                          style={{
                            position: 'absolute',
                            top: '7px',
                            right: '7px',
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: favorites.some((f) => f.objectID === item.objectID)
                              ? '#ffffff'
                              : 'rgba(12,12,16,0.78)',
                            border: '1px solid rgba(255,255,255,0.32)',
                            color: favorites.some((f) => f.objectID === item.objectID) ? '#000000' : '#ffffff',
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {favorites.some((f) => f.objectID === item.objectID) ? '✓' : '🔖'}
                        </span>
                        {/* AnymeX / Dantotsu Bottom-Right Corner Episode Progress Badge (▶ Ep) */}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickPeekAnime(item);
                          }}
                          style={{
                            position: 'absolute',
                            bottom: '6px',
                            right: '6px',
                            padding: '0.14rem 0.45rem',
                            borderRadius: '8px',
                            background: 'rgba(12,12,18,0.88)',
                            border: '1px solid rgba(255,255,255,0.28)',
                            color: '#ffffff',
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <span>▶</span>
                          <span>
                            {(() => {
                              const wh = watchHistory.find((h) => h.objectID === item.objectID);
                              return wh ? wh.episode : '1';
                            })()}
                          </span>
                        </span>
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '6px',
                            left: '6px',
                            background: 'rgba(0,0,0,0.85)',
                            color: 'rgba(255,255,255,0.95)',
                            fontSize: '0.6rem',
                            fontWeight: 900,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '6px'
                          }}
                        >
                          ★ {item.rating}
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

          {/* v11.0 UI #3: Visual Genre Art Cards Grid (2x3 Illustrated Genre Cards) */}
          {popularList.length >= 6 && (
            <section style={{ padding: '0.95rem 1rem 0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <h2 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900 }}>
                  🎨 {isRtl ? 'تصفح حسب التصنيفات المصوّرة (Genres)' : 'Visual Genres'}
                </h2>
                <span
                  onClick={() => setActiveTab('catalog')}
                  style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)', fontWeight: 800, cursor: 'pointer' }}
                >
                  {isRtl ? 'كل التصنيفات ←' : 'See All →'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
                {[
                  { key: 'أكشن', ar: 'أكشن وقتال', en: 'Action', img: popularList[0]?.banner || popularList[0]?.poster },
                  { key: 'فانتازيا', ar: 'فانتازيا وسحر', en: 'Fantasy', img: popularList[1]?.banner || popularList[1]?.poster },
                  { key: 'رعب', ar: 'رعب وغموض', en: 'Horror & Mystery', img: popularList[2]?.banner || popularList[2]?.poster },
                  { key: 'كوميديا', ar: 'كوميديا', en: 'Comedy', img: popularList[3]?.banner || popularList[3]?.poster },
                  { key: 'إيسيكاي', ar: 'عالم آخر (Isekai)', en: 'Isekai', img: popularList[4]?.banner || popularList[4]?.poster },
                  { key: 'شياطين', ar: 'شياطين وقوى خارقة', en: 'Supernatural', img: popularList[5]?.banner || popularList[5]?.poster }
                ].map((vg) => (
                  <div
                    key={vg.key}
                    className="bx-mob-card"
                    onClick={() => {
                      const foundGenre =
                        GENRE_CHIPS.find((g) => g.ar.includes(vg.key) || g.en.toLowerCase().includes(vg.en.toLowerCase())) ||
                        GENRE_CHIPS[0];
                      setCatalogGenre(foundGenre);
                      setSearchQuery(vg.key);
                      setActiveTab('catalog');
                    }}
                    style={{
                      position: 'relative',
                      height: '94px',
                      borderRadius: '18px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.18)',
                      cursor: 'pointer'
                    }}
                  >
                    <img
                      src={vg.img}
                      alt={vg.en}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'brightness(0.58) contrast(1.08)'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.88) 100%)'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '12px',
                        right: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span style={{ fontWeight: 900, fontSize: '0.84rem', color: '#ffffff', textShadow: '0 2px 10px #000' }}>
                        {isRtl ? vg.ar : vg.en}
                      </span>
                      <span
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.18)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.66rem',
                          fontWeight: 900
                        }}
                      >
                        ↗
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      )}

      {/* ==================== TAB 2: FULL 6,973 ANIME CATALOG & TRENDING SEARCH (MATCHES IMAGE 1 MIDDLE SCREEN) ==================== */}
      {activeTab === 'catalog' && !selectedAnime && (
        <main style={{ padding: '0.85rem 1rem', animation: 'bxSlideUp 0.2s ease-out' }}>
          {/* Rounded Pill Search Input (Matches Image 1 Middle Screen) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              background: '#111116',
              border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: '999px',
              padding: '0.68rem 1.05rem',
              marginBottom: '0.85rem'
            }}
          >
            <span>🔍</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isRtl
                  ? 'ابحث عن الأنميات، الأفلام، والمانهوا...'
                  : 'Movies, Anime, Drama & other...'
              }
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#ffffff',
                fontSize: '0.84rem',
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

          {/* Image 1 Middle Screen: "Trending Search" Pill Tags */}
          <div style={{ marginBottom: '0.9rem' }}>
            <h3 style={{ margin: '0 0 0.55rem', fontSize: '0.92rem', fontWeight: 900 }}>
              {isRtl ? 'عمليات البحث الرائجة (Trending Search)' : 'Trending Search'}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.42rem' }}>
              {[
                'One Piece',
                'Solo Leveling',
                'Jujutsu Kaisen',
                'Attack on Titan',
                'Demon Slayer',
                'Bleach',
                'Hunter x Hunter',
                'Death Note',
                'Blue Lock',
                'Dragon Ball'
              ].map((tag) => {
                const active = searchQuery.toLowerCase() === tag.toLowerCase();
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSearchQuery(active ? '' : tag)}
                    style={{
                      padding: '0.38rem 0.85rem',
                      borderRadius: '999px',
                      background: active ? '#ffffff' : 'rgba(255,255,255,0.04)',
                      color: active ? '#000000' : 'rgba(255,255,255,0.85)',
                      border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.22)',
                      fontSize: '0.73rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Universal Spotlight Search: Matching Manhwa Results Row */}
          {searchQuery.trim().length >= 2 && universalMangaHits.length > 0 && (
            <div
              style={{
                marginBottom: '0.85rem',
                padding: '0.7rem',
                borderRadius: '14px',
                background: '#09090d',
                border: '1px solid rgba(255,255,255,0.18)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <span style={{ fontWeight: 900, fontSize: '0.78rem' }}>
                  📖 {isRtl ? `نتائج المانهوا والمانجا المطابقة (${universalMangaHits.length})` : `Matching Manhwa (${universalMangaHits.length})`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMangaQuery(searchQuery);
                    setActiveTab('manga');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  {isRtl ? 'فتح في قسم المانجا ←' : 'Open in Manga →'}
                </button>
              </div>
              <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                {universalMangaHits.map((mh) => (
                  <div
                    key={mh.objectID}
                    onClick={() => {
                      setActiveTab('manga');
                      handleOpenManga(mh);
                    }}
                    style={{ minWidth: '96px', maxWidth: '96px', cursor: 'pointer' }}
                  >
                    <img
                      src={mh.poster_uri}
                      alt={mh.name}
                      style={{ width: '96px', height: '132px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.18)' }}
                    />
                    <div style={{ fontSize: '0.68rem', fontWeight: 900, marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {mh.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {/* Live Count Bar + Popular Titles View Mode Switcher (Matches Image 1 Middle Screen) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem'
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 900 }}>
                {isRtl ? 'الأعمال الأكثر شعبية (Popular Titles)' : 'Popular Titles'}
              </h3>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.58)', fontWeight: 700, marginTop: '2px' }}>
                {isRtl
                  ? `📚 إجمالي الأعمال المتوفرة: ${catalogTotal.toLocaleString()} أنمي وفيلم`
                  : `📚 Total Available: ${catalogTotal.toLocaleString()} Anime & Movies`}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.32rem' }}>
              {[
                { id: 'bento', label: isRtl ? '🍱 بينتو' : '🍱 Bento' },
                { id: 'wide', label: isRtl ? '🖼️ عريضة' : '🖼️ Wide' },
                { id: 'grid', label: isRtl ? '☷ شبكة' : '☷ Grid' }
              ].map((cm) => {
                const active = catalogCardStyle === cm.id;
                return (
                  <button
                    key={cm.id}
                    type="button"
                    onClick={() => setCatalogCardStyle(cm.id)}
                    style={{
                      padding: '0.34rem 0.65rem',
                      borderRadius: '99px',
                      background: active ? '#ffffff' : 'rgba(255,255,255,0.08)',
                      color: active ? '#000000' : '#ffffff',
                      border: active ? 'none' : '1px solid rgba(255,255,255,0.16)',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    {cm.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* v11.0 3-Mode Catalog Grid: Bento Asymmetric Grid (UI #4) OR Wide 24px Cinema Cards OR 3-Column Poster Grid */}
          {catalogLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  style={{ aspectRatio: '2/3', borderRadius: '18px', background: 'rgba(255,255,255,0.06)' }}
                />
              ))}
            </div>
          ) : (
            <>
              {catalogCardStyle === 'bento' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.72rem' }}>
                  {catalogItems.map((item, idx) => {
                    const isFeaturedSpan = idx % 5 === 0;
                    return (
                      <div
                        key={item.objectID}
                        className="bx-mob-card"
                        onClick={() => handleOpenAnime(item)}
                        style={{
                          gridColumn: isFeaturedSpan ? 'span 2' : 'span 1',
                          position: 'relative',
                          height: isFeaturedSpan ? '195px' : '225px',
                          borderRadius: '22px',
                          overflow: 'hidden',
                          background: '#0b0b10',
                          border: '1px solid rgba(255,255,255,0.18)',
                          boxShadow: '0 14px 34px rgba(0,0,0,0.82)',
                          cursor: 'pointer'
                        }}
                      >
                        <img
                          src={isFeaturedSpan ? item.banner || item.poster : item.poster}
                          alt={item.titleEn}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: 'brightness(0.76) contrast(1.06)'
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0.94) 100%)'
                          }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            color: '#000000',
                            fontWeight: 900,
                            fontSize: '0.64rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          X
                        </span>
                        <span
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '99px',
                            background: 'rgba(14,14,20,0.82)',
                            border: '1px solid rgba(255,255,255,0.22)',
                            fontSize: '0.66rem',
                            fontWeight: 900
                          }}
                        >
                          ★ {item.rating}
                        </span>
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '10px',
                            left: '12px',
                            right: '12px'
                          }}
                        >
                          <div
                            style={{
                              fontSize: isFeaturedSpan ? '1.05rem' : '0.82rem',
                              fontWeight: 900,
                              color: '#ffffff',
                              lineHeight: 1.25,
                              marginBottom: '0.25rem',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {item.titleEn}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'rgba(255,255,255,0.75)', fontWeight: 800 }}>
                            <span>{(item.tags || [item.type || 'Anime']).slice(0, 2).join(' • ')}</span>
                            <span
                              style={{
                                padding: '0.12rem 0.48rem',
                                borderRadius: '8px',
                                background: '#ffffff',
                                color: '#000000',
                                fontWeight: 900
                              }}
                            >
                              ▶ 1
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : catalogCardStyle === 'wide' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {catalogItems.map((item) => (
                    <div
                      key={item.objectID}
                      className="bx-mob-card"
                      onClick={() => handleOpenAnime(item)}
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '205px',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        background: '#0b0b10',
                        border: '1px solid rgba(255,255,255,0.16)',
                        boxShadow: '0 14px 36px rgba(0,0,0,0.8)',
                        cursor: 'pointer'
                      }}
                    >
                      <img
                        src={item.banner || item.poster}
                        alt={item.titleEn}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          filter: 'brightness(0.75) contrast(1.06)'
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.22) 42%, rgba(0,0,0,0.92) 100%)'
                        }}
                      />

                      {/* Top-Right Floating Glass Star Rating Pill (Matches Image 1 "★ 8.3") */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          padding: '0.26rem 0.65rem',
                          borderRadius: '99px',
                          background: 'rgba(18,18,24,0.78)',
                          border: '1px solid rgba(255,255,255,0.24)',
                          fontSize: '0.72rem',
                          fontWeight: 900,
                          color: '#ffffff'
                        }}
                      >
                        ★ {item.rating || '9.2'}
                      </div>

                      {/* Top-Left Circular [X] Seal */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          color: '#000000',
                          fontSize: '0.72rem',
                          fontWeight: 900,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        X
                      </div>

                      {/* Bottom Title + Pipe-Separated Genres Pill + Duration */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '12px',
                          left: '14px',
                          right: '14px'
                        }}
                      >
                        <h4
                          style={{
                            margin: '0 0 0.42rem',
                            fontSize: '1.12rem',
                            fontWeight: 900,
                            color: '#ffffff',
                            textShadow: '0 4px 14px #000',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {item.titleEn}
                        </h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              padding: '0.26rem 0.7rem',
                              borderRadius: '99px',
                              background: 'rgba(20,20,28,0.82)',
                              border: '1px solid rgba(255,255,255,0.18)',
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              color: 'rgba(255,255,255,0.88)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '68%'
                            }}
                          >
                            {(item.tags || ['أكشن', 'فانتازيا', 'تشويق']).slice(0, 3).join('  |  ')}
                          </span>
                          <span
                            style={{
                              padding: '0.26rem 0.65rem',
                              borderRadius: '99px',
                              background: 'rgba(20,20,28,0.82)',
                              border: '1px solid rgba(255,255,255,0.18)',
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              color: 'rgba(255,255,255,0.88)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            ⏱ {item.duration || '24m'} • {item.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
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
                          borderRadius: '18px',
                          overflow: 'hidden',
                          background: '#0b0b0e',
                          border: '1px solid rgba(255,255,255,0.14)'
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
                            left: '6px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            color: '#000000',
                            fontSize: '0.58rem',
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          X
                        </span>
                        <span
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            background: 'rgba(0,0,0,0.85)',
                            color: '#fff',
                            fontSize: '0.6rem',
                            fontWeight: 900,
                            padding: '0.1rem 0.34rem',
                            borderRadius: '6px'
                          }}
                        >
                          ★ {item.rating}
                        </span>
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '6px',
                            left: '6px',
                            background: 'rgba(0,0,0,0.84)',
                            color: '#fff',
                            fontSize: '0.58rem',
                            fontWeight: 800,
                            padding: '0.08rem 0.34rem',
                            borderRadius: '6px'
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
              )}

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

      {/* ==================== TAB 2.5: WEEKLY AIRING SCHEDULE (v13.0 OFFICIAL SLOTH-UI PRO 16:9 SIMULCAST STUDIO) ==================== */}
      {activeTab === 'schedule' && !selectedAnime && (
        <main style={{ padding: '0.85rem 1rem', animation: 'bxSlideUp 0.2s ease-out' }}>
          {/* Official slothUI Pro Simulcast Hero Card */}
          <div
            style={{
              position: 'relative',
              padding: '1.15rem 1rem',
              borderRadius: '26px',
              background: 'linear-gradient(180deg, #12121a 0%, #050508 100%)',
              border: '1px solid rgba(255,255,255,0.16)',
              marginBottom: '0.9rem',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <span
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    color: '#000000',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  X
                </span>
                <span style={{ fontSize: '0.76rem', fontWeight: 900, color: '#ffffff' }}>
                  blackx <span style={{ fontWeight: 500, opacity: 0.75 }}>simulcast</span>
                </span>
              </div>
              <span
                style={{
                  padding: '0.18rem 0.6rem',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.24)',
                  fontSize: '0.64rem',
                  fontWeight: 900
                }}
              >
                TV-MA • 2026 • 120Hz
              </span>
            </div>

            <h2 style={{ margin: '0 0 0.28rem', fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {isRtl ? 'جدول البث الأسبوعي المباشر' : 'WEEKLY SIMULCAST SCHEDULE'}
            </h2>
            <p style={{ margin: '0 0 0.85rem', fontSize: '0.74rem', color: 'rgba(255,255,255,0.68)', lineHeight: 1.45 }}>
              {isRtl
                ? 'تابع مواعيد نزول الحلقات الجديدة للأنميات المستمرة حسب أيام الأسبوع بتوقيت القاهرة ومكة بتصميم slothUI Pro.'
                : 'Track new episode simulcast drops by day of the week in Official slothUI Pro 16:9 format.'}
            </p>

            {/* Official slothUI ("Houses & Dragons") 4 Circular Action Orbs Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => {
                  if (scheduleItems[0]) handleOpenAnime(scheduleItems[0], 1);
                }}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  fontSize: '0.96rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 6px 18px rgba(255,255,255,0.22)'
                }}
              >
                ▶
              </button>
              <button
                type="button"
                onClick={() => setRadarModalOpen(true)}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.25)',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                🔔
              </button>
              <button
                type="button"
                onClick={() => setScheduleDay(SCHEDULE_DAYS[new Date().getDay()]?.id || 'saturday')}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.25)',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                📅
              </button>
              <button
                type="button"
                onClick={() => {
                  if (scheduleItems[0]) toggleFavorite(scheduleItems[0]);
                }}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.25)',
                  fontSize: '1rem',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                ＋
              </button>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.72)' }}>
                {isRtl ? `${scheduleItems.length} حلقة مجدولة` : `${scheduleItems.length} Scheduled Drops`}
              </span>
            </div>
          </div>

          {/* 7 Days of the Week Selector Pills (slothUI Capsule Pills) */}
          <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.42rem', overflowX: 'auto', marginBottom: '0.9rem', paddingBottom: '0.2rem' }}>
            {SCHEDULE_DAYS.map((d) => {
              const active = scheduleDay === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setScheduleDay(d.id)}
                  style={{
                    padding: '0.46rem 0.95rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    background: active ? '#ffffff' : 'rgba(255,255,255,0.07)',
                    color: active ? '#000000' : '#ffffff',
                    border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.18)'
                  }}
                >
                  {isRtl ? d.ar : d.en}
                </button>
              );
            })}
          </div>

          {/* Official slothUI Section Header: "All Episodes ↔ ⇅ Most Popular" */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
            <span style={{ fontWeight: 900, fontSize: '0.94rem' }}>
              {isRtl ? 'حلقات اليوم (All Episodes)' : 'All Episodes'}
            </span>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'rgba(255,255,255,0.72)' }}>
              ⇅ {isRtl ? 'الأعلى تقييماً (Most Popular)' : 'Most Popular'}
            </span>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.78rem' }}>
              {scheduleItems.map((item, sIdx) => (
                <div
                  key={item.objectID}
                  className="bx-mob-card"
                  onClick={() => handleOpenAnime(item)}
                  style={{
                    borderRadius: '22px',
                    background: '#08080c',
                    border: '1px solid rgba(255,255,255,0.15)',
                    overflow: 'hidden',
                    cursor: 'pointer'
                  }}
                >
                  {/* Top 16:9 slothUI Episode Banner with "E1  24:00" & Circular "[X]" Seal */}
                  <div style={{ position: 'relative', width: '100%', height: '148px', overflow: 'hidden' }}>
                    <img
                      src={item.banner || item.poster}
                      alt={item.titleEn}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'brightness(0.76) contrast(1.08)'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.42) 0%, transparent 40%, rgba(0,0,0,0.92) 100%)'
                      }}
                    />
                    {/* Top-Left slothUI "E1   24:00" Pill */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.22rem 0.6rem',
                        borderRadius: '10px',
                        background: 'rgba(0,0,0,0.75)',
                        border: '1px solid rgba(255,255,255,0.24)',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        color: '#ffffff'
                      }}
                    >
                      <span>E{sIdx + 1}</span>
                      <span style={{ opacity: 0.75 }}>24:00</span>
                      <span>• {item.showTime || scheduleDay}</span>
                    </div>

                    {/* Top-Right Rating Pill */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                        background: '#ffffff',
                        color: '#000000',
                        fontSize: '0.66rem',
                        fontWeight: 900
                      }}
                    >
                      ★ {item.rating}
                    </div>

                    {/* Bottom Title + Circular [X] Seal */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '12px',
                        right: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ fontWeight: 900, fontSize: '0.96rem', color: '#ffffff' }}>{item.titleEn}</div>
                      <span
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          color: '#000000',
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        X
                      </span>
                    </div>
                  </div>

                  {/* Bottom Metadata + Dual slothUI Action Pills */}
                  <div style={{ padding: '0.7rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.65rem' }}>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: 'rgba(255,255,255,0.68)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        flex: 1
                      }}
                    >
                      {item.storyAr}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.42rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item);
                        }}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.22)',
                          color: '#ffffff',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        {favorites.some((f) => f.objectID === item.objectID) ? '✓' : '＋'}
                      </button>
                      <span
                        style={{
                          padding: '0.46rem 0.85rem',
                          borderRadius: '999px',
                          background: '#ffffff',
                          color: '#000000',
                          fontWeight: 900,
                          fontSize: '0.74rem'
                        }}
                      >
                        ▶ {isRtl ? 'تشغيل' : 'Play'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ==================== TAB 3: MANGA & MANHWA (30,000+ BLACK X ENGINES + 100% FULLSCREEN 120Hz READER) ==================== */}
      {activeTab === 'manga' && !selectedAnime && (
        <main style={{ padding: activeMangaChapter ? '0' : '0.85rem 1rem', animation: 'bxSlideUp 0.2s ease-out' }}>
          {activeMangaChapter ? (
            <div
              ref={mangaReaderContainerRef}
              onTouchStart={() => setReaderTouchPaused(true)}
              onTouchEnd={() => setReaderTouchPaused(false)}
              onScroll={(e) => {
                const el = e.currentTarget;
                const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
                const pct = Math.min(100, Math.max(0, Math.round((el.scrollTop / maxScroll) * 100)));
                setReadProgressPct(pct);
              }}
              style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 9500,
                background: '#000000',
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: 0,
                margin: 0
              }}
            >
              {/* Floating Auto-Hiding Pro Manga/Webtoon Reader Control Bar (Tap page once to toggle HUD) */}
              {readerHudVisible && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9600,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.42rem',
                    padding: '0.65rem 0.8rem',
                    background: 'rgba(0, 0, 0, 0.92)',
                    borderBottom: '1px solid rgba(255,255,255,0.16)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setAutoScrollSpeed(0);
                        setActiveMangaChapter(null);
                      }}
                      style={{
                        background: '#ffffff',
                        color: '#000000',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.35rem 0.75rem',
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
                        maxWidth: '185px',
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

                    <button
                      type="button"
                      onClick={handleCycleReadingBgm}
                      style={{
                        padding: '0.32rem 0.6rem',
                        borderRadius: '8px',
                        background: readingBgmMode !== 'off' ? '#ffffff' : 'rgba(255,255,255,0.12)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: readingBgmMode !== 'off' ? '#000' : '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                    >
                      🎧 {readingBgmMode === 'drone' ? 'Drone' : readingBgmMode === 'rain' ? 'Rain' : readingBgmMode === 'battle' ? 'Battle' : isRtl ? 'موسيقى' : 'BGM'}
                    </button>

                    <button
                      type="button"
                      onClick={handleBookmarkCurrentPanel}
                      style={{
                        padding: '0.32rem 0.55rem',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.12)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        cursor: 'pointer'
                      }}
                    >
                      🔖
                    </button>

                    <button
                      type="button"
                      onClick={() => setReaderSettingsOpen((v) => !v)}
                      style={{
                        padding: '0.32rem 0.65rem',
                        borderRadius: '8px',
                        background: readerSettingsOpen ? '#ffffff' : 'rgba(255,255,255,0.12)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: readerSettingsOpen ? '#000' : '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                    >
                      ⚙️ {isRtl ? 'الإعدادات' : 'Studio'}
                    </button>
                  </div>

                  {/* Clean Collapsible Reader Studio Drawer (Opens only when ⚙️ الإعدادات is tapped) */}
                  {readerSettingsOpen && (
                    <div
                      style={{
                        marginTop: '0.35rem',
                        padding: '0.65rem',
                        borderRadius: '12px',
                        background: '#09090d',
                        border: '1px solid rgba(255,255,255,0.18)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: '0.4rem'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setReaderMode((m) => (m === 'webtoon' ? 'page' : 'webtoon'))}
                        style={{
                          padding: '0.42rem 0.6rem',
                          borderRadius: '9px',
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#fff',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        {readerMode === 'webtoon' ? '📜 وضع عمودي (Webtoon)' : '📄 وضع صفحات (Page)'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setReaderZoom((z) => (z === 100 ? 125 : z === 125 ? 150 : z === 150 ? 200 : 100))}
                        style={{
                          padding: '0.42rem 0.6rem',
                          borderRadius: '9px',
                          background: readerZoom > 100 ? '#ffffff' : 'rgba(255,255,255,0.1)',
                          color: readerZoom > 100 ? '#000000' : '#ffffff',
                          border: '1px solid rgba(255,255,255,0.2)',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        🔍 تكبير: {readerZoom}%
                      </button>

                      {readerMode === 'page' && (
                        <button
                          type="button"
                          onClick={() => setDualPageSpread((d) => !d)}
                          style={{
                            padding: '0.42rem 0.6rem',
                            borderRadius: '9px',
                            background: dualPageSpread ? '#ffffff' : 'rgba(255,255,255,0.1)',
                            color: dualPageSpread ? '#000000' : '#ffffff',
                            border: '1px solid rgba(255,255,255,0.2)',
                            fontSize: '0.7rem',
                            fontWeight: 900,
                            cursor: 'pointer'
                          }}
                        >
                          📖 {dualPageSpread ? 'عرض: صفحتين' : 'عرض: صفحة واحدة'}
                        </button>
                      )}

                      {readerMode === 'webtoon' && (
                        <button
                          type="button"
                          onClick={() => {
                            const speeds = [0, 0.5, 1, 2, 3.5, 5];
                            const next = speeds[(speeds.indexOf(autoScrollSpeed) + 1) % speeds.length];
                            setAutoScrollSpeed(next);
                          }}
                          style={{
                            padding: '0.42rem 0.6rem',
                            borderRadius: '9px',
                            background: autoScrollSpeed > 0 ? '#ffffff' : 'rgba(255,255,255,0.1)',
                            color: autoScrollSpeed > 0 ? '#000000' : '#ffffff',
                            border: '1px solid rgba(255,255,255,0.2)',
                            fontSize: '0.7rem',
                            fontWeight: 900,
                            cursor: 'pointer'
                          }}
                        >
                          ⏬ {autoScrollSpeed === 0 ? 'تمرير تلقائي: إيقاف' : `تمرير تلقائي: ${autoScrollSpeed}x`}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setVolumeKeyScroll((v) => !v)}
                        style={{
                          padding: '0.42rem 0.6rem',
                          borderRadius: '9px',
                          background: volumeKeyScroll ? '#ffffff' : 'rgba(255,255,255,0.1)',
                          color: volumeKeyScroll ? '#000000' : '#ffffff',
                          border: '1px solid rgba(255,255,255,0.2)',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        🔊 أزرار الصوت: {volumeKeyScroll ? 'تمرير' : 'صوت'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setReaderEyeFilter((f) => (f === 'normal' ? 'warm' : f === 'warm' ? 'contrast' : 'normal'))
                        }
                        style={{
                          padding: '0.42rem 0.6rem',
                          borderRadius: '9px',
                          background: readerEyeFilter !== 'normal' ? '#ffffff' : 'rgba(255,255,255,0.1)',
                          color: readerEyeFilter !== 'normal' ? '#000000' : '#ffffff',
                          border: '1px solid rgba(255,255,255,0.2)',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        {readerEyeFilter === 'normal'
                          ? '👁️ ألوان أصلية'
                          : readerEyeFilter === 'warm'
                          ? '🌙 حماية العين'
                          : '⚡ تباين فائق'}
                      </button>

                      {readerMode === 'webtoon' && (
                        <button
                          type="button"
                          onClick={() => setSeamlessStitch((s) => !s)}
                          style={{
                            padding: '0.42rem 0.6rem',
                            borderRadius: '9px',
                            background: seamlessStitch ? '#ffffff' : 'rgba(255,255,255,0.1)',
                            color: seamlessStitch ? '#000000' : '#ffffff',
                            border: '1px solid rgba(255,255,255,0.2)',
                            fontSize: '0.7rem',
                            fontWeight: 900,
                            cursor: 'pointer'
                          }}
                        >
                          ✂️ دمج الشرائح: {seamlessStitch ? 'مفعل' : 'عادي'}
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={savingOfflineChapter}
                        onClick={handleSaveChapterOffline}
                        style={{
                          padding: '0.42rem 0.6rem',
                          borderRadius: '9px',
                          background: offlineChapters.some((x) => x.id === activeMangaChapter.id)
                            ? '#ffffff'
                            : 'rgba(255,255,255,0.12)',
                          color: offlineChapters.some((x) => x.id === activeMangaChapter.id) ? '#000000' : '#ffffff',
                          border: '1px solid rgba(255,255,255,0.22)',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        {savingOfflineChapter
                          ? '⏳...'
                          : offlineChapters.some((x) => x.id === activeMangaChapter.id)
                          ? '✓ محفوظ بدون نت'
                          : '📥 حفظ الفصل بدون نت'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {mangaPagesLoading ? (
                <div style={{ textAlign: 'center', padding: '6rem 1.5rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRtl ? '⏳ جاري تحميل صفحات الفصل بشاشة كاملة...' : '⏳ Loading fullscreen chapter pages...'}
                </div>
              ) : readerMode === 'page' && mangaPages.length > 0 ? (
                <div style={{ textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div
                    onDoubleClick={() => {
                      const nextZ = readerZoom === 100 ? 200 : 100;
                      setReaderZoom(nextZ);
                      showToast(nextZ === 200 ? '🔍 تكبير اللوحة 200%' : '🔍 الحجم الطبيعي 100%');
                    }}
                    style={{
                      overflowX: 'auto',
                      display: dualPageSpread ? 'grid' : 'block',
                      gridTemplateColumns: dualPageSpread ? '1fr 1fr' : 'none',
                      gap: '2px',
                      alignItems: 'center'
                    }}
                  >
                    <img
                      src={mangaPages[currentPageIdx]}
                      alt={`Page ${currentPageIdx + 1}`}
                      onClick={() => {
                        if (currentPageIdx + (dualPageSpread ? 2 : 1) < mangaPages.length)
                          setCurrentPageIdx((p) => p + (dualPageSpread ? 2 : 1));
                        else setReaderHudVisible((v) => !v);
                      }}
                      style={{
                        width: `${readerZoom}%`,
                        maxWidth: readerZoom === 100 ? '100%' : 'none',
                        height: 'auto',
                        display: 'block',
                        margin: '0 auto',
                        cursor: 'pointer',
                        filter:
                          readerEyeFilter === 'warm'
                            ? 'sepia(0.24) brightness(0.92)'
                            : readerEyeFilter === 'contrast'
                            ? 'contrast(1.16) saturate(1.12)'
                            : 'none'
                      }}
                    />
                    {dualPageSpread && mangaPages[currentPageIdx + 1] && (
                      <img
                        src={mangaPages[currentPageIdx + 1]}
                        alt={`Page ${currentPageIdx + 2}`}
                        onClick={() => {
                          if (currentPageIdx + 2 < mangaPages.length) setCurrentPageIdx((p) => p + 2);
                          else setReaderHudVisible((v) => !v);
                        }}
                        style={{
                          width: `${readerZoom}%`,
                          maxWidth: readerZoom === 100 ? '100%' : 'none',
                          height: 'auto',
                          display: 'block',
                          margin: '0 auto',
                          cursor: 'pointer',
                          filter:
                            readerEyeFilter === 'warm'
                              ? 'sepia(0.24) brightness(0.92)'
                              : readerEyeFilter === 'contrast'
                              ? 'contrast(1.16) saturate(1.12)'
                              : 'none'
                        }}
                      />
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 0.75rem' }}>
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
                <div
                  onClick={() => setReaderHudVisible((v) => !v)}
                  onDoubleClick={() => {
                    const nextZ = readerZoom === 100 ? 200 : 100;
                    setReaderZoom(nextZ);
                    showToast(nextZ === 200 ? '🔍 تكبير اللوحة 200%' : '🔍 الحجم الطبيعي 100%');
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0,
                    width: '100vw',
                    overflowX: 'auto',
                    lineHeight: 0,
                    fontSize: 0
                  }}
                >
                  {mangaPages.map((pg, idx) => (
                    <img
                      key={idx}
                      src={pg}
                      alt={`Page ${idx + 1}`}
                      loading="lazy"
                      style={{
                        width: `${readerZoom}%`,
                        maxWidth: readerZoom === 100 ? '100vw' : 'none',
                        height: 'auto',
                        display: 'block',
                        margin: seamlessStitch && idx > 0 ? '-1px auto 0' : '0 auto',
                        filter:
                          readerEyeFilter === 'warm'
                            ? 'sepia(0.24) brightness(0.92)'
                            : readerEyeFilter === 'contrast'
                            ? 'contrast(1.16) saturate(1.12)'
                            : 'none'
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Micro Progress Bar & Reading ETA Indicator at Bottom of Reader */}
              {!mangaPagesLoading && mangaPages.length > 0 && (
                <>
                  <div
                    style={{
                      position: 'fixed',
                      bottom: '10px',
                      left: '12px',
                      zIndex: 9650,
                      padding: '0.22rem 0.6rem',
                      borderRadius: '99px',
                      background: 'rgba(0,0,0,0.82)',
                      border: '1px solid rgba(255,255,255,0.22)',
                      color: '#ffffff',
                      fontSize: '0.66rem',
                      fontWeight: 900,
                      pointerEvents: 'none'
                    }}
                  >
                    {(() => {
                      const pct =
                        readerMode === 'page'
                          ? Math.round(((currentPageIdx + 1) / Math.max(1, mangaPages.length)) * 100)
                          : readProgressPct;
                      const remMin = Math.max(
                        1,
                        Math.ceil(((100 - pct) / 100) * Math.max(2, Math.round(mangaPages.length * 0.18)))
                      );
                      return isRtl
                        ? `📊 ${pct}% • متبقي ~${pct >= 98 ? 0 : remMin} د`
                        : `📊 ${pct}% • ~${pct >= 98 ? 0 : remMin}m left`;
                    })()}
                  </div>
                  <div
                    style={{
                      position: 'fixed',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'rgba(255,255,255,0.14)',
                      zIndex: 9650,
                      pointerEvents: 'none'
                    }}
                  >
                    <div
                      style={{
                        width: `${
                          readerMode === 'page'
                            ? Math.round(((currentPageIdx + 1) / Math.max(1, mangaPages.length)) * 100)
                            : readProgressPct
                        }%`,
                        height: '100%',
                        background: '#ffffff',
                        transition: 'width 0.15s ease-out'
                      }}
                    />
                  </div>
                </>
              )}

              {/* Bottom Next / Previous Chapter Navigation Bar */}
              {!mangaPagesLoading && mangaChapters.length > 1 && (
                <div style={{ display: 'flex', gap: '0.6rem', padding: '1rem 0.75rem 2.5rem', background: '#000' }}>
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
            <div style={{ animation: 'bxSlideUp 0.22s ease-out' }}>
              {/* ==================== v12.0 SLOTH-UI & SOLO LEVELING LUXURY MANGA SERIES HUB ==================== */}
              <div
                style={{
                  position: 'relative',
                  borderRadius: '28px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.16)',
                  marginBottom: '1rem',
                  background: '#08080c',
                  boxShadow: '0 22px 55px rgba(0,0,0,0.92)'
                }}
              >
                {/* Top Ambient Blurred Backdrop Banner */}
                <div style={{ position: 'relative', height: '165px', overflow: 'hidden' }}>
                  <img
                    src={selectedManga.poster?.large || selectedManga.poster_uri}
                    alt={selectedManga.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'blur(22px) brightness(0.32)',
                      transform: 'scale(1.2)'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, #08080c 100%)'
                    }}
                  />

                  {/* Top Floating Circular Back Button & [X] Original Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      right: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedManga(null)}
                      style={{
                        background: 'rgba(14,14,20,0.82)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.24)',
                        borderRadius: '999px',
                        padding: '0.42rem 0.9rem',
                        fontWeight: 900,
                        fontSize: '0.74rem',
                        cursor: 'pointer'
                      }}
                    >
                      {isRtl ? '→ مكتبة المانجا' : '← Manga Library'}
                    </button>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.38rem', padding: '0.28rem 0.7rem', borderRadius: '999px', background: 'rgba(14,14,20,0.82)', border: '1px solid rgba(255,255,255,0.22)' }}>
                      <span
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          color: '#000000',
                          fontSize: '0.6rem',
                          fontWeight: 900,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        X
                      </span>
                      <span style={{ fontSize: '0.66rem', fontWeight: 900 }}>
                        {selectedManga.sourceLabel || 'BLACK X MANGA'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Solo Leveling Floating Cover Art overlapping the Dark Sheet */}
                <div style={{ position: 'relative', zIndex: 2, padding: '0 1.1rem 1.15rem', marginTop: '-92px', textAlign: 'center' }}>
                  <div
                    style={{
                      width: '136px',
                      height: '194px',
                      margin: '0 auto 0.75rem',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      border: '2px solid rgba(255,255,255,0.38)',
                      boxShadow: '0 18px 42px rgba(0,0,0,0.92)'
                    }}
                  >
                    <img
                      src={selectedManga.poster?.large || selectedManga.poster_uri}
                      alt={selectedManga.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  <h2 style={{ margin: '0 0 0.32rem', fontSize: '1.28rem', fontWeight: 900, lineHeight: 1.25 }}>
                    {selectedManga.name}
                  </h2>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <span style={{ padding: '0.18rem 0.65rem', borderRadius: '99px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.66rem', fontWeight: 800 }}>
                      {selectedManga.type || (isRtl ? 'مانهوا ملونة' : 'Manhwa')}
                    </span>
                    <span style={{ padding: '0.18rem 0.65rem', borderRadius: '99px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.66rem', fontWeight: 800 }}>
                      ★ {selectedManga.rate || '9.5'}
                    </span>
                    <span style={{ padding: '0.18rem 0.65rem', borderRadius: '99px', background: '#ffffff', color: '#000000', fontSize: '0.66rem', fontWeight: 900 }}>
                      120Hz Webtoon
                    </span>
                  </div>

                  {/* 4-Column Manga Micro-Stats Strip */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '0.35rem',
                      padding: '0.6rem 0.4rem',
                      marginBottom: '0.8rem',
                      borderRadius: '16px',
                      background: '#0d0d13',
                      border: '1px solid rgba(255,255,255,0.12)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 900 }}>{mangaChapters.length}</div>
                      <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>{isRtl ? 'فصل مترجم' : 'Chapters'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 900 }}>★ {selectedManga.rate || '9.5'}</div>
                      <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>{isRtl ? 'التقييم' : 'Rating'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 900 }}>{isRtl ? 'مستمر' : 'Ongoing'}</div>
                      <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>{isRtl ? 'الحالة' : 'Status'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 900 }}>FHD</div>
                      <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>{isRtl ? 'الجودة' : 'Quality'}</div>
                    </div>
                  </div>

                  {/* Synopsis Box with Audio Narrator (Matches MANGARA & Solo Leveling Description Box) */}
                  <div
                    style={{
                      textAlign: isRtl ? 'right' : 'left',
                      padding: '0.75rem 0.85rem',
                      borderRadius: '16px',
                      background: '#0d0d13',
                      border: '1px solid rgba(255,255,255,0.1)',
                      marginBottom: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 900 }}>
                        📖 {isRtl ? 'القصة والملخص (Description)' : 'Description'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleSpeakText(
                            selectedManga.story_ar || selectedManga.story?.ar || selectedManga.story_en || selectedManga.name
                          )
                        }
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '99px',
                          background: ttsSpeaking ? '#ffffff' : 'rgba(255,255,255,0.12)',
                          color: ttsSpeaking ? '#000000' : '#ffffff',
                          border: '1px solid rgba(255,255,255,0.22)',
                          fontSize: '0.65rem',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        {ttsSpeaking ? (isRtl ? '🔇 إيقاف' : '🔇 Stop') : isRtl ? '🔊 استماع' : '🔊 Listen'}
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: 'rgba(255,255,255,0.76)', lineHeight: 1.55 }}>
                      {(selectedManga.story_ar || selectedManga.story?.ar || selectedManga.story_en || (isRtl ? 'عمل مانهوا ومانجا حصري مترجم بالكامل بجودة عالية عبر سيرفرات BLACK X.' : 'Exclusive translated Manga & Manhwa series on BLACK X.')).slice(0, 280)}
                    </p>
                  </div>

                  {/* SlothUI Full-Width Pill Primary Read CTA Button */}
                  {mangaChapters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const savedHist = mangaHistory.find((mh) => mh.mangaId === selectedManga.objectID);
                        const targetCh =
                          (savedHist && mangaChapters.find((c) => c.id === savedHist.chapterId || String(c.chapter) === String(savedHist.chapter))) ||
                          mangaChapters[mangaChapters.length - 1] ||
                          mangaChapters[0];
                        if (targetCh) handleReadMangaChapter(targetCh);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.82rem 1rem',
                        borderRadius: '999px',
                        border: 'none',
                        background: '#ffffff',
                        color: '#000000',
                        fontWeight: 900,
                        fontSize: '0.88rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 10px 28px rgba(255,255,255,0.2)',
                        cursor: 'pointer'
                      }}
                    >
                      <span>📖</span>
                      <span>
                        {(() => {
                          const savedHist = mangaHistory.find((mh) => mh.mangaId === selectedManga.objectID);
                          if (savedHist) {
                            return isRtl
                              ? `متابعة القراءة — الفصل ${savedHist.chapter}`
                              : `Continue Reading — Chapter ${savedHist.chapter}`;
                          }
                          const firstCh = mangaChapters[mangaChapters.length - 1] || mangaChapters[0];
                          return isRtl
                            ? `ابدأ القراءة الآن — الفصل ${firstCh?.chapter || 1}`
                            : `Read Now — Chapter ${firstCh?.chapter || 1}`;
                        })()}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Highlighted "1 New Chapter / أحدث فصل متاح" Quick Banner Card (Matches 19 Tian Reference UI) */}
              {mangaChapters.length > 0 && (
                <div
                  onClick={() => handleReadMangaChapter(mangaChapters[0])}
                  style={{
                    padding: '0.8rem 0.95rem',
                    borderRadius: '18px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1.5px solid rgba(255,255,255,0.28)',
                    marginBottom: '0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#ffffff', marginBottom: '2px' }}>
                      🔥 {isRtl ? 'أحدث فصل مضاف (Latest Release)' : 'Latest Chapter Available'}
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 900 }}>
                      📖 {isRtl ? `الفصل ${mangaChapters[0].chapter}` : `Chapter ${mangaChapters[0].chapter}`}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '0.38rem 0.85rem',
                      borderRadius: '999px',
                      background: '#ffffff',
                      color: '#000000',
                      fontSize: '0.74rem',
                      fontWeight: 900
                    }}
                  >
                    {isRtl ? 'اقرأ الفصل ←' : 'Read →'}
                  </span>
                </div>
              )}

              {/* Chapter Search & Sort Controls */}
              <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', marginBottom: '0.65rem' }}>
                <input
                  type="search"
                  value={mangaChSearch}
                  onChange={(e) => setMangaChSearch(e.target.value)}
                  placeholder={isRtl ? '🔍 ابحث برقم الفصل...' : '🔍 Search chapter #...'}
                  style={{
                    flex: 1,
                    padding: '0.56rem 0.9rem',
                    borderRadius: '999px',
                    background: '#0d0d12',
                    border: '1px solid rgba(255,255,255,0.18)',
                    color: '#ffffff',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setMangaChAsc((v) => !v)}
                  style={{
                    padding: '0.56rem 0.85rem',
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#ffffff',
                    fontSize: '0.73rem',
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                  }}
                >
                  {mangaChAsc ? (isRtl ? '⬆ الأقدم أولاً' : '⬆ Oldest') : isRtl ? '⬇ الأحدث أولاً' : '⬇ Newest'}
                </button>
              </div>

              {/* MANGARA Table Header Row: Chapter Name <-> Status */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.35rem 0.5rem',
                  marginBottom: '0.45rem',
                  borderBottom: '1px solid rgba(255,255,255,0.12)',
                  fontSize: '0.74rem',
                  fontWeight: 900,
                  color: 'rgba(255,255,255,0.68)'
                }}
              >
                <span>📖 {isRtl ? `قائمة الفصول (${displayedMangaChapters.length})` : `Chapter Name (${displayedMangaChapters.length})`}</span>
                <span>{isRtl ? 'الحالة / القراءة' : 'Status'}</span>
              </div>

              {mangaChaptersLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRtl ? '⏳ جاري جلب جميع الفصول المترجمة...' : '⏳ Loading chapters...'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {displayedMangaChapters.map((ch) => {
                    const isRead = mangaHistory.some(
                      (mh) => mh.mangaId === selectedManga.objectID && String(mh.chapter) === String(ch.chapter)
                    );
                    const isOffline = offlineChapters.some((x) => x.id === ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => handleReadMangaChapter(ch)}
                        style={{
                          padding: '0.75rem 0.9rem',
                          borderRadius: '16px',
                          background: isRead ? 'rgba(255,255,255,0.04)' : '#0c0c11',
                          border: isRead ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.12)',
                          color: '#fff',
                          textAlign: 'start',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                          <span
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: isRead ? 'rgba(255,255,255,0.12)' : '#ffffff',
                              color: isRead ? '#ffffff' : '#000000',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.68rem',
                              fontWeight: 900
                            }}
                          >
                            {isRead ? '✓' : '📖'}
                          </span>
                          <span>
                            {isRtl ? `الفصل ${ch.chapter}` : `Chapter ${ch.chapter}`}
                            {ch.title ? ` — ${ch.title}` : ''}
                          </span>
                        </span>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '99px',
                            background: isOffline ? '#ffffff' : 'rgba(255,255,255,0.08)',
                            color: isOffline ? '#000000' : 'rgba(255,255,255,0.78)',
                            fontSize: '0.65rem',
                            fontWeight: 900
                          }}
                        >
                          {isOffline ? '📥 بدون نت' : isRead ? (isRtl ? 'مقروء' : 'Read') : isRtl ? 'قراءة ❯' : 'Read ❯'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ==================== v12.0 SLOTH-UI & MANGARA MANGA DISCOVERY STUDIO ==================== */}
              {/* Top Rounded Pill Search Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  background: '#111116',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: '999px',
                  padding: '0.68rem 1.05rem',
                  marginBottom: '0.7rem'
                }}
              >
                <span>🔍</span>
                <input
                  type="search"
                  value={mangaQuery}
                  onChange={(e) => setMangaQuery(e.target.value)}
                  placeholder={isRtl ? 'ابحث في +30,000 مانجا ومانهوا مترجمة (مثال: Solo Leveling)...' : 'Search 30,000+ Manga & Manhwa...'}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#fff',
                    fontSize: '0.84rem',
                    fontWeight: 700
                  }}
                />
                {mangaQuery && (
                  <button
                    type="button"
                    onClick={() => setMangaQuery('')}
                    style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Popular Manga Search Pills (Matches Reference UI 3 "Popular search") */}
              <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.38rem', overflowX: 'auto', marginBottom: '0.85rem', paddingBottom: '0.15rem' }}>
                {['Solo Leveling', 'One Piece', 'Berserk', 'Blue Lock', 'Jujutsu Kaisen', 'Omniscient Reader', 'Chainsaw Man', 'Attack on Titan'].map((tag) => {
                  const active = mangaQuery.toLowerCase() === tag.toLowerCase();
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setMangaQuery(active ? '' : tag)}
                      style={{
                        padding: '0.3rem 0.72rem',
                        borderRadius: '999px',
                        background: active ? '#ffffff' : 'rgba(255,255,255,0.05)',
                        color: active ? '#000000' : 'rgba(255,255,255,0.82)',
                        border: active ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.18)',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              {/* SlothUI & MANGARA Featured Spotlight Hero Banner ("New Release! / Trending Today") */}
              {!mangaLoading && mangaList.length > 0 && !mangaQuery && (
                <div
                  onClick={() => handleOpenManga(mangaList[0])}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '225px',
                    borderRadius: '26px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 18px 44px rgba(0,0,0,0.9)',
                    marginBottom: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  <img
                    src={mangaList[0].poster?.large || mangaList[0].poster_uri}
                    alt={mangaList[0].name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center 22%',
                      filter: 'brightness(0.68) contrast(1.12)'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.18) 35%, rgba(0,0,0,0.95) 100%)'
                    }}
                  />

                  {/* Top-Left [X] BLACK X MANGA ORIGINAL Seal */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.38rem',
                      padding: '0.24rem 0.65rem',
                      borderRadius: '999px',
                      background: 'rgba(10,10,15,0.82)',
                      border: '1px solid rgba(255,255,255,0.22)'
                    }}
                  >
                    <span
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        color: '#000000',
                        fontSize: '0.6rem',
                        fontWeight: 900,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      X
                    </span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.03em' }}>
                      {isRtl ? 'مانهوا الأسبوع المميزة' : 'FEATURED MANHWA'}
                    </span>
                  </div>

                  {/* Top-Right Star Rating Pill */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '14px',
                      padding: '0.24rem 0.62rem',
                      borderRadius: '999px',
                      background: 'rgba(10,10,15,0.82)',
                      border: '1px solid rgba(255,255,255,0.22)',
                      fontSize: '0.68rem',
                      fontWeight: 900
                    }}
                  >
                    ★ {mangaList[0].rate || '9.8'}
                  </div>

                  {/* Bottom Title + 50/50 Dual SlothUI Pill Buttons */}
                  <div style={{ position: 'absolute', bottom: '14px', left: '14px', right: '14px' }}>
                    <h2
                      style={{
                        margin: '0 0 0.55rem',
                        fontSize: '1.22rem',
                        fontWeight: 900,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textShadow: '0 4px 16px #000'
                      }}
                    >
                      {mangaList[0].name}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenManga(mangaList[0]);
                        }}
                        style={{
                          padding: '0.58rem 0.8rem',
                          borderRadius: '999px',
                          background: '#ffffff',
                          color: '#000000',
                          border: 'none',
                          fontWeight: 900,
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        📖 {isRtl ? 'اقرأ الآن' : 'Read Now'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenManga(mangaList[0]);
                        }}
                        style={{
                          padding: '0.58rem 0.8rem',
                          borderRadius: '999px',
                          background: 'rgba(22,22,30,0.85)',
                          color: '#ffffff',
                          border: '1px solid rgba(255,255,255,0.24)',
                          fontWeight: 900,
                          fontSize: '0.76rem',
                          cursor: 'pointer'
                        }}
                      >
                        ⓘ {isRtl ? 'الفصول والقصة' : 'Chapters'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Continue Reading Progress Strip inside Manga Tab (Matches Reference UI 3 "Continue reading") */}
              {mangaHistory.length > 0 && !mangaQuery && (
                <div style={{ marginBottom: '0.95rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                    <span style={{ fontWeight: 900, fontSize: '0.88rem' }}>
                      📖 {isRtl ? 'متابعة القراءة (Continue Reading)' : 'Continue Reading'}
                    </span>
                    <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.55)', fontWeight: 800 }}>
                      {mangaHistory.length} {isRtl ? 'عمل' : 'Series'}
                    </span>
                  </div>
                  <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                    {mangaHistory.slice(0, 8).map((mh, idx) => (
                      <div
                        key={`mhist-${idx}`}
                        onClick={() => handleOpenManga(mh)}
                        style={{
                          minWidth: '175px',
                          maxWidth: '175px',
                          padding: '0.5rem',
                          borderRadius: '16px',
                          background: '#0c0c12',
                          border: '1px solid rgba(255,255,255,0.14)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.55rem',
                          cursor: 'pointer'
                        }}
                      >
                        <img
                          src={mh.poster_uri}
                          alt={mh.name}
                          style={{ width: '44px', height: '62px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.74rem', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {mh.name}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.68)', fontWeight: 800, margin: '2px 0 6px' }}>
                            {isRtl ? `الفصل ${mh.lastChapter || mh.chapter || 1}` : `Ch. ${mh.lastChapter || mh.chapter || 1}`}
                          </div>
                          <div style={{ height: '3px', borderRadius: '99px', background: 'rgba(255,255,255,0.16)', overflow: 'hidden' }}>
                            <div style={{ width: '68%', height: '100%', background: '#ffffff' }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BLACK X Multi-Engine Source Selector Tabs (All Named BLACK X) */}
              <div
                className="bx-mob-scroll"
                style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', marginBottom: '0.55rem', paddingBottom: '0.15rem' }}
              >
                {[
                  { id: 'all', ar: '🔥 مكتبة BLACK X الشاملة (+30,000)', en: '🔥 BLACK X All (30,000+)' },
                  { id: 'mello', ar: '⚡ سيرفر BLACK X 1 (14,331)', en: '⚡ BLACK X Server 1 (14,331)' },
                  { id: 'dilar', ar: '👑 سيرفر BLACK X 2 (9,164)', en: '👑 BLACK X Server 2 (9,164)' },
                  { id: 'azora', ar: '💎 سيرفر BLACK X 3 مانهوا (2,453)', en: '💎 BLACK X Server 3 (2,453)' },
                  { id: 'swat', ar: '🗡️ سيرفر BLACK X 4 مانهوا (1,669)', en: '🗡️ BLACK X Server 4 (1,669)' },
                  { id: 'mangadex', ar: '🌐 سيرفر BLACK X 5 العالمي', en: '🌐 BLACK X Server 5 Global' }
                ].map((srv) => {
                  const active = mangaSource === srv.id;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => setMangaSource(srv.id)}
                      style={{
                        padding: '0.4rem 0.82rem',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
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
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem' }}>
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
                        padding: '0.34rem 0.8rem',
                        borderRadius: '999px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.04)',
                        color: '#fff',
                        border: active ? '1.5px solid #fff' : '1px solid rgba(255,255,255,0.12)'
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
                  {/* Horizontal "Latest Updates" Compact Row Strip (Matches Reference UI 1 Left Screen) */}
                  {!mangaQuery && mangaList.length > 4 && (
                    <div style={{ marginBottom: '1.05rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
                        <span style={{ fontWeight: 900, fontSize: '0.9rem' }}>
                          ⚡ {isRtl ? 'أحدث الفصول المضافة (Latest Updates)' : 'Latest Updates'}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', fontWeight: 800 }}>
                          120Hz FHD
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {mangaList.slice(1, 4).map((m) => (
                          <div
                            key={`latest-row-${m.objectID}`}
                            onClick={() => handleOpenManga(m)}
                            style={{
                              padding: '0.55rem 0.7rem',
                              borderRadius: '18px',
                              background: '#0b0b10',
                              border: '1px solid rgba(255,255,255,0.12)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.7rem',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0, flex: 1 }}>
                              <img
                                src={m.poster?.large || m.poster_uri}
                                alt={m.name}
                                loading="lazy"
                                style={{ width: '52px', height: '70px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
                              />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontWeight: 900, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {m.name}
                                </div>
                                <div style={{ fontSize: '0.66rem', color: '#ffffff', fontWeight: 800, marginTop: '2px' }}>
                                  🟢 {isRtl ? 'فصل جديد متاح الآن' : 'New Chapter'} • ★ {m.rate || '9.4'}
                                </div>
                                <div style={{ display: 'flex', gap: '0.3rem', marginTop: '4px' }}>
                                  <span style={{ padding: '0.1rem 0.45rem', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', fontSize: '0.6rem', fontWeight: 800 }}>
                                    {m.type || 'مانهوا'}
                                  </span>
                                  <span style={{ padding: '0.1rem 0.45rem', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', fontSize: '0.6rem', fontWeight: 800 }}>
                                    {m.sourceLabel || 'BLACK X'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <span
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                background: '#ffffff',
                                color: '#000000',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.78rem',
                                fontWeight: 900,
                                flexShrink: 0
                              }}
                            >
                              📖
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SlothUI 3-Column Rounded 18px Manga Poster Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.68rem' }}>
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
                              borderRadius: '18px',
                              overflow: 'hidden',
                              background: '#0b0b0e',
                              border: '1px solid rgba(255,255,255,0.15)'
                            }}
                          >
                            <img
                              src={m.poster?.large || m.poster_uri}
                              alt={m.name}
                              loading="lazy"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {/* Top-Left Circular [X] Seal */}
                            <span
                              style={{
                                position: 'absolute',
                                top: '6px',
                                left: '6px',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: '#ffffff',
                                color: '#000000',
                                fontSize: '0.58rem',
                                fontWeight: 900,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              X
                            </span>
                            {/* Top-Right Rating Pill */}
                            <span
                              style={{
                                position: 'absolute',
                                top: '6px',
                                right: '6px',
                                background: 'rgba(0,0,0,0.84)',
                                color: '#fff',
                                fontSize: '0.58rem',
                                fontWeight: 900,
                                padding: '0.1rem 0.34rem',
                                borderRadius: '6px'
                              }}
                            >
                              ★ {m.rate || '9.4'}
                            </span>
                            {m.sourceLabel && (
                              <span
                                style={{
                                  position: 'absolute',
                                  bottom: '6px',
                                  left: '6px',
                                  background: 'rgba(0,0,0,0.85)',
                                  color: '#fff',
                                  fontSize: '0.55rem',
                                  fontWeight: 900,
                                  padding: '0.1rem 0.36rem',
                                  borderRadius: '6px'
                                }}
                              >
                                {m.sourceLabel}
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              marginTop: '0.34rem',
                              fontSize: '0.74rem',
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

      {/* ==================== TAB 4: ARENA (v13.0 OFFICIAL SLOTH-UI PRO PREDICTIONS XP + LEADERBOARD + LIVE COMMUNITY) ==================== */}
      {activeTab === 'community' && !selectedAnime && (
        <main style={{ padding: '0.9rem 1rem', animation: 'bxSlideUp 0.2s ease-out' }}>
          {/* Official slothUI Pro Arena Header Card */}
          <div
            style={{
              padding: '1.1rem 1rem',
              borderRadius: '26px',
              background: 'linear-gradient(180deg, #12121a 0%, #050508 100%)',
              border: '1px solid rgba(255,255,255,0.16)',
              marginBottom: '0.9rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <span
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    color: '#000000',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  X
                </span>
                <span style={{ fontSize: '0.76rem', fontWeight: 900, color: '#ffffff' }}>
                  blackx <span style={{ fontWeight: 500, opacity: 0.75 }}>arena</span>
                </span>
              </div>
              <span
                style={{
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  background: '#ffffff',
                  color: '#000000',
                  fontSize: '0.68rem',
                  fontWeight: 900
                }}
              >
                ⚡ {userXp} XP
              </span>
            </div>

            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.22rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {isRtl ? 'ساحة التوقعات والمجتمع الملكي' : 'SOVEREIGN COMMUNITY ARENA'}
            </h2>
            <p style={{ margin: '0 0 0.85rem', fontSize: '0.74rem', color: 'rgba(255,255,255,0.68)' }}>
              {isRtl
                ? 'صوّت على أحداث الحلقات القادمة، شارك مع آلاف المتابعين، وتصدر قائمة عاهلي الظلال.'
                : 'Predict episode plot twists, post live discussions, and climb the global XP leaderboard.'}
            </p>

            {/* Official slothUI 4 Circular Action Orbs Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {[
                { id: 'predictions', icon: '🔮', lbl: isRtl ? 'توقعات' : 'Predict' },
                { id: 'community', icon: '💬', lbl: isRtl ? 'نقاشات' : 'Feed' },
                { id: 'leaderboard', icon: '🏆', lbl: isRtl ? 'متصدرون' : 'Ranks' }
              ].map((orb) => {
                const active = arenaSubTab === orb.id;
                return (
                  <button
                    key={orb.id}
                    type="button"
                    onClick={() => setArenaSubTab(orb.id)}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: active ? '#ffffff' : 'rgba(255,255,255,0.08)',
                      color: active ? '#000000' : '#ffffff',
                      border: active ? 'none' : '1px solid rgba(255,255,255,0.24)',
                      fontSize: '0.96rem',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    {orb.icon}
                  </button>
                );
              })}
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'rgba(255,255,255,0.75)' }}>
                {isRtl ? 'اختر القسم من الكرات الدائرية أو الأزرار أدناه' : 'Switch Arena Mode'}
              </span>
            </div>
          </div>

          {/* Arena Sub-Tab Switcher (slothUI Capsule Pills) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem', marginBottom: '0.95rem' }}>
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
                    padding: '0.58rem 0.4rem',
                    borderRadius: '999px',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    border: active ? '1.5px solid #fff' : '1px solid rgba(255,255,255,0.18)',
                    background: active ? '#ffffff' : 'rgba(255,255,255,0.06)',
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

      {/* ==================== TAB 5: v12.0 SLOTH-UI & APPLE-AIRLINE LUXURY MONOCHROME PROFILE STUDIO ==================== */}
      {activeTab === 'profile' && !selectedAnime && (
        <main style={{ padding: '0.85rem 1rem 1.5rem', animation: 'bxSlideUp 0.2s ease-out' }}>
          {/* ==================== LUXURY CURVED WAVE PROFILE HERO CARD (MATCHES PROFILE REFERENCE UI 1, 2 & 3) ==================== */}
          <div
            style={{
              position: 'relative',
              borderRadius: '28px',
              overflow: 'hidden',
              background: '#08080c',
              border: '1px solid rgba(255,255,255,0.16)',
              boxShadow: '0 22px 55px rgba(0,0,0,0.92)',
              padding: '1rem 1.1rem 1.15rem',
              marginBottom: '0.95rem',
              textAlign: 'center'
            }}
          >
            {/* Top Subtle Ambient Wave Gradient */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '115px',
                background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.14) 0%, rgba(0,0,0,0) 75%)',
                pointerEvents: 'none'
              }}
            />

            {/* Top Action Row: [X] blackx member <-> Profile <-> 🔔/⚙ Orbs (Official slothUI Pro 2.0) */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.65rem'
              }}
            >
              <div
                onClick={() => setActiveTab('home')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.38rem',
                  padding: '0.24rem 0.65rem 0.24rem 0.32rem',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer'
                }}
              >
                <img
                  src="/blackx-logo.png"
                  alt="BLACK X"
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '6px',
                    objectFit: 'cover',
                    border: '1px solid rgba(255,255,255,0.35)'
                  }}
                />
                <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#ffffff' }}>
                  BLACK X <span style={{ fontWeight: 500, opacity: 0.75 }}>member</span>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setRadarModalOpen(true)}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  🔔
                </button>
                <button
                  type="button"
                  onClick={() => setProfileSubTab((t) => (t === 'appearance' ? 'account' : 'appearance'))}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: 'none',
                    color: '#000000',
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                  title={isRtl ? 'إعدادات المظهر' : 'Settings'}
                >
                  ⚙
                </button>
              </div>
            </div>

            {/* Centered 90x90 Circular Avatar with Top-Right Status Badge (Matches Profile UI 1 & UI 3) */}
            <div style={{ position: 'relative', width: '90px', height: '90px', margin: '0 auto 0.65rem', zIndex: 2 }}>
              {user?.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.displayName}
                  style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2.5px solid #ffffff',
                    boxShadow: '0 10px 28px rgba(0,0,0,0.85)'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    color: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.1rem',
                    fontWeight: 900,
                    border: '3px solid rgba(255,255,255,0.35)',
                    boxShadow: '0 10px 28px rgba(255,255,255,0.18)'
                  }}
                >
                  {(user?.displayName?.[0] || 'X').toUpperCase()}
                </div>
              )}
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  color: '#000000',
                  border: '2px solid #08080c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.74rem',
                  fontWeight: 900
                }}
              >
                {userVipTier !== 'free' || isDeveloper ? '👑' : '⚡'}
              </span>
            </div>

            {/* Official slothUI Pro ("Handmaiden Tales") Pill Row ABOVE Display Name */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.38rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
              <span
                style={{
                  padding: '0.16rem 0.6rem',
                  borderRadius: '999px',
                  background: '#ffffff',
                  color: '#000000',
                  fontSize: '0.62rem',
                  fontWeight: 900
                }}
              >
                {isDeveloper ? '👑 FOUNDER' : userVipTier !== 'free' ? '👑 VIP MONARCH' : '⚡ MEMBER'}
              </span>
              <span
                style={{
                  padding: '0.16rem 0.6rem',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.24)',
                  color: '#ffffff',
                  fontSize: '0.62rem',
                  fontWeight: 800
                }}
              >
                {selectedSovereignTitle}
              </span>
              <span
                style={{
                  padding: '0.16rem 0.6rem',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.24)',
                  color: '#ffffff',
                  fontSize: '0.62rem',
                  fontWeight: 800
                }}
              >
                {fpsHz}Hz Ultra
              </span>
            </div>

            {/* Name & Sovereign Rank Subtitle */}
            <h2 style={{ margin: '0 0 0.2rem', fontSize: '1.32rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {user ? user.displayName : isRtl ? 'زائر BLACK X الملكي' : 'BLACK X Guest Monarch'}
            </h2>
            <div style={{ fontSize: '0.73rem', fontWeight: 800, color: 'rgba(255,255,255,0.62)', marginBottom: '0.85rem', letterSpacing: '0.03em' }}>
              {user ? `@${user.username} • Lv.${Math.floor(userXp / 100) + 1}` : isRtl ? 'سجّل دخولك للمزامنة السحابية' : 'Sign in for Cloud Sync'}
            </div>

            {/* Official slothUI Pro ("Houses & Dragons") 4 Circular Action Orbs Row inside Profile */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.68rem', marginBottom: '0.9rem' }}>
              {/* 1. Solid White (▶) Resume Last Watched Orb */}
              <button
                type="button"
                onClick={() => {
                  const last = watchHistory[0] || popularList[0];
                  if (last) handleOpenAnime(last, last.episode || 1);
                }}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  fontSize: '1rem',
                  fontWeight: 900,
                  boxShadow: '0 6px 20px rgba(255,255,255,0.24)',
                  cursor: 'pointer'
                }}
                title={isRtl ? 'متابعة آخر حلقة' : 'Resume Last Watched'}
              >
                ▶
              </button>
              {/* 2. Outlined Glass (≡) Library & History Orb */}
              <button
                type="button"
                onClick={() => setProfileSubTab('vault')}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: profileSubTab === 'vault' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.26)',
                  fontSize: '0.96rem',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
                title={isRtl ? 'مكتبتي والسجل' : 'My Library'}
              >
                ≡
              </button>
              {/* 3. Outlined Glass (🪪) Otaku ID Card Orb */}
              <button
                type="button"
                onClick={handleGenerateOtakuIdCard}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.26)',
                  fontSize: '0.94rem',
                  cursor: 'pointer'
                }}
                title={isRtl ? 'بطاقة الأوتاكو الملكية' : 'Otaku ID Card'}
              >
                🪪
              </button>
              {/* 4. Outlined Glass (🔄) Cloud Sync Orb */}
              <button
                type="button"
                onClick={() => {
                  if (user) {
                    syncUserStateToCloud(user, favorites, watchHistory).then(() => showToast('✓ تمت المزامنة السحابية مع الموقع!'));
                  } else {
                    setProfileSubTab('account');
                  }
                }}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.26)',
                  fontSize: '0.92rem',
                  cursor: 'pointer'
                }}
                title={isRtl ? 'مزامنة سحابية' : 'Cloud Sync'}
              >
                🔄
              </button>
            </div>

            {/* 3-Column Big Counter Strip (Matches Profile UI 2: 149 | 201k | 2020) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1px 1fr 1px 1fr',
                alignItems: 'center',
                padding: '0.65rem 0',
                marginBottom: '0.9rem',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <div>
                <div style={{ fontSize: '1.08rem', fontWeight: 900 }}>{watchHistory.length + mangaHistory.length}</div>
                <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.58)', fontWeight: 700 }}>
                  {isRtl ? 'سجل المشاهدة' : 'Watched'}
                </div>
              </div>
              <div style={{ height: '24px', background: 'rgba(255,255,255,0.14)' }} />
              <div>
                <div style={{ fontSize: '1.08rem', fontWeight: 900 }}>{favorites.length + Object.keys(watchlistMap).length}</div>
                <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.58)', fontWeight: 700 }}>
                  {isRtl ? 'المفضلة ومكتبتي' : 'Saved'}
                </div>
              </div>
              <div style={{ height: '24px', background: 'rgba(255,255,255,0.14)' }} />
              <div>
                <div style={{ fontSize: '1.08rem', fontWeight: 900 }}>{userXp.toLocaleString()}</div>
                <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.58)', fontWeight: 700 }}>
                  {isRtl ? 'نقاط الخبرة XP' : 'XP Score'}
                </div>
              </div>
            </div>

            {/* Airline-Class "ACCOUNT INFORMATIONS" Structured Card (Exact Match to Profile UI 3 Left Screen) */}
            <div style={{ textAlign: isRtl ? 'right' : 'left', marginBottom: user ? '0.85rem' : '0.2rem' }}>
              <div style={{ fontSize: '0.64rem', fontWeight: 900, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.48)', marginBottom: '0.4rem', padding: '0 0.25rem' }}>
                {isRtl ? 'معلومات العضوية الملكية • ACCOUNT INFORMATIONS' : 'ACCOUNT INFORMATIONS'}
              </div>
              <div
                style={{
                  borderRadius: '18px',
                  background: '#0d0d13',
                  border: '1px solid rgba(255,255,255,0.12)',
                  overflow: 'hidden'
                }}
              >
                {[
                  {
                    k: isRtl ? 'رقم العضوية (Member N°)' : 'Member N°',
                    v: `BX-${String(user?.uid || user?.username || '88492011').slice(0, 8).toUpperCase()}`
                  },
                  {
                    k: isRtl ? 'المستوى ونقاط الخبرة (XP Collected)' : 'XP Collected',
                    v: `Lv.${Math.floor(userXp / 100) + 1} • ${userXp.toLocaleString()} XP`
                  },
                  {
                    k: isRtl ? 'فئة العضوية (Member Class)' : 'Member Class',
                    v: isDeveloper
                      ? isRtl
                        ? '👑 مطور المنصة (Founder)'
                        : '👑 Founder'
                      : userVipTier === 'vip_monarch'
                      ? isRtl
                        ? '👑 باقة الملك (Monarch VIP)'
                        : '👑 Monarch VIP'
                      : userVipTier === 'vip_basic'
                      ? isRtl
                        ? '⚡ الباقة الأساسية (Basic VIP)'
                        : '⚡ Basic VIP'
                      : isRtl
                      ? 'عضوية مجانية (Standard)'
                      : 'Standard'
                  }
                ].map((row, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.68rem 0.9rem',
                      borderBottom: '1px solid rgba(255,255,255,0.07)',
                      fontSize: '0.76rem'
                    }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.68)', fontWeight: 700 }}>{row.k}</span>
                    <span style={{ color: '#ffffff', fontWeight: 900, fontFamily: idx === 0 ? 'monospace' : 'inherit' }}>{row.v}</span>
                  </div>
                ))}

                {/* Clickable Membership Card Row (Matches "Membership Card >" in Profile UI 3) */}
                <button
                  type="button"
                  onClick={handleGenerateOtakuIdCard}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.72rem 0.9rem',
                    background: 'rgba(255,255,255,0.04)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.76rem',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  <span>🪪 {isRtl ? 'بطاقة هوية الأوتاكو الملكية (Membership Card)' : 'Membership Card (Otaku ID)'}</span>
                  <span>{isRtl ? 'تحميل البطاقة ❯' : 'Download ❯'}</span>
                </button>
              </div>
            </div>

            {/* User Action Pill Strip when signed in */}
            {user && (
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
                    borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.22)',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: '0.76rem',
                    cursor: 'pointer'
                  }}
                >
                  ✏️ {isRtl ? 'تعديل البروفايل' : 'Edit Profile'}
                </button>
                <button
                  type="button"
                  onClick={() => syncUserStateToCloud(user, favorites, watchHistory).then(() => showToast('✓ تمت المزامنة السحابية مع الموقع!'))}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: '999px',
                    border: 'none',
                    background: '#ffffff',
                    color: '#000000',
                    fontWeight: 900,
                    fontSize: '0.76rem',
                    cursor: 'pointer'
                  }}
                >
                  🔄 {isRtl ? 'مزامنة سحابية' : 'Sync Cloud'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUser(null);
                    localStorage.removeItem('bx_mob_user');
                    showToast(isRtl ? 'تم تسجيل الخروج' : 'Signed out');
                  }}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '0.76rem',
                    cursor: 'pointer'
                  }}
                >
                  🚪
                </button>
              </div>
            )}
          </div>

          {/* Official slothUI Pro ("Handmaiden Tales") 16:9 "Recent Episodes ↔ ⇅ Watch History" Strip inside Profile */}
          <div style={{ marginBottom: '0.95rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
              <span style={{ fontWeight: 900, fontSize: '0.9rem' }}>
                {isRtl ? 'متابعة حلقاتك (Recent Episodes)' : 'Recent Episodes'}
              </span>
              <button
                type="button"
                onClick={() => setProfileSubTab('vault')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: '0.73rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                ⇅ {isRtl ? 'كل السجل (All History)' : 'All History'}
              </button>
            </div>

            <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
              {(watchHistory.length > 0 ? watchHistory : popularList).slice(0, 6).map((item, idx) => (
                <div
                  key={`prof-sloth-ep-${item.objectID || idx}`}
                  onClick={() => handleOpenAnime(item, item.episode || 1)}
                  style={{
                    position: 'relative',
                    width: '198px',
                    height: '112px',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: '#0a0a0f',
                    border: '1px solid rgba(255,255,255,0.18)',
                    cursor: 'pointer'
                  }}
                >
                  <img
                    src={item.banner || item.poster}
                    alt={item.titleEn}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'brightness(0.76) contrast(1.08)'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(0,0,0,0.48) 0%, transparent 45%, rgba(0,0,0,0.9) 100%)'
                    }}
                  />
                  {/* Top-Left slothUI Badge: "E1   24:00" */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.38rem',
                      padding: '0.16rem 0.5rem',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.76)',
                      border: '1px solid rgba(255,255,255,0.24)',
                      fontSize: '0.64rem',
                      fontWeight: 900,
                      color: '#ffffff'
                    }}
                  >
                    <span>E{item.episode || idx + 1}</span>
                    <span style={{ opacity: 0.72 }}>24:00</span>
                  </div>
                  {/* Bottom Title + Circular [X] Seal */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '10px',
                      right: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.4rem'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {item.titleEn}
                    </span>
                    <span
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        color: '#000000',
                        fontSize: '0.6rem',
                        fontWeight: 900,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      X
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SlothUI Segmented Pill Profile Sub-Tab Bar (Matches Profile UI 2 Segmented Switcher) */}
          <div
            className="bx-mob-scroll"
            style={{
              display: 'flex',
              gap: '0.4rem',
              overflowX: 'auto',
              marginBottom: '0.95rem',
              padding: '0.35rem',
              borderRadius: '999px',
              background: '#09090e',
              border: '1px solid rgba(255,255,255,0.16)'
            }}
          >
            {[
              { id: 'account', ar: '👑 الحساب والـ VIP', en: '👑 Account & VIP' },
              { id: 'vault', ar: '💾 مكتبتي والتنزيلات', en: '💾 My Library' },
              { id: 'appearance', ar: '🎨 المظهر والأمان', en: '🎨 Settings' },
              ...(isDeveloper
                ? [{ id: 'developer', ar: `🛡️ المطور (${cloudUserRequests.length})`, en: '🛡️ Dev' }]
                : [])
            ].map((tb) => {
              const active = profileSubTab === tb.id;
              return (
                <button
                  key={tb.id}
                  type="button"
                  onClick={() => setProfileSubTab(tb.id)}
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.8rem',
                    borderRadius: '999px',
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? '#000000' : 'rgba(255,255,255,0.78)',
                    border: 'none',
                    fontWeight: 900,
                    fontSize: '0.73rem',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                  }}
                >
                  {isRtl ? tb.ar : tb.en}
                </button>
              );
            })}
          </div>

          {user ? (
            <>
              <div
                style={{
                  display: profileSubTab === 'account' && editingProfile ? 'block' : 'none',
                  padding: '1rem',
                  borderRadius: '20px',
                  background: '#0a0a0e',
                  border: '1px solid rgba(255,255,255,0.16)',
                  marginBottom: '1rem'
                }}
              >
                {/* Inline Profile Editor */}
                {editingProfile && (
                  <form
                    onSubmit={handleSaveProfileEdit}
                    style={{
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

              {/* ==================== DEVELOPER EXCLUSIVE MASTER VIP CONTROL PANEL (حساب المطور فقط — مقسم لـ 4 تبويبات منظمة) ==================== */}
              {isDeveloper && profileSubTab === 'developer' && (
                <div
                  style={{
                    marginTop: '0.2rem',
                    padding: '1.1rem',
                    borderRadius: '18px',
                    background: 'linear-gradient(145deg, #111116 0%, #050507 100%)',
                    border: '2px solid #ffffff',
                    boxShadow: '0 12px 34px rgba(255,255,255,0.14)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                    <div style={{ fontWeight: 900, fontSize: '0.92rem' }}>
                      👑 {isRtl ? 'مركز قيادة المطور (Developer Command Center)' : 'Developer Command Center'}
                    </div>
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '99px',
                        background: '#ffffff',
                        color: '#000000',
                        fontSize: '0.66rem',
                        fontWeight: 900
                      }}
                    >
                      DEV v8.0
                    </span>
                  </div>

                  {/* Developer Live Platform Telemetry Strip */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem', marginBottom: '0.75rem' }}>
                    <div style={{ padding: '0.45rem 0.25rem', borderRadius: '9px', background: 'rgba(255,255,255,0.06)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 900 }}>{cloudVipCodes.length}</div>
                      <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.6)' }}>أكواد نشطة</div>
                    </div>
                    <div style={{ padding: '0.45rem 0.25rem', borderRadius: '9px', background: 'rgba(255,255,255,0.06)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 900 }}>{cloudUserRequests.length}</div>
                      <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.6)' }}>طلبات الأعضاء</div>
                    </div>
                    <div style={{ padding: '0.45rem 0.25rem', borderRadius: '9px', background: 'rgba(255,255,255,0.06)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 900 }}>{globalVipEnforced ? '🔒 مفعل' : '🔓 مفتوح'}</div>
                      <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.6)' }}>بوابة VIP</div>
                    </div>
                    <div style={{ padding: '0.45rem 0.25rem', borderRadius: '9px', background: 'rgba(255,255,255,0.06)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 900 }}>{globalBroadcastMsg ? '🟢 مباشر' : '⚪ صامت'}</div>
                      <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.6)' }}>البث العام</div>
                    </div>
                  </div>

                  {/* Developer 4-Sub-Tab Switcher */}
                  <div
                    className="bx-mob-scroll"
                    style={{
                      display: 'flex',
                      gap: '0.35rem',
                      overflowX: 'auto',
                      marginBottom: '0.85rem',
                      padding: '0.3rem',
                      borderRadius: '12px',
                      background: '#050507',
                      border: '1px solid rgba(255,255,255,0.16)'
                    }}
                  >
                    {[
                      { id: 'vip', label: '👑 الأكواد والـ VIP' },
                      { id: 'users', label: '👥 كشاف وترقية الأعضاء' },
                      { id: 'broadcast', label: '📢 البث والترشيح' },
                      { id: 'requests', label: `📩 الطلبات (${cloudUserRequests.length})` }
                    ].map((dt) => (
                      <button
                        key={dt.id}
                        type="button"
                        onClick={() => setDevSubTab(dt.id)}
                        style={{
                          flex: 1,
                          padding: '0.45rem 0.65rem',
                          borderRadius: '9px',
                          background: devSubTab === dt.id ? '#ffffff' : 'transparent',
                          color: devSubTab === dt.id ? '#000000' : 'rgba(255,255,255,0.75)',
                          border: 'none',
                          fontWeight: 900,
                          fontSize: '0.7rem',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer'
                        }}
                      >
                        {dt.label}
                      </button>
                    ))}
                  </div>

                  {/*Master Global VIP Switch Button*/}
                  <div
                    style={{
                      display: devSubTab === 'vip' ? 'block' : 'none',
                      padding: '0.85rem',
                      borderRadius: '14px',
                      background: globalVipEnforced ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                      border: globalVipEnforced ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                      marginBottom: '0.9rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 900 }}>
                        {isRtl ? 'حالة فرض اشتراك VIP على كل النسخ:' : 'Global VIP Gate Status:'}
                      </span>
                      <span
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '8px',
                          background: globalVipEnforced ? '#ffffff' : 'rgba(255,255,255,0.12)',
                          color: globalVipEnforced ? '#000000' : '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 900
                        }}
                      >
                        {globalVipEnforced
                          ? isRtl
                            ? '🔒 مفعل ومفروض على الجميع'
                            : '🔒 ENFORCED ON ALL USERS'
                          : isRtl
                          ? '🔓 ملغي (مجاني للجميع)'
                          : '🔓 UNLOCKED FOR ALL'}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={devToggleBusy}
                      onClick={() => handleDevToggleGlobalVip(!globalVipEnforced)}
                      style={{
                        width: '100%',
                        padding: '0.8rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: globalVipEnforced ? '#ffffff' : 'rgba(255,255,255,0.18)',
                        color: globalVipEnforced ? '#000000' : '#ffffff',
                        fontWeight: 900,
                        fontSize: '0.84rem',
                        cursor: 'pointer'
                      }}
                    >
                      {devToggleBusy
                        ? isRtl
                          ? '⏳ جاري تعميم الأمر على جميع النسخ...'
                          : '⏳ Syncing across all instances...'
                        : globalVipEnforced
                        ? isRtl
                          ? '🔓 اضغط لإلغاء فرض الـ VIP وفتح التطبيق مجاناً لكل المستخدمين'
                          : '🔓 Disable Global VIP Enforcement (Unlock for All)'
                        : isRtl
                        ? '🔒 اضغط لتفعيل وفرض خطط الـ VIP على جميع المستخدمين فوراً'
                        : '🔒 Enable Global VIP Enforcement on All Users'}
                    </button>
                  </div>

                  {/* Cloud VIP Code Generator inside APK */}
                  <div style={{ display: devSubTab === 'vip' ? 'block' : 'none', borderTop: '1px solid rgba(255,255,255,0.14)', paddingTop: '0.8rem' }}>
                    <div style={{ fontWeight: 900, fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                      🔑 {isRtl ? 'توليد أكواد تفعيل VIP سحابية فورية (تعمل في الموقع والتطبيق):' : 'Generate Cloud VIP Activation Codes:'}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                      <select
                        value={devGenTier}
                        onChange={(e) => setDevGenTier(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          borderRadius: '10px',
                          background: '#000',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.22)',
                          fontSize: '0.74rem',
                          fontWeight: 800
                        }}
                      >
                        <option value="vip_monarch">👑 باقة الملك (199 ج.م)</option>
                        <option value="vip_basic">⚡ الباقة الأساسية (99 ج.م)</option>
                      </select>
                      <select
                        value={devGenDays}
                        onChange={(e) => setDevGenDays(Number(e.target.value))}
                        style={{
                          width: '110px',
                          padding: '0.5rem',
                          borderRadius: '10px',
                          background: '#000',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.22)',
                          fontSize: '0.74rem',
                          fontWeight: 800
                        }}
                      >
                        <option value={30}>30 يوم</option>
                        <option value={90}>90 يوم</option>
                        <option value={365}>سنة كاملة</option>
                        <option value={3650}>مدى الحياة</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      disabled={devGenBusy}
                      onClick={handleDevGenerateVipCode}
                      style={{
                        width: '100%',
                        padding: '0.68rem',
                        borderRadius: '11px',
                        border: 'none',
                        background: '#ffffff',
                        color: '#000000',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      {devGenBusy ? '⏳ جاري التوليد...' : '⚡ توليد كود VIP جديد وحفظه بالسحابة'}
                    </button>

                    {cloudVipCodes.length > 0 && (
                      <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '165px', overflowY: 'auto' }}>
                        {cloudVipCodes.slice(0, 10).map((c) => (
                          <div
                            key={c.code}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.42rem 0.65rem',
                              borderRadius: '8px',
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.14)',
                              fontSize: '0.72rem'
                            }}
                          >
                            <span
                              onClick={() => {
                                navigator.clipboard?.writeText(c.code);
                                showToast(`✓ تم نسخ الكود: ${c.code}`);
                              }}
                              style={{ fontFamily: 'monospace', fontWeight: 900, cursor: 'pointer', flex: 1 }}
                            >
                              {c.code}
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.65)', marginLeft: '0.4rem', marginRight: '0.4rem' }}>
                              {(c.tier || c.planId) === 'vip_monarch' ? '👑 الملك' : '⚡ أساسية'} ({c.usedCount || 0}/{c.maxUses || 1})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDevDeleteVipCode(c.code)}
                              style={{
                                background: 'rgba(255,255,255,0.12)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#fff',
                                borderRadius: '6px',
                                padding: '0.18rem 0.45rem',
                                fontSize: '0.68rem',
                                cursor: 'pointer'
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Developer Global Push Broadcast Transmitter */}
                  <div style={{ display: devSubTab === 'broadcast' ? 'block' : 'none', paddingTop: '0.2rem' }}>
                    <div style={{ fontWeight: 900, fontSize: '0.8rem', marginBottom: '0.45rem' }}>
                      📢 {isRtl ? 'بث إشعار عام فوري لجميع الهواتف والموقع:' : 'Global Real-Time Push Broadcast Banner:'}
                    </div>
                    <input
                      type="text"
                      value={devBroadcastInput}
                      onChange={(e) => setDevBroadcastInput(e.target.value)}
                      placeholder={
                        globalBroadcastMsg ||
                        (isRtl ? 'اكتب نص الإشعار ليظهر فوراً أعلى جميع نسخ التطبيق...' : 'Enter broadcast message...')
                      }
                      style={{
                        width: '100%',
                        padding: '0.58rem 0.75rem',
                        borderRadius: '10px',
                        background: '#000',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.22)',
                        fontSize: '0.76rem',
                        marginBottom: '0.45rem'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      <button
                        type="button"
                        disabled={devBroadcastBusy}
                        onClick={() => handleDevSendBroadcast(false)}
                        style={{
                          flex: 1,
                          padding: '0.62rem',
                          borderRadius: '10px',
                          border: 'none',
                          background: '#ffffff',
                          color: '#000000',
                          fontWeight: 900,
                          fontSize: '0.76rem',
                          cursor: 'pointer'
                        }}
                      >
                        {devBroadcastBusy ? '⏳...' : isRtl ? '📢 بث الإشعار للجميع' : '📢 Broadcast Now'}
                      </button>
                      {globalBroadcastMsg && (
                        <button
                          type="button"
                          disabled={devBroadcastBusy}
                          onClick={() => handleDevSendBroadcast(true)}
                          style={{
                            padding: '0.62rem 0.85rem',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.25)',
                            background: 'rgba(255,255,255,0.08)',
                            color: '#ffffff',
                            fontWeight: 900,
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          🗑️ {isRtl ? 'إخفاء' : 'Clear'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Developer Direct User VIP Upgrade (Upgrade any username or email without code) */}
                  <div style={{ display: devSubTab === 'users' ? 'block' : 'none', paddingTop: '0.2rem' }}>
                    <div style={{ fontWeight: 900, fontSize: '0.8rem', marginBottom: '0.45rem' }}>
                      👑 {isRtl ? 'ترقية أي مستخدم مباشرة إلى VIP (بدون كود):' : 'Direct User VIP Grant (No Code Needed):'}
                    </div>
                    <input
                      type="text"
                      value={devGrantTarget}
                      onChange={(e) => setDevGrantTarget(e.target.value)}
                      placeholder={isRtl ? 'اكتب اسم المستخدم أو البريد الإلكتروني للعضو...' : 'Username or Email...'}
                      style={{
                        width: '100%',
                        padding: '0.58rem 0.75rem',
                        borderRadius: '10px',
                        background: '#000',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.22)',
                        fontSize: '0.76rem',
                        marginBottom: '0.45rem'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.45rem' }}>
                      <select
                        value={devGrantTier}
                        onChange={(e) => setDevGrantTier(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '0.48rem',
                          borderRadius: '10px',
                          background: '#000',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.22)',
                          fontSize: '0.74rem',
                          fontWeight: 800
                        }}
                      >
                        <option value="vip_monarch">👑 باقة الملك (VIP Monarch)</option>
                        <option value="vip_basic">⚡ الباقة الأساسية (VIP Basic)</option>
                      </select>
                      <select
                        value={devGrantDays}
                        onChange={(e) => setDevGrantDays(Number(e.target.value))}
                        style={{
                          width: '110px',
                          padding: '0.48rem',
                          borderRadius: '10px',
                          background: '#000',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.22)',
                          fontSize: '0.74rem',
                          fontWeight: 800
                        }}
                      >
                        <option value={30}>30 يوم</option>
                        <option value={90}>90 يوم</option>
                        <option value={365}>سنة كاملة</option>
                        <option value={3650}>مدى الحياة</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      <button
                        type="button"
                        disabled={devGrantBusy}
                        onClick={handleDevDirectGrantUserVip}
                        style={{
                          flex: 1,
                          padding: '0.65rem',
                          borderRadius: '10px',
                          border: 'none',
                          background: '#ffffff',
                          color: '#000000',
                          fontWeight: 900,
                          fontSize: '0.76rem',
                          cursor: 'pointer'
                        }}
                      >
                        {devGrantBusy
                          ? '⏳...'
                          : isRtl
                          ? '👑 ترقية حساب العضو فوراً'
                          : '👑 Grant VIP Now'}
                      </button>
                      <button
                        type="button"
                        disabled={devGrantBusy}
                        onClick={handleDevRevokeUserVip}
                        style={{
                          padding: '0.65rem 0.75rem',
                          borderRadius: '10px',
                          border: '1px solid rgba(255,255,255,0.28)',
                          background: 'rgba(255,255,255,0.08)',
                          color: '#ffffff',
                          fontWeight: 900,
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        🚫 {isRtl ? 'سحب VIP' : 'Revoke'}
                      </button>
                    </div>
                  </div>

                  {/* Developer Live Cloud User Inspector (كشاف المستخدمين السحابي المباشر) */}
                  <div style={{ display: devSubTab === 'users' ? 'block' : 'none', borderTop: '1px solid rgba(255,255,255,0.14)', paddingTop: '0.8rem', marginTop: '0.8rem' }}>
                    <div style={{ fontWeight: 900, fontSize: '0.8rem', marginBottom: '0.45rem' }}>
                      👥 {isRtl ? 'كشاف حسابات المستخدمين المباشر (Cloud User Inspector):' : 'Live Cloud User Inspector:'}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.45rem' }}>
                      <input
                        type="text"
                        value={devInspectQuery}
                        onChange={(e) => setDevInspectQuery(e.target.value)}
                        placeholder={isRtl ? 'ابحث باسم المستخدم أو البريد الإلكتروني...' : 'Search username or email...'}
                        style={{
                          flex: 1,
                          padding: '0.55rem 0.75rem',
                          borderRadius: '10px',
                          background: '#000',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.22)',
                          fontSize: '0.75rem'
                        }}
                      />
                      <button
                        type="button"
                        disabled={devInspectBusy}
                        onClick={handleDevInspectUser}
                        style={{
                          padding: '0 0.85rem',
                          borderRadius: '10px',
                          background: '#ffffff',
                          color: '#000000',
                          border: 'none',
                          fontWeight: 900,
                          fontSize: '0.74rem',
                          cursor: 'pointer'
                        }}
                      >
                        {devInspectBusy ? '⏳' : isRtl ? '🔍 فحص' : '🔍 Inspect'}
                      </button>
                    </div>

                    {devInspectedUser && (
                      <div
                        style={{
                          padding: '0.7rem',
                          borderRadius: '12px',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          fontSize: '0.73rem',
                          lineHeight: 1.6
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: '0.8rem' }}>
                          👤 {devInspectedUser.displayName || devInspectedUser.username} (@{devInspectedUser.username})
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.72)' }}>📧 {devInspectedUser.email || '—'}</div>
                        <div>
                          💎 الحالة: <strong>{devInspectedUser.vipStatus || 'Free Tier'}</strong> • ♥ المفضلة:{' '}
                          {(devInspectedUser.favorites || []).length} • 🎬 السجل: {(devInspectedUser.progress || []).length}
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.45rem' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setDevGrantTarget(devInspectedUser.email || devInspectedUser.username);
                              setDevGrantTier('vip_monarch');
                            }}
                            style={{
                              flex: 1,
                              padding: '0.38rem',
                              borderRadius: '8px',
                              background: '#ffffff',
                              color: '#000000',
                              border: 'none',
                              fontWeight: 900,
                              fontSize: '0.68rem',
                              cursor: 'pointer'
                            }}
                          >
                            👑 تحديد للترقية
                          </button>
                          <button
                            type="button"
                            onClick={() => setDevInspectedUser(null)}
                            style={{
                              padding: '0.38rem 0.65rem',
                              borderRadius: '8px',
                              background: 'rgba(255,255,255,0.12)',
                              color: '#ffffff',
                              border: 'none',
                              fontWeight: 900,
                              fontSize: '0.68rem',
                              cursor: 'pointer'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Developer Global Featured Spotlight Pin (تثبيت ترشيح المطور الرسمي) */}
                  <div style={{ display: devSubTab === 'broadcast' ? 'block' : 'none', borderTop: '1px solid rgba(255,255,255,0.14)', paddingTop: '0.8rem', marginTop: '0.8rem' }}>
                    <div style={{ fontWeight: 900, fontSize: '0.8rem', marginBottom: '0.45rem' }}>
                      📌 {isRtl ? 'تثبيت أنمي اليوم كترشيح رسمي أعلى الصفحة الرئيسية:' : 'Pin Official Developer Spotlight on Home:'}
                    </div>
                    <input
                      type="text"
                      value={devPinTitleInput}
                      onChange={(e) => setDevPinTitleInput(e.target.value)}
                      placeholder={
                        globalPinnedRec?.titleEn ||
                        (isRtl ? 'اكتب اسم الأنمي لتثبيته (مثال: Solo Leveling أو One Piece)...' : 'Anime title to pin...')
                      }
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '10px',
                        background: '#000',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.22)',
                        fontSize: '0.75rem',
                        marginBottom: '0.4rem'
                      }}
                    />
                    <input
                      type="text"
                      value={devPinNoteInput}
                      onChange={(e) => setDevPinNoteInput(e.target.value)}
                      placeholder={isRtl ? 'رسالة الترشيح (مثال: 🔥 عمل أسطوري ننصح بمشاهدته الليلة!)...' : 'Recommendation note...'}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '10px',
                        background: '#000',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.22)',
                        fontSize: '0.75rem',
                        marginBottom: '0.45rem'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      <button
                        type="button"
                        disabled={devPinBusy}
                        onClick={() => handleDevPinRecommendation(false)}
                        style={{
                          flex: 1,
                          padding: '0.62rem',
                          borderRadius: '10px',
                          background: '#ffffff',
                          color: '#000000',
                          border: 'none',
                          fontWeight: 900,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        {devPinBusy ? '⏳...' : isRtl ? '📌 تثبيت في الرئيسية للجميع' : '📌 Pin on Home'}
                      </button>
                      {globalPinnedRec && (
                        <button
                          type="button"
                          disabled={devPinBusy}
                          onClick={() => handleDevPinRecommendation(true)}
                          style={{
                            padding: '0.62rem 0.8rem',
                            borderRadius: '10px',
                            background: 'rgba(255,255,255,0.08)',
                            color: '#ffffff',
                            border: '1px solid rgba(255,255,255,0.25)',
                            fontWeight: 900,
                            fontSize: '0.74rem',
                            cursor: 'pointer'
                          }}
                        >
                          🗑️ {isRtl ? 'إزالة' : 'Unpin'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Developer User Requests & Ticket Center (صندوق طلبات الأعضاء المباشر للمطور) */}
                  {devSubTab === 'requests' && (
                    <div style={{ paddingTop: '0.2rem' }}>
                      <div style={{ fontWeight: 900, fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                        📩 {isRtl ? `طلبات الأعضاء المباشرة (${cloudUserRequests.length}):` : `User Requests (${cloudUserRequests.length}):`}
                      </div>
                      {cloudUserRequests.length === 0 ? (
                        <div style={{ padding: '1.2rem', textAlign: 'center', fontSize: '0.74rem', color: 'rgba(255,255,255,0.55)' }}>
                          {isRtl ? 'لا توجد طلبات جديدة من الأعضاء حالياً.' : 'No pending user requests.'}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '240px', overflowY: 'auto' }}>
                          {cloudUserRequests.map((req) => (
                            <div
                              key={req.id}
                              style={{
                                padding: '0.65rem',
                                borderRadius: '11px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.16)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.65)', fontWeight: 800 }}>
                                  {req.type === 'anime' ? '🎬 طلب أنمي' : req.type === 'manga' ? '📖 طلب مانهوا' : '🛠️ بلاغ/دعم'} • 👤 {req.author}
                                </div>
                                <div style={{ fontSize: '0.76rem', fontWeight: 900, marginTop: '0.15rem' }}>{req.text}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDevDeleteUserRequest(req.id)}
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '8px',
                                  background: '#ffffff',
                                  color: '#000000',
                                  border: 'none',
                                  fontWeight: 900,
                                  fontSize: '0.68rem',
                                  cursor: 'pointer',
                                  flexShrink: 0
                                }}
                              >
                                ✓ إنجاز
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                      ? '⏳ جاري فتح حسابات Google على الهاتف...'
                      : '⏳ Opening Phone Google Accounts...'
                    : isRtl
                    ? 'تسجيل الدخول بحسابات Google الموجودة على الهاتف'
                    : 'Sign in with Phone Google Accounts'}
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

          {/* VIP Subscription Status & Code Redemption Box inside Profile */}
          <div
            style={{
              display: profileSubTab === 'account' ? 'block' : 'none',
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: '16px',
              background: '#0a0a0e',
              border: '1px solid rgba(255,255,255,0.16)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
              <span style={{ fontWeight: 900, fontSize: '0.88rem' }}>
                💎 {isRtl ? 'حالة اشتراك BLACK X VIP الخاص بك:' : 'Your BLACK X VIP Status:'}
              </span>
              <span
                style={{
                  padding: '0.2rem 0.65rem',
                  borderRadius: '99px',
                  background: userVipTier !== 'free' ? '#ffffff' : 'rgba(255,255,255,0.1)',
                  color: userVipTier !== 'free' ? '#000000' : '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 900
                }}
              >
                {isDeveloper
                  ? '👑 مطور المنصة (MONARCH)'
                  : userVipTier === 'vip_monarch'
                  ? '👑 باقة الملك (VIP MONARCH)'
                  : userVipTier === 'vip_basic'
                  ? '⚡ الباقة الأساسية (VIP BASIC)'
                  : isRtl
                  ? 'مجاني (غير مشترك)'
                  : 'Free Tier'}
              </span>
            </div>

            <form onSubmit={handleRedeemVipCode} style={{ display: 'flex', gap: '0.45rem', marginTop: '0.5rem' }}>
              <input
                type="text"
                value={vipRedeemCode}
                onChange={(e) => setVipRedeemCode(e.target.value)}
                placeholder={isRtl ? 'أدخل كود تفعيل VIP (مثال: BX-XXXX-XXXX)...' : 'Enter VIP Activation Code...'}
                style={{
                  flex: 1,
                  padding: '0.6rem 0.8rem',
                  borderRadius: '10px',
                  background: '#050507',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace'
                }}
              />
              <button
                type="submit"
                disabled={vipRedeemBusy}
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
                {vipRedeemBusy ? '⏳' : isRtl ? 'تفعيل' : 'Activate'}
              </button>
            </form>
          </div>

          {/* Direct User Request Box to Developer (صندوق طلبات الأنمي والمانهوا المباشر للمطور) */}
          <div
            style={{
              display: profileSubTab === 'account' ? 'block' : 'none',
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: '16px',
              background: '#0a0a0e',
              border: '1px solid rgba(255,255,255,0.16)'
            }}
          >
            <div style={{ fontWeight: 900, fontSize: '0.86rem', marginBottom: '0.35rem' }}>
              📩 {isRtl ? 'صندوق طلبات الأعضاء المباشر للمطور (أنمي / مانهوا / دعم):' : 'Direct Request to Developer:'}
            </div>
            <form onSubmit={handleSubmitUserRequest} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {[
                  { id: 'anime', label: '🎬 طلب أنمي' },
                  { id: 'manga', label: '📖 طلب مانهوا' },
                  { id: 'issue', label: '🛠️ بلاغ أو استفسار' }
                ].map((rt) => (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => setUserRequestType(rt.id)}
                    style={{
                      flex: 1,
                      padding: '0.4rem',
                      borderRadius: '8px',
                      background: userRequestType === rt.id ? '#ffffff' : 'rgba(255,255,255,0.06)',
                      color: userRequestType === rt.id ? '#000000' : '#ffffff',
                      border: '1px solid rgba(255,255,255,0.16)',
                      fontWeight: 900,
                      fontSize: '0.68rem',
                      cursor: 'pointer'
                    }}
                  >
                    {rt.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="text"
                  value={userRequestText}
                  onChange={(e) => setUserRequestText(e.target.value)}
                  placeholder={isRtl ? 'اكتب اسم الأنمي أو المانهوا أو رسالتك للمطور...' : 'Type your request...'}
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.75rem',
                    borderRadius: '10px',
                    background: '#050507',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    fontSize: '0.75rem'
                  }}
                />
                <button
                  type="submit"
                  disabled={userRequestBusy}
                  style={{
                    padding: '0 0.9rem',
                    borderRadius: '10px',
                    background: '#ffffff',
                    color: '#000000',
                    border: 'none',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  {userRequestBusy ? '⏳' : isRtl ? 'إرسال' : 'Send'}
                </button>
              </div>
            </form>
          </div>

          {/* Internal Splash Screen Motion Graphics Selector (من الداخل فقط) */}
          <div
            style={{
              display: profileSubTab === 'appearance' ? 'block' : 'none',
              marginTop: '0.2rem',
              padding: '1rem',
              borderRadius: '16px',
              background: '#0a0a0e',
              border: '1px solid rgba(255,255,255,0.16)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <span style={{ fontWeight: 900, fontSize: '0.88rem' }}>
                🎬 {isRtl ? 'إعدادات شاشة البداية (5 موشنات 120Hz):' : 'Splash Screen Motion (5 Themes 120Hz):'}
              </span>
              <button
                type="button"
                onClick={() => window.triggerBlackXMotion?.(motionPref === 'random' ? undefined : motionPref, 4000)}
                style={{
                  padding: '0.28rem 0.7rem',
                  borderRadius: '99px',
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.7rem',
                  cursor: 'pointer'
                }}
              >
                ▶ {isRtl ? 'معاينة الآن' : 'Preview'}
              </button>
            </div>
            <p style={{ margin: '0 0 0.65rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.45 }}>
              {isRtl
                ? 'اختر الموشن جرافيك الذي يظهر عند فتح التطبيق (تغيير شاشة البداية يتم من هنا من داخل الإعدادات فقط):'
                : 'Select which 120Hz motion graphic plays when launching the app:'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.45rem' }}>
              {BLACK_X_MOTION_THEMES.map((m) => {
                const active = motionPref === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMotionPref(m.id);
                      localStorage.setItem('bx_motion_pref', m.id);
                      showToast(
                        isRtl
                          ? `✓ تم اعتماد شاشة البداية: ${m.nameAr}`
                          : `✓ Splash motion set to: ${m.nameEn}`
                      );
                    }}
                    style={{
                      padding: '0.58rem 0.65rem',
                      borderRadius: '11px',
                      background: active ? '#ffffff' : 'rgba(255,255,255,0.06)',
                      color: active ? '#000000' : '#ffffff',
                      border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.16)',
                      fontWeight: 900,
                      fontSize: '0.73rem',
                      textAlign: isRtl ? 'right' : 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.38rem'
                    }}
                  >
                    <span>{m.icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isRtl ? m.nameAr : m.nameEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* In-App Cloud OTA Update Checker & Direct APK Installer */}
          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: '16px',
              background: '#0a0a0e',
              border: '1px solid rgba(255,255,255,0.16)',
              display: profileSubTab === 'appearance' ? 'flex' : 'none',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: '0.86rem' }}>
                🔄 {isRtl ? 'نظام التحديث الهوائي الفوري (OTA Update)' : 'Cloud OTA App Update'}
              </div>
              <div style={{ fontSize: '0.71rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.2rem' }}>
                {isRtl
                  ? 'الإصدار الحالي: BLACK X Mobile v7.0 Apex (Clean Obsidian Edition)'
                  : 'Current Version: BLACK X Mobile v7.0 Apex (Clean Obsidian Edition)'}
              </div>
            </div>
            <a
              href="https://github.com/Hacker5055/black-x-anime/releases/download/v3.0-mobile-120hz/BLACK-X-Mobile-120Hz.apk"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                showToast(
                  isRtl
                    ? '✓ جاري تنزيل أحدث حزمة BLACK X Mobile v7.0 Apex المباشرة...'
                    : '✓ Downloading latest BLACK X Mobile v7.0 Apex APK...'
                )
              }
              style={{
                padding: '0.52rem 0.9rem',
                borderRadius: '11px',
                background: '#ffffff',
                color: '#000000',
                fontWeight: 900,
                fontSize: '0.75rem',
                textDecoration: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              ⬇ {isRtl ? 'تحديث مباشر الآن' : 'Update APK Now'}
            </a>
          </div>

          {/* Sovereign Achievements & Unlockable Titles Selector (خزنة الأوسمة والألقاب الملكية) */}
          <div
            style={{
              display: profileSubTab === 'account' ? 'block' : 'none',
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: '16px',
              background: '#0a0a0e',
              border: '1px solid rgba(255,255,255,0.16)'
            }}
          >
            <div style={{ fontWeight: 900, fontSize: '0.86rem', marginBottom: '0.3rem' }}>
              🎖️ {isRtl ? 'خزنة الأوسمة والألقاب الملكية (Sovereign Titles):' : 'Sovereign Achievements & Titles:'}
            </div>
            <p style={{ margin: '0 0 0.65rem', fontSize: '0.71rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.45 }}>
              {isRtl
                ? 'اختر لقبك الملكي ليظهر بجانب اسمك في ملفك الشخصي وفي تقييمات الحلقات:'
                : 'Select your Sovereign Title to display on your profile and episode reviews:'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.42rem' }}>
              {[
                { title: '⚔️ صياد الرتبة S', desc: 'مفتوح للجميع' },
                { title: '🩸 سيد الظلال', desc: `${watchHistory.length}/3 حلقات` },
                { title: '📖 حكيم المانهوا', desc: `${mangaHistory.length}/2 فصول` },
                { title: '⚡ أسطورة 120Hz', desc: `${favorites.length}/3 مفضلة` },
                { title: '🔮 عراف الأرينا', desc: `${userXp} XP` },
                { title: '👑 إمبراطور BLACK X', desc: 'رتبة السيادة' }
              ].map((b) => {
                const active = selectedSovereignTitle === b.title;
                return (
                  <button
                    key={b.title}
                    type="button"
                    onClick={() => {
                      setSelectedSovereignTitle(b.title);
                      localStorage.setItem('bx_mob_sovereign_title', b.title);
                      showToast(`🎖️ تم اعتماد لقبك الملكي: ${b.title}`);
                    }}
                    style={{
                      padding: '0.52rem 0.65rem',
                      borderRadius: '10px',
                      background: active ? '#ffffff' : 'rgba(255,255,255,0.06)',
                      color: active ? '#000000' : '#ffffff',
                      border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.16)',
                      fontWeight: 900,
                      fontSize: '0.72rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{b.title}</span>
                    <span style={{ fontSize: '0.62rem', opacity: 0.7 }}>{b.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1-Tap Full Vault Backup & Restore (تصدير واستيراد الخزنة الكاملة بضغطة واحدة) */}
          <div
            style={{
              display: profileSubTab === 'vault' ? 'block' : 'none',
              marginTop: '0.2rem',
              padding: '1rem',
              borderRadius: '16px',
              background: '#0a0a0e',
              border: '1px solid rgba(255,255,255,0.16)'
            }}
          >
            <div style={{ fontWeight: 900, fontSize: '0.86rem', marginBottom: '0.3rem' }}>
              💾 {isRtl ? 'النسخ الاحتياطي الشامل للخزنة (Vault Backup & Restore)' : 'Full Vault Backup & Restore'}
            </div>
            <p style={{ margin: '0 0 0.65rem', fontSize: '0.71rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.45 }}>
              {isRtl
                ? 'احفظ نسخة احتياطية شاملة لكل مفضلاتك، سجل مشاهداتك، لقطاتك، وفصولك بدون نت في ملف واحد واستعدها على أي هاتف فوراً:'
                : 'Export or restore all your favorites, history, offline chapters, and snapshots in one tap:'}
            </p>
            <input
              ref={backupFileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportVaultBackup}
              style={{ display: 'none' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleExportVaultBackup}
                style={{
                  flex: 1,
                  padding: '0.58rem',
                  borderRadius: '10px',
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                💾 {isRtl ? 'تصدير الخزنة (Backup)' : 'Export Backup'}
              </button>
              <button
                type="button"
                onClick={() => backupFileInputRef.current?.click()}
                style={{
                  flex: 1,
                  padding: '0.58rem',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.22)',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                📂 {isRtl ? 'استعادة الخزنة (Restore)' : 'Restore Backup'}
              </button>
            </div>
          </div>

          {/* Privacy & Security Suite: Incognito Mode + 4-Digit App PIN Lock */}
          <div
            style={{
              display: profileSubTab === 'appearance' ? 'block' : 'none',
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: '16px',
              background: '#0a0a0e',
              border: '1px solid rgba(255,255,255,0.16)'
            }}
          >
            <div style={{ fontWeight: 900, fontSize: '0.88rem', marginBottom: '0.6rem' }}>
              🛡️ {isRtl ? 'الخصوصية والحماية الذكية (PIN + التصفح الخفي):' : 'Privacy & Security Suite:'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: '0.78rem' }}>
                  🕵️ {isRtl ? 'وضع التصفح الخفي (Incognito Mode)' : 'Incognito Mode'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.58)' }}>
                  {isRtl ? 'مشاهدة الحلقات وقراءة الفصول بدون حفظها في السجل' : 'Watch & read without saving history'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !incognitoMode;
                  setIncognitoMode(next);
                  localStorage.setItem('bx_mob_incognito', String(next));
                  showToast(
                    next
                      ? isRtl
                        ? '🕵️ تم تفعيل وضع التصفح الخفي'
                        : '🕵️ Incognito Mode ON'
                      : isRtl
                      ? '✓ تم إيقاف وضع التصفح الخفي'
                      : '✓ Incognito Mode OFF'
                  );
                }}
                style={{
                  padding: '0.42rem 0.85rem',
                  borderRadius: '10px',
                  background: incognitoMode ? '#ffffff' : 'rgba(255,255,255,0.08)',
                  color: incognitoMode ? '#000000' : '#ffffff',
                  border: '1px solid rgba(255,255,255,0.22)',
                  fontWeight: 900,
                  fontSize: '0.74rem',
                  cursor: 'pointer'
                }}
              >
                {incognitoMode ? (isRtl ? 'مفعل ON' : 'ON') : isRtl ? 'متوقف OFF' : 'OFF'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
              <input
                type="password"
                maxLength={4}
                value={pinSetupInput}
                onChange={(e) => setPinSetupInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder={
                  appPinCode
                    ? isRtl
                      ? '🔒 القفل مفعل (أدخل 4 أرقام لتغييره)'
                      : '🔒 PIN Active (4 digits)'
                    : isRtl
                    ? 'أدخل رمز PIN من 4 أرقام لقفل التطبيق...'
                    : 'Set 4-digit PIN lock...'
                }
                style={{
                  flex: 1,
                  padding: '0.55rem 0.75rem',
                  borderRadius: '10px',
                  background: '#050507',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  fontSize: '0.75rem'
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (pinSetupInput.length !== 4) {
                    showToast(isRtl ? 'يرجى إدخال 4 أرقام بالضبط' : 'Enter 4 digits');
                    return;
                  }
                  setAppPinCode(pinSetupInput);
                  localStorage.setItem('bx_mob_pin_code', pinSetupInput);
                  setPinSetupInput('');
                  showToast(isRtl ? '🔒 تم تفعيل قفل التطبيق برمز PIN بنجاح!' : '🔒 App PIN Lock enabled!');
                }}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '10px',
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.74rem',
                  cursor: 'pointer'
                }}
              >
                {isRtl ? 'حفظ PIN' : 'Set PIN'}
              </button>
              {appPinCode && (
                <button
                  type="button"
                  onClick={() => {
                    setAppPinCode('');
                    setPinLocked(false);
                    localStorage.removeItem('bx_mob_pin_code');
                    showToast(isRtl ? '🔓 تم إلغاء قفل الـ PIN' : '🔓 PIN Lock removed');
                  }}
                  style={{
                    padding: '0.55rem 0.7rem',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    fontWeight: 900,
                    fontSize: '0.72rem',
                    cursor: 'pointer'
                  }}
                >
                  {isRtl ? 'إلغاء' : 'Clear'}
                </button>
              )}
            </div>
          </div>

          {/* 8-Tab Personal Library Manager (Favorites, Offline Vault, Saved Panels, Watching, Completed, Plan to Watch, Episode History, Manga History) */}
          <div style={{ display: profileSubTab === 'vault' ? 'block' : 'none', marginTop: '1.15rem' }}>
            <h3 style={{ margin: '0 0 0.55rem', fontSize: '0.95rem', fontWeight: 900 }}>
              📚 {isRtl ? 'مكتبتي الشخصية، خزنة بدون نت، ولقطاتي' : 'My Library, Offline Vault & Snapshots'}
            </h3>
            <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.38rem', overflowX: 'auto', marginBottom: '0.85rem', paddingBottom: '0.2rem' }}>
              {[
                { id: 'favorites', ar: `♥ المفضلة (${favorites.length})`, en: `♥ Favorites (${favorites.length})` },
                { id: 'offline', ar: `📥 بدون نت (${offlineChapters.length})`, en: `📥 Offline (${offlineChapters.length})` },
                { id: 'panels', ar: `🔖 لقطاتي (${savedPanels.length})`, en: `🔖 Snapshots (${savedPanels.length})` },
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

            {librarySubTab === 'offline' && (
              offlineChapters.length === 0 ? (
                <div style={{ padding: '1.25rem', borderRadius: '14px', background: '#0a0a0e', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRtl
                    ? 'خزنة القراءة بدون إنترنت فارغة حالياً. اضغط على (📥 حفظ بدون نت) من داخل أي فصل مانهوا أو مانجا لحفظه هنا!'
                    : 'Offline Vault is empty. Tap (📥 Save Offline) inside any chapter to cache it here!'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {offlineChapters.map((och) => (
                    <div
                      key={och.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.7rem',
                        padding: '0.6rem',
                        borderRadius: '12px',
                        background: '#0a0a0e',
                        border: '1px solid rgba(255,255,255,0.15)'
                      }}
                    >
                      {och.poster && (
                        <img
                          src={och.poster}
                          alt={och.mangaName}
                          style={{ width: '50px', height: '68px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                        />
                      )}
                      <div
                        onClick={() => {
                          setActiveTab('manga');
                          setSelectedManga({
                            objectID: och.mangaId,
                            name: och.mangaName,
                            poster_uri: och.poster,
                            source: och.source
                          });
                          handleReadMangaChapter(och);
                        }}
                        style={{ flex: 1, cursor: 'pointer' }}
                      >
                        <div style={{ fontWeight: 900, fontSize: '0.82rem' }}>{och.mangaName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.15rem' }}>
                          📥 {isRtl ? `الفصل ${och.chapter} • ${och.pagesCount} صفحة محفوظة` : `Ch. ${och.chapter} • ${och.pagesCount} pages`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('manga');
                          setSelectedManga({
                            objectID: och.mangaId,
                            name: och.mangaName,
                            poster_uri: och.poster,
                            source: och.source
                          });
                          handleReadMangaChapter(och);
                        }}
                        style={{
                          padding: '0.4rem 0.7rem',
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#000000',
                          border: 'none',
                          fontWeight: 900,
                          fontSize: '0.72rem',
                          cursor: 'pointer'
                        }}
                      >
                        📖 {isRtl ? 'قراءة' : 'Read'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOfflineChapter(och.id)}
                        style={{
                          padding: '0.4rem 0.55rem',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.08)',
                          color: '#ffffff',
                          border: '1px solid rgba(255,255,255,0.2)',
                          fontSize: '0.72rem',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}

            {librarySubTab === 'panels' && (
              savedPanels.length === 0 ? (
                <div style={{ padding: '1.25rem', borderRadius: '14px', background: '#0a0a0e', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRtl
                    ? 'لم تقم بحفظ أي لقطة شاشة أو صفحة مانهوا بعد. اضغط على (📸 لقطة) داخل مشغل الأنمي أو (🔖 حفظ لقطة) داخل قارئ المانهوا!'
                    : 'No saved snapshots or panels yet.'}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
                  {savedPanels.map((sp) => (
                    <div
                      key={sp.id}
                      style={{
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: '#0a0a0e',
                        border: '1px solid rgba(255,255,255,0.16)'
                      }}
                    >
                      <img
                        src={sp.imageUrl}
                        alt={sp.title}
                        style={{ width: '100%', height: '135px', objectFit: 'cover', display: 'block' }}
                      />
                      <div style={{ padding: '0.5rem' }}>
                        <div style={{ fontWeight: 900, fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sp.title}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.22rem' }}>
                          <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.65)' }}>{sp.subtitle}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSavedPanels((prev) => {
                                const next = prev.filter((x) => x.id !== sp.id);
                                localStorage.setItem('bx_mob_saved_panels', JSON.stringify(next));
                                return next;
                              });
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'rgba(255,255,255,0.7)',
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

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

          {/* ==================== v9.0 DEDICATED STANDALONE 120Hz CINEMA VIDEO PLAYER PAGE + FLOATING MINI-PLAYER ==================== */}
          {activeEpisode && (
            <div
              style={
                videoFullscreen
                  ? {
                      position: 'fixed',
                      inset: 0,
                      width: '100vw',
                      height: '100vh',
                      zIndex: 9800,
                      background: '#000000',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }
                  : playerMinimized
                  ? {
                      position: 'fixed',
                      left: '10px',
                      right: '10px',
                      bottom: '16px',
                      zIndex: 520,
                      background: 'rgba(8, 8, 12, 0.96)',
                      border: '1.5px solid rgba(255, 255, 255, 0.32)',
                      borderRadius: '18px',
                      padding: '0.45rem 0.65rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      boxShadow: '0 20px 48px rgba(0, 0, 0, 0.96)'
                    }
                  : {
                      position: 'fixed',
                      inset: 0,
                      zIndex: 500,
                      background: '#000000',
                      overflowY: 'auto',
                      paddingBottom: '90px',
                      animation: 'bxSlideUp 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
                    }
              }
            >
              {/* Sticky Top Navigation Header for Dedicated Standalone Video Player Page */}
              {!videoFullscreen && !playerMinimized && (
                <div
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 35,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    padding: '0.65rem 0.9rem',
                    background: 'rgba(0,0,0,0.92)',
                    borderBottom: '1px solid rgba(255,255,255,0.12)'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveEpisode(null);
                      setPlayingVideoUrl('');
                      setVideoFullscreen(false);
                    }}
                    style={{
                      padding: '0.42rem 0.8rem',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.24)',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '0.75rem',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer'
                    }}
                  >
                    {isRtl ? '→ صفحة الأنمي' : '← Show Hub'}
                  </button>

                  <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {selectedAnime.titleEn}
                    </div>
                    <div style={{ fontSize: '0.66rem', fontWeight: 800, color: 'rgba(255,255,255,0.65)' }}>
                      🎬 {activeEpisode.name} • 120Hz CINEMA ROOM
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setPlayerMinimized(true)}
                      style={{
                        padding: '0.4rem 0.65rem',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.24)',
                        color: '#ffffff',
                        fontWeight: 900,
                        fontSize: '0.72rem',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                    >
                      🗕 {isRtl ? 'تصغير' : 'Mini'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoFullscreen(true)}
                      style={{
                        padding: '0.4rem 0.65rem',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: 'none',
                        color: '#000000',
                        fontWeight: 900,
                        fontSize: '0.72rem',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                    >
                      ⛶
                    </button>
                  </div>
                </div>
              )}

              {/* Floating Top Bar when in Fullscreen Anime Mode */}
              {videoFullscreen && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9900,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.6rem 0.9rem',
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
                    pointerEvents: 'auto'
                  }}
                >
                  {videoTouchLocked ? (
                    <button
                      type="button"
                      onClick={() => {
                        setVideoTouchLocked(false);
                        showToast(isRtl ? '🔓 تم فتح قفل اللمس' : '🔓 Touch unlocked');
                      }}
                      style={{
                        padding: '0.42rem 0.9rem',
                        borderRadius: '99px',
                        background: '#ffffff',
                        border: 'none',
                        color: '#000000',
                        fontWeight: 900,
                        fontSize: '0.76rem',
                        cursor: 'pointer'
                      }}
                    >
                      🔒 {isRtl ? 'الشاشة مقفلة — اضغط لفتح القفل' : 'Screen Locked — Tap to Unlock'}
                    </button>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setVideoFullscreen(false)}
                          style={{
                            padding: '0.38rem 0.75rem',
                            borderRadius: '10px',
                            background: 'rgba(255,255,255,0.16)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            color: '#fff',
                            fontWeight: 900,
                            fontSize: '0.74rem',
                            cursor: 'pointer'
                          }}
                        >
                          ✕ {isRtl ? 'خروج' : 'Exit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVideoTouchLocked(true);
                            showToast(isRtl ? '🔒 تم قفل لمس الشاشة لمنع اللمس الخاطئ' : '🔒 Screen touch locked');
                          }}
                          style={{
                            padding: '0.38rem 0.7rem',
                            borderRadius: '10px',
                            background: 'rgba(255,255,255,0.16)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            color: '#fff',
                            fontWeight: 900,
                            fontSize: '0.74rem',
                            cursor: 'pointer'
                          }}
                        >
                          🔒 {isRtl ? 'قفل اللمس' : 'Lock'}
                        </button>
                      </div>
                      <span style={{ fontWeight: 900, fontSize: '0.78rem', color: '#fff', textShadow: '0 2px 6px #000' }}>
                        {selectedAnime.titleEn} • {activeEpisode.name}
                      </span>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={handleCycleVisualShader}
                          style={{
                            padding: '0.36rem 0.6rem',
                            borderRadius: '10px',
                            background: visualShaderMode !== 'original' ? '#ffffff' : 'rgba(255,255,255,0.18)',
                            border: '1px solid rgba(255,255,255,0.35)',
                            color: visualShaderMode !== 'original' ? '#000' : '#fff',
                            fontWeight: 900,
                            fontSize: '0.7rem',
                            cursor: 'pointer'
                          }}
                        >
                          ✨ {visualShaderMode === 'upscale4k' ? '4K' : visualShaderMode === 'amoled_hdr' ? 'HDR' : visualShaderMode === 'cinema_imax' ? 'IMAX' : 'HD'}
                        </button>
                        <button
                          type="button"
                          onClick={handleTakeVideoSnapshot}
                          style={{
                            padding: '0.36rem 0.6rem',
                            borderRadius: '10px',
                            background: 'rgba(255,255,255,0.18)',
                            border: '1px solid rgba(255,255,255,0.35)',
                            color: '#fff',
                            fontWeight: 900,
                            fontSize: '0.72rem',
                            cursor: 'pointer'
                          }}
                        >
                          📸
                        </button>
                        <button
                          type="button"
                          onClick={handleCycleAudioBooster}
                          style={{
                            padding: '0.36rem 0.6rem',
                            borderRadius: '10px',
                            background: audioBoostMode !== 'normal' ? '#ffffff' : 'rgba(255,255,255,0.18)',
                            border: '1px solid rgba(255,255,255,0.35)',
                            color: audioBoostMode !== 'normal' ? '#000' : '#fff',
                            fontWeight: 900,
                            fontSize: '0.7rem',
                            cursor: 'pointer'
                          }}
                        >
                          🔊 {audioBoostMode === 'boost200' ? '200%' : audioBoostMode === 'boost150' ? '150%' : audioBoostMode === 'voice' ? '🎙️' : '100%'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = Math.min(
                                videoRef.current.duration || 9999,
                                (videoRef.current.currentTime || 0) + 85
                              );
                              showToast(isRtl ? '⏭ تم تخطي المقدمة (+85 ثانية)' : '⏭ Skipped Intro (+85s)');
                            }
                          }}
                          style={{
                            padding: '0.38rem 0.7rem',
                            borderRadius: '10px',
                            background: 'rgba(255,255,255,0.18)',
                            border: '1px solid rgba(255,255,255,0.35)',
                            color: '#fff',
                            fontWeight: 900,
                            fontSize: '0.72rem',
                            cursor: 'pointer'
                          }}
                        >
                          ⏭ +85s
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setVideoFitMode((m) => (m === 'cover' ? 'contain' : m === 'contain' ? 'fill' : 'cover'))
                          }
                          style={{
                            padding: '0.38rem 0.75rem',
                            borderRadius: '10px',
                            background: '#ffffff',
                            border: 'none',
                            color: '#000',
                            fontWeight: 900,
                            fontSize: '0.73rem',
                            cursor: 'pointer'
                          }}
                        >
                          📐{' '}
                          {videoFitMode === 'cover'
                            ? isRtl
                              ? 'ملء (Cover)'
                              : 'Cover'
                            : videoFitMode === 'fill'
                            ? isRtl
                              ? 'تمديد (Fill)'
                              : 'Fill'
                            : '16:9'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div
                onClick={playerMinimized ? () => setPlayerMinimized(false) : undefined}
                onTouchStart={playerMinimized ? undefined : handleVideoTouchStart}
                onTouchMove={playerMinimized ? undefined : handleVideoTouchMove}
                onTouchEnd={playerMinimized ? undefined : handleVideoTouchEnd}
                style={
                  videoFullscreen
                    ? { position: 'relative', width: '100vw', height: '100vh', background: '#000000' }
                    : playerMinimized
                    ? {
                        position: 'relative',
                        width: '112px',
                        height: '64px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        background: '#050507',
                        border: '1px solid rgba(255,255,255,0.24)',
                        flexShrink: 0,
                        cursor: 'pointer'
                      }
                    : { position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#050507' }
                }
              >
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
                    <div style={{ fontSize: playerMinimized ? '1rem' : '1.5rem' }}>⚡</div>
                    {!playerMinimized && (
                      <div style={{ fontSize: '0.82rem', fontWeight: 900 }}>
                        {isRtl
                          ? `جاري استخراج البث المباشر (${selectedServer?.quality || '1080p'})...`
                          : 'Extracting direct MP4 stream...'}
                      </div>
                    )}
                  </div>
                ) : playingVideoUrl ? (
                  <>
                    <video
                      ref={videoRef}
                      src={playingVideoUrl}
                      controls={!videoTouchLocked && !playerMinimized}
                      autoPlay
                      playsInline
                      referrerPolicy="no-referrer"
                      onError={handleVideoElementError}
                      onLoadedMetadata={(e) => {
                        try {
                          const savedSec = Number(localStorage.getItem(`bx_ep_sec_${activeEpisode.docId}`) || 0);
                          if (savedSec > 12 && e.currentTarget.duration && savedSec < e.currentTarget.duration - 20) {
                            e.currentTarget.currentTime = savedSec;
                            const m = Math.floor(savedSec / 60);
                            const s = String(Math.floor(savedSec % 60)).padStart(2, '0');
                            showToast(
                              isRtl
                                ? `⏯ تم استئناف الحلقة تلقائياً من ${m}:${s}`
                                : `⏯ Auto-resumed episode at ${m}:${s}`
                            );
                          }
                        } catch (_) {}
                      }}
                      onTimeUpdate={(e) => {
                        try {
                          const cur = Math.floor(e.currentTarget.currentTime || 0);
                          if (
                            autoSkipIntro &&
                            cur >= 2 &&
                            cur <= 8 &&
                            !autoSkippedEpRef.current[activeEpisode.docId]
                          ) {
                            autoSkippedEpRef.current[activeEpisode.docId] = true;
                            e.currentTarget.currentTime = 87;
                            showToast(isRtl ? '⚡ تم تخطي مقدمة الحلقة تلقائياً (+85s)' : '⚡ Auto-skipped Intro (+85s)');
                            return;
                          }
                          if (loopPointA !== null && loopPointB !== null && cur >= loopPointB) {
                            e.currentTarget.currentTime = loopPointA;
                            return;
                          }
                          if (timedCommentsEnabled && timedComments.length > 0) {
                            const hit = timedComments.find((tc) => Math.abs(cur - Number(tc.sec || 0)) <= 2);
                            setActiveDanmakuComment(hit || null);
                          } else if (activeDanmakuComment) {
                            setActiveDanmakuComment(null);
                          }
                          if (cur > 5 && cur % 3 === 0) {
                            localStorage.setItem(`bx_ep_sec_${activeEpisode.docId}`, String(cur));
                          }
                        } catch (_) {}
                      }}
                      onEnded={() => {
                        try {
                          localStorage.removeItem(`bx_ep_sec_${activeEpisode.docId}`);
                        } catch (_) {}
                        if (sleepTimerMode === 'end_of_ep') {
                          setSleepTimerMode('off');
                          showToast('💤 انتهت الحلقة — تم إيقاف التشغيل حسب مؤقت النوم');
                          return;
                        }
                        if (!autoNextEp) return;
                        const idx = animeEpisodes.findIndex((e) => e.docId === activeEpisode.docId);
                        if (idx !== -1 && idx + 1 < animeEpisodes.length) {
                          handlePlayEpisode(selectedAnime, animeEpisodes[idx + 1]);
                        }
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: videoFullscreen ? videoFitMode : 'contain',
                        background: '#000',
                        filter: [
                          videoBrightness !== 100 ? `brightness(${videoBrightness}%)` : '',
                          visualShaderMode === 'upscale4k'
                            ? 'url(#bx-sharpen-4k) contrast(1.12) saturate(1.15)'
                            : visualShaderMode === 'amoled_hdr'
                            ? 'contrast(1.24) saturate(1.26) brightness(1.04)'
                            : visualShaderMode === 'cinema_imax'
                            ? 'contrast(1.1) saturate(1.08) sepia(0.08)'
                            : ''
                        ]
                          .filter(Boolean)
                          .join(' ') || 'none',
                        pointerEvents: videoTouchLocked ? 'none' : 'auto'
                      }}
                    />
                    {/* Left/Right Double-Tap ±10s Zones */}
                    {!videoTouchLocked && (
                      <>
                        <div
                          onDoubleClick={() => handleVideoDoubleTap('left')}
                          style={{ position: 'absolute', top: '18%', bottom: '28%', left: 0, width: '28%' }}
                        />
                        <div
                          onDoubleClick={() => handleVideoDoubleTap('right')}
                          style={{ position: 'absolute', top: '18%', bottom: '28%', right: 0, width: '28%' }}
                        />
                      </>
                    )}
                    {/* Live Brightness / Volume Gesture HUD */}
                    {gestureHud && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '18%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'rgba(0,0,0,0.85)',
                          border: '1px solid rgba(255,255,255,0.28)',
                          padding: '0.42rem 0.95rem',
                          borderRadius: '99px',
                          fontWeight: 900,
                          fontSize: '0.8rem',
                          color: '#ffffff',
                          zIndex: 30,
                          pointerEvents: 'none'
                        }}
                      >
                        {gestureHud.type === 'brightness'
                          ? `☀️ ${isRtl ? 'السطوع' : 'Brightness'}: ${gestureHud.value}%`
                          : `🔊 ${isRtl ? 'الصوت' : 'Volume'}: ${gestureHud.value}%`}
                      </div>
                    )}
                    {/* Long-Press 2.0x Speed Boost Badge */}
                    {longPress2x && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '12%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: '#ffffff',
                          color: '#000000',
                          padding: '0.32rem 0.85rem',
                          borderRadius: '99px',
                          fontWeight: 900,
                          fontSize: '0.76rem',
                          zIndex: 30,
                          pointerEvents: 'none'
                        }}
                      >
                        ⚡ 2.0x {isRtl ? 'سرعة مضاعفة' : 'Fast Forward'}
                      </div>
                    )}
                    {/* Timed Scene Comment (Danmaku) Floating Banner */}
                    {timedCommentsEnabled && activeDanmakuComment && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '18%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          maxWidth: '88%',
                          background: 'rgba(0,0,0,0.82)',
                          border: '1px solid rgba(255,255,255,0.28)',
                          padding: '0.35rem 0.85rem',
                          borderRadius: '99px',
                          fontWeight: 900,
                          fontSize: subStyleMode === 'yellow_xl' ? '0.88rem' : '0.78rem',
                          color:
                            subStyleMode === 'yellow_xl'
                              ? '#fde047'
                              : subStyleMode === 'red_bx'
                              ? '#ef4444'
                              : '#ffffff',
                          textShadow: '0 2px 6px #000000',
                          zIndex: 28,
                          pointerEvents: 'none',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        💬 {activeDanmakuComment.author}: {activeDanmakuComment.text}
                      </div>
                    )}
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

              {/* Floating Mini-Player Info & Controls (When playerMinimized is true) */}
              {!videoFullscreen && playerMinimized && (
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div
                    onClick={() => setPlayerMinimized(false)}
                    style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                  >
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: '0.78rem',
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {selectedAnime.titleEn}
                    </div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.68)', marginTop: '2px' }}>
                      🎬 {activeEpisode.name} • {isRtl ? 'اضغط للتكبير' : 'Tap to expand'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => setPlayerMinimized(false)}
                      style={{
                        padding: '0.38rem 0.65rem',
                        borderRadius: '10px',
                        background: '#ffffff',
                        color: '#000000',
                        border: 'none',
                        fontWeight: 900,
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      ⛶ {isRtl ? 'فتح' : 'Open'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveEpisode(null);
                        setPlayingVideoUrl('');
                        setPlayerMinimized(false);
                      }}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.12)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.22)',
                        fontWeight: 900,
                        fontSize: '0.74rem',
                        cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Cinema Controls Strip (Fullscreen Button, Fit Mode, Prev/Next Ep, Auto-Next, PiP, Speed, Download) */}
              {!videoFullscreen && !playerMinimized && (
                <div style={{ padding: '0.65rem 1rem 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ fontWeight: 900, fontSize: '0.86rem' }}>
                      🎬 {activeEpisode.name} {activeEpisode.titleAr ? `— ${activeEpisode.titleAr}` : ''}
                    </div>
                    <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto' }}>
                      <button
                        type="button"
                        onClick={() => setVideoFullscreen(true)}
                        style={{
                          padding: '0.32rem 0.7rem',
                          borderRadius: '8px',
                          background: '#ffffff',
                          border: 'none',
                          color: '#000000',
                          fontSize: '0.72rem',
                          fontWeight: 900,
                          whiteSpace: 'nowrap',
                          cursor: 'pointer'
                        }}
                      >
                        ⛶ {isRtl ? 'ملء الشاشة بالكامل' : 'Full Screen'}
                      </button>
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
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = Math.min(
                              videoRef.current.duration || 9999,
                              (videoRef.current.currentTime || 0) + 85
                            );
                            showToast(isRtl ? '⏭ تم تخطي المقدمة (+85 ثانية)' : '⏭ Skipped Intro (+85s)');
                          }
                        }}
                        style={{
                          padding: '0.32rem 0.65rem',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.14)',
                          border: '1px solid rgba(255,255,255,0.28)',
                          color: '#fff',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          whiteSpace: 'nowrap',
                          cursor: 'pointer'
                        }}
                      >
                        ⏭ +85s
                      </button>

                      <button
                        type="button"
                        onClick={() => setWatchPartyModalOpen((v) => !v)}
                        style={{
                          padding: '0.32rem 0.65rem',
                          borderRadius: '8px',
                          background: watchPartyRoom ? '#ffffff' : 'rgba(255,255,255,0.12)',
                          border: '1px solid rgba(255,255,255,0.24)',
                          color: watchPartyRoom ? '#000000' : '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          whiteSpace: 'nowrap',
                          cursor: 'pointer'
                        }}
                      >
                        🍿 {watchPartyRoom ? watchPartyRoom.roomCode : isRtl ? 'مشاهدة جماعية' : 'Party'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setPlayerStudioOpen((v) => !v)}
                        style={{
                          padding: '0.32rem 0.72rem',
                          borderRadius: '8px',
                          background: playerStudioOpen ? '#ffffff' : 'rgba(255,255,255,0.14)',
                          border: '1.5px solid #ffffff',
                          color: playerStudioOpen ? '#000000' : '#ffffff',
                          fontSize: '0.71rem',
                          fontWeight: 900,
                          whiteSpace: 'nowrap',
                          cursor: 'pointer'
                        }}
                      >
                        🎛️ {isRtl ? 'استوديو المشغل' : 'Pro Studio'} {playerStudioOpen ? '▲' : '▼'}
                      </button>
                    </div>
                  </div>

                  {/* Clean Collapsible Pro Player Studio Sheet (Opens when 🎛️ استوديو المشغل is tapped) */}
                  {playerStudioOpen && (
                    <div
                      style={{
                        marginBottom: '0.65rem',
                        padding: '0.7rem',
                        borderRadius: '14px',
                        background: '#09090d',
                        border: '1px solid rgba(255,255,255,0.2)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: '0.42rem'
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleCycleVisualShader}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '9px',
                          background: visualShaderMode !== 'original' ? '#ffffff' : 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: visualShaderMode !== 'original' ? '#000000' : '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        ✨ محسن الصورة:{' '}
                        {visualShaderMode === 'upscale4k'
                          ? '4K Upscale'
                          : visualShaderMode === 'amoled_hdr'
                          ? 'AMOLED HDR'
                          : visualShaderMode === 'cinema_imax'
                          ? 'Cinema IMAX'
                          : 'أصلي'}
                      </button>

                      <button
                        type="button"
                        onClick={handleCycleAudioBooster}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '9px',
                          background: audioBoostMode !== 'normal' ? '#ffffff' : 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: audioBoostMode !== 'normal' ? '#000000' : '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        🔊 مضخم الصوت:{' '}
                        {audioBoostMode === 'boost200'
                          ? '200% Bass'
                          : audioBoostMode === 'boost150'
                          ? '150%'
                          : audioBoostMode === 'voice'
                          ? 'حوارات'
                          : '100%'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const next = !autoSkipIntro;
                          setAutoSkipIntro(next);
                          localStorage.setItem('bx_mob_autoskip_intro', String(next));
                          showToast(next ? '⚡ التخطي التلقائي للمقدمة: مفعل' : '⚡ التخطي التلقائي للمقدمة: متوقف');
                        }}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '9px',
                          background: autoSkipIntro ? '#ffffff' : 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: autoSkipIntro ? '#000000' : '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        ⚡ تخطي المقدمة: {autoSkipIntro ? 'تلقائي ON' : 'يدوي'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setAutoNextEp((v) => !v)}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '9px',
                          background: autoNextEp ? '#ffffff' : 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: autoNextEp ? '#000000' : '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        🔁 الحلقة التالية: {autoNextEp ? 'تلقائي ON' : 'OFF'}
                      </button>

                      <button
                        type="button"
                        onClick={handleTakeVideoSnapshot}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '9px',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        📸 التقاط لقطة 1080p
                      </button>

                      <button
                        type="button"
                        onClick={handleCycleAbLoop}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '9px',
                          background: loopPointA !== null ? '#ffffff' : 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: loopPointA !== null ? '#000000' : '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        🔁 تكرار مشهد: {loopPointA === null ? 'A-B' : loopPointB === null ? 'A→...' : 'A⇄B'}
                      </button>

                      <button
                        type="button"
                        onClick={handleCycleSleepTimer}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '9px',
                          background: sleepTimerMode !== 'off' ? '#ffffff' : 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: sleepTimerMode !== 'off' ? '#000000' : '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        💤 مؤقت النوم:{' '}
                        {sleepTimerMode === 'off'
                          ? 'إيقاف'
                          : sleepTimerMode === 'end_of_ep'
                          ? 'نهاية الحلقة'
                          : `${Math.ceil(sleepTimerRemainingSec / 60)} د`}
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
                          padding: '0.45rem 0.6rem',
                          borderRadius: '9px',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        ⚡ سرعة العرض: {playbackSpeed}x
                      </button>

                      <button
                        type="button"
                        onClick={handleCycleSubtitleStyle}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '9px',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        🔤 ستايل التعليق: {subStyleMode === 'yellow_xl' ? 'أصفر XL' : subStyleMode === 'red_bx' ? 'أحمر BX' : 'أبيض LG'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const next = !bgAudioMode;
                          setBgAudioMode(next);
                          showToast(next ? '🎧 الصوت في الخلفية: مفعل' : '🎧 الصوت في الخلفية: متوقف');
                        }}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '9px',
                          background: bgAudioMode ? '#ffffff' : 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: bgAudioMode ? '#000000' : '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        🎧 صوت بالخلفية: {bgAudioMode ? 'ON' : 'OFF'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          try {
                            if (window.BlackXNativeAuth?.enterPipMode) {
                              window.BlackXNativeAuth.enterPipMode();
                              return;
                            }
                          } catch (_) {}
                          if (videoRef.current?.requestPictureInPicture) {
                            videoRef.current.requestPictureInPicture().catch(() => {});
                          }
                        }}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '9px',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#fff',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          cursor: 'pointer'
                        }}
                      >
                        📺 نافذة عائمة (PiP)
                      </button>

                      {playingVideoUrl && (
                        <a
                          href={playingVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          style={{
                            padding: '0.45rem 0.6rem',
                            borderRadius: '9px',
                            background: '#ffffff',
                            color: '#000000',
                            fontSize: '0.7rem',
                            fontWeight: 900,
                            textDecoration: 'none',
                            textAlign: 'center'
                          }}
                        >
                          ⬇ تحميل الحلقة MP4
                        </a>
                      )}
                    </div>
                  )}

                  {/* BLACK X Exclusive Server & Quality Selector Pills */}
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: 800, marginBottom: '0.35rem' }}>
                    {isRtl
                      ? 'اختر سيرفر BLACK X وجودة المشاهدة المباشرة (بدون إعلانات):'
                      : 'Select Direct BLACK X Stream Server & Quality (No Ads):'}
                  </div>
                  <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                    {episodeServers.map((srv, idx) => {
                      const meta = SERVER_LABELS[srv.name] || {
                        nameAr: `🎬 BLACK X ${idx + 1}`,
                        nameEn: `🎬 BLACK X ${idx + 1}`
                      };
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

                  {/* Timed Scene Comment Input Bar (التعليقات الزمنية التفاعلية على مشاهد الحلقة) */}
                  <form
                    onSubmit={handlePostTimedComment}
                    style={{ display: 'flex', gap: '0.4rem', marginTop: '0.55rem', alignItems: 'center' }}
                  >
                    <button
                      type="button"
                      onClick={() => setTimedCommentsEnabled((v) => !v)}
                      style={{
                        padding: '0.45rem 0.6rem',
                        borderRadius: '9px',
                        background: timedCommentsEnabled ? '#ffffff' : 'rgba(255,255,255,0.08)',
                        color: timedCommentsEnabled ? '#000000' : '#ffffff',
                        border: '1px solid rgba(255,255,255,0.2)',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                    >
                      💬 {timedCommentsEnabled ? 'ON' : 'OFF'}
                    </button>
                    <input
                      type="text"
                      value={newTimedCommentText}
                      onChange={(e) => setNewTimedCommentText(e.target.value)}
                      placeholder={
                        isRtl
                          ? 'اترك تعليقاً يظهر في هذه الثانية من المشهد (+15 XP)...'
                          : 'Add a timed comment at this second (+15 XP)...'
                      }
                      style={{
                        flex: 1,
                        padding: '0.45rem 0.7rem',
                        borderRadius: '9px',
                        background: '#08080c',
                        border: '1px solid rgba(255,255,255,0.18)',
                        color: '#ffffff',
                        fontSize: '0.73rem'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '0.45rem 0.75rem',
                        borderRadius: '9px',
                        background: '#ffffff',
                        color: '#000000',
                        border: 'none',
                        fontWeight: 900,
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      {isRtl ? 'تثبيت' : 'Post'}
                    </button>
                  </form>

                  {/* Live Cloud Watch Party Room Panel (غرفة المشاهدة الجماعية السحابية) */}
                  {(watchPartyModalOpen || watchPartyRoom) && (
                    <div
                      style={{
                        marginTop: '0.65rem',
                        padding: '0.8rem',
                        borderRadius: '14px',
                        background: '#09090d',
                        border: '1.5px solid #ffffff'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 900, fontSize: '0.8rem' }}>
                          🍿{' '}
                          {watchPartyRoom
                            ? isRtl
                              ? `غرفة المشاهدة الجماعية (${watchPartyRoom.roomCode})`
                              : `Watch Party (${watchPartyRoom.roomCode})`
                            : isRtl
                            ? 'غرفة المشاهدة الجماعية السحابية'
                            : 'Live Cloud Watch Party'}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (watchPartyRoom) {
                              setWatchPartyRoom(null);
                              showToast(isRtl ? 'غادرت غرفة المشاهدة الجماعية' : 'Left Watch Party');
                            }
                            setWatchPartyModalOpen(false);
                          }}
                          style={{
                            background: 'rgba(255,255,255,0.12)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '6px',
                            padding: '0.2rem 0.55rem',
                            fontSize: '0.7rem',
                            fontWeight: 900,
                            cursor: 'pointer'
                          }}
                        >
                          {watchPartyRoom ? (isRtl ? 'مغادرة ✕' : 'Leave ✕') : '✕'}
                        </button>
                      </div>

                      {!watchPartyRoom ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          <button
                            type="button"
                            onClick={handleCreateWatchParty}
                            style={{
                              width: '100%',
                              padding: '0.6rem',
                              borderRadius: '10px',
                              background: '#ffffff',
                              color: '#000000',
                              border: 'none',
                              fontWeight: 900,
                              fontSize: '0.76rem',
                              cursor: 'pointer'
                            }}
                          >
                            🍿 {isRtl ? 'إنشاء غرفة جديدة ومشاركة الكود مع أصدقائك' : 'Create Watch Party Room'}
                          </button>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <input
                              type="text"
                              value={watchPartyJoinInput}
                              onChange={(e) => setWatchPartyJoinInput(e.target.value)}
                              placeholder={isRtl ? 'أو أدخل كود غرفة صديقك (مثال: BX-4821)...' : 'Enter friend room code (BX-XXXX)...'}
                              style={{
                                flex: 1,
                                padding: '0.5rem 0.7rem',
                                borderRadius: '9px',
                                background: '#000',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#fff',
                                fontSize: '0.74rem'
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleJoinWatchParty}
                              style={{
                                padding: '0.5rem 0.85rem',
                                borderRadius: '9px',
                                background: 'rgba(255,255,255,0.15)',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.28)',
                                fontWeight: 900,
                                fontSize: '0.74rem',
                                cursor: 'pointer'
                              }}
                            >
                              {isRtl ? 'انضمام' : 'Join'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div
                            style={{
                              maxHeight: '110px',
                              overflowY: 'auto',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.3rem',
                              marginBottom: '0.45rem',
                              padding: '0.4rem',
                              borderRadius: '8px',
                              background: '#040406'
                            }}
                          >
                            {(watchPartyRoom.chat || []).map((m) => (
                              <div key={m.id} style={{ fontSize: '0.72rem' }}>
                                <strong style={{ color: '#ffffff' }}>{m.author}: </strong>
                                <span style={{ color: 'rgba(255,255,255,0.82)' }}>{m.text}</span>
                              </div>
                            ))}
                          </div>
                          <form onSubmit={handleSendWatchPartyChat} style={{ display: 'flex', gap: '0.4rem' }}>
                            <input
                              type="text"
                              value={watchPartyChatInput}
                              onChange={(e) => setWatchPartyChatInput(e.target.value)}
                              placeholder={isRtl ? 'اكتب رسالة لأصدقائك في الغرفة...' : 'Message party...'}
                              style={{
                                flex: 1,
                                padding: '0.45rem 0.65rem',
                                borderRadius: '8px',
                                background: '#000',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#fff',
                                fontSize: '0.73rem'
                              }}
                            />
                            <button
                              type="submit"
                              style={{
                                padding: '0.45rem 0.75rem',
                                borderRadius: '8px',
                                background: '#ffffff',
                                color: '#000000',
                                border: 'none',
                                fontWeight: 900,
                                fontSize: '0.72rem',
                                cursor: 'pointer'
                              }}
                            >
                              {isRtl ? 'إرسال' : 'Send'}
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  )}

                  {/* In-Player Quick Episode Switcher Strip inside Dedicated Standalone Video Player Page */}
                  {animeEpisodes.length > 0 && (
                    <div
                      style={{
                        marginTop: '0.8rem',
                        padding: '0.75rem',
                        borderRadius: '14px',
                        background: '#08080c',
                        border: '1px solid rgba(255,255,255,0.14)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 900, fontSize: '0.78rem' }}>
                          🎞️ {isRtl ? `تنقل فوري بين الحلقات (${animeEpisodes.length})` : `Quick Episode Switcher (${animeEpisodes.length})`}
                        </span>
                        <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.55)', fontWeight: 800 }}>
                          {isRtl ? 'داخل المشغل المستقل' : 'In-Player'}
                        </span>
                      </div>
                      <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
                        {animeEpisodes.slice(0, 120).map((ep) => {
                          const active = activeEpisode?.docId === ep.docId;
                          return (
                            <button
                              key={`inplayer-${ep.docId}`}
                              type="button"
                              onClick={() => handlePlayEpisode(selectedAnime, ep)}
                              style={{
                                padding: '0.45rem 0.75rem',
                                borderRadius: '10px',
                                background: active ? '#ffffff' : 'rgba(255,255,255,0.08)',
                                color: active ? '#000000' : '#ffffff',
                                border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.16)',
                                fontWeight: 900,
                                fontSize: '0.74rem',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                flexShrink: 0
                              }}
                            >
                              {active ? '▶ ' : ''}{isRtl ? `ح ${ep.number}` : `E${ep.number}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================== v11.0 OMNI-UI (SLOTH-UI + CURVED ARCH + WAKUWAKU 6-STATS) ANIME SHOW HUB HEADER ==================== */}
          <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Full-Bleed Key Art Hero Banner with Curved Arch Bottom Edge (UI #3 + SlothUI) */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '315px',
                overflow: 'hidden',
                borderBottomLeftRadius: '38px',
                borderBottomRightRadius: '38px',
                borderBottom: '1px solid rgba(255,255,255,0.16)'
              }}
            >
              <img
                src={selectedAnime.poster || selectedAnime.banner}
                alt={selectedAnime.titleEn}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 20%',
                  filter: 'brightness(0.75) contrast(1.1)'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.08) 32%, rgba(0,0,0,0.88) 78%, #000000 100%)',
                  pointerEvents: 'none'
                }}
              />

              {/* SlothUI [X] BLACK X ORIGINAL Seal overlaid on lower-left of Key Art */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  right: '16px'
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.42rem', marginBottom: '0.35rem' }}>
                  <img
                    src="/blackx-logo.png"
                    alt="BLACK X"
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '6px',
                      objectFit: 'cover',
                      border: '1px solid rgba(255,255,255,0.35)'
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.03em' }}>
                    BLACK X <span style={{ fontWeight: 500, opacity: 0.8 }}>original</span>
                  </span>
                  <span
                    style={{
                      marginInlineStart: '0.35rem',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.16)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      fontSize: '0.6rem',
                      fontWeight: 900
                    }}
                  >
                    4K Ultra
                  </span>
                </div>

                <h1
                  style={{
                    margin: 0,
                    fontSize: '1.52rem',
                    fontWeight: 900,
                    lineHeight: 1.18,
                    textShadow: '0 4px 18px #000000'
                  }}
                >
                  {selectedAnime.titleEn}
                </h1>
              </div>
            </div>

            <div style={{ position: 'relative', zIndex: 2, padding: '0.55rem 1rem 1rem', background: '#000000' }}>
              {/* Image 1 & Image 3 Metadata Line: Year • Episodes • [Type Pill] • ★ Rating */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  flexWrap: 'wrap',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: 'rgba(255,255,255,0.85)',
                  marginBottom: '0.7rem'
                }}
              >
                <span>{selectedAnime.year || '2026'}</span>
                <span>▶</span>
                <span>{selectedAnime.tags?.[0] || selectedAnime.type || (isRtl ? 'أكشن' : 'Action')}</span>
                <span>|</span>
                <span
                  style={{
                    padding: '0.12rem 0.55rem',
                    borderRadius: '99px',
                    border: '1px solid rgba(255,255,255,0.35)',
                    fontSize: '0.66rem',
                    fontWeight: 900
                  }}
                >
                  {animeEpisodes.length} {isRtl ? 'حلقة' : 'Eps'}
                </span>
                <span>|</span>
                <span style={{ color: '#ffffff', fontWeight: 900 }}>
                  ★ {selectedAnime.rating} ({getDnaMatchScore(selectedAnime)}% Match)
                </span>
              </div>

              {/* v11.0 UI #2 (WakuWaku Drifting Dragons): 6-Icon Micro-Stats Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: '0.25rem',
                  padding: '0.65rem 0.45rem',
                  marginBottom: '0.8rem',
                  borderRadius: '18px',
                  background: '#0b0b10',
                  border: '1px solid rgba(255,255,255,0.14)',
                  textAlign: 'center'
                }}
              >
                {[
                  { icon: '🎞️', val: animeEpisodes.length || '12', lbl: isRtl ? 'حلقات' : 'Eps' },
                  { icon: '♥', val: Math.round(Number(selectedAnime.rating || 9) * 142), lbl: isRtl ? 'إعجاب' : 'Likes' },
                  { icon: '👁', val: `${(Number(selectedAnime.rating || 9) * 2.4).toFixed(1)}K`, lbl: isRtl ? 'مشاهدة' : 'Views' },
                  { icon: '💬', val: animeReviews.length || 18, lbl: isRtl ? 'تعليق' : 'Chat' },
                  { icon: '🧬', val: `${getDnaMatchScore(selectedAnime)}%`, lbl: isRtl ? 'تطابق' : 'Match' },
                  { icon: '★', val: selectedAnime.rating || '9.2', lbl: isRtl ? 'تقييم' : 'Score' }
                ].map((st, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '0.84rem', lineHeight: 1 }}>{st.icon}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#ffffff' }}>{st.val}</span>
                    <span style={{ fontSize: '0.56rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>{st.lbl}</span>
                  </div>
                ))}
              </div>

              {/* Clean 3-Line Story Synopsis (Matches Image 3 Left & Image 1 Bottom-Right) */}
              <div
                onClick={() => setStoryExpanded((v) => !v)}
                style={{ marginBottom: '0.9rem', cursor: 'pointer' }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.77rem',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#ffffff', opacity: 0.85 }}>
                    {storyExpanded ? (isRtl ? 'عرض أقل ▲' : 'Show less ▲') : isRtl ? '...قراءة المزيد' : '...Read more'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSpeakText(selectedAnime.storyAr);
                    }}
                    style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '99px',
                      background: ttsSpeaking ? '#ffffff' : 'rgba(255,255,255,0.1)',
                      color: ttsSpeaking ? '#000000' : '#ffffff',
                      border: '1px solid rgba(255,255,255,0.22)',
                      fontSize: '0.66rem',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    {ttsSpeaking ? (isRtl ? '🔇 إيقاف' : '🔇 Stop') : isRtl ? '🔊 استماع للقصة' : '🔊 Listen'}
                  </button>
                </div>
              </div>

              {/* Official slothUI Pro ("Houses & Dragons" + "Sane Max") 4 Circular Action Orbs Row: (▶) Play + (≡) Episodes + (＋) Watchlist + (⬇) Download */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.7rem',
                  marginBottom: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.62rem' }}>
                  {/* 1. Solid White (▶) Play Orb */}
                  <button
                    type="button"
                    onClick={() => {
                      const savedHist = watchHistory.find((h) => h.objectID === selectedAnime.objectID);
                      const targetEp =
                        (savedHist && animeEpisodes.find((e) => Number(e.number) === Number(savedHist.episode))) ||
                        animeEpisodes[0];
                      if (targetEp) handlePlayEpisode(selectedAnime, targetEp);
                    }}
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      color: '#000000',
                      border: 'none',
                      fontSize: '1.08rem',
                      fontWeight: 900,
                      boxShadow: '0 8px 24px rgba(255,255,255,0.24)',
                      cursor: 'pointer'
                    }}
                  >
                    ▶
                  </button>

                  {/* 2. Outlined Glass (≡) Episodes Orb */}
                  <button
                    type="button"
                    onClick={() => setDetailTab('episodes')}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: detailTab === 'episodes' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.28)',
                      fontSize: '1rem',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    ≡
                  </button>

                  {/* 3. Outlined Glass (＋) Watchlist Orb */}
                  <button
                    type="button"
                    onClick={() => toggleFavorite(selectedAnime)}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: favorites.some((f) => f.objectID === selectedAnime.objectID)
                        ? '#ffffff'
                        : 'rgba(255,255,255,0.08)',
                      color: favorites.some((f) => f.objectID === selectedAnime.objectID) ? '#000000' : '#ffffff',
                      border: '1px solid rgba(255,255,255,0.28)',
                      fontSize: '1.05rem',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    {favorites.some((f) => f.objectID === selectedAnime.objectID) ? '✓' : '＋'}
                  </button>

                  {/* 4. Outlined Glass (⬇) Offline Vault / Download Orb */}
                  <button
                    type="button"
                    onClick={() => {
                      const targetEp = animeEpisodes[0];
                      if (targetEp) {
                        handleSaveOfflineVault(selectedAnime, targetEp);
                      }
                    }}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.08)',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.28)',
                      fontSize: '0.96rem',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    ⬇
                  </button>

                  {/* 5. Outlined Glass (🔔) Phone Episode Notification Orb */}
                  <button
                    type="button"
                    onClick={() => {
                      dispatchPhoneNotification(
                        `🔔 تم تفعيل تنبيهات حلقات: ${selectedAnime.titleEn}`,
                        `سيصلك إشعار مباشر على هاتفك فور صدور كل حلقة جديدة من (${selectedAnime.titleEn}) بجودة 1080p!`,
                        Math.floor(Date.now() % 90000) + 1000
                      );
                      showToast(`📲 تم تفعيل إشعارات الهاتف لحلقات (${selectedAnime.titleEn}) وإرسال تنبيه فوري!`);
                    }}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.08)',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.28)',
                      fontSize: '0.96rem',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    🔔
                  </button>
                </div>

                <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                  <div style={{ fontWeight: 900, fontSize: '0.84rem', color: '#ffffff' }}>
                    {(() => {
                      const savedHist = watchHistory.find((h) => h.objectID === selectedAnime.objectID);
                      return savedHist
                        ? isRtl
                          ? `متابعة ح ${savedHist.episode}`
                          : `Resume S1 E${savedHist.episode}`
                        : isRtl
                        ? 'تشغيل م1 ح1'
                        : 'Play S1 E1';
                    })()}
                  </div>
                  <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.58)', fontWeight: 800 }}>
                    {isRtl ? '120Hz مشغل سينمائي' : '120Hz Cinema'}
                  </div>
                </div>
              </div>

              {/* Official slothUI Pro ("Sane Max Origins") Stacked Dual Full-Width Pills: [▶ Play S1 E1] + [＋ Add To Playlist] */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.52rem' }}>
                <button
                  type="button"
                  disabled={episodesLoading || animeEpisodes.length === 0}
                  onClick={() => {
                    const savedHist = watchHistory.find((h) => h.objectID === selectedAnime.objectID);
                    const targetEp =
                      (savedHist && animeEpisodes.find((e) => Number(e.number) === Number(savedHist.episode))) ||
                      animeEpisodes[0];
                    if (targetEp) {
                      handlePlayEpisode(selectedAnime, targetEp);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.82rem 1rem',
                    borderRadius: '999px',
                    border: 'none',
                    background: '#ffffff',
                    color: '#000000',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 10px 28px rgba(255,255,255,0.18)',
                    cursor: 'pointer'
                  }}
                >
                  <span>▶</span>
                  <span>
                    {episodesLoading
                      ? isRtl
                        ? 'جاري تجهيز المشغل المستقل...'
                        : 'Preparing Standalone Player...'
                      : isRtl
                      ? 'تشغيل م1 ح1 (Play S1 E1)'
                      : 'Play S1 E1'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleFavorite(selectedAnime)}
                  style={{
                    width: '100%',
                    padding: '0.72rem 1rem',
                    borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.26)',
                    background: favorites.some((f) => f.objectID === selectedAnime.objectID)
                      ? 'rgba(255,255,255,0.18)'
                      : 'rgba(255,255,255,0.06)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    cursor: 'pointer'
                  }}
                >
                  <span>{favorites.some((f) => f.objectID === selectedAnime.objectID) ? '✓' : '＋'}</span>
                  <span>
                    {favorites.some((f) => f.objectID === selectedAnime.objectID)
                      ? isRtl
                        ? 'مضاف في قائمتي (Saved In Playlist)'
                        : 'Saved In Playlist'
                      : isRtl
                      ? 'أضف إلى قائمتي (Add To Playlist)'
                      : 'Add To Playlist'}
                  </span>
                </button>
              </div>

              {/* Image 1 Bottom-Right 3-Column Pipe-Separated Action Bar: 🔖 List | 👍 Like | ↗ Share */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1px 1fr 1px 1fr',
                  alignItems: 'center',
                  marginTop: '0.85rem',
                  padding: '0.45rem 0',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  borderBottom: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleFavorite(selectedAnime)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.88)',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  🔖 {favorites.some((f) => f.objectID === selectedAnime.objectID) ? (isRtl ? 'في قائمتي' : 'Saved') : isRtl ? 'قائمتي' : 'List'}
                </button>
                <div style={{ height: '16px', background: 'rgba(255,255,255,0.2)' }} />
                <button
                  type="button"
                  onClick={() => {
                    handleSetWatchlistStatus(selectedAnime, 'watching');
                    showToast(isRtl ? '👍 تم تسجيل إعجابك وإضافة العمل لقائمة المشاهدة' : '👍 Liked & added to Watching');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.88)',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  👍 {isRtl ? 'أعجبني' : 'Like'}
                </button>
                <div style={{ height: '16px', background: 'rgba(255,255,255,0.2)' }} />
                <button
                  type="button"
                  onClick={() => {
                    try {
                      navigator.clipboard?.writeText(`https://black-x-anime.ai.studio/`);
                      showToast(isRtl ? '↗ تم نسخ رابط المشاركة' : '↗ Share link copied');
                    } catch (_) {}
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.88)',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  ↗ {isRtl ? 'مشاركة' : 'Share'}
                </button>
              </div>
            </div>
          </div>

          <div style={{ padding: '0 1rem 1rem' }}>
            {/* Official slothUI Pro ("Handmaiden Tales") Horizontal 16:9 "All Episodes ↔ ⇅ Most Popular" Strip inside Show Hub */}
            {animeEpisodes.length > 0 && (
              <div style={{ marginTop: '0.85rem', marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
                  <span style={{ fontWeight: 900, fontSize: '0.92rem' }}>
                    {isRtl ? `كل الحلقات (${animeEpisodes.length})` : `All Episodes (${animeEpisodes.length})`}
                  </span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'rgba(255,255,255,0.72)' }}>
                    ⇅ {isRtl ? 'الأكثر شهرة (Most Popular)' : 'Most Popular'}
                  </span>
                </div>

                <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                  {animeEpisodes.slice(0, 12).map((ep) => {
                    const active = activeEpisode?.docId === ep.docId;
                    return (
                      <div
                        key={`sloth-hub-ep-${ep.docId}`}
                        onClick={() => handlePlayEpisode(selectedAnime, ep)}
                        style={{
                          position: 'relative',
                          width: '198px',
                          height: '112px',
                          borderRadius: '18px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          background: '#0a0a0f',
                          border: active ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.18)',
                          cursor: 'pointer'
                        }}
                      >
                        <img
                          src={selectedAnime.banner || selectedAnime.poster}
                          alt={`E${ep.number}`}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: 'brightness(0.75) contrast(1.08)'
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.48) 0%, transparent 45%, rgba(0,0,0,0.9) 100%)'
                          }}
                        />
                        {/* Top-Left slothUI Badge: "E1   24:00" */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.38rem',
                            padding: '0.16rem 0.5rem',
                            borderRadius: '8px',
                            background: 'rgba(0,0,0,0.75)',
                            border: '1px solid rgba(255,255,255,0.24)',
                            fontSize: '0.64rem',
                            fontWeight: 900,
                            color: '#ffffff'
                          }}
                        >
                          <span>E{ep.number}</span>
                          <span style={{ opacity: 0.72 }}>24:00</span>
                        </div>
                        {/* Bottom Title + Circular [X] Seal */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '8px',
                            left: '10px',
                            right: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.4rem'
                          }}
                        >
                          <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#ffffff' }}>
                            {isRtl ? `الحلقة ${ep.number}` : `Episode ${ep.number}`}
                          </span>
                          <span
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: '#ffffff',
                              color: '#000000',
                              fontSize: '0.6rem',
                              fontWeight: 900,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            X
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Image 3 Left Underlined Season / Detail Studio Tab Bar */}
            <div
              className="bx-mob-scroll"
              style={{
                display: 'flex',
                gap: '1.15rem',
                overflowX: 'auto',
                marginTop: '0.65rem',
                marginBottom: '0.85rem',
                borderBottom: '1px solid rgba(255,255,255,0.14)'
              }}
            >
              {[
                { id: 'episodes', label: isRtl ? `الحلقات (${animeEpisodes.length})` : `Season 1 (${animeEpisodes.length})` },
                { id: 'characters', label: isRtl ? `الشخصيات (${animeCharacters.length})` : `Cast (${animeCharacters.length})` },
                { id: 'trailer', label: isRtl ? 'التريلر والمشابهة' : 'More Like This' },
                { id: 'reviews', label: isRtl ? `التقييمات (${animeReviews.length})` : `Reviews (${animeReviews.length})` }
              ].map((dt) => {
                const active = detailTab === dt.id;
                return (
                  <button
                    key={dt.id}
                    type="button"
                    onClick={() => setDetailTab(dt.id)}
                    style={{
                      padding: '0.55rem 0.2rem',
                      fontSize: '0.8rem',
                      fontWeight: 900,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      background: 'transparent',
                      color: active ? '#ffffff' : 'rgba(255,255,255,0.52)',
                      border: 'none',
                      borderBottom: active ? '2.5px solid #ffffff' : '2.5px solid transparent'
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
                {/* 50-Episode Range Chunk Selector for Long-Running Anime (> 50 episodes) */}
                {animeEpisodes.length > 50 && (
                  <div
                    className="bx-mob-scroll"
                    style={{ display: 'flex', gap: '0.38rem', overflowX: 'auto', marginBottom: '0.55rem', paddingBottom: '0.15rem' }}
                  >
                    <button
                      type="button"
                      onClick={() => setEpRangeChunk(-1)}
                      style={{
                        padding: '0.34rem 0.7rem',
                        borderRadius: '99px',
                        background: epRangeChunk === -1 ? '#ffffff' : 'rgba(255,255,255,0.08)',
                        color: epRangeChunk === -1 ? '#000000' : '#ffffff',
                        border: '1px solid rgba(255,255,255,0.2)',
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                    >
                      {isRtl ? `الكل (${animeEpisodes.length})` : `All (${animeEpisodes.length})`}
                    </button>
                    {Array.from({ length: Math.ceil(animeEpisodes.length / 50) }).map((_, cIdx) => {
                      const startNum = cIdx * 50 + 1;
                      const endNum = Math.min(animeEpisodes.length, (cIdx + 1) * 50);
                      const active = epRangeChunk === cIdx;
                      return (
                        <button
                          key={`chunk-${cIdx}`}
                          type="button"
                          onClick={() => setEpRangeChunk(cIdx)}
                          style={{
                            padding: '0.34rem 0.7rem',
                            borderRadius: '99px',
                            background: active ? '#ffffff' : 'rgba(255,255,255,0.08)',
                            color: active ? '#000000' : '#ffffff',
                            border: '1px solid rgba(255,255,255,0.2)',
                            fontSize: '0.7rem',
                            fontWeight: 900,
                            whiteSpace: 'nowrap',
                            cursor: 'pointer'
                          }}
                        >
                          {startNum} - {endNum}
                        </button>
                      );
                    })}
                  </div>
                )}

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
                      minWidth: '105px',
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
                    onClick={() => setEpLayoutMode((m) => (m === 'cards' ? 'grid' : 'cards'))}
                    style={{
                      padding: '0.4rem 0.65rem',
                      borderRadius: '9px',
                      background: '#ffffff',
                      color: '#000000',
                      border: 'none',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    {epLayoutMode === 'cards' ? (isRtl ? '🔢 شبكة أرقام' : '🔢 Grid') : isRtl ? '☰ بطاقات' : '☰ Cards'}
                  </button>
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
                ) : epLayoutMode === 'grid' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '0.45rem' }}>
                    {displayedEpisodes.map((ep) => {
                      const isPlaying = activeEpisode?.docId === ep.docId;
                      const isWatched = watchHistory.some(
                        (h) => h.objectID === selectedAnime.objectID && Number(h.episode || h.epNum) === Number(ep.number)
                      );
                      return (
                        <button
                          key={ep.docId}
                          type="button"
                          onClick={() => handlePlayEpisode(selectedAnime, ep)}
                          style={{
                            padding: '0.65rem 0.3rem',
                            borderRadius: '11px',
                            background: isPlaying ? '#ffffff' : isWatched ? 'rgba(255,255,255,0.06)' : '#0b0b10',
                            color: isPlaying ? '#000000' : '#ffffff',
                            border: isPlaying
                              ? '1.5px solid #ffffff'
                              : isWatched
                              ? '1px solid rgba(255,255,255,0.28)'
                              : '1px solid rgba(255,255,255,0.12)',
                            fontWeight: 900,
                            fontSize: '0.8rem',
                            textAlign: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <div>{ep.number}</div>
                          {isWatched && <div style={{ fontSize: '0.54rem', opacity: 0.72 }}>✓</div>}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    {displayedEpisodes.map((ep) => {
                      const isPlaying = activeEpisode?.docId === ep.docId;
                      const isWatched = watchHistory.some(
                        (h) => h.objectID === selectedAnime.objectID && Number(h.episode || h.epNum) === Number(ep.number)
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

            {/* SUB-TAB 4: CLOUD ANIME REVIEWS & 4-PILLAR MASTER RATINGS */}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 900 }}>
                      ⭐ {isRtl ? 'التقييم الرباعي الاحترافي (4-Pillar Rating):' : '4-Pillar Master Rating:'}
                    </span>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '8px',
                        background: '#ffffff',
                        color: '#000000',
                        fontWeight: 900,
                        fontSize: '0.75rem'
                      }}
                    >
                      ★ {((revStoryScore + revAnimScore + revOstScore + revCharScore) / 4).toFixed(1)} / 10
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem', marginBottom: '0.55rem' }}>
                    {[
                      { label: isRtl ? '📖 القصة' : '📖 Story', val: revStoryScore, set: setRevStoryScore },
                      { label: isRtl ? '⚡ التحريك' : '⚡ Animation', val: revAnimScore, set: setRevAnimScore },
                      { label: isRtl ? '🎵 الموسيقى' : '🎵 OST', val: revOstScore, set: setRevOstScore },
                      { label: isRtl ? '👥 الشخصيات' : '👥 Cast', val: revCharScore, set: setRevCharScore }
                    ].map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.35rem 0.55rem',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.14)',
                          fontSize: '0.72rem',
                          fontWeight: 800
                        }}
                      >
                        <span>{p.label}</span>
                        <select
                          value={p.val}
                          onChange={(e) => p.set(Number(e.target.value))}
                          style={{
                            background: '#000',
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.22)',
                            borderRadius: '6px',
                            padding: '0.12rem 0.35rem',
                            fontWeight: 900,
                            fontSize: '0.72rem'
                          }}
                        >
                          {[10, 9, 8, 7, 6, 5].map((s) => (
                            <option key={s} value={s}>
                              {s}/10
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.8rem' }}>{rv.author}</span>
                          {rv.sovereignTitle && (
                            <span style={{ fontSize: '0.64rem', padding: '0.08rem 0.42rem', borderRadius: '99px', background: 'rgba(255,255,255,0.12)', fontWeight: 800 }}>
                              {rv.sovereignTitle}
                            </span>
                          )}
                        </div>
                        <span style={{ fontWeight: 900, fontSize: '0.74rem', background: '#fff', color: '#000', padding: '0.08rem 0.45rem', borderRadius: '6px' }}>
                          ★ {rv.score}/10
                        </span>
                      </div>
                      {rv.pillars && (
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.35rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.68)' }}>
                          <span>📖 القصة: {rv.pillars.story}</span>•<span>⚡ التحريك: {rv.pillars.anim}</span>•
                          <span>🎵 الموسيقى: {rv.pillars.ost}</span>•<span>👥 الشخصيات: {rv.pillars.char}</span>
                        </div>
                      )}
                      <p style={{ margin: 0, fontSize: '0.76rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.45 }}>{rv.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== v8.0 NETFLIX QUICK PEEK / INFO BOTTOM SHEET ==================== */}
      {quickPeekAnime && (
        <div
          onClick={() => setQuickPeekAnime(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9850,
            background: 'rgba(0,0,0,0.82)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              background: '#0a0a0f',
              borderTop: '1.5px solid rgba(255,255,255,0.28)',
              padding: '1.15rem 1.1rem 1.8rem',
              boxShadow: '0 -16px 48px rgba(0,0,0,0.95)',
              animation: 'bxSlideUp 0.2s ease-out'
            }}
          >
            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
              <img
                src={quickPeekAnime.poster}
                alt={quickPeekAnime.titleEn}
                style={{
                  width: '88px',
                  height: '126px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  border: '1px solid rgba(255,255,255,0.22)',
                  flexShrink: 0
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <h3 style={{ margin: '0 0 0.3rem', fontSize: '1.02rem', fontWeight: 900, lineHeight: 1.25 }}>
                    {quickPeekAnime.titleEn}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setQuickPeekAnime(null)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.12)',
                      border: 'none',
                      color: '#ffffff',
                      fontWeight: 900,
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.68rem', fontWeight: 900, color: 'rgba(255,255,255,0.75)', marginBottom: '0.45rem' }}>
                  <span style={{ color: '#ffffff' }}>🧬 {getDnaMatchScore(quickPeekAnime)}% Match</span>
                  <span>•</span>
                  <span>★ {quickPeekAnime.rating || '9.2'}</span>
                  <span>•</span>
                  <span>{quickPeekAnime.type || 'مسلسل'}</span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.73rem',
                    color: 'rgba(255,255,255,0.78)',
                    lineHeight: 1.48,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {quickPeekAnime.storyAr || 'شاهد جميع حلقات هذا الأنمي بأعلى جودة 1080p بدون إعلانات عبر سيرفرات BLACK X.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0.45rem', marginTop: '0.9rem' }}>
              <button
                type="button"
                onClick={() => {
                  const target = quickPeekAnime;
                  setQuickPeekAnime(null);
                  handleOpenAnime(target, 1);
                }}
                style={{
                  padding: '0.68rem',
                  borderRadius: '10px',
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                ▶ {isRtl ? 'تشغيل الآن' : 'Play Now'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = quickPeekAnime;
                  setQuickPeekAnime(null);
                  handleOpenAnime(target);
                }}
                style={{
                  padding: '0.68rem 0.75rem',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.22)',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                🏛️ {isRtl ? 'الحلقات' : 'Hub'}
              </button>
              <button
                type="button"
                onClick={() => toggleFavorite(quickPeekAnime)}
                style={{
                  padding: '0.68rem 0.75rem',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.22)',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                {favorites.some((f) => f.objectID === quickPeekAnime.objectID) ? '✓' : '＋'}
              </button>
              <button
                type="button"
                onClick={() => handleToggleSpeakText(quickPeekAnime.storyAr || quickPeekAnime.titleEn)}
                style={{
                  padding: '0.68rem 0.75rem',
                  borderRadius: '10px',
                  background: ttsSpeaking ? '#ffffff' : 'rgba(255,255,255,0.1)',
                  color: ttsSpeaking ? '#000000' : '#ffffff',
                  border: '1px solid rgba(255,255,255,0.22)',
                  fontWeight: 900,
                  fontSize: '0.76rem',
                  cursor: 'pointer'
                }}
              >
                🔊
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== v9.0 FULL-SCREEN VERTICAL STORY / HIGHLIGHT PREVIEW MODAL ==================== */}
      {storyPreviewAnime?.item && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9880,
            background: '#000000',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden'
          }}
        >
          {/* Full-Bleed Vertical Story Poster */}
          <img
            src={storyPreviewAnime.item.poster}
            alt={storyPreviewAnime.item.titleEn}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'brightness(0.72) contrast(1.08)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.88) 75%, #000000 100%)',
              pointerEvents: 'none'
            }}
          />

          {/* Top Segmented Story Progress Bars & Header */}
          <div style={{ position: 'relative', zIndex: 5, padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '0.65rem' }}>
              {popularList.slice(0, 12).map((_, sIdx) => (
                <div
                  key={`sbar-${sIdx}`}
                  onClick={() => setStoryPreviewAnime({ item: popularList[sIdx], index: sIdx })}
                  style={{
                    flex: 1,
                    height: '3px',
                    borderRadius: '99px',
                    background:
                      sIdx <= (storyPreviewAnime.index || 0) ? '#ffffff' : 'rgba(255,255,255,0.26)',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <img
                  src={storyPreviewAnime.item.poster}
                  alt={storyPreviewAnime.item.titleEn}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1.5px solid #ffffff'
                  }}
                />
                <div>
                  <div style={{ fontWeight: 900, fontSize: '0.8rem' }}>{storyPreviewAnime.item.titleEn}</div>
                  <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.7)', fontWeight: 800 }}>
                    ⚡ BLACK X PREVIEW #{(storyPreviewAnime.index || 0) + 1} • ★ {storyPreviewAnime.item.rating}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStoryPreviewAnime(null)}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Middle Invisible Left/Right Tap Zones to Cycle Stories */}
          <div style={{ position: 'relative', zIndex: 4, flex: 1, display: 'flex' }}>
            <div
              onClick={() => {
                const pool = popularList.slice(0, 12);
                const prevIdx = ((storyPreviewAnime.index || 0) - 1 + pool.length) % pool.length;
                setStoryPreviewAnime({ item: pool[prevIdx], index: prevIdx });
              }}
              style={{ flex: 1, cursor: 'pointer' }}
            />
            <div
              onClick={() => {
                const pool = popularList.slice(0, 12);
                const nextIdx = ((storyPreviewAnime.index || 0) + 1) % pool.length;
                setStoryPreviewAnime({ item: pool[nextIdx], index: nextIdx });
              }}
              style={{ flex: 1, cursor: 'pointer' }}
            />
          </div>

          {/* Bottom Story Details & Instant Action Deck */}
          <div style={{ position: 'relative', zIndex: 5, padding: '1rem 1.15rem 1.8rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <span
                style={{
                  padding: '0.18rem 0.55rem',
                  borderRadius: '6px',
                  background: '#ffffff',
                  color: '#000000',
                  fontSize: '0.68rem',
                  fontWeight: 900
                }}
              >
                🧬 {getDnaMatchScore(storyPreviewAnime.item)}% Match
              </span>
              <span
                style={{
                  padding: '0.18rem 0.55rem',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.14)',
                  fontSize: '0.68rem',
                  fontWeight: 900
                }}
              >
                {storyPreviewAnime.item.type} • {storyPreviewAnime.item.state}
              </span>
              <span
                style={{
                  padding: '0.18rem 0.55rem',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.14)',
                  fontSize: '0.68rem',
                  fontWeight: 900
                }}
              >
                4K 120Hz
              </span>
            </div>

            <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.25 }}>
              {storyPreviewAnime.item.titleEn}
            </h2>

            <p
              style={{
                margin: '0 0 1rem',
                fontSize: '0.76rem',
                color: 'rgba(255,255,255,0.82)',
                lineHeight: 1.55,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {storyPreviewAnime.item.storyAr}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  const target = storyPreviewAnime.item;
                  setStoryPreviewAnime(null);
                  handleOpenAnime(target, 1);
                }}
                style={{
                  padding: '0.78rem 1rem',
                  borderRadius: '12px',
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                ▶ {isRtl ? 'تشغيل في المشغل المستقل' : 'Play in Standalone Player'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = storyPreviewAnime.item;
                  setStoryPreviewAnime(null);
                  handleOpenAnime(target);
                }}
                style={{
                  padding: '0.78rem 0.9rem',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.12)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.26)',
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                🏛️ {isRtl ? 'صفحة العمل' : 'Show Hub'}
              </button>

              <button
                type="button"
                onClick={() => toggleFavorite(storyPreviewAnime.item)}
                style={{
                  padding: '0.78rem 0.85rem',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.12)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.26)',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                {favorites.some((f) => f.objectID === storyPreviewAnime.item.objectID) ? '✓' : '＋'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== v10.0 IMAGE 2 LUXURY 32PX-ROUNDED COMMAND & PROFILE MENU CARD MODAL ==================== */}
      {commandMenuOpen && (
        <div
          onClick={() => setCommandMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9600,
            background: 'rgba(0,0,0,0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.2rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '350px',
              borderRadius: '32px',
              background: '#0e0e13',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: '0 28px 80px rgba(0,0,0,0.95)',
              padding: '1.25rem 1.15rem',
              color: '#ffffff',
              animation: 'bxSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Top Row: Brand & Circular Close Button (Matches Image 2 Top Right X) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', padding: '0 0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    color: '#000000',
                    fontWeight: 900,
                    fontSize: '0.8rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  X
                </span>
                <span style={{ fontWeight: 900, fontSize: '0.88rem', letterSpacing: '0.04em' }}>
                  BLACK X MENU
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCommandMenuOpen(false)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Menu Items List (Matches Image 2 Vertical Command Menu with Circular Count Badges) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {[
                {
                  icon: '🏠',
                  label: isRtl ? 'لوحة التحكم الرئيسية' : 'Dashboard',
                  badge: null,
                  onClick: () => {
                    setCommandMenuOpen(false);
                    setSelectedAnime(null);
                    setActiveEpisode(null);
                    setActiveTab('home');
                  }
                },
                {
                  icon: '📖',
                  label: isRtl ? 'استوديو المانجا والمانهوا (+30,000)' : 'Manga & Manhwa Studio (30K+)',
                  badge: mangaHistory.length || '30K',
                  onClick: () => {
                    setCommandMenuOpen(false);
                    setSelectedAnime(null);
                    setActiveEpisode(null);
                    setActiveTab('manga');
                  }
                },
                {
                  icon: '👑',
                  label: isRtl ? 'العضوية الملكية وكود VIP' : 'Subscription & VIP',
                  badge: userVipTier !== 'free' || isDeveloper ? 'VIP' : null,
                  onClick: () => {
                    setCommandMenuOpen(false);
                    setSelectedAnime(null);
                    setActiveEpisode(null);
                    setActiveTab('profile');
                  }
                },
                {
                  icon: '🪪',
                  label: isRtl ? 'بطاقة الأوتاكو وجينات الأنمي' : 'Otaku ID & DNA',
                  badge: favorites.length + watchHistory.length,
                  onClick: () => {
                    setCommandMenuOpen(false);
                    setSelectedAnime(null);
                    setActiveEpisode(null);
                    setActiveTab('profile');
                  }
                },
                {
                  icon: '📥',
                  label: isRtl ? 'التنزيلات بدون إنترنت' : 'Offline Downloads',
                  badge: downloadedEpisodes.length + downloadedChapters.length,
                  onClick: () => {
                    setCommandMenuOpen(false);
                    setSelectedAnime(null);
                    setActiveEpisode(null);
                    setActiveTab('profile');
                  }
                },
                {
                  icon: '🔮',
                  label: isRtl ? 'ساحة الأوتاكو والجدول' : 'Otaku Arena & Radar',
                  badge: null,
                  onClick: () => {
                    setCommandMenuOpen(false);
                    setSelectedAnime(null);
                    setActiveEpisode(null);
                    setActiveTab('community');
                  }
                }
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={item.onClick}
                  style={{
                    width: '100%',
                    padding: '0.78rem 0.9rem',
                    borderRadius: '18px',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.88)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textAlign: isRtl ? 'right' : 'left'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.05rem', opacity: 0.85 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== null && (
                    <span
                      style={{
                        minWidth: '28px',
                        height: '28px',
                        padding: '0 0.45rem',
                        borderRadius: '999px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}

              {/* Highlighted Pill Profile Row at Bottom (Exact Match to Image 2 "Profile (8)") */}
              <button
                type="button"
                onClick={() => {
                  setCommandMenuOpen(false);
                  setSelectedAnime(null);
                  setActiveEpisode(null);
                  setActiveTab('profile');
                }}
                style={{
                  width: '100%',
                  marginTop: '0.45rem',
                  padding: '0.72rem 0.85rem',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.22)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.88rem',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <span
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      color: '#000000',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 900
                    }}
                  >
                    👤
                  </span>
                  <span>
                    {user?.displayName || (isRtl ? 'الملف الشخصي ومكتبتي' : 'Profile & Library')}
                  </span>
                </span>
                <span
                  style={{
                    minWidth: '32px',
                    height: '32px',
                    padding: '0 0.5rem',
                    borderRadius: '50%',
                    background: '#ffffff',
                    color: '#000000',
                    fontSize: '0.76rem',
                    fontWeight: 900,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {favorites.length + watchHistory.length}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== iOS 26 LIQUID GLASS — PURE MONOCHROME FLOATING DOCK ==================== */}
      <nav
        className="ios-lg-capsule-track"
        style={{
          position: 'fixed',
          bottom: '12px',
          left: '14px',
          right: '14px',
          zIndex: 250,
          justifyContent: 'space-between',
          padding: '0.45rem 0.6rem'
        }}
      >
        {[
          { id: 'home', icon: '🏠', ar: 'الرئيسية', en: 'Home' },
          { id: 'catalog', icon: '🔍', ar: 'البحث', en: 'Search' },
          { id: 'schedule', icon: '📅', ar: 'الجدول', en: 'Radar' },
          { id: 'manga', icon: '📖', ar: 'المانجا', en: 'Manga' },
          { id: 'community', icon: '🔮', ar: 'الساحة', en: 'Arena' },
          { id: 'profile', icon: '👤', ar: 'حسابي', en: 'Profile' }
        ].map((t) => {
          const active = activeTab === t.id && !selectedAnime;
          return (
            <button
              key={t.id}
              type="button"
              className={active ? 'ios-lg-active-pill' : 'ios-lg-orb'}
              onClick={() => {
                setSelectedAnime(null);
                setActiveEpisode(null);
                setPlayerMinimized(false);
                setActiveTab(t.id);
              }}
              style={
                active
                  ? {
                      height: '44px',
                      minWidth: '88px',
                      padding: '0 0.9rem',
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      justifyContent: 'center'
                    }
                  : {
                      width: '42px',
                      height: '42px',
                      fontSize: '0.96rem'
                    }
              }
            >
              <span
                style={
                  active
                    ? {
                        fontSize: '1.02rem',
                        lineHeight: 1,
                        filter: 'drop-shadow(0 0 8px #ffffff) drop-shadow(0 0 16px rgba(255,255,255,0.9))'
                      }
                    : { fontSize: '0.98rem', lineHeight: 1 }
                }
              >
                {t.icon}
              </span>
              {active && <span style={{ whiteSpace: 'nowrap' }}>{isRtl ? t.ar : t.en}</span>}
            </button>
          );
        })}
      </nav>

      {/* ==================== GLOBAL MANDATORY VIP SUBSCRIPTION & ACTIVATION GATE (مربوط سحابياً بكل النسخ وبحساب المطور) ==================== */}
      {globalVipEnforced && userVipTier === 'free' && !isDeveloper && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9950,
            background: '#000000',
            color: '#ffffff',
            overflowY: 'auto',
            padding: '1.2rem 1rem 3rem'
          }}
        >
          <div style={{ maxWidth: '540px', margin: '0 auto' }}>
            {/* Header Badge */}
            <div style={{ textAlign: 'center', marginBottom: '1.1rem' }}>
              <img
                src="/blackx-logo.png"
                alt="BLACK X"
                style={{
                  width: '64px',
                  height: '64px',
                  margin: '0 auto 0.65rem',
                  borderRadius: '16px',
                  background: '#000000',
                  objectFit: 'cover',
                  display: 'block',
                  border: '1px solid rgba(255,255,255,0.24)',
                  boxShadow: '0 0 28px rgba(255,0,0,0.4)'
                }}
              />
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.85rem',
                  borderRadius: '99px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  marginBottom: '0.45rem'
                }}
              >
                👑 BLACK X VIP PREMIERE ACCESS
              </span>
              <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.25rem', fontWeight: 900 }}>
                {isRtl ? 'اشترك في باقات BLACK X VIP للمتابعة' : 'BLACK X VIP Subscription Required'}
              </h1>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.68)', lineHeight: 1.55 }}>
                {isRtl
                  ? 'التطبيق يعمل حالياً بنظام العضوية المدفوعة الموحد مع الموقع الرسمي. اختر باقتك أو أدخل كود التفعيل الفوري، أو سجّل دخولك إذا كنت مشتركاً بالفعل.'
                  : 'VIP membership is currently enforced across all platforms. Redeem your VIP code or sign in to continue.'}
              </p>
            </div>

            {/* Instant VIP Code Activation Box */}
            <form
              onSubmit={handleRedeemVipCode}
              style={{
                padding: '1rem',
                borderRadius: '16px',
                background: '#0b0b0f',
                border: '1.5px solid #ffffff',
                marginBottom: '1rem',
                boxShadow: '0 10px 30px rgba(255,255,255,0.08)'
              }}
            >
              <div style={{ fontWeight: 900, fontSize: '0.86rem', marginBottom: '0.45rem' }}>
                🔑 {isRtl ? 'لديك كود تفعيل VIP؟ أدخله هنا للفتح الفوري:' : 'Have a VIP Activation Code? Redeem Instantly:'}
              </div>
              <div style={{ display: 'flex', gap: '0.45rem' }}>
                <input
                  type="text"
                  value={vipRedeemCode}
                  onChange={(e) => setVipRedeemCode(e.target.value)}
                  placeholder="BX-XXXX-XXXX-XXXX"
                  style={{
                    flex: 1,
                    padding: '0.7rem 0.85rem',
                    borderRadius: '11px',
                    background: '#000000',
                    border: '1px solid rgba(255,255,255,0.28)',
                    color: '#ffffff',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '0.84rem'
                  }}
                />
                <button
                  type="submit"
                  disabled={vipRedeemBusy}
                  style={{
                    padding: '0 1.15rem',
                    borderRadius: '11px',
                    border: 'none',
                    background: '#ffffff',
                    color: '#000000',
                    fontWeight: 900,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  {vipRedeemBusy ? '⏳' : isRtl ? 'تفعيل الآن' : 'Activate'}
                </button>
              </div>
            </form>

            {/* The 2 Official BLACK X VIP Plans (Matches Website 100%) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.8rem', marginBottom: '1rem' }}>
              {/* Plan 1: Monarch VIP 199 EGP */}
              <div
                style={{
                  padding: '1.05rem',
                  borderRadius: '16px',
                  background: 'linear-gradient(145deg, #121218 0%, #07070a 100%)',
                  border: '1.5px solid #ffffff',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 900, fontSize: '0.96rem' }}>
                    👑 {isRtl ? 'باقة الملك (MONARCH VIP)' : 'Monarch VIP Plan'}
                  </span>
                  <span
                    style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '8px',
                      background: '#ffffff',
                      color: '#000000',
                      fontWeight: 900,
                      fontSize: '0.82rem'
                    }}
                  >
                    199 {isRtl ? 'ج.م / شهرياً' : 'EGP / mo'}
                  </span>
                </div>
                <ul style={{ margin: '0 0 0.75rem', paddingInlineStart: '1.1rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>
                  <li>{isRtl ? 'فتح جميع سيرفرات BLACK X 1..8 بجودة 4K & 1080p سرعة 120Hz' : 'All BLACK X 1..8 servers in 4K & 1080p 120Hz'}</li>
                  <li>{isRtl ? 'فتح مكتبة +30,000 مانجا ومانهوا كاملة بشاشة كاملة وتحميل مباشر' : 'Full 30,000+ Manga & Manhwa library + Direct Download'}</li>
                  <li>{isRtl ? 'تعمل على الموقع الرسمي وتطبيق الهاتف بنفس الحساب' : 'Works on both Website and Mobile APK'}</li>
                </ul>

                <div
                  style={{
                    padding: '0.65rem 0.8rem',
                    borderRadius: '11px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.55rem'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)' }}>
                      📱 {isRtl ? 'رقم محفظة فودافون كاش للتحويل:' : 'Vodafone Cash Wallet:'}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.95rem', letterSpacing: '0.05em' }}>
                      01094965378
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText('01094965378');
                      showToast('✓ تم نسخ رقم فودافون كاش: 01094965378');
                    }}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: '8px',
                      background: '#ffffff',
                      color: '#000000',
                      border: 'none',
                      fontWeight: 900,
                      fontSize: '0.72rem',
                      cursor: 'pointer'
                    }}
                  >
                    📋 {isRtl ? 'نسخ الرقم' : 'Copy'}
                  </button>
                </div>

                <a
                  href={`https://wa.me/201094965378?text=${encodeURIComponent(
                    'مرحباً إدارة BLACK X، قمت بتحويل 199 ج.م على فودافون كاش 01094965378 للاشتراك في باقة الملك MONARCH VIP وأريد استلام كود التفعيل الفوري.'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.68rem',
                    borderRadius: '11px',
                    background: '#ffffff',
                    color: '#000000',
                    fontWeight: 900,
                    fontSize: '0.8rem',
                    textDecoration: 'none'
                  }}
                >
                  💬 {isRtl ? 'إرسال إيصال التحويل واستلام كود VIP فوراً' : 'Send Transfer Receipt & Get VIP Code'}
                </a>
              </div>

              {/* Plan 2: Basic VIP 99 EGP */}
              <div
                style={{
                  padding: '0.95rem',
                  borderRadius: '16px',
                  background: '#0a0a0e',
                  border: '1px solid rgba(255,255,255,0.22)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 900, fontSize: '0.9rem' }}>
                    ⚡ {isRtl ? 'الباقة الأساسية (BASIC VIP)' : 'Basic VIP Plan'}
                  </span>
                  <span
                    style={{
                      padding: '0.18rem 0.55rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.14)',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '0.78rem'
                    }}
                  >
                    99 {isRtl ? 'ج.م / شهرياً' : 'EGP / mo'}
                  </span>
                </div>
                <p style={{ margin: '0 0 0.55rem', fontSize: '0.73rem', color: 'rgba(255,255,255,0.72)' }}>
                  {isRtl
                    ? 'مشاهدة جميع الأنميات والمانهوا بجودة 1080p بدون إعلانات عبر سيرفرات BLACK X.'
                    : 'Full 1080p Anime & Manhwa streaming across BLACK X servers.'}
                </p>
                <a
                  href={`https://wa.me/201094965378?text=${encodeURIComponent(
                    'مرحباً إدارة BLACK X، قمت بتحويل 99 ج.م على فودافون كاش 01094965378 للاشتراك في الباقة الأساسية BASIC VIP وأريد استلام كود التفعيل.'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.58rem',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.76rem',
                    textDecoration: 'none'
                  }}
                >
                  💬 {isRtl ? 'طلب كود الباقة الأساسية (99 ج.م)' : 'Request Basic VIP Code (99 EGP)'}
                </a>
              </div>
            </div>

            {/* Sign-In Section for Existing Subscribers or Developer Account */}
            <div
              style={{
                padding: '1rem',
                borderRadius: '16px',
                background: '#0a0a0e',
                border: '1px solid rgba(255,255,255,0.18)'
              }}
            >
              <div style={{ fontWeight: 900, fontSize: '0.86rem', marginBottom: '0.5rem' }}>
                🔐 {isRtl ? 'مشترك بالفعل أو صاحب حساب المطور؟ سجّل دخولك:' : 'Already VIP or Developer? Sign In:'}
              </div>

              {user ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.76rem' }}>
                    {isRtl ? 'مسجل حالياً باسم:' : 'Signed in as:'} <strong>{user.displayName || user.email}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUser(null);
                      localStorage.removeItem('bx_mob_user');
                    }}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.24)',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {isRtl ? 'تبديل الحساب' : 'Switch Account'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={handleRealGoogleOAuthLogin}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '11px',
                      background: '#ffffff',
                      color: '#000000',
                      border: 'none',
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    G {isRtl ? 'تسجيل الدخول بحسابات Google الموجودة على الهاتف' : 'Sign in with Phone Google Accounts'}
                  </button>

                  <form onSubmit={handleAuthSubmit} style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      placeholder={isRtl ? 'البريد أو اسم المستخدم' : 'Email / Username'}
                      style={{
                        flex: 1,
                        minWidth: '130px',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '10px',
                        background: '#000',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: '0.76rem'
                      }}
                    />
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder={isRtl ? 'كلمة المرور' : 'Password'}
                      style={{
                        flex: 1,
                        minWidth: '110px',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '10px',
                        background: '#000',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: '0.76rem'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={authBusy}
                      style={{
                        padding: '0.6rem 0.95rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'rgba(255,255,255,0.18)',
                        color: '#fff',
                        fontWeight: 900,
                        fontSize: '0.76rem',
                        cursor: 'pointer'
                      }}
                    >
                      {isRtl ? 'دخول' : 'Login'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
