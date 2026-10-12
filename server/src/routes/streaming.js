import { Router } from 'express';
import { requireAuth, optionalAuth } from '../auth.js';
import { fetchLatest, searchShows, fetchShow, fetchEpisode, resolveEntry, resolveDownloadEntry, scrapeHealth, scrapeDiagnostics, fetchBrowseAnimeList, isTitleMatch } from '../witanime.js';
import { scraperGetEpisodeDl, scraperSearchAnime } from '../animeScraperApi.js';
import { anime3rbService } from '../services/anime3rb.service.js';
import { okanimeService } from '../services/okanime.service.js';
import { animeblkomService } from '../services/animeblkom.service.js';
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
        nameAr: '🌟 جميع سيرفرات BLACK X (الكل)',
        nameEn: 'All BLACK X Servers',
        badge: 'BLACK X'
      },
      {
        id: 'witanime',
        nameAr: '👑 سيرفر BLACK X 1',
        nameEn: 'BLACK X Server 1',
        badge: 'BLACK X 1'
      },
      {
        id: 'anime3rb',
        nameAr: '⚡ سيرفر BLACK X 2',
        nameEn: 'BLACK X Server 2',
        badge: 'BLACK X 2'
      },
      {
        id: 'english',
        nameAr: '🌐 سيرفر BLACK X 3',
        nameEn: 'BLACK X Server 3',
        badge: 'BLACK X 3'
      }
    ]
  });
});

/** GET /api/stream/catalog — complete catalog of anime across all BLACK X servers */
router.get('/catalog', async (req, res) => {
  const source = (req.query.source || 'all').toLowerCase();
  const page = Math.max(1, Number(req.query.page) || 1);
  try {
    let items = [];

    const tasks = [];
    if (source === 'all' || source === 'witanime') {
      tasks.push(
        fetchBrowseAnimeList(page)
          .then((witaBrowse) =>
            (witaBrowse?.items || []).map((a) => ({
              ...a,
              source: 'witanime',
              sourceName: 'سيرفر BLACK X 1',
              sourceLabel: 'سيرفر BLACK X 1'
            }))
          )
          .catch(() => [])
      );
    }

    if (source === 'all' || source === 'anime3rb') {
      tasks.push(
        anime3rbService
          .getLatestEpisodes(page)
          .then((a3rbList) =>
            (a3rbList || []).map((a) => ({
              ...a,
              source: 'anime3rb',
              sourceName: 'سيرفر BLACK X 2',
              sourceLabel: 'سيرفر BLACK X 2'
            }))
          )
          .catch(() => [])
      );
    }

    if (source === 'all' || source === 'english') {
      tasks.push(
        englishAnimeService
          .getLatestEpisodes(page)
          .then((enLatest) =>
            (enLatest || []).map((a) => ({
              ...a,
              source: 'english',
              sourceName: 'سيرفر BLACK X 3',
              sourceLabel: 'سيرفر BLACK X 3'
            }))
          )
          .catch(() => [])
      );
    }

    const results = await Promise.all(tasks);
    for (const group of results) {
      items = items.concat(group);
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

/** GET /api/stream/latest — latest episodes grid across BLACK X Server 1, 2 & 3 */
router.get('/latest', async (req, res) => {
  const source = (req.query.source || 'all').toLowerCase();
  try {
    let witaItems = [];
    let a3rbItems = [];
    let enItems = [];

    const tasks = [];
    if (source === 'all' || source === 'witanime') {
      tasks.push(
        fetchLatest()
          .then((w) => {
            witaItems = (w || []).map((it) => ({
              ...it,
              source: 'witanime',
              sourceLabel: 'سيرفر BLACK X 1'
            }));
          })
          .catch(() => {})
      );
    }

    if (source === 'all' || source === 'anime3rb') {
      tasks.push(
        anime3rbService
          .getLatestEpisodes(1)
          .then((a) => {
            a3rbItems = (a || []).map((it) => ({
              ...it,
              source: 'anime3rb',
              sourceLabel: 'سيرفر BLACK X 2'
            }));
          })
          .catch(() => {})
      );
    }

    if (source === 'all' || source === 'english') {
      tasks.push(
        englishAnimeService
          .getLatestEpisodes(1)
          .then((en) => {
            enItems = (en || []).map((it) => ({
              ...it,
              source: 'english',
              sourceLabel: 'سيرفر BLACK X 3'
            }));
          })
          .catch(() => {})
      );
    }

    await Promise.all(tasks);

    let combined = [];
    if (source === 'anime3rb') {
      combined = a3rbItems;
    } else if (source === 'witanime') {
      combined = witaItems;
    } else if (source === 'english') {
      combined = enItems;
    } else {
      const maxLen = Math.max(witaItems.length, a3rbItems.length, enItems.length);
      const seen = new Set();
      for (let i = 0; i < maxLen; i++) {
        if (i < witaItems.length) {
          const k = `wita:${witaItems[i].slug}`;
          if (!seen.has(k)) {
            seen.add(k);
            combined.push(witaItems[i]);
          }
        }
        if (i < a3rbItems.length) {
          const k = `a3rb:${a3rbItems[i].slug}`;
          if (!seen.has(k)) {
            seen.add(k);
            combined.push(a3rbItems[i]);
          }
        }
        if (i < enItems.length) {
          const k = `en:${enItems[i].slug}`;
          if (!seen.has(k)) {
            seen.add(k);
            combined.push(enItems[i]);
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
    let a3rbResults = [];
    let enResults = [];

    const tasks = [];
    if (source === 'all' || source === 'witanime') {
      tasks.push(
        Promise.all([
          searchShows(q).catch(() => []),
          scraperSearchAnime(q).catch(() => [])
        ]).then(([w, sList]) => {
          const fromW = (w || [])
            .filter((it) => isTitleMatch(q, it.titleEn || it.titleAr, it.slug))
            .map((it) => ({
              ...it,
              source: 'witanime',
              sourceLabel: 'سيرفر BLACK X 1'
            }));
          const fromS = (sList || [])
            .filter((s) => s.slug && isTitleMatch(q, s.name, s.slug))
            .map((s) => ({
              slug: s.slug,
              kind: s.type === 'Movie' ? 'movie' : 'anime',
              titleEn: s.name || s.slug,
              titleAr: s.name || s.slug,
              poster: s.img || '',
              url: `/anime/${s.slug}`,
              source: 'witanime',
              sourceLabel: 'سيرفر BLACK X 1'
            }));
          witaResults = [...fromW, ...fromS];
        })
      );
    }

    if (source === 'all' || source === 'anime3rb') {
      tasks.push(
        anime3rbService
          .search(q)
          .then((a) => {
            a3rbResults = (a || []).map((it) => ({
              ...it,
              source: 'anime3rb',
              sourceLabel: 'سيرفر BLACK X 2'
            }));
          })
          .catch(() => {})
      );
    }

    if (source === 'all' || source === 'english') {
      tasks.push(
        englishAnimeService
          .search(q)
          .then((en) => {
            enResults = (en || []).map((it) => ({
              ...it,
              source: 'english',
              hasAutoArabicSub: true,
              sourceLabel: 'سيرفر BLACK X 3'
            }));
          })
          .catch(() => {})
      );
    }

    await Promise.all(tasks);

    const seen = new Set();
    const merged = [];
    for (const item of [...witaResults, ...a3rbResults, ...enResults]) {
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
    } else if (source === 'anime3rb' || slug.startsWith('a3rb-') || source === 'okanime' || slug.startsWith('ok-') || source === 'animeblkom' || slug.startsWith('blkom-')) {
      show = await anime3rbService.getShow(slug.replace(/^(a3rb-|ok-|blkom-)/, ''));
    } else {
      // 1) Primary source: BLACK X Server 1 direct slug lookup
      try {
        show = await fetchShow(slug);
        if (show) {
          show.source = 'witanime';
          show.sourceName = 'سيرفر BLACK X 1';
        }
      } catch (_) {}

      // 2) If direct slug didn't match on BLACK X 1, search BLACK X 1 with strict title verification
      if (!show) {
        try {
          const queryWords = slug.replace(/^(ok-|blkom-|a3rb-|ani-|en-|mal-)/, '').replace(/-/g, ' ').trim();
          const candidates = await searchShows(queryWords);
          const verified = (candidates || []).find((c) => isTitleMatch(queryWords, c.titleEn || c.titleAr, c.slug));
          if (verified?.slug) {
            show = await fetchShow(verified.slug);
            if (show) {
              show.source = 'witanime';
              show.sourceName = 'سيرفر BLACK X 1';
            }
          }
        } catch (_) {}
      }

      // 3) Check BLACK X Server 2 (Animeify v4 API) with strict title verification
      if (!show) {
        try {
          show = await anime3rbService.getShow(slug);
        } catch (_) {}
      }

      // 4) Fallback to BLACK X Server 3
      if (!show) {
        try {
          show = await englishAnimeService.getShow(slug);
        } catch (_) {}
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
    } else if (sourceParam === 'anime3rb' || req.params.slug.startsWith('a3rb-') || sourceParam === 'okanime' || req.params.slug.startsWith('ok-') || sourceParam === 'animeblkom' || req.params.slug.startsWith('blkom-')) {
      data = await anime3rbService.getEpisode(cleanSlug, episode);
      // Cross-enrich with BLACK X Server 1 if title matches
      if (data) {
        try {
          const searchTitle = cleanSlug.replace(/^x/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
          const witaCand = await searchShows(searchTitle).catch(() => []);
          const verified = (witaCand || []).find((c) => isTitleMatch(searchTitle, c.titleEn, c.slug));
          if (verified?.slug) {
            const witaEp = await fetchEpisode(verified.slug, episode).catch(() => null);
            if (witaEp?.entries?.length) {
              for (const we of witaEp.entries) {
                data.entries.push({ ...we, witaSlug: verified.slug });
              }
              Object.assign(data.resolved, witaEp.resolved || {});
              for (const wd of witaEp.downloads || []) {
                data.downloads.push({ ...wd, witaSlug: verified.slug });
              }
              Object.assign(data.resolvedDownloads, witaEp.resolvedDownloads || {});
            }
          }
        } catch (_) {}
      }
    } else {
      // 1) Primary source: BLACK X Server 1 + cross-linked BLACK X Server 2 direct MP4 servers
      const [witaEp, bx2Ep] = await Promise.all([
        fetchEpisode(cleanSlug, episode).catch(() => null),
        anime3rbService.getEpisode(cleanSlug, episode).catch(() => null)
      ]);

      if (witaEp && witaEp.entries?.length) {
        data = {
          ...witaEp,
          entries: [...(bx2Ep?.entries || []), ...witaEp.entries],
          downloads: [...(bx2Ep?.downloads || []), ...(witaEp.downloads || [])],
          resolved: { ...(bx2Ep?.resolved || {}), ...(witaEp.resolved || {}) },
          resolvedDownloads: { ...(bx2Ep?.resolvedDownloads || {}), ...(witaEp.resolvedDownloads || {}) }
        };
      } else if (bx2Ep && bx2Ep.entries?.length) {
        data = bx2Ep;
      }

      // 2) Fallback to BLACK X Server 3 if not on Server 1 or 2
      if (!data || !data.entries?.length) {
        try {
          data = await englishAnimeService.getEpisode(cleanSlug, episode);
        } catch (_) {}
      }
    }

    if (!data) return res.status(404).json({ error: 'not_found', message: 'Episode not found' });

    const isDev = req.user?.role === 'developer' || (req.user?.email || '').toLowerCase() === 'mz0970mmz@gmail.com';
    const vipStatus = isDev ? 'VIP Monarch' : (req.user?.vip_status || null);
    const isVipBasic = vipStatus === 'VIP Basic' || vipStatus === 'VIP Monarch' || isDev;
    const isVipMonarch = vipStatus === 'VIP Monarch' || isDev;

    const rawEntries = Array.isArray(data.entries) ? [...data.entries] : [];
    const prioritizedEntries = rawEntries.map((e) => {
      const isFastCdn =
        Boolean(e.isFastCdn) ||
        Boolean(e.directUrl) ||
        e.server?.toLowerCase().includes('direct') ||
        e.server?.toLowerCase().includes('stream') ||
        e.server?.toLowerCase().includes('cloud');

      return {
        ...e,
        isVipOnly: false,
        isFastCdn,
        serverTag: isFastCdn ? '⚡ BLACK X Fast CDN' : null
      };
    });

    let entriesWithVip = prioritizedEntries;
    const resolvedMap = { ...(data.resolved || {}) };
    if (isVipMonarch && prioritizedEntries.length > 0) {
      const firstReal = prioritizedEntries[0];
      const vipId = `vip-monarch-4k-${cleanSlug}-${episode}`;
      let firstResolved = resolvedMap[firstReal.id] || null;
      if (!firstResolved && (firstReal.embedUrl || firstReal.directUrl)) {
        firstResolved = {
          embedUrl: firstReal.embedUrl || null,
          directUrl: firstReal.directUrl || null
        };
      }
      if (firstResolved) {
        resolvedMap[vipId] = firstResolved;
      }
      entriesWithVip = [
        {
          id: vipId,
          realEntryId: firstReal.id,
          witaSlug: firstReal.witaSlug || null,
          embedUrl: firstReal.embedUrl || firstResolved?.embedUrl || null,
          directUrl: firstReal.directUrl || firstResolved?.directUrl || null,
          token: firstReal.token || 'vip-4k',
          server: '👑 BLACK X Monarch 4K HDR (60fps Ultra)',
          quality: '4K HDR',
          version: firstReal.version || 'sub',
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
      resolved: resolvedMap,
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

  // Handle VIP Monarch 4K synthetic entry by resolving the primary entry of the episode
  if (String(entryId).startsWith('vip-monarch-4k-')) {
    try {
      if (String(slug).startsWith('en-') || String(slug).startsWith('mal-')) {
        const enData = await englishAnimeService.getEpisode(String(slug), ep);
        const first = enData?.entries?.[0];
        if (first) {
          if (first.embedUrl || first.directUrl) {
            return res.json({ source: { embedUrl: first.embedUrl || null, directUrl: first.directUrl || null } });
          }
          if (first.witaSlug) {
            const witaSource = await resolveEntry(first.witaSlug, ep, first.id);
            if (witaSource) return res.json({ source: witaSource });
          }
        }
      } else {
        const bx2Ep = await anime3rbService.getEpisode(String(slug).replace(/^a3rb-/, ''), ep).catch(() => null);
        if (bx2Ep?.entries?.[0]?.embedUrl || bx2Ep?.entries?.[0]?.directUrl) {
          return res.json({
            source: {
              embedUrl: bx2Ep.entries[0].embedUrl || null,
              directUrl: bx2Ep.entries[0].directUrl || null
            }
          });
        }
        const witaEp = await fetchEpisode(String(slug), ep);
        const first = witaEp?.entries?.[0];
        if (first) {
          const source = await resolveEntry(String(slug), ep, first.id);
          if (source) return res.json({ source });
        }
      }
    } catch (_) {}
  }

  // If this is an English Anime entry or slug, resolve via englishAnimeService / witaSlug
  if (String(entryId).startsWith('en-') || String(slug).startsWith('en-') || String(slug).startsWith('mal-')) {
    try {
      const enData = await englishAnimeService.getEpisode(String(slug), ep);
      const match = enData?.entries?.find((e) => e.id === entryId);
      if (match) {
        if (match.embedUrl || match.directUrl) {
          return res.json({
            source: {
              embedUrl: match.embedUrl || null,
              directUrl: match.directUrl || null
            }
          });
        }
        if (match.witaSlug) {
          const witaSource = await resolveEntry(match.witaSlug, ep, String(entryId));
          if (witaSource) return res.json({ source: witaSource });
        }
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

    // 1) Check BLACK X Server 2 direct MP4 download sources first
    try {
      const a3rbData = await anime3rbService.getEpisode(slug, ep);
      if (a3rbData?.downloads?.length) {
        for (const dl of a3rbData.downloads) {
          if (dl.downloadUrl) seenUrls.add(dl.downloadUrl);
          cloudHosts.push({
            id: dl.id,
            server: dl.server || '📥 سيرفر تحميل BLACK X المباشر',
            quality: dl.quality || 'FHD',
            url: dl.downloadUrl,
            directUrl: dl.downloadUrl,
            type: 'blackx_direct_download'
          });
        }
      }
    } catch (_) {}

    // 2) Check BLACK X Server 1 downloads
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
          server: dl.server || '📥 سيرفر تحميل BLACK X',
          quality: dl.quality || 'FHD',
          url: resolved?.downloadUrl || null,
          directUrl: resolved?.directUrl || null,
          type: 'blackx_download'
        });
      }
    } catch (_) {}

    // 3) Merge multi-quality download links
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
        cloudHosts.push({
          id: `scraper-dl-${slug}-${ep}-${qCode}-${idx}`,
          server: `📥 سيرفر تحميل BLACK X ${idx + 1} (${qCode})`,
          quality: qCode,
          qualityLabel: qualityGroup,
          url: linkUrl,
          directUrl: null,
          type: 'blackx_scraper_dl'
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
  'sendvid.com',
  'animeify.net',
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
  'vk.com',
  'animeheaven.me',
  'premilkyway.com',
  'sunrisegroveproduction.cfd',
  'vibuxer.com',
  'huntrexus.com'
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
    } else if (target.hostname.includes('animeheaven.me')) {
      headers.Referer = 'https://animeheaven.me/';
      headers.Origin = 'https://animeheaven.me';
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
    const isAh = target.hostname.includes('animeheaven.me');
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Accept: '*/*',
      Referer: isAh ? 'https://animeheaven.me/' : `https://www.${brand}/`,
      Origin: isAh ? 'https://animeheaven.me' : `https://www.${brand}`
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

/**
 * GET /api/stream/hls-lib.js — serves local hls.min.js so self-hosted HLS player needs zero external CDNs
 */
router.get('/hls-lib.js', async (_req, res) => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const hlsPath = path.resolve(process.cwd(), 'node_modules/hls.js/dist/hls.min.js');
    const js = await fs.readFile(hlsPath, 'utf8');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(js);
  } catch {
    res.status(404).end();
  }
});

/**
 * GET /api/stream/hls-proxy?url=… — proxies HLS .m3u8 playlists and .ts segments with Referer bypass
 */
router.get('/hls-proxy', async (req, res) => {
  let target;
  try {
    target = new URL(String(req.query.url || ''));
  } catch {
    return res.status(400).send('Invalid url');
  }
  try {
    const upstream = await fetch(target.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: '*/*',
        Referer: 'https://vibuxer.com/',
        Origin: 'https://vibuxer.com'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(25000)
    });
    if (!upstream.ok) return res.status(upstream.status).end();

    const ct = (upstream.headers.get('content-type') || '').toLowerCase();
    const isM3u8 =
      target.pathname.endsWith('.m3u8') ||
      target.pathname.endsWith('.txt') ||
      ct.includes('mpegurl') ||
      ct.includes('text/plain');

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (isM3u8) {
      const text = await upstream.text();
      if (text.trimStart().startsWith('#EXTM3U')) {
        const rewritten = text
          .split(/\r?\n/)
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return line;
            if (trimmed.startsWith('#')) {
              return line.replace(/URI="([^"]+)"/g, (_, uri) => {
                try {
                  const full = new URL(uri, target.href).href;
                  return `URI="/api/stream/hls-proxy?url=${encodeURIComponent(full)}"`;
                } catch {
                  return `URI="${uri}"`;
                }
              });
            }
            try {
              const full = new URL(trimmed, target.href).href;
              return `/api/stream/hls-proxy?url=${encodeURIComponent(full)}`;
            } catch {
              return line;
            }
          })
          .join('\n');
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        return res.send(rewritten);
      }
    }

    if (ct) res.setHeader('Content-Type', ct);
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
    if (!res.headersSent) res.status(502).end();
  }
});

/**
 * GET /api/stream/hls-player?url=…&sub=… — Self-hosted, 100% Sandbox-Safe HTML5 + hls.js player
 */
router.get('/hls-player', (req, res) => {
  const rawUrl = String(req.query.url || '');
  const subUrl = String(req.query.sub || '');
  if (!rawUrl) return res.status(400).send('Missing url');
  const proxiedM3u8 = `/api/stream/hls-proxy?url=${encodeURIComponent(rawUrl)}`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>BLACK X HLS Player</title>
<style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
  video { width: 100%; height: 100%; object-fit: contain; background: #000; outline: none; }
  video::cue { background: rgba(0,0,0,0.78); color: #fff; font-family: 'Cairo', 'Tajawal', sans-serif; font-size: 1.15rem; }
</style>
<script src="/api/stream/hls-lib.js"></script>
</head>
<body>
<video id="v" controls autoplay playsinline crossorigin="anonymous">
  ${subUrl ? `<track kind="subtitles" srclang="ar" label="العربية (AI)" src="${subUrl.replace(/"/g, '&quot;')}" default />` : ''}
</video>
<script>
  const video = document.getElementById('v');
  const src = ${JSON.stringify(proxiedM3u8)};
  if (window.Hls && Hls.isSupported()) {
    const hls = new Hls({ maxBufferLength: 30 });
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = src;
    video.addEventListener('loadedmetadata', () => { video.play().catch(() => {}); });
  }
</script>
</body>
</html>`);
});

/**
 * GET /api/stream/mp4-player?url=…&sub=… — Self-hosted, 100% Sandbox-Safe HTML5 MP4 player with Arabic subtitles
 */
router.get('/mp4-player', (req, res) => {
  const rawUrl = String(req.query.url || '');
  const subUrl = String(req.query.sub || '');
  if (!rawUrl) return res.status(400).send('Missing url');
  const proxiedMp4 = `/api/stream/proxy?url=${encodeURIComponent(rawUrl)}`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>BLACK X Direct Player</title>
<style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
  video { width: 100%; height: 100%; object-fit: contain; background: #000; outline: none; }
  video::cue { background: rgba(0,0,0,0.78); color: #fff; font-family: 'Cairo', 'Tajawal', sans-serif; font-size: 1.15rem; }
</style>
</head>
<body>
<video id="v" src="${proxiedMp4.replace(/"/g, '&quot;')}" controls autoplay playsinline crossorigin="anonymous">
  ${subUrl ? `<track kind="subtitles" srclang="ar" label="العربية (AI)" src="${subUrl.replace(/"/g, '&quot;')}" default />` : ''}
</video>
</body>
</html>`);
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
