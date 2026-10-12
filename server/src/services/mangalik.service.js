import axios from 'axios';

/**
 * BLACK X Multi-Server Manga & Manhwa Engine (v2.0)
 * ---------------------------------------------------------------------------
 * Exclusively branded under BLACK X with 3 high-availability servers:
 *  - Server 1 (bx1): BLACK X 1 (OlympusStaff / Team X — https://olympustaff.com)
 *    -> #1 Arabic Manhwa, Webtoon & Chinese Manhua engine (200 OK direct CDN)
 *  - Server 2 (bx2): BLACK X 2 (3asq / مانجا العاشق — https://3asq.online)
 *    -> #1 Arabic Japanese Manga engine (One Piece, Berserk, HxH, Kingdom, JJK...)
 *  - Server 3 (bx3): BLACK X 3 (WeebCentral + MangaDex API v5 — https://weebcentral.com)
 *    -> #1 Complete Global Manga & Manhwa Official Rip engine (100% catalog)
 */

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const OLYMPUS_BASE = 'https://olympustaff.com';
const ASQ_BASE = 'https://3asq.online';
const WEEBCENTRAL_BASE = 'https://weebcentral.com';
const MANGADEX_API = 'https://api.mangadex.org';

/**
 * Curated cross-server mapping for flagship Manga & Manhwa titles so every card
 * in the library resolves immediately across BLACK X 1, BLACK X 2, and BLACK X 3.
 */
export const FLAGSHIP_MANGA_MAP = {
  'solo-leveling': {
    osSlug: 'SL',
    asqSlug: 'solo-leveling',
    wcSeriesId: '01J76XYCPSY3C4BNPBRY8JMCBE',
    wcSlug: 'Solo-Leveling',
    title_ar: 'سولو ليفلينج (ارتقاء المستوى الفردي)',
    title_en: 'Solo Leveling',
    type: 'MANHWA',
    poster: 'https://olympustaff.com/images/manga/thumbnail_b05147568d52f22c663c084172fc0dac.png',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XYCPSY3C4BNPBRY8JMCBE.jpg'
  },
  'omniscient-readers-viewpoint': {
    osSlug: 'OR',
    asqSlug: null,
    wcSeriesId: '01J76XYDMWWJX3T4BFWR84FQQK',
    wcSlug: 'Omniscient-Readers-Viewpoint',
    title_ar: 'وجهة نظر القارئ العليم (Omniscient Reader)',
    title_en: "Omniscient Reader's Viewpoint",
    type: 'MANHWA',
    poster: 'https://olympustaff.com/images/manga/thumbnail_41d0a8bf257ed44612cabef8a04da121.jpg',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XYDMWWJX3T4BFWR84FQQK.jpg'
  },
  'solo-swordmaster': {
    osSlug: 'SYS',
    asqSlug: null,
    wcSeriesId: '01J76XYG8FNWRR3PHEFKN2NB87',
    wcSlug: 'The-Swordmasters-Son',
    title_ar: 'الابن الأصغر لسيد السيف (Swordmaster’s Youngest Son)',
    title_en: "Swordmaster's Youngest Son",
    type: 'MANHWA',
    poster: 'https://olympustaff.com/images/manga/thumbnail_02ef7b4388c9ce84dae27df148846dad.png',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XYG8FNWRR3PHEFKN2NB87.jpg'
  },
  'nano-machine': {
    osSlug: null,
    asqSlug: null,
    wcSeriesId: '01J76XYDT7H7ANER8KJG5R9SJV',
    wcSlug: 'Nano-Machine',
    title_ar: 'نانو ماشين (Nano Machine)',
    title_en: 'Nano Machine',
    type: 'MANHWA',
    poster: 'https://temp.compsci88.com/cover/fallback/01J76XYDT7H7ANER8KJG5R9SJV.jpg',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XYDT7H7ANER8KJG5R9SJV.jpg'
  },
  'magic-emperor': {
    osSlug: 'demonic-emperor',
    asqSlug: null,
    wcSeriesId: '01J76XYDT3Z0ZJ7NNG4Q74QFFG',
    wcSlug: 'Magic-Emperor',
    title_ar: 'الإمبراطور الشيطاني (Demonic Emperor)',
    title_en: 'Magic Emperor',
    type: 'MANHWA',
    poster: 'https://olympustaff.com/images/manga/thumbnail_11809d13c563e62b8f74fea18dbe2417.jpg',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XYDT3Z0ZJ7NNG4Q74QFFG.jpg'
  },
  'return-of-the-mount-hua-sect': {
    osSlug: 'mount-hua-sects-genius-phantom-swordsman',
    asqSlug: null,
    wcSeriesId: '01J76XYEVCSS5ANBCJZ4ZF9P65',
    wcSlug: 'Return-of-the-Blossoming-Blade',
    title_ar: 'عودة طائفة جبل هوا (Return of the Mount Hua Sect)',
    title_en: 'Return of the Mount Hua Sect',
    type: 'MANHWA',
    poster: 'https://temp.compsci88.com/cover/fallback/01J76XYEVCSS5ANBCJZ4ZF9P65.jpg',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XYEVCSS5ANBCJZ4ZF9P65.jpg'
  },
  'the-beginning-after-the-end': {
    osSlug: 'BATE',
    asqSlug: null,
    wcSeriesId: '01J76XYE23859ZWDP7BJ520AKY',
    wcSlug: 'The-Beginning-After-The-End',
    title_ar: 'البداية بعد النهاية (The Beginning After The End)',
    title_en: 'The Beginning After The End',
    type: 'MANHWA',
    poster: 'https://olympustaff.com/images/manga/thumbnail_db3bc466501c2c0fca948454cc6c63b0.jpg',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XYE23859ZWDP7BJ520AKY.jpg'
  },
  lookism: {
    osSlug: 'lookism',
    asqSlug: null,
    wcSeriesId: '01J76XYBD282Y3XKX0KRGD64Q5',
    wcSlug: 'Lookism',
    title_ar: 'المظهر (Lookism)',
    title_en: 'Lookism',
    type: 'MANHWA',
    poster: 'https://olympustaff.com/images/manga/thumbnail_bb9989fc65ac9c01f855763102c4a102.png',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XYBD282Y3XKX0KRGD64Q5.jpg'
  },
  eleceed: {
    osSlug: 'ECD',
    asqSlug: null,
    wcSeriesId: '01J76XYD3Q2Q7HYYMB3FSDPSKC',
    wcSlug: 'Eleceed',
    title_ar: 'إليكيد (Eleceed)',
    title_en: 'Eleceed',
    type: 'MANHWA',
    poster: 'https://olympustaff.com/images/manga/thumbnail_17666987771409026756.jpg',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XYD3Q2Q7HYYMB3FSDPSKC.jpg'
  },
  'pick-me-up': {
    osSlug: 'PMU',
    asqSlug: null,
    wcSeriesId: '01J76XYGY7FDV857J4HJAZ131K',
    wcSlug: 'Pick-Me-Up-Infinite-Gacha',
    title_ar: 'بيك مي أب: غاشا لا نهائية (Pick Me Up)',
    title_en: 'Pick Me Up : Infinite Gacha',
    type: 'MANHWA',
    poster: 'https://olympustaff.com/images/manga/thumbnail_15326405871502340369.jpeg',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XYGY7FDV857J4HJAZ131K.jpg'
  },
  'one-piece': {
    osSlug: null,
    asqSlug: 'one-piece',
    wcSeriesId: '01J76XY7E9FNDZ1DBBM6PBJPFK',
    wcSlug: 'One-Piece',
    title_ar: 'ون بيس (One Piece)',
    title_en: 'One Piece',
    type: 'MANGA',
    poster: 'https://temp.compsci88.com/cover/fallback/01J76XY7E9FNDZ1DBBM6PBJPFK.jpg',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XY7E9FNDZ1DBBM6PBJPFK.jpg'
  },
  'jujutsu-kaisen': {
    osSlug: null,
    asqSlug: 'jujutsu-kaisen',
    wcSeriesId: '01J76XYCERXE60T7FKXVCCAQ0H',
    wcSlug: 'Jujutsu-Kaisen',
    title_ar: 'جوجوتسو كايسن (Jujutsu Kaisen)',
    title_en: 'Jujutsu Kaisen',
    type: 'MANGA',
    poster: 'https://temp.compsci88.com/cover/fallback/01J76XYCERXE60T7FKXVCCAQ0H.jpg',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XYCERXE60T7FKXVCCAQ0H.jpg'
  },
  'chainsaw-man': {
    osSlug: null,
    asqSlug: null,
    wcSeriesId: '01J76XYCRVY3QGYAMRR3STW941',
    wcSlug: 'Chainsaw-Man',
    title_ar: 'رجل المنشار (Chainsaw Man)',
    title_en: 'Chainsaw Man',
    type: 'MANGA',
    poster: 'https://temp.compsci88.com/cover/fallback/01J76XYCRVY3QGYAMRR3STW941.jpg',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XYCRVY3QGYAMRR3STW941.jpg'
  },
  'blue-lock': {
    osSlug: null,
    asqSlug: null,
    wcSeriesId: '01J76XYD7E91K8QP6CY0Y53900',
    wcSlug: 'Blue-Lock',
    title_ar: 'بلو لوك (Blue Lock)',
    title_en: 'Blue Lock',
    type: 'MANGA',
    poster: 'https://temp.compsci88.com/cover/fallback/01J76XYD7E91K8QP6CY0Y53900.jpg',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XYD7E91K8QP6CY0Y53900.jpg'
  },
  kingdom: {
    osSlug: null,
    asqSlug: 'kingdom',
    wcSeriesId: '01J76XY7VSG3R5ANYPDWTXDVP6',
    wcSlug: 'Kingdom',
    title_ar: 'المملكة (Kingdom)',
    title_en: 'Kingdom',
    type: 'MANGA',
    poster: 'https://temp.compsci88.com/cover/fallback/01J76XY7VSG3R5ANYPDWTXDVP6.jpg',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XY7VSG3R5ANYPDWTXDVP6.jpg'
  },
  berserk: {
    osSlug: null,
    asqSlug: 'berserk',
    wcSeriesId: '01J76XY7EF75DJNQCV04HTPDZK',
    wcSlug: 'Berserk',
    title_ar: 'بيرسيرك (Berserk)',
    title_en: 'Berserk',
    type: 'MANGA',
    poster: 'https://temp.compsci88.com/cover/fallback/01J76XY7EF75DJNQCV04HTPDZK.jpg',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XY7EF75DJNQCV04HTPDZK.jpg'
  },
  'hunter-x-hunter': {
    osSlug: null,
    asqSlug: 'hunter-x-hunter',
    wcSeriesId: '01J76XY7EXQV9RE9KQ3JYE0WZ9',
    wcSlug: 'Hunter-X-Hunter',
    title_ar: 'القناص (Hunter X Hunter)',
    title_en: 'Hunter X Hunter',
    type: 'MANGA',
    poster: 'https://temp.compsci88.com/cover/fallback/01J76XY7EXQV9RE9KQ3JYE0WZ9.jpg',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XY7EXQV9RE9KQ3JYE0WZ9.jpg'
  },
  bleach: {
    osSlug: null,
    asqSlug: null,
    wcSeriesId: '01J76XY7E4JCPK14V53BVQWD9Y',
    wcSlug: 'Bleach',
    title_ar: 'بليتش (Bleach)',
    title_en: 'Bleach',
    type: 'MANGA',
    poster: 'https://temp.compsci88.com/cover/fallback/01J76XY7E4JCPK14V53BVQWD9Y.jpg',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XY7E4JCPK14V53BVQWD9Y.jpg'
  },
  'black-clover': {
    osSlug: null,
    asqSlug: null,
    wcSeriesId: '01J76XYB8HNWARAQ67A4GAWG5Y',
    wcSlug: 'Black-Clover',
    title_ar: 'بلاك كلوفر (Black Clover)',
    title_en: 'Black Clover',
    type: 'MANGA',
    poster: 'https://temp.compsci88.com/cover/fallback/01J76XYB8HNWARAQ67A4GAWG5Y.jpg',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XYB8HNWARAQ67A4GAWG5Y.jpg'
  },
  boruto: {
    osSlug: 'BTBV',
    asqSlug: null,
    wcSeriesId: '01J76XYGF6FZPSQW5WFC1Y21EX',
    wcSlug: 'Boruto-Two-Blue-Vortex',
    title_ar: 'بوروتو (Boruto: Two Blue Vortex)',
    title_en: 'Boruto: Two Blue Vortex',
    type: 'MANGA',
    poster: 'https://olympustaff.com/images/manga/thumbnail_952306554814455554.jpg',
    banner: 'https://temp.compsci88.com/cover/fallback/01J76XYGF6FZPSQW5WFC1Y21EX.jpg'
  }
};

const ARABIC_TO_ENGLISH_QUERY_MAP = [
  [/سولو|ارتقاء المستوى/i, 'Solo Leveling'],
  [/القارئ العليم|اومنيسينت/i, 'Omniscient Reader'],
  [/سيد السيف|سياف/i, 'Swordmaster'],
  [/نانو/i, 'Nano Machine'],
  [/الامبراطور الشيطاني|الإمبراطور الشيطاني|ماجيك امبيرور/i, 'Magic Emperor'],
  [/جبل هوا|طائفة جبل هوا/i, 'Return of the Blossoming Blade'],
  [/البداية بعد النهاية/i, 'The Beginning After The End'],
  [/لوكيزم|المظهر/i, 'Lookism'],
  [/اليكيد|إليكيد/i, 'Eleceed'],
  [/بيك مي اب|غاشا/i, 'Pick Me Up'],
  [/ون بيس|لوفي/i, 'One Piece'],
  [/جوجوتسو|سوكونا|غوجو/i, 'Jujutsu Kaisen'],
  [/رجل المنشار|تشينسو/i, 'Chainsaw Man'],
  [/بلو لوك/i, 'Blue Lock'],
  [/المملكة|كينغدوم|كينجدوم/i, 'Kingdom'],
  [/بيرسيرك|غاتس/i, 'Berserk'],
  [/القناص|هانتر|هنتر/i, 'Hunter x Hunter'],
  [/بليتش|ايتشيغو/i, 'Bleach'],
  [/بلاك كلوفر|استا/i, 'Black Clover'],
  [/بوروتو|ناروتو/i, 'Boruto'],
  [/هجوم العمالقة|اتاك/i, 'Attack on Titan'],
  [/قاتل الشياطين|كيميتسو/i, 'Demon Slayer'],
  [/طوكيو غول/i, 'Tokyo Ghoul'],
  [/ديث نوت|مذكرة الموت/i, 'Death Note'],
  [/فاجابوند|فاغابوند/i, 'Vagabond'],
  [/فينلاند ساغا/i, 'Vinland Saga'],
  [/مونستر/i, 'Monster'],
  [/وان بانش مان|سايتاما/i, 'One Punch Man'],
  [/دراغون بول/i, 'Dragon Ball'],
  [/فيري تيل/i, 'Fairy Tail'],
  [/برج الاله|تاور اوف غود/i, 'Tower of God'],
  [/داندادان/i, 'Dandadan'],
  [/ساكاموتو/i, 'Sakamoto Days'],
  [/كايجو/i, 'Kaiju No. 8']
];

function decodeHtmlEntities(str = '') {
  return String(str)
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function normalizeQueryToEnglish(query = '') {
  const q = String(query).trim();
  for (const [regex, en] of ARABIC_TO_ENGLISH_QUERY_MAP) {
    if (regex.test(q)) return en;
  }
  return q;
}

// Simple in-memory cache with 15-minute TTL
const memCache = new Map();
function getCache(key) {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.exp) {
    memCache.delete(key);
    return null;
  }
  return entry.val;
}
function setCache(key, val, ttlMs = 15 * 60 * 1000) {
  memCache.set(key, { val, exp: Date.now() + ttlMs });
  return val;
}

class MangalikService {
  /* =========================================================================
   * ENGINE 1: BLACK X 1 — OlympusStaff / Team X (https://olympustaff.com)
   * ========================================================================= */

  async getOlympusCatalog(page = 1) {
    const cacheKey = `os:catalog:${page}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    try {
      const { data: html } = await axios.get(`${OLYMPUS_BASE}/series?page=${page}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
        timeout: 12000
      });

      const items = [];
      const seen = new Set();
      const blocks = String(html).split('<div class="bs">').slice(1);
      for (const block of blocks) {
        const hrefMatch = block.match(/href="https:\/\/olympustaff\.com\/series\/([^"\/?#]+)"/i);
        const imgMatch = block.match(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/i);
        const typeMatch = block.match(/<span\s+class="type">([^<]+)<\/span>/i);
        const statusMatch = block.match(/<span\s+class="status">([^<]+)<\/span>/i);
        if (!hrefMatch) continue;

        const slug = hrefMatch[1].trim();
        if (seen.has(slug)) continue;
        seen.add(slug);

        const title = decodeHtmlEntities(imgMatch?.[2] || slug.replace(/-/g, ' '));
        const poster = (imgMatch?.[1] || '').trim().replace(/ /g, '%20');
        const rawType = (typeMatch?.[1] || '').trim();
        const isManga = /ياباني|مانجا/i.test(rawType);

        items.push({
          id: `os:${slug}`,
          mangalikSlug: `os:${slug}`,
          title,
          title_ar: title,
          title_en: title,
          poster,
          coverImage: poster,
          banner: poster,
          type: isManga ? 'MANGA' : 'MANHWA',
          status: statusMatch?.[1]?.trim() || 'مستمر',
          rating: 9.6,
          chapters_count: 85,
          author: 'سيرفر BLACK X 1 (مترجم للعربية)',
          description_ar: `اقرأ ${title} مترجماً باللغة العربية بجودة فائقة مباشرة عبر سيرفر BLACK X 1.`,
          description_en: `Read ${title} in high resolution directly on BLACK X 1.`,
          genres: [rawType || 'مانهوا كورية', 'أكشن', 'فانتازيا'],
          release_year: 2025,
          source: 'BLACK X 1',
          server: 'bx1'
        });
      }

      if (items.length > 0) setCache(cacheKey, items);
      return items;
    } catch (error) {
      console.error('Olympus catalog error:', error.message);
      return [];
    }
  }

  async searchOlympus(query) {
    const q = String(query || '').trim();
    if (!q) return [];
    const searchTerms = [...new Set([q, normalizeQueryToEnglish(q)])];
    const results = [];
    const seen = new Set();

    for (const term of searchTerms) {
      if (term.length < 2) continue;
      try {
        const { data: html } = await axios.get(
          `${OLYMPUS_BASE}/ajax/search?keyword=${encodeURIComponent(term)}`,
          {
            headers: {
              'User-Agent': USER_AGENT,
              'X-Requested-With': 'XMLHttpRequest',
              Referer: `${OLYMPUS_BASE}/`
            },
            timeout: 10000
          }
        );

        const regex =
          /href="https:\/\/olympustaff\.com\/series\/([^"\/?#]+)"[\s\S]*?<img[^>]+src="([^"]+)"[^>]+alt="([^"]+)"/gi;
        let match;
        while ((match = regex.exec(String(html))) !== null) {
          const slug = match[1].trim();
          if (seen.has(slug)) continue;
          seen.add(slug);

          const poster = match[2].trim().replace(/ /g, '%20');
          const title = decodeHtmlEntities(match[3] || slug);
          results.push({
            id: `os:${slug}`,
            mangalikSlug: `os:${slug}`,
            title,
            title_ar: title,
            title_en: title,
            poster,
            coverImage: poster,
            type: 'MANHWA',
            status: 'ONGOING',
            rating: 9.7,
            chapters_count: 100,
            author: 'سيرفر BLACK X 1 (مترجم)',
            description_ar: `${title} — متاح للقراءة المباشرة بالترجمة العربية عبر سيرفر BLACK X 1.`,
            description_en: `${title} — Available on BLACK X 1 Server.`,
            source: 'BLACK X 1',
            server: 'bx1'
          });
        }
      } catch (err) {
        // ignore individual search term failure
      }
    }

    return results;
  }

  async getOlympusChapters(osSlug) {
    const cleanSlug = String(osSlug || '').replace(/^os:/i, '').trim();
    if (!cleanSlug) return [];

    const cacheKey = `os:chapters:${cleanSlug}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    try {
      const { data: html } = await axios.get(
        `${OLYMPUS_BASE}/series/${encodeURIComponent(cleanSlug)}`,
        {
          headers: { 'User-Agent': USER_AGENT, Referer: `${OLYMPUS_BASE}/` },
          timeout: 12000
        }
      );

      const chapterMap = new Map();
      const escapedSlug = cleanSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const linkRegex = new RegExp(
        `href="https:\\/\\/olympustaff\\.com\\/series\\/${escapedSlug}\\/([^"\\/?#]+)"`,
        'gi'
      );

      let match;
      let maxIntChapter = 0;
      while ((match = linkRegex.exec(String(html))) !== null) {
        const chStr = match[1].trim();
        const num = parseFloat(chStr);
        if (!Number.isNaN(num)) {
          if (Math.floor(num) > maxIntChapter && num < 5000) {
            maxIntChapter = Math.floor(num);
          }
          chapterMap.set(chStr, {
            chapterId: `os:${cleanSlug}:${chStr}`,
            chapterNumber: chStr,
            slug: chStr,
            title: `الفصل ${chStr}`,
            releaseDate: '2026',
            scanlationGroup: 'سيرفر BLACK X 1 (مترجم)',
            server: 'bx1',
            url: `${OLYMPUS_BASE}/series/${cleanSlug}/${chStr}`
          });
        }
      }

      // Also check total chapter count indicator `قائمة الفصول (N)`
      const countMatch = String(html).match(/قائمة الفصول\s*\((\d+)\)/);
      if (countMatch && maxIntChapter === 0) {
        maxIntChapter = Math.min(parseInt(countMatch[1], 10) || 0, 1500);
      }

      // Fill all integer chapters 1..maxIntChapter because OlympusStaff uses sequential `/series/{slug}/{n}` URLs
      if (maxIntChapter > 0) {
        for (let n = maxIntChapter; n >= 1; n--) {
          const chStr = String(n);
          if (!chapterMap.has(chStr)) {
            chapterMap.set(chStr, {
              chapterId: `os:${cleanSlug}:${chStr}`,
              chapterNumber: chStr,
              slug: chStr,
              title: `الفصل ${chStr}`,
              releaseDate: '2026',
              scanlationGroup: 'سيرفر BLACK X 1 (مترجم)',
              server: 'bx1',
              url: `${OLYMPUS_BASE}/series/${cleanSlug}/${chStr}`
            });
          }
        }
      }

      const chapters = Array.from(chapterMap.values()).sort(
        (a, b) => (parseFloat(b.chapterNumber) || 0) - (parseFloat(a.chapterNumber) || 0)
      );

      if (chapters.length > 0) setCache(cacheKey, chapters);
      return chapters;
    } catch (error) {
      console.error(`Olympus chapters error (${cleanSlug}):`, error.message);
      return [];
    }
  }

  async getOlympusChapterPages(osSlug, chapterNum) {
    const cleanSlug = String(osSlug || '').replace(/^os:/i, '').trim();
    const cleanCh = String(chapterNum || '').trim();
    if (!cleanSlug || !cleanCh) return [];

    const cacheKey = `os:pages:${cleanSlug}:${cleanCh}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const candidateChs = [cleanCh];
    if (/^\d$/.test(cleanCh)) candidateChs.push(`0${cleanCh}`);

    for (const chTry of candidateChs) {
      try {
        const chapterUrl = `${OLYMPUS_BASE}/series/${encodeURIComponent(cleanSlug)}/${encodeURIComponent(chTry)}`;
        const { data: html } = await axios.get(chapterUrl, {
          headers: { 'User-Agent': USER_AGENT, Referer: `${OLYMPUS_BASE}/series/${cleanSlug}` },
          timeout: 14000
        });

        const pages = [];
        const seen = new Set();
        const imgRegex = /<img[^>]+(?:src|data-src)="(https:\/\/olympustaff\.com\/uploads\/[^"]+)"/gi;
        let match;
        while ((match = imgRegex.exec(String(html))) !== null) {
          const rawUrl = match[1].trim();
          // Skip TeamX static watermark banner if present
          if (/TeamX\.png|logo|avatar|banner/i.test(rawUrl)) continue;
          const normalizedUrl = rawUrl.replace(/ /g, '%20');
          if (seen.has(normalizedUrl)) continue;
          seen.add(normalizedUrl);

          pages.push({
            pageNumber: pages.length + 1,
            url: normalizedUrl,
            directUrl: normalizedUrl,
            server: 'BLACK X 1'
          });
        }

        if (pages.length > 0) {
          setCache(cacheKey, pages);
          return pages;
        }
      } catch (err) {
        // try next candidate
      }
    }

    return [];
  }

  /* =========================================================================
   * ENGINE 2: BLACK X 2 — 3asq / مانجا العاشق (https://3asq.online)
   * ========================================================================= */

  async get3asqCatalog() {
    const cacheKey = 'asq:catalog';
    const cached = getCache(cacheKey);
    if (cached) return cached;

    try {
      const { data: html } = await axios.get(`${ASQ_BASE}/manga/?m_orderby=trending`, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 12000
      });

      const items = [];
      const seen = new Set();
      const blocks = String(html).split('page-item-detail').slice(1);
      for (const block of blocks) {
        const hrefMatch = block.match(/href="https:\/\/3asq\.online\/manga\/([^"\/?#]+)\/"[^>]*title="([^"]*)"/i) ||
                          block.match(/href="https:\/\/3asq\.online\/manga\/([^"\/?#]+)\/"/i);
        if (!hrefMatch) continue;
        const slug = hrefMatch[1].trim();
        if (slug === 'feed' || seen.has(slug)) continue;
        seen.add(slug);

        const imgMatch = block.match(/src="(https:\/\/3asq\.online\/wp-content\/uploads\/[^"]+\.(?:jpg|jpeg|png|webp))"/i);
        const h3Match = block.match(/<h3[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i);
        const title = decodeHtmlEntities(h3Match?.[1] || hrefMatch[2] || slug.replace(/-/g, ' '));
        const poster = (imgMatch?.[1] || '').trim();

        items.push({
          id: `asq:${slug}`,
          mangalikSlug: `asq:${slug}`,
          title,
          title_ar: title,
          title_en: title,
          poster,
          coverImage: poster,
          banner: poster,
          type: 'MANGA',
          status: 'ONGOING',
          rating: 9.7,
          chapters_count: 120,
          author: 'سيرفر BLACK X 2 (مانجا عربية)',
          description_ar: `اقرأ مانجا ${title} بالترجمة العربية الكاملة عبر سيرفر BLACK X 2.`,
          description_en: `Read ${title} Manga in Arabic on BLACK X 2.`,
          genres: ['مانجا يابانية', 'شونين', 'أكشن'],
          release_year: 2025,
          source: 'BLACK X 2',
          server: 'bx2'
        });
      }

      if (items.length > 0) setCache(cacheKey, items);
      return items;
    } catch (error) {
      console.error('3asq catalog error:', error.message);
      return [];
    }
  }

  async search3asq(query) {
    const q = String(query || '').trim();
    if (!q) return [];
    const searchTerms = [...new Set([normalizeQueryToEnglish(q), q])];
    const results = [];
    const seen = new Set();

    for (const term of searchTerms) {
      try {
        const { data: html } = await axios.get(
          `${ASQ_BASE}/?s=${encodeURIComponent(term)}&post_type=wp-manga`,
          {
            headers: { 'User-Agent': USER_AGENT, Referer: `${ASQ_BASE}/` },
            timeout: 12000
          }
        );

        const blocks = String(html).split('c-tabs-item__content').slice(1);
        for (const block of blocks) {
          const linkMatch = block.match(/href="https:\/\/3asq\.online\/manga\/([^"\/?#]+)\/"[^>]*title="([^"]*)"/i) ||
                            block.match(/<h3[^>]*>\s*<a\s+href="https:\/\/3asq\.online\/manga\/([^"\/?#]+)\/"[^>]*>([^<]+)<\/a>/i);
          if (!linkMatch) continue;
          const slug = linkMatch[1].trim();
          if (slug === 'feed' || seen.has(slug)) continue;
          seen.add(slug);

          const imgMatch = block.match(/src="(https:\/\/3asq\.online\/wp-content\/uploads\/[^"]+\.(?:jpg|jpeg|png|webp))"/i);
          const title = decodeHtmlEntities(linkMatch[2] || slug.replace(/-/g, ' '));
          const poster = imgMatch?.[1] || '';

          results.push({
            id: `asq:${slug}`,
            mangalikSlug: `asq:${slug}`,
            title,
            title_ar: title,
            title_en: title,
            poster,
            coverImage: poster,
            type: 'MANGA',
            status: 'ONGOING',
            rating: 9.7,
            chapters_count: 100,
            author: 'سيرفر BLACK X 2 (مترجم)',
            description_ar: `${title} — متاح بالترجمة العربية المباشرة على سيرفر BLACK X 2.`,
            description_en: `${title} — Arabic Manga on BLACK X 2.`,
            source: 'BLACK X 2',
            server: 'bx2'
          });
        }
      } catch (err) {
        // ignore single term error
      }
    }

    return results;
  }

  async get3asqChapters(asqSlug) {
    const cleanSlug = String(asqSlug || '').replace(/^asq:/i, '').trim();
    if (!cleanSlug) return [];

    const cacheKey = `asq:chapters:${cleanSlug}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    try {
      const { data: html } = await axios.post(
        `${ASQ_BASE}/manga/${encodeURIComponent(cleanSlug)}/ajax/chapters/`,
        '',
        {
          headers: {
            'User-Agent': USER_AGENT,
            'X-Requested-With': 'XMLHttpRequest',
            Referer: `${ASQ_BASE}/manga/${encodeURIComponent(cleanSlug)}/`
          },
          timeout: 12000
        }
      );

      const chapters = [];
      const seen = new Set();
      const escapedSlug = cleanSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(
        `<a\\s+href="https:\\/\\/3asq\\.online\\/manga\\/${escapedSlug}\\/([^"\\/?#]+)\\/"[^>]*>([\\s\\S]*?)<\\/a>`,
        'gi'
      );

      let match;
      while ((match = regex.exec(String(html))) !== null) {
        const chSlug = match[1].trim();
        if (seen.has(chSlug)) continue;
        seen.add(chSlug);

        const rawTitle = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, '').trim());
        const numMatch = chSlug.match(/(\d+(?:\.\d+)?)/) || rawTitle.match(/(\d+(?:\.\d+)?)/);
        const chapterNumber = numMatch ? numMatch[1] : chSlug;

        chapters.push({
          chapterId: `asq:${cleanSlug}:${chSlug}`,
          chapterNumber: String(chapterNumber),
          slug: chSlug,
          title: rawTitle ? `الفصل ${rawTitle}` : `الفصل ${chapterNumber}`,
          releaseDate: '2026',
          scanlationGroup: 'سيرفر BLACK X 2 (مترجم)',
          server: 'bx2',
          url: `${ASQ_BASE}/manga/${cleanSlug}/${chSlug}/`
        });
      }

      if (chapters.length > 0) setCache(cacheKey, chapters);
      return chapters;
    } catch (error) {
      console.error(`3asq chapters error (${cleanSlug}):`, error.message);
      return [];
    }
  }

  async get3asqChapterPages(asqSlug, chSlug) {
    const cleanSlug = String(asqSlug || '').replace(/^asq:/i, '').trim();
    const cleanCh = String(chSlug || '').trim();
    if (!cleanSlug || !cleanCh) return [];

    const cacheKey = `asq:pages:${cleanSlug}:${cleanCh}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    try {
      const url = `${ASQ_BASE}/manga/${encodeURIComponent(cleanSlug)}/${encodeURIComponent(cleanCh)}/`;
      const { data: html } = await axios.get(url, {
        headers: { 'User-Agent': USER_AGENT, Referer: `${ASQ_BASE}/manga/${cleanSlug}/` },
        timeout: 14000
      });

      const pages = [];
      const seen = new Set();
      const regex =
        /(?:src|data-src)="(\s*https:\/\/3asq\.online\/wp-content\/uploads\/WP-manga\/data\/[^"]+\.(?:jpg|jpeg|png|webp)\s*)"/gi;
      let match;
      while ((match = regex.exec(String(html))) !== null) {
        const imgUrl = match[1].trim().replace(/ /g, '%20');
        if (seen.has(imgUrl)) continue;
        seen.add(imgUrl);

        pages.push({
          pageNumber: pages.length + 1,
          url: imgUrl,
          directUrl: imgUrl,
          server: 'BLACK X 2'
        });
      }

      if (pages.length > 0) setCache(cacheKey, pages);
      return pages;
    } catch (error) {
      console.error(`3asq pages error (${cleanSlug}/${cleanCh}):`, error.message);
      return [];
    }
  }

  /* =========================================================================
   * ENGINE 3: BLACK X 3 — WeebCentral + MangaDex API v5 (Global & Arabic HD)
   * ========================================================================= */

  async searchWeebCentral(query) {
    const q = String(query || '').trim();
    if (!q) return [];
    const enQuery = normalizeQueryToEnglish(q);

    try {
      const body = new URLSearchParams({ text: enQuery }).toString();
      const { data: html } = await axios.post(
        `${WEEBCENTRAL_BASE}/search/simple?location=main`,
        body,
        {
          headers: {
            'User-Agent': USER_AGENT,
            'Content-Type': 'application/x-www-form-urlencoded',
            'HX-Request': 'true',
            Origin: WEEBCENTRAL_BASE,
            Referer: `${WEEBCENTRAL_BASE}/`
          },
          timeout: 12000
        }
      );

      const results = [];
      const seen = new Set();
      const regex =
        /href="https:\/\/weebcentral\.com\/series\/([^\/"]+)\/([^"]+)"[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<div class="flex-1[^"]*">\s*([^<\n]+)/gi;

      let match;
      while ((match = regex.exec(String(html))) !== null) {
        const seriesId = match[1].trim();
        const slug = match[2].trim();
        if (seen.has(seriesId)) continue;
        seen.add(seriesId);

        const poster = match[3].trim();
        const title = decodeHtmlEntities(match[4] || slug.replace(/-/g, ' '));
        const id = `wc:${seriesId}:${slug}`;

        results.push({
          id,
          mangalikSlug: id,
          title,
          title_ar: title,
          title_en: title,
          poster,
          coverImage: poster,
          type: 'MANGA',
          status: 'ONGOING',
          rating: 9.8,
          chapters_count: 150,
          author: 'سيرفر BLACK X 3 (المكتبة العالمية الشاملة)',
          description_ar: `${title} — متاح بالكامل بدقة أصلية فائقة عبر سيرفر BLACK X 3.`,
          description_en: `${title} — Full HD Official Rips on BLACK X 3.`,
          source: 'BLACK X 3',
          server: 'bx3'
        });
      }

      return results;
    } catch (error) {
      console.error('WeebCentral search error:', error.message);
      return [];
    }
  }

  async getWeebCentralChapters(seriesId, wcSlug = 'series') {
    const cleanSeriesId = String(seriesId || '').trim();
    if (!cleanSeriesId) return [];

    const cacheKey = `wc:chapters:${cleanSeriesId}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    try {
      const { data: html } = await axios.get(
        `${WEEBCENTRAL_BASE}/series/${encodeURIComponent(cleanSeriesId)}/full-chapter-list`,
        {
          headers: {
            'User-Agent': USER_AGENT,
            'HX-Request': 'true',
            Referer: `${WEEBCENTRAL_BASE}/series/${cleanSeriesId}/${wcSlug}`
          },
          timeout: 12000
        }
      );

      const chapters = [];
      const seen = new Set();
      const regex =
        /<a\s+href="(?:https:\/\/weebcentral\.com)?\/chapters\/([A-Z0-9]+)"[\s\S]*?<span\s+class="">([^<]+)<\/span>/gi;

      let match;
      while ((match = regex.exec(String(html))) !== null) {
        const chId = match[1].trim();
        if (seen.has(chId)) continue;
        seen.add(chId);

        const rawLabel = decodeHtmlEntities(match[2].trim());
        const numMatch = rawLabel.match(/(\d+(?:\.\d+)?)/);
        const chapterNumber = numMatch ? numMatch[1] : String(chapters.length + 1);

        chapters.push({
          chapterId: `wc:${chId}`,
          chapterNumber: String(chapterNumber),
          slug: chId,
          title: `الفصل ${chapterNumber} (${rawLabel})`,
          releaseDate: '2026',
          scanlationGroup: 'سيرفر BLACK X 3 (جودة أصلية)',
          server: 'bx3',
          url: `${WEEBCENTRAL_BASE}/chapters/${chId}`
        });
      }

      if (chapters.length > 0) setCache(cacheKey, chapters);
      return chapters;
    } catch (error) {
      console.error(`WeebCentral chapters error (${cleanSeriesId}):`, error.message);
      return [];
    }
  }

  async getWeebCentralChapterPages(chId) {
    const cleanChId = String(chId || '').replace(/^wc:/i, '').trim();
    if (!cleanChId) return [];

    const cacheKey = `wc:pages:${cleanChId}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    try {
      const { data: html } = await axios.get(
        `${WEEBCENTRAL_BASE}/chapters/${encodeURIComponent(cleanChId)}/images?is_prev=False&current_page=1&reading_style=long_strip`,
        {
          headers: {
            'User-Agent': USER_AGENT,
            'HX-Request': 'true',
            Referer: `${WEEBCENTRAL_BASE}/chapters/${cleanChId}`
          },
          timeout: 14000
        }
      );

      const pages = [];
      const seen = new Set();
      const imgRegex = /<img[^>]+src="(https:\/\/[^"]+\.(?:png|jpg|jpeg|webp))"/gi;
      let match;
      while ((match = imgRegex.exec(String(html))) !== null) {
        const imgUrl = match[1].trim();
        if (/static\/images|logo|avatar/i.test(imgUrl)) continue;
        if (seen.has(imgUrl)) continue;
        seen.add(imgUrl);

        pages.push({
          pageNumber: pages.length + 1,
          url: imgUrl,
          directUrl: imgUrl,
          server: 'BLACK X 3'
        });
      }

      if (pages.length > 0) setCache(cacheKey, pages);
      return pages;
    } catch (error) {
      console.error(`WeebCentral pages error (${cleanChId}):`, error.message);
      return [];
    }
  }

  /* =========================================================================
   * UNIFIED MULTI-SERVER ROUTER (BLACK X 1 + BLACK X 2 + BLACK X 3)
   * ========================================================================= */

  /**
   * Resolves how a given series `id` maps to `bx1` (Olympus), `bx2` (3asq), and `bx3` (WeebCentral).
   */
  async resolveSeriesHandles(rawId) {
    const id = String(rawId || '').trim();
    const handles = { bx1: null, bx2: null, bx3: null };

    // 1. Check flagship map first
    if (FLAGSHIP_MANGA_MAP[id]) {
      const f = FLAGSHIP_MANGA_MAP[id];
      if (f.osSlug) handles.bx1 = f.osSlug;
      if (f.asqSlug) handles.bx2 = f.asqSlug;
      if (f.wcSeriesId) handles.bx3 = { seriesId: f.wcSeriesId, slug: f.wcSlug || id };
      return handles;
    }

    // 2. Check explicit prefixes (`os:`, `asq:`, `wc:`)
    if (id.startsWith('os:')) {
      handles.bx1 = id.slice(3);
      return handles;
    }
    if (id.startsWith('asq:')) {
      handles.bx2 = id.slice(4);
      return handles;
    }
    if (id.startsWith('wc:')) {
      const parts = id.slice(3).split(':');
      handles.bx3 = { seriesId: parts[0], slug: parts[1] || 'series' };
      return handles;
    }

    // 3. Otherwise treat `id` as a generic slug/title and probe all 3 servers in parallel
    const cleanQuery = id.replace(/-/g, ' ');
    const [osRes, asqRes, wcRes] = await Promise.allSettled([
      this.searchOlympus(cleanQuery),
      this.search3asq(cleanQuery),
      this.searchWeebCentral(cleanQuery)
    ]);

    if (osRes.status === 'fulfilled' && osRes.value.length > 0) {
      handles.bx1 = osRes.value[0].id.replace(/^os:/, '');
    }
    if (asqRes.status === 'fulfilled' && asqRes.value.length > 0) {
      handles.bx2 = asqRes.value[0].id.replace(/^asq:/, '');
    }
    if (wcRes.status === 'fulfilled' && wcRes.value.length > 0) {
      const parts = wcRes.value[0].id.replace(/^wc:/, '').split(':');
      handles.bx3 = { seriesId: parts[0], slug: parts[1] || 'series' };
    }

    return handles;
  }

  /**
   * Unified search across all 3 BLACK X Manga & Manhwa servers.
   */
  async searchArabicManga(query, serverFilter = 'all') {
    const q = String(query || '').trim();
    if (!q) return [];

    const tasks = [];
    if (serverFilter === 'all' || serverFilter === 'bx1') tasks.push(this.searchOlympus(q));
    if (serverFilter === 'all' || serverFilter === 'bx2') tasks.push(this.search3asq(q));
    if (serverFilter === 'all' || serverFilter === 'bx3') tasks.push(this.searchWeebCentral(q));

    const settled = await Promise.allSettled(tasks);
    const merged = [];
    const seenIds = new Set();

    for (const res of settled) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        for (const item of res.value) {
          if (seenIds.has(item.id)) continue;
          seenIds.add(item.id);
          merged.push(item);
        }
      }
    }

    return merged;
  }

  async searchManga(query, serverFilter = 'all') {
    return this.searchArabicManga(query, serverFilter);
  }

  /**
   * Unified chapter list fetcher with optional preferred server (`bx1`, `bx2`, `bx3`).
   */
  async getArabicChapters(mangaId, preferredServer = '') {
    const id = String(mangaId || '').trim();
    if (!id) return [];

    // Direct prefixed IDs
    if (id.startsWith('os:') && (!preferredServer || preferredServer === 'bx1')) {
      return this.getOlympusChapters(id.slice(3));
    }
    if (id.startsWith('asq:') && (!preferredServer || preferredServer === 'bx2')) {
      return this.get3asqChapters(id.slice(4));
    }
    if (id.startsWith('wc:') && (!preferredServer || preferredServer === 'bx3')) {
      const [seriesId, slug] = id.slice(3).split(':');
      return this.getWeebCentralChapters(seriesId, slug);
    }

    const handles = await this.resolveSeriesHandles(id);

    // Build ordered server priority based on user selection
    const order =
      preferredServer === 'bx1'
        ? ['bx1', 'bx2', 'bx3']
        : preferredServer === 'bx2'
        ? ['bx2', 'bx1', 'bx3']
        : preferredServer === 'bx3'
        ? ['bx3', 'bx1', 'bx2']
        : ['bx1', 'bx2', 'bx3'];

    for (const srv of order) {
      if (srv === 'bx1' && handles.bx1) {
        const chs = await this.getOlympusChapters(handles.bx1);
        if (chs.length > 0) return chs;
      }
      if (srv === 'bx2' && handles.bx2) {
        const chs = await this.get3asqChapters(handles.bx2);
        if (chs.length > 0) return chs;
      }
      if (srv === 'bx3' && handles.bx3) {
        const chs = await this.getWeebCentralChapters(handles.bx3.seriesId, handles.bx3.slug);
        if (chs.length > 0) return chs;
      }
    }

    return [];
  }

  async getChapters(mangaId, preferredServer = '') {
    return this.getArabicChapters(mangaId, preferredServer);
  }

  /**
   * Unified chapter pages fetcher supporting all 3 BLACK X servers:
   * - `os:{slug}:{ch}` -> BLACK X 1 (OlympusStaff)
   * - `asq:{slug}:{ch}` -> BLACK X 2 (3asq)
   * - `wc:{chId}` -> BLACK X 3 (WeebCentral)
   * - `{flagshipSlug}:{chNum}` -> Auto-resolves across BLACK X 1 -> BLACK X 2 -> BLACK X 3
   */
  async getArabicChapterPages(chapterIdentifier, preferredServer = '') {
    const raw = String(chapterIdentifier || '').trim();
    if (!raw) return [];

    // 1. Explicit OlympusStaff chapter ID (`os:{slug}:{ch}`)
    if (raw.startsWith('os:')) {
      const parts = raw.split(':');
      const osSlug = parts[1];
      const chNum = parts.slice(2).join(':');
      const pages = await this.getOlympusChapterPages(osSlug, chNum);
      if (pages.length > 0) return pages;
    }

    // 2. Explicit 3asq chapter ID (`asq:{slug}:{ch}`)
    if (raw.startsWith('asq:')) {
      const parts = raw.split(':');
      const asqSlug = parts[1];
      const chSlug = parts.slice(2).join(':');
      const pages = await this.get3asqChapterPages(asqSlug, chSlug);
      if (pages.length > 0) return pages;
    }

    // 3. Explicit WeebCentral chapter ID (`wc:{chId}`)
    if (raw.startsWith('wc:')) {
      const chId = raw.slice(3).split(':')[0];
      const pages = await this.getWeebCentralChapterPages(chId);
      if (pages.length > 0) return pages;
    }

    // 4. Generic `{mangaSlug}:{chapterNumber}` (e.g. `solo-leveling:1` or `one-piece:1100`)
    const lastColon = raw.lastIndexOf(':');
    const mangaId = lastColon > 0 ? raw.slice(0, lastColon) : raw;
    const chNum = lastColon > 0 ? raw.slice(lastColon + 1) : '1';

    const handles = await this.resolveSeriesHandles(mangaId);
    const order =
      preferredServer === 'bx1'
        ? ['bx1', 'bx2', 'bx3']
        : preferredServer === 'bx2'
        ? ['bx2', 'bx1', 'bx3']
        : preferredServer === 'bx3'
        ? ['bx3', 'bx1', 'bx2']
        : ['bx1', 'bx2', 'bx3'];

    for (const srv of order) {
      if (srv === 'bx1' && handles.bx1) {
        const pages = await this.getOlympusChapterPages(handles.bx1, chNum);
        if (pages.length > 0) return pages;
      }
      if (srv === 'bx2' && handles.bx2) {
        const pages = await this.get3asqChapterPages(handles.bx2, chNum);
        if (pages.length > 0) return pages;
      }
      if (srv === 'bx3' && handles.bx3) {
        const chs = await this.getWeebCentralChapters(handles.bx3.seriesId, handles.bx3.slug);
        if (chs.length > 0) {
          const target =
            chs.find((c) => String(c.chapterNumber) === String(chNum)) ||
            chs[chs.length - 1];
          if (target) {
            const pages = await this.getWeebCentralChapterPages(target.slug);
            if (pages.length > 0) return pages;
          }
        }
      }
    }

    return [];
  }

  async getChapterPages(chapterIdentifier, preferredServer = '') {
    return this.getArabicChapterPages(chapterIdentifier, preferredServer);
  }

  /**
   * Returns metadata for any series ID (flagship or dynamic `os:` / `asq:` / `wc:`)
   * along with which servers (`bx1`, `bx2`, `bx3`) have chapters for it.
   */
  async getSeriesMetadata(id) {
    const cleanId = String(id || '').trim();
    if (FLAGSHIP_MANGA_MAP[cleanId]) {
      const f = FLAGSHIP_MANGA_MAP[cleanId];
      return {
        id: cleanId,
        title_ar: f.title_ar,
        title_en: f.title_en,
        type: f.type,
        poster: f.poster,
        banner: f.banner,
        status: 'ONGOING',
        rating: 9.8,
        chapters_count: 150,
        author: 'سيرفرات BLACK X الرسمية',
        description_ar: `اقرأ ${f.title_ar} مباشرة بجودة عالية عبر سيرفرات BLACK X 1 و BLACK X 2 و BLACK X 3.`,
        description_en: `Read ${f.title_en} directly on BLACK X 1, BLACK X 2, and BLACK X 3.`,
        genres: f.type === 'MANHWA' ? ['مانهوا كورية', 'أكشن', 'فانتازيا'] : ['مانجا يابانية', 'شونين', 'أكشن'],
        release_year: 2025
      };
    }

    if (cleanId.startsWith('os:')) {
      const slug = cleanId.slice(3);
      const catalog = await this.getOlympusCatalog(1);
      const found = catalog.find((it) => it.id === cleanId);
      if (found) return found;
      return {
        id: cleanId,
        title_ar: slug.replace(/-/g, ' '),
        title_en: slug.replace(/-/g, ' '),
        type: 'MANHWA',
        poster: 'https://olympustaff.com/images/manga/thumbnail_b05147568d52f22c663c084172fc0dac.png',
        banner: 'https://olympustaff.com/images/manga/thumbnail_b05147568d52f22c663c084172fc0dac.png',
        status: 'ONGOING',
        rating: 9.6,
        chapters_count: 100,
        author: 'سيرفر BLACK X 1',
        description_ar: 'متاح للقراءة المباشرة بالترجمة العربية عبر سيرفر BLACK X 1.',
        description_en: 'Available on BLACK X 1 Server.',
        genres: ['مانهوا كورية', 'أكشن'],
        release_year: 2025
      };
    }

    if (cleanId.startsWith('asq:')) {
      const slug = cleanId.slice(4);
      const catalog = await this.get3asqCatalog();
      const found = catalog.find((it) => it.id === cleanId);
      if (found) return found;
      return {
        id: cleanId,
        title_ar: slug.replace(/-/g, ' '),
        title_en: slug.replace(/-/g, ' '),
        type: 'MANGA',
        poster: 'https://temp.compsci88.com/cover/fallback/01J76XY7E9FNDZ1DBBM6PBJPFK.jpg',
        banner: 'https://temp.compsci88.com/cover/fallback/01J76XY7E9FNDZ1DBBM6PBJPFK.jpg',
        status: 'ONGOING',
        rating: 9.7,
        chapters_count: 100,
        author: 'سيرفر BLACK X 2',
        description_ar: 'متاح للقراءة المباشرة بالترجمة العربية عبر سيرفر BLACK X 2.',
        description_en: 'Available on BLACK X 2 Server.',
        genres: ['مانجا يابانية', 'أكشن'],
        release_year: 2025
      };
    }

    if (cleanId.startsWith('wc:')) {
      const [seriesId, slug = 'Manga'] = cleanId.slice(3).split(':');
      const title = slug.replace(/-/g, ' ');
      const poster = `https://temp.compsci88.com/cover/fallback/${seriesId}.jpg`;
      return {
        id: cleanId,
        title_ar: title,
        title_en: title,
        type: 'MANGA',
        poster,
        banner: poster,
        status: 'ONGOING',
        rating: 9.8,
        chapters_count: 120,
        author: 'سيرفر BLACK X 3',
        description_ar: `${title} — متاح بدقة أصلية كاملة عبر سيرفر BLACK X 3.`,
        description_en: `${title} — Available in Full HD on BLACK X 3.`,
        genres: ['مانجا عالمية', 'أكشن'],
        release_year: 2025
      };
    }

    return null;
  }

  /* =========================================================================
   * ARABIC LIGHT NOVELS ENGINE (preserved for backward compatibility)
   * ========================================================================= */
  async getNovelChapters(novelSlug) {
    return Array.from({ length: 12 }, (_, idx) => {
      const num = idx + 1;
      return {
        chapterId: `${novelSlug}__ch__${num}`,
        chapterNumber: String(num),
        title: `الفصل ${num}: بداية الأساطير والظلال`,
        releaseDate: '2026'
      };
    });
  }

  async getNovelChapterContent(chapterIdentifier) {
    const parts = String(chapterIdentifier || '').split('__ch__');
    const chNum = parseInt(parts[1], 10) || 1;
    return {
      title: `الفصل ${chNum}`,
      content: `الفصل ${chNum} من أرشيف سيرفرات BLACK X للروايات العربية المترجمة.`
    };
  }
}

export const mangalikService = new MangalikService();
