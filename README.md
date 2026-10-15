# BLACK X ⚡ — Anime Streaming Platform

A bilingual (English / العربية) **anime streaming platform** with a Liquid-Glass UI:
custom video player, live catalog + streams from **witanime.site**, AniList discovery,
favorites (watchlist) and continue-watching — all persisted per user.

## Features

- 🎬 **Custom Liquid-Glass video player** — glass play overlay, scrubber, ±seek, volume,
  speed, PiP, fullscreen, keyboard shortcuts (Space/K · ←/→ · ↑/↓ · F · M), auto-hiding
  chrome, server/quality drawer, resume prompt, next-episode flow
- 🔌 **witanime.site scraper** — search, latest episodes, full episode lists (1,000+),
  and the full stream-resolution chain (manifest → gate → direct MP4 extraction),
  with per-server on-demand resolution and stale-while-revalidate caching
- 📺 **Continue Watching + Favorites** — per-account, persisted in SQLite, with history,
  progress bars, mark-watched and auto-complete at 95%
- 🌐 **Bilingual EN/AR** — one toggle in the nav; layout flips RTL/LTR automatically
- 🫧 **Liquid Glass design** — dark base, poster-color ambient blurs, water-drop hovers,
  liquid loading states, optimistic updates, responsive desktop + mobile
- 🔐 **Auth** — JWT httpOnly cookies, demo accounts below
- 📡 **AniList GraphQL** — trending/season discovery with live metadata (never hardcoded)

## Optional BLACK X 4 — AniProject v3 anime + manga source

[**AniProject v3.0.0**](https://github.com/ErickLimaS/anime-website/releases/tag/v3.0.0)
provides **application source code**, not a content API at the release URL. Its
backend calls a separately hosted Consumet API (Zoro anime / MangaDex manga)
and requires Redis. BLACK X integrates with that **backend** when you provide
its URL; it does not embed the upstream Next.js frontend, copy its code/assets,
or depend on a public demo website.

1. Deploy your own AniProject **v3 backend** according to its [backend setup](https://github.com/ErickLimaS/anime-website/tree/v3.0.0/backend)
   (including its Redis and Consumet settings). Check its non-commercial
   [CC BY-NC-SA 4.0 license](https://github.com/ErickLimaS/anime-website/blob/v3.0.0/LICENSE.md)
   and the rights/terms of the underlying media before deployment.
2. Set `ANIPROJECT_API_URL=https://your-aniproject-backend.example` in **BLACK X's
   server** environment (Vercel → Project → Settings → Environment Variables),
   then redeploy. Never set it to the GitHub release, the frontend URL, or a
   Consumet URL. For local development only, `http://localhost:<port>` is accepted.
3. Optionally set `ANIPROJECT_MEDIA_HOSTS=cdn.example.com,media.example.net` to
   allowlist *only* the actual media CDN hosts for BLACK X's video/HLS proxy.
   Without it, browser-direct playback is tried; HLS then depends on upstream
   CORS. Add every playlist/segment host that needs proxying. An entry also
   permits its subdomains: only list domains whose subdomains you trust. Do not
   use `*`, scheme prefixes, private addresses, or untrusted domains.

With the backend configured, BLACK X 4 appears in the bilingual server selector
and **all-source searches**. Anime search → show → episodes → playback (HLS via
hls.js, MP4 via the existing player) and manga search → chapters → reader work
through the existing pages. The backend offers **search only** for these
providers: no latest feed, browsable catalog, verified counts, guaranteed
Arabic translation, or guaranteed working video/download link is claimed.
BLACK X 4 does not inherit the other servers' VIP release delay or fabricated
quality badges; download links appear only when supplied by the upstream.
MangaDex UUID chapters fall back to BLACK X's existing MangaDex at-home adapter
if AniProject v3 returns an empty page list. Source 4 is hidden/disabled until
configured; the other sources remain available if its backend goes down.

```bash
npm run test:aniproject      # offline mocked integration tests
# After setting ANIPROJECT_API_URL and redeploying, test on your own host:
curl 'https://your-black-x-domain/api/stream/sources'
curl 'https://your-black-x-domain/api/stream/search?source=aniproject&q=One%20Piece'
curl 'https://your-black-x-domain/api/search?type=manga&server=bx4&query=One%20Piece'
```

**بالعربية:** المصدر الرابع اختياري؛ رابط GitHub هو كود وليس خادم محتوى.
لتفعيله ضع رابط خادم AniProject الخلفي الخاص بك في `ANIPROJECT_API_URL` على
Vercel. يدعم البحث ثم المشاهدة/القراءة، ولا يقدّم فهرساً كاملاً أو أحدث الحلقات.
اختبر بث الفيديو وصفحات المانجا على الموقع الفعلي قبل اعتباره جاهزاً.

## ✨ 3D profile ornaments — زخارف ثلاثية الأبعاد (new)

Avatar frames and profile banners as **live 3D objects**: real transmission glass,
UnrealBloom, damped mouse-follow gyro, GLSL glyph rings, orbiting embers — plus an
engineered Midjourney / Runway prompt kit for composable AI assets.

```bash
npm install three                                  # already in package.json
npm run lab                                        # → /zellige-3d-lab.html (no build step)
npm run check:ornaments                              # engine smoke test in Node (no browser)
```

- Engine lives in `client/src/ornaments/core/` and has **zero React dependency**
- Graceful by default: 2D CSS frames when WebGL is missing, `quality:'css'` to opt out,
  `prefers-reduced-motion` honoured, auto-degrade under 32 fps, offscreen = paused
- Presets are pure data — add an ornament without touching Three.js
- Docs (AR): [`docs/ornaments-3d.md`](docs/ornaments-3d.md)

## Stack

| Layer     | Tech                                                        |
| --------- | ----------------------------------------------------------- |
| Client    | React 19 + Vite, React Router, custom CSS design system      |
| Server    | Express 5 (0.0.0.0, `PORT` env, default 3000), cookie-parser, CORS |
| Database  | SQLite via better-sqlite3 (users, favorites, progress, caches) |
| Streaming | witanime.site scraper + Range-capable video proxy            |
| Metadata  | AniList GraphQL (trending, season) + witanime show pages     |

## Quick start (local)

```bash
npm install
npm run build        # build the React client → client/dist
npm start            # production server on http://localhost:3000 (set PORT to change it)
```

`npm run dev` builds the client once and starts the server on :3000.

Hot reload (Vite on :3000 proxying /api → API on :4001) — run in two terminals:

```bash
PORT=4001 npm run server     # Windows PowerShell: $env:PORT=4001; npm run server
npm run client
npm run seed                 # optional: (re)seed demo data  (--quick = no upstream calls)
```

> In production (`NODE_ENV=production` or on Vercel) the server requires a random
> `JWT_SECRET` of at least 32 characters — see `.env.example`.

The database auto-seeds itself on first boot (quick rows instantly, live metadata
enriched in the background), so a fresh deploy looks right immediately.

## Demo accounts

All passwords: `blackx2026`

| user     | role  |
| -------- | ----- |
| `kuro`   | admin |
| `zero`   |       |
| `mirai`  |       |
| `nocturne` |     |
| `raven`  |       |
| `yuki`   |       |

## Deploy — free hosting (2026)

### ⭐ Render.com (free, no credit card) — recommended

1. Push this repo to GitHub (see below).
2. On [render.com](https://render.com) → **New → Blueprint** → connect the repo.
   The included `render.yaml` configures everything (or use **New → Web Service**,
   runtime Node, build `npm install && npm run build`, start `npm start`).
3. Deploy. Free plan: 750 hrs/month, sleeps after 15 min idle (≈60 s cold start).
4. `JWT_SECRET` is auto-generated (Blueprint) — or set it in Environment.

### Railway (free $5 trial credit, no card)

**New Project → Deploy from GitHub repo** — build `npm install && npm run build`,
start `npm start`. Add env `JWT_SECRET` (random, 32+ characters) — it is required in production.

### Vercel

Import the repo — `vercel.json` builds the client and serves the API from `api/index.js`.
Set `JWT_SECRET` (random, 32+ characters) in **Project → Settings → Environment Variables**.

### Any Docker host

```bash
docker build -t black-x .
docker run -p 4001:4001 -e JWT_SECRET="$(openssl rand -base64 48)" black-x
```

> **Note on persistence:** free tiers have ephemeral disks — a redeploy wipes the
> SQLite DB and the app reseeds itself automatically. Favorites/progress survive
> normal restarts, not redeploys. (On Render the disk survives sleep/wake cycles.)

## Push to GitHub

```bash
git init -b main
git add .
git commit -m "BLACK X — anime streaming platform"
git remote add origin https://github.com/<you>/black-x.git
git push -u origin main
```

## API surface (short)

```
GET  /api/health
GET  /api/stream/latest | /search?q= | /show/:slug | /episode/:slug/:ep
POST /api/stream/resolve            { slug, episode, entryId }
GET  /api/stream/proxy?url=…        Range-capable video proxy (host-allowlisted)
GET  /api/anime/trending | /season
GET  /api/auth/me   POST /api/auth/login | /register   POST /api/auth/logout
GET/PUT/DELETE /api/library/favorites[/:slug]
GET/PUT /api/library/progress/:slug/:ep   GET /api/library/continue
```

## Project layout

```
server/src/        Express API: db, auth, anilist, witanime scraper, routes
client/src/        React SPA: pages (Dashboard/Browse/ShowDetail/Watch/MyList),
                   VideoPlayer, Liquid Glass design system, EN/AR i18n
server/data/       SQLite database (auto-created + auto-seeded)
api/index.js       Vercel serverless entry (wraps the Express app)
prisma/            optional PostgreSQL schema for the social/gamification API
vercel.json        Vercel build + rewrites
render.yaml        Render Blueprint (free tier)
Dockerfile         container build
tools/             Node smoke test for the 3D ornament engine
```

---

Built for the fandom · Streaming via witanime.site · Metadata via AniList · Bilingual by design
