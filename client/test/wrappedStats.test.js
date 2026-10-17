// «ملخصك» numbers (client/src/mobile/wrappedStats.js): only what was recorded, no minimums.
import test from 'node:test';
import assert from 'node:assert/strict';
import { hoursText, wrappedStats } from '../src/mobile/wrappedStats.js';

const at = (iso) => Date.parse(iso);

test('nothing recorded: zeros and empty, never a made-up minimum', () => {
  const s = wrappedStats({ year: 2026 });
  assert.equal(s.seconds, 0);
  assert.equal(s.started, 0);
  assert.equal(s.finished, 0);
  assert.equal(s.titlesCount, 0);
  assert.equal(s.busiestMonth, -1);
  assert.equal(s.empty, true);
});

test('counts only this year, finished at 90 %, time is the seconds reached', () => {
  const positions = [
    ['aw-one-piece:1', { sec: 1400, dur: 1440, at: at('2026-03-02T10:00:00Z') }], // finished (97 %)
    ['aw-one-piece:2', { sec: 600, dur: 1440, at: at('2026-03-05T10:00:00Z') }], // started
    ['aw-one-piece:3', { sec: 2000, dur: 1440, at: at('2026-03-06T10:00:00Z') }], // capped at the duration
    ['aw-bleach:1', { sec: 0, dur: 1440, done: true, at: at('2026-07-01T10:00:00Z') }], // marked done
    ['aw-bleach:2', { sec: 0, dur: 0, at: at('2026-07-02T10:00:00Z') }], // never played: ignored
    ['aw-naruto:1', { sec: 1440, dur: 1440, at: at('2025-12-31T10:00:00Z') }] // last year: ignored
  ];
  const history = [
    { slug: 'aw-one-piece', titleEn: 'One Piece', poster: 'op.jpg', objectID: 'One Piece', tags: ['اكشن', 'مغامرات'], updatedAt: '2026-03-06T10:00:00Z' },
    { objectID: 'Bleach', titleEn: 'Bleach', tags: ['اكشن'], updatedAt: '2026-07-01T10:00:00Z' },
    { slug: 'aw-naruto', titleEn: 'Naruto', tags: ['شونين'], updatedAt: '2025-12-31T10:00:00Z' }
  ];
  const s = wrappedStats({
    positions,
    history,
    mangaHistory: [{ updatedAt: '2026-01-01T00:00:00Z' }, { updatedAt: '2024-01-01T00:00:00Z' }],
    favorites: [{ createdAt: '2026-05-01T00:00:00Z' }],
    year: 2026
  });
  assert.equal(s.started, 4);
  assert.equal(s.finished, 3);
  assert.equal(s.seconds, 1400 + 600 + 1440 + 0);
  assert.equal(s.titlesCount, 2);
  assert.equal(s.topTitles[0].title, 'One Piece');
  assert.equal(s.topTitles[0].episodes, 3);
  assert.equal(s.topTitles[1].title, 'Bleach', 'a history entry without slug is matched by its objectID');
  assert.deepEqual(s.topGenres, ['اكشن', 'مغامرات']);
  assert.equal(s.mangaTitles, 1);
  assert.equal(s.favoritesAdded, 1);
  assert.equal(s.busiestMonth, 2, 'March');
  assert.equal(s.empty, false);
});

test('hoursText', () => {
  assert.equal(hoursText(0, true), '0 د');
  assert.equal(hoursText(3660, true), '1 س 1 د');
  assert.equal(hoursText(7200, false), '2h');
});
