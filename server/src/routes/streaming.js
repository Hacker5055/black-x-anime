import { Router } from 'express';
import { requireAuth, optionalAuth } from '../auth.js';
import { fetchLatest, searchShows, fetchShow, fetchEpisode, resolveEntry, resolveDownloadEntry, scrapeHealth, scrapeDiagnostics, fetchBrowseAnimeList } from '../witanime.js';
import { scraperGetEpisodeDl, scraperSearchAnime } from '../animeScraperApi.js';
import { anime3rbService, ANIME3RB_CATALOG } from '../services/anime3rb.service.js';
import { okanimeService, OKANIME_CATALOG } from '../services/okanime.service.js';
import { animeblkomService, ANIMEBLKOM_CATALOG } from '../services/animeblkom.service.js';
import { englishAnimeService } from '../services/englishAnime.service.js';
import {
  getTranslatedEpisodeSubtitles,
  parseSubtitles,
  translateLinesToArabic,
  buildVttFromCues,
  buildSrtFromCues
} from '../subtitleTranslator.js';

const router = Router();

/** GET /api/stream/sources — list available anime streaming sources under BLACK X */
router.get('/sources', (req, res) => {
  res.json({
    sources: [
      {
        id: 'all',
        nameAr: '🌟 جميع مصادر BLACK X (الكل)',
        nameEn: 'All BLACK X Sources',
        badge: 'مدمج'
      },
      {
        id: 'witanime',
        nameAr: '👑 سيرفر BLACK X 1 (WitAnime)',
        nameEn: 'BLACK X Server 1 (WitAnime)',
        site: 'https://witanime.site/',
        badge: 'WitAnime'
      },
      {
        id: 'english',
        nameAr: '🌐 سيرفر BLACK X العالمي (English + ترجمة عربية فورية AI)',
        nameEn: 'BLACK X Global (English + Instant Arabic AI Subtitles)',
        site: 'https://vidlink.pro/',
        badge: 'EN ➔ AR AI'
      },
      {
        id: 'anime3rb',
        nameAr: '⚡ سيرفر BLACK X 2 (Anime3rb)',
        nameEn: 'BLACK X Server 2 (Anime3rb)',
        site: 'https://anime3rb.com/',
        badge: 'Anime3rb'
      },
      {
        id: 'okanime',
        nameAr: '🔥 سيرفر BLACK X 3 (OkAnime)',
        nameEn: 'BLACK X Server 3 (OkAnime)',
        site: 'https://ww3.okanime.xyz/',
        badge: 'OkAnime'
      },
      {
        id: 'animeblkom',
        nameAr: '💎 سيرفر BLACK X 4 (AnimeBlkom)',
        nameEn: 'BLACK X Server 4 (AnimeBlkom)',
        site: 'https://www.animeblkom.com/',
        badge: 'AnimeBlkom'
      }
    ]
  });
});

/** GET /api/stream/catalog — complete catalog of anime across all BLACK X sources */
router.get('/catalog', async (req, res) => {
  const source = (req.query.source || 'all').toLowerCase();
  const page = Math.max(1, Number(req.query.page) || 1);
  try {
    let items = [];

    if (source === 'all' || source === 'anime3rb') {
      const a3rbItems = ANIME3RB_CATALOG.map((a) => ({
        ...a,
        source: 'anime3rb',
        sourceName: 'سيرفر BLACK X 2 (Anime3rb)',
        sourceLabel: 'Anime3rb'
      }));
      items = items.concat(a3rbItems);
    }

    if (source === 'all' || source === 'okanime') {
      const okItems = OKANIME_CATALOG.map((a) => ({
        ...a,
        source: 'okanime',
        sourceName: 'سيرفر BLACK X 3 (OkAnime)',
        sourceLabel: 'OkAnime'
      }));
      items = items.concat(okItems);
    }

    if (source === 'all' || source === 'animeblkom') {
      const blkomItems = ANIMEBLKOM_CATALOG.map((a) => ({
        ...a,
        source: 'animeblkom',
        sourceName: 'سيرفر BLACK X 4 (AnimeBlkom)',
        sourceLabel: 'AnimeBlkom'
      }));
      items = items.concat(blkomItems);
    }

    if (source === 'all' || source === 'witanime') {
      try {
        const witaBrowse = await fetchBrowseAnimeList(page);
        if (witaBrowse?.items?.length) {
          items = items.concat(witaBrowse.items);
        }
      } catch (err) {
        console.warn('witanime browse fetch error:', err.message);
      }
    }

    if (source === 'all' || source === 'english') {
      try {
        const enLatest = await englishAnimeService.getLatestEpisodes();
        if (enLatest?.length) {
          items = items.concat(enLatest);
        }
      } catch (err) {
        console.warn('englishAnimeService catalog note:', err.message);
      }
    }

    res.json({ items, count: items.length, page });
  } catch (err) {
    res.status(500).json({ error: 'catalog_error', items: [] });
  }
});

/** GET /api/stream/health — is the source reachable */
router.get('/health', async (req, res) => {
  res.json(await scrapeHealth());
});

/** GET /api/stream/diagnostics — how this host's IP/UA is treated by the WAF */
router.get('/diagnostics', async (req, res) => {
  try {
    res.json(await scrapeDiagnostics());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/stream/latest — latest episodes grid across WitAnime, Anime3rb, OkAnime & AnimeBlkom */
router.get('/latest', async (req, res) => {
  const source = (req.query.source || 'all').toLowerCase();
  try {
    let witaItems = [];
    let a3rbItems = [];
    let okItems = [];
    let blkomItems = [];
    let enItems = [];

    if (source === 'all' || source === 'witanime') {
      try {
        const w = await fetchLatest();
        witaItems = (w || []).map((it) => ({
          ...it,
          source: 'witanime',
          sourceLabel: 'سيرفر BLACK X 1 (WitAnime)'
        }));
      } catch (e) {
        console.warn('witanime fetch latest note:', e.message);
      }
    }

    if (source === 'all' || source === 'english') {
      try {
        const en = await englishAnimeService.getLatestEpisodes();
        enItems = (en || []).map((it) => ({
          ...it,
          source: 'english',
          sourceLabel: '🌐 سيرفر عالمي + ترجمة عربية AI'
        }));
      } catch (e) {
        console.warn('englishAnimeService fetch latest note:', e.message);
      }
    }

    if (source === 'all' || source === 'anime3rb') {
      try {
        const a = await anime3rbService.getLatestEpisodes();
        a3rbItems = (a || []).map((it) => ({
          ...it,
          source: 'anime3rb',
          sourceLabel: 'سيرفر BLACK X 2 (Anime3rb)'
        }));
      } catch (e) {
        console.warn('anime3rb fetch latest note:', e.message);
      }
    }

    if (source === 'all' || source === 'okanime') {
      try {
        const o = await okanimeService.getLatestEpisodes();
        okItems = (o || []).map((it) => ({
          ...it,
          source: 'okanime',
          sourceLabel: 'سيرفر BLACK X 3 (OkAnime)'
        }));
      } catch (e) {
        console.warn('okanime fetch latest note:', e.message);
      }
    }

    if (source === 'all' || source === 'animeblkom') {
      try {
        const b = await animeblkomService.getLatestEpisodes();
        blkomItems = (b || []).map((it) => ({
          ...it,
          source: 'animeblkom',
          sourceLabel: 'سيرفر BLACK X 4 (AnimeBlkom)'
        }));
      } catch (e) {
        console.warn('animeblkom fetch latest note:', e.message);
      }
    }

    let combined = [];
    if (source === 'anime3rb') {
      combined = a3rbItems;
    } else if (source === 'okanime') {
      combined = okItems;
    } else if (source === 'animeblkom') {
      combined = blkomItems;
    } else if (source === 'witanime') {
      combined = witaItems;
    } else if (source === 'english') {
      combined = enItems;
    } else {
      // Interleave all sources evenly
      const maxLen = Math.max(witaItems.length, enItems.length, a3rbItems.length, okItems.length, blkomItems.length);
      const seen = new Set();
      for (let i = 0; i < maxLen; i++) {
        if (i < witaItems.length) {
          const k = `wita:${witaItems[i].slug}`;
          if (!seen.has(k)) {
            seen.add(k);
            combined.push(witaItems[i]);
          }
        }
        if (i < enItems.length) {
          const k = `en:${enItems[i].slug}`;
          if (!seen.has(k)) {
            seen.add(k);
            combined.push(enItems[i]);
          }
        }
        if (i < okItems.length) {
          const k = `ok:${okItems[i].slug}`;
          if (!seen.has(k)) {
            seen.add(k);
            combined.push(okItems[i]);
          }
        }
        if (i < a3rbItems.length) {
          const k = `a3rb:${a3rbItems[i].slug}`;
          if (!seen.has(k)) {
            seen.add(k);
            combined.push(a3rbItems[i]);
          }
        }
        if (i < blkomItems.length) {
          const k = `blkom:${blkomItems[i].slug}`;
          if (!seen.has(k)) {
            seen.add(k);
            combined.push(blkomItems[i]);
          }
        }
      }
    }

    res.json({ items: combined, totalCount: combined.length });
  } catch (err) {
    console.error('[stream/latest]', err.message);
    res.status(502).json({ error: 'upstream', message: 'Streaming source unreachable', items: [] });
  }
});

/** GET /api/stream/search?q=&source= */
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  const source = (req.query.source || 'all').toLowerCase();
  if (!q) return res.json({ items: [], results: [] });
  try {
    let witaResults = [];
    let enResults = [];
    let a3rbResults = [];
    let okResults = [];
    let blkomResults = [];

    if (source === 'all' || source === 'witanime') {
      try {
        const [w, sList] = await Promise.all([
          searchShows(q).catch(() => []),
          scraperSearchAnime(q).catch(() => [])
        ]);
        const fromW = (w || []).map((it) => ({
          ...it,
          source: 'witanime',
          sourceLabel: 'سيرفر BLACK X 1 (WitAnime)'
        }));
        const fromS = (sList || [])
          .filter((s) => s.slug)
          .map((s) => ({
            slug: s.slug,
            kind: s.type === 'Movie' ? 'movie' : 'anime',
            titleEn: s.name || s.slug,
            titleAr: s.name || s.slug,
            poster: s.img || '',
            url: `/anime/${s.slug}`,
            source: 'witanime',
            sourceLabel: 'سيرفر BLACK X 1 (WitAnime)'
          }));
        witaResults = [...fromW, ...fromS];
      } catch (_) {}
    }

    if (source === 'all' || source === 'english') {
      try {
        const en = await englishAnimeService.search(q);
        enResults = (en || []).map((it) => ({
          ...it,
          source: 'english',
          hasAutoArabicSub: true,
          sourceLabel: '🌐 مصدر إنجليزي + ترجمة عربية فورية AI'
        }));
      } catch (_) {}
    }

    if (source === 'all' || source === 'anime3rb') {
      try {
        const a = await anime3rbService.search(q);
        a3rbResults = (a || []).map((it) => ({
          ...it,
          source: 'anime3rb',
          sourceLabel: 'سيرفر BLACK X 2 (Anime3rb)'
        }));
      } catch (_) {}
    }

    if (source === 'all' || source === 'okanime') {
      try {
        const o = await okanimeService.search(q);
        okResults = (o || []).map((it) => ({
          ...it,
          source: 'okanime',
          sourceLabel: 'سيرفر BLACK X 3 (OkAnime)'
        }));
      } catch (_) {}
    }

    if (source === 'all' || source === 'animeblkom') {
      try {
        const b = await animeblkomService.search(q);
        blkomResults = (b || []).map((it) => ({
          ...it,
          source: 'animeblkom',
          sourceLabel: 'سيرفر BLACK X 4 (AnimeBlkom)'
        }));
      } catch (_) {}
    }

    const seen = new Set();
    const merged = [];
    // Prioritize WitAnime results FIRST, then English+Auto-Arabic AI Sub, then secondary sources
    for (const item of [...witaResults, ...enResults, ...okResults, ...a3rbResults, ...blkomResults]) {
      const key = `${item.source || 'src'}:${item.slug}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }

    res.json({ items: merged, results: merged, totalCount: merged.length });
  } catch (err) {
    console.error('[stream/search]', err.message);
    res.status(502).json({ error: 'upstream', message: 'Streaming source unreachable', items: [], results: [] });
  }
});

/** GET /api/stream/show/:slug?source= — metadata + episode list */
router.get('/show/:slug', async (req, res) => {
  const { slug } = req.params;
  const source = (req.query.source || '').toLowerCase();

  try {
    let show = null;

    if (source === 'english' || slug.startsWith('en-') || slug.startsWith('mal-')) {
      show = await englishAnimeService.getShow(slug);
    } else if (source === 'okanime' || slug.startsWith('ok-')) {
      show = await okanimeService.getShow(slug.replace(/^ok-/, ''));
    } else if (source === 'animeblkom' || slug.startsWith('blkom-')) {
      show = await animeblkomService.getShow(slug.replace(/^blkom-/, ''));
    } else if (source === 'anime3rb' || slug.startsWith('a3rb-')) {
      show = await anime3rbService.getShow(slug.replace(/^a3rb-/, ''));
    } else {
      // 1) Primary source: WitAnime direct slug lookup
      try {
        show = await fetchShow(slug);
        if (show) {
          show.source = 'witanime';
          show.sourceName = 'سيرفر BLACK X 1 (WitAnime)';
        }
      } catch (_) {}

      // 2) If direct slug didn't match on WitAnime, try searching WitAnime by title words
      if (!show) {
        try {
          const queryWords = slug.replace(/^(ok-|blkom-|a3rb-|ani-|en-|mal-)/, '').replace(/-/g, ' ').trim();
          const candidates = await searchShows(queryWords);
          if (candidates && candidates.length > 0 && candidates[0].slug) {
            show = await fetchShow(candidates[0].slug);
            if (show) {
              show.source = 'witanime';
              show.sourceName = 'سيرفر BLACK X 1 (WitAnime)';
            }
          }
        } catch (_) {}
      }

      // 3) Fallback to Global English Anime + Auto-Arabic AI Translation Service (covers all MAL/AniList anime!)
      if (!show) {
        try {
          show = await englishAnimeService.getShow(slug);
        } catch (_) {}
      }

      // 4) Check secondary catalogs ONLY if the slug actually exists in their catalog
      if (!show) {
        const clean = slug.replace(/^(ok-|blkom-|a3rb-)/, '').toLowerCase();
        if (OKANIME_CATALOG.some((a) => a.slug === clean)) {
          show = await okanimeService.getShow(clean).catch(() => null);
        } else if (ANIME3RB_CATALOG.some((a) => a.slug === clean)) {
          show = await anime3rbService.getShow(clean).catch(() => null);
        } else if (ANIMEBLKOM_CATALOG.some((a) => a.slug === clean)) {
          show = await animeblkomService.getShow(clean).catch(() => null);
        }
      }
    }

    if (!show) return res.status(404).json({ error: 'not_found', message: 'Show not found' });
    res.json({ show });
  } catch (err) {
    console.error('[stream/show]', err.message);
    res.status(502).json({ error: 'upstream', message: 'Streaming source unreachable' });
  }
});

/** GET /api/stream/episode/:slug/:ep — manifest entries + eagerly-resolved first source */
router.get('/episode/:slug/:ep', optionalAuth, async (req, res) => {
  const episode = Number(req.params.ep);
  const cleanSlug = req.params.slug.replace(/^(ok-|blkom-|a3rb-)/, '');
  const sourceParam = (req.query.source || '').toLowerCase();

  if (!Number.isInteger(episode) || episode < 1) {
    return res.status(400).json({ error: 'invalid_episode', message: 'Invalid episode number' });
  }

  try {
    let data = null;

    if (sourceParam === 'english' || req.params.slug.startsWith('en-') || req.params.slug.startsWith('mal-')) {
      data = await englishAnimeService.getEpisode(req.params.slug, episode);
    } else if (sourceParam === 'okanime' || req.params.slug.startsWith('ok-')) {
      data = await okanimeService.getEpisode(cleanSlug, episode);
    } else if (sourceParam === 'animeblkom' || req.params.slug.startsWith('blkom-')) {
      data = await animeblkomService.getEpisode(cleanSlug, episode);
    } else if (sourceParam === 'anime3rb' || req.params.slug.startsWith('a3rb-')) {
      data = await anime3rbService.getEpisode(cleanSlug, episode);
    } else {
      // 1) Primary source: WitAnime real episode manifest & servers
      try {
        data = await fetchEpisode(cleanSlug, episode);
      } catch (err) {
        console.warn('witanime fetchEpisode note:', err.message);
      }

      // 2) Fallback to Global English Anime + Auto-Arabic AI Translation Service
      if (!data || !data.entries?.length) {
        try {
          data = await englishAnimeService.getEpisode(cleanSlug, episode);
        } catch (_) {}
      }

      // 3) Fallback to secondary sources ONLY if still empty
      if (!data || !data.entries?.length) {
        try {
          data = await okanimeService.getEpisode(cleanSlug, episode);
        } catch (_) {}
      }

      if (!data || !data.entries?.length) {
        try {
          data = await anime3rbService.getEpisode(cleanSlug, episode);
        } catch (_) {}
      }

      if (!data || !data.entries?.length) {
        try {
          data = await animeblkomService.getEpisode(cleanSlug, episode);
        } catch (_) {}
      }
    }

    if (!data) return res.status(404).json({ error: 'not_found', message: 'Episode not found' });

    const isDev = req.user?.role === 'developer' || (req.user?.email || '').toLowerCase() === 'mz0970mmz@gmail.com';
    const vipStatus = isDev ? 'VIP Monarch' : (req.user?.vip_status || null);
    const isVipBasic = vipStatus === 'VIP Basic' || vipStatus === 'VIP Monarch' || isDev;
    const isVipMonarch = vipStatus === 'VIP Monarch' || isDev;

    // Enhance and prioritize entries based on user VIP tier
    const rawEntries = Array.isArray(data.entries) ? [...data.entries] : [];
    
    // Sort & prioritize VIP Fast CDN servers
    const prioritizedEntries = rawEntries.map((e) => {
      const isFastCdn = e.server?.toLowerCase().includes('mp4upload') ||
                        e.server?.toLowerCase().includes('mega') ||
                        e.server?.toLowerCase().includes('drive') ||
                        e.server?.toLowerCase().includes('soraplay') ||
                        e.server?.toLowerCase().includes('fast') ||
                        e.server?.toLowerCase().includes('anime3rb') ||
                        e.server?.toLowerCase().includes('ultra');

      return {
        ...e,
        isVipOnly: false,
        isFastCdn,
        serverTag: isFastCdn ? '⚡ VIP Fast CDN' : null
      };
    });

    // If VIP Monarch, surface 4K HDR 60fps ultra option
    let entriesWithVip = prioritizedEntries;
    if (isVipMonarch) {
      entriesWithVip = [
        {
          id: `vip-monarch-4k-${cleanSlug}-${episode}`,
          token: prioritizedEntries[0]?.token || 'vip-4k',
          server: '👑 VIP Monarch 4K HDR (60fps Ultra CDN)',
          quality: '4K HDR',
          version: prioritizedEntries[0]?.version || 'sub',
          lang: 'ar/jp',
          isMonarchExclusive: true,
          badge: '4K 60fps'
        },
        ...prioritizedEntries
      ];
    } else if (isVipBasic) {
      entriesWithVip.sort((a, b) => (b.isFastCdn ? 1 : 0) - (a.isFastCdn ? 1 : 0));
    }

    res.json({
      ...data,
      entries: entriesWithVip,
      vipTier: vipStatus || 'Free Otaku',
      isVipBasic,
      isVipMonarch
    });
  } catch (err) {
    console.error('[stream/episode]', err.message);
    res.status(502).json({ error: err.code || 'upstream', message: 'Could not resolve streaming sources' });
  }
});

/** POST /api/stream/resolve { slug, episode, entryId } — resolve one manifest server on demand */
router.post('/resolve', async (req, res) => {
  const { slug, episode, entryId } = req.body || {};
  const ep = Number(episode);
  if (!slug || !Number.isInteger(ep) || ep < 1 || !entryId) {
    return res.status(400).json({ error: 'bad_request', message: 'slug, episode, entryId required' });
  }

  // If this is an English Anime entry, resolve immediately
  if (String(entryId).startsWith('en-')) {
    try {
      const enData = await englishAnimeService.getEpisode(String(slug), ep);
      const match = enData?.entries?.find((e) => e.id === entryId);
      if (match) {
        return res.json({
          source: {
            embedUrl: match.embedUrl,
            directUrl: match.directUrl || null
          }
        });
      }
    } catch (_) {}
  }

  // If this is an Anime3rb entry, resolve immediately
  if (String(entryId).startsWith('a3rb-')) {
    try {
      const a3rbData = await anime3rbService.getEpisode(String(slug).replace(/^a3rb-/, ''), ep);
      const match = a3rbData?.entries?.find((e) => e.id === entryId);
      if (match) {
        return res.json({
          source: {
            embedUrl: match.embedUrl,
            directUrl: match.directUrl || null
          }
        });
      }
    } catch (_) {}
  }

  try {
    const source = await resolveEntry(String(slug), ep, String(entryId));
    if (!source) return res.status(404).json({ error: 'not_found', message: 'Server not found' });
    res.json({ source });
  } catch (err) {
    console.error('[stream/resolve]', err.message);
    res.status(502).json({ error: err.code || 'upstream', message: 'Could not resolve this server' });
  }
});

/** POST /api/stream/resolve-download { slug, episode, entryId } — resolve one download server on demand */
router.post('/resolve-download', async (req, res) => {
  const { slug, episode, entryId } = req.body || {};
  const ep = Number(episode);
  if (!slug || !Number.isInteger(ep) || ep < 1 || !entryId) {
    return res.status(400).json({ error: 'bad_request', message: 'slug, episode, entryId required' });
  }

  // If this is an Anime3rb download entry
  if (String(entryId).startsWith('dl-a3rb-')) {
    try {
      const a3rbData = await anime3rbService.getEpisode(String(slug).replace(/^a3rb-/, ''), ep);
      const match = a3rbData?.downloads?.find((d) => d.id === entryId);
      if (match) {
        return res.json({
          source: {
            url: match.downloadUrl,
            directUrl: match.downloadUrl
          }
        });
      }
    } catch (_) {}
  }

  // If this is an OkAnime download entry
  if (String(entryId).startsWith('dl-ok-')) {
    try {
      const okData = await okanimeService.getEpisode(String(slug).replace(/^ok-/, ''), ep);
      const match = okData?.downloads?.find((d) => d.id === entryId);
      if (match) {
        return res.json({
          source: {
            url: match.downloadUrl,
            directUrl: match.downloadUrl
          }
        });
      }
    } catch (_) {}
  }

  // If this is an AnimeBlkom download entry
  if (String(entryId).startsWith('dl-blkom-')) {
    try {
      const blkomData = await animeblkomService.getEpisode(String(slug).replace(/^blkom-/, ''), ep);
      const match = blkomData?.downloads?.find((d) => d.id === entryId);
      if (match) {
        return res.json({
          source: {
            url: match.downloadUrl,
            directUrl: match.downloadUrl
          }
        });
      }
    } catch (_) {}
  }

  try {
    const source = await resolveDownloadEntry(String(slug), ep, String(entryId));
    if (!source) return res.status(404).json({ error: 'not_found', message: 'Download server not found' });
    res.json({ source });
  } catch (err) {
    console.error('[stream/resolve-download]', err.message);
    res.status(502).json({ error: err.code || 'upstream', message: 'Could not resolve this download server' });
  }
});

/**
 * GET /api/stream/download-sources/:slug/:ep — resolves multi-source official download servers
 * combined with 3v1ltw1n0x01/anime_scraper multi-quality base64 links (ul.quality-list).
 */
router.get('/download-sources/:slug/:ep', async (req, res) => {
  const { slug } = req.params;
  const ep = Number(req.params.ep);
  if (!slug || !Number.isInteger(ep) || ep < 1) {
    return res.status(400).json({ error: 'bad_request', message: 'Valid slug and episode required' });
  }

  try {
    const cloudHosts = [];
    const seenUrls = new Set();

    // Check OkAnime download sources
    try {
      const okData = await okanimeService.getEpisode(slug, ep);
      if (okData?.downloads?.length) {
        for (const dl of okData.downloads) {
          if (dl.downloadUrl) seenUrls.add(dl.downloadUrl);
          cloudHosts.push({
            id: dl.id,
            server: dl.server || 'OkAnime Server',
            quality: dl.quality || 'FHD',
            url: dl.downloadUrl,
            directUrl: dl.downloadUrl,
            type: 'okanime_download'
          });
        }
      }
    } catch (_) {}

    // Check WitAnime downloads
    try {
      const payload = await fetchEpisode(slug, ep);
      const rawDownloads = payload?.downloads || [];
      for (const dl of rawDownloads) {
        let resolved = payload.resolvedDownloads?.[dl.id] || null;
        if (!resolved) {
          try {
            resolved = await resolveDownloadEntry(slug, ep, dl.id);
          } catch (_) {}
        }
        const finalUrl = resolved?.downloadUrl || resolved?.directUrl || null;
        if (finalUrl) seenUrls.add(finalUrl);
        cloudHosts.push({
          id: dl.id,
          server: dl.server || 'Server',
          quality: dl.quality || 'FHD',
          url: resolved?.downloadUrl || null,
          directUrl: resolved?.directUrl || null,
          type: 'witanime_download'
        });
      }
    } catch (_) {}

    // Check Anime3rb downloads
    try {
      const a3rbData = await anime3rbService.getEpisode(slug, ep);
      if (a3rbData?.downloads?.length) {
        for (const dl of a3rbData.downloads) {
          if (dl.downloadUrl) seenUrls.add(dl.downloadUrl);
          cloudHosts.push({
            id: dl.id,
            server: dl.server || 'Anime3rb Server',
            quality: dl.quality || 'FHD',
            url: dl.downloadUrl,
            directUrl: dl.downloadUrl,
            type: 'anime3rb_download'
          });
        }
      }
    } catch (_) {}

    // Check AnimeBlkom downloads
    try {
      const blkomData = await animeblkomService.getEpisode(slug, ep);
      if (blkomData?.downloads?.length) {
        for (const dl of blkomData.downloads) {
          if (dl.downloadUrl) seenUrls.add(dl.downloadUrl);
          cloudHosts.push({
            id: dl.id,
            server: dl.server || 'AnimeBlkom Server',
            quality: dl.quality || 'FHD',
            url: dl.downloadUrl,
            directUrl: dl.downloadUrl,
            type: 'animeblkom_download'
          });
        }
      }
    } catch (_) {}

    // Merge base64-decoded download links from 3v1ltw1n0x01/anime_scraper (ul.quality-list)
    const scraperQualities = await scraperGetEpisodeDl(slug, ep).catch(() => ({}));
    for (const [qualityGroup, links] of Object.entries(scraperQualities || {})) {
      if (qualityGroup.endsWith('_servers') || !Array.isArray(links)) continue;
      const qCode =
        qualityGroup.includes('FHD') || qualityGroup.includes('1080')
          ? 'FHD'
          : qualityGroup.includes('HD') || qualityGroup.includes('720')
          ? 'HD'
          : 'SD';

      links.forEach((linkUrl, idx) => {
        if (!linkUrl || typeof linkUrl !== 'string' || seenUrls.has(linkUrl)) return;
        seenUrls.add(linkUrl);
        let hostLabel = 'Direct Server';
        try {
          hostLabel = new URL(linkUrl).hostname.replace(/^www\./, '').split('.')[0];
        } catch {
          // ignore
        }
        cloudHosts.push({
          id: `scraper-dl-${slug}-${ep}-${qCode}-${idx}`,
          server: hostLabel,
          quality: qCode,
          qualityLabel: qualityGroup,
          url: linkUrl,
          directUrl: null,
          type: 'anime_scraper_dl'
        });
      });
    }

    res.json({
      slug,
      episode: ep,
      cloudHosts,
      qualities: scraperQualities || {},
      count: cloudHosts.length
    });
  } catch (err) {
    console.error('[stream/download-sources]', err.message);
    res.status(502).json({ error: 'upstream', message: 'Could not resolve download sources', cloudHosts: [], qualities: {} });
  }
});

/* ------------------------- video stream proxy ------------------------- */
const ALLOWED_HOSTS = [
  'mp4upload.com',
  '4shared.com',
  'videa.hu',
  'videas.hu',
  'hgcloud.me',
  'hgcloud.to',
  'yonaplay.com',
  'yonaplay.net',
  'yonaplay.org',
  'soraplay.com',
  'mega.nz',
  'mega.co.nz',
  'wtsrv.xyz',
  'mediafire.com',
  'drive.google.com',
  'google.com',
  'googleusercontent.com',
  'mail.ru',
  'yourupload.com',
  'ok.ru',
  'workupload.com',
  'gofile.io',
  'dropbox.com',
  'krakenfiles.com',
  '1fichier.com',
  'streamwish.to',
  'streamwish.com',
  'vidmoly.me',
  'vidmoly.to',
  'wahmi.org',
  'uptobox.com',
  'okanime.xyz',
  'animeblkom.com',
  'share4max.com',
  'uqload.is',
  'uqload.com',
  'streamruby.com',
  'rubyvidhub.com',
  'vkvideo.ru',
  'vk.com'
];

function hostAllowed(hostname) {
  const h = hostname.toLowerCase();
  return ALLOWED_HOSTS.some((a) => h === a || h.endsWith('.' + a) || h.endsWith(a));
}

/**
 * GET /api/stream/download?url=…&filename=… — pipes remote video with attachment header to download file to device.
 * Handles hotlink bypass (Referer/Origin) and Range headers for resume/full-file download.
 */
router.get('/download', optionalAuth, async (req, res) => {
  let target;
  try {
    target = new URL(String(req.query.url || ''));
  } catch {
    return res.status(400).json({ error: 'bad_url', message: 'Invalid url' });
  }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return res.status(400).json({ error: 'bad_url', message: 'Only http(s)' });
  }
  if (!hostAllowed(target.hostname)) {
    return res.status(403).json({ error: 'bad_host', message: 'Host not allowed' });
  }

  const rawFilename = String(req.query.filename || 'episode.mp4').trim();
  const safeFilename = rawFilename.replace(/[^a-zA-Z0-9_.\u0600-\u06FF-]/g, '_') || 'episode.mp4';
  const filename = safeFilename.endsWith('.mp4') ? safeFilename : `${safeFilename}.mp4`;

  try {
    const labels = target.hostname.split('.');
    const brand = labels.length >= 2 ? labels.slice(-2).join('.') : target.hostname;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      Accept: '*/*'
    };

    if (target.hostname.includes('mp4upload')) {
      headers.Referer = 'https://www.mp4upload.com/';
      headers.Origin = 'https://www.mp4upload.com';
    } else if (target.hostname.includes('mediafire')) {
      headers.Referer = 'https://www.mediafire.com/';
    } else {
      headers.Referer = `https://www.${brand}/`;
    }

    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    const upstream = await fetch(target.href, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(120000)
    });

    if (!upstream.ok && upstream.status !== 206) {
      console.warn(`[stream/download] upstream returned ${upstream.status} for ${target.href}`);
      // If upstream failed or returned an error status, redirect to original page instead of failing silently
      return res.redirect(target.href);
    }

    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    // If upstream returns an HTML landing page instead of a video, redirect to the page
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      return res.redirect(target.href);
    }

    const statusCode = upstream.status === 206 ? 206 : 200;
    res.status(statusCode);

    const pass = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control'];
    for (const h of pass) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }

    if (!res.getHeader('content-type')) {
      res.setHeader('Content-Type', 'video/mp4');
    }
    res.setHeader('Accept-Ranges', 'bytes');

    const asciiFilename = filename.replace(/[^\x20-\x7E]/g, '_');
    const encodedFilename = encodeURIComponent(filename);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`
    );
    res.setHeader('Access-Control-Allow-Origin', '*');

    const { Readable } = await import('stream');
    const upstreamStream = Readable.fromWeb(upstream.body);
    const cleanup = () => {
      if (!upstreamStream.destroyed) upstreamStream.destroy();
    };
    upstreamStream.on('error', cleanup);
    res.on('close', cleanup);
    res.on('error', cleanup);
    upstreamStream.pipe(res);
  } catch (err) {
    if (res.headersSent || res.destroyed) return;
    console.error('[stream/download]', err.message);
    res.status(502).json({ error: 'upstream', message: 'Download failed' });
  }
});

/**
 * GET /api/stream/proxy?url=… — pipes a remote video with Range support.
 * Keeps hotlink-protected hosts playable inside our custom player.
 */
router.get('/proxy', optionalAuth, async (req, res) => {
  let target;
  try {
    target = new URL(String(req.query.url || ''));
  } catch {
    return res.status(400).json({ error: 'bad_url', message: 'Invalid url' });
  }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return res.status(400).json({ error: 'bad_url', message: 'Only http(s)' });
  }
  if (!hostAllowed(target.hostname)) {
    return res.status(403).json({ error: 'bad_host', message: 'Host not allowed' });
  }

  try {
    // Hotlink-protected hosts (mp4upload et al.) demand a same-brand Referer
    // (e.g. https://www.mp4upload.com/ for a4.mp4upload.com:183).
    const labels = target.hostname.split('.');
    const brand = labels.length >= 2 ? labels.slice(-2).join('.') : target.hostname;
    const headers = {
      'User-Agent': 'Mozilla/5.0',
      Accept: '*/*',
      Referer: `https://www.${brand}/`,
      Origin: `https://www.${brand}`
    };
    if (req.headers.range) headers.Range = req.headers.range;

    const upstream = await fetch(target.href, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(30000)
    });

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).end();
    }

    res.status(upstream.status);
    const pass = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control'];
    for (const h of pass) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    if (!res.getHeader('content-type')) res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // pipe the body — never buffer whole videos in memory.
    // Client aborts must not crash the process (pipe errors are unhandled otherwise).
    const { Readable } = await import('stream');
    const upstreamStream = Readable.fromWeb(upstream.body);
    const cleanup = () => {
      if (!upstreamStream.destroyed) upstreamStream.destroy();
    };
    upstreamStream.on('error', cleanup);
    res.on('close', cleanup);
    res.on('error', cleanup);
    upstreamStream.pipe(res);
  } catch (err) {
    if (res.headersSent || res.destroyed) return;
    console.error('[stream/proxy]', err.message);
    res.status(502).json({ error: 'upstream', message: 'Stream fetch failed' });
  }
});

/* ------------- English -> Arabic AI Subtitle Translation API ------------- */

function extractSubtitleQuery(slug, queryParam) {
  if (queryParam && String(queryParam).trim()) return String(queryParam).trim();
  return String(slug || '')
    .replace(/^(en|mal)-\d+-/i, '')
    .replace(/^(ok|blkom|a3rb|ani)-/i, '')
    .replace(/-/g, ' ')
    .trim();
}

/** GET /api/stream/subtitles/:slug/:ep.vtt — WebVTT Arabic translated subtitles */
router.get('/subtitles/:slug/:ep.vtt', async (req, res) => {
  const { slug } = req.params;
  const ep = Math.max(1, Number(req.params.ep) || 1);
  const query = extractSubtitleQuery(slug, req.query.title || req.query.q);
  const lang = (req.query.lang || 'ar').toLowerCase();

  try {
    const subData = await getTranslatedEpisodeSubtitles({
      query,
      episode: ep,
      directSubUrl: req.query.url || null
    });
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (!subData) {
      return res.send('WEBVTT\n\n');
    }
    return res.send(lang === 'en' ? subData.vttEn : subData.vttAr);
  } catch (err) {
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    return res.send('WEBVTT\n\n');
  }
});

/** GET /api/stream/subtitles/:slug/:ep.srt — Downloadable SubRip (.srt) Arabic subtitles */
router.get('/subtitles/:slug/:ep.srt', async (req, res) => {
  const { slug } = req.params;
  const ep = Math.max(1, Number(req.params.ep) || 1);
  const query = extractSubtitleQuery(slug, req.query.title || req.query.q);

  try {
    const subData = await getTranslatedEpisodeSubtitles({
      query,
      episode: ep,
      directSubUrl: req.query.url || null
    });
    const safeName = query.replace(/[^a-z0-9-_]/gi, '_') || 'Anime';
    res.setHeader('Content-Type', 'application/x-subrip; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_Ep${ep}_AR.srt"`);
    return res.send(subData ? subData.srtAr : '');
  } catch (err) {
    return res.status(502).send('');
  }
});

/** GET /api/stream/subtitles/:slug/:ep — JSON cues (startSec, endSec, textAr, textEn) + VTT/SRT links */
router.get('/subtitles/:slug/:ep', async (req, res) => {
  const { slug } = req.params;
  const ep = Math.max(1, Number(req.params.ep) || 1);
  const query = extractSubtitleQuery(slug, req.query.title || req.query.q);

  try {
    const subData = await getTranslatedEpisodeSubtitles({
      query,
      episode: ep,
      directSubUrl: req.query.url || null
    });
    if (!subData) {
      return res.json({
        ok: false,
        cueCount: 0,
        cues: [],
        message: 'No external subtitle file found for this episode'
      });
    }
    return res.json({
      ok: true,
      query: subData.query,
      episode: subData.episode,
      fileName: subData.fileName,
      cueCount: subData.cueCount,
      cues: subData.cues,
      vttUrl: `/api/stream/subtitles/${encodeURIComponent(slug)}/${ep}.vtt?title=${encodeURIComponent(query)}`,
      srtUrl: `/api/stream/subtitles/${encodeURIComponent(slug)}/${ep}.srt?title=${encodeURIComponent(query)}`
    });
  } catch (err) {
    return res.status(502).json({ ok: false, cueCount: 0, cues: [], error: err.message });
  }
});

/** POST /api/stream/translate-subtitle — Translate custom .srt/.vtt text or URL from English to Arabic */
router.post('/translate-subtitle', async (req, res) => {
  const { text, url, query, episode } = req.body || {};
  try {
    if (text && typeof text === 'string') {
      const cues = parseSubtitles(text);
      if (!cues.length) {
        return res.status(400).json({ ok: false, message: 'No valid subtitle cues found' });
      }
      const arLines = await translateLinesToArabic(cues.map((c) => c.textEn));
      cues.forEach((c, idx) => {
        c.textAr = arLines[idx] || c.textEn;
      });
      return res.json({
        ok: true,
        cueCount: cues.length,
        cues,
        vttAr: buildVttFromCues(cues, 'textAr'),
        srtAr: buildSrtFromCues(cues, 'textAr')
      });
    }

    const subData = await getTranslatedEpisodeSubtitles({
      query: query || 'anime',
      episode: Number(episode) || 1,
      directSubUrl: url || null
    });
    if (!subData) {
      return res.status(404).json({ ok: false, message: 'Subtitle not found' });
    }
    return res.json({
      ok: true,
      cueCount: subData.cueCount,
      cues: subData.cues,
      vttAr: subData.vttAr,
      srtAr: subData.srtAr
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
