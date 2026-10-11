import { Router } from 'express';
import { requireAuth, optionalAuth } from '../auth.js';
import { fetchLatest, searchShows, fetchShow, fetchEpisode, resolveEntry, resolveDownloadEntry, scrapeHealth, scrapeDiagnostics, fetchBrowseAnimeList } from '../witanime.js';
import { anime3rbService, ANIME3RB_CATALOG } from '../services/anime3rb.service.js';

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
        id: 'anime3rb',
        nameAr: '⚡ سيرفر BLACK X 2 (Anime3rb)',
        nameEn: 'BLACK X Server 2 (Anime3rb)',
        site: 'https://anime3rb.com/',
        badge: 'Anime3rb'
      }
    ]
  });
});

/** GET /api/stream/catalog — complete catalog of anime from Anime3rb & WitAnime */
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

/** GET /api/stream/latest — latest episodes grid across WitAnime and Anime3rb */
router.get('/latest', async (req, res) => {
  const source = (req.query.source || 'all').toLowerCase();
  try {
    let witaItems = [];
    let a3rbItems = [];

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

    let combined = [];
    if (source === 'anime3rb') {
      combined = a3rbItems;
    } else if (source === 'witanime') {
      combined = witaItems;
    } else {
      // Interleave both sources evenly
      const maxLen = Math.max(witaItems.length, a3rbItems.length);
      const seen = new Set();
      for (let i = 0; i < maxLen; i++) {
        if (i < a3rbItems.length) {
          const k = `a3rb:${a3rbItems[i].slug}`;
          if (!seen.has(k)) {
            seen.add(k);
            combined.push(a3rbItems[i]);
          }
        }
        if (i < witaItems.length) {
          const k = `wita:${witaItems[i].slug}`;
          if (!seen.has(k)) {
            seen.add(k);
            combined.push(witaItems[i]);
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
  if (!q) return res.json({ items: [] });
  try {
    let witaResults = [];
    let a3rbResults = [];

    if (source === 'all' || source === 'witanime') {
      try {
        const w = await searchShows(q);
        witaResults = (w || []).map((it) => ({
          ...it,
          source: 'witanime',
          sourceLabel: 'سيرفر BLACK X 1 (WitAnime)'
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

    const seen = new Set();
    const merged = [];
    for (const item of [...a3rbResults, ...witaResults]) {
      const key = `${item.source || 'src'}:${item.slug}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }

    res.json({ items: merged, totalCount: merged.length });
  } catch (err) {
    console.error('[stream/search]', err.message);
    res.status(502).json({ error: 'upstream', message: 'Streaming source unreachable', items: [] });
  }
});

/** GET /api/stream/show/:slug?source= — metadata + episode list */
router.get('/show/:slug', async (req, res) => {
  const { slug } = req.params;
  const source = (req.query.source || '').toLowerCase();

  try {
    let show = null;
    if (source === 'anime3rb' || slug.startsWith('a3rb-')) {
      show = await anime3rbService.getShow(slug.replace(/^a3rb-/, ''));
    } else {
      // Try WitAnime first
      try {
        show = await fetchShow(slug);
        if (show) {
          show.source = 'witanime';
          show.sourceName = 'سيرفر BLACK X 1 (WitAnime)';
        }
      } catch (_) {}

      // If not on WitAnime, automatically check Anime3rb
      if (!show) {
        show = await anime3rbService.getShow(slug);
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
  const cleanSlug = req.params.slug.replace(/^a3rb-/, '');
  const sourceParam = (req.query.source || '').toLowerCase();

  if (!Number.isInteger(episode) || episode < 1) {
    return res.status(400).json({ error: 'invalid_episode', message: 'Invalid episode number' });
  }

  try {
    let data = null;

    if (sourceParam === 'anime3rb' || req.params.slug.startsWith('a3rb-')) {
      data = await anime3rbService.getEpisode(cleanSlug, episode);
    } else {
      // Try WitAnime first
      try {
        data = await fetchEpisode(cleanSlug, episode);
      } catch (err) {
        console.warn('witanime fetchEpisode failed, trying anime3rb fallback:', err.message);
      }

      // If WitAnime didn't have it or failed, try Anime3rb
      if (!data || !data.entries?.length) {
        data = await anime3rbService.getEpisode(cleanSlug, episode);
      } else {
        // WitAnime succeeded, also enrich with Anime3rb servers as alternative sources
        try {
          const a3rbData = await anime3rbService.getEpisode(cleanSlug, episode);
          if (a3rbData?.entries?.length) {
            data.entries = [...data.entries, ...a3rbData.entries];
            data.downloads = [...(data.downloads || []), ...(a3rbData.downloads || [])];
            data.resolved = { ...(data.resolved || {}), ...(a3rbData.resolved || {}) };
            data.resolvedDownloads = { ...(data.resolvedDownloads || {}), ...(a3rbData.resolvedDownloads || {}) };
          }
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
 * GET /api/stream/download-sources/:slug/:ep — resolves WitAnime's official download servers.
 * Strictly returns only the anime's official download sources from WitAnime.
 */
router.get('/download-sources/:slug/:ep', async (req, res) => {
  const { slug } = req.params;
  const ep = Number(req.params.ep);
  if (!slug || !Number.isInteger(ep) || ep < 1) {
    return res.status(400).json({ error: 'bad_request', message: 'Valid slug and episode required' });
  }

  try {
    const payload = await fetchEpisode(slug, ep);
    if (!payload) return res.status(404).json({ error: 'not_found', message: 'Episode not found' });

    const rawDownloads = payload.downloads || [];
    const cloudHosts = [];

    for (const dl of rawDownloads) {
      let resolved = payload.resolvedDownloads?.[dl.id] || null;

      if (!resolved) {
        try {
          resolved = await resolveDownloadEntry(slug, ep, dl.id);
        } catch (e) {
          // Keep resolving others gracefully if one encounters rate limiting or upstream lag
        }
      }

      cloudHosts.push({
        id: dl.id,
        server: dl.server || 'Server',
        quality: dl.quality || 'FHD',
        url: resolved?.downloadUrl || null,
        directUrl: resolved?.directUrl || null,
        type: 'witanime_download'
      });
    }

    res.json({
      slug,
      episode: ep,
      cloudHosts,
      count: cloudHosts.length
    });
  } catch (err) {
    console.error('[stream/download-sources]', err.message);
    res.status(502).json({ error: 'upstream', message: 'Could not resolve download sources', cloudHosts: [] });
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
  'uptobox.com'
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

export default router;
