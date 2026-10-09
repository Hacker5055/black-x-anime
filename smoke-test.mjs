/**
 * BLACK X smoke test — streaming platform flows.
 * Run: npm run dev  (in another shell)  →  node smoke-test.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const OUT = 'screenshots';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, cond, extra = '') => {
  results.push({ name, ok: Boolean(cond) });
  console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 920 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', (err) => console.log('  [pageerror]', err.message.slice(0, 120)));

try {
  /* ---------------- 1. landing (EN) ---------------- */
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1800);
  check('landing loads', await page.locator('.hero').count() > 0);
  check('nav has Home/Browse/My List', await page.locator('.nav__link').count() === 3);
  check('latest episodes rendered', await page.locator('.ep-tile').count() > 3, `${await page.locator('.ep-tile').count()} tiles`);
  check('trending rendered', await page.locator('.grid-anime .anime-card').count() > 3);
  await shot(page, '01-dashboard-en');

  /* ---------------- 2. login ---------------- */
  await page.locator('.nav__actions button', { hasText: 'Log in' }).click();
  await page.locator('#auth-username').fill('kuro');
  await page.locator('#auth-password').fill('blackx2026');
  await page.locator('form button[type=submit]').click();
  await page.waitForSelector('.user-chip', { timeout: 8000 });
  check('login works', await page.locator('.user-chip').count() === 1);
  await page.waitForTimeout(1200);
  check('continue-watching row (seeded)', await page.locator('.cont-card').count() >= 1, `${await page.locator('.cont-card').count()} cards`);
  check('favorites shelf (seeded)', await page.locator('.grid-anime .anime-card').count() > 3);
  await shot(page, '02-dashboard-logged-in');

  /* ---------------- 3. show detail + favorite ---------------- */
  // episode tiles deep-link to the player; show cards open the show page
  await page.locator('.section', { hasText: 'Your favorites' }).locator('.anime-card').first().click();
  await page.waitForSelector('.detail-hero', { timeout: 20000 });
  check('show detail opens', await page.locator('.detail-hero').count() === 1);
  const epCount = await page.locator('.ep-chip').count();
  check('episode grid rendered', epCount > 0, `${epCount} episodes`);
  await shot(page, '03-show-detail');

  const favBtn = page.locator('.detail-hero button', { hasText: /favorites|In your favorites/ });
  const favBefore = await favBtn.innerText();
  await favBtn.click();
  await page.waitForTimeout(700);
  const favAfter = await page.locator('.detail-hero button', { hasText: /favorites|In your favorites/ }).innerText();
  check('favorite toggle (optimistic)', favBefore.trim() !== favAfter.trim(), `${favBefore.trim()} → ${favAfter.trim()}`);
  // toggle back to leave state clean
  await page.locator('.detail-hero button', { hasText: /favorites|In your favorites/ }).click();
  await page.waitForTimeout(500);

  /* ---------------- 4. watch page: live witanime sources ---------------- */
  await page.locator('.detail-hero button', { hasText: /Watch now|Continue/ }).click();
  await page.waitForSelector('.player-shell', { timeout: 20000 });
  // sources may take a moment (live upstream); retry once if empty
  for (let i = 0; i < 3; i += 1) {
    if (await page.locator('video.player-video').count() > 0) break;
    if (await page.locator('.player-embed').count() > 0) break;
    const retry = page.locator('button', { hasText: 'Retry' });
    if (await retry.count() > 0) {
      await retry.first().click();
      await sleep(6000);
    } else {
      await sleep(4000);
    }
  }
  const hasVideo = await page.locator('video.player-video').count() > 0;
  const hasEmbed = await page.locator('.player-embed').count() > 0;
  check('player mounted (video or embed)', hasVideo || hasEmbed, hasVideo ? 'direct mp4' : hasEmbed ? 'embed frame' : 'no sources');
  check('source drawer exists', await page.locator('.player-sources__toggle').count() === 1);

  if (hasVideo) {
    // play, let position move, verify progress save
    await page.locator('.player-bigplay').click().catch(() => {});
    await sleep(3500);
    const t1 = await page.evaluate(() => document.querySelector('video.player-video')?.currentTime || 0);
    check('video plays (time advances)', t1 > 0.4, `t=${t1.toFixed(1)}s`);
    await shot(page, '04-watch-player');

    // control bar visible
    check('control bar with scrubber', await page.locator('.player-scrub').count() === 1);
    // keyboard: pause with space
    await page.locator('.player-shell').focus();
    await page.keyboard.press('Space');
    await sleep(600);
    const paused = await page.evaluate(() => document.querySelector('video.player-video')?.paused);
    check('space toggles pause', paused === true);

    // wait for a progress save (5s throttle) then check the API
    await sleep(2600);
    const progress = await page.evaluate(async (slug) => {
      const r = await fetch('/api/library/continue', { credentials: 'include' });
      const d = await r.json();
      return (d.history || []).find((h) => h.slug === slug) || null;
    }, page.url().split('/watch/')[1].split('/')[0]);
    check('progress persisted to server', Boolean(progress) && progress.position >= 0, progress ? `pos=${progress.position}s ep=${progress.episode}` : 'missing');
  }

  /* ---------------- 5. mark watched + next episode nav ---------------- */
  await page.locator('button', { hasText: 'Mark as watched' }).click();
  await sleep(800);
  check('mark-watched toast', (await page.locator('.toast').count()) > 0);

  /* ---------------- 6. my list ---------------- */
  await page.goto(`${BASE}/mylist`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  check('my list favorites tab', await page.locator('.grid-anime .anime-card, .empty-state').count() > 0);
  await page.locator('.filter-bar .chip', { hasText: 'Continue watching' }).click();
  await sleep(600);
  check('continue tab shows progress', await page.locator('.cont-card').count() >= 1);
  await page.locator('.filter-bar .chip', { hasText: 'History' }).click();
  await sleep(600);
  check('history tab works', await page.locator('.cont-card').count() >= 1);
  await shot(page, '05-mylist');

  /* ---------------- 7. browse + search ---------------- */
  await page.goto(`${BASE}/browse`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  check('browse latest grid', await page.locator('.ep-tile').count() > 3);
  await page.locator('input[name=q]').fill('naruto');
  await page.locator('form button[type=submit]').click();
  await page.waitForTimeout(3500);
  check('search results from witanime', await page.locator('.grid-anime .anime-card').count() >= 1, `${await page.locator('.grid-anime .anime-card').count()} results`);
  await shot(page, '06-browse-search');

  /* ---------------- 8. Arabic RTL ---------------- */
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.locator('.lang-toggle button', { hasText: 'ع' }).click();
  await page.waitForTimeout(900);
  const dir = await page.evaluate(() => document.documentElement.dir);
  check('auto RTL switch', dir === 'rtl', `dir=${dir}`);
  check('nav renders in RTL', Boolean(await page.locator('.nav__inner').count()));
  await shot(page, '07-dashboard-ar');
  // arabic show + watch pages
  await page.locator('.section', { hasText: 'المفضلة' }).locator('.anime-card').first().click();
  await page.waitForSelector('.detail-hero', { timeout: 20000 });
  await shot(page, '08-show-detail-ar');
  await page.locator('.detail-hero button', { hasText: /شاهد|متابعة/ }).click();
  await page.waitForSelector('.player-shell', { timeout: 20000 });
  await sleep(2500);
  await shot(page, '09-watch-ar');
  check('Arabic player page', await page.locator('.player-shell').count() === 1);

  /* ---------------- 9. mobile ---------------- */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  check('mobile bottom tabs', await page.locator('.nav-mobile-tabs').count() === 1);
  await shot(page, '10-mobile-dashboard');
  await page.locator('.nav-mobile-tabs a', { hasText: 'قائمتي' }).or(page.locator('.nav-mobile-tabs a', { hasText: 'My List' })).first().click();
  await page.waitForTimeout(1200);
  await shot(page, '11-mobile-mylist');
} catch (err) {
  console.error('✗ smoke crashed:', err.message);
  await shot(page, '99-crash').catch(() => {});
  results.push({ name: 'smoke crashed', ok: false });
}

await browser.close();

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed · screenshots in ./${OUT}`);
process.exit(passed === results.length ? 0 : 1);
