# BLACK X — Agent Guide

Read this file before changing the repository. It records the user's durable requirements, the production architecture, verification rules, and the latest live audit so a new agent can continue without guessing.

## 1. Project and current source of truth

- Product: **BLACK X**, a bilingual (Arabic/English) anime, manga, and manhwa discovery/streaming website with a separately distributed mobile APK.
- Official website: <https://black-x-anime.me/>.
- Hosting decision: **Vercel only** for the website/API; the user prefers hosting without a credit card. Do not restore Cloudflare Workers deployment code or move hosting providers unless explicitly asked. A stale `Workers Builds` GitHub check may fail without affecting Vercel.
- GitHub repository: <https://github.com/Hacker5055/black-x-anime>.
- Latest public `main` verified on 2026-10-15: `d902e46` (merge of PR #10: Firestore phase 1, Vercel CDN caching, real catalog counts). PR #9 (opt-in BLACK X 4), PR #8 (player fullscreen), PR #6, PR #5 and PR #4 are merged. Re-check GitHub before relying on this snapshot.
- The user works from a separate Linux clone, typically `~/black-x-anime`; `/home/user/black-x-anime` is the Arena workspace path and does not exist on the user's laptop.
- Communicate with the user in Arabic (Egyptian dialect). When the user says «ارفعه», commit the intended files, push the session branch, open a PR and merge it into `main` (this deploys production).

## 2. User requirements and guardrails

- **Website-only by default.** Do not edit `client/src/mobile/`, APK assets/releases, or native Android files unless the user explicitly asks. On 2026-10-15 the user did ask: "update the APK servers, fix anime and manga, and make the app's servers the same as the website's" — that produced APK v15 (section 5, *Mobile APK*). On 2026-10-15 the user also asked for the APK UI overhaul (icons instead of emoji, avatar + menu header, nothing over the fullscreen video, smooth animations, no fake numbers) — APK v15.1. Further APK work still needs an explicit request.
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
- `client/src/mobile/` — mobile-app web bundle (`MobileApkApp.jsx`); do not alter unless requested. `bxServers.js` is the only place the app gets anime/manga servers from (the website API); `MangaPageImage.jsx` renders reader pages.
- `tools/apk/` — rebuild/repack/sign the APK without an Android SDK (`build-apk.sh`, `repack-apk.py`, `README.md`).
- `server/src/index.js` — Express API app; exports the app for Vercel and only calls `listen()` for standalone Node hosting.
- `api/index.js` — Vercel function entry that imports `server/src/index.js`.
- `server/src/routes/` — API routes, including anime, streaming, auth, and content.
- `server/src/services/` — upstream scrapers/adapters for anime and manga/manhwa services.
- `server/src/controllers/content.controller.js` — combined manga/manhwa library endpoint.
- `server/src/services/mangalik.service.js` — manga/manhwa source engines.
- `server/src/services/aniproject.service.js` — opt-in adapter for AniProject **v3.0.0 backend** (not the release page/website): Zoro anime search/show/episodes and MangaDex manga search/chapters/pages. The provider requires a separately deployed backend with its own Redis/Consumet; set `ANIPROJECT_API_URL` on the BLACK X server. `ANIPROJECT_MEDIA_HOSTS` is an optional exact CDN allowlist for proxied playback. The source is BLACK X 4 in UI, search-only with no latest/catalog feed. No AniProject code/assets are bundled (upstream is CC BY-NC-SA, non-commercial).
- `server/src/db.js` — SQLite setup/cache. Vercel uses ephemeral `/tmp`; SQLite data there is not durable across deployments/instances.
- `vercel.json` — SPA/API rewrites; Vercel builds the client into `client/dist`.
- `client/dist/` — generated build output. Do not stage/commit generated deletions or builds unless explicitly requested. Verify builds into `/tmp` to avoid touching tracked distribution assets.
- `worker/` and `wrangler.jsonc` were removed from `main` for the Vercel-only decision. Do not reintroduce them to silence the old Cloudflare check.

## 4. Setup and checks

- Project expects Node `22.x` (`package.json` `engines`).
- Install reproducibly with `npm ci` (the repository has `package-lock.json`).
- Frontend build: `npm run build`.
- Optional AniProject v3 adapter tests (mocked upstream; no external services needed): `npm run test:aniproject`. Live playback and chapter images still require verification on a configured production backend.
- Server/APK bridge tests (no network): `npm run test:servers` — strict cross-server title matching, CDN `Vary: Origin`, and the APK's website-API mapping (`client/src/mobile/bxServers.js`).
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

### Catalog counts (never hardcode a count)

- Every "N anime" label on the website comes from `GET /api/stream/stats` (Algolia `nbHits` for BLACK X 1) through `useAnimeCatalogTotal()` in `client/src/hooks/useCatalogStats.js`. The endpoint answers 503 instead of guessing, and labels hide the number while it is unknown. The old hardcoded `6,973` / `+120K` labels were removed from the website on 2026-10-15, and from the APK in v15 (its header reads the same endpoint; the stale per-genre/studio counts in its filter chips are gone too).
- `/api/content/library` returns `count` (real unique items in the response) and `totalCount: null`: its upstream catalogs expose pages only, never a grand total. `/api/stream/catalog` returns `totalCount: null` (not the page size) when BLACK X 1's index did not answer.
- BLACK X 4 (`aniproject`, opt-in) has no browsable catalog: `/api/stream/catalog?source=aniproject` returns an empty list with `totalCount: 0`, and its search responses report `totalCount` = results actually returned. Clients treat any missing or non-positive total as unknown and hide it (`Number(null)` is `0`, so never print a raw total).

### Known catalog-count caveats (do not misreport)

- The anime catalog path for Witanime reports `totalCount=6994` but only exposes 17 pages at 60 items (page 17 has 40; page 18 is empty): **1,000 rows are reachable through this current path**, despite the higher reported source count. This appears consistent with an upstream Algolia pagination cap; investigate the upstream's actual limit before claiming all 6,994 are available.
- `source=anime3rb` and `source=english` on `/api/stream/catalog` currently return 40 and 24 latest-feed entries, not full catalogs. They are not directly comparable to the Witanime catalog total.
- The combined manhwa `all` list has cross-server duplicates. Report page counts and unique counts separately; never sum server rows as if they were distinct works.

### Vercel CDN caching

- Public, user-independent GET routes are listed once in `shared/publicCacheRoutes.js` (shared by server and client). `server/src/lib/cdnCache.js` adds `s-maxage` / `stale-while-revalidate` / `stale-if-error` to their successful responses, and `client/src/api.js` omits the `Authorization` header on those GETs because Vercel never caches a request that carries one.
- Only 200/304 responses with real data are cached. Errors, JSON with only empty lists (upstream outage), `success:false`/`error` bodies and responses with `Set-Cookie` are sent `no-store`, so an outage is never frozen into the CDN.
- Never add a route whose handler reads `req.user`, cookies or `Authorization` (for example `/api/anime/:id` watchlist state, `/api/stream/episode` VIP servers, library, auth, proxies, download links). A cached response is served to everyone.
- `/api/stream/sources` is cached (`config`, 60 s) because it depends only on server configuration (`ANIPROJECT_API_URL` decides whether BLACK X 4 is listed), never on the user. BLACK X 4's empty latest/catalog responses fall under the empty-list rule and are not cached.
- Cacheable responses always carry `Vary: Origin`. Same-origin website requests get no CORS headers while the APK (`https://localhost`) gets `Access-Control-Allow-Origin`; without the Vary, a website-populated CDN copy was served to the APK and failed CORS.
- Verify after deploy: request a cached route twice and check `x-vercel-cache` goes `MISS` → `HIT`.

### Mobile APK (v15, 2026-10-15)

- The APK no longer scrapes anything from the phone. Up to v14 it called third-party manga/anime APIs directly (Mello, Azora, Swat, Dilar, MangaDex, AnimeWitcher Firestore, Animeify) with its own server list; when a title was missing it loaded the chapters of an unrelated series (Mello id 3278), and the global cover healer replaced broken reader pages with AniList covers found by searching the alt text "Page 1".
- v15 gets every server from the website API through `client/src/mobile/bxServers.js`: manga library/search/details/pages (`/api/content/library`, `/api/search?type=manga`, `/api/content/library/:id` → `/api/manga/:id/chapters`, `/api/manga/chapter/:id/pages`), anime search/episodes/servers (`/api/stream/search`, `/api/stream/show/:slug`, `/api/stream/episode/:slug/:ep`, `POST /api/stream/resolve`) and `/api/stream/stats` / `/api/stream/sources`. Server tabs mirror `Browse.jsx` (all, BLACK X 1–3; BLACK X 4 only while `/api/stream/sources` lists `aniproject`). Server fixes on the website therefore reach the app without a new APK; only UI changes need a rebuild.
- Nothing falls back to another title or invents data: an empty server says so and offers the title's other servers; a page that fails directly is retried through `/api/proxy/image`, then shows a "tap to retry" tile. The APK player is a plain `<video>`, so only direct MP4 (and HLS where the WebView plays it) entries are listed; iframe-only hosts stay on the website. PixelDrain links start on the `pixeldrain.dev` mirror (v14 behaviour) and the error handler walks `.dev → .net → .com`, then the next server.
- API calls use `credentials: 'omit'`; inside the APK a CORS/network failure is retried once through the native `BlackXNativeAuth.httpRequestAsync` bridge. `https://localhost` and `capacitor://localhost` are allowed CORS origins in `server/src/index.js`.
- Build/sign: `tools/apk/README.md`. The release key lives only in the owner's private Google Drive folder «BLACK X — مفتاح توقيع التطبيق (سري — لا تشاركه)» (cert SHA-256 `2b2f63d1…c281`). Never commit it. v14 was signed with a lost key, so v14 → v15 needs one uninstall + reinstall; later builds with the same key update normally.
- Accounts, VIP, watch party and reviews in the APK still use Firestore `settings/*` directly (see the Firestore section).
- Verified for v15: headless mobile-viewport run of the APK bundle against a mock of the website API (library, server tabs, details, server switch, reader with direct/proxy/failed pages, anime search → episodes → servers), `apksigner verify` (v1+v2+v3), 4-byte alignment and unchanged native entries. Not yet verified on a physical phone.

### Mobile APK UI (v15.1, 2026-10-15)

- **No emoji anywhere in the APK.** Every pictogram is a lucide icon through `client/src/mobile/BxIcon.jsx` (`<BxIcon name="..." />`, add new names to its registry). `stripEmoji()` cleans runtime text (toasts, values saved by older builds). `showToast(message, iconName)` takes the icon as its second argument.
- Top bar = the user's photo (`user.photoUrl`, else initial, else a user icon) + the access menu only; the brand, version line and shortcuts (search, radar, schedule, settings…) live in the menu. The bar turns solid on scroll and slides away while scrolling down.
- The dock (`.bx-dock`) is hidden while the player page, fullscreen video or manga reader is open, and the mini player floats above it. The fullscreen HUD (`.bx-fs-chrome`) auto-hides ~3 s into playback (stays while paused) and comes back on any tap; double tap left/right is still ±10 s.
- Motion lives in `client/src/mobile/mobileUi.css`: transform/opacity only, `backwards` fill (a `forwards` fill would freeze `transform` and kill the press effect), everything off under `prefers-reduced-motion`. Avoid `transform`/`filter`/`will-change` on containers that hold `position: fixed` children (the manga reader, player and sheets).
- Fake numbers removed in v15.1 (do not reintroduce): DNA "% match", likes/views derived from the rating, `|| '9.2'` / `'8.9'` / `'9.8'` rating fallbacks, `|| '2026'` years, fixed `24:00` times, `E{index}` episode badges, "S1 E1" labels, TV-MA / 4K / 1080p / 120Hz claims (the Hz label is the measured refresh rate), invented leaderboard users, seeded poll votes, seeded timed comments, starting XP 350, member number `88492011`. Server side: witanime score/rating, mangalik/anime3rb/english fallback ratings and the bx1 SQLite seed ratings are `null` when unknown — UIs hide unknown values.
- Verified for v15.1: headless run against the API mock (34 checks: zero emoji on every tab/modal, header, dock icons, menu, toast, dock hidden in the player, fullscreen HUD auto-hide + tap, ±10 s, exit fullscreen, mini player above the dock).

### Cross-server episode matching

- `/api/stream/episode` for a BLACK X 1 (`aw-…`) slug also asks BLACK X 2 for the same show. The general `isTitleMatch()` accepted 2/3 of the words and attached *Tensei shitara Slime Datta Ken* episodes to *Tensei shitara Ken deshita 2*. `anime3rb.service.js` now uses `isStrictCrossSourceMatch()` (`server/src/lib/crossSourceMatch.js`) for word-based links: every significant query word, ≥75% of the candidate's words, and the same season number. Native BLACK X 2 ids (`xCamelCase`) keep the old path. `isWitcherTitleMatch()` (BLACK X 1 resolution) is still loose (substring match) — a known follow-up.

### Signed-in UI check

- `ContinueCard` (client/src/components/ShowCard.jsx) accepts `item` or `entry`. Before 2026-10-15 every caller passed `entry` while the component read `item`, which crashed Home and My List to a black screen for any signed-in user with an unfinished episode. After UI changes, test Home and `/mylist` while signed in with a user that has progress.

## 6. Auth and runtime behavior

- On Vercel, `process.env.VERCEL` is present. The API must not crash globally just because `JWT_SECRET` is missing/invalid: public anime/streaming endpoints should remain usable, while auth-only routes safely return 503 until a valid secret is configured.
- `/api/health` includes an authentication status. `authentication: unavailable` means browsing may work but login/protected actions are disabled; add a random 32+ character `JWT_SECRET` in Vercel Production (and Preview if needed), then redeploy. Never use the development key in production.
- `client/src/firebase.js` enriches the Firebase user. Preserve `getIdToken` as a bound method when returning that object; test Google login after client changes.
- Use Vercel dashboard runtime/function logs for function failures. A successful build/check alone does not prove the serverless handler imported or served routes correctly.

### Firestore `settings/*` security (phase 1 done, phase 2 pending)

- `settings/*` (project `spry-oxide-1h7sp`, named database `ai-studio-blackxanime-e47e1ba2-315f-4c3b-8557-71352813f36c`) holds the shared website/APK account mirror (`settings/user_*`, `settings/email_*`: email, role, VIP status and an **unsalted** `passSha256`), `global_vip_system` (VIP codes and the enforcement flag) and `developer_profile`. On Vercel, SQLite lives in `/tmp`, so this mirror is the only durable account store and server login falls back to it.
- Installed APKs are Capacitor builds with bundled web assets (no `server.url`): a website deploy does not update them, and they sign users in by reading `settings/*` directly from the device.
- Phase 1 (2026-10-15, chosen by the user because it breaks nothing): `firestore.rules` denies `list` and `delete` on `settings/*` (no shipped client lists or deletes there); single-document get/create/update stay open for the APK. The rules file in the repo is **not** auto-deployed: publish it in the Firebase console (Firestore → the named database above → Rules → Publish).
- The server supports `FIREBASE_SERVICE_ACCOUNT` (service-account JSON or its base64, set in Vercel env vars, never committed or pasted in chat). Server Firestore REST calls then carry an OAuth token checked by IAM instead of the rules. `/api/health` reports `firestoreAuth`: `api_key` (not set), `invalid_key`, `service_account_pending`, `service_account` (working) or `error`.
- Phase 2 (needs the user's go-ahead): with the service account working, move web and APK account/VIP/watch-party logic behind the API, replace `passSha256` with salted hashes, rebuild and redistribute the APK, then set `settings/*` to `allow read, write: if false`. Old APK builds lose login/VIP at that point.

### Dead code to keep in mind

- `client/src/components/Navbar.jsx` is imported by `App.jsx` but never rendered (the live header is in `App.jsx`), and `IosLiquidGlassSmartDeck` in `Dashboard.jsx` is never used. Edits there do not change the live site.

## 7. Git/deployment workflow

- Work on a topic branch and open a PR to `main`; do not force-push or overwrite the user's branch.
- Stage specific intended files instead of `git add -A` when the working tree has unrelated generated/untracked files.
- Do not include `client/dist`, secrets, database files, or APK binaries in a web/API hotfix. An APK release commits only the rebuilt `client/public/BLACK-X-Mobile-120Hz.apk` (built and verified as in `tools/apk/README.md`); the website serves it at `/BLACK-X-Mobile-120Hz.apk`, which is also the app's in-app update link.
- Verify PR Vercel checks and preview behavior, then merge. The official production deploy follows GitHub `main`.
- Cloudflare `Workers Builds` may remain a stale failing status. The user's hosting decision is Vercel; do not change DNS or restore a Worker simply to make that check green.
- After merge, re-check live API endpoints and the official site. Do not report production success until the live endpoints return valid data.
