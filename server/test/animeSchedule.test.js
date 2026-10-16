// /api/anime/schedule: this week's real air times (AniList) for the most popular Japanese
// anime on air now. The app's schedule tab (matched to the catalogue by MAL id) and the old
// computer home are built from it. One AniList page covers the whole week, because a weekly
// show's next episode always falls within 7 days; a second page is read only when AniList
// reports one. (The old airingSchedules query returned only the first 50 slots of the week,
// which ran out after two or three days.) Hidden genres never appear.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

const express = (await import('express')).default;
const { default: animeRoutes } = await import('../src/routes/anime.js');
const { db } = await import('../src/db.js');

const CACHE_KEY = 'anilist:airing-now:v2';
// Ids far above AniList's range, so the local anime cache never mixes them with real titles.
const IDS = { soon: 990000101, aired: 990000102, hidden: 990000103, hiatus: 990000104, later: 990000105 };
const originalFetch = globalThis.fetch;
const requests = [];
// AniList's second page (empty unless a test fills it).
let secondPage = [];
const now = Math.floor(Date.now() / 1000);
let server;
let base;

function media(id, title, { genres = ['Action'], tags = [], next = null, idMal = id - 990000000 + 70000 } = {}) {
  return {
    id,
    idMal,
    type: 'ANIME',
    status: 'RELEASING',
    format: 'TV',
    episodes: 12,
    duration: 24,
    title: { romaji: title, english: title, native: null },
    description: `${title} synopsis`,
    coverImage: { extraLarge: `https://img.test/${id}.jpg`, large: `https://img.test/${id}.jpg`, color: '#123456' },
    bannerImage: null,
    genres,
    tags: tags.map((name) => ({ name })),
    averageScore: 80,
    meanScore: 80,
    popularity: 1000,
    season: 'FALL',
    seasonYear: 2026,
    nextAiringEpisode: next
  };
}

const FIXTURE = [
  media(IDS.soon, 'Airs In Two Hours', { next: { episode: 5, airingAt: now + 2 * 3600 } }),
  // Aired three hours ago, so its next episode is six days and 21 hours away.
  media(IDS.aired, 'Aired This Morning', { next: { episode: 8, airingAt: now + 7 * 86400 - 3 * 3600 } }),
  // AniList already drops these through tag_not_in; the server filters them again.
  media(IDS.hidden, 'Hidden Isekai Show', { genres: ['Fantasy'], tags: ['Isekai'], next: { episode: 2, airingAt: now + 3600 } }),
  media(IDS.hiatus, 'On Hiatus', { next: null }),
  media(IDS.later, 'Returns Next Month', { next: { episode: 1, airingAt: now + 20 * 86400 } })
];

function clearCaches() {
  db.prepare('DELETE FROM api_cache WHERE key = ?').run(CACHE_KEY);
  db.prepare(`DELETE FROM anime_cache WHERE id IN (${Object.values(IDS).join(',')})`).run();
}

before(async () => {
  clearCaches();
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).startsWith('https://graphql.anilist.co')) {
      const body = JSON.parse(init.body || '{}');
      requests.push(body);
      const page = Number(body.variables?.page) || 1;
      const data =
        page === 1
          ? { Page: { pageInfo: { hasNextPage: secondPage.length > 0 }, media: FIXTURE } }
          : { Page: { pageInfo: { hasNextPage: false }, media: secondPage } };
      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return originalFetch(url, init);
  };
  const app = express();
  app.use('/api/anime', animeRoutes);
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  globalThis.fetch = originalFetch;
  clearCaches();
  await new Promise((resolve) => server.close(resolve));
});

async function schedule() {
  const res = await fetch(`${base}/api/anime/schedule`);
  assert.equal(res.status, 200);
  const body = await res.json();
  const slots = Object.values(body.days).flat().sort((a, b) => a.airingAt - b.airingAt);
  return { body, slots };
}

test('one AniList request for shows on air now, with the hidden genres excluded in the query', async () => {
  await schedule();
  assert.equal(requests.length, 1, 'no second page is read when AniList reports none');
  const { query } = requests[0];
  assert.match(query, /status: RELEASING/);
  assert.match(query, /genre_not_in/);
  assert.match(query, /tag_not_in/);
  assert.match(query, /isAdult: false/);
});

test('every weekday bucket exists and each show sits in the bucket of its own air time', async () => {
  const { body } = await schedule();
  assert.deepEqual(Object.keys(body.days).sort(), ['0', '1', '2', '3', '4', '5', '6']);
  for (const [day, list] of Object.entries(body.days)) {
    for (const slot of list) assert.equal(new Date(slot.airingAt * 1000).getUTCDay(), Number(day));
  }
});

test('a show that already aired today is still listed, with next week\'s episode on the same weekday', async () => {
  const { slots } = await schedule();
  const aired = slots.find((s) => s.media.id === IDS.aired);
  assert.ok(aired, 'the show that aired this morning is missing from the week');
  assert.equal(aired.episode, 8);
  assert.equal(aired.airingAt, now + 7 * 86400 - 3 * 3600);
});

test('each slot carries the real next episode and air time, without the synopsis', async () => {
  const { slots } = await schedule();
  const soon = slots.find((s) => s.media.id === IDS.soon);
  assert.equal(soon.episode, 5);
  assert.equal(soon.airingAt, now + 2 * 3600);
  assert.equal(soon.media.titleEnglish, 'Airs In Two Hours');
  assert.equal(soon.media.status, 'RELEASING');
  assert.equal(soon.media.description, undefined);
});

test('each media carries its MyAnimeList id, so the app can match its catalogue records', async () => {
  const { slots } = await schedule();
  const soon = slots.find((s) => s.media.id === IDS.soon);
  assert.equal(soon.media.malId, 70101);
  assert.match(requests[0].query, /idMal/);
});

test('hidden genres, shows on hiatus and shows returning after this week are left out', async () => {
  const { slots } = await schedule();
  assert.deepEqual(
    slots.map((s) => s.media.id),
    [IDS.soon, IDS.aired]
  );
});

test('the AniList answer is cached, so visitors do not each trigger a request', async () => {
  await schedule();
  await schedule();
  assert.equal(requests.length, 1);
});

test('when AniList reports a second page it is read once and merged (no duplicates)', async () => {
  clearCaches();
  requests.length = 0;
  secondPage = [
    media(990000106, 'Second Page Show', { next: { episode: 3, airingAt: now + 5 * 3600 } }),
    // Already on page one: must not appear twice.
    FIXTURE[0]
  ];
  try {
    const { slots } = await schedule();
    assert.equal(requests.length, 2);
    assert.equal(requests[1].variables.page, 2);
    assert.deepEqual(
      slots.map((s) => s.media.id),
      [IDS.soon, 990000106, IDS.aired]
    );
  } finally {
    secondPage = [];
    db.prepare('DELETE FROM anime_cache WHERE id = 990000106').run();
    clearCaches();
  }
});
