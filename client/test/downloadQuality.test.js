// Download quality tiers come only from what the server reported (owner's decision of
// 2026-10-17): unknown stays «جودة غير معروفة» and free, it is never guessed as FHD/HD.
import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadQualityTier, unknownQualityLabel } from '../src/utils/downloadQuality.js';

test('reported qualities map to their tier', () => {
  assert.equal(downloadQualityTier('FHD'), 'fhd');
  assert.equal(downloadQualityTier('1080p'), 'fhd');
  assert.equal(downloadQualityTier('FHD 1080P'), 'fhd');
  assert.equal(downloadQualityTier('4K'), 'fhd');
  assert.equal(downloadQualityTier('HD'), 'hd');
  assert.equal(downloadQualityTier('720p'), 'hd');
  assert.equal(downloadQualityTier('SD'), 'sd');
  assert.equal(downloadQualityTier('480p'), 'sd');
  assert.equal(downloadQualityTier('360'), 'sd');
});

test('missing or meaningless qualities are unknown, never FHD', () => {
  for (const q of [undefined, null, '', '   ', 'Download', 'Mirror', 'mp4']) {
    assert.equal(downloadQualityTier(q), 'unknown', String(q));
  }
  assert.equal(unknownQualityLabel('ar'), 'جودة غير معروفة');
  assert.equal(unknownQualityLabel('en'), 'Unknown quality');
});
