import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

import authRoutes from './routes/auth.js';
import animeRoutes from './routes/anime.js';
import streamingRoutes from './routes/streaming.js';
import libraryRoutes from './routes/library.js';
import devRoutes from './routes/dev.js';
import communityRoutes from './routes/community.js';
import contentRoutes from './routes/content.routes.js';
import communitySpecRoutes from './routes/community.routes.js';
import profileRoutes from './routes/profile.routes.js';
import gamificationRoutes from './routes/gamification.routes.js';
import supportRoutes from './routes/support.routes.js';
import mangaNovelRoutes from './routes/mangaNovel.routes.js';
import { animeScraperRouter } from './routes/animeScraper.routes.js';
import { optionalAuth } from './auth.js';
import { db } from './db.js';
import { main as seedAll, enrichLibrary } from './seed.js';

const IS_CLOUDFLARE_WORKER = Boolean(globalThis.__BLACKX_CLOUDFLARE_RUNTIME__);

// Never let a stray async error kill the Node-hosted API (client aborts during
// video streaming are the usual suspects). Workers manage request failures in
// their own event lifecycle.
if (!IS_CLOUDFLARE_WORKER) {
  process.on('unhandledRejection', (err) => {
    console.error('[unhandledRejection]', err?.message || err);
  });
  process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err?.message || err);
  });
}

// Auto-seed Node hosts on first boot. Cloudflare initializes the durable SQL
// schema through its persistent SQLite adapter and avoids background seeding.
if (!IS_CLOUDFLARE_WORKER) {
  try {
    const { c: userCount } = db.prepare('SELECT COUNT(*) AS c FROM users').get();
    if (userCount === 0) {
      console.log('🌱 Empty database — seeding demo data…');
      seedAll({ quick: true })
        .then(() => {
          console.log('🌱 Quick seed done — enriching metadata in background');
          const attempt = (n) => enrichLibrary()
            .then(() => console.log('✨ Library enriched with live metadata'))
            .catch((err) => {
              console.error('enrich attempt failed:', err?.message || err);
              if (n < 5) setTimeout(() => attempt(n + 1), 3 * 60 * 1000);
            });
          return attempt(1);
        })
        .catch((err) => console.error('seed failed:', err?.message || err));
    }
  } catch (err) {
    console.error('auto-seed check failed:', err?.message || err);
  }
}

const __dirname = IS_CLOUDFLARE_WORKER ? '' : dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(optionalAuth);

app.get('/api/health', (req, res) => {
  try {
    // Verify the schema used by authentication, not just that Express is alive.
    db.prepare('SELECT id, username, email, password_hash FROM users LIMIT 0').all();
    res.json({ ok: true, name: 'BLACK X API', database: 'ok', time: new Date().toISOString() });
  } catch (err) {
    const requestId = req.get('cf-ray') || req.get('x-vercel-id') || req.get('x-request-id') || null;
    console.error('[health database failure]', JSON.stringify({
      requestId,
      name: err?.name || 'Error',
      code: err?.code || null,
      message: err?.message || String(err)
    }));
    res.status(503).json({
      ok: false,
      name: 'BLACK X API',
      database: 'error',
      requestId,
      time: new Date().toISOString()
    });
  }
});

/**
 * Image proxy for the dominant-color extractor.
 * Restricted to the AniList + witanime image CDNs to avoid open-proxy abuse.
 */
app.get('/api/proxy-image', async (req, res) => {
  try {
    if (!req.query.url) return res.status(400).json({ error: 'missing_url' });
    const url = new URL(req.query.url);
    const ok = url.hostname === 's4.anilist.co' ||
      url.hostname === 'images.witanime.site' ||
      url.hostname === 'anime3rb.com' ||
      url.hostname.endsWith('.anime3rb.com') ||
      url.hostname.includes('animeify.net') ||
      url.hostname.includes('mangalik.net');
    if (!ok) {
      return res.status(400).json({ error: 'bad_host', message: 'Host not allowed' });
    }
    const upstream = await fetch(url.href, {
      headers: { 'User-Agent': 'BLACK-X/1.0 (color-extraction)' },
      signal: AbortSignal.timeout(8000)
    });
    if (!upstream.ok) return res.status(upstream.status).end();
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    res.status(502).json({ error: 'upstream', message: 'Image fetch failed' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/anime', animeRoutes);
app.use('/api/stream', streamingRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/dev', devRoutes);
app.use('/api/settings', devRoutes);
app.use('/api/community', communityRoutes);

// Prisma/PostgreSQL social & gamification API (see prisma/schema.prisma)
app.use('/api/content', contentRoutes);
app.use('/api/community', communitySpecRoutes); // POST /follow (+ spec GET /posts fallback)
app.use('/api/profile', profileRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/creator', gamificationRoutes); // POST /submit lives in gamification.routes.js
app.use('/api/support', supportRoutes);
app.use('/api', mangaNovelRoutes); // Manga, Manhwa, Light Novels, AniList, MangaDex, Scraper & Tracking
app.use('/api/anime-scraper', animeScraperRouter); // 3v1ltw1n0x01/anime_scraper API under /api/anime-scraper
app.use('/', animeScraperRouter); // Also expose top-level /search-anime, /get-episodes, /get-episode-dl, /latest-episodes, /fetch-seasonals, /get-anime-info

// Platform injectors (AI Studio _websocket-interceptor.js) register a
// service worker via a relative URL — serve a valid one for ANY nested path
// so registration stops failing with an HTML MIME SecurityError.
const SW_JS = "self.addEventListener('install', () => self.skipWaiting());\nself.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => self.clients.claim())); });\nself.addEventListener('fetch', () => {});\n";
app.get(/_service-worker\.js$/, (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.type('application/javascript').send(SW_JS);
});

// Serve the built client in production
const clientDist = join(__dirname, '..', '..', 'client', 'dist');
if (!IS_CLOUDFLARE_WORKER && fs.existsSync(clientDist)) {
  app.use(
    express.static(clientDist, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        }
      }
    })
  );
  app.get(/^(?!\/api).*/, (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(join(clientDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  const requestId = req.get('cf-ray') || req.get('x-vercel-id') || req.get('x-request-id') || null;
  const safePath = String(req.originalUrl || req.path || '').split('?')[0];
  const error = err instanceof Error ? err : new Error(String(err || 'Unknown server error'));
  console.error('[server error]', JSON.stringify({
    requestId,
    method: req.method,
    path: safePath,
    name: error.name,
    code: error.code || null,
    message: error.message,
    stack: error.stack || null
  }));

  if (res.headersSent) return next(error);
  if (requestId) res.setHeader('x-blackx-request-id', requestId);
  res.status(500).json({ error: 'server_error', message: 'Something went wrong', requestId });
});

if (!IS_CLOUDFLARE_WORKER && !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ⚡ BLACK X API listening on http://0.0.0.0:${PORT}\n`);
  });
}

export default app;
