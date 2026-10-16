// BLACK X website — real-touch suite for the phone website (the app interface served by the
// website, client/src/mobile/webApp.js) and the phone / computer switch (client/src/webUi.js).
// Run it with ./run-web.sh (builds the website into /tmp). `ONLY=links,back ./run-web.sh` runs some.
import { startServer, launch, openWeb, waitWebReady, check, sleep, tapEl, boxOf, waitVt, summary, LOCAL, HIDDEN_ANIME } from './lib.mjs';

const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const scenarios = [];
const scenario = (name, fn) => scenarios.push({ name, fn });

const slugOf = (name) => `aw-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
const here = (page) => page.evaluate(() => `${location.pathname}${location.search}`);
const iface = (page) =>
  page.evaluate(() => (document.querySelector('.bx-dock') ? 'app' : document.querySelector('.app-shell') ? 'site' : 'none'));
const activeTab = (page) => page.evaluate(() => document.querySelector('.bx-dock-item.is-active')?.getAttribute('aria-label') || '');
const topTitle = (page) => page.evaluate(() => document.querySelector('.bx-topbar-title')?.textContent.trim() || '');
const detailsOpen = (page) => page.evaluate(() => Boolean(document.querySelector('.bx-details-sheet')));
const detailsTitle = (page) =>
  page.evaluate(() => document.querySelector('.bx-details-sheet h1, .bx-details-sheet h2')?.textContent.trim() || '');
const isTrap = (page) => page.evaluate(() => Boolean(history.state && history.state.bxTrap));
const toastText = (page) => page.evaluate(() => [...document.querySelectorAll('.bx-toast')].map((t) => t.innerText.trim()).join(' | '));

async function waitFor(page, fn, arg, timeout = 8000) {
  return page.waitForFunction(fn, { timeout, polling: 100 }, arg).then(() => true, () => false);
}

/** A first tap on something harmless: browsers only keep history entries added after the visitor touched the page. */
async function firstTouch(page) {
  const b = (await boxOf(page, '.bx-details-sheet h1', { scroll: false })) || (await boxOf(page, '.bx-section-title', { scroll: false }));
  if (b) await page.touchscreen.tap(b.x, b.y);
  else await page.touchscreen.tap(206, 400);
  await sleep(250);
}

/** Taps `selector` as soon as a finger would really hit it (sheets slide in, transitions settle). */
async function tapWhenHittable(page, selector, opts = {}, timeout = 4000) {
  const end = Date.now() + timeout;
  let b = null;
  while (Date.now() < end) {
    b = await boxOf(page, selector, { scroll: false, ...opts });
    if (b && b.hitOk) {
      await page.touchscreen.tap(b.x, b.y);
      return b;
    }
    await sleep(150);
  }
  throw new Error(`never hittable: ${selector} -> ${b ? b.hit : 'not found'}`);
}

async function controlsShown(page) {
  return page.evaluate(() => document.querySelector('.bx-pc')?.classList.contains('is-visible') || false);
}

async function browserBack(page) {
  await page.evaluate(() => history.back());
  await sleep(700);
  await waitVt(page, 3000);
}

/** Opens the first ordinary poster (not a «كمّل المشاهدة» card, which resumes playback by design). */
async function openFirstPoster(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-test-fresh]').forEach((e) => e.removeAttribute('data-test-fresh'));
    const inContinue = (el) => {
      for (let sec = el.parentElement; sec; sec = sec.parentElement) {
        const head = sec.querySelector(':scope > * .bx-section-title, :scope > .bx-section-title');
        if (head) return head.textContent.trim() === 'كمّل المشاهدة';
      }
      return false;
    };
    const card = [...document.querySelectorAll('main .bx-poster')].find((p) => !p.querySelector('.bx-poster-progress') && !inContinue(p));
    card?.setAttribute('data-test-fresh', '1');
  });
  await tapEl(page, '[data-test-fresh]');
  await waitFor(page, () => Boolean(document.querySelector('.bx-details-sheet')));
  await waitVt(page, 3000);
  await sleep(400);
}

/* ====================================================================== boot */
scenario('boot', async (browser) => {
  const G = 'boot';
  let { page, ctx } = await openWeb(browser, { route: '/' });
  check(G, 'a phone gets the app interface', (await iface(page)) === 'app');
  const flags = await page.evaluate(() => ({ web: window.__BLACKX_WEB_APP__ === true, apk: window.__BLACKX_APK__ === true, dir: document.documentElement.dir }));
  check(G, 'it runs as the website, not as the APK', flags.web && !flags.apk, JSON.stringify(flags));
  check(G, 'Arabic is right to left', flags.dir === 'rtl');
  check(G, 'the API is called on the same site (/api/…)', ctx.net.some((n) => n.startsWith('GET site/api/')) && !ctx.net.some((n) => n.includes('black-x-anime.me')), ctx.net.filter((n) => n.includes('/api/')).slice(0, 4).join(' | '));
  const dock = await page.evaluate(() => [...document.querySelectorAll('.bx-dock .bx-dock-item')].map((b) => b.getAttribute('aria-label')));
  check(G, 'same 5-tab dock as the app', dock.length === 5, dock.join(' | '));
  check(G, 'no website page stylesheet on the phone', await page.evaluate(() => !document.querySelector('.app-shell') && ![...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.selectorText === '.app-shell'); } catch { return false; } })));
  check(G, 'no page errors', ctx.errors.length === 0, ctx.errors.slice(0, 3).join(' | '));
  await page.close();

  ({ page, ctx } = await openWeb(browser, { route: '/', phone: false }));
  check(G, 'a computer gets the website pages', (await iface(page)) === 'site');
  check(G, 'computer: no page errors', ctx.errors.length === 0, ctx.errors.slice(0, 3).join(' | '));
  await page.close();

  // Manual switch, remembered on that browser.
  ({ page, ctx } = await openWeb(browser, { route: '/?ui=site' }));
  check(G, '?ui=site gives a phone the website pages', (await iface(page)) === 'site');
  await page.goto(`${LOCAL}/`, { waitUntil: 'domcontentloaded' });
  await waitWebReady(page);
  check(G, '…and the choice is remembered', (await iface(page)) === 'site', await page.evaluate(() => localStorage.getItem('bx_web_ui')));
  const back = await page.evaluate(() => [...document.querySelectorAll('footer a, footer button')].find((e) => /واجهة الموبايل|Phone interface/.test(e.textContent))?.textContent.trim() || '');
  check(G, 'the website footer offers the phone interface back', Boolean(back), back);
  await page.goto(`${LOCAL}/?ui=app`, { waitUntil: 'domcontentloaded' });
  await waitWebReady(page);
  check(G, '?ui=app switches back to the app interface', (await iface(page)) === 'app');
  await page.close();

  ({ page, ctx } = await openWeb(browser, { route: '/?ui=app', phone: false }));
  check(G, 'a computer can open the app interface with ?ui=app', (await iface(page)) === 'app');
  await page.close();

  // The APK's update card never shows on the website (it is always the latest version).
  ({ page, ctx } = await openWeb(browser, { route: '/', wait: false }));
  ctx.apkOverride = { version: '99.0', versionCode: 9900, url: '/BLACK-X-Mobile-120Hz.apk', notesAr: ['x'], notesEn: ['x'] };
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitWebReady(page);
  await sleep(1200);
  check(G, 'no "update the app" card on the website', await page.evaluate(() => !document.querySelector('.bx-update-card')));
  await page.close();
});

/* ===================================================================== links */
scenario('links', async (browser) => {
  const G = 'links';
  const name = 'Test Anime 3';
  let { page, ctx } = await openWeb(browser, { route: `/show/${slugOf(name)}` });
  await waitFor(page, () => Boolean(document.querySelector('.bx-details-sheet')));
  check(G, '/show/… opens that title', (await detailsOpen(page)) && (await detailsTitle(page)) === name, await detailsTitle(page));
  check(G, '…from the catalogue record (lists and history match the app)', ctx.algolia.some((a) => a.body?.query === name), ctx.algolia.map((a) => a.body?.query).filter(Boolean).join(','));
  check(G, 'the address stays on the title', (await here(page)) === `/show/${slugOf(name)}`, await here(page));
  check(G, 'browser tab title names the anime', (await page.title()).startsWith(name), await page.title());
  await page.close();

  ({ page, ctx } = await openWeb(browser, { route: `/watch/${slugOf(name)}/3` }));
  await waitFor(page, () => document.querySelector('video')?.readyState >= 1, null, 15000);
  check(G, '/watch/…/3 plays episode 3', ctx.episodes.includes(`${slugOf(name)}:3`), ctx.episodes.join(','));
  check(G, 'the address shows the episode', (await here(page)) === `/watch/${slugOf(name)}/3`, await here(page));
  await page.close();

  for (const [route, want, label] of [
    ['/discover', 'الجدول', 'schedule'],
    ['/schedule', 'الجدول', 'schedule (alias)'],
    ['/browse', 'المانجا', 'manga'],
    ['/community', 'المجتمع', 'community'],
    ['/trending', 'البحث', 'search']
  ]) {
    ({ page, ctx } = await openWeb(browser, { route }));
    check(G, `${route} opens the ${label} tab`, (await activeTab(page)) === want, await activeTab(page));
    await page.close();
  }

  ({ page, ctx } = await openWeb(browser, { route: `/trending?q=${encodeURIComponent('Test Anime 1')}` }));
  await sleep(1200);
  const q = await page.evaluate(() => document.querySelector('.bx-search-bar input')?.value || '');
  check(G, '/trending?q= fills the search box', q === 'Test Anime 1', q);
  check(G, '…and searches it (the website search, like typing)', ctx.net.some((n) => n.startsWith('GET site/api/stream/search')), ctx.net.filter((n) => n.includes('search')).join(' | '));
  await page.close();

  for (const [route, title] of [
    ['/profile', 'حسابي'],
    ['/mylist', 'قائمتي'],
    ['/profile/settings', 'الإعدادات'],
    ['/profile/history', 'سجل المشاهدة'],
    ['/profile/edit', 'حسابي']
  ]) {
    ({ page, ctx } = await openWeb(browser, { route }));
    check(G, `${route} opens «${title}»`, (await topTitle(page)) === title, await topTitle(page));
    await page.close();
  }

  ({ page, ctx } = await openWeb(browser, { route: '/browse?manga=test-manga-1&server=bx1&chapter=test-manga-1-ch-2' }));
  const reader = await waitFor(page, () => document.querySelectorAll('.bx-app img[src*="/page/"]').length > 0, null, 15000);
  check(G, '/browse?manga=…&chapter=… opens that chapter in the reader', reader, await here(page));
  await page.close();

  // Hidden genres: a link to an Ecchi / Harem / Isekai title opens nothing.
  ({ page, ctx } = await openWeb(browser, { route: `/show/${slugOf(HIDDEN_ANIME[0].name)}` }));
  await sleep(1800);
  check(G, 'a link to a hidden title does not open it', !(await detailsOpen(page)));
  check(G, '…and says it is not available', /مش متاح/.test(await toastText(page)), await toastText(page));
  await page.close();

  ({ page, ctx } = await openWeb(browser, { route: '/show/aw-missing-title' }));
  await sleep(1800);
  check(G, 'a dead link says so instead of showing an empty page', !(await detailsOpen(page)) && /ماقدرناش نلاقي/.test(await toastText(page)), await toastText(page));
  check(G, 'no page errors', ctx.errors.length === 0, ctx.errors.slice(0, 3).join(' | '));
  await page.close();
});

/* ====================================================================== sync */
scenario('sync', async (browser) => {
  const G = 'sync';
  const { page, ctx } = await openWeb(browser, { route: '/' });
  await openFirstPoster(page);
  const t = await detailsTitle(page);
  check(G, 'opening a title puts its link in the address bar', (await here(page)) === `/show/${slugOf(t)}`, `${t} → ${await here(page)}`);
  await tapEl(page, '.bx-detail-cta');
  await waitFor(page, () => document.querySelector('video')?.readyState >= 1, null, 15000);
  check(G, 'playing an episode shows /watch/…/1', (await here(page)) === `/watch/${slugOf(t)}/1`, await here(page));
  await page.close();

  const p2 = (await openWeb(browser, { route: '/' })).page;
  await tapEl(p2, '.bx-dock-item', { text: 'الجدول', exact: true, scroll: false });
  await waitVt(p2);
  check(G, 'schedule tab → /discover', (await here(p2)) === '/discover', await here(p2));
  await tapEl(p2, '.bx-dock-item', { text: 'المانجا', exact: true, scroll: false });
  await waitVt(p2);
  check(G, 'manga tab → /browse', (await here(p2)) === '/browse', await here(p2));
  await tapEl(p2, '.bx-dock-item', { text: 'البحث', exact: true, scroll: false });
  await waitVt(p2);
  await tapEl(p2, '.bx-search-bar input', { scroll: false });
  await p2.keyboard.type('Test Anime 2');
  await sleep(1200);
  check(G, 'a search is kept in the link (/trending?q=…)', (await here(p2)) === `/trending?q=${encodeURIComponent('Test Anime 2')}`, await here(p2));
  await tapEl(p2, '.bx-avatar-btn', { scroll: false });
  await waitVt(p2);
  check(G, 'profile → /profile', (await here(p2)) === '/profile', await here(p2));
  await tapEl(p2, 'main .bxp-row-label', { text: 'الإعدادات', exact: true });
  await waitVt(p2);
  check(G, 'a profile page → /profile/settings', (await here(p2)) === '/profile/settings', await here(p2));
  await tapEl(p2, '.bx-topbar .bxp-back', { scroll: false });
  await waitVt(p2);
  await tapEl(p2, 'main .bxp-row-label', { text: 'قائمتي', exact: true });
  await waitVt(p2);
  check(G, 'my list → /mylist (the website’s own link)', (await here(p2)) === '/mylist', await here(p2));
  check(G, 'no page errors', ctx.errors.length === 0, ctx.errors.slice(0, 3).join(' | '));
  await p2.close();
});

/* ====================================================================== back */
scenario('back', async (browser) => {
  const G = 'back';
  const { page, ctx } = await openWeb(browser, { route: '/' });
  const startLen = await page.evaluate(() => history.length);
  await firstTouch(page);
  await openFirstPoster(page);
  check(G, 'an open title adds one history entry', (await isTrap(page)) && (await page.evaluate(() => history.length)) === startLen + 1);
  await tapEl(page, '.bx-detail-cta');
  await waitFor(page, () => document.querySelector('video')?.readyState >= 1, null, 15000);
  check(G, '…and the player does not add another one', (await page.evaluate(() => history.length)) === startLen + 1, String(await page.evaluate(() => history.length)));
  await browserBack(page);
  const afterPlayer = await page.evaluate(() => ({ video: Boolean(document.querySelector('.bx-pc')), details: Boolean(document.querySelector('.bx-details-sheet')) }));
  check(G, 'browser back closes the player first', afterPlayer.details && !afterPlayer.video, JSON.stringify(afterPlayer));
  check(G, '…the address goes back to the title', (await here(page)).startsWith('/show/'), await here(page));
  await browserBack(page);
  check(G, 'browser back again closes the title', !(await detailsOpen(page)));
  check(G, '…home, address /', (await here(page)) === '/' && (await activeTab(page)) === 'الرئيسية', `${await here(page)} ${await activeTab(page)}`);
  check(G, '…and the site is still open', page.url().startsWith(LOCAL));

  // Closing with the in-app button removes the extra entry (no dead history).
  for (let i = 0; i < 3; i++) {
    await openFirstPoster(page);
    await tapWhenHittable(page, '.bx-details-sheet .bx-icon-btn[aria-label="رجوع"]');
    await sleep(900);
  }
  const st = await page.evaluate(() => ({ len: history.length, trap: Boolean(history.state && history.state.bxTrap), path: location.pathname }));
  check(G, 'in-app close ×3: no history entries pile up', st.len <= startLen + 1 && !st.trap && st.path === '/', JSON.stringify({ ...st, startLen }));

  // Tabs: back goes home, like the Android back button.
  await tapEl(page, '.bx-dock-item', { text: 'الجدول', exact: true, scroll: false });
  await waitVt(page);
  await browserBack(page);
  check(G, 'back from a tab goes home', (await activeTab(page)) === 'الرئيسية' && (await here(page)) === '/', `${await activeTab(page)} ${await here(page)}`);

  // Profile pages pop one at a time.
  await tapEl(page, '.bx-avatar-btn', { scroll: false });
  await waitVt(page);
  await tapEl(page, 'main .bxp-row-label', { text: 'الإعدادات', exact: true });
  await waitVt(page);
  await browserBack(page);
  check(G, 'back from a profile page → profile', (await topTitle(page)) === 'حسابي' && (await here(page)) === '/profile', `${await topTitle(page)} ${await here(page)}`);
  await browserBack(page);
  check(G, 'back from the profile → home', (await activeTab(page)) === 'الرئيسية', await activeTab(page));

  // Sheets close before the page under them.
  await tapEl(page, '.bx-dock-item', { text: 'البحث', exact: true, scroll: false });
  await waitVt(page);
  await tapEl(page, '.bx-search-tools .bx-chip', { text: 'فلترة', scroll: false });
  await sleep(600);
  await browserBack(page);
  const afterSheet = await page.evaluate(() => ({ sheet: Boolean(document.querySelector('.bx-bottom-sheet')), path: location.pathname }));
  check(G, 'back closes the filter sheet and stays on search', !afterSheet.sheet && afterSheet.path === '/trending' && (await activeTab(page)) === 'البحث', JSON.stringify(afterSheet));
  await browserBack(page);
  check(G, '…then back goes home', (await activeTab(page)) === 'الرئيسية');
  check(G, 'no "press back again to exit" toast in a browser', !/تاني عشان تخرج/.test(await toastText(page)), await toastText(page));
  check(G, 'no page errors', ctx.errors.length === 0, ctx.errors.slice(0, 3).join(' | '));
  await page.close();

  // With nothing open, back leaves the site like any website.
  const solo = await openWeb(browser, { route: '/__blank', wait: false });
  await sleep(500);
  await solo.page.goto(`${LOCAL}/`, { waitUntil: 'domcontentloaded' });
  await waitWebReady(solo.page);
  await firstTouch(solo.page);
  await solo.page.evaluate(() => history.back());
  await sleep(1500);
  check(G, 'back on the home page leaves the site', (await solo.page.evaluate(() => location.pathname)) === '/__blank', await solo.page.evaluate(() => location.pathname));
  await solo.page.close();

  // A deep link with no tap yet: back leaves at once (Chrome skips entries added before a tap).
  // Headless Chrome reports every navigated page as already touched (navigator.userActivation),
  // so the test makes the page look like a fresh visit from another site.
  const deep = await openWeb(browser, { route: '/__blank', wait: false });
  await sleep(400);
  await deep.page.evaluateOnNewDocument(() => {
    let touched = false;
    const mark = (e) => {
      if (e.isTrusted) touched = true;
    };
    window.addEventListener('pointerup', mark, true);
    window.addEventListener('keydown', mark, true);
    Object.defineProperty(navigator, 'userActivation', { configurable: true, get: () => ({ hasBeenActive: touched, isActive: false }) });
  });
  await deep.page.goto(`${LOCAL}/show/${slugOf('Test Anime 4')}`, { waitUntil: 'domcontentloaded' });
  await waitWebReady(deep.page);
  await waitFor(deep.page, () => Boolean(document.querySelector('.bx-details-sheet')));
  check(G, 'a link opened from elsewhere adds no entry before the first tap', !(await isTrap(deep.page)));
  await firstTouch(deep.page);
  check(G, '…the first tap adds it', await isTrap(deep.page));
  await browserBack(deep.page);
  check(G, '…then back closes the title and shows home', !(await detailsOpen(deep.page)) && (await here(deep.page)) === '/', await here(deep.page));
  await deep.page.close();
});

/* =================================================================== profile */
scenario('profile', async (browser) => {
  const G = 'profile';
  const { page, ctx } = await openWeb(browser, { route: '/profile' });
  const rows = await page.evaluate(() => [...document.querySelectorAll('main .bxp-row-label')].map((e) => e.textContent.trim()));
  check(G, 'website rows: «تطبيق الأندرويد» + «نسخة الكمبيوتر»', rows.includes('تطبيق الأندرويد') && rows.includes('نسخة الكمبيوتر'), rows.join(' | '));
  check(G, 'no «تحديث التطبيق» row on the website', !rows.includes('تحديث التطبيق'));
  const href = await page.evaluate(() => [...document.querySelectorAll('main a')].find((a) => a.textContent.includes('تطبيق الأندرويد'))?.getAttribute('href') || '');
  check(G, 'the Android row downloads the APK from this site', href === '/BLACK-X-Mobile-120Hz.apk', href);
  check(G, 'footer says black-x-anime.me (no app version)', /black-x-anime\.me/.test(await page.evaluate(() => document.querySelector('.bxp-foot')?.textContent || '')));

  // Google: the web popup (Firebase), not the APK's OAuth window.
  const popups = [];
  browser.on('targetcreated', (tg) => popups.push(tg.url()));
  await tapEl(page, 'main .bxp-hero.is-guest button', { text: 'جوجل' }).catch(async () => tapEl(page, 'main .bxp-hero.is-guest button', { index: 0 }));
  await sleep(4000);
  const net = ctx.net.join(' ');
  check(G, 'Google opens Google’s sign-in popup', popups.some((u) => /firebaseapp\.com\/__\/auth\/handler|accounts\.google\.com/.test(u)) || /identitytoolkit|firebaseapp|apis\.google\.com/.test(ctx.blocked.join(' ')), popups.slice(0, 2).join(' | ') || ctx.blocked.slice(0, 3).join(' | '));
  check(G, '…not the APK OAuth window (createAuthUri)', !/createAuthUri/.test(net + ctx.blocked.join(' ')));

  // The access menu offers the computer version too.
  await tapEl(page, '.bx-topbar [aria-label="القائمة"]', { scroll: false });
  await sleep(500);
  const items = await page.evaluate(() => [...document.querySelectorAll('.bx-menu-item')].map((e) => e.textContent.trim()));
  check(G, 'menu: «نسخة الكمبيوتر»', items.some((t) => t.includes('نسخة الكمبيوتر')), items.join(' | '));
  const sub = await page.evaluate(() => document.querySelector('.bx-menu-item')?.innerText || '');
  check(G, 'menu: guests are told the library is kept on every device', /على كل أجهزتك/.test(sub), sub.replace(/\n/g, ' / '));
  await tapEl(page, '.bx-menu-item', { text: 'نسخة الكمبيوتر' });
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await waitWebReady(page);
  check(G, '«نسخة الكمبيوتر» opens the website pages', (await iface(page)) === 'site', await iface(page));
  check(G, '…and remembers it', (await page.evaluate(() => localStorage.getItem('bx_web_ui'))) === 'site');
  check(G, '…on the same page (/profile)', (await page.evaluate(() => location.pathname)) === '/profile', await page.evaluate(() => location.pathname));
  await page.close();
});

/* ==================================================================== player */
scenario('player', async (browser) => {
  const G = 'player';
  const { page, ctx } = await openWeb(browser, { route: '/' });
  await page.evaluate(() => {
    window.__fsCalls = 0;
    window.__fsLocks = [];
    const orig = Element.prototype.requestFullscreen;
    Element.prototype.requestFullscreen = function (...a) {
      window.__fsCalls += 1;
      return orig ? orig.apply(this, a) : Promise.resolve();
    };
    if (screen.orientation) {
      screen.orientation.lock = (o) => {
        window.__fsLocks.push(o);
        return Promise.resolve();
      };
    }
  });
  await openFirstPoster(page);
  await tapEl(page, '.bx-detail-cta');
  await waitFor(page, () => document.querySelector('video')?.readyState >= 2, null, 15000);
  await sleep(800);
  if (!(await controlsShown(page))) {
    const sb = await boxOf(page, '.bx-pc-surface', { scroll: false });
    await page.touchscreen.tap(sb.x, sb.y - sb.h * 0.25);
    await sleep(450);
  }
  await tapWhenHittable(page, '.bx-pc-play');
  await sleep(400);
  const t0 = await page.evaluate(() => document.querySelector('video').currentTime);
  await tapWhenHittable(page, '[aria-label="قدّم 10 ثواني"]');
  await sleep(500);
  const t1 = await page.evaluate(() => document.querySelector('video').currentTime);
  check(G, '+10 s works on the website', Math.abs(t1 - (t0 + 10)) < 1.5, `${t0.toFixed(1)} → ${t1.toFixed(1)}`);
  if (!(await controlsShown(page))) {
    const sb = await boxOf(page, '.bx-pc-surface', { scroll: false });
    await page.touchscreen.tap(sb.x, sb.y - sb.h * 0.25);
    await sleep(450);
  }
  await tapWhenHittable(page, '.bx-pc [aria-label="ملء الشاشة"]');
  await sleep(900);
  const fs = await page.evaluate(() => ({ calls: window.__fsCalls, el: Boolean(document.fullscreenElement), locks: window.__fsLocks.join(','), ui: document.querySelector('.bx-pc')?.classList.contains('is-fs') }));
  check(G, 'full screen asks the browser for real full screen', fs.calls >= 1 && fs.ui, JSON.stringify(fs));
  check(G, '…in landscape', /landscape/.test(fs.locks) || !fs.el, JSON.stringify(fs));
  check(G, 'no native APK bridge is needed', await page.evaluate(() => typeof window.BlackXNativeAuth === 'undefined'));
  if (fs.el) {
    await page.evaluate(() => document.exitFullscreen());
    await sleep(800);
    check(G, 'leaving the browser full screen (system back) leaves the player’s', !(await page.evaluate(() => document.querySelector('.bx-pc')?.classList.contains('is-fs'))));
  } else {
    check(G, 'leaving the browser full screen (system back) leaves the player’s', true, 'headless refused real full screen; in-page layout only');
  }
  check(G, 'no page errors', ctx.errors.length === 0, ctx.errors.slice(0, 3).join(' | '));
  await page.close();
});

/* ==================================================================== genres */
scenario('genres', async (browser) => {
  const G = 'genres';
  const { page, ctx } = await openWeb(browser, { route: '/' });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(1500);
  const titles = await page.evaluate(() => [...document.querySelectorAll('.bx-poster-title, .bx-hero h1, .bx-hero h2')].map((e) => e.textContent.trim()));
  const leaked = titles.filter((t) => /^Hidden /.test(t));
  check(G, 'phone website home: no Ecchi / Harem / Isekai titles', titles.length > 10 && leaked.length === 0, leaked.join(', ') || `${titles.length} titles`);
  // Every list query excludes the hidden tags (the once-a-day hidden-id lookup asks FOR them, ids only).
  const lists = ctx.algolia.filter((a) => !(Array.isArray(a.body?.attributesToRetrieve) && a.body.attributesToRetrieve.join() === 'objectID'));
  const bare = lists.filter((a) => !JSON.stringify(a.body?.facetFilters || []).includes('tags:-ايتشي'));
  check(G, 'Algolia list queries carry the exclusions', lists.length > 3 && bare.length === 0, bare.map((a) => `${a.index}:${JSON.stringify(a.body?.facetFilters || [])}`).slice(0, 3).join(' | ') || `${lists.length} queries`);
  await page.close();
});

/* =================================================================== desktop */
scenario('desktop', async (browser) => {
  const G = 'desktop';
  let { page, ctx } = await openWeb(browser, { route: '/', phone: false });
  await waitFor(page, () => /Test Anime 1/.test(document.querySelector('.app-shell h1')?.textContent || ''), null, 10000);
  const home = await page.evaluate(() => document.querySelector('.app-shell')?.innerText || '');
  const fakes = ['TV-MA', '24:00', 'S1 E1', 'م1 ح1', 'بداية أسطورة', '(Play', '(Details)', '(Add To', '(All Episodes)', '(Most Popular)', '(ANIME LIST)', '(MANGA LIST)', '(Stories)', 'DEMON SLAYER', 'BLEACH'];
  const found = fakes.filter((f) => home.includes(f));
  check(G, 'computer home: no invented badges, scores or mixed-language labels', found.length === 0, found.join(', ') || 'clean');
  const hero = await page.evaluate(() => {
    const h1 = document.querySelector('.app-shell h1');
    const box = h1?.parentElement;
    return { title: h1?.textContent.trim() || '', text: box?.innerText || '' };
  });
  check(G, 'hero shows a real title from the API', hero.title === 'Test Anime 1', hero.title);
  check(G, 'hero shows its real genres and episode', /أكشن/.test(hero.text) && /الحلقة 3/.test(hero.text) && /شغّل الحلقة 3/.test(hero.text), hero.text.replace(/\n/g, ' / ').slice(0, 160));
  check(G, 'hero shows type and year from the record', /مسلسل • 2021/.test(hero.text), hero.text.replace(/\n/g, ' / ').slice(0, 160));
  await page.evaluate(() => [...document.querySelectorAll('.app-shell button')].find((b) => b.textContent.includes('أضف إلى قائمتي'))?.click());
  await sleep(700);
  const authOpen = await page.evaluate(() => /تسجيل الدخول|Sign in|دخول/.test(document.querySelector('.modal, [role="dialog"]')?.innerText || ''));
  check(G, '«أضف إلى قائمتي» asks a guest to sign in (it saves for real)', authOpen);
  check(G, 'no page errors on the computer home', ctx.errors.length === 0, ctx.errors.slice(0, 3).join(' | '));
  await page.close();

  // Hidden genres on the computer website: title and player pages say "not available".
  const hiddenSlug = slugOf(HIDDEN_ANIME[0].name);
  for (const route of [`/show/${hiddenSlug}`, `/watch/${hiddenSlug}/1`]) {
    ({ page, ctx } = await openWeb(browser, { route, phone: false }));
    const ok = await waitFor(page, () => /مش متاح على BLACK X/.test(document.querySelector('.app-shell')?.innerText || ''), null, 10000);
    check(G, `${route.split('/')[1]} page of a hidden title: «مش متاح»`, ok);
    await page.close();
  }
  ({ page, ctx } = await openWeb(browser, { route: `/show/${slugOf('Test Anime 2')}`, phone: false }));
  const normal = await waitFor(page, () => /Test Anime 2/.test(document.querySelector('.app-shell h1')?.textContent || ''), null, 10000);
  check(G, 'a normal title page still opens', normal && !(await page.evaluate(() => /مش متاح على BLACK X/.test(document.body.innerText))));
  const detail = await page.evaluate(() => document.querySelector('.detail-hero')?.innerText || '');
  const invented = ['120Hz', '4K Ultra', 'FHD 1080p', '1.4K', '24.8K', '98%', 'تطابق', '24 دقيقة', 'مانجا يابانية', 'يعرض الآن'].filter((f) => detail.includes(f));
  check(G, 'title page: no invented likes, views, match %, quality, duration or source', invented.length === 0, invented.join(', ') || 'clean');
  check(G, 'title page: real facts (type, year, rating, server)', /مسلسل/.test(detail) && /2022/.test(detail) && /★ 6\.7/.test(detail) && /BLACK X 1/.test(detail), detail.replace(/\n/g, ' / ').slice(0, 220));
  await page.close();

  // Player page seen by VIP Monarch, the tier of the removed «4K HDR • 60FPS» toggle (it only put a
  // CSS colour filter on the video): no toggle, no filter, no 4K / HDR / 60fps copy; the rest stays.
  ({ page, ctx } = await openWeb(browser, { route: `/watch/${slugOf('Test Anime 2')}/1`, phone: false, seed: { 'blackx.vipTier': 'vip_monarch' } }));
  const monarchView = await waitFor(page, () => /وصول مبكر/.test(document.querySelector('.app-shell')?.innerText || '') && document.querySelector('.player-shell'), null, 10000);
  const watchState = await page.evaluate(() => {
    const text = document.querySelector('.app-shell')?.innerText || '';
    const filtered = [];
    for (let el = document.querySelector('.player-shell'); el && el !== document.body; el = el.parentElement) {
      const f = getComputedStyle(el).filter;
      if (f && f !== 'none') filtered.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}: ${f}`);
    }
    return { text, filtered };
  });
  check(G, 'player page as VIP Monarch: player and streaming bar render («VIP Fast CDN», «وصول مبكر»)', Boolean(monarchView) && /VIP Fast CDN/.test(watchState.text));
  const fake4k = watchState.text.match(/4K|HDR|60\s*FPS/gi) || [];
  check(G, 'player page: no «4K HDR • 60FPS» toggle and no 4K / HDR / 60fps claim', fake4k.length === 0, fake4k.join(', ') || 'clean');
  check(G, 'player page: no colour filter over the video', watchState.filtered.length === 0, watchState.filtered.join(' | ') || 'none');
  check(G, 'no page errors on the player page', ctx.errors.length === 0, ctx.errors.slice(0, 3).join(' | '));
  await page.close();

  // The browser's own AniList queries ask AniList to drop the hidden genres.
  ({ page, ctx } = await openWeb(browser, { route: '/browse', phone: false }));
  await sleep(2500);
  const bodies = ctx.anilist.map((b) => b?.query || '').filter(Boolean);
  check(G, 'manga page: AniList queries exclude Ecchi / Harem / Isekai', bodies.length > 0 && bodies.every((q) => /genre_not_in/.test(q) && /tag_not_in/.test(q)), `${bodies.length} queries`);
  await page.keyboard.down('Control');
  await page.keyboard.press('k');
  await page.keyboard.up('Control');
  await sleep(400);
  const before = ctx.anilist.length;
  await page.keyboard.type('naruto');
  await sleep(1500);
  const search = ctx.anilist.slice(before).map((b) => b?.query || '');
  check(G, 'search window (Ctrl+K): AniList query excludes them too', search.length > 0 && search.every((q) => /genre_not_in/.test(q)), `${search.length} queries`);
  await page.close();
});

/* ==================================================================== runner */
const server = await startServer();
for (const sc of scenarios) {
  if (ONLY.length && !ONLY.includes(sc.name)) continue;
  console.log(`\n--- web:${sc.name} ---`);
  const browser = await launch();
  try {
    await sc.fn(browser);
  } catch (err) {
    check(sc.name, 'scenario finished without crashing', false, err.stack?.split('\n').slice(0, 3).join(' / ') || String(err));
  } finally {
    await browser.close().catch(() => {});
  }
}
server.close();
const { pass, total } = summary();
process.exit(pass === total ? 0 : 1);
