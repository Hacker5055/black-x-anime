# APK real-touch regression suite

Run it after every APK build (and after any change to the mobile UI or the player):

```bash
bash tools/apk/touch-test/run.sh                 # all scenarios, ~4 min
ONLY=nav,player bash tools/apk/touch-test/run.sh  # some scenarios
APK=/path/to/other.apk bash tools/apk/touch-test/run.sh
```

`run.sh` works in `$WORK` (default `/tmp/bx-touch`), never in the repository:

1. installs `puppeteer-core` + `@sparticuz/chromium` there (first run only, ~3 s);
2. makes a 24-minute WebM test video (system `ffmpeg`, or the `imageio-ffmpeg` wheel from PyPI);
3. extracts `assets/public/` from the APK, so the files that ship are the files tested;
4. runs `suite.mjs`: one headless browser per scenario, a 412×915 phone viewport, the APK's
   `https://localhost` behaviour (`window.__BLACKX_APK__`) and a recording stub of the native
   `BlackXNativeAuth` bridge.

Every network call is answered by in-memory mocks in `lib.mjs` (website `/api/*`, the Algolia
catalogue, Firestore `settings/*`, AniList), so results never depend on the live site; the test
server answers video `Range` requests with 206 (without that every seek restarts at 0).
Taps and swipes are CDP touch events (`page.touchscreen`), never `element.click()`, because the
v16.0 bug (no tab could be scrolled by finger) passed every mouse/JS-click check.

Scenarios (196 checks): `nav` (dock, finger scroll on pages and rails, directional view
transitions, avatar → profile, menu, long press → quick peek, language switch), `search` (grid,
typing, recent searches, filter sheet), `catalog` ("load more" stops at Algolia's pagination
limit with a note instead of a dead button; the mock caps paging like `paginationLimitedTo`), `genres` (Ecchi,
Harem and Isekai never show up: home rows, latest episodes, search and its total, filter sheet, typed
search, title pages, schedule, manga, AniList query, saved lists and menu counts; hidden titles lead
every mock list), `schedule` (opens on today), `player` (resume, auto-hide,
pause, ±10 s buttons and double tap, intro marks, full screen + native immersive call, settings
sheet over the player, ±10 min, speed, lock, next episode, saved position, back order sheet →
full screen → player → details → home), `manga` (chapters, reader pages, immersive, finger
scroll), `community` (guest), `logged` (one like per account, posting), `profile` (guest sign-in
hero, grouped rows, sub-pages pushed with a back button and popped by the phone back button, my
list grid + empty state, watch history with episode / time left / day groups and Latin titles
aligned in RTL, reading history chapter + cover, settings switches and segments saved, splash
choice, incognito + PIN lock, guest VIP → sign-in page, username sign-in that closes itself,
member header stats, locked / unlocked titles, profile edit saved to the account, request to the
developer, sign-out confirmation closed by back, menu shortcuts, a pre-v16 account without a
session can still open the sign-in page) and `motion` (reduced motion,
rapid taps, taps during a running transition).

A pass here is necessary, not sufficient: it does not replace a test on a real phone.

## The website (phones = the app interface, computers = the website pages)

```bash
bash tools/apk/touch-test/run-web.sh                    # builds the website into /tmp, ~2.5 min
ONLY=links,back bash tools/apk/touch-test/run-web.sh    # some scenarios
DIST=/path/to/website/build bash tools/apk/touch-test/run-web.sh
```

`web-suite.mjs` (128 checks) opens the **website build** with the same mocks (`openWeb()` in `lib.mjs`:
the site's same-origin `/api/*` goes to the mock, Google Fonts are answered with the bundled fonts so
Arabic renders in screenshots). A 412×915 touch phone with a phone browser user agent, or a 1440×900
computer. Scenarios: `boot` (phone → app interface, computer → website, `?ui=` switch remembered,
footer link back, no APK update card), `links` (`/show`, `/watch`, `/discover`, `/browse`,
`/community`, `/trending?q=`, `/profile/...`, `/mylist`, manga chapter links, hidden and dead links),
`sync` (the address bar follows the page), `back` (browser back steps back one app level, leaves the
site at home, no piled-up history, no entry before the first tap), `profile` (Android download and
computer-version rows, Google opens Firebase's popup, not the APK window), `player` (+10 s, browser
full screen + landscape), `genres` and `desktop` (computer home without invented values: no «👑 FHD»
on the cards, no guessed «يعرض الآن», no «الحلقة ٠» (that card opens the title page), the episode label
clear of the alert bell, a weekly schedule built from real air times (`/api/anime/schedule` mock); hidden
titles «مش متاح», AniList queries with the exclusions, the player page seen as VIP Monarch: no
«4K HDR • 60FPS» toggle, no colour filter over the video, no 4K / HDR / 60fps copy, no «VIP Fast CDN»
switch, «Early Access» pill or 24-hour badge, real episode numbers with «الأحدث» on the newest; as a
free visitor the upgrade button sits with the actions; the loader shows while the servers load (no
crash); the signed-in VIP plan cards list only real perks at unchanged prices; the watch-party panel
has no invented viewer count). `openWeb(browser, { route, phone, seed, ctx })`: `seed` is written to
localStorage, which every page of one browser shares, so seed `blackx.vipTier` explicitly; `ctx`
patches the mock (`episodeDelayMs` holds `/api/stream/episode` back); a seeded `blackx_token` signs
the computer website in through the mocked `/api/auth/me`.
