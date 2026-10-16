import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { BLACK_X_MOTION_THEMES } from '../components/BlackXSplashVortex.jsx';
import MangaPageImage from './MangaPageImage.jsx';
import BxIcon, { stripEmoji } from './BxIcon.jsx';
import './mobileUi.css';
import ToastHost from './ToastHost.jsx';
import { showToastMessage } from './toastStore.js';
import {
  adminBroadcast,
  adminDeleteCode,
  adminDeleteRequest,
  adminGenerateCodes,
  adminGetVip,
  adminInspectUser,
  adminPin,
  adminSetEnforced,
  adminSetUserVip,
  apiErrorMessage,
  fetchAppConfig,
  fetchMe,
  fetchSkipTimes,
  loadSession,
  loginWithGoogle,
  loginWithPassword,
  pushAccountState,
  readCachedConfig,
  redeemVipCode,
  registerAccount,
  sendDeveloperRequest,
  signOut as apkSignOut,
  updateAccountProfile
} from './apkApi.js';
import { animeSlugOf, episodeKey, flushPositions, formatClock, getPosition, mergePositions, positionsForSync, savePosition } from './resumeStore.js';
import { checkFollowedTitles, lastAlertRun } from './episodeAlerts.js';
import { attachHls, needsHlsJs } from './hlsPlayer.js';
import { haptic, hapticsEnabled, setHapticsEnabled } from './haptics.js';
import { coverForMode, useDataSaver } from './dataSaver.js';
import { installPointerTracker, transitionBackToCard, transitionFromTappedPoster } from './viewTransition.js';
import SearchBox from './SearchBox.jsx';
import { SkeletonGrid, SkeletonList } from './Skeleton.jsx';
import PullToRefresh from './PullToRefresh.jsx';
import useSwipeDismiss from './useSwipeDismiss.js';
import HomeTab from './HomeTab.jsx';
import PlayerControls from './PlayerControls.jsx';
import BottomSheet from './BottomSheet.jsx';
import usePresence from './usePresence.js';
import ScheduleTab from './ScheduleTab.jsx';
import MobileDock from './MobileDock.jsx';
import PosterCard from './PosterCard.jsx';
import SectionHead from './SectionHead.jsx';
import FilterSheet, { SORT_OPTIONS, activeFilterCount } from './FilterSheet.jsx';
import { navigateWithMotion, pageEnterClass } from './tabMotion.js';
import { todayScheduleId } from './scheduleDays.js';
import { NextEpisodeCountdown, SkipSegmentOverlay } from './PlayerExtras.jsx';
import { SPLASH_SOUND_KEY } from './splashPrefs.js';
import {
  BX_APK_DOWNLOAD_URL,
  BX_APK_VERSION,
  BX_MANGA_SEARCH_ONLY_TAB,
  BX_MANGA_SERVER_TABS,
  fetchAnimeCatalogTotal,
  fetchBxSourceIds,
  fetchMobileAnimeSearch,
  fetchMobileChapterPages,
  fetchMobileEpisodeServers,
  fetchMobileEpisodes,
  fetchMobileMangaChapters,
  fetchMobileMangaList,
  findBxMangaByTitle,
  formatBxCount,
  mangaServerLabel,
  resolveMobileEpisodeServer
} from './bxServers.js';

/**
 * BLACK X Mobile (Android APK)
 * Completely independent Smartphone UI inspired by Anime Witcher, elevated with Pure AMOLED Pitch-Black (#000000)
 * Same catalogue, servers and accounts as the website; tabs live in HomeTab/ScheduleTab + this file,
 * Webtoon Reader, and Real-Time Cloud Sync with the BLACK X Website Users & Anime Database.
 *
 * Servers: since v15 every anime episode/server and manga chapter/page request goes through the
 * website API (./bxServers.js), so the app always lists the same servers as black-x-anime.me.
 */

// 1. Anime catalogue index (the same Algolia index the website's BLACK X 1 catalogue reads)
const ALGOLIA_APP_ID = 'QVHT7NPEJG';
const ALGOLIA_API_KEY = 'ce13098070fa521b536571bafbcfc083';
const ALGOLIA_BASE = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes`;

// 2. Shared BLACK X Website Users, Favorites, Watch Progress & Community Cloud Database
const BX_PROJECT = 'spry-oxide-1h7sp';
const BX_DB = 'ai-studio-blackxanime-e47e1ba2-315f-4c3b-8557-71352813f36c';
const BX_KEY = 'AIzaSyD4yG_ljN1S8TfwC33E4Z0o499MYC71eUE';
const BX_SETTINGS_BASE = `https://firestore.googleapis.com/v1/projects/${BX_PROJECT}/databases/${BX_DB}/documents/settings`;

const GENRE_CHIPS = [
  { id: 'all', ar: 'الكل', en: 'All', tag: '' },
  { id: 'action', ar: 'أكشن', en: 'Action', tag: 'اكشن' },
  { id: 'comedy', ar: 'كوميدي', en: 'Comedy', tag: 'كوميدي' },
  { id: 'fantasy', ar: 'خيال', en: 'Fantasy', tag: 'خيال' },
  { id: 'adventure', ar: 'مغامرات', en: 'Adventure', tag: 'مغامرات' },
  { id: 'drama', ar: 'دراما', en: 'Drama', tag: 'دراما' },
  { id: 'shounen', ar: 'شونين', en: 'Shounen', tag: 'شونين' },
  { id: 'romance', ar: 'رومانسي', en: 'Romance', tag: 'رومانسي' },
  { id: 'scifi', ar: 'خيال علمي', en: 'Sci-Fi', tag: 'خيال علمي' },
  { id: 'school', ar: 'مدرسي', en: 'School', tag: 'مدرسي' },
  { id: 'supernatural', ar: 'خارق للطبيعة', en: 'Supernatural', tag: 'خارق للطبيعة' },
  { id: 'seinen', ar: 'سينين', en: 'Seinen', tag: 'سينين' },
  { id: 'mystery', ar: 'غموض', en: 'Mystery', tag: 'غموض' },
  { id: 'historical', ar: 'تاريخي', en: 'Historical', tag: 'تاريخي' },
  { id: 'isekai', ar: 'عالم مختلف', en: 'Isekai', tag: 'عالم مختلف' },
  { id: 'superpower', ar: 'قوة خارقة', en: 'Super Power', tag: 'قوة خارقة' },
  { id: 'military', ar: 'عسكري', en: 'Military', tag: 'عسكري' },
  { id: 'sports', ar: 'رياضي', en: 'Sports', tag: 'رياضي' },
  { id: 'thriller', ar: 'تشويق', en: 'Thriller', tag: 'تشويق' },
  { id: 'slice', ar: 'شريحة من الحياة', en: 'Slice of Life', tag: 'شريحة من الحياة' },
  { id: 'horror', ar: 'رعب', en: 'Horror', tag: 'رعب' },
  { id: 'psychological', ar: 'نفسي', en: 'Psychological', tag: 'نفسي' },
  { id: 'gore', ar: 'دموي', en: 'Gore', tag: 'دموي' },
  { id: 'martial', ar: 'فنون قتالية', en: 'Martial Arts', tag: 'فنون قتالية' },
  { id: 'samurai', ar: 'ساموراي', en: 'Samurai', tag: 'ساموراي' },
  { id: 'vampire', ar: 'مصاصي دماء', en: 'Vampire', tag: 'مصاصي دماء' }
];

const RECENT_SEARCHES_KEY = 'bx_mob_recent_searches';

const POST_CATEGORIES = [
  { id: 'discussion', ar: 'نقاش', en: 'Discussion' },
  { id: 'recommend', ar: 'ترشيح', en: 'Recommendation' },
  { id: 'theory', ar: 'نظرية', en: 'Theory' },
  { id: 'review', ar: 'مراجعة', en: 'Review' },
  { id: 'spoiler', ar: 'فيه حرق', en: 'Spoiler' }
];

/** "دلوقتي" / "من 5 د" / "من 3 س" / "من يومين" / a date — from the real createdAt of a post. */
function postTimeLabel(p, lang) {
  const ar = lang === 'ar';
  const at = Date.parse(p?.createdAt || '');
  if (!Number.isFinite(at)) return p?.time && p.time !== 'الآن' && p.time !== 'Just now' ? p.time : '';
  const sec = Math.max(0, (Date.now() - at) / 1000);
  if (sec < 60) return ar ? 'دلوقتي' : 'now';
  const min = Math.floor(sec / 60);
  if (min < 60) return ar ? `من ${min} د` : `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return ar ? `من ${hr} س` : `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return ar ? (day === 1 ? 'امبارح' : day === 2 ? 'من يومين' : `من ${day} أيام`) : `${day}d`;
  try {
    return new Date(at).toLocaleDateString(ar ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' });
  } catch (_) {
    return '';
  }
}

const TOPBAR_TITLES = {
  schedule: { ar: 'جدول الحلقات', en: 'Schedule' },
  manga: { ar: 'المانجا', en: 'Manga' },
  community: { ar: 'المجتمع', en: 'Community' },
  profile: { ar: 'حسابي', en: 'My account' }
};

const HOME_GENRES = GENRE_CHIPS.filter((g) => g.id !== 'all').slice(0, 14);

const TYPE_FILTERS = [
  { id: 'all', ar: 'الكل', en: 'All', facet: '' },
  { id: 'tv', ar: 'مسلسلات', en: 'TV Series', facet: 'type:مسلسل' },
  { id: 'movie', ar: 'أفلام', en: 'Movies', facet: 'type:فيلم' },
  { id: 'ova', ar: 'أوفا', en: 'OVA', facet: 'type:اوفا' },
  { id: 'special', ar: 'خاصة', en: 'Specials', facet: 'type:خاصة' },
  { id: 'ona', ar: 'أونا', en: 'ONA', facet: 'type:اونا' }
];

const STATE_FILTERS = [
  { id: 'all', ar: 'الكل', en: 'All', facet: '' },
  { id: 'airing', ar: 'مستمر الآن', en: 'Airing Now', facet: 'details.state:مستمر' },
  { id: 'completed', ar: 'مكتمل', en: 'Completed', facet: 'details.state:مكتمل' },
  { id: 'upcoming', ar: 'قريباً', en: 'Upcoming', facet: 'details.state:لم يتم بثه بعد' }
];

const STUDIO_FILTERS = [
  { id: 'all', ar: 'الكل', en: 'All', facet: '' },
  { id: 'mappa', label: 'MAPPA', facet: 'details.studio:MAPPA' },
  { id: 'ufotable', label: 'ufotable', facet: 'details.studio:ufotable' },
  { id: 'madhouse', label: 'Madhouse', facet: 'details.studio:Madhouse' },
  { id: 'toei', label: 'Toei Animation', facet: 'details.studio:Toei Animation' },
  { id: 'bones', label: 'Bones', facet: 'details.studio:Bones' },
  { id: 'wit', label: 'Wit Studio', facet: 'details.studio:Wit Studio' },
  { id: 'clover', label: 'CloverWorks', facet: 'details.studio:CloverWorks' },
  { id: 'a1', label: 'A-1 Pictures', facet: 'details.studio:A-1 Pictures' },
  { id: 'pierrot', label: 'Studio Pierrot', facet: 'details.studio:Studio Pierrot' },
  { id: 'kyoto', label: 'Kyoto Animation', facet: 'details.studio:Kyoto Animation' },
  { id: 'ig', label: 'Production I.G', facet: 'details.studio:Production I.G' }
];



const SERVER_LABELS = {
  PD_DEV: { nameAr: 'BLACK X 1 Ultra', nameEn: 'BLACK X 1 Ultra', badge: 'أسرع سيرفر • مضاد للحجب', fast: true },
  PD_NET: { nameAr: 'BLACK X 2 Mirror', nameEn: 'BLACK X 2 Mirror', badge: 'سيرفر بديل فائق السرعة', fast: true },
  SF: { nameAr: 'BLACK X 3 Turbo', nameEn: 'BLACK X 3 Turbo', badge: 'بث سحابي مباشر MP4', fast: true },
  AA: { nameAr: 'BLACK X 4 Cloud', nameEn: 'BLACK X 4 Cloud', badge: 'سيرفر عالمي مباشر', fast: true },
  PD: { nameAr: 'BLACK X 5 Direct', nameEn: 'BLACK X 5 Direct', badge: 'مباشر • MP4', fast: true },
  MF2: { nameAr: 'BLACK X 6 Pro', nameEn: 'BLACK X 6 Pro', badge: 'مباشر • MP4', fast: true },
  MF: { nameAr: 'BLACK X 7 Plus', nameEn: 'BLACK X 7 Plus', badge: 'مباشر • MP4', fast: true },
  ST: { nameAr: 'BLACK X 8 HD', nameEn: 'BLACK X 8 HD', badge: 'احتياطي HD', fast: false }
};

/** Scroll to the top at once (html has `scroll-behavior: smooth`, which a tab switch must skip). */
function jumpToTop() {
  try {
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    root.style.scrollBehavior = prev;
  } catch (_) {}
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
  const rating = malMean > 0 ? (malMean > 10 ? (malMean / 10).toFixed(1) : malMean.toFixed(1)) : '';

  return {
    objectID,
    slug: `aw-${objectID.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    malId: hit.mal_id || null,
    titleRomaji,
    titleEn,
    titleAr: titleRomaji,
    poster,
    banner,
    storyAr: hit.story || hit.story_en || 'مفيش ملخص للعمل ده لسه.',
    storyEn: hit.story_en || hit.story || '',
    tags: Array.isArray(hit.tags) ? hit.tags : [],
    type: hit.type || '',
    state: hit.details?.state || '',
    year: hit.details?.year && hit.details.year !== '0' ? hit.details.year : '',
    season: hit.details?.season && !String(hit.details.season).includes('undefined') ? hit.details.season : '',
    studio: Array.isArray(hit.details?.studio) ? hit.details.studio.join(' • ') : '',
    age: hit.details?.age || '',
    duration: hit.duration || '',
    showTime: hit.show_time || '',
    relatedIds: Array.isArray(hit.related_anime_ids) ? hit.related_anime_ids : [],
    otherNames: Array.isArray(hit.other_names) ? hit.other_names : [],
    views: Number(hit.views || hit.statictes?.fav_count || 0),
    rating,
    youtubeId: hit.youtube_video_id || null
  };
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

export default function MobileApkApp() {
  const [lang, setLang] = useState(() => localStorage.getItem('bx_mob_lang') || 'ar');
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'catalog' | 'schedule' | 'manga' | 'community' | 'profile'

  // Home & Catalog States
  const [popularList, setPopularList] = useState([]);
  const [latestList, setLatestList] = useState([]);
  const [topRankedList, setTopRankedList] = useState([]);
  const [todayList, setTodayList] = useState([]); // airing today (schedule of this weekday)
  const [moviesList, setMoviesList] = useState([]);
  const [airingList, setAiringList] = useState([]);
  const [homeLoading, setHomeLoading] = useState(true);
  const [heroTrailerOpen, setHeroTrailerOpen] = useState(false);

  // Catalog Browse & Search States (Multi-Facet: Sort + Type + State + Studio + Genre)
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogTotal, setCatalogTotal] = useState(null); // real Algolia nbHits / search result count
  const [bxAnimeTotal, setBxAnimeTotal] = useState(null); // website /api/stream/stats
  const [catalogPage, setCatalogPage] = useState(0);
  const [catalogSort, setCatalogSort] = useState('series_fav_count_desc');
  const [catalogGenre, setCatalogGenre] = useState(GENRE_CHIPS[0]);
  const [catalogType, setCatalogType] = useState(TYPE_FILTERS[0]);
  const [catalogState, setCatalogState] = useState(STATE_FILTERS[0]);
  const [catalogStudio, setCatalogStudio] = useState(STUDIO_FILTERS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [loadingMoreCatalog, setLoadingMoreCatalog] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [playerMoreOpen, setPlayerMoreOpen] = useState(false); // playback settings sheet (full screen)
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter((q) => typeof q === 'string').slice(0, 8) : [];
    } catch (_) {
      return [];
    }
  });

  // Weekly Airing Schedule States
  const [scheduleDay, setScheduleDay] = useState(() => todayScheduleId());
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
  const newReviewScore = 10; // default score when no pillar was rated

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

  // Manga States (served by the website API: the same BLACK X manga servers as black-x-anime.me)
  const [mangaList, setMangaList] = useState([]);
  const [mangaSource, setMangaSource] = useState('all'); // website server id: 'all' | 'bx1' | 'bx2' | 'bx3' | 'bx4' (search only)
  const [mangaFilterType, setMangaFilterType] = useState('ALL'); // 'ALL' | 'MANHWA' | 'MANGA'
  const [mangaPage, setMangaPage] = useState(1);
  const [mangaQuery, setMangaQuery] = useState('');
  const [mangaLoading, setMangaLoading] = useState(false);
  const [loadingMoreManga, setLoadingMoreManga] = useState(false);
  const [selectedManga, setSelectedManga] = useState(null);
  const [mangaChapters, setMangaChapters] = useState([]);
  const [mangaChaptersLoading, setMangaChaptersLoading] = useState(false);
  const [mangaChaptersError, setMangaChaptersError] = useState(''); // '' | 'empty' | 'not_found' | 'network'
  const [mangaServers, setMangaServers] = useState([]);
  const [mangaActiveServer, setMangaActiveServer] = useState('');
  const [mangaPagesError, setMangaPagesError] = useState(''); // '' | 'empty' | 'network'
  const [mangaSearchOnlyEnabled, setMangaSearchOnlyEnabled] = useState(false);
  const [episodesError, setEpisodesError] = useState(''); // '' | 'empty' | 'network'
  const mangaOpenSeqRef = useRef(0);
  const chapterReadSeqRef = useRef(0);
  const animeOpenSeqRef = useRef(0);
  const episodeServersSeqRef = useRef(0);
  const serverSelectSeqRef = useRef(0);
  const [activeMangaChapter, setActiveMangaChapter] = useState(null);
  const [mangaPages, setMangaPages] = useState([]);
  const [mangaPagesLoading, setMangaPagesLoading] = useState(false);
  const [readerMode, setReaderMode] = useState('webtoon'); // 'webtoon' | 'page'
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [readerZoom, setReaderZoom] = useState(100);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(0); // 0 | 1 | 2 | 3
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
        if (!isDevAcc && !localStorage.getItem('bx_mob_redeemed_vip_code') && !localStorage.getItem('bx_mob_session_v16')) {
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
  const [userXp, setUserXp] = useState(() => Number(localStorage.getItem('bx_mob_xp') || 0));
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
  // v16 state: server session, update banner, player extras, pull-to-refresh ticks
  const [sessionToken, setSessionToken] = useState(() => loadSession()?.token || null);
  const [apkRelease, setApkRelease] = useState(() => readCachedConfig()?.apk || null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [skipSegments, setSkipSegments] = useState([]);
  const [nextEpCountdown, setNextEpCountdown] = useState(null); // { anime, ep }
  const nextEpCountdownRef = useRef(null);
  nextEpCountdownRef.current = nextEpCountdown;
  const [hlsLevels, setHlsLevels] = useState([]);
  const [hlsLevel, setHlsLevel] = useState(-1);
  const [homeRefreshTick, setHomeRefreshTick] = useState(0);
  const [scheduleRefreshTick, setScheduleRefreshTick] = useState(0);
  const [hapticsOn, setHapticsOn] = useState(hapticsEnabled);
  const [splashSoundOn, setSplashSoundOn] = useState(() => localStorage.getItem(SPLASH_SOUND_KEY) === 'on');
  const [dataSaver, dataSaverPref, setDataSaverPref] = useDataSaver();
  const dataSaverRef = useRef(dataSaver);
  dataSaverRef.current = dataSaver;
  const detailsSheetRef = useRef(null);
  const playerPageRef = useRef(null);
  // Latest values for callbacks that run later (timers, native callbacks, sync).
  const refreshDoneRef = useRef(null);
  const latestRef = useRef({});
  latestRef.current = { user, favorites, watchHistory, watchlistMap, selectedAnime, activeEpisode };

  // Global Cloud-Synced VIP Enforcement & Developer Master Switch States
  const [globalVipEnforced, setGlobalVipEnforced] = useState(() => {
    const cached = localStorage.getItem('bx_mob_global_vip_enforced');
    return cached === null ? true : cached === 'true';
  });
  const [cloudVipCodes, setCloudVipCodes] = useState([]);
  const [vipRedeemCode, setVipRedeemCode] = useState('');
  const [vipRedeemBusy, setVipRedeemBusy] = useState(false);
  const [vipGateShowLogin, setVipGateShowLogin] = useState(false);
  const [devToggleBusy, setDevToggleBusy] = useState(false);
  const [devGenTier, setDevGenTier] = useState('vip_monarch');
  const [devGenDays, setDevGenDays] = useState(30);
  const devGenUses = 1;
  const [devGenBusy, setDevGenBusy] = useState(false);
  const redeemedVipTier = '';
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

  // 3. Pro Subtitle Styler & Background Audio Mode
  const [subStyleMode, setSubStyleMode] = useState('white_lg'); // 'white_lg' | 'yellow_xl' | 'red_bx'
  const [bgAudioMode, setBgAudioMode] = useState(false);
  const backupFileInputRef = useRef(null);

  // ==================== v6.0 GOD-TIER ENGINE STATES ====================
  // 1. Real-Time Anime Visual Enhancer (4K-Feel Shader Presets) & Smart Auto-Skip Intro
  const [visualShaderMode, setVisualShaderMode] = useState('original'); // 'original' | 'upscale4k' | 'amoled_hdr' | 'cinema_imax'
  const [autoSkipIntro, setAutoSkipIntro] = useState(() => localStorage.getItem('bx_mob_autoskip_intro') === 'true');

  // 2. Webtoon Bionic Reader v6 (Touch-Paused Auto-Scroll, Dual-Page Spread, Double-Tap 200% Zoom)
  const [readerTouchPaused, setReaderTouchPaused] = useState(false);
  const [dualPageSpread, setDualPageSpread] = useState(false);

  // 3. Sovereign Titles & 4-Pillar Master Rating (Story / Animation / OST / Characters)
  const [selectedSovereignTitle, setSelectedSovereignTitle] = useState(
    () => stripEmoji(localStorage.getItem('bx_mob_sovereign_title') || '')
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

  // ==================== v9.0 SOVEREIGN CINEMA OS & STANDALONE PLAYER STATES ====================
  const [playerMinimized, setPlayerMinimized] = useState(false); // Floating Mini-Player vs Dedicated Standalone Player Page
  const [epLayoutMode, setEpLayoutMode] = useState('cards'); // 'cards' (Crunchyroll Horizontal Cards) | 'grid' (Fast Number Grid)
  const [epRangeChunk, setEpRangeChunk] = useState(-1); // -1 = All, 0 = 1..50, 1 = 51..100, etc.
  const [storyPreviewAnime, setStoryPreviewAnime] = useState(null); // Fullscreen Vertical Story / Highlight Modal
  const [mangaChSearch, setMangaChSearch] = useState(''); // Search chapters inside Manhwa Series Hub
  const [mangaChAsc, setMangaChAsc] = useState(false); // Sort chapters ascending vs descending
  const pendingAutoPlayEpRef = useRef(null);

  // ==================== v10.0 SLOTH-UI & PRIME LUXURY DESIGN STATES ====================
  const [commandMenuOpen, setCommandMenuOpen] = useState(false); // Image 2 Luxury Rounded Command Menu Card

  // Developer powers come only from a server session created by verified Google
  // sign-in with the developer account (the server re-checks every developer call).
  const isDeveloper = useMemo(() => Boolean(user && user.isDeveloper === true && sessionToken), [user, sessionToken]);

  const userVipTier = useMemo(() => {
    if (isDeveloper) return 'vip_monarch';
    const redeemedLocal = redeemedVipTier || localStorage.getItem('bx_mob_redeemed_vip_tier');
    if (redeemedLocal === 'vip_monarch' || user?.vipTier === 'vip_monarch') return 'vip_monarch';
    if (redeemedLocal === 'vip_basic' || user?.vipTier === 'vip_basic') return 'vip_basic';
    return 'free';
  }, [isDeveloper, user, redeemedVipTier]);

  const showToast = useCallback((msg, icon = 'info') => showToastMessage(msg, icon), []);

  // Top bar: turns solid once the page scrolls, slides away while scrolling down, comes back on scroll up.
  const [pageScrolled, setPageScrolled] = useState(false);
  const [topbarHidden, setTopbarHidden] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const lastScrollYRef = useRef(0);
  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.photoUrl]);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY || 0;
        setPageScrolled(y > 24);
        const dy = y - lastScrollYRef.current;
        if (Math.abs(dy) > 6) {
          setTopbarHidden(dy > 0 && y > 160);
          lastScrollYRef.current = y;
        }
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
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
      filterSheetOpen,
      playerMoreOpen,
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
    filterSheetOpen,
    playerMoreOpen,
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
      filterSheetOpen ||
      playerMoreOpen ||
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
    filterSheetOpen,
    playerMoreOpen,
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
      if (s.filterSheetOpen) {
        setFilterSheetOpen(false);
        return true;
      }
      if (s.playerMoreOpen) {
        setPlayerMoreOpen(false);
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
        navigateWithMotion(s.activeTab, 'home', lang === 'ar', () => {
          setActiveTab('home');
          jumpToTop();
        });
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
        showToast(lang === 'ar' ? 'دوس رجوع تاني عشان تخرج' : 'Press back again to exit BLACK X');
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
  // Shared app config (VIP enforcement, broadcast, pinned pick, latest APK) comes from the
  // website server (CDN-cached): fetched at start, when the app returns to the foreground
  // and every 5 minutes while it is open. v15 read Firestore every 5 seconds.
  const applyAppConfig = useCallback((cfg) => {
    if (!cfg || typeof cfg !== 'object') return;
    if (typeof cfg.enforced === 'boolean') {
      setGlobalVipEnforced((prev) => (prev === cfg.enforced ? prev : cfg.enforced));
      localStorage.setItem('bx_mob_global_vip_enforced', String(cfg.enforced));
    }
    if (typeof cfg.broadcastMsg === 'string') {
      setGlobalBroadcastMsg((prev) => (prev === cfg.broadcastMsg ? prev : cfg.broadcastMsg));
    }
    if (cfg.pinnedRec !== undefined) {
      setGlobalPinnedRec((prev) =>
        JSON.stringify(prev || null) === JSON.stringify(cfg.pinnedRec || null) ? prev : cfg.pinnedRec || null
      );
    }
    if (cfg.apk) setApkRelease((prev) => (JSON.stringify(prev || null) === JSON.stringify(cfg.apk) ? prev : cfg.apk));
  }, []);

  useEffect(() => {
    applyAppConfig(readCachedConfig());
    let lastFetch = 0;
    const refresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (Date.now() - lastFetch < 30000) return;
      lastFetch = Date.now();
      fetchAppConfig().then(applyAppConfig).catch(() => {});
    };
    refresh();
    const timer = setInterval(refresh, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [applyAppConfig]);

  // Developer Only: Toggle Global VIP Enforcement for ALL users across all APK & Website instances
  const handleDevToggleGlobalVip = useCallback(async () => {
    if (!isDeveloper) return;
    setDevToggleBusy(true);
    try {
      const res = await adminSetEnforced(!globalVipEnforced);
      setGlobalVipEnforced(res.enforced);
      localStorage.setItem('bx_mob_global_vip_enforced', String(res.enforced));
      showToast(
        res.enforced ? 'اتفعّل فرض اشتراك VIP على كل المستخدمين' : 'اتلغى فرض الـ VIP — التطبيق والموقع مفتوحين للكل',
        'shield-check'
      );
    } catch (err) {
      showToast(apiErrorMessage(err, lang), 'alert');
    } finally {
      setDevToggleBusy(false);
    }
  }, [isDeveloper, globalVipEnforced, showToast, lang]);

  // Developer Only: Generate a Cloud VIP Code directly from the Developer Account on Mobile
  const handleDevGenerateVipCode = useCallback(async () => {
    if (!isDeveloper) return;
    setDevGenBusy(true);
    try {
      const days = Number(devGenDays) || 30;
      const priceEgp =
        devGenTier === 'vip_monarch'
          ? days >= 365 ? 1499 : days >= 90 ? 499 : 199
          : days >= 365 ? 799 : days >= 90 ? 249 : 99;
      const res = await adminGenerateCodes({ tier: devGenTier, days, uses: Number(devGenUses) || 1, count: 1, priceEgp });
      const created = Array.isArray(res.codes) ? res.codes : [];
      if (created[0]) {
        setCloudVipCodes((prev) => [...created, ...prev]);
        showToast(`اتولّد الكود: ${created[0].code}`, 'key');
      }
    } catch (err) {
      showToast(apiErrorMessage(err, lang), 'alert');
    } finally {
      setDevGenBusy(false);
    }
  }, [isDeveloper, devGenTier, devGenDays, devGenUses, showToast, lang]);

  // Redeem a VIP Subscription Code (Unlocks VIP Basic / VIP Monarch across App & Website)
  const handleRedeemVipCode = useCallback(
    async (e) => {
      if (e?.preventDefault) e.preventDefault();
      const clean = String(vipRedeemCode || '').trim().toUpperCase();
      if (!clean) {
        showToast(lang === 'ar' ? 'اكتب كود اشتراك VIP الأول' : 'Please enter a VIP code');
        return;
      }
      if (!sessionToken) {
        setVipGateShowLogin(true);
        showToast(lang === 'ar' ? 'سجّل الدخول الأول عشان الكود يتسجل على حسابك' : 'Sign in first so the code is saved to your account', 'user');
        return;
      }
      setVipRedeemBusy(true);
      try {
        const res = await redeemVipCode(clean);
        const updatedUser = { ...(user || {}), ...(res.user || {}) };
        setUser(updatedUser);
        localStorage.setItem('bx_mob_user', JSON.stringify(updatedUser));
        setVipRedeemCode('');
        const newStatus = res.user?.vipStatus || (res.tier === 'vip_monarch' ? 'VIP Monarch' : 'VIP Basic');
        haptic('success');
        window.triggerBlackXMotion?.('monarch', 2400, `مبروك! اتفعّل ${newStatus}`, `${newStatus} ACTIVATED`);
        showToast(
          lang === 'ar' ? `مبروك! اتفعّلت باقة ${newStatus} لمدة ${res.days} يوم` : `${newStatus} activated for ${res.days} days!`,
          'check'
        );
      } catch (err) {
        haptic('warning');
        showToast(apiErrorMessage(err, lang), 'x-circle');
      } finally {
        setVipRedeemBusy(false);
      }
    },
    [vipRedeemCode, sessionToken, user, showToast, lang]
  );

  // Developer Only: Send or Clear a Global Cloud Broadcast Banner to ALL users immediately
  const handleDevSendBroadcast = useCallback(
    async (clearMsg = false) => {
      if (!isDeveloper) return;
      setDevBroadcastBusy(true);
      const nextMsg = clearMsg ? '' : String(devBroadcastInput || '').trim();
      try {
        const res = await adminBroadcast(nextMsg);
        setGlobalBroadcastMsg(res.broadcastMsg || '');
        if (clearMsg) setDevBroadcastInput('');
        showToast(
          nextMsg ? 'اتنشر الإشعار العام — هيوصل لكل الأجهزة خلال دقايق' : 'اتشال الإشعار العام من كل الأجهزة',
          'megaphone'
        );
      } catch (err) {
        showToast(apiErrorMessage(err, lang), 'alert');
      } finally {
        setDevBroadcastBusy(false);
      }
    },
    [isDeveloper, devBroadcastInput, showToast, lang]
  );

  // ==================== v4.0 ULTIMATE CONTROLLERS ====================

  // 1. Developer Direct User VIP Upgrade (Upgrade any username or email directly in Cloud Firestore without code)
  const handleDevDirectGrantUserVip = useCallback(async () => {
    if (!isDeveloper) return;
    const target = String(devGrantTarget || '').trim().toLowerCase();
    if (!target) {
      showToast(lang === 'ar' ? 'اكتب اسم المستخدم أو الإيميل' : 'Enter username or email');
      return;
    }
    setDevGrantBusy(true);
    try {
      const res = await adminSetUserVip(target, devGrantTier, Number(devGrantDays) || 30);
      setDevGrantTarget('');
      showToast(
        lang === 'ar'
          ? `اترقى حساب (${res.user?.username || target}) لـ ${res.user?.vipStatus} لمدة ${devGrantDays} يوم`
          : `Upgraded ${target} to ${res.user?.vipStatus}`,
        'crown'
      );
    } catch (err) {
      showToast(apiErrorMessage(err, lang), 'alert');
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
        ? `بنحفظ الفصل ${activeMangaChapter.chapter} (${mangaPages.length} صفحة) عشان تقراه من غير نت...`
        : `Saving Ch. ${activeMangaChapter.chapter} (${mangaPages.length} pages) for offline reading...`, 'download'
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
          ? `الفصل ${activeMangaChapter.chapter} اتحفظ — تقدر تقراه من غير نت`
          : `Chapter ${activeMangaChapter.chapter} saved to Offline Vault!`, 'check'
      );
    } catch (_) {
      showToast(lang === 'ar' ? 'الفصل اتحفظ في التنزيلات' : 'Saved chapter to local vault');
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
      showToast(lang === 'ar' ? 'الفصل اتشال من التنزيلات' : 'Removed from Offline Vault', 'trash');
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
        ? `اتحفظت صفحة ${targetIdx + 1} في لقطاتي`
        : `Saved panel (Page ${targetIdx + 1}) to bookmarks!`, 'bookmark'
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
      normal: 'الصوت: 100% طبيعي',
      boost150: 'مضخم الصوت: 150% عالي',
      boost200: 'مضخم الصوت: 200% أقصى تضخيم + Bass سينمائي',
      voice: 'وضوح الكلام'
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
        ? `اتحفظت لقطة عند ${mm}:${ss} في لقطاتي`
        : `Frame captured at ${mm}:${ss} & saved!`, 'camera'
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
          ? `بداية المشهد عند ${fmt(cur)} — دوس تاني عشان تحدد النهاية`
          : `Loop Point A set (${fmt(cur)}) — Tap again to set B`, 'repeat'
      );
    } else if (loopPointB === null) {
      const endPt = Math.max(loopPointA + 3, cur);
      setLoopPointB(endPt);
      showToast(
        lang === 'ar'
          ? `تكرار المشهد القتالي مفعل (${fmt(loopPointA)} ← ${fmt(endPt)})`
          : `Scene Loop Active (${fmt(loopPointA)} → ${fmt(endPt)})`, 'repeat'
      );
    } else {
      setLoopPointA(null);
      setLoopPointB(null);
      showToast(lang === 'ar' ? 'وقفنا تكرار المشهد' : 'Scene Loop cleared', 'repeat');
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
      off: 'مؤقت النوم: متوقف',
      end_of_ep: 'مؤقت النوم: إيقاف تلقائي عند نهاية الحلقة',
      '15': 'مؤقت النوم: إيقاف بعد 15 دقيقة',
      '30': 'مؤقت النوم: إيقاف بعد 30 دقيقة',
      '60': 'مؤقت النوم: إيقاف بعد 60 دقيقة'
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
          showToast('خلص مؤقت النوم — الفيديو وقف', 'moon');
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
          text: `الغرفة ${code} جاهزة — ابعت الكود لصحابك وهتتفرجوا في نفس اللحظة`,
          time: 'الآن'
        }
      ]
    };
    setWatchPartyRoom({ ...roomObj, isHost: true });
    await pushWatchPartyState(roomObj);
    showToast(`الغرفة جاهزة — الكود: ${code}`, 'popcorn');
  }, [selectedAnime, activeEpisode, user, pushWatchPartyState, showToast]);

  const handleJoinWatchParty = useCallback(async () => {
    const cleanCode = String(watchPartyJoinInput || '').trim().toUpperCase();
    if (!cleanCode) {
      showToast(lang === 'ar' ? 'اكتب كود الغرفة الأول (زي BX-4821)' : 'Enter room code first');
      return;
    }
    try {
      const res = await fetch(`${BX_SETTINGS_BASE}/${cleanCloudKey('wp', cleanCode)}?key=${BX_KEY}`);
      if (!res.ok) {
        showToast(lang === 'ar' ? 'مفيش غرفة بالكود ده' : 'Room not found', 'x-circle');
        return;
      }
      const doc = await res.json();
      const raw = doc?.fields?.json?.stringValue;
      if (!raw) return;
      const remoteRoom = JSON.parse(raw);
      const joinMsg = {
        id: `join_${Date.now()}`,
        author: user?.displayName || 'عضو BLACK X',
        text: 'انضم إلى غرفة المشاهدة الجماعية!',
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
      showToast(`دخلت غرفة ${cleanCode} واتزامن الوقت`, 'popcorn');
    } catch (_) {
      showToast(lang === 'ar' ? 'ماقدرناش ندخل الغرفة' : 'Failed to join room');
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
        setTimedComments([]);
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
      const curSec = Math.floor(videoRef.current?.currentTime || 0);
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
      showToast(`اتحط تعليقك عند ${mm}:${ss} (+15 XP)`, 'message');
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

  // 4. Pro Subtitle Styler & Background Audio MediaSession
  const handleCycleSubtitleStyle = useCallback(() => {
    const order = ['white_lg', 'yellow_xl', 'red_bx'];
    const next = order[(order.indexOf(subStyleMode) + 1) % order.length];
    setSubStyleMode(next);
    const labels = {
      white_lg: 'ستايل الترجمة: أبيض نقي سينمائي (كبير)',
      yellow_xl: 'ستايل الترجمة: أصفر احترافي (كبير جداً)',
      red_bx: 'شكل الترجمة: أحمر'
    };
    showToast(labels[next]);
  }, [subStyleMode, showToast]);

  useEffect(() => {
    if (!bgAudioMode || !selectedAnime || !activeEpisode) return;
    try {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: `${selectedAnime.titleEn} - ${activeEpisode.name}`,
          artist: 'BLACK X',
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
      showToast('اكتب اسم المستخدم أو الإيميل اللي هيتسحب منه الاشتراك');
      return;
    }
    setDevGrantBusy(true);
    try {
      await adminSetUserVip(target, 'free', 1);
      setDevGrantTarget('');
      showToast(`اتسحب اشتراك VIP من (${target}) ورجع للباقة المجانية`, 'ban');
    } catch (err) {
      showToast(apiErrorMessage(err, lang), 'alert');
    } finally {
      setDevGrantBusy(false);
    }
  }, [isDeveloper, devGrantTarget, showToast, lang]);

  const handleDevDeleteVipCode = useCallback(
    async (codeToDelete) => {
      if (!isDeveloper) return;
      try {
        await adminDeleteCode(codeToDelete);
        setCloudVipCodes((prev) => prev.filter((c) => c.code !== codeToDelete));
        showToast(`اتمسح الكود (${codeToDelete})`, 'trash');
      } catch (err) {
        showToast(apiErrorMessage(err, lang), 'alert');
      }
    },
    [isDeveloper, showToast, lang]
  );

  // 6. 1-Tap Full Vault Backup & Restore (تصدير واستيراد الخزنة الكاملة)
  const handleExportVaultBackup = useCallback(() => {
    try {
      const backupPayload = {
        app: `BLACK X Mobile ${BX_APK_VERSION}`,
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
      showToast('اتحفظت النسخة الاحتياطية', 'save');
    } catch (_) {
      showToast('ماقدرناش نصدّر النسخة الاحتياطية');
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
          showToast('رجّعنا قائمتك وسجل مشاهدتك', 'check');
        } catch (_) {
          showToast('ملف النسخة الاحتياطية مش سليم', 'x-circle');
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
      original: 'الصورة: الأصلية',
      upscale4k: 'الصورة: خطوط أوضح',
      amoled_hdr: 'الصورة: تباين أعلى',
      cinema_imax: 'الصورة: ألوان دافية'
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
      showToast('اكتب اسم المستخدم أو الإيميل');
      return;
    }
    setDevInspectBusy(true);
    try {
      const res = await adminInspectUser(q);
      setDevInspectedUser({ ...(res.user || {}), stats: res.stats || {} });
      showToast(`اتجابت بيانات (${res.user?.username || res.user?.email || q})`, 'search');
    } catch (err) {
      setDevInspectedUser(null);
      showToast(apiErrorMessage(err, lang), 'x-circle');
    } finally {
      setDevInspectBusy(false);
    }
  }, [isDeveloper, devInspectQuery, showToast, lang]);

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
                'ترشيح إدارة BLACK X الرسمي لليوم — عمل أسطوري لا يفوتكم!',
              pinnedAt: new Date().toISOString()
            };
          }
        }
        const saved = await adminPin(nextPin);
        setGlobalPinnedRec(saved.pinnedRec || null);
        showToast(
          nextPin
            ? `(${nextPin.titleEn}) بقى الترشيح المثبت للكل`
            : 'اتشال الترشيح المثبت', 'pin'
        );
      } catch (_) {
        showToast('ماقدرناش نحدّث الترشيح المثبت');
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
      showToast('موسيقى القراءة: مقفولة', 'mute');
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
        showToast('موسيقى القراءة: هادية', 'orbit');
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
        showToast('موسيقى القراءة: مطر', 'cloud-rain');
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
        showToast('موسيقى القراءة: حماس', 'swords');
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
          showToast('القراءة بالصوت مش مدعومة على الموبايل ده');
          return;
        }
        if (window.speechSynthesis.speaking || ttsSpeaking) {
          window.speechSynthesis.cancel();
          setTtsSpeaking(false);
          showToast('وقفنا قراءة القصة', 'mute');
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
        showToast('بنقرا القصة بصوت...', 'volume');
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
        showToast('اكتب اسم العمل أو تفاصيل طلبك الأول');
        return;
      }
      setUserRequestBusy(true);
      try {
        await sendDeveloperRequest(userRequestType, clean);
        setUserRequestText('');
        haptic('success');
        showToast('اتبعت طلبك للمطور', 'mail');
      } catch (err) {
        showToast(apiErrorMessage(err, lang), 'alert');
      } finally {
        setUserRequestBusy(false);
      }
    },
    [userRequestText, userRequestType, showToast, lang]
  );

  const handleDevDeleteUserRequest = useCallback(
    async (reqId) => {
      if (!isDeveloper) return;
      try {
        await adminDeleteRequest(reqId);
        setCloudUserRequests((prev) => prev.filter((r) => r.id !== reqId));
        showToast('اتشال الطلب من قائمة المطور', 'check');
      } catch (err) {
        showToast(apiErrorMessage(err, lang), 'alert');
      }
    },
    [isDeveloper, showToast, lang]
  );

  // Developer panel data (codes + requests) — only the server can read them now.
  const loadDevPanel = useCallback(async () => {
    if (!isDeveloper) return;
    try {
      const res = await adminGetVip();
      setCloudVipCodes(Array.isArray(res.codes) ? res.codes : []);
      setCloudUserRequests(Array.isArray(res.userRequests) ? res.userRequests : []);
      if (typeof res.enforced === 'boolean') setGlobalVipEnforced(res.enforced);
      if (typeof res.broadcastMsg === 'string') setGlobalBroadcastMsg(res.broadcastMsg);
      if (res.pinnedRec !== undefined) setGlobalPinnedRec(res.pinnedRec || null);
    } catch (_) {}
  }, [isDeveloper]);

  useEffect(() => {
    if (isDeveloper && (profileSubTab === 'developer' || activeTab === 'profile')) loadDevPanel();
  }, [isDeveloper, profileSubTab, activeTab, loadDevPanel]);

  // ==================== v8.0 GLOBAL LUXURY CONTROLLERS ====================

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
        // Same manga search the website runs (all BLACK X manga servers)
        const hits = await fetchMobileMangaList({ server: 'all', query: q, page: 1 });
        if (cancelled) return;
        setUniversalMangaHits(hits.slice(0, 8));
      } catch (_) {}
    }, 420);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchQuery]);

  // Load Home Screen rows (popular, recent, top, airing today, movies, airing) from the catalogue index.
  // Pull-to-refresh re-runs it (homeRefreshTick) while the current rows stay on screen.
  useEffect(() => {
    let alive = true;
    if (!homeRefreshTick) setHomeLoading(true);
    Promise.all([
      queryAlgolia('series_fav_count_desc', { query: '', hitsPerPage: 24 }).catch(() => ({ hits: [] })),
      queryAlgolia('recent', { query: '', hitsPerPage: 20 }).catch(() => ({ hits: [] })),
      queryAlgolia('best_mal_ranked', { query: '', hitsPerPage: 20 }).catch(() => ({ hits: [] })),
      queryAlgolia('series_fav_count_desc', { query: '', facetFilters: [[`show_time:${todayScheduleId()}`]], hitsPerPage: 16 }).catch(() => ({ hits: [] })),
      queryAlgolia('series_fav_count_desc', { query: '', facetFilters: [['type:فيلم']], hitsPerPage: 20 }).catch(() => ({ hits: [] })),
      queryAlgolia('series_fav_count_desc', { query: '', facetFilters: [['details.state:مستمر']], hitsPerPage: 20 }).catch(() => ({ hits: [] }))
    ]).then(([pop, rec, top, today, mov, air]) => {
      if (!alive) return;
      setPopularList((pop.hits || []).map(formatAnimeHit).filter(Boolean));
      setLatestList((rec.hits || []).map(formatAnimeHit).filter(Boolean));
      setTopRankedList((top.hits || []).map(formatAnimeHit).filter(Boolean));
      setTodayList((today.hits || []).map(formatAnimeHit).filter(Boolean));
      setMoviesList((mov.hits || []).map(formatAnimeHit).filter(Boolean));
      setAiringList((air.hits || []).map(formatAnimeHit).filter(Boolean));
      setHomeLoading(false);
    }).finally(() => {
      refreshDoneRef.current?.();
      refreshDoneRef.current = null;
    });
    return () => {
      alive = false;
    };
  }, [homeRefreshTick]);


  // Build facetFilters array for Catalog
  const buildCatalogFacets = useCallback(() => {
    const facets = [];
    if (catalogGenre?.tag) facets.push([`tags:${catalogGenre.tag}`]);
    if (catalogType?.facet) facets.push([catalogType.facet]);
    if (catalogState?.facet) facets.push([catalogState.facet]);
    if (catalogStudio?.facet) facets.push([catalogStudio.facet]);
    return facets;
  }, [catalogGenre, catalogType, catalogState, catalogStudio]);

  // Website totals and optional servers (same data the website shows)
  useEffect(() => {
    let alive = true;
    fetchAnimeCatalogTotal().then((total) => {
      if (alive) setBxAnimeTotal(total);
    });
    fetchBxSourceIds().then((ids) => {
      if (alive) setMangaSearchOnlyEnabled(ids.has('aniproject'));
    });
    return () => {
      alive = false;
    };
  }, []);

  // Catalog browsing (sort/genre/type/state/studio) reads the same Algolia index as the website's
  // BLACK X 1 catalogue. Typed searches use the website search across every BLACK X anime server.
  useEffect(() => {
    let alive = true;
    const q = searchQuery.trim();
    const t = setTimeout(async () => {
      setCatalogLoading(true);
      try {
        if (q) {
          const items = await fetchMobileAnimeSearch(q);
          if (!alive) return;
          setCatalogItems(items);
          setCatalogTotal(items.length);
          setCatalogPage(0);
          return;
        }
        const body = {
          query: '',
          page: 0,
          hitsPerPage: 48
        };
        const facets = buildCatalogFacets();
        if (facets.length > 0) body.facetFilters = facets;
        const res = await queryAlgolia(catalogSort, body);
        if (!alive) return;
        setCatalogItems((res.hits || []).map(formatAnimeHit).filter(Boolean));
        const total = Number(res.nbHits);
        setCatalogTotal(Number.isFinite(total) && total >= 0 ? total : null);
        setCatalogPage(0);
      } catch (_) {
        if (alive && q) {
          setCatalogItems([]);
          setCatalogTotal(0);
        }
      } finally {
        if (alive) setCatalogLoading(false);
      }
    }, q ? 350 : 20);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [catalogSort, buildCatalogFacets, searchQuery]);

  const handleLoadMoreCatalog = async () => {
    // Website search results arrive in a single response; only the catalogue is paged.
    if (loadingMoreCatalog || searchQuery.trim()) return;
    setLoadingMoreCatalog(true);
    try {
      const nextPage = catalogPage + 1;
      const body = {
        query: '',
        page: nextPage,
        hitsPerPage: 48
      };
      const facets = buildCatalogFacets();
      if (facets.length > 0) body.facetFilters = facets;
      const res = await queryAlgolia(catalogSort, body);
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
        refreshDoneRef.current?.();
        refreshDoneRef.current = null;
      });
    return () => {
      alive = false;
    };
  }, [activeTab, scheduleDay, scheduleRefreshTick]);

  // Hands-free Auto-Scroll for Webtoon Reader
  useEffect(() => {
    // Time-based auto-scroll on requestAnimationFrame: smooth on 60/90/120 Hz screens
    // (a fixed 16 ms timer drifts against the display and stutters).
    if (!activeMangaChapter || autoScrollSpeed === 0) return undefined;
    const pxPerSecond = autoScrollSpeed * 2.2 * 62.5;
    let rafId = 0;
    let last = 0;
    let carry = 0;
    const step = (now) => {
      if (last) {
        carry += (pxPerSecond * Math.min(64, now - last)) / 1000;
        const whole = Math.trunc(carry);
        if (whole) {
          window.scrollBy(0, whole);
          carry -= whole;
        }
      }
      last = now;
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [activeMangaChapter, autoScrollSpeed]);

  // Manga & Manhwa library/search from the website API (same servers and results as the website)
  const fetchMangaPeakPage = useCallback(async (srcMode, qStr, pageNum = 1) => {
    try {
      return await fetchMobileMangaList({ server: srcMode, query: qStr, page: pageNum });
    } catch (_) {
      return [];
    }
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
    setCommunityPosts([]);
  }, []);

  useEffect(() => {
    loadCommunityFeed();
  }, [loadCommunityFeed]);

  // Sync User Profile, Favorites & Watch History with BLACK X Shared Cloud Firestore
  // Account sync (v16): favorites + history + resume positions + XP go to /api/app/state
  // with the server session, debounced. Pull happens at start, after sign-in and when the
  // app returns to the foreground (v15 wrote Firestore directly and polled it every 8 s).
  const pendingSyncRef = useRef(null);
  const syncTimerRef = useRef(null);
  const syncWaitersRef = useRef([]);
  const flushStateSync = useCallback(async () => {
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = null;
    const pending = pendingSyncRef.current;
    pendingSyncRef.current = null;
    const waiters = syncWaitersRef.current.splice(0);
    if (!pending || !loadSession()) {
      waiters.forEach((resolve) => resolve(false));
      return false;
    }
    try {
      await pushAccountState({
        favorites: pending.favorites,
        progress: pending.progress,
        positions: positionsForSync(),
        xp: Number(localStorage.getItem('bx_mob_xp') || 0)
      });
      waiters.forEach((resolve) => resolve(true));
      return true;
    } catch (err) {
      if (err?.status === 401) setSessionToken(null);
      waiters.forEach((resolve) => resolve(false));
      return false;
    }
  }, []);

  const syncUserStateToCloud = useCallback(
    (u, favs, hist, { immediate = false } = {}) => {
      if (!u || !loadSession()) return Promise.resolve(false);
      pendingSyncRef.current = {
        favorites: Array.isArray(favs) ? favs : latestRef.current.favorites || [],
        progress: Array.isArray(hist) ? hist : latestRef.current.watchHistory || []
      };
      return new Promise((resolve) => {
        syncWaitersRef.current.push(resolve);
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(flushStateSync, immediate ? 0 : 2500);
      });
    },
    [flushStateSync]
  );

  // Merge what the server has into this phone (lists: union, newest first; positions:
  // newest per episode; XP: the highest).
  const applyServerState = useCallback((state) => {
    if (!state || typeof state !== 'object') return;
    if (Array.isArray(state.favorites)) {
      setFavorites((prev) => {
        const map = new Map();
        for (const item of [...state.favorites, ...prev]) {
          const k = item?.objectID || item?.slug;
          if (k && !map.has(k)) map.set(k, item);
        }
        const merged = Array.from(map.values());
        localStorage.setItem('bx_mob_favorites', JSON.stringify(merged));
        return merged;
      });
    }
    if (Array.isArray(state.progress)) {
      setWatchHistory((prev) => {
        const map = new Map();
        const all = [...state.progress, ...prev].sort((a, b) => String(b?.updatedAt || '').localeCompare(String(a?.updatedAt || '')));
        for (const item of all) {
          const k = item?.objectID || item?.slug;
          if (k && !map.has(k)) map.set(k, item);
        }
        const merged = Array.from(map.values()).slice(0, 60);
        localStorage.setItem('bx_mob_history', JSON.stringify(merged));
        return merged;
      });
    }
    if (state.positions) mergePositions(state.positions);
    if (Number(state.xp) > 0) {
      setUserXp((prev) => {
        const next = Math.max(prev, Number(state.xp) || 0);
        localStorage.setItem('bx_mob_xp', String(next));
        return next;
      });
    }
  }, []);

  const finishServerLogin = useCallback(
    (res) => {
      if (!res?.token || !res.user) return;
      setSessionToken(res.token);
      const loggedUser = { ...res.user };
      setUser(loggedUser);
      localStorage.setItem('bx_mob_user', JSON.stringify(loggedUser));
      setVipGateShowLogin(false);
      if (res.state) applyServerState(res.state);
      haptic('success');
      // Push back what this phone had before signing in (merged above).
      setTimeout(() => {
        syncUserStateToCloud(loggedUser, latestRef.current.favorites, latestRef.current.watchHistory, { immediate: true });
      }, 900);
    },
    [applyServerState, syncUserStateToCloud]
  );

  // Pull latest cloud state when user is logged in (and keep syncing every 8 seconds with Website)
  const lastPullRef = useRef(0);
  const pullCloudUserState = useCallback(async () => {
    if (!loadSession()) return false;
    lastPullRef.current = Date.now();
    try {
      const res = await fetchMe();
      if (res?.user) {
        setUser((prev) => {
          const next = { ...(prev || {}), ...res.user };
          localStorage.setItem('bx_mob_user', JSON.stringify(next));
          return next;
        });
      }
      if (res?.state) applyServerState(res.state);
      return true;
    } catch (err) {
      if (err?.status === 401) setSessionToken(null);
      return false;
    }
  }, [applyServerState]);

  const handleManualSync = useCallback(async () => {
    if (!sessionToken) {
      setActiveTab('profile');
      setProfileSubTab('account');
      showToast(lang === 'ar' ? 'سجّل الدخول عشان حسابك يتزامن مع الموقع' : 'Sign in to sync your account', 'user');
      return;
    }
    const pulled = await pullCloudUserState();
    const pushed = await syncUserStateToCloud(user, latestRef.current.favorites, latestRef.current.watchHistory, { immediate: true });
    showToast(
      pulled || pushed
        ? lang === 'ar' ? 'اتزامن حسابك مع الموقع' : 'Account synced'
        : lang === 'ar' ? 'المزامنة ما نجحتش — اتأكد من النت' : 'Sync failed — check your connection',
      pulled || pushed ? 'check' : 'alert'
    );
  }, [sessionToken, user, pullCloudUserState, syncUserStateToCloud, showToast, lang]);

  useEffect(() => {
    if (!sessionToken) return undefined;
    pullCloudUserState();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (Date.now() - lastPullRef.current > 60000) pullCloudUserState();
      } else {
        flushPositions();
        flushStateSync();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [sessionToken, pullCloudUserState, flushStateSync]);

  // Real Google OAuth 2.0 Sign-In via Firebase IdentityToolkit & Native Android OAuth Bridge
  // NEVER lists or exposes any cloud accounts on the login screen.
  // Google sign-in is accepted only with a Firebase ID token that the SERVER verifies.
  // (v15 also signed people in with just the e-mail returned by the phone's account
  // picker, which any modified client could fake.)
  const completeVerifiedGoogleLogin = useCallback(
    async (idpData) => {
      try {
        if (!idpData?.idToken || idpData.idToken === 'android_system_google_account') {
          showToast(lang === 'ar' ? 'جوجل ما أكدش الدخول — جرّب تاني' : 'Google could not verify the sign-in', 'alert');
          return;
        }
        const res = await loginWithGoogle(idpData.idToken, {
          favorites: latestRef.current.favorites,
          progress: latestRef.current.watchHistory,
          positions: positionsForSync(),
          xp: Number(localStorage.getItem('bx_mob_xp') || 0)
        });
        finishServerLogin(res);
        showToast(
          lang === 'ar' ? `أهلاً ${res.user.displayName} — اتسجل دخولك بجوجل` : `Signed in with Google (${res.user.displayName})`,
          'check'
        );
      } catch (err) {
        showToast(apiErrorMessage(err, lang), 'alert');
      } finally {
        setAuthBusy(false);
      }
    },
    [finishServerLogin, showToast, lang]
  );

  const handleRealGoogleOAuthLogin = useCallback(async () => {
    setAuthBusy(true);
    // Google's own sign-in page (in the app's OAuth window) confirms the account; the
    // phone's account picker only pre-selects which account to use.
    const startOAuth = async (loginHint = '') => {
      const continueUri = 'https://spry-oxide-1h7sp.firebaseapp.com/__/auth/handler';
      const createRes = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/createAuthUri?key=${BX_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: 'google.com',
          continueUri,
          authFlowType: 'CODE_FLOW',
          ...(loginHint ? { customParameter: { login_hint: loginHint } } : {})
        })
      });
      const createData = await createRes.json();
      if (!createData?.authUri || !createData?.sessionId) throw new Error('Failed to create Google OAuth URI');
      oauthSessionIdRef.current = createData.sessionId;
      window.__onBlackXGoogleOAuthRedirect = async (redirectUrl) => {
        try {
          const idpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${BX_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requestUri: redirectUrl,
              sessionId: oauthSessionIdRef.current,
              returnSecureToken: true,
              returnIdpCredential: true
            })
          });
          const idpData = await idpRes.json();
          if (idpData?.idToken) {
            await completeVerifiedGoogleLogin(idpData);
          } else {
            showToast(lang === 'ar' ? 'ما قدرناش نكمّل الدخول بجوجل — جرّب تاني' : 'Could not verify Google sign-in', 'alert');
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
    };
    const failed = () => {
      showToast(lang === 'ar' ? 'ماقدرناش نفتح الدخول بجوجل' : 'Could not open Google sign-in', 'alert');
      setAuthBusy(false);
    };
    try {
      window.__onBlackXPhoneGoogleAccountPicked = async (pickedEmail) => {
        const clean = String(pickedEmail || '').trim().toLowerCase();
        try {
          await startOAuth(clean.includes('@') ? clean : '');
        } catch (_) {
          failed();
        }
      };
      window.__onBlackXGoogleOAuthError = (err) => {
        if (String(err || '') === 'picker_unavailable') startOAuth('').catch(failed);
        else setAuthBusy(false);
      };
      if (window.BlackXNativeAuth?.pickPhoneGoogleAccount) {
        window.BlackXNativeAuth.pickPhoneGoogleAccount('');
        return;
      }
      await startOAuth('');
    } catch (_) {
      failed();
    }
  }, [completeVerifiedGoogleLogin, showToast, lang]);

  // Open an Anime Detail Sheet & fetch its episodes, characters/seiyuu, related seasons, and cloud reviews
  const handleOpenAnimeBase = useCallback(async (anime, autoPlayEpNum = null) => {
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

    // 4. Episodes: the same /api/stream/show list the website's Watch page uses
    const openSeq = ++animeOpenSeqRef.current;
    setAnimeEpisodes([]);
    setEpisodesError('');
    try {
      const { episodes } = await fetchMobileEpisodes(anime);
      if (animeOpenSeqRef.current !== openSeq) return;
      setAnimeEpisodes(episodes);
      if (!episodes.length) setEpisodesError('empty');
    } catch (_) {
      if (animeOpenSeqRef.current !== openSeq) return;
      setAnimeEpisodes([]);
      setEpisodesError('network');
    } finally {
      if (animeOpenSeqRef.current === openSeq) setEpisodesLoading(false);
    }
  }, []);

  // Cards open the details sheet with a shared-element transition from the tapped poster.
  const handleOpenAnime = useCallback(
    (anime, autoPlayEpNum = null) => {
      haptic('tap');
      transitionFromTappedPoster(() => {
        handleOpenAnimeBase(anime, autoPlayEpNum);
      });
    },
    [handleOpenAnimeBase]
  );

  const closeDetailsSheet = useCallback(() => {
    const oid = latestRef.current.selectedAnime?.objectID;
    transitionBackToCard(() => {
      setSelectedAnime(null);
      setActiveEpisode(null);
      setPlayingVideoUrl('');
    }, oid);
  }, []);

  // Select and play a server. Servers that still need resolving go through the website's
  // /api/stream/resolve, and a server that cannot be played hands over to the next one.
  const handleSelectServer = useCallback(async (srv, allCandidateServers = []) => {
    if (!srv) return;
    const selectSeq = ++serverSelectSeqRef.current;
    setSelectedServer(srv);
    if (srv.directResolvedUrl) {
      setPlayingVideoUrl(srv.directResolvedUrl);
      setResolvingVideo(false);
      return;
    }
    setResolvingVideo(true);
    const resolveCandidate = async (candidate) => {
      if (candidate.directResolvedUrl) return candidate.directResolvedUrl;
      try {
        const url = await resolveMobileEpisodeServer(candidate);
        if (url) {
          candidate.directResolvedUrl = url;
          candidate.link = url;
        }
        return url;
      } catch (_) {
        return '';
      }
    };
    try {
      const ordered = [srv, ...allCandidateServers.filter((s) => s !== srv)];
      for (const candidate of ordered) {
        const url = await resolveCandidate(candidate);
        if (serverSelectSeqRef.current !== selectSeq) return;
        if (url) {
          setSelectedServer(candidate);
          setPlayingVideoUrl(url);
          return;
        }
      }
      setPlayingVideoUrl('');
    } finally {
      if (serverSelectSeqRef.current === selectSeq) setResolvingVideo(false);
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

  // ---- v16 player additions -------------------------------------------------------
  const videoErrorRef = useRef(null);
  videoErrorRef.current = handleVideoElementError;
  const hlsCtlRef = useRef(null);
  const hlsActive = useMemo(() => Boolean(playingVideoUrl) && needsHlsJs(playingVideoUrl), [playingVideoUrl]);
  useEffect(() => {
    setHlsLevels([]);
    setHlsLevel(-1);
    if (!hlsActive) return undefined;
    const video = videoRef.current;
    if (!video) return undefined;
    let cancelled = false;
    attachHls(video, playingVideoUrl, {
      dataSaver: dataSaverRef.current,
      onLevels: (levels) => {
        if (!cancelled) setHlsLevels(levels);
      },
      onFatal: () => {
        if (!cancelled) videoErrorRef.current?.();
      }
    })
      .then((ctl) => {
        if (cancelled) ctl.destroy();
        else hlsCtlRef.current = ctl;
      })
      .catch(() => {
        if (!cancelled) videoErrorRef.current?.();
      });
    return () => {
      cancelled = true;
      hlsCtlRef.current?.destroy();
      hlsCtlRef.current = null;
    };
  }, [hlsActive, playingVideoUrl]);

  const cycleHlsQuality = useCallback(() => {
    const ctl = hlsCtlRef.current;
    if (!ctl || !hlsLevels.length) return;
    const order = [-1, ...[...hlsLevels].sort((a, b) => b.height - a.height).map((l) => l.index)];
    const next = order[(order.indexOf(hlsLevel) + 1) % order.length];
    ctl.setLevel(next);
    setHlsLevel(next);
    const lvl = hlsLevels.find((l) => l.index === next);
    showToast(lang === 'ar' ? `الجودة: ${lvl ? `${lvl.height}p` : 'تلقائي'}` : `Quality: ${lvl ? `${lvl.height}p` : 'Auto'}`, 'sliders');
  }, [hlsLevels, hlsLevel, showToast, lang]);

  // Reset per-episode player state.
  useEffect(() => {
    setVideoDuration(0);
    setSkipSegments([]);
    setNextEpCountdown(null);
  }, [activeEpisode?.docId, selectedAnime?.objectID]);

  // Real intro/outro timestamps (AniSkip, via the website API) once the duration is known.
  useEffect(() => {
    if (!selectedAnime || !activeEpisode || !videoDuration) return undefined;
    let alive = true;
    fetchSkipTimes({
      malId: selectedAnime.malId,
      title: selectedAnime.titleRomaji || selectedAnime.titleEn,
      episode: activeEpisode.number,
      duration: videoDuration
    }).then((res) => {
      if (alive && Array.isArray(res?.segments)) setSkipSegments(res.segments);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAnime?.objectID, activeEpisode?.number, videoDuration]);

  const skipIntroManually = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    haptic('tap');
    const op = skipSegments.find((s) => s.type === 'op');
    if (op && v.currentTime < op.end) {
      v.currentTime = op.end;
      showToast(lang === 'ar' ? 'اتخطت المقدمة' : 'Intro skipped', 'skip-forward');
      return;
    }
    v.currentTime = Math.min((v.duration || v.currentTime + 86) - 1, (v.currentTime || 0) + 85);
    showToast(lang === 'ar' ? 'اتقدّم 85 ثانية' : 'Skipped ahead 85s', 'skip-forward');
  }, [skipSegments, showToast, lang]);

  // Keeps the account copy of the history item in step with the resume position.
  const recordWatchProgress = useCallback(
    (sec, dur) => {
      const anime = latestRef.current.selectedAnime;
      const ep = latestRef.current.activeEpisode;
      if (!anime || !ep || incognitoMode) return;
      setWatchHistory((prev) => {
        const idx = prev.findIndex((x) => x.objectID === anime.objectID);
        if (idx === -1) return prev;
        const item = {
          ...prev[idx],
          episode: ep.number,
          docId: ep.docId,
          position: Math.round(Number(sec) || 0),
          duration: Math.round(Number(dur) || 0),
          updatedAt: new Date().toISOString()
        };
        const next = [item, ...prev.filter((_, i) => i !== idx)];
        localStorage.setItem('bx_mob_history', JSON.stringify(next));
        const u = latestRef.current.user;
        if (u) syncUserStateToCloud(u, latestRef.current.favorites, next);
        return next;
      });
    },
    [incognitoMode, syncUserStateToCloud]
  );

  // Open an Episode: its servers are the same manifest the website's Watch page loads
  const handlePlayEpisode = useCallback(
    async (anime, epObj) => {
      if (!anime || !epObj) return;
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

      const reqSeq = ++episodeServersSeqRef.current;
      try {
        const servers = await fetchMobileEpisodeServers(anime, epObj.number);
        if (episodeServersSeqRef.current !== reqSeq) return;
        setEpisodeServers(servers);
        if (servers.length > 0) {
          // Data saver starts with the lowest quality the servers offer.
          const first = dataSaverRef.current
            ? [...servers].sort((a, b) => (parseInt(a.quality, 10) || 9999) - (parseInt(b.quality, 10) || 9999))[0]
            : servers[0];
          await handleSelectServer(first, servers);
        } else {
          setResolvingVideo(false);
        }
      } catch (_) {
        if (episodeServersSeqRef.current !== reqSeq) return;
        setEpisodeServers([]);
        setResolvingVideo(false);
      }
    },
    [user, favorites, incognitoMode, syncUserStateToCloud, handleSelectServer]
  );

  const playNextFromCountdown = useCallback(() => {
    const pending = nextEpCountdownRef.current;
    setNextEpCountdown(null);
    if (pending?.anime && pending?.ep) handlePlayEpisode(pending.anime, pending.ep);
  }, [handlePlayEpisode]);

  // Download orb on the anime details page. If this episode's stream is
  // already resolved, download it right away; otherwise start the episode and
  // open the Pro Studio sheet, where " تحميل الحلقة MP4" appears once ready.
  const handleSaveOfflineVault = useCallback(
    (anime, epObj) => {
      if (!anime || !epObj) return;
      const isResolvedEpisode =
        Boolean(playingVideoUrl) &&
        activeEpisode &&
        selectedAnime?.objectID === anime.objectID &&
        Number(activeEpisode.number) === Number(epObj.number);
      if (isResolvedEpisode) {
        const link = document.createElement('a');
        link.href = playingVideoUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.download = '';
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }
      showToast(
        lang === 'ar'
          ? `بنجهّز الحلقة ${epObj.number}… زرار التنزيل هيظهر في إعدادات المشغل`
          : `Preparing episode ${epObj.number}… the "Download MP4" button will appear in Pro Studio`, 'download'
      );
      handlePlayEpisode(anime, epObj);
      setPlayerStudioOpen(true);
    },
    [playingVideoUrl, activeEpisode, selectedAnime, showToast, lang, handlePlayEpisode]
  );

  // Auto-open Standalone Video Player Page when user tapped " تشغيل الآن" from Home Hero / Continue Watching / Quick Peek
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
      haptic('toggle');
      setFavorites((prev) => {
        const exists = prev.some((f) => f.objectID === anime.objectID || f.slug === anime.slug);
        let next;
        if (exists) {
          next = prev.filter((f) => f.objectID !== anime.objectID && f.slug !== anime.slug);
          showToast(lang === 'ar' ? 'اتشال من قائمتك' : 'Removed from My List');
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
          showToast(lang === 'ar' ? 'اتضاف لقائمتك' : 'Added to My List & synced!', 'check');
        }
        localStorage.setItem('bx_mob_favorites', JSON.stringify(next));
        if (user) syncUserStateToCloud(user, next, watchHistory);
        return next;
      });
    },
    [user, watchHistory, syncUserStateToCloud, showToast, lang]
  );

  // Open a manga/manhwa: chapters and servers come from the website API, exactly like the website's
  // library. Nothing falls back to another title: an empty server says so and offers the others.
  const handleOpenManga = useCallback(async (mangaHit, preferredServer = '') => {
    if (!mangaHit) return;
    const openSeq = ++mangaOpenSeqRef.current;
    setSelectedManga(mangaHit);
    setActiveMangaChapter(null);
    setMangaPages([]);
    setMangaPagesError('');
    setMangaChapters([]);
    setMangaChaptersError('');
    if (!preferredServer) setMangaServers([]);
    setMangaActiveServer(preferredServer || mangaHit.bxServer || '');
    setMangaChaptersLoading(true);
    try {
      let hit = mangaHit;
      if (!hit.bxId) {
        // Entries saved by older builds have no website id: exact-title lookup only.
        const found = await findBxMangaByTitle(hit.name_en || hit.name);
        if (mangaOpenSeqRef.current !== openSeq) return;
        if (!found) {
          setMangaChaptersError('not_found');
          return;
        }
        hit = found;
        setSelectedManga(found);
      }
      const { chapters, availableServers, activeServer } = await fetchMobileMangaChapters(hit, preferredServer);
      if (mangaOpenSeqRef.current !== openSeq) return;
      setMangaServers(availableServers);
      setMangaActiveServer(activeServer || preferredServer || hit.bxServer || '');
      setMangaChapters(chapters);
      if (!chapters.length) setMangaChaptersError('empty');
    } catch (_) {
      if (mangaOpenSeqRef.current === openSeq) setMangaChaptersError('network');
    } finally {
      if (mangaOpenSeqRef.current === openSeq) setMangaChaptersLoading(false);
    }
  }, []);

  const fetchChapterPagesList = useCallback(async (ch) => {
    if (!ch) return [];
    if (prefetchedChapterRef.current[ch.id]?.length) {
      return prefetchedChapterRef.current[ch.id];
    }
    const imgs = ch.source === 'bx' ? await fetchMobileChapterPages(ch) : [];
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
      // Reader pages are never swapped for a cover: MangaPageImage handles its own retries.
      if (img.dataset?.bxNoHeal === '1') return;
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
  // New-episode alerts only for titles the user follows (favorites + "watching"/"planned"),
  // checked while the app is open: every 30 minutes and when it returns to the foreground.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let cancelled = false;
    let running = false;
    const followedTitles = () => {
      const list = [...(latestRef.current.favorites || [])];
      Object.values(latestRef.current.watchlistMap || {}).forEach((entry) => {
        if (entry && (entry.status === 'watching' || entry.status === 'planned')) list.push(entry);
      });
      return list;
    };
    const run = async () => {
      if (running || cancelled || document.visibilityState === 'hidden') return;
      if (Date.now() - lastAlertRun() < 15 * 60 * 1000) return;
      const titles = followedTitles();
      if (!titles.length) return;
      running = true;
      try {
        try {
          window.BlackXNativeAuth?.requestNotificationPermission?.();
        } catch (_) {}
        await checkFollowedTitles({
          titles,
          fetchEpisodes: async (t) => (await fetchMobileEpisodes(t))?.episodes || [],
          notify: (t, ep) => {
            const ar = (localStorage.getItem('bx_mob_lang') || 'ar') === 'ar';
            const name = t.titleEn || t.titleAr || 'BLACK X';
            dispatchPhoneNotification(
              ar ? `نزلت الحلقة ${ep} من ${name}` : `${name}: episode ${ep} is out`,
              ar ? 'اضغط عشان تتفرج على BLACK X' : 'Tap to watch on BLACK X',
              Math.floor(Date.now() % 90000) + 1000
            );
          }
        });
      } finally {
        running = false;
      }
    };
    const first = setTimeout(run, 9000);
    const timer = setInterval(run, 30 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const handleReadMangaChapter = useCallback(
    async (ch) => {
      const readSeq = ++chapterReadSeqRef.current;
      setActiveMangaChapter(ch);
      setMangaPagesError('');
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
          bxId: selectedManga.bxId,
          bxServer: selectedManga.bxServer,
          mangaId: selectedManga.objectID,
          chapter: ch.chapter,
          chapterId: ch.id,
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
          if (chapterReadSeqRef.current !== readSeq) return;
          setMangaPages(imgs);
          if (!imgs.length) setMangaPagesError('empty');
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
        if (chapterReadSeqRef.current === readSeq) setMangaPagesError('network');
      } finally {
        if (chapterReadSeqRef.current === readSeq) setMangaPagesLoading(false);
      }
    },
    [selectedManga, mangaChapters, fetchChapterPagesList]
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
      showToast(lang === 'ar' ? 'اتنشر تقييمك (+25 XP)' : '4-Pillar Review posted (+25 XP)!', 'check');
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

  // Save Profile Edits & Sync with Cloud Firestore
  const handleSaveProfileEdit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!user) return;
      const patch = {
        displayName: editDisplayName.trim() || user.displayName,
        bio: editBio.trim(),
        photoUrl: editPhotoUrl.trim() || user.photoUrl || ''
      };
      if (!sessionToken) {
        const localUser = { ...user, ...patch };
        setUser(localUser);
        localStorage.setItem('bx_mob_user', JSON.stringify(localUser));
        setEditingProfile(false);
        showToast(lang === 'ar' ? 'اتحفظ على الموبايل — سجّل الدخول عشان يتزامن' : 'Saved on this phone — sign in to sync', 'check');
        return;
      }
      try {
        const res = await updateAccountProfile(patch);
        const updatedUser = { ...user, ...(res.user || {}) };
        setUser(updatedUser);
        localStorage.setItem('bx_mob_user', JSON.stringify(updatedUser));
        setEditingProfile(false);
        showToast(lang === 'ar' ? 'اتحدث ملفك الشخصي واتزامن مع الموقع' : 'Profile updated & synced!', 'check');
      } catch (err) {
        showToast(apiErrorMessage(err, lang), 'alert');
      }
    },
    [user, sessionToken, editDisplayName, editBio, editPhotoUrl, showToast, lang]
  );

  // Handle Login & Register against Shared BLACK X Cloud Firestore
  // Username/password accounts are checked by the server (bcrypt). v15 compared an
  // unsalted SHA-256 on the phone and let "register" overwrite existing accounts.
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const identifier = (authUsername || authEmail).trim().toLowerCase();
    if (!identifier || !authPassword) {
      showToast(lang === 'ar' ? 'اكتب اسم المستخدم وكلمة المرور' : 'Enter username and password');
      return;
    }
    setAuthBusy(true);
    try {
      const localState = {
        favorites,
        progress: watchHistory,
        positions: positionsForSync(),
        xp: userXp
      };
      const res =
        authMode === 'login'
          ? await loginWithPassword(identifier, authPassword, localState)
          : await registerAccount({
              username: (authUsername || identifier.split('@')[0]).trim().toLowerCase(),
              password: authPassword,
              displayName: authDisplayName.trim(),
              email: authEmail.trim().toLowerCase(),
              state: localState
            });
      finishServerLogin(res);
      setAuthPassword('');
      showToast(
        authMode === 'login'
          ? lang === 'ar' ? `أهلاً بعودتك ${res.user.displayName}!` : `Welcome back ${res.user.displayName}!`
          : lang === 'ar' ? 'اتعمل حسابك واتزامن مع الموقع' : 'Account created & synced!',
        authMode === 'login' ? 'crown' : 'check'
      );
    } catch (err) {
      haptic('warning');
      showToast(apiErrorMessage(err, lang), 'alert');
    } finally {
      setAuthBusy(false);
    }
  };

  // Publish Post to Shared Community Feed (with Category, Spoiler Tag, Likes & Replies)
  const myPostKey = user ? String(user.id || user.username || user.email || '') : '';
  const shortDateNow = () => {
    try {
      return new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' });
    } catch (_) {
      return '';
    }
  };
  const handlePublishPost = async (e) => {
    e.preventDefault();
    if (!newPostText.trim()) return;
    if (!user) {
      showToast(lang === 'ar' ? 'سجّل دخولك الأول عشان تنشر' : 'Sign in to post', 'user');
      return;
    }
    const post = {
      id: `post_${Date.now()}`,
      author: user.displayName || user.username,
      username: user.username || '',
      role: user.role || 'user',
      category: postCategory,
      isSpoiler: postIsSpoiler || postCategory === 'spoiler',
      createdAt: new Date().toISOString(),
      time: shortDateNow(), // older app versions show this text as-is
      text: newPostText.trim(),
      likes: 0,
      likedBy: [],
      replies: []
    };
    const updated = [post, ...communityPosts].slice(0, 60);
    setCommunityPosts(updated);
    setNewPostText('');
    setPostIsSpoiler(false);
    const nextXp = userXp + 15;
    setUserXp(nextXp);
    localStorage.setItem('bx_mob_xp', String(nextXp));
    haptic('success');
    showToast(lang === 'ar' ? 'اتنشر البوست (+15 XP)' : 'Posted (+15 XP)', 'check');
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

  // One like per account (likedBy); tapping again removes it.
  const handleLikePost = useCallback(
    async (postId) => {
      if (!myPostKey) {
        showToast(lang === 'ar' ? 'سجّل دخولك الأول عشان تعمل لايك' : 'Sign in to like posts', 'user');
        return;
      }
      haptic('select');
      const updated = communityPosts.map((p) => {
        if (p.id !== postId) return p;
        const likedBy = Array.isArray(p.likedBy) ? p.likedBy : [];
        const liked = likedBy.includes(myPostKey);
        return {
          ...p,
          likedBy: liked ? likedBy.filter((k) => k !== myPostKey) : [...likedBy, myPostKey],
          likes: Math.max(0, (Number(p.likes) || 0) + (liked ? -1 : 1))
        };
      });
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
    [communityPosts, myPostKey, showToast, lang]
  );

  const handleAddPostReply = useCallback(
    async (postId) => {
      if (!replyText.trim() || !user) return;
      const replyObj = {
        id: `rep_${Date.now()}`,
        author: user.displayName || user.username,
        role: user.role || 'user',
        text: replyText.trim(),
        createdAt: new Date().toISOString(),
        time: (() => {
          try {
            return new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' });
          } catch (_) {
            return '';
          }
        })()
      };
      const updated = communityPosts.map((p) =>
        p.id === postId ? { ...p, replies: [...(Array.isArray(p.replies) ? p.replies : []), replyObj] } : p
      );
      setCommunityPosts(updated);
      setReplyText('');
      setReplyingToPostId(null);
      showToast(lang === 'ar' ? 'اتبعت الرد' : 'Reply sent', 'check');
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

  const seekVideoBy = (deltaSec) => {
    const v = videoRef.current;
    if (!v) return;
    haptic('tap');
    const dur = Number.isFinite(v.duration) ? v.duration : Infinity;
    v.currentTime = Math.max(0, Math.min(dur - 1, (v.currentTime || 0) + deltaSec));
  };

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

  // Tab navigation (dock, top-bar picture, "All" links). Switching tabs slides the new
  // page in from the side of the tapped tab (tabMotion.js); the same tab scrolls to top.
  const goToTab = (tabId, after) => {
    const sameTab = activeTab === tabId && !selectedAnime;
    haptic(sameTab ? 'select' : 'tap');
    if (sameTab) {
      setCommandMenuOpen(false);
      if (typeof after === 'function') after();
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (_) {}
      return;
    }
    const apply = () => {
      setCommandMenuOpen(false);
      setSelectedAnime(null);
      setActiveEpisode(null);
      setPlayerMinimized(false);
      setActiveTab(tabId);
      if (typeof after === 'function') after();
      jumpToTop();
    };
    if (selectedAnime || activeEpisode) apply();
    else navigateWithMotion(activeTab, tabId, lang === 'ar', apply);
  };

  // Interface language (Settings). The lang effect updates <html lang/dir>.
  const changeLanguage = (next) => {
    if (next === lang) return;
    haptic('select');
    try {
      localStorage.setItem('bx_mob_lang', next);
    } catch (_) {}
    if (typeof document.startViewTransition === 'function') {
      try {
        document.startViewTransition(() => flushSync(() => setLang(next)));
        return;
      } catch (_) {}
    }
    setLang(next);
  };

  // Search: remember the last queries (only real searches the user made on this phone).
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return undefined;
    const t = setTimeout(() => {
      setRecentSearches((prev) => {
        const next = [q, ...prev.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8);
        try {
          localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
        } catch (_) {}
        return next;
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [searchQuery]);
  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (_) {}
  };
  const catalogFilterValue = { sort: catalogSort, type: catalogType, state: catalogState, studio: catalogStudio, genre: catalogGenre };
  const catalogFilterCount = activeFilterCount(catalogFilterValue);
  const applyCatalogFilters = (v) => {
    setCatalogSort(v.sort);
    setCatalogType(v.type);
    setCatalogState(v.state);
    setCatalogStudio(v.studio);
    setCatalogGenre(v.genre);
  };
  const resetCatalogFilters = () =>
    applyCatalogFilters({ sort: SORT_OPTIONS[0].id, type: TYPE_FILTERS[0], state: STATE_FILTERS[0], studio: STUDIO_FILTERS[0], genre: GENRE_CHIPS[0] });

  // Home "All" links open the search tab with the matching order / filter.
  const handleHomeSeeAll = (sortKey, filter) => {
    if (sortKey === 'schedule') {
      goToTab('schedule', () => setScheduleDay(todayScheduleId()));
      return;
    }
    goToTab('catalog', () => {
      setSearchQuery('');
      setCatalogSort(sortKey);
      setCatalogGenre(GENRE_CHIPS[0]);
      setCatalogType(filter === 'movie' ? TYPE_FILTERS.find((t) => t.id === 'movie') : TYPE_FILTERS[0]);
      setCatalogState(filter === 'airing' ? STATE_FILTERS.find((t) => t.id === 'airing') : STATE_FILTERS[0]);
      setCatalogStudio(STUDIO_FILTERS[0]);
    });
  };
  const handleHomeGenre = (genre) => {
    goToTab('catalog', () => {
      setSearchQuery('');
      setCatalogGenre(genre);
      setCatalogType(TYPE_FILTERS[0]);
      setCatalogState(STATE_FILTERS[0]);
      setCatalogStudio(STUDIO_FILTERS[0]);
    });
  };
  const avatarPhoto = user?.photoUrl && !avatarFailed ? user.photoUrl : '';
  const isRtl = lang === 'ar';
  // Entrance class of the visible tab page, decided once when that page mounts.
  const pageKey = `${activeTab}${selectedAnime ? ':details' : ''}`;
  const pageClassRef = useRef({ key: '', cls: 'bx-page' });
  if (pageClassRef.current.key !== pageKey) pageClassRef.current = { key: pageKey, cls: pageEnterClass() };
  const pageCls = pageClassRef.current.cls;
  // Overlays that animate out before they unmount.
  const menuPresence = usePresence(commandMenuOpen, 200);
  const peekPresence = usePresence(Boolean(quickPeekAnime), 240);
  const lastPeekRef = useRef(null);
  if (quickPeekAnime) lastPeekRef.current = quickPeekAnime;
  const peekItem = quickPeekAnime || lastPeekRef.current;
  const homeLists = useMemo(
    () => ({ popular: popularList, topRated: topRankedList, airing: airingList, latest: latestList, movies: moviesList, today: todayList }),
    [popularList, topRankedList, airingList, latestList, moviesList, todayList]
  );

  // ---- v16 UI hooks ---------------------------------------------------------------
  useEffect(() => {
    installPointerTracker();
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const handlePullRefresh = useCallback(
    () =>
      new Promise((resolve) => {
        refreshDoneRef.current = resolve;
        setTimeout(resolve, 10000);
        if (activeTab === 'home') {
          setHomeRefreshTick((t) => t + 1);
          fetchAppConfig().then(applyAppConfig).catch(() => {});
        } else if (activeTab === 'schedule') {
          setScheduleRefreshTick((t) => t + 1);
        } else {
          resolve();
        }
      }),
    [activeTab, applyAppConfig]
  );

  // Drag the details sheet down to close it; drag the player page down to shrink it to the mini player.
  const ignoreSwipeTarget = useCallback(
    (t) => Boolean(t?.closest?.('[data-bx-video], input, textarea, select, [role="slider"], [data-no-swipe], .bx-mob-scroll')),
    []
  );
  useSwipeDismiss(detailsSheetRef, closeDetailsSheet, {
    enabled: Boolean(selectedAnime) && !(activeEpisode && !playerMinimized),
    ignore: ignoreSwipeTarget
  });
  const minimizePlayer = useCallback(() => setPlayerMinimized(true), []);
  useSwipeDismiss(playerPageRef, minimizePlayer, {
    enabled: Boolean(activeEpisode) && !playerMinimized && !videoFullscreen,
    ignore: ignoreSwipeTarget
  });

  // "Because you watched": titles sharing the genres of the latest watched show.
  const loadSimilarTitles = useCallback(async (seed) => {
    const title = seed?.titleEn || seed?.titleAr || '';
    if (!title) return [];
    const found = await queryAlgolia('series_fav_count_desc', { query: title, hitsPerPage: 3 }).catch(() => null);
    const hit = (found?.hits || []).map(formatAnimeHit).find((x) => x && (x.objectID === seed.objectID || x.titleEn === seed.titleEn));
    const tags = (hit?.tags || []).filter(Boolean).slice(0, 2);
    if (!tags.length) return [];
    const query = (facetFilters) =>
      queryAlgolia('series_fav_count_desc', { query: '', facetFilters, hitsPerPage: 24 })
        .then((r) => (r?.hits || []).map(formatAnimeHit).filter(Boolean))
        .catch(() => []);
    let list = await query(tags.map((t) => [`tags:${t}`]));
    if (list.length < 8 && tags.length > 1) list = [...list, ...(await query([[`tags:${tags[0]}`]]))];
    const seen = new Set();
    return list.filter((x) => x.objectID !== (hit?.objectID || seed.objectID) && !seen.has(x.objectID) && seen.add(x.objectID));
  }, []);
  const watchedIds = useMemo(() => watchHistory.map((h) => h.objectID).filter(Boolean), [watchHistory]);

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`bx-app${dataSaver ? ' bx-datasaver' : ''}`}
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
          from { opacity: 0; transform: translate3d(0, 28px, 0); }
          to { opacity: 1; transform: none; }
        }
        .bx-mob-scroll::-webkit-scrollbar { display: none; }
        .bx-mob-scroll { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
      `}</style>

      {/* GPU 4K Anime Line-Art Sharpening Convolution Filter */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <filter id="bx-sharpen-4k">
            <feConvolveMatrix order="3" kernelMatrix="0 -0.45 0 -0.45 2.8 -0.45 0 -0.45 0" preserveAlpha="true" />
          </filter>
        </defs>
      </svg>

      {/* Top toast (own component: showing one does not re-render the app) */}
      <ToastHost />

      {/* Pull to refresh (home + schedule) */}
      <PullToRefresh
        onRefresh={handlePullRefresh}
        disabled={!(activeTab === 'home' || activeTab === 'schedule') || Boolean(selectedAnime) || Boolean(activeMangaChapter) || commandMenuOpen}
        label={isRtl ? 'اسحب للتحديث' : 'Pull to refresh'}
        releaseLabel={isRtl ? 'سيب للتحديث' : 'Release to refresh'}
      />

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
          <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.0625rem', fontWeight: 800 }}>
            <BxIcon name="lock" className="bx-ico-lead" />{isRtl ? 'قفل حماية BLACK X مفعل' : 'BLACK X PIN Lock'}
          </h2>
          <p style={{ margin: '0 0 1.2rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
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
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'del', 0, 'ok'].map((k) => (
              <button
                key={String(k)}
                type="button"
                onClick={() => {
                  if (k === 'del') {
                    setPinInput((p) => p.slice(0, -1));
                    return;
                  }
                  if (k === 'ok') {
                    if (pinInput === appPinCode) {
                      setPinLocked(false);
                      setPinInput('');
                    } else {
                      setPinInput('');
                      showToast(isRtl ? 'الـ PIN غلط' : 'Incorrect PIN', 'x-circle');
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
                        showToast(isRtl ? 'الـ PIN غلط' : 'Incorrect PIN', 'x-circle');
                      }, 180);
                    }
                  }
                }}
                style={{
                  height: '62px',
                  borderRadius: '18px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  fontSize: '1.375rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
                aria-label={k === 'del' ? (isRtl ? 'مسح' : 'Delete') : k === 'ok' ? (isRtl ? 'تأكيد' : 'Confirm') : String(k)}
              >
                {k === 'del' ? <BxIcon name="delete" /> : k === 'ok' ? <BxIcon name="check" /> : k}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* New Release Radar Modal ( رادار الحلقات والفصول الجديدة) */}
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
              borderRadius: '18px',
              padding: '1.1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.9375rem' }}>
                <img
                  src="/blackx-logo.png"
                  alt="BLACK X"
                  style={{ width: '24px', height: '24px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.28)' }}
                />
                <span><BxIcon name="bell" className="bx-ico-lead" />{isRtl ? 'رادار وإشعارات الحلقات الجديدة للهاتف' : 'Phone Episode Notifications Radar'}</span>
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
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <BxIcon name="close" />
              </button>
            </div>

            {/* Real Native Phone Notification Control Box */}
            <div
              style={{
                padding: '0.75rem',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.22)',
                marginBottom: '0.85rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  <BxIcon name="smartphone" className="bx-ico-lead" />{isRtl ? 'إشعارات الموبايل' : 'Phone notifications'}
                </span>
                <span
                  style={{
                    padding: '0.12rem 0.48rem',
                    borderRadius: '999px',
                    background: '#ffffff',
                    color: '#000000',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  ACTIVE • مفعل تلقائياً
                </span>
              </div>
              <p style={{ margin: '0 0 0.55rem', fontSize: '0.9375rem', color: 'rgba(255,255,255,0.68)', lineHeight: 1.45 }}>
                {isRtl
                  ? 'يرسل التطبيق إشعارات حقيقية لشريط حالة هاتفك فور نزول كل حلقة أنمي جديدة. اضغط بالأسفل لاختبار إشعار الهاتف الآن:'
                  : 'Automatically sends real Android status-bar notifications when new anime episodes drop:'}
              </p>
              <button
                type="button"
                onClick={() => {
                  const sampleAnime = latestList[0] || popularList[0] || { titleEn: 'Solo Leveling', latestEp: 12 };
                  dispatchPhoneNotification(
                    'حلقة أنمي جديدة على BLACK X!',
                    `نزلت الآن أحدث حلقات (${sampleAnime.titleEn}) على BLACK X — اضغط للمشاهدة!`,
                    Math.floor(Date.now() % 90000) + 1000
                  );
                  showToast('اتبعت إشعار تجربة للموبايل', 'smartphone');
                }}
                style={{
                  width: '100%',
                  padding: '0.58rem',
                  borderRadius: '999px',
                  border: 'none',
                  background: '#ffffff',
                  color: '#000000',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                <BxIcon name="bell" className="bx-ico-lead" />{isRtl ? 'ابعت إشعار تجربة' : 'Send Phone Notification Now'}
              </button>
            </div>

            <p style={{ margin: '0 0 0.65rem', fontSize: '0.9375rem', color: 'rgba(255,255,255,0.68)', lineHeight: 1.5 }}>
              {isRtl
                ? <>{"أحدث الحلقات الصادرة هذا الأسبوع (اضغط المشاهدة أو"}<BxIcon name="bell" className="bx-ico-lead" />{"لإرسال تنبيه للهاتف):"}</>
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
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.titleEn}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.18rem' }}>
                      <BxIcon name="dot" className="bx-ico-lead" />{isRtl ? 'متاح الآن على سيرفرات BLACK X' : 'Available now on the BLACK X servers'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatchPhoneNotification(
                        `حلقة جديدة: ${item.titleEn}`,
                        `شاهد الآن أحدث حلقات (${item.titleAr || item.titleEn}) على BLACK X!`,
                        2000 + idx
                      );
                      showToast(`اتبعت إشعار (${item.titleEn}) للموبايل`, 'smartphone');
                    }}
                    style={{
                      padding: '0.28rem 0.5rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.25)',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <BxIcon name="bell" />
                  </button>
                  <span
                    style={{
                      padding: '0.28rem 0.55rem',
                      borderRadius: '8px',
                      background: '#ffffff',
                      color: '#000000',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}
                  >
                    <BxIcon name="play" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top bar: only the user's picture + the access menu (logo / version / shortcuts live in the menu now) */}
      {!selectedAnime && !activeMangaChapter && (
        <header className={`bx-topbar${pageScrolled ? ' is-solid' : ''}${topbarHidden && !commandMenuOpen ? ' is-hidden' : ''}`}>
          <button
            type="button"
            className={`bx-avatar-btn${activeTab === 'profile' ? ' is-on' : ''}`}
            onClick={() => goToTab('profile')}
            aria-label={isRtl ? 'حسابي' : 'My account'}
          >
            {avatarPhoto ? (
              <img src={avatarPhoto} alt="" referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} />
            ) : user ? (
              <span>{(user.displayName?.[0] || user.username?.[0] || 'X').toUpperCase()}</span>
            ) : (
              <BxIcon name="user" />
            )}
          </button>
          {TOPBAR_TITLES[activeTab] && (
            <h1 className="bx-topbar-title" key={activeTab}>
              {isRtl ? TOPBAR_TITLES[activeTab].ar : TOPBAR_TITLES[activeTab].en}
            </h1>
          )}
          <button
            type="button"
            className="bx-round-btn"
            onClick={() => {
              haptic('tap');
              setCommandMenuOpen(true);
            }}
            aria-label={isRtl ? 'القائمة' : 'Menu'}
            aria-haspopup="dialog"
          >
            <BxIcon name="menu" />
          </button>
        </header>
      )}
      {!selectedAnime && !activeMangaChapter && (activeTab !== 'home' || globalBroadcastMsg) && (
        <div className="bx-topbar-spacer" aria-hidden="true" />
      )}

      {/* Global Real-Time Developer Push Broadcast Banner */}
      {globalBroadcastMsg && (
        <div
          style={{
            padding: '0.52rem 0.9rem',
            background: '#ffffff',
            color: '#000000',
            fontWeight: 700,
            fontSize: '0.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.6rem',
            borderBottom: '1px solid #000000'
          }}
        >
          <span><BxIcon name="megaphone" className="bx-ico-lead" />{globalBroadcastMsg}</span>
        </div>
      )}

      {/* ==================== TAB 1: HOME (HomeTab.jsx) ==================== */}
      {activeTab === 'home' && !selectedAnime && (
        <HomeTab
          pageClassName={pageCls}
          isRtl={isRtl}
          lang={lang}
          dataSaver={dataSaver}
          loading={homeLoading}
          lists={homeLists}
          watchHistory={watchHistory}
          watchedIds={watchedIds}
          mangaHistory={mangaHistory}
          favorites={favorites}
          genres={HOME_GENRES}
          apkRelease={apkRelease}
          heroPaused={Boolean(selectedAnime) || Boolean(storyPreviewAnime)}
          onOpen={handleOpenAnime}
          onPeek={setQuickPeekAnime}
          onStory={setStoryPreviewAnime}
          onToggleFavorite={toggleFavorite}
          onSeeAll={handleHomeSeeAll}
          onGenre={handleHomeGenre}
          onOpenManga={(mh) => {
            setActiveTab('manga');
            handleOpenManga(mh);
          }}
          onMangaLibrary={() => goToTab('manga')}
          loadSimilar={loadSimilarTitles}
        />
      )}

      {/* ==================== TAB 2: SEARCH (every BLACK X anime server, like the website) ==================== */}
      {activeTab === 'catalog' && !selectedAnime && (
        <main className={pageCls} style={{ padding: '0.25rem 1rem 1rem' }}>
          <div className="bx-search-bar">
            <BxIcon name="search" />
            <SearchBox
              value={searchQuery}
              onCommit={setSearchQuery}
              placeholder={isRtl ? 'دوّر على أنمي أو فيلم' : 'Search anime & movies'}
              inputStyle={{
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#ffffff',
                fontSize: '0.9375rem',
                fontWeight: 600
              }}
            />
            {searchQuery && (
              <button type="button" className="bx-search-clear" onClick={() => setSearchQuery('')} aria-label={isRtl ? 'مسح' : 'Clear'}>
                <BxIcon name="close" />
              </button>
            )}
          </div>

          <div className="bx-search-tools">
            <button
              type="button"
              className={`bx-chip${catalogFilterCount ? ' is-active' : ''}`}
              onClick={() => {
                haptic('tap');
                setFilterSheetOpen(true);
              }}
            >
              <BxIcon name="sliders" size="1.05em" />
              {isRtl ? 'فلترة' : 'Filters'}
              {catalogFilterCount ? ` · ${catalogFilterCount}` : ''}
            </button>
            <span className="bx-search-count">
              {Number.isFinite(catalogTotal)
                ? searchQuery.trim()
                  ? isRtl
                    ? `${catalogTotal.toLocaleString()} نتيجة`
                    : `${catalogTotal.toLocaleString()} results`
                  : isRtl
                  ? `${catalogTotal.toLocaleString()} عمل`
                  : `${catalogTotal.toLocaleString()} titles`
                : ''}
            </span>
          </div>

          {!searchQuery.trim() && recentSearches.length > 0 && (
            <section className="bx-search-recent">
              <div className="bx-section-head">
                <h2 className="bx-section-title">{isRtl ? 'آخر عمليات البحث' : 'Recent searches'}</h2>
                <button type="button" className="bx-see-all" onClick={clearRecentSearches}>
                  {isRtl ? 'مسح' : 'Clear'}
                </button>
              </div>
              <div className="bx-filter-chips">
                {recentSearches.map((q) => (
                  <button key={q} type="button" className="bx-chip" onClick={() => setSearchQuery(q)}>
                    <BxIcon name="clock" size="1em" />
                    <bdi>{q}</bdi>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Matching manga for the same query */}
          {searchQuery.trim().length >= 2 && universalMangaHits.length > 0 && (
            <section className="bx-search-manga">
              <SectionHead
                title={isRtl ? `مانجا (${universalMangaHits.length})` : `Manga (${universalMangaHits.length})`}
                onMore={() => goToTab('manga', () => setMangaQuery(searchQuery))}
                moreLabel={isRtl ? 'افتح في المانجا' : 'Open in Manga'}
                isRtl={isRtl}
              />
              <div className="bx-row bx-mob-scroll">
                {universalMangaHits.map((mh) => (
                  <PosterCard
                    key={`m-${mh.objectID}`}
                    item={{ objectID: `manga-${mh.objectID}`, titleEn: mh.name, poster: mh.poster_uri }}
                    width={96}
                    badge={null}
                    dataSaver={dataSaver}
                    onOpen={() => {
                      setActiveTab('manga');
                      handleOpenManga(mh);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          <h2 className="bx-section-title" style={{ margin: '1rem 0 0.7rem' }}>
            {searchQuery.trim()
              ? isRtl
                ? 'أنمي'
                : 'Anime'
              : isRtl
              ? (SORT_OPTIONS.find((o) => o.id === catalogSort) || SORT_OPTIONS[0]).ar
              : (SORT_OPTIONS.find((o) => o.id === catalogSort) || SORT_OPTIONS[0]).en}
          </h2>

          {catalogLoading ? (
            <SkeletonGrid count={12} columns={3} padding="0" />
          ) : catalogItems.length === 0 ? (
            <div className="bx-empty">
              <BxIcon name="search" size="2rem" />
              <p>{isRtl ? 'مفيش نتايج. جرّب اسم تاني أو غيّر الفلترة.' : 'No results. Try another name or change the filters.'}</p>
              {catalogFilterCount > 0 && (
                <button type="button" className="bx-btn bx-btn-outline" onClick={resetCatalogFilters}>
                  {isRtl ? 'إلغاء الفلترة' : 'Clear filters'}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="bx-grid bx-stagger">
                {catalogItems.map((item) => (
                  <PosterCard key={item.objectID} item={item} onOpen={handleOpenAnime} onPeek={setQuickPeekAnime} dataSaver={dataSaver} />
                ))}
              </div>

              {!searchQuery.trim() && Number.isFinite(catalogTotal) && catalogItems.length < catalogTotal && (
                <button
                  type="button"
                  className="bx-btn bx-btn-outline bx-btn-block"
                  onClick={handleLoadMoreCatalog}
                  disabled={loadingMoreCatalog}
                  style={{ marginTop: '1.25rem' }}
                >
                  {loadingMoreCatalog ? (
                    <>
                      <BxIcon name="loader" spin />
                      {isRtl ? 'بيحمّل...' : 'Loading...'}
                    </>
                  ) : isRtl ? (
                    `عرض المزيد (${catalogItems.length} من ${catalogTotal.toLocaleString()})`
                  ) : (
                    `Load more (${catalogItems.length} of ${catalogTotal.toLocaleString()})`
                  )}
                </button>
              )}
            </>
          )}
        </main>
      )}

      {/* ==================== TAB 2.5: AIRING SCHEDULE (ScheduleTab.jsx) ==================== */}
      {activeTab === 'schedule' && !selectedAnime && (
        <ScheduleTab
          pageClassName={pageCls}
          isRtl={isRtl}
          day={scheduleDay}
          onDay={(d) => {
            haptic('select');
            setScheduleDay(d);
          }}
          items={scheduleItems}
          loading={scheduleLoading}
          favorites={favorites}
          dataSaver={dataSaver}
          onOpen={handleOpenAnime}
          onPeek={setQuickPeekAnime}
          onToggleFavorite={toggleFavorite}
          onAlerts={() => setRadarModalOpen(true)}
        />
      )}

      {/* ==================== TAB 3: MANGA & MANHWA (website BLACK X manga servers + FULLSCREEN 120Hz READER) ==================== */}
      {activeTab === 'manga' && !selectedAnime && (
        <main className={activeMangaChapter ? undefined : pageCls} style={{ padding: activeMangaChapter ? '0' : '0.85rem 1rem' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <button
                      type="button"
                      className="bx-icon-btn bx-icon-btn-sm"
                      aria-label={isRtl ? 'رجوع للفصول' : 'Back to chapters'}
                      onClick={() => {
                        setAutoScrollSpeed(0);
                        setActiveMangaChapter(null);
                      }}
                    >
                      <BxIcon name={isRtl ? 'arrow-right' : 'arrow-left'} />
                    </button>

                    {/* Quick Chapter Jump Dropdown */}
                    <select
                      value={activeMangaChapter.id}
                      onChange={(e) => {
                        const target = mangaChapters.find((c) => c.id === e.target.value);
                        if (target) handleReadMangaChapter(target);
                      }}
                      aria-label={isRtl ? 'اختار الفصل' : 'Choose chapter'}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        height: '40px',
                        padding: '0 0.6rem',
                        borderRadius: '12px',
                        background: '#000',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.22)',
                        fontWeight: 600,
                        fontSize: '0.8125rem'
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
                      className="bx-icon-btn bx-icon-btn-sm"
                      aria-label={isRtl ? 'احفظ اللوحة دي' : 'Save this panel'}
                      onClick={handleBookmarkCurrentPanel}
                    >
                      <BxIcon name="bookmark" />
                    </button>

                    <button
                      type="button"
                      className={`bx-icon-btn bx-icon-btn-sm${readerSettingsOpen ? ' is-on' : ''}`}
                      aria-label={isRtl ? 'إعدادات القراءة' : 'Reader settings'}
                      aria-expanded={readerSettingsOpen}
                      onClick={() => setReaderSettingsOpen((v) => !v)}
                    >
                      <BxIcon name="settings" />
                    </button>
                  </div>

                  {/* Clean Collapsible Reader Studio Drawer (Opens only when الإعدادات is tapped) */}
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
                        onClick={handleCycleReadingBgm}
                        style={{
                          padding: '0.42rem 0.6rem',
                          borderRadius: '8px',
                          background: readingBgmMode !== 'off' ? '#ffffff' : 'rgba(255,255,255,0.1)',
                          color: readingBgmMode !== 'off' ? '#000000' : '#ffffff',
                          border: '1px solid rgba(255,255,255,0.2)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="headphones" className="bx-ico-lead" />
                        {isRtl
                          ? `موسيقى: ${readingBgmMode === 'drone' ? 'هادية' : readingBgmMode === 'rain' ? 'مطر' : readingBgmMode === 'battle' ? 'حماس' : 'مقفولة'}`
                          : `Music: ${readingBgmMode === 'drone' ? 'calm' : readingBgmMode === 'rain' ? 'rain' : readingBgmMode === 'battle' ? 'epic' : 'off'}`}
                      </button>

                      <button
                        type="button"
                        onClick={() => setReaderMode((m) => (m === 'webtoon' ? 'page' : 'webtoon'))}
                        style={{
                          padding: '0.42rem 0.6rem',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {readerMode === 'webtoon' ? <><BxIcon name="scroll" className="bx-ico-lead" />{isRtl ? 'عرض طولي' : 'Vertical'}</> : <><BxIcon name="file" className="bx-ico-lead" />{isRtl ? 'صفحة صفحة' : 'Pages'}</>}
                      </button>

                      <button
                        type="button"
                        onClick={() => setReaderZoom((z) => (z === 100 ? 125 : z === 125 ? 150 : z === 150 ? 200 : 100))}
                        style={{
                          padding: '0.42rem 0.6rem',
                          borderRadius: '8px',
                          background: readerZoom > 100 ? '#ffffff' : 'rgba(255,255,255,0.1)',
                          color: readerZoom > 100 ? '#000000' : '#ffffff',
                          border: '1px solid rgba(255,255,255,0.2)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="search" className="bx-ico-lead" />تكبير: {readerZoom}%
                      </button>

                      {readerMode === 'page' && (
                        <button
                          type="button"
                          onClick={() => setDualPageSpread((d) => !d)}
                          style={{
                            padding: '0.42rem 0.6rem',
                            borderRadius: '8px',
                            background: dualPageSpread ? '#ffffff' : 'rgba(255,255,255,0.1)',
                            color: dualPageSpread ? '#000000' : '#ffffff',
                            border: '1px solid rgba(255,255,255,0.2)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <BxIcon name="book" className="bx-ico-lead" />{dualPageSpread ? 'عرض: صفحتين' : 'عرض: صفحة واحدة'}
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
                            borderRadius: '8px',
                            background: autoScrollSpeed > 0 ? '#ffffff' : 'rgba(255,255,255,0.1)',
                            color: autoScrollSpeed > 0 ? '#000000' : '#ffffff',
                            border: '1px solid rgba(255,255,255,0.2)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <BxIcon name="arrow-down" className="bx-ico-lead" />{autoScrollSpeed === 0 ? 'تمرير تلقائي: إيقاف' : `تمرير تلقائي: ${autoScrollSpeed}x`}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setVolumeKeyScroll((v) => !v)}
                        style={{
                          padding: '0.42rem 0.6rem',
                          borderRadius: '8px',
                          background: volumeKeyScroll ? '#ffffff' : 'rgba(255,255,255,0.1)',
                          color: volumeKeyScroll ? '#000000' : '#ffffff',
                          border: '1px solid rgba(255,255,255,0.2)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="volume" className="bx-ico-lead" />أزرار الصوت: {volumeKeyScroll ? 'تمرير' : 'صوت'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setReaderEyeFilter((f) => (f === 'normal' ? 'warm' : f === 'warm' ? 'contrast' : 'normal'))
                        }
                        style={{
                          padding: '0.42rem 0.6rem',
                          borderRadius: '8px',
                          background: readerEyeFilter !== 'normal' ? '#ffffff' : 'rgba(255,255,255,0.1)',
                          color: readerEyeFilter !== 'normal' ? '#000000' : '#ffffff',
                          border: '1px solid rgba(255,255,255,0.2)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {readerEyeFilter === 'normal'
                          ? <><BxIcon name="eye" className="bx-ico-lead" />{"ألوان أصلية"}</>
                          : readerEyeFilter === 'warm'
                          ? <><BxIcon name="moon" className="bx-ico-lead" />{"حماية العين"}</>
                          : <><BxIcon name="zap" className="bx-ico-lead" />{"تباين فائق"}</>}
                      </button>

                      {readerMode === 'webtoon' && (
                        <button
                          type="button"
                          onClick={() => setSeamlessStitch((s) => !s)}
                          style={{
                            padding: '0.42rem 0.6rem',
                            borderRadius: '8px',
                            background: seamlessStitch ? '#ffffff' : 'rgba(255,255,255,0.1)',
                            color: seamlessStitch ? '#000000' : '#ffffff',
                            border: '1px solid rgba(255,255,255,0.2)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <BxIcon name="scissors" className="bx-ico-lead" />دمج الشرائح: {seamlessStitch ? 'مفعل' : 'عادي'}
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={savingOfflineChapter}
                        onClick={handleSaveChapterOffline}
                        style={{
                          padding: '0.42rem 0.6rem',
                          borderRadius: '8px',
                          background: offlineChapters.some((x) => x.id === activeMangaChapter.id)
                            ? '#ffffff'
                            : 'rgba(255,255,255,0.12)',
                          color: offlineChapters.some((x) => x.id === activeMangaChapter.id) ? '#000000' : '#ffffff',
                          border: '1px solid rgba(255,255,255,0.22)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {savingOfflineChapter
                          ? <><BxIcon name="loader" />{"..."}</>
                          : offlineChapters.some((x) => x.id === activeMangaChapter.id)
                          ? <><BxIcon name="check" className="bx-ico-lead" />{"محفوظ بدون نت"}</>
                          : <><BxIcon name="download" className="bx-ico-lead" />{"حفظ الفصل بدون نت"}</>}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {mangaPagesLoading ? (
                <div style={{ textAlign: 'center', padding: '6rem 1.5rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRtl ? <><BxIcon name="loader" className="bx-ico-lead" />{"بيحمّل صفحات الفصل..."}</> : <><BxIcon name="loader" className="bx-ico-lead" />{"Loading fullscreen chapter pages..."}</>}
                </div>
              ) : mangaPages.length === 0 ? (
                <div
                  style={{
                    minHeight: '70vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.8rem',
                    padding: '2rem 1.4rem',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.78)',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    lineHeight: 1.6
                  }}
                >
                  <div>
                    {mangaPagesError === 'network'
                      ? isRtl
                        ? 'تعذّر الاتصال بسيرفرات BLACK X — تأكد من الإنترنت ثم أعد المحاولة.'
                        : 'Could not reach the BLACK X servers — check your connection and retry.'
                      : isRtl
                        ? `مفيش صفحات للفصل ده على ${mangaServerLabel(activeMangaChapter?.server || mangaActiveServer)} دلوقتي — جرّب سيرفر تاني`
                        : `No pages for this chapter on ${mangaServerLabel(activeMangaChapter?.server || mangaActiveServer)} right now — try another server on the title page.`}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!activeMangaChapter) return;
                        delete prefetchedChapterRef.current[activeMangaChapter.id];
                        handleReadMangaChapter(activeMangaChapter);
                      }}
                      style={{
                        padding: '0.55rem 1.1rem',
                        borderRadius: '999px',
                        background: '#ffffff',
                        color: '#000000',
                        border: 'none',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isRtl ? <><BxIcon name="retry" className="bx-ico-lead" />{"إعادة المحاولة"}</> : <><BxIcon name="retry" className="bx-ico-lead" />{"Retry"}</>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMangaChapter(null)}
                      style={{
                        padding: '0.55rem 1.1rem',
                        borderRadius: '999px',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.25)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isRtl ? <><BxIcon name="arrow-right" className="bx-ico-lead" />{"قائمة الفصول والسيرفرات"}</> : <><BxIcon name="arrow-left" className="bx-ico-lead" />{"Chapters & servers"}</>}
                    </button>
                  </div>
                </div>
              ) : readerMode === 'page' && mangaPages.length > 0 ? (
                <div style={{ textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div
                    onDoubleClick={() => {
                      const nextZ = readerZoom === 100 ? 200 : 100;
                      setReaderZoom(nextZ);
                      showToast(nextZ === 200 ? 'تكبير اللوحة 200%' : 'الحجم الطبيعي 100%', 'search');
                    }}
                    style={{
                      overflowX: 'auto',
                      display: dualPageSpread ? 'grid' : 'block',
                      gridTemplateColumns: dualPageSpread ? '1fr 1fr' : 'none',
                      gap: '2px',
                      alignItems: 'center'
                    }}
                  >
                    <MangaPageImage
                      isRtl={isRtl}
                      loading="eager"
                      src={mangaPages[currentPageIdx]}
                      alt={isRtl ? `الصفحة ${currentPageIdx + 1}` : `Page ${currentPageIdx + 1}`}
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
                      <MangaPageImage
                        isRtl={isRtl}
                        loading="eager"
                        src={mangaPages[currentPageIdx + 1]}
                        alt={isRtl ? `الصفحة ${currentPageIdx + 2}` : `Page ${currentPageIdx + 2}`}
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
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.12)',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isRtl ? <><BxIcon name="arrow-right" className="bx-ico-lead" />{"الصفحة السابقة"}</> : <><BxIcon name="arrow-left" className="bx-ico-lead" />{"Prev Page"}</>}
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                      {currentPageIdx + 1} / {mangaPages.length}
                    </span>
                    <button
                      type="button"
                      disabled={currentPageIdx + 1 >= mangaPages.length}
                      onClick={() => setCurrentPageIdx((p) => Math.min(mangaPages.length - 1, p + 1))}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '12px',
                        background: '#ffffff',
                        color: '#000',
                        border: 'none',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isRtl ? <>{"الصفحة التالية"}<BxIcon name="arrow-left" className="bx-ico-trail" /></> : <>{"Next Page"}<BxIcon name="arrow-right" className="bx-ico-trail" /></>}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setReaderHudVisible((v) => !v)}
                  onDoubleClick={() => {
                    const nextZ = readerZoom === 100 ? 200 : 100;
                    setReaderZoom(nextZ);
                    showToast(nextZ === 200 ? 'تكبير اللوحة 200%' : 'الحجم الطبيعي 100%', 'search');
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0,
                    width: '100vw',
                    overflowX: 'auto',
                    lineHeight: 0,
                    fontSize: '0.75rem'
                  }}
                >
                  {mangaPages.map((pg, idx) => (
                    <MangaPageImage
                      key={`${idx}-${pg}`}
                      isRtl={isRtl}
                      src={pg}
                      alt={isRtl ? `الصفحة ${idx + 1}` : `Page ${idx + 1}`}
                      loading="lazy"
                          decoding="async"
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
                      borderRadius: '999px',
                      background: 'rgba(0,0,0,0.82)',
                      border: '1px solid rgba(255,255,255,0.22)',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
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
                        ? `${pct}% • متبقي ~${pct >= 98 ? 0 : remMin} د`
                        : `${pct}% • ~${pct >= 98 ? 0 : remMin}m left`;
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
                              fontWeight: 700,
                              fontSize: '0.8125rem',
                              cursor: 'pointer'
                            }}
                          >
                            <BxIcon name="skip-back" className="bx-ico-lead" />{isRtl ? `الفصل ${prevCh.chapter}` : `Ch. ${prevCh.chapter}`}
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
                              fontWeight: 700,
                              fontSize: '0.8125rem',
                              cursor: 'pointer'
                            }}
                          >
                            <BxIcon name="skip-forward" className="bx-ico-lead" />{isRtl ? `الفصل ${nextCh.chapter}` : `Ch. ${nextCh.chapter}`}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : selectedManga ? (
            <div className="bx-page">
              {/* ==================== v12.0 SLOTH-UI & SOLO LEVELING LUXURY MANGA SERIES HUB ==================== */}
              <div
                style={{
                  position: 'relative',
                  borderRadius: '18px',
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
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      {isRtl ? <><BxIcon name="arrow-right" className="bx-ico-lead" />{"مكتبة المانجا"}</> : <><BxIcon name="arrow-left" className="bx-ico-lead" />{"Manga Library"}</>}
                    </button>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.38rem', padding: '0.28rem 0.7rem', borderRadius: '999px', background: 'rgba(14,14,20,0.82)', border: '1px solid rgba(255,255,255,0.22)' }}>
                      <span
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          color: '#000000',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        X
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                        {mangaActiveServer ? mangaServerLabel(mangaActiveServer) : selectedManga.sourceLabel || 'BLACK X MANGA'}
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
                      borderRadius: '18px',
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

                  <h2 style={{ margin: '0 0 0.32rem', fontSize: '1.375rem', fontWeight: 800, lineHeight: 1.25 }}>
                    {selectedManga.name}
                  </h2>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <span style={{ padding: '0.18rem 0.65rem', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.75rem', fontWeight: 700 }}>
                      {selectedManga.type || (isRtl ? 'مانجا / مانهوا' : 'Manga / Manhwa')}
                    </span>
                    {selectedManga.rate && (
                      <span style={{ padding: '0.18rem 0.65rem', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.75rem', fontWeight: 700 }}>
                        <BxIcon name="star" className="bx-ico-lead" />{selectedManga.rate}
                      </span>
                    )}
                  </div>

                  {/* 4-Column Manga Micro-Stats Strip */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '0.35rem',
                      padding: '0.6rem 0.4rem',
                      marginBottom: '0.8rem',
                      borderRadius: '18px',
                      background: '#0d0d13',
                      border: '1px solid rgba(255,255,255,0.12)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{mangaChaptersLoading ? '…' : mangaChapters.length}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{isRtl ? 'فصل متاح' : 'Chapters'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{selectedManga.rate ? <><BxIcon name="star" className="bx-ico-lead" />{selectedManga.rate}</> : '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{isRtl ? 'التقييم' : 'Rating'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                        {selectedManga.status === 'completed'
                          ? isRtl
                            ? 'مكتمل'
                            : 'Completed'
                          : selectedManga.status === 'ongoing'
                            ? isRtl
                              ? 'مستمر'
                              : 'Ongoing'
                            : '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{isRtl ? 'الحالة' : 'Status'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{mangaActiveServer ? mangaServerLabel(mangaActiveServer).replace('BLACK X ', 'BX ') : '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{isRtl ? 'السيرفر' : 'Server'}</div>
                    </div>
                  </div>

                  {/* Servers for this title: the same list the website library modal shows */}
                  {mangaServers.length > 0 && (
                    <div style={{ marginBottom: '0.85rem', textAlign: isRtl ? 'right' : 'left' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>
                        <BxIcon name="satellite" className="bx-ico-lead" />{isRtl ? 'سيرفرات العمل ده:' : 'Servers for this title:'}
                      </div>
                      <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.15rem' }}>
                        {mangaServers.map((srv) => {
                          const active = srv.id === mangaActiveServer;
                          return (
                            <button
                              key={srv.id}
                              type="button"
                              disabled={mangaChaptersLoading}
                              onClick={() => {
                                if (!active) handleOpenManga(selectedManga, srv.id);
                              }}
                              style={{
                                padding: '0.38rem 0.8rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                background: active ? '#ffffff' : 'rgba(255,255,255,0.06)',
                                color: active ? '#000000' : '#ffffff',
                                border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.16)'
                              }}
                            >
                              {isRtl ? srv.ar : srv.en}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Synopsis Box with Audio Narrator (Matches MANGARA & Solo Leveling Description Box) */}
                  <div
                    style={{
                      textAlign: isRtl ? 'right' : 'left',
                      padding: '0.75rem 0.85rem',
                      borderRadius: '18px',
                      background: '#0d0d13',
                      border: '1px solid rgba(255,255,255,0.1)',
                      marginBottom: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                        <BxIcon name="book" className="bx-ico-lead" />{isRtl ? 'القصة' : 'Description'}
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
                          borderRadius: '999px',
                          background: ttsSpeaking ? '#ffffff' : 'rgba(255,255,255,0.12)',
                          color: ttsSpeaking ? '#000000' : '#ffffff',
                          border: '1px solid rgba(255,255,255,0.22)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {ttsSpeaking ? (isRtl ? <><BxIcon name="mute" className="bx-ico-lead" />{"إيقاف"}</> : <><BxIcon name="mute" className="bx-ico-lead" />{"Stop"}</>) : isRtl ? <><BxIcon name="volume" className="bx-ico-lead" />{"استماع"}</> : <><BxIcon name="volume" className="bx-ico-lead" />{"Listen"}</>}
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9375rem', color: 'rgba(255,255,255,0.76)', lineHeight: 1.55 }}>
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
                        fontWeight: 700,
                        fontSize: '0.9375rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 10px 28px rgba(255,255,255,0.2)',
                        cursor: 'pointer'
                      }}
                    >
                      <span><BxIcon name="book" /></span>
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
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff', marginBottom: '2px' }}>
                      <BxIcon name="flame" className="bx-ico-lead" />{isRtl ? 'أحدث فصل' : 'Latest Chapter Available'}
                    </div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                      <BxIcon name="book" className="bx-ico-lead" />{isRtl ? `الفصل ${mangaChapters[0].chapter}` : `Chapter ${mangaChapters[0].chapter}`}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '0.38rem 0.85rem',
                      borderRadius: '999px',
                      background: '#ffffff',
                      color: '#000000',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}
                  >
                    {isRtl ? <>{"اقرأ الفصل"}<BxIcon name="arrow-left" className="bx-ico-trail" /></> : <>{"Read"}<BxIcon name="arrow-right" className="bx-ico-trail" /></>}
                  </span>
                </div>
              )}

              {/* Chapter Search & Sort Controls */}
              <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', marginBottom: '0.65rem' }}>
                <input
                  type="search"
                  value={mangaChSearch}
                  onChange={(e) => setMangaChSearch(e.target.value)}
                  placeholder={isRtl ? 'ابحث برقم الفصل...' : 'Search chapter #...'}
                  style={{
                    flex: 1,
                    padding: '0.56rem 0.9rem',
                    borderRadius: '999px',
                    background: '#0d0d12',
                    border: '1px solid rgba(255,255,255,0.18)',
                    color: '#ffffff',
                    fontSize: '0.75rem',
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
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                  }}
                >
                  {mangaChAsc ? (isRtl ? <><BxIcon name="arrow-up" className="bx-ico-lead" />{"الأقدم أولاً"}</> : <><BxIcon name="arrow-up" className="bx-ico-lead" />{"Oldest"}</>) : isRtl ? <><BxIcon name="download" className="bx-ico-lead" />{"الأحدث أولاً"}</> : <><BxIcon name="download" className="bx-ico-lead" />{"Newest"}</>}
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
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.68)'
                }}
              >
                <span><BxIcon name="book" className="bx-ico-lead" />{isRtl ? `قائمة الفصول (${displayedMangaChapters.length})` : `Chapter Name (${displayedMangaChapters.length})`}</span>
                <span>{isRtl ? 'الحالة / القراءة' : 'Status'}</span>
              </div>

              {mangaChaptersLoading ? (
                <SkeletonList count={6} thumbWidth={56} thumbHeight={56} padding="0" />
              ) : mangaChapters.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '1.4rem 1rem',
                    borderRadius: '18px',
                    background: '#0c0c11',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    lineHeight: 1.6
                  }}
                >
                  <div style={{ marginBottom: '0.7rem' }}>
                    {mangaChaptersError === 'network'
                      ? isRtl
                        ? 'تعذّر الاتصال بسيرفرات BLACK X — تأكد من الإنترنت ثم أعد المحاولة.'
                        : 'Could not reach the BLACK X servers — check your connection and retry.'
                      : mangaChaptersError === 'not_found'
                        ? isRtl
                          ? 'لم نجد هذا العمل على سيرفرات BLACK X — ابحث عنه بالاسم من مكتبة المانجا.'
                          : 'This title was not found on the BLACK X servers — search for it in the library.'
                        : isRtl
                          ? 'مفيش فصول على السيرفر ده دلوقتي — جرّب سيرفر تاني من فوق.'
                          : 'No chapters on this server right now — try another server above.'}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenManga(selectedManga, mangaActiveServer)}
                    style={{
                      padding: '0.5rem 1.1rem',
                      borderRadius: '999px',
                      background: '#ffffff',
                      color: '#000000',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {isRtl ? <><BxIcon name="retry" className="bx-ico-lead" />{"إعادة المحاولة"}</> : <><BxIcon name="retry" className="bx-ico-lead" />{"Retry"}</>}
                  </button>
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
                          borderRadius: '18px',
                          background: isRead ? 'rgba(255,255,255,0.04)' : '#0c0c11',
                          border: isRead ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.12)',
                          color: '#fff',
                          textAlign: 'start',
                          fontWeight: 700,
                          fontSize: '0.8125rem',
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
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            {isRead ? <BxIcon name="check" /> : <BxIcon name="book" />}
                          </span>
                          <span>
                            {isRtl ? `الفصل ${ch.chapter}` : `Chapter ${ch.chapter}`}
                            {ch.title && !/^(?:الفصل|Chapter)\s*[\d.]+\s*$/i.test(String(ch.title).trim())
                              ? ` — ${String(ch.title).replace(/^(?:الفصل|Chapter)\s*[\d.]+\s*[-—–:]\s*/i, '')}`
                              : ''}
                          </span>
                        </span>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            background: isOffline ? '#ffffff' : 'rgba(255,255,255,0.08)',
                            color: isOffline ? '#000000' : 'rgba(255,255,255,0.78)',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}
                        >
                          {isOffline ? <><BxIcon name="download" className="bx-ico-lead" />{"بدون نت"}</> : isRead ? (isRtl ? 'مقروء' : 'Read') : isRtl ? <>{"قراءة"}<BxIcon name="chevron-right" className="bx-ico-trail bx-ico-dir" /></> : <>{"Read"}<BxIcon name="chevron-right" className="bx-ico-trail bx-ico-dir" /></>}
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
                <span><BxIcon name="search" /></span>
                <input
                  type="search"
                  value={mangaQuery}
                  onChange={(e) => setMangaQuery(e.target.value)}
                  placeholder={isRtl ? 'ابحث في سيرفرات المانجا والمانهوا (مثال: Solo Leveling)...' : 'Search the manga & manhwa servers...'}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#fff',
                    fontSize: '0.8125rem',
                    fontWeight: 700
                  }}
                />
                {mangaQuery && (
                  <button
                    type="button"
                    onClick={() => setMangaQuery('')}
                    style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9375rem', cursor: 'pointer' }}
                  >
                    <BxIcon name="close" />
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
                        fontSize: '0.75rem',
                        fontWeight: 700,
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
                    borderRadius: '18px',
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

                  {/* Top-Right Star Rating Pill */}
                  {mangaList[0].rate && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '14px',
                        padding: '0.24rem 0.62rem',
                        borderRadius: '999px',
                        background: 'rgba(10,10,15,0.82)',
                        border: '1px solid rgba(255,255,255,0.22)',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    >
                      <BxIcon name="star" className="bx-ico-lead" />{mangaList[0].rate}
                    </div>
                  )}

                  {/* Bottom Title + 50/50 Dual SlothUI Pill Buttons */}
                  <div style={{ position: 'absolute', bottom: '14px', left: '14px', right: '14px' }}>
                    <h2
                      style={{
                        margin: '0 0 0.55rem',
                        fontSize: '1.375rem',
                        fontWeight: 800,
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
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="book" className="bx-ico-lead" />{isRtl ? 'اقرأ الآن' : 'Read Now'}
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
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="info" className="bx-ico-lead" />{isRtl ? 'الفصول والقصة' : 'Chapters'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Continue Reading Progress Strip inside Manga Tab (Matches Reference UI 3 "Continue reading") */}
              {mangaHistory.length > 0 && !mangaQuery && (
                <div style={{ marginBottom: '0.95rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                      <BxIcon name="book" className="bx-ico-lead" />{isRtl ? 'كمّل قراءة' : 'Continue Reading'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
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
                          borderRadius: '18px',
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
                          style={{ width: '44px', height: '62px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {mh.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.68)', fontWeight: 600, margin: '2px 0 6px' }}>
                            {isRtl ? `الفصل ${mh.lastChapter || mh.chapter || 1}` : `Ch. ${mh.lastChapter || mh.chapter || 1}`}
                          </div>
                          <div style={{ height: '3px', borderRadius: '999px', background: 'rgba(255,255,255,0.16)', overflow: 'hidden' }}>
                            <div style={{ width: '68%', height: '100%', background: '#ffffff' }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BLACK X manga servers: the same tabs as the website library */}
              <div
                className="bx-mob-scroll"
                style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', marginBottom: '0.55rem', paddingBottom: '0.15rem' }}
              >
                {[...BX_MANGA_SERVER_TABS, ...(mangaSearchOnlyEnabled ? [BX_MANGA_SEARCH_ONLY_TAB] : [])].map((srv) => {
                  const active = mangaSource === srv.id;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => setMangaSource(srv.id)}
                      style={{
                        padding: '0.4rem 0.82rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
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
                  { id: 'ALL', ar: 'الكل', en: 'All' },
                  { id: 'MANHWA', ar: 'مانهوا كورية وصينية', en: 'Manhwa' },
                  { id: 'MANGA', ar: 'مانجا يابانية', en: 'Manga' }
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
                        fontSize: '0.75rem',
                        fontWeight: 700,
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
                <SkeletonGrid count={9} columns={3} padding="0" />
              ) : (
                <>
                  {/* Horizontal "Latest Updates" Compact Row Strip (Matches Reference UI 1 Left Screen) */}
                  {!mangaQuery && mangaList.length > 4 && (
                    <div style={{ marginBottom: '1.05rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                          <BxIcon name="zap" className="bx-ico-lead" />{isRtl ? 'مختارات من سيرفرات BLACK X' : 'Picks from the BLACK X servers'}
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
                          decoding="async"
                                style={{ width: '52px', height: '70px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
                              />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div dir="auto" style={{ fontWeight: 700, fontSize: '0.9375rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: isRtl ? 'right' : 'left' }}>
                                  {m.name}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '6px', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                                  {m.rate ? (
                                    <span style={{ color: '#ffffff', direction: 'ltr' }}>
                                      <BxIcon name="star" className="bx-ico-lead" filled />
                                      {m.rate}
                                    </span>
                                  ) : null}
                                  {m.type ? <span>{m.type}</span> : null}
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
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                flexShrink: 0
                              }}
                            >
                              <BxIcon name="book" />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {mangaList.length === 0 && (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '2rem 1rem',
                        color: 'rgba(255,255,255,0.68)',
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        lineHeight: 1.6
                      }}
                    >
                      {mangaSource === 'bx4' && !mangaQuery.trim()
                        ? isRtl
                          ? <><BxIcon name="search" className="bx-ico-lead" />{"سيرفر BLACK X 4 للبحث فقط — اكتب اسم العمل في خانة البحث."}</>
                          : <><BxIcon name="search" className="bx-ico-lead" />{"BLACK X 4 is search-only — type a title in the search box."}</>
                        : isRtl
                          ? 'مفيش نتايج على السيرفر ده دلوقتي — جرّب سيرفر تاني من فوق.'
                          : 'No results on this server right now — try another server above.'}
                    </div>
                  )}

                  {/* 3-column manga grid: cover, title, the real rating only */}
                  <div className="bx-grid bx-stagger">
                    {mangaList
                      .filter((m) => {
                        if (mangaFilterType === 'MANHWA') return String(m.type || '').includes('مانهوا');
                        if (mangaFilterType === 'MANGA') return String(m.type || '').includes('مانجا');
                        return true;
                      })
                      .map((m) => (
                        <PosterCard
                          key={m.objectID}
                          item={{ objectID: `manga-${m.objectID}`, titleEn: m.name, poster: m.poster?.large || m.poster_uri, rating: m.rate || '' }}
                          dataSaver={dataSaver}
                          onOpen={() => handleOpenManga(m)}
                        />
                      ))}
                  </div>

                  {mangaList.length > 0 && !mangaQuery.trim() && mangaSource !== 'bx4' && (
                    <button
                      type="button"
                      onClick={handleLoadMoreManga}
                      disabled={loadingMoreManga}
                      style={{
                        width: '100%',
                        marginTop: '1.1rem',
                        padding: '0.85rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.25)',
                        background: '#ffffff',
                        color: '#000000',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        cursor: 'pointer'
                      }}
                    >
                      {loadingMoreManga
                        ? isRtl
                          ? <><BxIcon name="loader" className="bx-ico-lead" />{"بيحمّل..."}</>
                          : <><BxIcon name="loader" className="bx-ico-lead" />{"Loading more..."}</>
                        : isRtl
                        ? <><BxIcon name="plus" className="bx-ico-lead" />{"عرض المزيد من مكتبة المانجا والمانهوا (صفحة "}{mangaPage + 1}{")"}</>
                        : <><BxIcon name="plus" className="bx-ico-lead" />{"Load More Manga & Manhwa (Page "}{mangaPage + 1}{")"}</>}
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </main>
      )}

      {/* ==================== TAB 4: COMMUNITY (one feed, shared with the website) ==================== */}
      {activeTab === 'community' && !selectedAnime && (
        <main className={pageCls} style={{ padding: '0.25rem 1rem 1rem' }}>
          {user ? (
            <form onSubmit={handlePublishPost} className="bx-composer">
              <div className="bx-composer-row">
                <span className="bx-post-avatar" aria-hidden="true">
                  {(user.displayName?.[0] || user.username?.[0] || 'X').toUpperCase()}
                </span>
                <textarea
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  placeholder={isRtl ? 'شارك رأيك أو نظريتك...' : 'Share your thoughts...'}
                  rows={2}
                  maxLength={600}
                  dir="auto"
                  aria-label={isRtl ? 'اكتب بوست' : 'Write a post'}
                />
              </div>
              <div className="bx-composer-foot">
                <div className="bx-composer-cats">
                  {POST_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`bx-chip bx-chip-sm${postCategory === cat.id ? ' is-active' : ''}`}
                      aria-pressed={postCategory === cat.id}
                      onClick={() => setPostCategory(cat.id)}
                    >
                      {isRtl ? cat.ar : cat.en}
                    </button>
                  ))}
                </div>
                <button type="submit" className="bx-btn bx-btn-primary bx-btn-sm" disabled={!newPostText.trim()}>
                  {isRtl ? 'نشر' : 'Post'}
                </button>
              </div>
            </form>
          ) : (
            <div className="bx-signin-card">
              <span className="bx-signin-ico" aria-hidden="true">
                <BxIcon name="message" />
              </span>
              <div className="bx-signin-copy">
                <strong>{isRtl ? 'سجّل دخولك عشان تكتب وتعمل لايك' : 'Sign in to post and like'}</strong>
                <span>{isRtl ? 'تقدر تقرا البوستات من غير حساب.' : 'You can read posts without an account.'}</span>
              </div>
              <button type="button" className="bx-btn bx-btn-primary bx-btn-sm" onClick={() => goToTab('profile')}>
                {isRtl ? 'دخول' : 'Sign in'}
              </button>
            </div>
          )}

          {communityPosts.length === 0 ? (
            <div className="bx-empty">
              <BxIcon name="message" size="2rem" />
              <p>{isRtl ? 'لسه مفيش بوستات. اكتب أول بوست!' : 'No posts yet. Write the first one!'}</p>
            </div>
          ) : (
            <div className="bx-feed bx-stagger">
              {communityPosts.map((p) => {
                const isBlurred = p.isSpoiler && !revealedSpoilers[p.id];
                const liked = Boolean(myPostKey && Array.isArray(p.likedBy) && p.likedBy.includes(myPostKey));
                const likes = Math.max(0, Number(p.likes) || 0);
                const replies = Array.isArray(p.replies) ? p.replies : [];
                const cat = POST_CATEGORIES.find((c) => c.id === p.category);
                return (
                  <article key={p.id} className="bx-post">
                    <header className="bx-post-head">
                      <span className="bx-post-avatar" aria-hidden="true">
                        {(p.author?.[0] || 'X').toUpperCase()}
                      </span>
                      <div className="bx-post-who">
                        <span className="bx-post-author" dir="auto">
                          {p.author}
                        </span>
                        {p.role === 'developer' && <span className="bx-post-role">{isRtl ? 'المطور' : 'Developer'}</span>}
                      </div>
                      <span className="bx-post-time">{postTimeLabel(p, lang)}</span>
                    </header>
                    {cat && cat.id !== 'discussion' && <span className="bx-post-cat">{isRtl ? cat.ar : cat.en}</span>}
                    {isBlurred ? (
                      <button
                        type="button"
                        className="bx-spoiler-btn"
                        onClick={() => setRevealedSpoilers((prev) => ({ ...prev, [p.id]: true }))}
                      >
                        <BxIcon name="eye-off" />
                        {isRtl ? 'فيه حرق — اضغط عشان تشوفه' : 'Spoiler — tap to reveal'}
                      </button>
                    ) : (
                      <p className="bx-post-text" dir="auto">
                        {p.text}
                      </p>
                    )}
                    <footer className="bx-post-actions">
                      <button
                        type="button"
                        className={`bx-post-act${liked ? ' is-on' : ''}`}
                        aria-pressed={liked}
                        aria-label={isRtl ? 'لايك' : 'Like'}
                        onClick={() => handleLikePost(p.id)}
                      >
                        <BxIcon name="heart" filled={liked} />
                        {likes > 0 ? likes : ''}
                      </button>
                      <button
                        type="button"
                        className="bx-post-act"
                        aria-label={isRtl ? 'رد' : 'Reply'}
                        onClick={() => {
                          if (!user) {
                            showToast(isRtl ? 'سجّل دخولك الأول عشان ترد' : 'Sign in to reply', 'user');
                            return;
                          }
                          setReplyingToPostId((cur) => (cur === p.id ? null : p.id));
                        }}
                      >
                        <BxIcon name="message" />
                        {replies.length > 0 ? replies.length : ''}
                      </button>
                    </footer>

                    {replies.length > 0 && (
                      <div className="bx-replies">
                        {replies.map((r) => (
                          <div key={r.id} className="bx-reply">
                            <strong dir="auto">{r.author}</strong>
                            <span dir="auto">{r.text}</span>
                            <time>{postTimeLabel(r, lang)}</time>
                          </div>
                        ))}
                      </div>
                    )}

                    {replyingToPostId === p.id && user && (
                      <div className="bx-reply-box">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={isRtl ? 'اكتب ردك...' : 'Write a reply...'}
                          maxLength={300}
                          dir="auto"
                        />
                        <button type="button" className="bx-btn bx-btn-primary bx-btn-sm" disabled={!replyText.trim()} onClick={() => handleAddPostReply(p.id)}>
                          {isRtl ? 'إرسال' : 'Send'}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* ==================== TAB 5: v12.0 SLOTH-UI & APPLE-AIRLINE LUXURY MONOCHROME PROFILE STUDIO ==================== */}
      {activeTab === 'profile' && !selectedAnime && (
        <main className={pageCls} style={{ padding: '0.85rem 1rem 1.5rem' }}>
          {user && !sessionToken && (
            <div className="bx-update-card bx-pop" style={{ margin: '0 0 0.85rem' }} role="note">
              <div className="bx-update-head">
                <span className="bx-update-ico">
                  <BxIcon name="shield-check" size="1.05em" strokeWidth={2.4} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bx-update-title">{isRtl ? 'سجّل الدخول تاني مرة واحدة' : 'Sign in once more'}</div>
                  <div className="bx-update-sub">
                    {isRtl
                      ? 'تسجيل الدخول بقى عن طريق سيرفر الموقع عشان أمان حسابك. بياناتك على الموبايل محفوظة وهتتزامن بعد الدخول.'
                      : 'Sign-in now goes through the website server for your account security. Your data on this phone is kept and syncs after signing in.'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="bx-update-cta"
                style={{ marginTop: '0.7rem' }}
                onClick={() => {
                  setUser(null);
                  localStorage.removeItem('bx_mob_user');
                  setProfileSubTab('account');
                }}
              >
                <BxIcon name="user" className="bx-ico-lead" />
                {isRtl ? 'سجّل الدخول' : 'Sign in'}
              </button>
            </div>
          )}
          {/* Profile header: the guest sees the sign-in card first; members get a compact header */}
          {user ? (
            <section className="bx-profile-head">
              <span className="bx-profile-avatar">
                {avatarPhoto ? (
                  <img src={avatarPhoto} alt="" referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} />
                ) : (
                  (user.displayName?.[0] || user.username?.[0] || 'X').toUpperCase()
                )}
              </span>
              <div className="bx-profile-id">
                <h2 dir="auto">{user.displayName || user.username}</h2>
                <div className="bx-profile-sub">
                  {user.username ? <span dir="ltr">@{user.username}</span> : null}
                  {(userVipTier !== 'free' || isDeveloper) && (
                    <span className="bx-vip-tag">
                      <BxIcon name="crown" size="0.95em" />
                      {isDeveloper ? (isRtl ? 'المطور' : 'Developer') : 'VIP'}
                    </span>
                  )}
                </div>
              </div>
              <div className="bx-profile-stats">
                <button type="button" onClick={() => { setProfileSubTab('vault'); setLibrarySubTab('favorites'); }}>
                  <strong>{favorites.length}</strong>
                  <span>{isRtl ? 'في قائمتي' : 'My list'}</span>
                </button>
                <button type="button" onClick={() => { setProfileSubTab('vault'); setLibrarySubTab('history'); }}>
                  <strong>{watchHistory.length}</strong>
                  <span>{isRtl ? 'اتفرجت عليه' : 'Watched'}</span>
                </button>
                <div>
                  <strong>{userXp}</strong>
                  <span>XP</span>
                </div>
              </div>
              <div className="bx-profile-actions">
                <button
                  type="button"
                  className="bx-btn bx-btn-ghost bx-btn-sm"
                  onClick={() => {
                    setEditDisplayName(user.displayName || '');
                    setEditBio(user.bio || '');
                    setEditPhotoUrl(user.photoUrl || '');
                    setProfileSubTab('account');
                    setEditingProfile((v) => !v);
                  }}
                >
                  <BxIcon name="pencil" />
                  {isRtl ? 'تعديل' : 'Edit'}
                </button>
                <button type="button" className="bx-btn bx-btn-ghost bx-btn-sm" onClick={handleManualSync}>
                  <BxIcon name="refresh" />
                  {isRtl ? 'مزامنة' : 'Sync'}
                </button>
                <button
                  type="button"
                  className="bx-icon-btn bx-icon-btn-sm"
                  aria-label={isRtl ? 'تسجيل الخروج' : 'Sign out'}
                  onClick={() => {
                    apkSignOut();
                    setSessionToken(null);
                    setUser(null);
                    localStorage.removeItem('bx_mob_user');
                    showToast(isRtl ? 'اتسجّل الخروج' : 'Signed out');
                  }}
                >
                  <BxIcon name="logout" />
                </button>
              </div>
            </section>
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
              <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800 }}>
                <BxIcon name="lock" className="bx-ico-lead" />{isRtl ? 'سجّل دخولك' : 'Sign in'}
              </h2>
              <p style={{ margin: 0, fontSize: '0.9375rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                {isRtl
                  ? 'ادخل بحساب Google أو حسابك على موقع BLACK X، وقائمتك وسجل مشاهدتك هيتزامنوا بين الموبايل والموقع.'
                  : 'Use Google or your BLACK X website account to sync your list and history.'}
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
                  borderRadius: '12px',
                  background: '#ffffff',
                  color: '#000000',
                  border: '1.5px solid #ffffff',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
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
                      ? <><BxIcon name="loader" className="bx-ico-lead" />{"بيفتح حسابات Google..."}</>
                      : <><BxIcon name="loader" className="bx-ico-lead" />{"Opening Phone Google Accounts..."}</>
                    : isRtl
                    ? 'الدخول بحساب Google'
                    : 'Sign in with Phone Google Accounts'}
                </span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.15rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.12)' }} />
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                  {isRtl ? 'أو باسم المستخدم' : 'or with a username'}
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
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
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
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
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
                  placeholder={isRtl ? 'الاسم اللي هيظهر' : 'Display Name'}
                  style={{
                    padding: '0.7rem 0.9rem',
                    borderRadius: '12px',
                    background: '#050507',
                    border: '1px solid rgba(255,255,255,0.18)',
                    color: '#fff',
                    fontSize: '0.8125rem'
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
                  borderRadius: '12px',
                  background: '#050507',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: '#fff',
                  fontSize: '0.8125rem'
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
                    borderRadius: '12px',
                    background: '#050507',
                    border: '1px solid rgba(255,255,255,0.18)',
                    color: '#fff',
                    fontSize: '0.8125rem'
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
                  borderRadius: '12px',
                  background: '#050507',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: '#fff',
                  fontSize: '0.8125rem'
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
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  cursor: 'pointer'
                }}
              >
                {authBusy
                  ? isRtl
                    ? <><BxIcon name="loader" className="bx-ico-lead" />{"بيدخّلك..."}</>
                    : <><BxIcon name="loader" className="bx-ico-lead" />{"Connecting..."}</>
                  : authMode === 'login'
                  ? isRtl
                    ? 'دخول'
                    : 'Sign In & Sync'
                  : isRtl
                  ? 'إنشاء الحساب ومزامنته'
                  : 'Create Synced Account'}
              </button>
            </form>
          )}

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
              { id: 'account', ar: 'الحساب', en: 'Account' },
              { id: 'vault', ar: 'مكتبتي', en: 'Library' },
              { id: 'appearance', ar: 'الإعدادات', en: 'Settings' },
              ...(isDeveloper
                ? [{ id: 'developer', ar: `المطور (${cloudUserRequests.length})`, en: 'Dev' }]
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
                    fontWeight: 700,
                    fontSize: '0.75rem',
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
                  borderRadius: '18px',
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
                        borderRadius: '12px',
                        background: '#000',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: '0.8125rem'
                      }}
                    />
                    <input
                      type="text"
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder={isRtl ? 'نبذة عنك...' : 'Your Otaku Bio...'}
                      style={{
                        padding: '0.6rem 0.8rem',
                        borderRadius: '12px',
                        background: '#000',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: '0.8125rem'
                      }}
                    />
                    <input
                      type="url"
                      value={editPhotoUrl}
                      onChange={(e) => setEditPhotoUrl(e.target.value)}
                      placeholder={isRtl ? 'لينك الصورة...' : 'Avatar Image URL...'}
                      style={{
                        padding: '0.6rem 0.8rem',
                        borderRadius: '12px',
                        background: '#000',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: '0.8125rem'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '0.65rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: '#ffffff',
                        color: '#000000',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        cursor: 'pointer'
                      }}
                    >
                      <BxIcon name="check" className="bx-ico-lead" />{isRtl ? 'حفظ التعديلات ومزامنتها' : 'Save & Sync Profile'}
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
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                      <BxIcon name="crown" className="bx-ico-lead" />{isRtl ? 'لوحة المطور' : 'Developer Command Center'}
                    </div>
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                        background: '#ffffff',
                        color: '#000000',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    >
                      DEV v8.0
                    </span>
                  </div>

                  {/* Developer Live Platform Telemetry Strip */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem', marginBottom: '0.75rem' }}>
                    <div style={{ padding: '0.45rem 0.25rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{cloudVipCodes.length}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>أكواد نشطة</div>
                    </div>
                    <div style={{ padding: '0.45rem 0.25rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{cloudUserRequests.length}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>طلبات الأعضاء</div>
                    </div>
                    <div style={{ padding: '0.45rem 0.25rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{globalVipEnforced ? <><BxIcon name="lock" className="bx-ico-lead" />{"مفعل"}</> : <><BxIcon name="unlock" className="bx-ico-lead" />{"مفتوح"}</>}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>بوابة VIP</div>
                    </div>
                    <div style={{ padding: '0.45rem 0.25rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{globalBroadcastMsg ? <><BxIcon name="dot" className="bx-ico-lead" />{"مباشر"}</> : <><BxIcon name="circle-dashed" className="bx-ico-lead" />{"صامت"}</>}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>البث العام</div>
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
                      { id: 'vip', label: 'الأكواد والـ VIP' },
                      { id: 'users', label: 'كشاف وترقية الأعضاء' },
                      { id: 'broadcast', label: 'البث والترشيح' },
                      { id: 'requests', label: `الطلبات (${cloudUserRequests.length})` }
                    ].map((dt) => (
                      <button
                        key={dt.id}
                        type="button"
                        onClick={() => setDevSubTab(dt.id)}
                        style={{
                          flex: 1,
                          padding: '0.45rem 0.65rem',
                          borderRadius: '8px',
                          background: devSubTab === dt.id ? '#ffffff' : 'transparent',
                          color: devSubTab === dt.id ? '#000000' : 'rgba(255,255,255,0.75)',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '0.75rem',
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
                      borderRadius: '12px',
                      background: globalVipEnforced ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                      border: globalVipEnforced ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                      marginBottom: '0.9rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                        {isRtl ? 'حالة فرض اشتراك VIP على كل النسخ:' : 'Global VIP Gate Status:'}
                      </span>
                      <span
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '8px',
                          background: globalVipEnforced ? '#ffffff' : 'rgba(255,255,255,0.12)',
                          color: globalVipEnforced ? '#000000' : '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      >
                        {globalVipEnforced
                          ? isRtl
                            ? <><BxIcon name="lock" className="bx-ico-lead" />{"مفعل ومفروض على الجميع"}</>
                            : <><BxIcon name="lock" className="bx-ico-lead" />{"ENFORCED ON ALL USERS"}</>
                          : isRtl
                          ? <><BxIcon name="unlock" className="bx-ico-lead" />{"ملغي (مجاني للجميع)"}</>
                          : <><BxIcon name="unlock" className="bx-ico-lead" />{"UNLOCKED FOR ALL"}</>}
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
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        cursor: 'pointer'
                      }}
                    >
                      {devToggleBusy
                        ? isRtl
                          ? <><BxIcon name="loader" className="bx-ico-lead" />{"جاري تعميم الأمر على جميع النسخ..."}</>
                          : <><BxIcon name="loader" className="bx-ico-lead" />{"Syncing across all instances..."}</>
                        : globalVipEnforced
                        ? isRtl
                          ? <><BxIcon name="unlock" className="bx-ico-lead" />{"اضغط لإلغاء فرض الـ VIP وفتح التطبيق مجاناً لكل المستخدمين"}</>
                          : <><BxIcon name="unlock" className="bx-ico-lead" />{"Disable Global VIP Enforcement (Unlock for All)"}</>
                        : isRtl
                        ? <><BxIcon name="lock" className="bx-ico-lead" />{"اضغط لتفعيل وفرض خطط الـ VIP على جميع المستخدمين فوراً"}</>
                        : <><BxIcon name="lock" className="bx-ico-lead" />{"Enable Global VIP Enforcement on All Users"}</>}
                    </button>
                  </div>

                  {/* Cloud VIP Code Generator inside APK */}
                  <div style={{ display: devSubTab === 'vip' ? 'block' : 'none', borderTop: '1px solid rgba(255,255,255,0.14)', paddingTop: '0.8rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                      <BxIcon name="key" className="bx-ico-lead" />{isRtl ? 'توليد أكواد تفعيل VIP سحابية فورية (تعمل في الموقع والتطبيق):' : 'Generate Cloud VIP Activation Codes:'}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                      <select
                        value={devGenTier}
                        onChange={(e) => setDevGenTier(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          borderRadius: '12px',
                          background: '#000',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.22)',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      >
                        <option value="vip_monarch">باقة الملك (199 ج.م)</option>
                        <option value="vip_basic">الباقة الأساسية (99 ج.م)</option>
                      </select>
                      <select
                        value={devGenDays}
                        onChange={(e) => setDevGenDays(Number(e.target.value))}
                        style={{
                          width: '110px',
                          padding: '0.5rem',
                          borderRadius: '12px',
                          background: '#000',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.22)',
                          fontSize: '0.75rem',
                          fontWeight: 700
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
                        borderRadius: '12px',
                        border: 'none',
                        background: '#ffffff',
                        color: '#000000',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        cursor: 'pointer'
                      }}
                    >
                      {devGenBusy ? <><BxIcon name="loader" className="bx-ico-lead" />{"بيولّد..."}</> : <><BxIcon name="zap" className="bx-ico-lead" />{"توليد كود VIP جديد وحفظه بالسحابة"}</>}
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
                              fontSize: '0.75rem'
                            }}
                          >
                            <span
                              onClick={() => {
                                navigator.clipboard?.writeText(c.code);
                                showToast(`اتنسخ الكود: ${c.code}`, 'check');
                              }}
                              style={{ fontFamily: 'monospace', fontWeight: 700, cursor: 'pointer', flex: 1 }}
                            >
                              {c.code}
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.65)', marginLeft: '0.4rem', marginRight: '0.4rem' }}>
                              {(c.tier || c.planId) === 'vip_monarch' ? <><BxIcon name="crown" className="bx-ico-lead" />{"الملك"}</> : <><BxIcon name="zap" className="bx-ico-lead" />{"أساسية"}</>} ({c.usedCount || 0}/{c.maxUses || 1})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDevDeleteVipCode(c.code)}
                              style={{
                                background: 'rgba(255,255,255,0.12)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#fff',
                                borderRadius: '8px',
                                padding: '0.18rem 0.45rem',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              <BxIcon name="trash" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Developer Global Push Broadcast Transmitter */}
                  <div style={{ display: devSubTab === 'broadcast' ? 'block' : 'none', paddingTop: '0.2rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.45rem' }}>
                      <BxIcon name="megaphone" className="bx-ico-lead" />{isRtl ? 'بث إشعار عام فوري لجميع الهواتف والموقع:' : 'Global Real-Time Push Broadcast Banner:'}
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
                        borderRadius: '12px',
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
                        disabled={devBroadcastBusy}
                        onClick={() => handleDevSendBroadcast(false)}
                        style={{
                          flex: 1,
                          padding: '0.62rem',
                          borderRadius: '12px',
                          border: 'none',
                          background: '#ffffff',
                          color: '#000000',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        {devBroadcastBusy ? <><BxIcon name="loader" />{"..."}</> : isRtl ? <><BxIcon name="megaphone" className="bx-ico-lead" />{"بث الإشعار للجميع"}</> : <><BxIcon name="megaphone" className="bx-ico-lead" />{"Broadcast Now"}</>}
                      </button>
                      {globalBroadcastMsg && (
                        <button
                          type="button"
                          disabled={devBroadcastBusy}
                          onClick={() => handleDevSendBroadcast(true)}
                          style={{
                            padding: '0.62rem 0.85rem',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.25)',
                            background: 'rgba(255,255,255,0.08)',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          <BxIcon name="trash" className="bx-ico-lead" />{isRtl ? 'إخفاء' : 'Clear'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Developer Direct User VIP Upgrade (Upgrade any username or email without code) */}
                  <div style={{ display: devSubTab === 'users' ? 'block' : 'none', paddingTop: '0.2rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.45rem' }}>
                      <BxIcon name="crown" className="bx-ico-lead" />{isRtl ? 'ترقية أي مستخدم مباشرة إلى VIP (بدون كود):' : 'Direct User VIP Grant (No Code Needed):'}
                    </div>
                    <input
                      type="text"
                      value={devGrantTarget}
                      onChange={(e) => setDevGrantTarget(e.target.value)}
                      placeholder={isRtl ? 'اكتب اسم المستخدم أو البريد الإلكتروني للعضو...' : 'Username or Email...'}
                      style={{
                        width: '100%',
                        padding: '0.58rem 0.75rem',
                        borderRadius: '12px',
                        background: '#000',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.22)',
                        fontSize: '0.75rem',
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
                          borderRadius: '12px',
                          background: '#000',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.22)',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      >
                        <option value="vip_monarch">باقة الملك</option>
                        <option value="vip_basic">الباقة الأساسية</option>
                      </select>
                      <select
                        value={devGrantDays}
                        onChange={(e) => setDevGrantDays(Number(e.target.value))}
                        style={{
                          width: '110px',
                          padding: '0.48rem',
                          borderRadius: '12px',
                          background: '#000',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.22)',
                          fontSize: '0.75rem',
                          fontWeight: 700
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
                          borderRadius: '12px',
                          border: 'none',
                          background: '#ffffff',
                          color: '#000000',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        {devGrantBusy
                          ? <><BxIcon name="loader" />{"..."}</>
                          : isRtl
                          ? <><BxIcon name="crown" className="bx-ico-lead" />{"ترقية حساب العضو فوراً"}</>
                          : <><BxIcon name="crown" className="bx-ico-lead" />{"Grant VIP Now"}</>}
                      </button>
                      <button
                        type="button"
                        disabled={devGrantBusy}
                        onClick={handleDevRevokeUserVip}
                        style={{
                          padding: '0.65rem 0.75rem',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.28)',
                          background: 'rgba(255,255,255,0.08)',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <BxIcon name="ban" className="bx-ico-lead" />{isRtl ? 'سحب VIP' : 'Revoke'}
                      </button>
                    </div>
                  </div>

                  {/* Developer Live Cloud User Inspector (كشاف المستخدمين السحابي المباشر) */}
                  <div style={{ display: devSubTab === 'users' ? 'block' : 'none', borderTop: '1px solid rgba(255,255,255,0.14)', paddingTop: '0.8rem', marginTop: '0.8rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.45rem' }}>
                      <BxIcon name="users" className="bx-ico-lead" />{isRtl ? 'بحث في حسابات المستخدمين:' : 'Live Cloud User Inspector:'}
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
                          borderRadius: '12px',
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
                          borderRadius: '12px',
                          background: '#ffffff',
                          color: '#000000',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        {devInspectBusy ? <BxIcon name="loader" /> : isRtl ? <><BxIcon name="search" className="bx-ico-lead" />{"فحص"}</> : <><BxIcon name="search" className="bx-ico-lead" />{"Inspect"}</>}
                      </button>
                    </div>

                    {devInspectedUser && (
                      <div
                        style={{
                          padding: '0.7rem',
                          borderRadius: '12px',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          fontSize: '0.9375rem',
                          lineHeight: 1.6
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                          <BxIcon name="user" className="bx-ico-lead" />{devInspectedUser.displayName || devInspectedUser.username} (@{devInspectedUser.username})
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.72)' }}><BxIcon name="mail" className="bx-ico-lead" />{devInspectedUser.email || '—'}</div>
                        <div>
                          <BxIcon name="gem" className="bx-ico-lead" />الحالة: <strong>{devInspectedUser.vipStatus || 'Free Tier'}</strong> • <BxIcon name="heart" className="bx-ico-lead" />المفضلة:{' '}
                          {devInspectedUser.stats?.favorites ?? 0} • <BxIcon name="film" className="bx-ico-lead" />السجل: {devInspectedUser.stats?.history ?? 0}
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
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            <BxIcon name="crown" className="bx-ico-lead" />تحديد للترقية
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
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            <BxIcon name="close" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Developer Global Featured Spotlight Pin (تثبيت ترشيح المطور الرسمي) */}
                  <div style={{ display: devSubTab === 'broadcast' ? 'block' : 'none', borderTop: '1px solid rgba(255,255,255,0.14)', paddingTop: '0.8rem', marginTop: '0.8rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.45rem' }}>
                      <BxIcon name="pin" className="bx-ico-lead" />{isRtl ? 'تثبيت أنمي اليوم كترشيح رسمي أعلى الصفحة الرئيسية:' : 'Pin Official Developer Spotlight on Home:'}
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
                        borderRadius: '12px',
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
                      placeholder={isRtl ? 'رسالة الترشيح (مثال: عمل أسطوري ننصح بمشاهدته الليلة!)...' : 'Recommendation note...'}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '12px',
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
                          borderRadius: '12px',
                          background: '#ffffff',
                          color: '#000000',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        {devPinBusy ? <><BxIcon name="loader" />{"..."}</> : isRtl ? <><BxIcon name="pin" className="bx-ico-lead" />{"تثبيت في الرئيسية للجميع"}</> : <><BxIcon name="pin" className="bx-ico-lead" />{"Pin on Home"}</>}
                      </button>
                      {globalPinnedRec && (
                        <button
                          type="button"
                          disabled={devPinBusy}
                          onClick={() => handleDevPinRecommendation(true)}
                          style={{
                            padding: '0.62rem 0.8rem',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.08)',
                            color: '#ffffff',
                            border: '1px solid rgba(255,255,255,0.25)',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          <BxIcon name="trash" className="bx-ico-lead" />{isRtl ? 'إزالة' : 'Unpin'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Developer User Requests & Ticket Center (صندوق طلبات الأعضاء المباشر للمطور) */}
                  {devSubTab === 'requests' && (
                    <div style={{ paddingTop: '0.2rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                        <BxIcon name="mail" className="bx-ico-lead" />{isRtl ? `طلبات الأعضاء المباشرة (${cloudUserRequests.length}):` : `User Requests (${cloudUserRequests.length}):`}
                      </div>
                      {cloudUserRequests.length === 0 ? (
                        <div style={{ padding: '1.2rem', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>
                          {isRtl ? 'مفيش طلبات جديدة.' : 'No pending user requests.'}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '240px', overflowY: 'auto' }}>
                          {cloudUserRequests.map((req) => (
                            <div
                              key={req.id}
                              style={{
                                padding: '0.65rem',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.16)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
                                  {req.type === 'anime' ? <><BxIcon name="film" className="bx-ico-lead" />{"طلب أنمي"}</> : req.type === 'manga' ? <><BxIcon name="book" className="bx-ico-lead" />{"طلب مانهوا"}</> : <><BxIcon name="wrench" className="bx-ico-lead" />{"بلاغ/دعم"}</>} •<BxIcon name="user" className="bx-ico-trail" /> {req.author}
                                </div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '0.15rem' }}>{req.text}</div>
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
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  flexShrink: 0
                                }}
                              >
                                <BxIcon name="check" className="bx-ico-lead" />إنجاز
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
          ) : null}

          {/* VIP Subscription Status & Code Redemption Box inside Profile */}
          <div
            style={{
              display: profileSubTab === 'account' ? 'block' : 'none',
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: '18px',
              background: '#0a0a0e',
              border: '1px solid rgba(255,255,255,0.16)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                <BxIcon name="gem" className="bx-ico-lead" />{isRtl ? 'اشتراكك في VIP:' : 'Your BLACK X VIP Status:'}
              </span>
              <span
                style={{
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  background: userVipTier !== 'free' ? '#ffffff' : 'rgba(255,255,255,0.1)',
                  color: userVipTier !== 'free' ? '#000000' : '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                {isDeveloper
                  ? <><BxIcon name="crown" className="bx-ico-lead" />{"المطور"}</>
                  : userVipTier === 'vip_monarch'
                  ? <><BxIcon name="crown" className="bx-ico-lead" />{"باقة الملك"}</>
                  : userVipTier === 'vip_basic'
                  ? <><BxIcon name="zap" className="bx-ico-lead" />{"الباقة الأساسية"}</>
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
                  borderRadius: '12px',
                  background: '#050507',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace'
                }}
              />
              <button
                type="submit"
                disabled={vipRedeemBusy}
                style={{
                  padding: '0 0.95rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#ffffff',
                  color: '#000000',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                {vipRedeemBusy ? <BxIcon name="loader" /> : isRtl ? 'تفعيل' : 'Activate'}
              </button>
            </form>
          </div>

          {/* Direct User Request Box to Developer (صندوق طلبات الأنمي والمانهوا المباشر للمطور) */}
          <div
            style={{
              display: profileSubTab === 'account' ? 'block' : 'none',
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: '18px',
              background: '#0a0a0e',
              border: '1px solid rgba(255,255,255,0.16)'
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.35rem' }}>
              <BxIcon name="mail" className="bx-ico-lead" />{isRtl ? 'اطلب أنمي أو مانهوا' : 'Request an anime or manga'}
            </div>
            <form onSubmit={handleSubmitUserRequest} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {[
                  { id: 'anime', label: 'طلب أنمي' },
                  { id: 'manga', label: 'طلب مانهوا' },
                  { id: 'issue', label: 'بلاغ أو استفسار' }
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
                      fontWeight: 700,
                      fontSize: '0.75rem',
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
                    borderRadius: '12px',
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
                    borderRadius: '12px',
                    background: '#ffffff',
                    color: '#000000',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  {userRequestBusy ? <BxIcon name="loader" /> : isRtl ? 'إرسال' : 'Send'}
                </button>
              </div>
            </form>
          </div>

          {/* v16: experience settings (data saver, haptics, splash sound) */}
          <div
            style={{
              display: profileSubTab === 'appearance' ? 'block' : 'none',
              marginBottom: '0.75rem',
              padding: '1rem',
              borderRadius: '18px',
              background: '#0a0a0e',
              border: '1px solid rgba(255,255,255,0.16)'
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: '0.6rem' }}>
              {isRtl ? 'التطبيق' : 'App'}
            </div>
            <div className="bx-setting-row">
              <div style={{ minWidth: 0 }}>
                <div className="bx-setting-title">
                  <BxIcon name="globe" className="bx-ico-lead" />
                  {isRtl ? 'اللغة' : 'Language'}
                </div>
                <div className="bx-setting-sub">{isRtl ? 'لغة القوائم والأزرار' : 'Menus and buttons'}</div>
              </div>
              <div className="bx-seg" role="radiogroup" aria-label={isRtl ? 'اللغة' : 'Language'}>
                {[
                  ['ar', 'عربي'],
                  ['en', 'English']
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={lang === id}
                    className={lang === id ? 'is-on' : ''}
                    onClick={() => changeLanguage(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="bx-setting-row">
              <div style={{ minWidth: 0 }}>
                <div className="bx-setting-title">
                  <BxIcon name="gauge" className="bx-ico-lead" />
                  {isRtl ? 'توفير البيانات' : 'Data saver'}
                </div>
                <div className="bx-setting-sub">
                  {isRtl
                    ? `صور أصغر وجودة أقل للبث${dataSaver ? ' • شغال دلوقتي' : ''}`
                    : `Smaller images and lower stream quality${dataSaver ? ' • active now' : ''}`}
                </div>
              </div>
              <div className="bx-seg" role="radiogroup" aria-label={isRtl ? 'توفير البيانات' : 'Data saver'}>
                {[
                  ['auto', isRtl ? 'تلقائي' : 'Auto'],
                  ['on', isRtl ? 'شغال' : 'On'],
                  ['off', isRtl ? 'مقفول' : 'Off']
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={dataSaverPref === id}
                    className={dataSaverPref === id ? 'is-on' : ''}
                    onClick={() => {
                      haptic('select');
                      setDataSaverPref(id);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="bx-setting-row">
              <div style={{ minWidth: 0 }}>
                <div className="bx-setting-title">
                  <BxIcon name="smartphone" className="bx-ico-lead" />
                  {isRtl ? 'اهتزاز خفيف مع اللمس' : 'Haptic feedback'}
                </div>
                <div className="bx-setting-sub">{isRtl ? 'مع التنقل والتشغيل والمفضلة' : 'On navigation, play and favorites'}</div>
              </div>
              <div className="bx-seg" role="radiogroup" aria-label={isRtl ? 'الاهتزاز' : 'Haptics'}>
                {[
                  [true, isRtl ? 'شغال' : 'On'],
                  [false, isRtl ? 'مقفول' : 'Off']
                ].map(([on, label]) => (
                  <button
                    key={String(on)}
                    type="button"
                    role="radio"
                    aria-checked={hapticsOn === on}
                    className={hapticsOn === on ? 'is-on' : ''}
                    onClick={() => {
                      setHapticsEnabled(on);
                      setHapticsOn(on);
                      haptic('select');
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="bx-setting-row">
              <div style={{ minWidth: 0 }}>
                <div className="bx-setting-title">
                  <BxIcon name="volume" className="bx-ico-lead" />
                  {isRtl ? 'صوت شاشة البداية' : 'Splash sound'}
                </div>
                <div className="bx-setting-sub">{isRtl ? 'مقفول من الأول' : 'Off by default'}</div>
              </div>
              <div className="bx-seg" role="radiogroup" aria-label={isRtl ? 'صوت البداية' : 'Splash sound'}>
                {[
                  [true, isRtl ? 'شغال' : 'On'],
                  [false, isRtl ? 'مقفول' : 'Off']
                ].map(([on, label]) => (
                  <button
                    key={String(on)}
                    type="button"
                    role="radio"
                    aria-checked={splashSoundOn === on}
                    className={splashSoundOn === on ? 'is-on' : ''}
                    onClick={() => {
                      localStorage.setItem(SPLASH_SOUND_KEY, on ? 'on' : 'off');
                      setSplashSoundOn(on);
                      haptic('select');
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Internal Splash Screen Motion Graphics Selector (من الداخل فقط) */}
          <div
            style={{
              display: profileSubTab === 'appearance' ? 'block' : 'none',
              marginTop: '0.2rem',
              padding: '1rem',
              borderRadius: '18px',
              background: '#0a0a0e',
              border: '1px solid rgba(255,255,255,0.16)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                <BxIcon name="film" className="bx-ico-lead" />{isRtl ? 'شاشة البداية' : 'Splash screen'}
              </span>
              <button
                type="button"
                onClick={() => window.triggerBlackXMotion?.(motionPref === 'random' ? undefined : motionPref, 4000)}
                style={{
                  padding: '0.28rem 0.7rem',
                  borderRadius: '999px',
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                <BxIcon name="play" className="bx-ico-lead" />{isRtl ? 'معاينة الآن' : 'Preview'}
              </button>
            </div>
            <p style={{ margin: '0 0 0.65rem', fontSize: '0.9375rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.45 }}>
              {isRtl
                ? 'اختار الحركة اللي تظهر لما التطبيق يفتح:'
                : 'Choose the animation shown when the app opens:'}
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
                          ? `شاشة البداية: ${m.nameAr}`
                          : `Splash motion set to: ${m.nameEn}`, 'check'
                      );
                    }}
                    style={{
                      padding: '0.58rem 0.65rem',
                      borderRadius: '12px',
                      background: active ? '#ffffff' : 'rgba(255,255,255,0.06)',
                      color: active ? '#000000' : '#ffffff',
                      border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.16)',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      textAlign: isRtl ? 'right' : 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.38rem'
                    }}
                  >
                    <BxIcon name={m.iconName} />
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
              borderRadius: '18px',
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
              <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                <BxIcon name="refresh" className="bx-ico-lead" />{isRtl ? 'تحديث التطبيق' : 'App update'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.2rem' }}>
                {isRtl
                  ? `الإصدار الحالي: v${BX_APK_VERSION}${apkRelease?.version ? ` • آخر إصدار: v${apkRelease.version}` : ''}`
                  : `Current version: v${BX_APK_VERSION}${apkRelease?.version ? ` • latest: v${apkRelease.version}` : ''}`}
              </div>
            </div>
            <a
              href={BX_APK_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                showToast(
                  isRtl
                    ? 'بينزّل آخر نسخة من التطبيق...'
                    : 'Downloading the latest BLACK X APK from the website...', 'check'
                )
              }
              style={{
                padding: '0.52rem 0.9rem',
                borderRadius: '12px',
                background: '#ffffff',
                color: '#000000',
                fontWeight: 700,
                fontSize: '0.75rem',
                textDecoration: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              <BxIcon name="download" className="bx-ico-lead" />{isRtl ? 'تحديث مباشر الآن' : 'Update APK Now'}
            </a>
          </div>

          {/* Sovereign Achievements & Unlockable Titles Selector (خزنة الأوسمة والألقاب الملكية) */}
          <div
            style={{
              display: profileSubTab === 'account' ? 'block' : 'none',
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: '18px',
              background: '#0a0a0e',
              border: '1px solid rgba(255,255,255,0.16)'
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.3rem' }}>
              <BxIcon name="medal" className="bx-ico-lead" />{isRtl ? 'الألقاب:' : 'Titles:'}
            </div>
            <p style={{ margin: '0 0 0.65rem', fontSize: '0.9375rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.45 }}>
              {isRtl
                ? 'اختار لقب يظهر جنب اسمك في تقييماتك:'
                : 'Pick a title shown next to your name in your reviews:'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.42rem' }}>
              {[
                { title: 'صياد الرتبة S', desc: 'مفتوح للجميع' },
                { title: 'سيد الظلال', desc: `${watchHistory.length}/3 حلقات` },
                { title: 'حكيم المانهوا', desc: `${mangaHistory.length}/2 فصول` },
                { title: 'جامع المفضلات', desc: `${favorites.length}/3 مفضلة` },
                { title: 'عراف الأرينا', desc: `${userXp} XP` },
                { title: 'نجم BLACK X', desc: 'للأعضاء VIP' }
              ].map((b) => {
                const active = selectedSovereignTitle === b.title;
                return (
                  <button
                    key={b.title}
                    type="button"
                    onClick={() => {
                      setSelectedSovereignTitle(b.title);
                      localStorage.setItem('bx_mob_sovereign_title', b.title);
                      showToast(`لقبك دلوقتي: ${b.title}`, 'medal');
                    }}
                    style={{
                      padding: '0.52rem 0.65rem',
                      borderRadius: '12px',
                      background: active ? '#ffffff' : 'rgba(255,255,255,0.06)',
                      color: active ? '#000000' : '#ffffff',
                      border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.16)',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{b.title}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{b.desc}</span>
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
              borderRadius: '18px',
              background: '#0a0a0e',
              border: '1px solid rgba(255,255,255,0.16)'
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.3rem' }}>
              <BxIcon name="save" className="bx-ico-lead" />{isRtl ? 'نسخة احتياطية' : 'Backup & restore'}
            </div>
            <p style={{ margin: '0 0 0.65rem', fontSize: '0.9375rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.45 }}>
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
                  borderRadius: '12px',
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                <BxIcon name="save" className="bx-ico-lead" />{isRtl ? 'تصدير' : 'Export Backup'}
              </button>
              <button
                type="button"
                onClick={() => backupFileInputRef.current?.click()}
                style={{
                  flex: 1,
                  padding: '0.58rem',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.22)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                <BxIcon name="folder" className="bx-ico-lead" />{isRtl ? 'استعادة' : 'Restore Backup'}
              </button>
            </div>
          </div>

          {/* Privacy & Security Suite: Incognito Mode + 4-Digit App PIN Lock */}
          <div
            style={{
              display: profileSubTab === 'appearance' ? 'block' : 'none',
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: '18px',
              background: '#0a0a0e',
              border: '1px solid rgba(255,255,255,0.16)'
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.6rem' }}>
              <BxIcon name="shield" className="bx-ico-lead" />{isRtl ? 'الخصوصية والحماية الذكية (PIN + التصفح الخفي):' : 'Privacy & Security Suite:'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.75rem' }}>
                  <BxIcon name="eye-off" className="bx-ico-lead" />{isRtl ? 'التصفح الخفي' : 'Incognito Mode'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.58)' }}>
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
                        ? 'التصفح الخفي شغال'
                        : 'Incognito Mode ON'
                      : isRtl
                      ? 'التصفح الخفي اتقفل'
                      : 'Incognito Mode OFF', 'eye-off'
                  );
                }}
                style={{
                  padding: '0.42rem 0.85rem',
                  borderRadius: '12px',
                  background: incognitoMode ? '#ffffff' : 'rgba(255,255,255,0.08)',
                  color: incognitoMode ? '#000000' : '#ffffff',
                  border: '1px solid rgba(255,255,255,0.22)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
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
                      ? 'القفل مفعل (أدخل 4 أرقام لتغييره)'
                      : 'PIN Active (4 digits)'
                    : isRtl
                    ? 'أدخل رمز PIN من 4 أرقام لقفل التطبيق...'
                    : 'Set 4-digit PIN lock...'
                }
                style={{
                  flex: 1,
                  padding: '0.55rem 0.75rem',
                  borderRadius: '12px',
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
                    showToast(isRtl ? 'اكتب 4 أرقام بالظبط' : 'Enter 4 digits');
                    return;
                  }
                  setAppPinCode(pinSetupInput);
                  localStorage.setItem('bx_mob_pin_code', pinSetupInput);
                  setPinSetupInput('');
                  showToast(isRtl ? 'اتفعّل قفل التطبيق بالـ PIN' : 'App PIN Lock enabled!', 'lock');
                }}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '12px',
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.75rem',
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
                    showToast(isRtl ? 'اتلغى قفل الـ PIN' : 'PIN Lock removed', 'unlock');
                  }}
                  style={{
                    padding: '0.55rem 0.7rem',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    fontWeight: 700,
                    fontSize: '0.75rem',
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
            <h3 style={{ margin: '0 0 0.55rem', fontSize: '0.9375rem', fontWeight: 700 }}>
              <BxIcon name="library" className="bx-ico-lead" />{isRtl ? 'مكتبتي الشخصية، خزنة بدون نت، ولقطاتي' : 'My Library, Offline Vault & Snapshots'}
            </h3>
            <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.38rem', overflowX: 'auto', marginBottom: '0.85rem', paddingBottom: '0.2rem' }}>
              {[
                { id: 'favorites', ar: `المفضلة (${favorites.length})`, en: `Favorites (${favorites.length})` },
                { id: 'offline', ar: `بدون نت (${offlineChapters.length})`, en: `Offline (${offlineChapters.length})` },
                { id: 'panels', ar: `لقطاتي (${savedPanels.length})`, en: `Snapshots (${savedPanels.length})` },
                { id: 'watching', ar: 'أشاهد حالياً', en: 'Watching' },
                { id: 'completed', ar: 'مكتمل', en: 'Completed' },
                { id: 'planned', ar: 'أخطط لمشاهدته', en: 'Plan to Watch' },
                { id: 'history', ar: `سجل الحلقات (${watchHistory.length})`, en: `History (${watchHistory.length})` },
                { id: 'manga_history', ar: `سجل المانجا (${mangaHistory.length})`, en: `Manga (${mangaHistory.length})` }
              ].map((lt) => {
                const active = librarySubTab === lt.id;
                return (
                  <button
                    key={lt.id}
                    type="button"
                    onClick={() => setLibrarySubTab(lt.id)}
                    style={{
                      padding: '0.42rem 0.8rem',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
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
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: '#0a0a0e', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRtl ? <>{"قائمتك المفضلة فارغة حالياً. اضغط على ("}<BxIcon name="plus" className="bx-ico-trail" />{") في أي أنمي لإضافته!"}</> : 'No favorites added yet.'}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                  {favorites.map((fav) => (
                    <div key={fav.objectID || fav.slug} onClick={() => handleOpenAnime(fav)} style={{ cursor: 'pointer' }}>
                      <img src={coverForMode(fav.poster, dataSaver)} alt={fav.titleEn} style={{ width: '100%', aspectRatio: '2/2.85', borderRadius: '12px', objectFit: 'cover' }} />
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: '#0a0a0e', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRtl ? 'القايمة دي فاضية لسه.' : 'No anime in this list yet.'}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                  {items.map((it) => (
                    <div key={it.objectID} onClick={() => handleOpenAnime(it)} style={{ cursor: 'pointer' }}>
                      <img src={coverForMode(it.poster, dataSaver)} alt={it.titleEn} style={{ width: '100%', aspectRatio: '2/2.85', borderRadius: '12px', objectFit: 'cover' }} />
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {it.titleEn}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {librarySubTab === 'offline' && (
              offlineChapters.length === 0 ? (
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: '#0a0a0e', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRtl
                    ? <>{"خزنة القراءة بدون إنترنت فارغة حالياً. اضغط على ("}<BxIcon name="download" className="bx-ico-lead" />{"حفظ بدون نت) من داخل أي فصل مانهوا أو مانجا لحفظه هنا!"}</>
                    : <>{"Offline Vault is empty. Tap ("}<BxIcon name="download" className="bx-ico-lead" />{"Save Offline) inside any chapter to cache it here!"}</>}
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
                        <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{och.mangaName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.15rem' }}>
                          <BxIcon name="download" className="bx-ico-lead" />{isRtl ? `الفصل ${och.chapter} • ${och.pagesCount} صفحة محفوظة` : `Ch. ${och.chapter} • ${och.pagesCount} pages`}
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
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="book" className="bx-ico-lead" />{isRtl ? 'قراءة' : 'Read'}
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
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="trash" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}

            {librarySubTab === 'panels' && (
              savedPanels.length === 0 ? (
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: '#0a0a0e', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRtl
                    ? <>{"لم تقم بحفظ أي لقطة شاشة أو صفحة مانهوا بعد. اضغط على ("}<BxIcon name="camera" className="bx-ico-lead" />{"لقطة) داخل مشغل الأنمي أو ("}<BxIcon name="bookmark" className="bx-ico-lead" />{"حفظ لقطة) داخل قارئ المانهوا!"}</>
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
                        <div style={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sp.title}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.22rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}>{sp.subtitle}</span>
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
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            <BxIcon name="trash" />
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
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: '#0a0a0e', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
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
                        <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{h.titleEn}</div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}>{h.epName}</div>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700 }}><BxIcon name="play" /></span>
                    </div>
                  ))}
                </div>
              )
            )}

            {librarySubTab === 'manga_history' && (
              mangaHistory.length === 0 ? (
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: '#0a0a0e', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
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
                      <img src={coverForMode(mh.poster, dataSaver)} alt={mh.name} style={{ width: '54px', height: '72px', borderRadius: '8px', objectFit: 'cover' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{mh.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}><BxIcon name="book" className="bx-ico-lead" />الفصل {mh.chapterNum}</div>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700 }}><BxIcon name="book" /></span>
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
          ref={detailsSheetRef}
          className="bx-details-sheet"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: '#000000',
            overflowY: 'auto',
            paddingBottom: '90px',
            animation: 'bxSlideUp 0.46s cubic-bezier(0.22, 1, 0.36, 1) backwards'
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
              className="bx-icon-btn bx-icon-btn-sm"
              onClick={closeDetailsSheet}
              aria-label={isRtl ? 'رجوع' : 'Back'}
            >
              <BxIcon name={isRtl ? 'arrow-right' : 'arrow-left'} />
            </button>
            <div
              dir="auto"
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '0.9375rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {selectedAnime.titleEn}
            </div>
            <span style={{ width: '40px', flexShrink: 0 }} aria-hidden="true" />
          </div>

          {/* ==================== v9.0 DEDICATED STANDALONE 120Hz CINEMA VIDEO PLAYER PAGE + FLOATING MINI-PLAYER ==================== */}
          {activeEpisode && (
            <div
              ref={playerPageRef}
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
                      bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))',
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
                      animation: 'bxSlideUp 0.46s cubic-bezier(0.22, 1, 0.36, 1) backwards'
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
                    className="bx-icon-btn bx-icon-btn-sm"
                    aria-label={isRtl ? 'رجوع لصفحة الأنمي' : 'Back to the show'}
                    onClick={() => {
                      setActiveEpisode(null);
                      setPlayingVideoUrl('');
                      setVideoFullscreen(false);
                    }}
                  >
                    <BxIcon name={isRtl ? 'arrow-right' : 'arrow-left'} />
                  </button>

                  <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                    <div
                      dir="auto"
                      style={{
                        fontWeight: 700,
                        fontSize: '0.9375rem',
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {selectedAnime.titleEn}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{activeEpisode.name}</div>
                  </div>

                  <button
                    type="button"
                    className="bx-icon-btn bx-icon-btn-sm"
                    aria-label={isRtl ? 'تصغير المشغل' : 'Mini player'}
                    onClick={() => setPlayerMinimized(true)}
                  >
                    <BxIcon name="chevron-down" />
                  </button>
                </div>
              )}

              <div
                data-bx-video="1"
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
                        borderRadius: '12px',
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
                    <div style={{ fontSize: playerMinimized ? '1.0625rem' : '1.375rem' }}><BxIcon name="zap" /></div>
                    {!playerMinimized && (
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                        {isRtl
                          ? `بنجهّز التشغيل${selectedServer?.quality ? ` (${selectedServer.quality})` : ''}...`
                          : 'Extracting direct MP4 stream...'}
                      </div>
                    )}
                  </div>
                ) : playingVideoUrl ? (
                  <>
                    <video
                      ref={videoRef}
                      src={hlsActive ? undefined : playingVideoUrl}
                      controls={false}
                      autoPlay
                      playsInline
                      referrerPolicy="no-referrer"
                      onError={handleVideoElementError}
                      onPause={(e) => {
                        const v = e.currentTarget;
                        if (!incognitoMode && v && v.currentTime > 5 && !v.ended) {
                          savePosition(episodeKey(selectedAnime, activeEpisode), v.currentTime, v.duration, { immediate: true });
                          recordWatchProgress(v.currentTime, v.duration);
                        }
                      }}
                      onLoadedMetadata={(e) => {
                        try {
                          const v = e.currentTarget;
                          const dur = Number(v.duration) || 0;
                          setVideoDuration(Number.isFinite(dur) ? Math.round(dur) : 0);
                          const saved = getPosition(episodeKey(selectedAnime, activeEpisode));
                          if (saved && !saved.done && saved.sec > 12 && dur && saved.sec < dur - 20) {
                            v.currentTime = saved.sec;
                            showToast(isRtl ? `كمّلنا من ${formatClock(saved.sec)}` : `Resumed at ${formatClock(saved.sec)}`, 'play');
                          }
                        } catch (_) {}
                      }}
                      onTimeUpdate={(e) => {
                        try {
                          const v = e.currentTarget;
                          const cur = Math.floor(v.currentTime || 0);
                          if (loopPointA !== null && loopPointB !== null && cur >= loopPointB) {
                            v.currentTime = loopPointA;
                            return;
                          }
                          if (timedCommentsEnabled && timedComments.length > 0) {
                            const hit = timedComments.find((tc) => Math.abs(cur - Number(tc.sec || 0)) <= 2);
                            setActiveDanmakuComment(hit || null);
                          } else if (activeDanmakuComment) {
                            setActiveDanmakuComment(null);
                          }
                          if (cur > 5 && cur % 3 === 0 && !incognitoMode) {
                            savePosition(episodeKey(selectedAnime, activeEpisode), cur, v.duration);
                          }
                        } catch (_) {}
                      }}
                      onEnded={(e) => {
                        const dur = Number(e.currentTarget?.duration) || 0;
                        if (!incognitoMode && dur) {
                          savePosition(episodeKey(selectedAnime, activeEpisode), dur, dur, { done: true, immediate: true });
                          recordWatchProgress(dur, dur);
                        }
                        if (sleepTimerMode === 'end_of_ep') {
                          setSleepTimerMode('off');
                          showToast('خلصت الحلقة — وقفنا التشغيل حسب مؤقت النوم', 'moon');
                          return;
                        }
                        if (!autoNextEp) return;
                        const idx = animeEpisodes.findIndex((x) => x.docId === activeEpisode.docId);
                        if (idx !== -1 && idx + 1 < animeEpisodes.length) {
                          // "Next episode in 5…" instead of an instant jump.
                          setNextEpCountdown({ anime: selectedAnime, ep: animeEpisodes[idx + 1] });
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
                    {/* BLACK X controls: play/pause, ±10 s, seek bar with intro/outro marks, next, full screen */}
                    {!playerMinimized && (
                      <PlayerControls
                        videoRef={videoRef}
                        sourceKey={playingVideoUrl}
                        isRtl={isRtl}
                        fullscreen={videoFullscreen}
                        locked={videoTouchLocked}
                        title={selectedAnime.titleEn}
                        subtitle={activeEpisode.name}
                        segments={skipSegments}
                        hasNext={(() => {
                          const idx = animeEpisodes.findIndex((x) => x.docId === activeEpisode.docId);
                          return idx !== -1 && idx + 1 < animeEpisodes.length;
                        })()}
                        onSeekBy={handleVideoDoubleTap}
                        onToggleFullscreen={() => setVideoFullscreen((v) => !v)}
                        onNext={() => {
                          const idx = animeEpisodes.findIndex((x) => x.docId === activeEpisode.docId);
                          if (idx !== -1 && idx + 1 < animeEpisodes.length) handlePlayEpisode(selectedAnime, animeEpisodes[idx + 1]);
                        }}
                        onMore={() => {
                          haptic('tap');
                          if (videoFullscreen) {
                            setPlayerMoreOpen(true);
                            return;
                          }
                          setPlayerStudioOpen(true);
                          setTimeout(() => {
                            try {
                              document.getElementById('bx-player-studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            } catch (_) {}
                          }, 60);
                        }}
                        onLock={() => {
                          setVideoTouchLocked(true);
                          showToast(isRtl ? 'اتقفل اللمس عشان مفيش ضغطة غلط' : 'Screen touch locked', 'lock');
                        }}
                        onUnlock={() => {
                          setVideoTouchLocked(false);
                          showToast(isRtl ? 'اتفتح قفل اللمس' : 'Touch unlocked', 'unlock');
                        }}
                      />
                    )}
                    {/* Real intro/outro skip (AniSkip) + next-episode countdown */}
                    {!playerMinimized && (
                      <>
                        <SkipSegmentOverlay
                          videoRef={videoRef}
                          segments={skipSegments}
                          autoSkip={autoSkipIntro}
                          isRtl={isRtl}
                          episodeId={`${selectedAnime?.objectID}:${activeEpisode?.number}`}
                          onOutroSkip={() => {
                            const v = videoRef.current;
                            if (v && v.duration) v.currentTime = Math.max(0, v.duration - 0.25);
                          }}
                        />
                        <NextEpisodeCountdown
                          open={Boolean(nextEpCountdown)}
                          title={nextEpCountdown ? `${isRtl ? 'الحلقة' : 'Episode'} ${nextEpCountdown.ep.number}` : ''}
                          subtitle={nextEpCountdown?.anime?.titleEn || ''}
                          isRtl={isRtl}
                          onPlay={playNextFromCountdown}
                          onCancel={() => setNextEpCountdown(null)}
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
                          borderRadius: '999px',
                          fontWeight: 700,
                          fontSize: '0.8125rem',
                          color: '#ffffff',
                          zIndex: 30,
                          pointerEvents: 'none'
                        }}
                      >
                        {gestureHud.type === 'brightness'
                          ? <><BxIcon name="sun" className="bx-ico-lead" />{isRtl ? 'السطوع' : 'Brightness'}{": "}{gestureHud.value}{"%"}</>
                          : <><BxIcon name="volume" className="bx-ico-lead" />{isRtl ? 'الصوت' : 'Volume'}{": "}{gestureHud.value}{"%"}</>}
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
                          borderRadius: '999px',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          zIndex: 30,
                          pointerEvents: 'none'
                        }}
                      >
                        <BxIcon name="zap" className="bx-ico-lead" />2.0x {isRtl ? 'سرعة مضاعفة' : 'Fast Forward'}
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
                          borderRadius: '999px',
                          fontWeight: 700,
                          fontSize: subStyleMode === 'yellow_xl' ? '0.9375rem' : '0.75rem',
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
                        <BxIcon name="message" className="bx-ico-lead" />{activeDanmakuComment.author}: {activeDanmakuComment.text}
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
                          borderRadius: '999px',
                          fontWeight: 700,
                          fontSize: '0.8125rem'
                        }}
                      >
                        {skipRipple === 'left' ? <><BxIcon name="rewind" className="bx-ico-lead" />{"-10s"}</> : <><BxIcon name="fast-forward" className="bx-ico-lead" />{"+10s"}</>}
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
                      fontSize: '0.8125rem',
                      color: 'rgba(255,255,255,0.65)'
                    }}
                  >
                    {episodeServers.length === 0
                      ? isRtl
                        ? 'مفيش سيرفر شغال للحلقة دي دلوقتي'
                        : 'No direct stream for this episode on the BLACK X servers right now'
                      : isRtl
                        ? 'تعذّر تشغيل هذا السيرفر — اختر سيرفر آخر من الأسفل'
                        : 'This server could not play — pick another one below'}
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
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {selectedAnime.titleEn}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.68)', marginTop: '2px' }}>
                      <BxIcon name="film" className="bx-ico-lead" />{activeEpisode.name} • {isRtl ? 'اضغط للتكبير' : 'Tap to expand'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => setPlayerMinimized(false)}
                      style={{
                        padding: '0.38rem 0.65rem',
                        borderRadius: '12px',
                        background: '#ffffff',
                        color: '#000000',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      <BxIcon name="fullscreen" className="bx-ico-lead" />{isRtl ? 'فتح' : 'Open'}
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
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      <BxIcon name="close" />
                    </button>
                  </div>
                </div>
              )}

              {/* Cinema Controls Strip (Fullscreen Button, Fit Mode, Prev/Next Ep, Auto-Next, PiP, Speed, Download) */}
              {!videoFullscreen && !playerMinimized && (
                <div style={{ padding: '0.65rem 1rem 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', minWidth: 0 }} dir="auto">
                      {activeEpisode.name} {activeEpisode.titleAr ? `— ${activeEpisode.titleAr}` : ''}
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
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                <BxIcon name="skip-back" className="bx-ico-lead" />{isRtl ? 'السابقة' : 'Prev'}
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
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                <BxIcon name="skip-forward" className="bx-ico-lead" />{isRtl ? 'التالية' : 'Next'}
                              </button>
                            )}
                          </>
                        );
                      })()}

                      <button
                        type="button"
                        onClick={() => setWatchPartyModalOpen((v) => !v)}
                        style={{
                          padding: '0.32rem 0.65rem',
                          borderRadius: '8px',
                          background: watchPartyRoom ? '#ffffff' : 'rgba(255,255,255,0.12)',
                          border: '1px solid rgba(255,255,255,0.24)',
                          color: watchPartyRoom ? '#000000' : '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="popcorn" className="bx-ico-lead" />{watchPartyRoom ? watchPartyRoom.roomCode : isRtl ? 'مشاهدة جماعية' : 'Party'}
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
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="sliders" className="bx-ico-lead" />{isRtl ? 'إعدادات المشغل' : 'Player settings'} {playerStudioOpen ? <BxIcon name="chevron-up" /> : <BxIcon name="chevron-down" />}
                      </button>
                    </div>
                  </div>

                  {/* Player settings panel (also opened by the settings button on the video) */}
                  {playerStudioOpen && (
                    <div
                      id="bx-player-studio"
                      style={{
                        marginBottom: '0.65rem',
                        padding: '0.7rem',
                        borderRadius: '12px',
                        background: '#09090d',
                        border: '1px solid rgba(255,255,255,0.2)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: '0.42rem'
                      }}
                    >
                      {hlsLevels.length > 1 && (
                        <button
                          type="button"
                          onClick={cycleHlsQuality}
                          style={{
                            gridColumn: '1 / -1',
                            minHeight: '44px',
                            padding: '0.45rem 0.6rem',
                            borderRadius: '8px',
                            background: hlsLevel === -1 ? 'rgba(255,255,255,0.08)' : '#ffffff',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: hlsLevel === -1 ? '#ffffff' : '#000000',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <BxIcon name="sliders" className="bx-ico-lead" />
                          {isRtl ? 'الجودة: ' : 'Quality: '}
                          {hlsLevel === -1
                            ? isRtl ? `تلقائي${dataSaver ? ' (توفير البيانات)' : ''}` : `Auto${dataSaver ? ' (data saver)' : ''}`
                            : `${hlsLevels.find((l) => l.index === hlsLevel)?.height || ''}p`}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleCycleVisualShader}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '8px',
                          background: visualShaderMode !== 'original' ? '#ffffff' : 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: visualShaderMode !== 'original' ? '#000000' : '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="sparkles" className="bx-ico-lead" />
                        {isRtl ? 'الصورة: ' : 'Picture: '}
                        {visualShaderMode === 'upscale4k'
                          ? isRtl ? 'خطوط أوضح' : 'Sharper lines'
                          : visualShaderMode === 'amoled_hdr'
                          ? isRtl ? 'تباين أعلى' : 'More contrast'
                          : visualShaderMode === 'cinema_imax'
                          ? isRtl ? 'ألوان دافية' : 'Warm colours'
                          : isRtl ? 'أصلية' : 'Original'}
                      </button>

                      <button
                        type="button"
                        onClick={handleCycleAudioBooster}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '8px',
                          background: audioBoostMode !== 'normal' ? '#ffffff' : 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: audioBoostMode !== 'normal' ? '#000000' : '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="volume" className="bx-ico-lead" />مضخم الصوت:{' '}
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
                          showToast(next ? 'التخطي التلقائي للمقدمة: مفعل' : 'التخطي التلقائي للمقدمة: متوقف', 'zap');
                        }}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '8px',
                          background: autoSkipIntro ? '#ffffff' : 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: autoSkipIntro ? '#000000' : '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="zap" className="bx-ico-lead" />تخطي المقدمة: {autoSkipIntro ? 'تلقائي ON' : 'يدوي'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setAutoNextEp((v) => !v)}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '8px',
                          background: autoNextEp ? '#ffffff' : 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: autoNextEp ? '#000000' : '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="repeat" className="bx-ico-lead" />الحلقة التالية: {autoNextEp ? 'تلقائي ON' : 'OFF'}
                      </button>

                      <button
                        type="button"
                        onClick={handleTakeVideoSnapshot}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="camera" className="bx-ico-lead" />التقاط لقطة
                      </button>

                      <button
                        type="button"
                        onClick={handleCycleAbLoop}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '8px',
                          background: loopPointA !== null ? '#ffffff' : 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: loopPointA !== null ? '#000000' : '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="repeat" className="bx-ico-lead" />تكرار مشهد: {loopPointA === null ? 'A-B' : loopPointB === null ? <>{"A"}<BxIcon name="arrow-right" className="bx-ico-trail" />{"..."}</> : 'A⇄B'}
                      </button>

                      <button
                        type="button"
                        onClick={handleCycleSleepTimer}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '8px',
                          background: sleepTimerMode !== 'off' ? '#ffffff' : 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: sleepTimerMode !== 'off' ? '#000000' : '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="moon" className="bx-ico-lead" />مؤقت النوم:{' '}
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
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="zap" className="bx-ico-lead" />سرعة العرض: {playbackSpeed}x
                      </button>

                      <button
                        type="button"
                        onClick={handleCycleSubtitleStyle}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="type" className="bx-ico-lead" />ستايل التعليق: {subStyleMode === 'yellow_xl' ? 'أصفر XL' : subStyleMode === 'red_bx' ? 'أحمر BX' : 'أبيض LG'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const next = !bgAudioMode;
                          setBgAudioMode(next);
                          showToast(next ? 'الصوت في الخلفية: مفعل' : 'الصوت في الخلفية: متوقف', 'headphones');
                        }}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '8px',
                          background: bgAudioMode ? '#ffffff' : 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: bgAudioMode ? '#000000' : '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="headphones" className="bx-ico-lead" />صوت بالخلفية: {bgAudioMode ? 'ON' : 'OFF'}
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
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <BxIcon name="tv" className="bx-ico-lead" />نافذة عائمة
                      </button>

                      {playingVideoUrl && (
                        <a
                          href={playingVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          style={{
                            padding: '0.45rem 0.6rem',
                            borderRadius: '8px',
                            background: '#ffffff',
                            color: '#000000',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                            textAlign: 'center'
                          }}
                        >
                          <BxIcon name="download" className="bx-ico-lead" />تحميل الحلقة MP4
                        </a>
                      )}
                    </div>
                  )}

                  {/* BLACK X Exclusive Server & Quality Selector Pills */}
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: '0.35rem' }}>
                    {isRtl
                      ? 'السيرفر'
                      : 'Server'}
                  </div>
                  <div className="bx-mob-scroll" style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                    {episodeServers.map((srv, idx) => {
                      const meta = SERVER_LABELS[srv.name] || {
                        nameAr: `BLACK X ${idx + 1}`,
                        nameEn: `BLACK X ${idx + 1}`
                      };
                      const active = selectedServer === srv;
                      return (
                        <button
                          key={`${srv.name}-${srv.quality}-${idx}`}
                          type="button"
                          onClick={() => handleSelectServer(srv, episodeServers)}
                          style={{
                            padding: '0.45rem 0.8rem',
                            borderRadius: '12px',
                            background: active ? '#ffffff' : '#0d0d12',
                            color: active ? '#000000' : '#ffffff',
                            border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.16)',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer'
                          }}
                        >
                          {srv.label || `${isRtl ? meta.nameAr : meta.nameEn}${srv.quality ? ` • ${srv.quality}` : ''}`}
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
                        borderRadius: '8px',
                        background: timedCommentsEnabled ? '#ffffff' : 'rgba(255,255,255,0.08)',
                        color: timedCommentsEnabled ? '#000000' : '#ffffff',
                        border: '1px solid rgba(255,255,255,0.2)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                    >
                      <BxIcon name="message" className="bx-ico-lead" />{timedCommentsEnabled ? 'ON' : 'OFF'}
                    </button>
                    <input
                      type="text"
                      value={newTimedCommentText}
                      onChange={(e) => setNewTimedCommentText(e.target.value)}
                      placeholder={
                        isRtl
                          ? 'علّق على اللحظة دي...'
                          : 'Comment on this moment...'
                      }
                      style={{
                        flex: 1,
                        padding: '0.45rem 0.7rem',
                        borderRadius: '8px',
                        background: '#08080c',
                        border: '1px solid rgba(255,255,255,0.18)',
                        color: '#ffffff',
                        fontSize: '0.75rem'
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
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      {isRtl ? 'إرسال' : 'Send'}
                    </button>
                  </form>

                  {/* Live Cloud Watch Party Room Panel (غرفة المشاهدة الجماعية السحابية) */}
                  {(watchPartyModalOpen || watchPartyRoom) && (
                    <div
                      style={{
                        marginTop: '0.65rem',
                        padding: '0.8rem',
                        borderRadius: '12px',
                        background: '#09090d',
                        border: '1.5px solid #ffffff'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                          <BxIcon name="popcorn" />{' '}
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
                              showToast(isRtl ? 'خرجت من غرفة المشاهدة' : 'Left Watch Party');
                            }
                            setWatchPartyModalOpen(false);
                          }}
                          style={{
                            background: 'rgba(255,255,255,0.12)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '8px',
                            padding: '0.2rem 0.55rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {watchPartyRoom ? (isRtl ? <>{"مغادرة"}<BxIcon name="close" className="bx-ico-trail" /></> : <>{"Leave"}<BxIcon name="close" className="bx-ico-trail" /></>) : <BxIcon name="close" />}
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
                              borderRadius: '12px',
                              background: '#ffffff',
                              color: '#000000',
                              border: 'none',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            <BxIcon name="popcorn" className="bx-ico-lead" />{isRtl ? 'إنشاء غرفة جديدة ومشاركة الكود مع أصدقائك' : 'Create Watch Party Room'}
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
                                borderRadius: '8px',
                                background: '#000',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#fff',
                                fontSize: '0.75rem'
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleJoinWatchParty}
                              style={{
                                padding: '0.5rem 0.85rem',
                                borderRadius: '8px',
                                background: 'rgba(255,255,255,0.15)',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.28)',
                                fontWeight: 700,
                                fontSize: '0.75rem',
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
                              <div key={m.id} style={{ fontSize: '0.75rem' }}>
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
                                fontSize: '0.75rem'
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
                                fontWeight: 700,
                                fontSize: '0.75rem',
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
                        borderRadius: '12px',
                        background: '#08080c',
                        border: '1px solid rgba(255,255,255,0.14)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.75rem' }}>
                          {isRtl ? `الحلقات (${animeEpisodes.length})` : `Episodes (${animeEpisodes.length})`}
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
                                borderRadius: '12px',
                                background: active ? '#ffffff' : 'rgba(255,255,255,0.08)',
                                color: active ? '#000000' : '#ffffff',
                                border: active ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.16)',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                flexShrink: 0
                              }}
                            >
                              {active ? <><BxIcon name="play" />{" "}</> : ''}{isRtl ? `ح ${ep.number}` : `E${ep.number}`}
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
                borderBottomLeftRadius: '18px',
                borderBottomRightRadius: '18px',
                borderBottom: '1px solid rgba(255,255,255,0.16)'
              }}
            >
              <img
                src={selectedAnime.poster || selectedAnime.banner}
                alt={selectedAnime.titleEn}
                style={{
                  viewTransitionName: 'bx-poster',
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
                <h1
                  dir="auto"
                  style={{
                    margin: 0,
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    lineHeight: 1.18,
                    textAlign: isRtl ? 'right' : 'left',
                    textShadow: '0 4px 18px #000000'
                  }}
                >
                  {selectedAnime.titleEn}
                </h1>
              </div>
            </div>

            <div style={{ position: 'relative', zIndex: 2, padding: '0.55rem 1rem 1rem', background: '#000000' }}>
              <div className="bx-detail-meta">
                {selectedAnime.rating && (
                  <span className="bx-hero-rating">
                    <BxIcon name="star" size="0.95em" filled />
                    {selectedAnime.rating}
                  </span>
                )}
                {selectedAnime.year && <span>{selectedAnime.year}</span>}
                {selectedAnime.type && <span>{selectedAnime.type}</span>}
                {selectedAnime.state && <span>{selectedAnime.state}</span>}
                {animeEpisodes.length > 0 && <span>{isRtl ? `${animeEpisodes.length} حلقة` : `${animeEpisodes.length} episodes`}</span>}
              </div>
              {Array.isArray(selectedAnime.tags) && selectedAnime.tags.length > 0 && (
                <div className="bx-detail-tags">
                  {selectedAnime.tags.slice(0, 4).map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              )}

              {/* Main action: resume where you stopped (real position), else episode 1 */}
              {(() => {
                const savedHist = watchHistory.find((h) => h.objectID === selectedAnime.objectID);
                const resumeEp = savedHist && animeEpisodes.find((e) => Number(e.number) === Number(savedHist.episode));
                const pos = resumeEp ? getPosition(episodeKey(selectedAnime, resumeEp.number)) : null;
                let targetEp = resumeEp || animeEpisodes[0];
                let label = targetEp ? (isRtl ? `شغّل الحلقة ${targetEp.number}` : `Play episode ${targetEp.number}`) : isRtl ? 'تشغيل' : 'Play';
                if (resumeEp && pos?.done) {
                  const nextEp = animeEpisodes.find((e) => Number(e.number) === Number(resumeEp.number) + 1);
                  if (nextEp) {
                    targetEp = nextEp;
                    label = isRtl ? `شغّل الحلقة ${nextEp.number}` : `Play episode ${nextEp.number}`;
                  } else {
                    label = isRtl ? `أعد الحلقة ${resumeEp.number}` : `Replay episode ${resumeEp.number}`;
                  }
                } else if (resumeEp) {
                  const leftMin = pos && pos.dur > 0 ? Math.max(1, Math.ceil((pos.dur - pos.sec) / 60)) : null;
                  label = isRtl
                    ? `كمّل الحلقة ${resumeEp.number}${leftMin ? ` · فاضل ${leftMin} د` : ''}`
                    : `Resume episode ${resumeEp.number}${leftMin ? ` · ${leftMin} min left` : ''}`;
                }
                return (
                  <button
                    type="button"
                    className="bx-btn bx-btn-primary bx-btn-block bx-detail-cta"
                    disabled={episodesLoading || !targetEp}
                    onClick={() => targetEp && handlePlayEpisode(selectedAnime, targetEp)}
                  >
                    {episodesLoading ? <BxIcon name="loader" spin /> : <BxIcon name="play" filled />}
                    {episodesLoading ? (isRtl ? 'بيجهّز الحلقات...' : 'Loading episodes...') : label}
                  </button>
                );
              })()}

              {/* Labelled secondary actions */}
              <div className="bx-detail-actions">
                {(() => {
                  const fav = favorites.some((f) => f.objectID === selectedAnime.objectID);
                  return (
                    <button type="button" className={fav ? 'is-on' : ''} aria-pressed={fav} onClick={() => toggleFavorite(selectedAnime)}>
                      <BxIcon name={fav ? 'check' : 'plus'} />
                      <span>{fav ? (isRtl ? 'في قائمتي' : 'In my list') : isRtl ? 'قائمتي' : 'My list'}</span>
                    </button>
                  );
                })()}
                <button
                  type="button"
                  disabled={!animeEpisodes.length}
                  onClick={() => {
                    const savedHist = watchHistory.find((h) => h.objectID === selectedAnime.objectID);
                    const targetEp =
                      (savedHist && animeEpisodes.find((e) => Number(e.number) === Number(savedHist.episode))) || animeEpisodes[0];
                    if (targetEp) handleSaveOfflineVault(selectedAnime, targetEp);
                  }}
                >
                  <BxIcon name="download" />
                  <span>{isRtl ? 'تنزيل' : 'Download'}</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const url = `https://black-x-anime.me/show/${animeSlugOf(selectedAnime)}`;
                    try {
                      if (navigator.share) {
                        await navigator.share({ title: selectedAnime.titleEn, url });
                        return;
                      }
                    } catch (_) {
                      return;
                    }
                    try {
                      await navigator.clipboard?.writeText(url);
                      showToast(isRtl ? 'اتنسخ اللينك' : 'Link copied', 'share');
                    } catch (_) {}
                  }}
                >
                  <BxIcon name="share" />
                  <span>{isRtl ? 'مشاركة' : 'Share'}</span>
                </button>
              </div>

              {/* Story */}
              {selectedAnime.storyAr && (
                <div className="bx-detail-story" onClick={() => setStoryExpanded((v) => !v)}>
                  <p dir="auto" className={storyExpanded ? 'is-open' : ''}>
                    {selectedAnime.storyAr}
                  </p>
                  <div className="bx-detail-story-foot">
                    <span>{storyExpanded ? (isRtl ? 'أقل' : 'Less') : isRtl ? 'المزيد' : 'More'}</span>
                    <button
                      type="button"
                      className="bx-chip bx-chip-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSpeakText(selectedAnime.storyAr);
                      }}
                    >
                      <BxIcon name={ttsSpeaking ? 'mute' : 'volume'} size="1em" />
                      {ttsSpeaking ? (isRtl ? 'إيقاف' : 'Stop') : isRtl ? 'استماع' : 'Listen'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '0 1rem 1rem' }}>
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
                      fontSize: '0.8125rem',
                      fontWeight: 700,
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
                        borderRadius: '999px',
                        background: epRangeChunk === -1 ? '#ffffff' : 'rgba(255,255,255,0.08)',
                        color: epRangeChunk === -1 ? '#000000' : '#ffffff',
                        border: '1px solid rgba(255,255,255,0.2)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
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
                            borderRadius: '999px',
                            background: active ? '#ffffff' : 'rgba(255,255,255,0.08)',
                            color: active ? '#000000' : '#ffffff',
                            border: '1px solid rgba(255,255,255,0.2)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
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
                      borderRadius: '8px',
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
                      borderRadius: '8px',
                      background: '#ffffff',
                      color: '#000000',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {epLayoutMode === 'cards' ? (isRtl ? <><BxIcon name="hash" className="bx-ico-lead" />{"شبكة أرقام"}</> : <><BxIcon name="hash" className="bx-ico-lead" />{"Grid"}</>) : isRtl ? <><BxIcon name="menu" className="bx-ico-lead" />{"بطاقات"}</> : <><BxIcon name="menu" className="bx-ico-lead" />{"Cards"}</>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHideFiller((v) => !v)}
                    style={{
                      padding: '0.4rem 0.65rem',
                      borderRadius: '8px',
                      background: hideFiller ? '#ffffff' : 'rgba(255,255,255,0.08)',
                      color: hideFiller ? '#000000' : '#ffffff',
                      border: '1px solid rgba(255,255,255,0.18)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {hideFiller ? <><BxIcon name="check" className="bx-ico-lead" />{"بدون فلر"}</> : 'إخفاء الفلر'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEpAscending((v) => !v)}
                    style={{
                      padding: '0.4rem 0.65rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.18)',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {epAscending ? <><BxIcon name="arrow-up" className="bx-ico-lead" />{"1..N"}</> : <><BxIcon name="download" className="bx-ico-lead" />{"N..1"}</>}
                  </button>
                </div>

                {episodesLoading ? (
                  <SkeletonList count={6} thumbWidth={120} thumbHeight={68} padding="0" />
                ) : animeEpisodes.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '1.4rem 1rem',
                      borderRadius: '12px',
                      background: '#0a0a0e',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.75)',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      lineHeight: 1.6
                    }}
                  >
                    <div style={{ marginBottom: '0.7rem' }}>
                      {episodesError === 'network'
                        ? isRtl
                          ? 'تعذّر الاتصال بسيرفرات BLACK X — تأكد من الإنترنت ثم أعد المحاولة.'
                          : 'Could not reach the BLACK X servers — check your connection and retry.'
                        : isRtl
                          ? 'مفيش حلقات متاحة للعمل ده دلوقتي.'
                          : 'No episodes for this title on the BLACK X servers right now.'}
                    </div>
                    <button
                      type="button"
                      onClick={() => selectedAnime && handleOpenAnime(selectedAnime)}
                      style={{
                        padding: '0.5rem 1.1rem',
                        borderRadius: '999px',
                        background: '#ffffff',
                        color: '#000000',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      {isRtl ? <><BxIcon name="retry" className="bx-ico-lead" />{"إعادة المحاولة"}</> : <><BxIcon name="retry" className="bx-ico-lead" />{"Retry"}</>}
                    </button>
                  </div>
                ) : epLayoutMode === 'grid' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '0.45rem' }}>
                    {displayedEpisodes.map((ep) => {
                      const isPlaying = activeEpisode?.docId === ep.docId;
                      // Watched = the saved position reached the end (resumeStore `done`), not "opened once".
                      const epPos = getPosition(episodeKey(selectedAnime, ep.number));
                      const isWatched = Boolean(epPos?.done);
                      const epPct = epPos && epPos.dur > 0 && !epPos.done ? Math.min(100, Math.max(3, (epPos.sec / epPos.dur) * 100)) : null;
                      return (
                        <button
                          key={ep.docId}
                          type="button"
                          onClick={() => handlePlayEpisode(selectedAnime, ep)}
                          style={{
                            padding: '0.65rem 0.3rem',
                            borderRadius: '12px',
                            background: isPlaying ? '#ffffff' : isWatched ? 'rgba(255,255,255,0.06)' : '#0b0b10',
                            color: isPlaying ? '#000000' : '#ffffff',
                            border: isPlaying
                              ? '1.5px solid #ffffff'
                              : isWatched
                              ? '1px solid rgba(255,255,255,0.28)'
                              : '1px solid rgba(255,255,255,0.12)',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            textAlign: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <div>{ep.number}</div>
                          {isWatched && <div style={{ fontSize: '0.75rem', opacity: 0.72 }}><BxIcon name="check" /></div>}
                          {epPct !== null && (
                            <span className="bx-ep-progress" aria-hidden="true">
                              <span style={{ width: `${epPct}%` }} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    {displayedEpisodes.map((ep) => {
                      const isPlaying = activeEpisode?.docId === ep.docId;
                      // Watched = the saved position reached the end (resumeStore `done`), not "opened once".
                      const epPos = getPosition(episodeKey(selectedAnime, ep.number));
                      const isWatched = Boolean(epPos?.done);
                      const epPct = epPos && epPos.dur > 0 && !epPos.done ? Math.min(100, Math.max(3, (epPos.sec / epPos.dur) * 100)) : null;
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
                            borderRadius: '12px',
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
                              borderRadius: '8px',
                              overflow: 'hidden',
                              background: '#111',
                              flexShrink: 0
                            }}
                          >
                            <img
                              src={ep.thumb || selectedAnime.poster}
                              alt={ep.name}
                              loading="lazy"
                          decoding="async"
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
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  padding: '0.08rem 0.3rem',
                                  borderRadius: '4px'
                                }}
                              >
                                فلر
                              </span>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                              <span dir="auto" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.name}</span>
                              {isWatched && (
                                <span style={{ flexShrink: 0, fontSize: '0.75rem', fontWeight: 600, padding: '0.05rem 0.4rem', borderRadius: '8px', background: 'rgba(255,255,255,0.16)' }}>
                                  <BxIcon name="check" className="bx-ico-lead" />
                                  {isRtl ? 'اتشافت' : 'Watched'}
                                </span>
                              )}
                            </div>
                            {epPct !== null && (
                              <span className="bx-ep-progress" aria-label={isRtl ? `اتشاف ${Math.round(epPct)}%` : `${Math.round(epPct)}% watched`}>
                                <span style={{ width: `${epPct}%` }} />
                              </span>
                            )}
                            {ep.titleAr && (
                              <div
                                style={{
                                  fontSize: '0.75rem',
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
                              borderRadius: '8px',
                              background: isPlaying ? '#000000' : 'rgba(255,255,255,0.1)',
                              color: '#ffffff',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            <BxIcon name="play" />
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
                  {isRtl ? <><BxIcon name="loader" className="bx-ico-lead" />{"بيحمّل الشخصيات..."}</> : <><BxIcon name="loader" className="bx-ico-lead" />{"Loading characters & voice actors..."}</>}
                </div>
              ) : animeCharacters.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.6)' }}>
                  {isRtl ? 'مفيش بيانات عن الشخصيات.' : 'No character data found.'}
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
                        borderRadius: '12px',
                        background: '#0a0a0e',
                        border: '1px solid rgba(255,255,255,0.12)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <img
                          src={ch.image}
                          alt={ch.name}
                          loading="lazy"
                          decoding="async"
                          style={{ width: '48px', height: '62px', borderRadius: '8px', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{ch.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>{ch.role}</div>
                        </div>
                      </div>
                      {ch.vaName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', textAlign: 'end' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.75rem' }}>{ch.vaName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}><BxIcon name="mic" className="bx-ico-lead" />JP Seiyuu</div>
                          </div>
                          {ch.vaImage && (
                            <img
                              src={ch.vaImage}
                              alt={ch.vaName}
                              loading="lazy"
                          decoding="async"
                              style={{ width: '44px', height: '58px', borderRadius: '8px', objectFit: 'cover' }}
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
                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem', fontWeight: 700 }}>
                      <BxIcon name="film" className="bx-ico-lead" />{isRtl ? 'الإعلان الرسمي' : 'Official Trailer'}
                    </h4>
                    <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
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
                  <div style={{ padding: '1rem', borderRadius: '12px', background: '#0a0a0e', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                    {isRtl ? 'لا يتوفر تريلر مدمج لهذا العمل.' : 'No embedded trailer available.'}
                  </div>
                )}

                <div>
                  <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.9375rem', fontWeight: 700 }}>
                    <BxIcon name="sparkles" className="bx-ico-lead" />{isRtl ? 'أنميات مشابهة ومرتبطة ننصحك بمشاهدتها' : 'Similar & Related Anime'}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                    {relatedAnimes.map((rel) => (
                      <div key={rel.objectID} onClick={() => handleOpenAnime(rel)} style={{ cursor: 'pointer' }}>
                        <img
                          src={coverForMode(rel.poster, dataSaver)}
                          alt={rel.titleEn}
                          loading="lazy"
                          decoding="async"
                          style={{ width: '100%', aspectRatio: '2/2.85', borderRadius: '12px', objectFit: 'cover' }}
                        />
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                    borderRadius: '12px',
                    background: '#0a0a0e',
                    border: '1px solid rgba(255,255,255,0.14)',
                    marginBottom: '0.85rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      <BxIcon name="star" className="bx-ico-lead" />{isRtl ? 'التقييم الرباعي الاحترافي (4-Pillar Rating):' : '4-Pillar Master Rating:'}
                    </span>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '8px',
                        background: '#ffffff',
                        color: '#000000',
                        fontWeight: 700,
                        fontSize: '0.75rem'
                      }}
                    >
                      <BxIcon name="star" className="bx-ico-lead" />{((revStoryScore + revAnimScore + revOstScore + revCharScore) / 4).toFixed(1)} / 10
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem', marginBottom: '0.55rem' }}>
                    {[
                      { label: isRtl ? 'القصة' : 'Story', val: revStoryScore, set: setRevStoryScore },
                      { label: isRtl ? 'التحريك' : 'Animation', val: revAnimScore, set: setRevAnimScore },
                      { label: isRtl ? 'الموسيقى' : 'OST', val: revOstScore, set: setRevOstScore },
                      { label: isRtl ? 'الشخصيات' : 'Cast', val: revCharScore, set: setRevCharScore }
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
                          fontSize: '0.75rem',
                          fontWeight: 700
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
                            borderRadius: '8px',
                            padding: '0.12rem 0.35rem',
                            fontWeight: 700,
                            fontSize: '0.75rem'
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
                        borderRadius: '12px',
                        background: '#050507',
                        border: '1px solid rgba(255,255,255,0.18)',
                        color: '#fff',
                        fontSize: '0.75rem'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '0 0.95rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: '#ffffff',
                        color: '#000000',
                        fontWeight: 700,
                        fontSize: '0.75rem',
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
                          <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{rv.author}</span>
                          {rv.sovereignTitle && (
                            <span style={{ fontSize: '0.75rem', padding: '0.08rem 0.42rem', borderRadius: '999px', background: 'rgba(255,255,255,0.12)', fontWeight: 700 }}>
                              {rv.sovereignTitle}
                            </span>
                          )}
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.75rem', background: '#fff', color: '#000', padding: '0.08rem 0.45rem', borderRadius: '8px' }}>
                          <BxIcon name="star" className="bx-ico-lead" />{rv.score}/10
                        </span>
                      </div>
                      {rv.pillars && (
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.35rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.68)' }}>
                          <span><BxIcon name="book" className="bx-ico-lead" />القصة: {rv.pillars.story}</span>•<span><BxIcon name="zap" className="bx-ico-lead" />التحريك: {rv.pillars.anim}</span>•
                          <span><BxIcon name="music" className="bx-ico-lead" />الموسيقى: {rv.pillars.ost}</span>•<span><BxIcon name="users" className="bx-ico-lead" />الشخصيات: {rv.pillars.char}</span>
                        </div>
                      )}
                      <p style={{ margin: 0, fontSize: '0.9375rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.45 }}>{rv.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== v8.0 NETFLIX QUICK PEEK / INFO BOTTOM SHEET ==================== */}
      {peekPresence.mounted && peekItem && (() => {
        const quickPeekAnime = peekItem;
        return (
        <div
          className={`bx-peek-layer${peekPresence.closing ? ' is-closing' : ''}`}
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
            className="bx-peek-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              borderTopLeftRadius: '18px',
              borderTopRightRadius: '18px',
              background: '#0a0a0f',
              borderTop: '1.5px solid rgba(255,255,255,0.28)',
              padding: '1.15rem 1.1rem 1.8rem',
              boxShadow: '0 -16px 48px rgba(0,0,0,0.95)',
              animation: 'bxSlideUp 0.46s cubic-bezier(0.22, 1, 0.36, 1) backwards'
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
                  <h3 style={{ margin: '0 0 0.3rem', fontSize: '1.0625rem', fontWeight: 800, lineHeight: 1.25 }}>
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
                      fontWeight: 700,
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <BxIcon name="close" />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginBottom: '0.45rem' }}>
                  {[quickPeekAnime.rating ? <><BxIcon name="star" className="bx-ico-lead" />{quickPeekAnime.rating}</> : '', quickPeekAnime.type, quickPeekAnime.year]
                    .filter(Boolean)
                    .map((part, partIdx) => (
                      <React.Fragment key={partIdx}>
                        {partIdx > 0 && <span>•</span>}
                        <span>{part}</span>
                      </React.Fragment>
                    ))}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.9375rem',
                    color: 'rgba(255,255,255,0.78)',
                    lineHeight: 1.48,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {quickPeekAnime.storyAr}
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
                  borderRadius: '12px',
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  cursor: 'pointer'
                }}
              >
                <BxIcon name="play" className="bx-ico-lead" />{isRtl ? 'تشغيل الآن' : 'Play Now'}
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
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.22)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                <BxIcon name="landmark" className="bx-ico-lead" />{isRtl ? 'الحلقات' : 'Hub'}
              </button>
              <button
                type="button"
                onClick={() => toggleFavorite(quickPeekAnime)}
                style={{
                  padding: '0.68rem 0.75rem',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.22)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                {favorites.some((f) => f.objectID === quickPeekAnime.objectID) ? <BxIcon name="check" /> : <BxIcon name="plus" />}
              </button>
              <button
                type="button"
                onClick={() => handleToggleSpeakText(quickPeekAnime.storyAr || quickPeekAnime.titleEn)}
                style={{
                  padding: '0.68rem 0.75rem',
                  borderRadius: '12px',
                  background: ttsSpeaking ? '#ffffff' : 'rgba(255,255,255,0.1)',
                  color: ttsSpeaking ? '#000000' : '#ffffff',
                  border: '1px solid rgba(255,255,255,0.22)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                <BxIcon name="volume" />
              </button>
            </div>
          </div>
        </div>
        );
      })()}

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
              {(storyPreviewAnime.pool || popularList.slice(0, 12)).map((poolItem, sIdx, pool) => (
                <div
                  key={`sbar-${sIdx}`}
                  onClick={() => setStoryPreviewAnime({ item: poolItem, index: sIdx, pool })}
                  style={{
                    flex: 1,
                    height: '3px',
                    borderRadius: '999px',
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
                  <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{storyPreviewAnime.item.titleEn}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                    {storyPreviewAnime.pool ? (isRtl ? 'بتنزل النهارده' : 'Airing today') : isRtl ? 'الأكثر مشاهدة' : 'Most popular'}{` • ${(storyPreviewAnime.index || 0) + 1}/${(storyPreviewAnime.pool || popularList.slice(0, 12)).length}`}
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
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  cursor: 'pointer'
                }}
              >
                <BxIcon name="close" />
              </button>
            </div>
          </div>

          {/* Middle Invisible Left/Right Tap Zones to Cycle Stories */}
          <div style={{ position: 'relative', zIndex: 4, flex: 1, display: 'flex' }}>
            <div
              onClick={() => {
                const pool = storyPreviewAnime.pool || popularList.slice(0, 12);
                const prevIdx = ((storyPreviewAnime.index || 0) - 1 + pool.length) % pool.length;
                setStoryPreviewAnime({ item: pool[prevIdx], index: prevIdx, pool });
              }}
              style={{ flex: 1, cursor: 'pointer' }}
            />
            <div
              onClick={() => {
                const pool = storyPreviewAnime.pool || popularList.slice(0, 12);
                const nextIdx = ((storyPreviewAnime.index || 0) + 1) % pool.length;
                setStoryPreviewAnime({ item: pool[nextIdx], index: nextIdx, pool });
              }}
              style={{ flex: 1, cursor: 'pointer' }}
            />
          </div>

          {/* Bottom Story Details & Instant Action Deck */}
          <div style={{ position: 'relative', zIndex: 5, padding: '1rem 1.15rem 1.8rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              {storyPreviewAnime.item.rating && (
                <span
                  style={{
                    padding: '0.18rem 0.55rem',
                    borderRadius: '8px',
                    background: '#ffffff',
                    color: '#000000',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  <BxIcon name="star" className="bx-ico-lead" />{storyPreviewAnime.item.rating}
                </span>
              )}
              {[storyPreviewAnime.item.type, storyPreviewAnime.item.state].filter(Boolean).length > 0 && (
                <span
                  style={{
                    padding: '0.18rem 0.55rem',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.14)',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  {[storyPreviewAnime.item.type, storyPreviewAnime.item.state].filter(Boolean).join(' • ')}
                </span>
              )}
            </div>

            <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.375rem', fontWeight: 800, lineHeight: 1.25 }}>
              {storyPreviewAnime.item.titleEn}
            </h2>

            <p
              style={{
                margin: '0 0 1rem',
                fontSize: '0.9375rem',
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
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  cursor: 'pointer'
                }}
              >
                <BxIcon name="play" className="bx-ico-lead" />{isRtl ? 'تشغيل' : 'Play'}
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
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                <BxIcon name="info" className="bx-ico-lead" />{isRtl ? 'التفاصيل' : 'Details'}
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
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  cursor: 'pointer'
                }}
              >
                {favorites.some((f) => f.objectID === storyPreviewAnime.item.objectID) ? <BxIcon name="check" /> : <BxIcon name="plus" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Playback settings (PlayerControls settings button in full screen) */}
      <BottomSheet
        open={playerMoreOpen && Boolean(activeEpisode)}
        onClose={() => setPlayerMoreOpen(false)}
        title={isRtl ? 'إعدادات التشغيل' : 'Playback'}
        closeLabel={isRtl ? 'إغلاق' : 'Close'}
        layerClassName="bx-sheet-over-player"
      >
        <section className="bx-filter-group">
          <h4>{isRtl ? 'السرعة' : 'Speed'}</h4>
          <div className="bx-filter-chips">
            {[0.75, 1, 1.25, 1.5, 2].map((sp) => (
              <button
                key={sp}
                type="button"
                className={`bx-chip${playbackSpeed === sp ? ' is-active' : ''}`}
                aria-pressed={playbackSpeed === sp}
                onClick={() => {
                  setPlaybackSpeed(sp);
                  if (videoRef.current) videoRef.current.playbackRate = sp;
                }}
              >
                {`${sp}x`}
              </button>
            ))}
          </div>
        </section>
        <section className="bx-filter-group">
          <h4>{isRtl ? 'قفز سريع' : 'Jump'}</h4>
          <div className="bx-filter-chips">
            <button type="button" className="bx-chip" onClick={() => seekVideoBy(-600)}>
              {isRtl ? '− 10 دقايق' : '−10 min'}
            </button>
            <button type="button" className="bx-chip" onClick={() => seekVideoBy(600)}>
              {isRtl ? '+ 10 دقايق' : '+10 min'}
            </button>
            <button type="button" className="bx-chip" onClick={skipIntroManually}>
              {skipSegments.some((sg) => sg.type === 'op') ? (isRtl ? 'تخطي المقدمة' : 'Skip intro') : isRtl ? 'قدّم 85 ثانية' : '+85 s'}
            </button>
          </div>
        </section>
        <section className="bx-filter-group">
          <h4>{isRtl ? 'مقاس الصورة' : 'Picture fit'}</h4>
          <div className="bx-filter-chips">
            {[
              ['cover', isRtl ? 'ملء الشاشة' : 'Fill screen'],
              ['contain', isRtl ? 'الأصلي' : 'Original'],
              ['fill', isRtl ? 'تمديد' : 'Stretch']
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`bx-chip${videoFitMode === id ? ' is-active' : ''}`}
                aria-pressed={videoFitMode === id}
                onClick={() => setVideoFitMode(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
        <section className="bx-filter-group">
          <h4>{isRtl ? 'الصورة والصوت' : 'Picture & sound'}</h4>
          <div className="bx-filter-chips">
            <button type="button" className={`bx-chip${visualShaderMode !== 'original' ? ' is-active' : ''}`} onClick={handleCycleVisualShader}>
              <BxIcon name="wand" size="1em" />
              {visualShaderMode === 'upscale4k'
                ? isRtl ? 'خطوط أوضح' : 'Sharper lines'
                : visualShaderMode === 'amoled_hdr'
                ? isRtl ? 'تباين أعلى' : 'More contrast'
                : visualShaderMode === 'cinema_imax'
                ? isRtl ? 'ألوان دافية' : 'Warm colours'
                : isRtl ? 'الصورة: أصلية' : 'Picture: original'}
            </button>
            <button type="button" className={`bx-chip${audioBoostMode !== 'normal' ? ' is-active' : ''}`} onClick={handleCycleAudioBooster}>
              <BxIcon name={audioBoostMode === 'voice' ? 'mic' : 'volume'} size="1em" />
              {audioBoostMode === 'boost200'
                ? isRtl ? 'الصوت 200%' : 'Volume 200%'
                : audioBoostMode === 'boost150'
                ? isRtl ? 'الصوت 150%' : 'Volume 150%'
                : audioBoostMode === 'voice'
                ? isRtl ? 'وضوح الكلام' : 'Clear voices'
                : isRtl ? 'الصوت 100%' : 'Volume 100%'}
            </button>
            <button type="button" className="bx-chip" onClick={handleTakeVideoSnapshot}>
              <BxIcon name="camera" size="1em" />
              {isRtl ? 'لقطة' : 'Snapshot'}
            </button>
          </div>
        </section>
      </BottomSheet>

      {/* Search filters (bottom sheet) */}
      <FilterSheet
        open={filterSheetOpen && activeTab === 'catalog' && !selectedAnime}
        onClose={() => setFilterSheetOpen(false)}
        isRtl={isRtl}
        value={catalogFilterValue}
        onApply={applyCatalogFilters}
        types={TYPE_FILTERS}
        states={STATE_FILTERS}
        studios={STUDIO_FILTERS}
        genres={GENRE_CHIPS}
      />

      {/* ==================== ACCESS MENU (opened from the top bar) ==================== */}
      {menuPresence.mounted && (
        <div className={`bx-menu-backdrop${menuPresence.closing ? ' is-closing' : ''}`} onClick={() => setCommandMenuOpen(false)} role="presentation">
          <div
            className="bx-menu-card"
            role="dialog"
            aria-modal="true"
            aria-label={isRtl ? 'القائمة' : 'Menu'}
            onClick={(e) => e.stopPropagation()}
            style={{ transformOrigin: isRtl ? 'top left' : 'top right' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.3rem 0.6rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)' }}>
                {isRtl ? 'القائمة' : 'MENU'}
              </span>
              <button
                type="button"
                className="bx-round-btn"
                onClick={() => setCommandMenuOpen(false)}
                aria-label={isRtl ? 'إغلاق' : 'Close'}
                style={{ width: '34px', height: '34px', fontSize: '1.0625rem', boxShadow: 'none' }}
              >
                <BxIcon name="close" />
              </button>
            </div>

            <button
              type="button"
              className="bx-menu-item"
              onClick={() => goToTab('profile')}
              style={{
                '--i': 0,
                padding: '0.55rem 0.6rem',
                marginBottom: '0.45rem',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0 }}>
                <span className="bx-avatar-btn" style={{ width: '44px', height: '44px', boxShadow: 'none', flexShrink: 0 }}>
                  {avatarPhoto ? (
                    <img src={avatarPhoto} alt="" referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} />
                  ) : user ? (
                    <span>{(user.displayName?.[0] || user.username?.[0] || 'X').toUpperCase()}</span>
                  ) : (
                    <BxIcon name="user" />
                  )}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, textAlign: 'start' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9375rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.displayName || (isRtl ? 'زائر' : 'Guest')}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                    {user
                      ? isRtl
                        ? 'الملف الشخصي ومكتبتي'
                        : 'Profile & library'
                      : isRtl
                      ? 'سجّل دخولك لمزامنة مكتبتك مع الموقع'
                      : 'Sign in to sync with the website'}
                  </span>
                </span>
              </span>
              <BxIcon name={isRtl ? 'chevron-left' : 'chevron-right'} style={{ opacity: 0.55 }} />
            </button>

            {[
              {
                id: 'mylist',
                icon: 'bookmark',
                label: isRtl ? 'قائمتي' : 'My list',
                badge: favorites.length || null,
                onClick: () =>
                  goToTab('profile', () => {
                    setProfileSubTab('vault');
                    setLibrarySubTab('favorites');
                  })
              },
              {
                id: 'history',
                icon: 'clock',
                label: isRtl ? 'سجل المشاهدة' : 'Watch history',
                badge: null,
                onClick: () =>
                  goToTab('profile', () => {
                    setProfileSubTab('vault');
                    setLibrarySubTab('history');
                  })
              },
              {
                id: 'radar',
                icon: 'bell',
                label: isRtl ? 'تنبيهات الحلقات' : 'Episode alerts',
                badge: null,
                onClick: () => {
                  setCommandMenuOpen(false);
                  setRadarModalOpen(true);
                }
              },
              {
                id: 'offline',
                icon: 'download',
                label: isRtl ? 'التنزيلات' : 'Downloads',
                badge: offlineChapters.length || null,
                onClick: () =>
                  goToTab('profile', () => {
                    setProfileSubTab('vault');
                    setLibrarySubTab('offline');
                  })
              },
              {
                id: 'vip',
                icon: 'crown',
                label: isRtl ? 'العضوية و VIP' : 'Membership & VIP',
                badge: userVipTier !== 'free' || isDeveloper ? 'VIP' : null,
                onClick: () => goToTab('profile', () => setProfileSubTab('account'))
              },
              {
                id: 'settings',
                icon: 'settings',
                label: isRtl ? 'الإعدادات' : 'Settings',
                badge: null,
                onClick: () => goToTab('profile', () => setProfileSubTab('appearance'))
              }
            ].map((item, idx) => (
              <button key={item.id} type="button" className="bx-menu-item" style={{ '--i': idx + 1 }} onClick={item.onClick}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                  <span className="bx-menu-ico">
                    <BxIcon name={item.icon} />
                  </span>
                  <span style={{ textAlign: 'start' }}>{item.label}</span>
                </span>
                {item.badge ? <span className="bx-menu-badge">{item.badge}</span> : null}
              </button>
            ))}

            {/* App info (moved here from the old top header) */}
            <div
              className="bx-fade"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginTop: '0.55rem',
                padding: '0.75rem 0.6rem 0.2rem',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                animationDelay: '0.45s'
              }}
            >
              <img src="/blackx-logo.png" alt="" style={{ width: '30px', height: '30px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.22)' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>BLACK X</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>
                  {isRtl
                    ? `إصدار ${BX_APK_VERSION}${bxAnimeTotal ? ` • ${formatBxCount(bxAnimeTotal)} أنمي` : ''}`
                    : `Version ${BX_APK_VERSION}${bxAnimeTotal ? ` • ${formatBxCount(bxAnimeTotal)} anime` : ''}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== BOTTOM DOCK (MobileDock.jsx) — hidden while the player / reader is open ==================== */}
      <MobileDock
        activeTab={selectedAnime ? null : activeTab}
        hidden={Boolean((activeEpisode && !playerMinimized) || videoFullscreen || activeMangaChapter)}
        isRtl={isRtl}
        onSelect={goToTab}
      />

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
                  borderRadius: '18px',
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
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  marginBottom: '0.45rem'
                }}
              >
                <BxIcon name="crown" className="bx-ico-lead" />BLACK X VIP PREMIERE ACCESS
              </span>
              <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.375rem', fontWeight: 800 }}>
                {isRtl ? 'اشترك في باقات BLACK X VIP للمتابعة' : 'BLACK X VIP Subscription Required'}
              </h1>
              <p style={{ margin: 0, fontSize: '0.9375rem', color: 'rgba(255,255,255,0.68)', lineHeight: 1.55 }}>
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
                borderRadius: '18px',
                background: '#0b0b0f',
                border: '1.5px solid #ffffff',
                marginBottom: '1rem',
                boxShadow: '0 10px 30px rgba(255,255,255,0.08)'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.45rem' }}>
                <BxIcon name="key" className="bx-ico-lead" />{isRtl ? 'لديك كود تفعيل VIP؟ أدخله هنا للفتح الفوري:' : 'Have a VIP Activation Code? Redeem Instantly:'}
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
                    borderRadius: '12px',
                    background: '#000000',
                    border: '1px solid rgba(255,255,255,0.28)',
                    color: '#ffffff',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '0.8125rem'
                  }}
                />
                <button
                  type="submit"
                  disabled={vipRedeemBusy}
                  style={{
                    padding: '0 1.15rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#ffffff',
                    color: '#000000',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    cursor: 'pointer'
                  }}
                >
                  {vipRedeemBusy ? <BxIcon name="loader" /> : isRtl ? 'تفعيل الآن' : 'Activate'}
                </button>
              </div>
            </form>

            {/* The 2 Official BLACK X VIP Plans (Matches Website 100%) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.8rem', marginBottom: '1rem' }}>
              {/* Plan 1: Monarch VIP 199 EGP */}
              <div
                style={{
                  padding: '1.05rem',
                  borderRadius: '18px',
                  background: 'linear-gradient(145deg, #121218 0%, #07070a 100%)',
                  border: '1.5px solid #ffffff',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                    <BxIcon name="crown" className="bx-ico-lead" />{isRtl ? 'باقة الملك' : 'Monarch VIP Plan'}
                  </span>
                  <span
                    style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '8px',
                      background: '#ffffff',
                      color: '#000000',
                      fontWeight: 700,
                      fontSize: '0.8125rem'
                    }}
                  >
                    199 {isRtl ? 'ج.م / شهرياً' : 'EGP / mo'}
                  </span>
                </div>
                <ul style={{ margin: '0 0 0.75rem', paddingInlineStart: '1.1rem', fontSize: '0.9375rem', color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>
                  <li>{isRtl ? 'فتح جميع سيرفرات BLACK X المتاحة على الموقع' : 'Every BLACK X server available on the website'}</li>
                  <li>{isRtl ? 'فتح مكتبة المانجا والمانهوا كاملة بشاشة كاملة وتحميل مباشر' : 'Full Manga & Manhwa library + Direct Download'}</li>
                  <li>{isRtl ? 'تعمل على الموقع الرسمي وتطبيق الهاتف بنفس الحساب' : 'Works on both Website and Mobile APK'}</li>
                </ul>

                <div
                  style={{
                    padding: '0.65rem 0.8rem',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.55rem'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                      <BxIcon name="smartphone" className="bx-ico-lead" />{isRtl ? 'رقم محفظة فودافون كاش للتحويل:' : 'Vodafone Cash Wallet:'}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '0.05em' }}>
                      01094965378
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText('01094965378');
                      showToast('اتنسخ رقم فودافون كاش: 01094965378', 'check');
                    }}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: '8px',
                      background: '#ffffff',
                      color: '#000000',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    <BxIcon name="copy" className="bx-ico-lead" />{isRtl ? 'نسخ الرقم' : 'Copy'}
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
                    borderRadius: '12px',
                    background: '#ffffff',
                    color: '#000000',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    textDecoration: 'none'
                  }}
                >
                  <BxIcon name="message" className="bx-ico-lead" />{isRtl ? 'إرسال إيصال التحويل واستلام كود VIP فوراً' : 'Send Transfer Receipt & Get VIP Code'}
                </a>
              </div>

              {/* Plan 2: Basic VIP 99 EGP */}
              <div
                style={{
                  padding: '0.95rem',
                  borderRadius: '18px',
                  background: '#0a0a0e',
                  border: '1px solid rgba(255,255,255,0.22)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                    <BxIcon name="zap" className="bx-ico-lead" />{isRtl ? 'الباقة الأساسية' : 'Basic VIP Plan'}
                  </span>
                  <span
                    style={{
                      padding: '0.18rem 0.55rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.14)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.75rem'
                    }}
                  >
                    99 {isRtl ? 'ج.م / شهرياً' : 'EGP / mo'}
                  </span>
                </div>
                <p style={{ margin: '0 0 0.55rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.72)' }}>
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
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    textDecoration: 'none'
                  }}
                >
                  <BxIcon name="message" className="bx-ico-lead" />{isRtl ? 'طلب كود الباقة الأساسية (99 ج.م)' : 'Request Basic VIP Code (99 EGP)'}
                </a>
              </div>
            </div>

            {/* Sign-In Section for Existing Subscribers or Developer Account */}
            <div
              style={{
                padding: '1rem',
                borderRadius: '18px',
                background: '#0a0a0e',
                border: '1px solid rgba(255,255,255,0.18)'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                <BxIcon name="lock" className="bx-ico-lead" />{isRtl ? 'مشترك بالفعل أو صاحب حساب المطور؟ سجّل دخولك:' : 'Already VIP or Developer? Sign In:'}
              </div>

              {user ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem' }}>
                    {isRtl ? 'داخل باسم:' : 'Signed in as:'} <strong>{user.displayName || user.email}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      apkSignOut();
                      setSessionToken(null);
                      setUser(null);
                      localStorage.removeItem('bx_mob_user');
                    }}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.24)',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
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
                      borderRadius: '12px',
                      background: '#ffffff',
                      color: '#000000',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      cursor: 'pointer'
                    }}
                  >
                    G {isRtl ? 'الدخول بحساب Google' : 'Sign in with Google'}
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
                        borderRadius: '12px',
                        background: '#000',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: '0.75rem'
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
                        borderRadius: '12px',
                        background: '#000',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        fontSize: '0.75rem'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={authBusy}
                      style={{
                        padding: '0.6rem 0.95rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'rgba(255,255,255,0.18)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.75rem',
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
