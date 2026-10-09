# BLACK X ⚡ — Anime Streaming Platform

A bilingual (English / العربية) **anime streaming platform** with a Liquid-Glass UI:
custom video player, live catalog + streams from **witanime.site**, AniList discovery,
favorites (watchlist) and continue-watching — all persisted per user.

![player](screenshots/04-watch-player.png)

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

## Stack

| Layer     | Tech                                                        |
| --------- | ----------------------------------------------------------- |
| Client    | React 19 + Vite, React Router, custom CSS design system      |
| Server    | Express 5 (0.0.0.0, `PORT` env), cookie-parser, CORS         |
| Database  | SQLite via better-sqlite3 (users, favorites, progress, caches) |
| Streaming | witanime.site scraper + Range-capable video proxy            |
| Metadata  | AniList GraphQL (trending, season) + witanime show pages     |

## Quick start (local)

```bash
npm install
npm run build        # build the React client → client/dist
npm start            # production server on http://localhost:4001
```

Development (hot reload, client on :5173 proxying /api → :4001):

```bash
npm run dev
npm run seed         # optional: (re)seed demo data  (--quick = no upstream calls)
```

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
start `npm start`. Add env `JWT_SECRET` if you like.

### Any Docker host

```bash
docker build -t black-x .
docker run -p 4001:4001 black-x
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
render.yaml        Render Blueprint (free tier)
Dockerfile         container build
smoke-test.mjs     Playwright E2E (22 checks, 12 screenshots)
```

---

Built for the fandom · Streaming via witanime.site · Metadata via AniList · Bilingual by design
