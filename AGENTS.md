# BLACK X — Agent Guide

Read this file before changing the repository. It records the user's durable requirements, the production architecture, verification rules, and the latest live audit so a new agent can continue without guessing.

## 1. Project and current source of truth

- Product: **BLACK X**, a bilingual (Arabic/English) anime, manga, and manhwa discovery/streaming website with a separately distributed mobile APK.
- Official website: <https://black-x-anime.me/>.
- Hosting decision: **Vercel only** for the website/API; the user prefers hosting without a credit card. Do not restore Cloudflare Workers deployment code or move hosting providers unless explicitly asked. A stale `Workers Builds` GitHub check may fail without affecting Vercel.
- GitHub repository: <https://github.com/Hacker5055/black-x-anime>.
- Latest public `main` verified on 2026-10-15: `939c132` (merge of PR #6). PR #4 (`6c44129`) and PR #5 (API/JWT and Firebase token fixes, head `b84f83d`) are merged. Re-check GitHub before relying on this snapshot.
- The user works from a separate Linux clone, typically `~/black-x-anime`; `/home/user/black-x` is the Arena workspace path and does not exist on the user's laptop.

## 2. User requirements and guardrails

- **Website-only by default.** The user deferred further mobile-app work; do not edit `client/src/mobile/`, APK assets/releases, or native Android files unless they explicitly ask. PR #6 did include a mobile-source change; do not continue that work by assumption.
- Keep the website bilingual EN/AR and pure monochrome black/white/silver. Animations should be light, respect reduced motion, and avoid GPU-heavy filters/effects.
- Preserve player controls: fullscreen, ±10 seconds, and ±10 minutes. Test them when changing the player.
- Anime/catalog data must be fetched dynamically. Do not hardcode catalog entries or claim fake totals as real counts.
- Keep source labels branded as `BLACK X` in user-facing player UI; do not expose upstream provider names there.
- Use real Firebase/Google OAuth only. Never show another user's cloud account on login. The Firebase `User.getIdToken()` method must remain bound to the real Firebase user object; object-spreading a Firebase user drops prototype methods.
- Treat any PAT/token pasted into chat as compromised: do not use, repeat, or save it; tell the user to revoke it. Use browser-based `gh auth login` for GitHub CLI, never request a token in chat.
- Never put secrets in this file, source control, logs, screenshots, or chat. Production `JWT_SECRET` must be random and at least 32 characters; set it in Vercel's Environment Variables.
- Do not claim playback/download is fixed based only on a successful build or API response. Verify real browser playback, range behavior, and (when requested) an actual full download. Upstream services can change or return 403.

## 3. Repository map

- `client/src/` — React/Vite website. Main pages include `Dashboard.jsx`, `Browse.jsx`, `TrendingAnime.jsx`, `Watch.jsx`, and `ShowDetail.jsx`.
- `client/src/App.jsx` — route shell, route transitions, web splash profile.
- `client/src/components/VideoPlayer.jsx` — website player and source controls.
- `client/src/components/DownloadModal.jsx`, `client/src/pages/Watch.jsx` — episode source/download UI.
- `client/src/context/AuthContext.jsx`, `client/src/firebase.js` — session and Firebase/Google sign-in.
- `client/src/mobile/` — mobile-app web bundle; do not alter unless requested.
- `server/src/index.js` — Express API app; exports the app for Vercel and only calls `listen()` for standalone Node hosting.
- `api/index.js` — Vercel function entry that imports `server/src/index.js`.
- `server/src/routes/` — API routes, including anime, streaming, auth, and content.
- `server/src/services/` — upstream scrapers/adapters for anime and manga/manhwa services.
- `server/src/controllers/content.controller.js` — combined manga/manhwa library endpoint.
- `server/src/services/mangalik.service.js` — manga/manhwa source engines.
- `server/src/db.js` — SQLite setup/cache. Vercel uses ephemeral `/tmp`; SQLite data there is not durable across deployments/instances.
- `vercel.json` — SPA/API rewrites; Vercel builds the client into `client/dist`.
- `client/dist/` — generated build output. Do not stage/commit generated deletions or builds unless explicitly requested. Verify builds into `/tmp` to avoid touching tracked distribution assets.
- `worker/` and `wrangler.jsonc` were removed from `main` for the Vercel-only decision. Do not reintroduce them to silence the old Cloudflare check.

## 4. Setup and checks

- Project expects Node `22.x` (`package.json` `engines`).
- Install reproducibly with `npm ci` (the repository has `package-lock.json`).
- Frontend build: `npm run build`.
- Safer non-mutating build check: `npm run build -- --outDir /tmp/blackx-build-verify`.
- Useful syntax/whitespace checks:
  ```bash
  node --check server/src/index.js
  node --check server/src/auth.js
  node --check server/src/routes/streaming.js
  node --check server/src/witanime.js
  node --check client/src/firebase.js
  git diff --check
  ```
- `npm start` starts the standalone API; `PORT` defaults to 3000. `npm run client` starts Vite; `npm run dev` builds the client and starts the API. For a Vite dev server proxy, use the documented two-terminal setup in `README.md`.
- A Vite warning about chunks larger than 500 kB has appeared on successful builds; it is a warning, not a build failure. Do not claim it is fixed unless chunking is separately tested.

## 5. API and production verification

Useful live endpoints:

- `GET /api/health`
- `GET /api/anime/trending`
- `GET /api/stream/latest?source=all&page=1` (`source`: `all`, `witanime`, `anime3rb`, `english`)
- `GET /api/stream/catalog?source=...&page=1`
- `GET /api/content/library?type=MANHWA&server=all|bx1|bx2|bx3&page=1`

Vercel can report a deployment as “Ready” while a function still fails at runtime. After every production deploy, request `/api/health`, `/api/anime/trending`, and `/api/stream/latest`; confirm JSON and non-empty rows, then test the actual website. Preview deployments may be protected by Vercel SSO, so a `200` login page is **not** a successful API test.

### Live audit snapshot (2026-10-15; external data can change)

The official domain returned HTTP 200 for the following during the latest check:

- `/api/health`: database `ok`, authentication `ok`.
- `/api/anime/trending`: 16 entries.
- `/api/stream/latest`: 135 latest items — BLACK X 1/Witanime 71, BLACK X 2/Anime3rb 40, BLACK X 3/English 24.
- `/api/content/library?type=MANHWA&server=all&page=1`: 67 rows, about 65 unique normalized titles. Server-specific page-1 rows: `bx1=29`, `bx2=21`, `bx3=34`; servers overlap, so these counts are not additive. Pairwise title overlap observed: bx1/bx2=8, bx1/bx3=10, bx2/bx3=7.

### Known catalog-count defects (do not misreport)

- `/api/content/library` currently returns `totalCount: 120000` as a hardcoded value. It is not a verified total. Fix the API to surface real source counts/pagination before describing it as the number of works.
- The anime catalog path for Witanime reports `totalCount=6994` but only exposes 17 pages at 60 items (page 17 has 40; page 18 is empty): **1,000 rows are reachable through this current path**, despite the higher reported source count. This appears consistent with an upstream Algolia pagination cap; investigate the upstream's actual limit before claiming all 6,994 are available.
- `source=anime3rb` and `source=english` on `/api/stream/catalog` currently return 40 and 24 latest-feed entries, not full catalogs. They are not directly comparable to the Witanime catalog total.
- The combined manhwa `all` list has cross-server duplicates. Report page counts and unique counts separately; never sum server rows as if they were distinct works.

## 6. Auth and runtime behavior

- On Vercel, `process.env.VERCEL` is present. The API must not crash globally just because `JWT_SECRET` is missing/invalid: public anime/streaming endpoints should remain usable, while auth-only routes safely return 503 until a valid secret is configured.
- `/api/health` includes an authentication status. `authentication: unavailable` means browsing may work but login/protected actions are disabled; add a random 32+ character `JWT_SECRET` in Vercel Production (and Preview if needed), then redeploy. Never use the development key in production.
- `client/src/firebase.js` enriches the Firebase user. Preserve `getIdToken` as a bound method when returning that object; test Google login after client changes.
- Use Vercel dashboard runtime/function logs for function failures. A successful build/check alone does not prove the serverless handler imported or served routes correctly.

## 7. Git/deployment workflow

- Work on a topic branch and open a PR to `main`; do not force-push or overwrite the user's branch.
- Stage specific intended files instead of `git add -A` when the working tree has unrelated generated/untracked files.
- Do not include `client/dist`, secrets, database files, or APK binaries in a web/API hotfix.
- Verify PR Vercel checks and preview behavior, then merge. The official production deploy follows GitHub `main`.
- Cloudflare `Workers Builds` may remain a stale failing status. The user's hosting decision is Vercel; do not change DNS or restore a Worker simply to make that check green.
- After merge, re-check live API endpoints and the official site. Do not report production success until the live endpoints return valid data.
