import test from 'node:test';
import assert from 'node:assert/strict';
import { isStrictCrossSourceMatch, seasonNumberOf } from '../src/lib/crossSourceMatch.js';

test('season numbers are read from common title forms', () => {
  assert.equal(seasonNumberOf('Tensei shitara Ken deshita'), 1);
  assert.equal(seasonNumberOf('tensei shitara ken deshita 2'), 2);
  assert.equal(seasonNumberOf('Tensei shitara Ken deshita II'), 2);
  assert.equal(seasonNumberOf('Jujutsu Kaisen 2nd Season'), 2);
  assert.equal(seasonNumberOf('Shingeki no Kyojin Season 3'), 3);
  assert.equal(seasonNumberOf('Mob Psycho 100'), 1);
  assert.equal(seasonNumberOf('Kaiju No. 8'), 8);
});

test('a different show sharing most words is rejected (live bug: Ken deshita 2 -> Slime)', () => {
  assert.equal(isStrictCrossSourceMatch('tensei shitara ken deshita 2', 'Tensei shitara Slime Datta Ken'), false);
  assert.equal(isStrictCrossSourceMatch('tensei shitara ken deshita', 'Tensei shitara Slime Datta Ken'), false);
});

test('the same show and season is accepted', () => {
  assert.equal(isStrictCrossSourceMatch('tensei shitara ken deshita 2', 'Tensei shitara Ken deshita II'), true);
  assert.equal(isStrictCrossSourceMatch('tensei shitara ken deshita 2', 'Tensei Shitara Ken Deshita 2nd Season'), true);
  assert.equal(isStrictCrossSourceMatch('one piece', 'One Piece'), true);
  assert.equal(isStrictCrossSourceMatch('shingeki no kyojin the final season', 'Shingeki no Kyojin: The Final Season'), true);
});

test('other seasons, films and arcs of the same franchise are rejected', () => {
  assert.equal(isStrictCrossSourceMatch('jujutsu kaisen', 'Jujutsu Kaisen 2nd Season'), false);
  assert.equal(isStrictCrossSourceMatch('jujutsu kaisen 2nd season', 'Jujutsu Kaisen'), false);
  assert.equal(isStrictCrossSourceMatch('one piece', 'One Piece Film: Red'), false);
  assert.equal(isStrictCrossSourceMatch('kimetsu no yaiba', 'Kimetsu no Yaiba: Yuukaku-hen'), false);
});

test('any of several candidate titles may match; empty input never does', () => {
  assert.equal(isStrictCrossSourceMatch('sousou no frieren', 'Frieren: Beyond Journey’s End', 'Sousou no Frieren'), true);
  assert.equal(isStrictCrossSourceMatch('', 'One Piece'), false);
  assert.equal(isStrictCrossSourceMatch('one piece', '', null, undefined), false);
});
