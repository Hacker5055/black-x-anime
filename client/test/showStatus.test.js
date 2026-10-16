// Card status badges on the computer website: only what the API really says.
import test from 'node:test';
import assert from 'node:assert/strict';
import { showStatusLabel } from '../src/utils/showStatus.js';

test('the catalogue\'s Arabic words map to the right badge', () => {
  assert.equal(showStatusLabel('مكتمل', 'ar'), 'مكتمل');
  assert.equal(showStatusLabel('مستمر', 'ar'), 'يعرض الآن');
  assert.equal(showStatusLabel('مكتمل', 'en'), 'Completed');
  assert.equal(showStatusLabel('مستمر', 'en'), 'Airing');
});

test('AniList enums and English words map to the right badge', () => {
  assert.equal(showStatusLabel('FINISHED', 'ar'), 'مكتمل');
  assert.equal(showStatusLabel('RELEASING', 'ar'), 'يعرض الآن');
  assert.equal(showStatusLabel('NOT_YET_RELEASED', 'ar'), 'قريباً');
  assert.equal(showStatusLabel('Finished Airing', 'en'), 'Completed');
  assert.equal(showStatusLabel('Currently Airing', 'en'), 'Airing');
  assert.equal(showStatusLabel('Completed', 'en'), 'Completed');
  assert.equal(showStatusLabel('Ongoing', 'en'), 'Airing');
});

test('a completed title is never called airing (the old cards checked FINISHED only)', () => {
  for (const status of ['مكتمل', 'Completed', 'Finished Airing', 'FINISHED']) {
    assert.notEqual(showStatusLabel(status, 'ar'), 'يعرض الآن', status);
  }
});

test('a missing or unknown status hides the badge instead of guessing', () => {
  for (const status of [undefined, null, '', '   ', 'CANCELLED', 'HIATUS', 'مسلسل', 42]) {
    assert.equal(showStatusLabel(status, 'ar'), '', String(status));
  }
});
