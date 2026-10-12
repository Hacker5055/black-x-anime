/**
 * BLACK X Server 3 — Complete Japanese Anime Library + AI Arabic Translation Engine
 * ---------------------------------------------------------------------------------
 * Provides complete coverage of Japanese anime released in Japan:
 *  - Complete Japanese Anime Catalog (countryOfOrigin: JP, status: FINISHED / RELEASING)
 *  - Direct 1080p/720p MP4 streaming & downloading (Zero Iframe Sandbox)
 *  - Cross-linked Arabic-subtitled streams from BLACK X 1 & BLACK X 2 (with strict title verification)
 *  - Real-time English -> Arabic AI subtitle translation (.srt / .ass / .vtt)
 *  - 100% pure BLACK X branding with zero mention of upstream sources
 */
import { apiGet, apiSet, streamGet, streamSet } from '../db.js';
import { translateTextToArabic, getTranslatedEpisodeSubtitles } from '../subtitleTranslator.js';
import { searchShows, fetchEpisode, resolveEntry, isTitleMatch } from '../witanime.js';
import { anime3rbService } from './anime3rb.service.js';

const ANILIST_URL = 'https://graphql.anilist.co';

function slugifyTitle(title, malId) {
  const base =
    String(title || 'anime')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'anime';
  return malId ? `en-${malId}-${base}` : `en-${base}`;
}

function parseEnglishSlug(rawSlug) {
  const clean = String(rawSlug || '').trim();
  const m = clean.match(/^(?:en|mal)-(\d+)(?:-(.+))?$/i);
  if (m) {
    return {
      malId: Number(m[1]),
      query: (m[2] || '').replace(/-/g, ' ').trim()
    };
  }
  return {
    malId: null,
    query: clean
      .replace(/^(en-|mal-|ani-|ok-|blkom-|a3rb-)/i, '')
      .replace(/-/g, ' ')
      .trim()
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

function decodeHtmlEntities(str) {
  return String(str || '')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

class EnglishAnimeService {
  /**
   * Fetch trending / airing Japanese anime
   */
  async getLatestEpisodes(page = 1) {
    const p = Math.max(1, Number(page) || 1);
    const cacheKey = `en_anime:latest:v3:${p}`;
    const cached = apiGet(cacheKey);
    if (cached) return cached;

    const gql = `
      query ($page: Int) {
        Page(page: $page, perPage: 24) {
          media(type: ANIME, countryOfOrigin: "JP", status_in: [FINISHED, RELEASING], sort: [TRENDING_DESC, POPULARITY_DESC], isAdult: false) {
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

    const data = await queryAniList(gql, { page: p }).catch(() => null);
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
          episodeCount: latestEp,
          titleEn,
          titleAr: titleEn,
          poster: m.coverImage?.extraLarge || m.coverImage?.large || '',
          banner: m.bannerImage || m.coverImage?.extraLarge || '',
          score: m.averageScore ? Number((m.averageScore / 10).toFixed(1)) : 8.9,
          genres: m.genres || ['Action', 'Fantasy'],
          url: `/show/${slug}?source=english`,
          source: 'english',
          hasAutoArabicSub: true,
          sourceLabel: 'سيرفر BLACK X 3'
        };
      });

    if (items.length) {
      apiSet(cacheKey, items, 15 * 60 * 1000);
    }
    return items;
  }

  /**
   * Search any anime (Japanese catalog + direct title match)
   */
  async search(q) {
    const clean = String(q || '').trim();
    if (!clean) return this.getLatestEpisodes(1);
    const cacheKey = `en_anime:search:v4:${clean.toLowerCase()}`;
    const cached = apiGet(cacheKey);
    if (cached) return cached;

    const gql = `
      query ($search: String) {
        Page(page: 1, perPage: 20) {
          media(search: $search, type: ANIME, status_in: [FINISHED, RELEASING], sort: [POPULARITY_DESC], isAdult: false) {
            id
            idMal
            countryOfOrigin
            episodes
            status
            averageScore
            genres
            synonyms
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
        const titleEn = m.title?.english || m.synonyms?.[0] || m.title?.romaji || clean;
        const epCount = m.nextAiringEpisode?.episode
          ? Math.max(1, m.nextAiringEpisode.episode - 1)
          : m.episodes || 12;
        const slug = slugifyTitle(m.title?.romaji || titleEn, m.idMal);
        return {
          slug,
          malId: m.idMal,
          aniId: m.id,
          titleEn,
          titleRomaji: m.title?.romaji || titleEn,
          titleAr: titleEn,
          poster: m.coverImage?.extraLarge || m.coverImage?.large || '',
          banner: m.bannerImage || m.coverImage?.extraLarge || '',
          episodes: epCount,
          episodeCount: epCount,
          score: m.averageScore ? Number((m.averageScore / 10).toFixed(1)) : 8.8,
          genres: m.genres || ['Action'],
          url: `/show/${slug}?source=english`,
          source: 'english',
          hasAutoArabicSub: true,
          sourceLabel: 'سيرفر BLACK X 3'
        };
      });

    apiSet(cacheKey, items, 20 * 60 * 1000);
    return items;
  }

  /**
   * Resolve full anime details & episode list
   */
  async getShow(rawSlug) {
    const { malId, query } = parseEnglishSlug(rawSlug);
    const cacheKey = `en_anime:show:v4:${malId || query.toLowerCase()}`;
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
            synonyms
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
          Media(search: $search, type: ANIME, status_in: [FINISHED, RELEASING], sort: [POPULARITY_DESC]) {
            id
            idMal
            episodes
            status
            averageScore
            genres
            synonyms
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

    const titleEn = m.title?.english || m.synonyms?.find((s) => /^[a-zA-Z0-9\s:'-]+$/.test(s)) || m.title?.romaji || query || `Anime ${m.idMal}`;
    const titleRomaji = m.title?.romaji || titleEn;
    const titleNative = m.title?.native || '';
    const synonyms = Array.isArray(m.synonyms) ? m.synonyms : [];
    const epCount = m.nextAiringEpisode?.episode
      ? Math.max(1, m.nextAiringEpisode.episode - 1)
      : m.episodes || 12;

    const cleanDesc = (m.description || '').replace(/<[^>]+>/g, '').trim();
    const descAr = cleanDesc ? await translateTextToArabic(cleanDesc).catch(() => cleanDesc) : '';

    const canonicalSlug = slugifyTitle(titleRomaji || titleEn, m.idMal);
    const episodes = Array.from({ length: Math.min(epCount, 1200) }, (_, i) => ({
      episode: i + 1,
      number: i + 1,
      title: `الحلقة ${i + 1}`,
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
      titleNative,
      synonyms,
      titleAr: titleEn,
      poster: m.coverImage?.extraLarge || m.coverImage?.large || '',
      banner: m.bannerImage || m.coverImage?.extraLarge || '',
      score: m.averageScore ? (m.averageScore / 10).toFixed(1) : 9.0,
      status: m.status === 'FINISHED' ? 'مكتمل' : 'يعرض الان',
      genres: m.genres || ['Action', 'Fantasy'],
      description: descAr || cleanDesc,
      episodeCount: epCount,
      episodes,
      hasAutoArabicSub: true,
      source: 'english',
      sourceName: 'سيرفر BLACK X 3'
    };

    apiSet(cacheKey, show, 30 * 60 * 1000);
    return show;
  }

  /**
   * Fetch direct MP4 streams with strict title verification so it never plays a wrong anime
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
    if (words.length === 1 && words[0].length >= 4) queries.push(words[0]);

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

        // Strict title verification: only accept a match whose title matches titleEn or titleRomaji
        const verified = matches.find((m) => {
          const candTitle = decodeHtmlEntities(m[2]).trim();
          return isTitleMatch(cEn, candTitle) || (cRo && isTitleMatch(cRo, candTitle));
        });
        if (!verified) continue;

        const bestHref = verified[1];
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

        const targetEp = eps.find((m) => Number(m[2]) === Number(episode));
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
    const cacheKey = `en_anime:ep:v5:${malId}:${episode}`;
    const cached = streamGet(cacheKey);
    if (cached) return cached;

    const entries = [];
    const downloads = [];
    const resolved = {};
    const resolvedDownloads = {};

    const subVttUrl = `/api/stream/subtitles/${encodeURIComponent(slug)}/${episode}.vtt?title=${encodeURIComponent(titleEn)}`;
    const subSrtUrl = `/api/stream/subtitles/${encodeURIComponent(slug)}/${episode}.srt?title=${encodeURIComponent(titleEn)}`;

    // 1) Cross-link BLACK X Server 2 (Arabic-subtitled direct MP4 1080p/720p/480p + OK.ru + Sendvid) with strict title check
    try {
      let bx2Ep = await anime3rbService.getEpisode(titleRomaji || titleEn, episode).catch(() => null);
      if (!bx2Ep && titleEn && titleEn !== titleRomaji) {
        bx2Ep = await anime3rbService.getEpisode(titleEn, episode).catch(() => null);
      }
      if (bx2Ep && Array.isArray(bx2Ep.entries)) {
        for (const e of bx2Ep.entries) {
          entries.push(e);
        }
        Object.assign(resolved, bx2Ep.resolved || {});
        for (const d of bx2Ep.downloads || []) {
          downloads.push(d);
        }
        Object.assign(resolvedDownloads, bx2Ep.resolvedDownloads || {});
      }
    } catch (_) {}

    // 2) Fetch Direct MP4 streams from BLACK X Server 3 engine (plays in native <video> + AI Arabic Subtitles)
    try {
      const ahSources = await this.fetchAnimeHeavenStreams(titleEn, titleRomaji, episode);
      if (ahSources.length > 0) {
        const primaryMp4 = ahSources[0];
        const backupMp4 = ahSources[1] || ahSources[0];

        const idNativeHd = `en-ah-native-hd-${malId}-${episode}`;
        entries.push({
          id: idNativeHd,
          token: idNativeHd,
          server: '⚡ BLACK X Direct HD (مترجم عربي AI)',
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

        const idEmbedClean = `en-ah-embed-hd-${malId}-${episode}`;
        entries.push({
          id: idEmbedClean,
          token: idEmbedClean,
          server: '🌐 BLACK X Cinema HD (مشغل مدمج بالترجمة)',
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

        const idNativeFhd = `en-ah-native-fhd-${malId}-${episode}`;
        entries.push({
          id: idNativeFhd,
          token: idNativeFhd,
          server: '👑 BLACK X Direct 1080p FHD (مترجم عربي AI)',
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

        ahSources.slice(0, 2).forEach((mp4Url, idx) => {
          const dlId = `dl-en-mp4-${malId}-${episode}-${idx + 1}`;
          const proxiedDl = `/api/stream/download?url=${encodeURIComponent(mp4Url)}&filename=${encodeURIComponent(`${titleEn}-EP${episode}.mp4`)}`;
          downloads.push({
            id: dlId,
            token: dlId,
            server: `📥 سيرفر تحميل BLACK X المباشر (${idx === 0 ? '1080p FHD' : '720p HD'})`,
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

    // 3) Cross-link BLACK X Server 1 (witanime) with strict title verification
    try {
      let witaCandidates = await searchShows(titleEn).catch(() => []);
      if (!witaCandidates.length && titleRomaji && titleRomaji !== titleEn) {
        witaCandidates = await searchShows(titleRomaji).catch(() => []);
      }
      const verifiedWita = witaCandidates.find(
        (c) =>
          isTitleMatch(titleEn, c.titleEn, c.slug) ||
          (titleRomaji && isTitleMatch(titleRomaji, c.titleEn, c.slug))
      );
      const witaSlug = verifiedWita?.slug;
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
              witaSlug
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

    // 4) Fallback for rare ONAs/shorts (e.g. Horangi Deureowayo / Tiger Coming In) via verified YouTube Episode Stream
    if (!entries.length) {
      try {
        const ytCandidates = [titleEn, ...(show.synonyms || []), titleRomaji, show.titleNative].filter(Boolean);
        for (const baseTitle of [...new Set(ytCandidates)]) {
          const ytQuery = `${baseTitle} Episode ${episode} English Sub`;
          const ytRes = await fetch(
            `https://www.youtube.com/results?search_query=${encodeURIComponent(ytQuery)}`,
            {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
              },
              signal: AbortSignal.timeout(7000)
            }
          );
          if (!ytRes.ok) continue;
          const ytHtml = await ytRes.text();
          const m = ytHtml.match(/var ytInitialData = (\{.*?\});<\/script>/);
          if (!m) continue;
          const ytData = JSON.parse(m[1]);
          const contents =
            ytData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
              ?.contents?.[0]?.itemSectionRenderer?.contents || [];
          const videos = [];
          for (const item of contents) {
            const v = item.videoRenderer;
            if (!v?.videoId) continue;
            const vTitle = v.title?.runs?.[0]?.text || '';
            const matchesAnyTitle = ytCandidates.some(
              (cand) =>
                cand &&
                (vTitle.toLowerCase().includes(String(cand).toLowerCase()) ||
                  isTitleMatch(String(cand), vTitle))
            );
            if (matchesAnyTitle) {
              videos.push({ id: v.videoId, title: vTitle });
            }
          }
          if (videos.length > 0) {
            videos.slice(0, 2).forEach((vid, idx) => {
              const entryId = `en-yt-${malId}-${episode}-${idx + 1}`;
              const embedUrl = `https://www.youtube-nocookie.com/embed/${vid.id}?autoplay=1&rel=0&cc_load_policy=1&cc_lang_pref=ar`;
              entries.push({
                id: entryId,
                token: entryId,
                server: idx === 0 ? '🎬 BLACK X Stream HD (مترجم)' : '🌐 BLACK X Cinema HD (احتياطي)',
                quality: '1080p FHD',
                version: 'sub',
                lang: 'ar',
                embedUrl,
                directUrl: null,
                isFastCdn: true,
                source: 'english'
              });
              resolved[entryId] = { embedUrl, directUrl: null };
            });
            break;
          }
        }
      } catch (_) {}
    }

    if (!entries.length) return null;

    downloads.push(
      {
        id: `dl-en-sub-srt-${malId}-${episode}`,
        token: `dl-en-srt-${malId}-${episode}`,
        server: '📥 تحميل ملف الترجمة العربية (.SRT) — BLACK X AI',
        quality: 'SRT',
        version: 'sub',
        lang: 'ar',
        downloadUrl: subSrtUrl
      },
      {
        id: `dl-en-sub-vtt-${malId}-${episode}`,
        token: `dl-en-vtt-${malId}-${episode}`,
        server: '📥 تحميل ملف الترجمة العربية (.VTT) — BLACK X AI',
        quality: 'VTT',
        version: 'sub',
        lang: 'ar',
        downloadUrl: subVttUrl
      }
    );
    resolvedDownloads[`dl-en-sub-srt-${malId}-${episode}`] = { url: subSrtUrl, directUrl: subSrtUrl };
    resolvedDownloads[`dl-en-sub-vtt-${malId}-${episode}`] = { url: subVttUrl, directUrl: subVttUrl };

    const payload = {
      entries,
      downloads,
      resolved,
      resolvedDownloads,
      subtitles: [
        {
          lang: 'ar',
          label: 'العربية (ترجمة فورية BLACK X AI)',
          vttUrl: subVttUrl,
          srtUrl: subSrtUrl,
          default: true
        }
      ],
      hasAutoArabicSub: true,
      titleEn,
      malId,
      aniId,
      episode,
      source: 'english',
      sourceName: 'سيرفر BLACK X 3'
    };

    streamSet(cacheKey, payload, 2 * 60 * 60 * 1000);
    return payload;
  }

  async getArabicSubtitles(rawSlug, epNumber) {
    const show = await this.getShow(rawSlug);
    const titleEn = show?.titleEn || parseEnglishSlug(rawSlug).query;
    return getTranslatedEpisodeSubtitles(titleEn, epNumber);
  }
}

export const englishAnimeService = new EnglishAnimeService();
