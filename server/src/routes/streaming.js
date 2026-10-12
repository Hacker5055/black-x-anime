import { Router } from 'express';
import { requireAuth, optionalAuth } from '../auth.js';
import { fetchLatest, searchShows, fetchShow, fetchEpisode, resolveEntry, resolveDownloadEntry, scrapeHealth, scrapeDiagnostics, fetchBrowseAnimeList } from '../witanime.js';
import { scraperGetEpisodeDl } from '../animeScraperApi.js';

const router = Router();

/** GET /api/stream/sources — list available anime streaming sources under BLACK X */
router.get('/sources', (req, res) => {
  res.json({
    sources: [
      {
        id: 'witanime',
        nameAr: '👑 سيرفر BLACK X',
        nameEn: 'BLACK X Server',
        site: 'https://black-x.live/',
        badge: 'BLACK X'
      }
    ]
  });
});

/** GET /api/stream/catalog — complete catalog of anime across BLACK X */
router.get('/catalog', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  try {
    let items = [];

    try {
      const witaCatalog = await fetchBrowseAnimeList(page);
      if (Array.isArray(witaCatalog) && witaCatalog.length > 0) {
        items = witaCatalog.map((it) => ({
          ...it,
          source: 'witanime',
          sourceName: 'سيرفر BLACK X',
          sourceLabel: 'سيرفر BLACK X'
        }));
      }
    } catch (err) {
      console.warn('catalog browse error:', err.message);
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

/** GET /api/stream/latest — latest episodes grid from BLACK X server */
router.get('/latest', async (req, res) => {
  try {
    let witaItems = [];
    try {
      const w = await fetchLatest();
      witaItems = (w || []).map((it) => ({
        ...it,
        source: 'witanime',
        sourceLabel: 'سيرفر BLACK X'
      }));
    } catch (e) {
      console.warn('fetch latest note:', e.message);
    }

    res.json({ items: witaItems, totalCount: witaItems.length });
  } catch (err) {
    console.error('[stream/latest]', err.message);
    res.status(502).json({ error: 'upstream', message: 'Streaming source unreachable', items: [] });
  }
});

/** GET /api/stream/search?q=&source= */
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ items: [] });
  try {
    let witaResults = [];
    try {
      const w = await searchShows(q);
      witaResults = (w || []).map((it) => ({
        ...it,
        source: 'witanime',
        sourceLabel: 'سيرفر BLACK X'
      }));
    } catch (_) {}

    res.json({ items: witaResults, totalCount: witaResults.length });
  } catch (err) {
    console.error('[stream/search]', err.message);
    res.status(502).json({ error: 'upstream', message: 'Streaming source unreachable', items: [] });
  }
});

/** GET /api/stream/show/:slug?source= — metadata + episode list */
router.get('/show/:slug', async (req, res) => {
  const cleanSlug = req.params.slug.replace(/^(wita-|ok-)/, '');

  try {
    let show = null;
    try {
      show = await fetchShow(cleanSlug);
      if (show) {
        show.source = 'witanime';
        show.sourceName = 'سيرفر BLACK X';
      }
    } catch (_) {}

    if (!show) return res.status(404).json({ error: 'not_found', message: 'Show not found' });
    res.json({ show });
  } catch (err) {
    console.error('[stream/show]', err.message);
    res.status(502).json({ error: 'upstream', message: 'Streaming source unreachable' });
  }
});

/** GET /api/stream/show-servers/:slug — list all available servers for an anime */
router.get('/show-servers/:slug', async (req, res) => {
  const { slug } = req.params;
  const cleanSlug = slug.replace(/^(wita-|ok-)/, '');

  const availableServers = [
    { id: 'witanime', name: 'سيرفر BLACK X', icon: '👑', domain: 'black-x.live', available: true }
  ];

  res.json({ slug: cleanSlug, servers: availableServers });
});

/** GET /api/stream/episode/:slug/:ep — manifest entries + eagerly-resolved first source */
router.get('/episode/:slug/:ep', optionalAuth, async (req, res) => {
  const episode = Number(req.params.ep);
  const cleanSlug = req.params.slug.replace(/^(ok-|wita-)/, '');

  if (!Number.isInteger(episode) || episode < 1) {
    return res.status(400).json({ error: 'invalid_episode', message: 'Invalid episode number' });
  }

  try {
    let data = null;
    try {
      data = await fetchEpisode(cleanSlug, episode);
    } catch (err) {
      console.warn('witanime fetchEpisode error:', err.message);
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

  // Resolve download server via BLACK X server manifest
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

export default router;
