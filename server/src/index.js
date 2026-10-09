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
import { optionalAuth } from './auth.js';
import { db } from './db.js';
import { main as seedAll, enrichLibrary } from './seed.js';

// never let a stray async error kill the API (client aborts during video
// streaming are the usual suspects)
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err?.message || err);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err?.message || err);
});

// Auto-seed on first boot: free hosts (Render etc.) have ephemeral disks,
// so a redeploy starts with an empty database. Quick rows appear instantly,
// then live metadata is enriched in the background.
try {
  const { c: userCount } = db.prepare('SELECT COUNT(*) AS c FROM users').get();
  if (userCount === 0) {
    console.log('🌱 Empty database — seeding demo data…');
    seedAll({ quick: true })
      .then(() => {
        console.log('🌱 Quick seed done — enriching metadata in background');
        // self-heal: keep trying in case the source rate-limits or the host
        // IP starts cold — stops after ~5 attempts (≈15 min)
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 4001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(optionalAuth);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'BLACK X API', time: new Date().toISOString() });
});

/**
 * Image proxy for the dominant-color extractor.
 * Restricted to the AniList + witanime image CDNs to avoid open-proxy abuse.
 */
app.get('/api/proxy-image', async (req, res) => {
  try {
    const url = new URL(String(req.query.url || ''));
    const ok = url.hostname === 's4.anilist.co' || url.hostname === 'images.witanime.site';
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

// Serve the built client in production
const clientDist = join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(join(clientDist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error('[server error]', err);
  res.status(500).json({ error: 'server_error', message: 'Something went wrong' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ⚡ BLACK X API listening on http://0.0.0.0:${PORT}\n`);
});
