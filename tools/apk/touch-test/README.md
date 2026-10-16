# APK real-touch regression suite

Run it after every APK build (and after any change to the mobile UI or the player):

```bash
bash tools/apk/touch-test/run.sh                 # all scenarios, ~3 min
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

Scenarios (138 checks): `nav` (dock, finger scroll on pages and rails, directional view
transitions, avatar → profile, menu, long press → quick peek, language switch), `search` (grid,
typing, recent searches, filter sheet), `catalog` ("load more" stops at Algolia's pagination
limit with a note instead of a dead button; the mock caps paging like `paginationLimitedTo`), `schedule` (opens on today), `player` (resume, auto-hide,
pause, ±10 s buttons and double tap, intro marks, full screen + native immersive call, settings
sheet over the player, ±10 min, speed, lock, next episode, saved position, back order sheet →
full screen → player → details → home), `manga` (chapters, reader pages, immersive, finger
scroll), `community` (guest), `logged` (one like per account, posting) and `motion` (reduced
motion, rapid taps, taps during a running transition).

A pass here is necessary, not sufficient: it does not replace a test on a real phone.
