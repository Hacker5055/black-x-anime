/**
 * Global English Anime Source + AI Arabic Subtitle Translation Service
 * --------------------------------------------------------------------
 * Provides global anime coverage (every anime on MyAnimeList / AniList) using:
 *  - AniList GraphQL + Jikan (MyAnimeList) metadata & episode counts
 *  - Multi-server English streaming embeds (VidLink Pro Sub, VidLink Pro Dub, NontonGo Global)
 *  - Automatic English -> Arabic subtitle translation (.srt / .vtt) via subtitleTranslator.js
 */
import { apiGet, apiSet, streamGet, streamSet } from '../db.js';
import { translateTextToArabic, getTranslatedEpisodeSubtitles } from '../subtitleTranslator.js';
import { searchShows, fetchEpisode, resolveEntry } from '../witanime.js';

const ANILIST_URL = 'https://graphql.anilist.co';

function slugifyTitle(title, malId) {
  const base = String(title || 'anime')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'anime';
  return malId ? `en-${malId}-${base}` : `en-${base}`;
}

function parseEnglishSlug(rawSlug) {
  const clean = String(rawSlug || '').trim();
  // Match en-{malId}-{rest} or ani-{id}
  const m = clean.match(/^(?:en|mal)-(\d+)(?:-(.+))?$/i);
  if (m) {
    return {
      malId: Number(m[1]),
      query: (m[2] || '').replace(/-/g, ' ').trim()
    };
  }
  return {
    malId: null,
    query: clean.replace(/^(en-|mal-|ani-|ok-|blkom-|a3rb-)/i, '').replace(/-/g, ' ').trim()
  };
}

async function queryAniList(query, variables = {}) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data || null;
}

class EnglishAnimeService {
  /**
   * Fetch trending / airing English anime with automatic Arabic subtitle support
   */
  async getLatestEpisodes() {
    const cacheKey = 'en_anime:latest';
    const cached = apiGet(cacheKey);
    if (cached) return cached;

    const gql = `
      query {
        Page(page: 1, perPage: 20) {
          media(type: ANIME, sort: [TRENDING_DESC, POPULARITY_DESC], isAdult: false) {
            id
            idMal
            episodes
            status
            averageScore
            genres
            description(asHtml: false)
            nextAiringEpisode { episode }
            title { english romaji native }
            coverImage { extraLarge large }
            bannerImage
          }
        }
      }
    `;

    const data = await queryAniList(gql).catch(() => null);
    const mediaList = data?.Page?.media || [];

    const items = mediaList
      .filter((m) => m.idMal)
      .map((m) => {
        const titleEn = m.title?.english || m.title?.romaji || `Anime ${m.idMal}`;
        const latestEp = m.nextAiringEpisode?.episode
          ? Math.max(1, m.nextAiringEpisode.episode - 1)
          : m.episodes || 12;
        const slug = slugifyTitle(titleEn, m.idMal);
        return {
          slug,
          malId: m.idMal,
          aniId: m.id,
          episode: latestEp,
          episodes: latestEp,
          titleEn,
          titleAr: `${titleEn} (مترجم للعربية AI 🌐)`,
          poster: m.coverImage?.extraLarge || m.coverImage?.large || '',
          banner: m.bannerImage || m.coverImage?.extraLarge || '',
          score: m.averageScore || 92,
          genres: m.genres || ['Action', 'Fantasy'],
          url: `/watch/${slug}/${latestEp}?source=english`,
          source: 'english',
          hasAutoArabicSub: true,
          sourceLabel: '🌐 سيرفر عالمي + ترجمة عربية فورية AI'
        };
      });

    if (items.length) {
      apiSet(cacheKey, items, 15 * 60 * 1000);
    }
    return items;
  }

  /**
   * Search any English / MyAnimeList / AniList anime
   */
  async search(q) {
    const clean = String(q || '').trim();
    if (!clean) return [];
    const cacheKey = `en_anime:search:${clean.toLowerCase()}`;
    const cached = apiGet(cacheKey);
    if (cached) return cached;

    const gql = `
      query ($search: String) {
        Page(page: 1, perPage: 18) {
          media(search: $search, type: ANIME, sort: [POPULARITY_DESC], isAdult: false) {
            id
            idMal
            episodes
            status
            averageScore
            genres
            description(asHtml: false)
            nextAiringEpisode { episode }
            title { english romaji native }
            coverImage { extraLarge large }
            bannerImage
          }
        }
      }
    `;

    const data = await queryAniList(gql, { search: clean }).catch(() => null);
    const mediaList = data?.Page?.media || [];

    const items = mediaList
      .filter((m) => m.idMal)
      .map((m) => {
        const titleEn = m.title?.english || m.title?.romaji || clean;
        const epCount = m.nextAiringEpisode?.episode
          ? Math.max(1, m.nextAiringEpisode.episode - 1)
          : m.episodes || 12;
        const slug = slugifyTitle(titleEn, m.idMal);
        return {
          slug,
          malId: m.idMal,
          aniId: m.id,
          titleEn,
          titleAr: `${titleEn} (مترجم تلقائياً 🌐)`,
          poster: m.coverImage?.extraLarge || m.coverImage?.large || '',
          banner: m.bannerImage || m.coverImage?.extraLarge || '',
          episodes: epCount,
          episodeCount: epCount,
          score: m.averageScore || 90,
          genres: m.genres || ['Action'],
          url: `/show/${slug}?source=english`,
          source: 'english',
          hasAutoArabicSub: true,
          sourceLabel: '🌐 مصدر إنجليزي + ترجمة عربية فورية AI'
        };
      });

    apiSet(cacheKey, items, 20 * 60 * 1000);
    return items;
  }

  /**
   * Resolve full anime details & episode list for any English / MAL anime
   */
  async getShow(rawSlug) {
    const { malId, query } = parseEnglishSlug(rawSlug);
    const cacheKey = `en_anime:show:${malId || query.toLowerCase()}`;
    const cached = apiGet(cacheKey);
    if (cached) return cached;

    const gql = malId
      ? `
        query ($idMal: Int) {
          Media(idMal: $idMal, type: ANIME) {
            id
            idMal
            episodes
            status
            averageScore
            genres
            description(asHtml: false)
            nextAiringEpisode { episode }
            title { english romaji native }
            coverImage { extraLarge large }
            bannerImage
          }
        }
      `
      : `
        query ($search: String) {
          Media(search: $search, type: ANIME, sort: [POPULARITY_DESC]) {
            id
            idMal
            episodes
            status
            averageScore
            genres
            description(asHtml: false)
            nextAiringEpisode { episode }
            title { english romaji native }
            coverImage { extraLarge large }
            bannerImage
          }
        }
      `;

    const vars = malId ? { idMal: malId } : { search: query };
    const data = await queryAniList(gql, vars).catch(() => null);
    const m = data?.Media;
    if (!m || !m.idMal) return null;

    const titleEn = m.title?.english || m.title?.romaji || query || `Anime ${m.idMal}`;
    const titleRomaji = m.title?.romaji || titleEn;
    const epCount = m.nextAiringEpisode?.episode
      ? Math.max(1, m.nextAiringEpisode.episode - 1)
      : m.episodes || 12;

    const cleanDesc = (m.description || '').replace(/<[^>]+>/g, '').trim();
    const descAr = cleanDesc ? await translateTextToArabic(cleanDesc).catch(() => cleanDesc) : '';

    const canonicalSlug = slugifyTitle(titleEn, m.idMal);
    const episodes = Array.from({ length: Math.min(epCount, 1200) }, (_, i) => ({
      episode: i + 1,
      number: i + 1,
      title: `الحلقة ${i + 1} (مترجمة للعربية AI 🌐)`,
      slug: canonicalSlug,
      url: `/watch/${canonicalSlug}/${i + 1}?source=english`
    }));

    const show = {
      slug: canonicalSlug,
      malId: m.idMal,
      aniId: m.id,
      kind: 'anime',
      titleEn,
      titleRomaji,
      titleAr: `${titleEn} (مترجم للعربية AI 🌐)`,
      poster: m.coverImage?.extraLarge || m.coverImage?.large || '',
      banner: m.bannerImage || m.coverImage?.extraLarge || '',
      score: m.averageScore ? (m.averageScore / 10).toFixed(1) : 9.2,
      status: m.status === 'FINISHED' ? 'مكتمل' : 'يعرض الان',
      genres: m.genres || ['Action', 'Fantasy'],
      description: descAr || cleanDesc,
      episodeCount: epCount,
      episodes,
      hasAutoArabicSub: true,
      source: 'english',
      sourceName: '🌐 سيرفر BLACK X العالمي (English + ترجمة عربية فورية AI)'
    };

    apiSet(cacheKey, show, 30 * 60 * 1000);
    return show;
  }

  /**
   * Resolve episode streaming servers + auto-translated Arabic subtitle tracks
   */
  async getEpisode(rawSlug, epNumber) {
    const episode = Math.max(1, Number(epNumber) || 1);
    const show = await this.getShow(rawSlug);
    if (!show) return null;

    const { malId, aniId, titleEn, titleRomaji, slug } = show;
    const cacheKey = `en_anime:ep:v2:${malId}:${episode}`;
    const cached = streamGet(cacheKey);
    if (cached) return cached;

    const entries = [];
    const downloads = [];
    const resolved = {};
    const resolvedDownloads = {};

    // 1) Try resolving real WitAnime servers for this anime first (Arabic-subtitled fast servers)
    try {
      let witaCandidates = await searchShows(titleEn).catch(() => []);
      if (!witaCandidates.length && titleRomaji && titleRomaji !== titleEn) {
        witaCandidates = await searchShows(titleRomaji).catch(() => []);
      }
      const witaSlug = witaCandidates?.[0]?.slug;
      if (witaSlug) {
        const witaEp = await fetchEpisode(witaSlug, episode).catch(() => null);
        if (witaEp && Array.isArray(witaEp.entries) && witaEp.entries.length > 0) {
          // Eagerly resolve the first WitAnime server so playback starts immediately
          const firstEntry = witaEp.entries[0];
          try {
            const firstResolved = await resolveEntry(witaSlug, episode, firstEntry.id);
            if (firstResolved) {
              resolved[firstEntry.id] = firstResolved;
            }
          } catch (_) {}

          for (const we of witaEp.entries) {
            entries.push({
              ...we,
              witaSlug,
              server: `👑 ${we.server} (مترجم عربي)`
            });
            if (witaEp.resolved?.[we.id]) {
              resolved[we.id] = witaEp.resolved[we.id];
            }
          }

          for (const wd of witaEp.downloads || []) {
            downloads.push({
              ...wd,
              witaSlug
            });
            if (witaEp.resolvedDownloads?.[wd.id]) {
              resolvedDownloads[wd.id] = witaEp.resolvedDownloads[wd.id];
            }
          }
        }
      }
    } catch (_) {}

    // 2) Add Global English Streaming Servers (Videasy Pro + VidLink Pro Sub & Dub)
    const englishServers = [
      {
        id: `en-videasy-sub-${malId}-${episode}`,
        token: `en-ve-sub-${malId}-${episode}`,
        server: '🌐 Videasy Pro (Sub EN + ترجمة عربية فورية AI)',
        quality: '1080p FHD',
        version: 'sub',
        lang: 'en->ar',
        embedUrl: `https://player.videasy.net/anime/${aniId || malId}/${episode}`,
        directUrl: null,
        isFastCdn: true,
        hasAutoArabicSub: true,
        source: 'english'
      },
      {
        id: `en-vidlink-sub-${malId}-${episode}`,
        token: `en-vl-sub-${malId}-${episode}`,
        server: '🌐 VidLink Pro (Sub EN + ترجمة عربية فورية AI)',
        quality: '1080p FHD',
        version: 'sub',
        lang: 'en->ar',
        embedUrl: `https://vidlink.pro/anime/${malId}/${episode}/sub`,
        directUrl: null,
        isFastCdn: true,
        hasAutoArabicSub: true,
        source: 'english'
      },
      {
        id: `en-videasy-dub-${malId}-${episode}`,
        token: `en-ve-dub-${malId}-${episode}`,
        server: '🎙️ Videasy Pro (Dub EN + ترجمة عربية فورية AI)',
        quality: '1080p FHD',
        version: 'dub',
        lang: 'en->ar',
        embedUrl: `https://player.videasy.net/anime/${aniId || malId}/${episode}?dub=true`,
        directUrl: null,
        isFastCdn: true,
        hasAutoArabicSub: true,
        source: 'english'
      },
      {
        id: `en-vidlink-dub-${malId}-${episode}`,
        token: `en-vl-dub-${malId}-${episode}`,
        server: '🎙️ VidLink Pro (Dub EN + ترجمة عربية فورية AI)',
        quality: '1080p FHD',
        version: 'dub',
        lang: 'en->ar',
        embedUrl: `https://vidlink.pro/anime/${malId}/${episode}/dub`,
        directUrl: null,
        isFastCdn: true,
        hasAutoArabicSub: true,
        source: 'english'
      }
    ];

    for (const e of englishServers) {
      entries.push(e);
      resolved[e.id] = {
        embedUrl: e.embedUrl,
        directUrl: null
      };
    }

    const subVttUrl = `/api/stream/subtitles/${encodeURIComponent(slug)}/${episode}.vtt?title=${encodeURIComponent(titleEn)}`;
    const subSrtUrl = `/api/stream/subtitles/${encodeURIComponent(slug)}/${episode}.srt?title=${encodeURIComponent(titleEn)}`;

    const subDownloads = [
      {
        id: `dl-sub-ar-srt-${malId}-${episode}`,
        token: `dl-sub-srt`,
        server: '📄 تحميل ملف الترجمة العربية الفورية (.SRT)',
        quality: 'HD',
        version: 'sub',
        lang: 'ar',
        downloadUrl: subSrtUrl
      },
      {
        id: `dl-sub-ar-vtt-${malId}-${episode}`,
        token: `dl-sub-vtt`,
        server: '📄 تحميل ملف الترجمة العربية للويب (.VTT)',
        quality: 'HD',
        version: 'sub',
        lang: 'ar',
        downloadUrl: subVttUrl
      }
    ];

    for (const d of subDownloads) {
      downloads.push(d);
      resolvedDownloads[d.id] = {
        downloadUrl: d.downloadUrl,
        directUrl: d.downloadUrl
      };
    }

    // Warm up the subtitle translation cache in background
    getTranslatedEpisodeSubtitles({ query: titleEn, episode }).catch(() => {});

    const payload = {
      entries,
      downloads,
      resolved,
      resolvedDownloads,
      subtitleTracks: [
        {
          lang: 'ar',
          label: 'العربية (ترجمة فورية بالذكاء الاصطناعي 🌐)',
          vttUrl: subVttUrl,
          srtUrl: subSrtUrl,
          cuesUrl: `/api/stream/subtitles/${encodeURIComponent(slug)}/${episode}?title=${encodeURIComponent(titleEn)}`,
          default: true
        }
      ],
      source: 'english',
      sourceName: '🌐 سيرفر BLACK X العالمي (English + ترجمة عربية فورية AI)'
    };

    streamSet(cacheKey, payload, 60 * 60 * 1000);
    return payload;
  }
}

export const englishAnimeService = new EnglishAnimeService();
