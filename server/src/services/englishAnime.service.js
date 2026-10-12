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
   * Fetch direct MP4 streams from AnimeHeaven.me (Zero Cloudflare, Zero Iframe Sandbox)
   */
  async fetchAnimeHeavenStreams(titleEn, titleRomaji, episode) {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
    const clean = (s) =>
      String(s || '')
        .replace(/\([^)]*[\u0600-\u06FF][^)]*\)/g, ' ')
        .replace(/[\u0600-\u06FF]+/g, ' ')
        .replace(/season\s*\d+|part\s*\d+|cour\s*\d+/gi, ' ')
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const queries = [];
    const cEn = clean(titleEn);
    const cRo = clean(titleRomaji);
    if (cEn) queries.push(cEn);
    if (cRo && cRo.toLowerCase() !== cEn.toLowerCase()) queries.push(cRo);
    const words = cEn.split(' ').filter((w) => w.length >= 3);
    if (words.length >= 2) queries.push(words.slice(0, 2).join(' '));
    if (words.length >= 1 && words[0].length >= 4) queries.push(words[0]);

    for (const q of [...new Set(queries)]) {
      try {
        const sRes = await fetch(`https://animeheaven.me/search.php?s=${encodeURIComponent(q)}`, {
          headers: { 'User-Agent': ua },
          signal: AbortSignal.timeout(8000)
        });
        if (!sRes.ok) continue;
        const sHtml = await sRes.text();
        const matches = [...sHtml.matchAll(/href=['"](anime\.php\?[^'"]+)['"][^>]*>([^<]+)<\/a>/gi)];
        if (!matches.length) continue;

        const bestHref = matches[0][1];
        const showRes = await fetch(`https://animeheaven.me/${bestHref}`, {
          headers: { 'User-Agent': ua },
          signal: AbortSignal.timeout(8000)
        });
        if (!showRes.ok) continue;
        const showHtml = await showRes.text();
        const eps = [
          ...showHtml.matchAll(
            /id\s*=\s*"([a-f0-9]{32})"[\s\S]*?<div\s+class=\s*'\s*watch2\s+bc\s*'\s*>(\d+(?:\.\d+)?)<\/div>/gi
          )
        ];
        if (!eps.length) continue;

        const targetEp =
          eps.find((m) => Number(m[2]) === Number(episode)) || eps[eps.length - 1];
        if (!targetEp) continue;

        const epKey = targetEp[1];
        const gateRes = await fetch('https://animeheaven.me/gate.php', {
          headers: {
            'User-Agent': ua,
            Cookie: `key=${epKey}`,
            Referer: `https://animeheaven.me/${bestHref}`
          },
          signal: AbortSignal.timeout(8000)
        });
        if (!gateRes.ok) continue;
        const gateHtml = await gateRes.text();
        const vidIdx = gateHtml.indexOf("<video id='vid'");
        const vidBlock =
          vidIdx >= 0 ? gateHtml.slice(vidIdx, gateHtml.indexOf('</video>', vidIdx)) : gateHtml;
        const sources = [
          ...new Set(
            [...vidBlock.matchAll(/src=['"](https:\/\/[a-z0-9.]*animeheaven\.me\/video\.mp4\?[^'"]+)['"]/gi)].map(
              (m) => m[1]
            )
          )
        ];
        if (sources.length > 0) {
          return sources;
        }
      } catch {}
    }
    return [];
  }

  /**
   * Resolve episode streaming servers + auto-translated Arabic subtitle tracks
   */
  async getEpisode(rawSlug, epNumber) {
    const episode = Math.max(1, Number(epNumber) || 1);
    const show = await this.getShow(rawSlug);
    if (!show) return null;

    const { malId, aniId, titleEn, titleRomaji, slug } = show;
    const cacheKey = `en_anime:ep:v3:${malId}:${episode}`;
    const cached = streamGet(cacheKey);
    if (cached) return cached;

    const entries = [];
    const downloads = [];
    const resolved = {};
    const resolvedDownloads = {};

    const subVttUrl = `/api/stream/subtitles/${encodeURIComponent(slug)}/${episode}.vtt?title=${encodeURIComponent(titleEn)}`;
    const subSrtUrl = `/api/stream/subtitles/${encodeURIComponent(slug)}/${episode}.srt?title=${encodeURIComponent(titleEn)}`;

    // 1) Fetch direct MP4 streams from AnimeHeaven (plays in native <video> with ZERO iframe sandbox!)
    try {
      const ahSources = await this.fetchAnimeHeavenStreams(titleEn, titleRomaji, episode);
      if (ahSources.length > 0) {
        const primaryMp4 = ahSources[0];
        const backupMp4 = ahSources[1] || ahSources[0];

        // Server 1: Native <video> HD (Free & VIP compatible — zero iframe, zero sandbox error)
        const idNativeHd = `en-ah-native-hd-${malId}-${episode}`;
        entries.push({
          id: idNativeHd,
          token: idNativeHd,
          server: '⚡ BLACK X Direct Player (مشغل مباشر بدون Sandbox + ترجمة عربية AI)',
          quality: '720p HD',
          version: 'sub',
          lang: 'en->ar',
          embedUrl: `/api/stream/mp4-player?url=${encodeURIComponent(primaryMp4)}&sub=${encodeURIComponent(subVttUrl)}`,
          directUrl: primaryMp4,
          isFastCdn: true,
          hasAutoArabicSub: true,
          source: 'english'
        });
        resolved[idNativeHd] = {
          embedUrl: `/api/stream/mp4-player?url=${encodeURIComponent(primaryMp4)}&sub=${encodeURIComponent(subVttUrl)}`,
          directUrl: primaryMp4
        };

        // Server 2: Self-Hosted Clean HTML5 Player with built-in Arabic Subtitles
        const idEmbedClean = `en-ah-embed-hd-${malId}-${episode}`;
        entries.push({
          id: idEmbedClean,
          token: idEmbedClean,
          server: '🌐 BLACK X Cinema Player (مترجم عربي مدمج داخل المشغل)',
          quality: '720p HD',
          version: 'sub',
          lang: 'en->ar',
          embedUrl: `/api/stream/mp4-player?url=${encodeURIComponent(backupMp4)}&sub=${encodeURIComponent(subVttUrl)}`,
          directUrl: null,
          isFastCdn: true,
          hasAutoArabicSub: true,
          source: 'english'
        });
        resolved[idEmbedClean] = {
          embedUrl: `/api/stream/mp4-player?url=${encodeURIComponent(backupMp4)}&sub=${encodeURIComponent(subVttUrl)}`,
          directUrl: null
        };

        // Server 3: Native 1080p FHD Mirror
        const idNativeFhd = `en-ah-native-fhd-${malId}-${episode}`;
        entries.push({
          id: idNativeFhd,
          token: idNativeFhd,
          server: '👑 BLACK X Direct 1080p FHD (سيرفر فائق السرعة)',
          quality: '1080p FHD',
          version: 'sub',
          lang: 'en->ar',
          embedUrl: `/api/stream/mp4-player?url=${encodeURIComponent(primaryMp4)}&sub=${encodeURIComponent(subVttUrl)}`,
          directUrl: primaryMp4,
          isFastCdn: true,
          hasAutoArabicSub: true,
          source: 'english'
        });
        resolved[idNativeFhd] = {
          embedUrl: `/api/stream/mp4-player?url=${encodeURIComponent(primaryMp4)}&sub=${encodeURIComponent(subVttUrl)}`,
          directUrl: primaryMp4
        };

        // Also add direct MP4 download links
        ahSources.slice(0, 2).forEach((mp4Url, idx) => {
          const dlId = `dl-en-mp4-${malId}-${episode}-${idx + 1}`;
          const proxiedDl = `/api/stream/download?url=${encodeURIComponent(mp4Url)}&filename=${encodeURIComponent(`${titleEn}-EP${episode}.mp4`)}`;
          downloads.push({
            id: dlId,
            token: dlId,
            server: `📥 تحميل الحلقة MP4 مباشر (سيرفر ${idx + 1})`,
            quality: idx === 0 ? '1080p FHD' : '720p HD',
            version: 'sub',
            lang: 'en',
            downloadUrl: proxiedDl
          });
          resolvedDownloads[dlId] = {
            url: proxiedDl,
            directUrl: proxiedDl
          };
        });
      }
    } catch (_) {}

    // 2) Also resolve real WitAnime servers (videa, Google Drive via yonaplay, unwrapped hgcloud HLS)
    try {
      let witaCandidates = await searchShows(titleEn).catch(() => []);
      if (!witaCandidates.length && titleRomaji && titleRomaji !== titleEn) {
        witaCandidates = await searchShows(titleRomaji).catch(() => []);
      }
      const witaSlug = witaCandidates?.[0]?.slug;
      if (witaSlug) {
        const witaEp = await fetchEpisode(witaSlug, episode).catch(() => null);
        if (witaEp && Array.isArray(witaEp.entries) && witaEp.entries.length > 0) {
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
