import test from 'node:test';
import assert from 'node:assert/strict';
import {
  animeSlugOf,
  bxApiBase,
  bxImageProxyUrl,
  fetchMobileChapterPages,
  fetchMobileMangaChapters,
  fetchMobileMangaList,
  inferAnimeSource,
  mapBxChapters,
  mapBxMangaItem,
  mapEpisodeEntries,
  mapShowEpisodes,
  normalizeMangaPageUrl,
  preferPixeldrainMirror,
  unwrapPlayerUrl
} from '../src/mobile/bxServers.js';

function withFetch(handler, fn) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, opts = {}) => {
    calls.push({ url: String(url), opts });
    const out = await handler(String(url), opts);
    const status = out?.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => out?.body ?? out
    };
  };
  return Promise.resolve(fn(calls)).finally(() => {
    globalThis.fetch = original;
  });
}

test('browser builds call the same-origin /api (no APK base)', () => {
  assert.equal(bxApiBase(), '');
});

test('anime slugs and sources follow the website rules', () => {
  assert.equal(animeSlugOf({ objectID: 'Kaguya-sama: Love is War?' }), 'aw-kaguya-sama-love-is-war');
  assert.equal(animeSlugOf({ slug: 'aw-kaguya-sama-love-is-war-' }), 'aw-kaguya-sama-love-is-war');
  assert.equal(animeSlugOf({ slug: 'a3rb-xOnePiece' }), 'a3rb-xOnePiece');
  assert.equal(inferAnimeSource({ slug: 'aw-one-piece' }), 'witanime');
  assert.equal(inferAnimeSource({ slug: 'a3rb-xOnePiece' }), 'anime3rb');
  assert.equal(inferAnimeSource({ slug: 'en-123-frieren' }), 'english');
  assert.equal(inferAnimeSource({ slug: 'x', source: 'english' }), 'english');
});

test('episode list keeps whole episodes once, sorted', () => {
  const eps = mapShowEpisodes({
    poster: 'p.jpg',
    episodes: [
      { number: 2, docId: '002', title: 'الحلقة 2' },
      { number: 1, docId: '001', title: 'الحلقة 1' },
      { number: 1, docId: '001b', title: 'dup' },
      { number: 12.5, title: 'recap' }
    ]
  });
  assert.deepEqual(eps.map((e) => e.number), [1, 2]);
  assert.equal(eps[0].docId, '001');
  assert.equal(eps[0].thumb, 'p.jpg');
});

test('episode manifest -> playable APK servers (website labels, no iframe-only hosts)', () => {
  const servers = mapEpisodeEntries(
    {
      entries: [
        { id: 'vip', isMonarchExclusive: true, directUrl: 'https://x/vip.mp4' },
        {
          id: 'aw-pd-1080p-0',
          server: '👑 BLACK X 1 — PixelDrain Ultra (1080p)',
          quality: 'FHD 1080p',
          serverCode: 'PD',
          embedUrl: '/api/stream/mp4-player?url=https%3A%2F%2Fpixeldrain.com%2Fapi%2Ffile%2Fabc',
          directUrl: 'https://pixeldrain.com/api/file/abc'
        },
        { id: 'a3rb-hd', server: '⚡ BLACK X Direct 720p HD', quality: '720p HD', embedUrl: '/api/stream/mp4-player?url=https%3A%2F%2Fdl.example%2Fe1.mp4' },
        { id: 'a3rb-mega', server: '☁️ BLACK X Cloud 2 (FHD)', embedUrl: 'https://mega.nz/embed/xyz', directUrl: null },
        { id: 'en-hls', server: 'BLACK X 3', directUrl: '/api/stream/hls-proxy?url=https%3A%2F%2Fcdn%2Fa.m3u8' },
        { id: 'wita-1', server: 'BLACK X 1 — Stream', token: 't' }
      ],
      resolved: {}
    },
    { slug: 'aw-x', episode: 1, source: 'witanime', canPlayHls: false }
  );
  assert.deepEqual(
    servers.map((s) => s.entryId),
    ['aw-pd-1080p-0', 'a3rb-hd', 'wita-1']
  );
  assert.equal(servers[0].directResolvedUrl, 'https://pixeldrain.dev/api/file/abc');
  assert.equal(servers[0].label, '👑 BLACK X 1 — PixelDrain Ultra (1080p)');
  assert.equal(servers[1].directResolvedUrl, 'https://dl.example/e1.mp4');
  assert.equal(servers[2].needsResolve, true);
  assert.equal(servers[2].slug, 'aw-x');
});

test('player URL helpers', () => {
  assert.equal(unwrapPlayerUrl('/api/stream/mp4-player?url=https%3A%2F%2Fa%2Fb.mp4'), 'https://a/b.mp4');
  assert.equal(unwrapPlayerUrl('https://a/b.mp4'), 'https://a/b.mp4');
  assert.equal(preferPixeldrainMirror('https://pixeldrain.com/u/AbC_1'), 'https://pixeldrain.dev/api/file/AbC_1');
  assert.equal(preferPixeldrainMirror('https://cdn.example/v.mp4'), 'https://cdn.example/v.mp4');
});

test('library item -> manga card without invented values', () => {
  const hit = mapBxMangaItem({
    id: 'solo-leveling',
    title_ar: 'سولو ليفلينج',
    title_en: 'Solo Leveling',
    type: 'MANHWA',
    poster: 'https://img/solo.png',
    status: 'COMPLETED',
    source: 'BLACK X 1',
    availableServers: ['bx1', 'bx2', 'bx3']
  });
  assert.equal(hit.objectID, 'bx:solo-leveling');
  assert.equal(hit.bxServer, 'bx1');
  assert.deepEqual(hit.bxServers, ['bx1', 'bx2', 'bx3']);
  assert.equal(hit.type, 'مانهوا كورية');
  assert.equal(hit.status, 'completed');
  assert.equal(hit.rate, '');
  const search = mapBxMangaItem({ id: 'asq:kaoru', title: 'Kaoru Hana wa Rin to Saku', type: 'MANGA', server: 'bx2', rating: 9.7 });
  assert.equal(search.bxServer, 'bx2');
  assert.equal(search.type, 'مانجا يابانية');
  assert.equal(search.rate, '9.7');
  assert.equal(search.poster_uri, '/blackx-logo.png');
});

test('chapters are newest first and keep their own server', () => {
  const chs = mapBxChapters(
    [
      { chapterId: 'md:a', chapterNumber: '2.6', server: 'bx3' },
      { chapterId: 'md:b', chapterNumber: '204', server: 'bx3' },
      { chapterId: 'md:c', chapterNumber: '124.5', server: 'bx3' },
      { chapterId: 'md:b', chapterNumber: '204', server: 'bx3' }
    ],
    { mangaId: 'al:1', server: 'bx3' }
  );
  assert.deepEqual(chs.map((c) => c.chapter), ['204', '124.5', '2.6']);
  assert.equal(chs[0].source, 'bx');
  assert.equal(chs[0].server, 'bx3');
});

test('page URLs: unwrap the image proxy, absolutise, and build the fallback proxy', () => {
  assert.equal(normalizeMangaPageUrl('/api/proxy/image?url=https%3A%2F%2F3asq.online%2F1.jpg'), 'https://3asq.online/1.jpg');
  assert.equal(normalizeMangaPageUrl('//cdn.example/2.jpg'), 'https://cdn.example/2.jpg');
  assert.equal(normalizeMangaPageUrl('javascript:alert(1)'), '');
  assert.equal(bxImageProxyUrl('https://3asq.online/1.jpg'), '/api/proxy/image?url=https%3A%2F%2F3asq.online%2F1.jpg');
});

test('chapters fall back from the library route to /api/manga/:id/chapters', async () => {
  await withFetch(
    (url) => {
      if (url.startsWith('/api/content/library/')) return { status: 404, body: { success: false } };
      if (url.startsWith('/api/manga/asq%3Akaoru/chapters?server=bx2')) {
        return {
          chapters: [{ chapterId: 'asq:kaoru:160', chapterNumber: '160', server: 'bx2' }],
          availableServers: [{ id: 'bx2', name: 'سيرفر BLACK X 2 (مانجا عربية)', labelEn: 'BLACK X 2 (AR Manga)' }],
          activeServer: 'bx2'
        };
      }
      return { status: 500, body: {} };
    },
    async (calls) => {
      const out = await fetchMobileMangaChapters({ bxId: 'asq:kaoru', bxServer: 'bx2' });
      assert.equal(out.chapters.length, 1);
      assert.equal(out.chapters[0].chapterId, 'asq:kaoru:160');
      assert.equal(out.activeServer, 'bx2');
      assert.deepEqual(out.availableServers.map((s) => s.id), ['bx2']);
      assert.ok(calls.every((c) => c.opts.credentials === 'omit'));
    }
  );
});

test('pages come back in page order as direct URLs', async () => {
  await withFetch(
    (url) => {
      assert.ok(url.startsWith('/api/manga/chapter/asq%3Akaoru%3A160/pages?server=bx2'));
      return {
        pages: [
          { pageNumber: 2, url: 'https://3asq.online/2.jpg' },
          { pageNumber: 1, directUrl: 'https://3asq.online/1.jpg', url: '/api/proxy/image?url=https%3A%2F%2F3asq.online%2F1.jpg' }
        ]
      };
    },
    async () => {
      const pages = await fetchMobileChapterPages({ chapterId: 'asq:kaoru:160', server: 'bx2' });
      assert.deepEqual(pages, ['https://3asq.online/1.jpg', 'https://3asq.online/2.jpg']);
    }
  );
});

test('library list = website library + AniList master index (deduped), search is not paged', async () => {
  await withFetch(
    (url) => {
      if (url.startsWith('/api/content/library?type=ALL&server=all&page=1')) {
        return { items: [{ id: 'solo-leveling', title_en: 'Solo Leveling', title_ar: 'سولو', type: 'MANHWA', source: 'BLACK X 1' }] };
      }
      if (url === 'https://graphql.anilist.co') {
        return {
          data: {
            Page: {
              media: [
                { id: 1, title: { english: 'Solo Leveling' }, countryOfOrigin: 'KR', coverImage: { large: 'c.jpg' } },
                { id: 2, title: { romaji: 'Kaoru Hana wa Rin to Saku' }, countryOfOrigin: 'JP', averageScore: 86, coverImage: { large: 'k.jpg' } }
              ]
            }
          }
        };
      }
      return { status: 404, body: {} };
    },
    async () => {
      const list = await fetchMobileMangaList({ server: 'all', page: 1 });
      assert.deepEqual(list.map((m) => m.objectID), ['bx:solo-leveling', 'bx:al:2']);
      assert.equal(list[1].bxServer, 'bx3');
      assert.equal(list[1].rate, '8.6');
      assert.deepEqual(await fetchMobileMangaList({ server: 'bx2', query: 'kaoru', page: 2 }), []);
      assert.deepEqual(await fetchMobileMangaList({ server: 'bx4', page: 1 }), []);
    }
  );
});

test('inside the APK a CORS/network failure is retried through the native HTTP bridge', async () => {
  const nativeCalls = [];
  globalThis.window = {
    location: { protocol: 'https:', hostname: 'localhost', port: '' },
    Capacitor: { isNativePlatform: () => true },
    BlackXNativeAuth: {
      httpRequestAsync(reqId, url, method, headerPipe, body) {
        nativeCalls.push({ url, method, headerPipe, body });
        setTimeout(() => globalThis.window.__onBlackXHttpResult(reqId, JSON.stringify({ animeTotal: 7003 })), 5);
      }
    }
  };
  try {
    const { bxApiBase: base, fetchAnimeCatalogTotal } = await import('../src/mobile/bxServers.js');
    assert.equal(base(), 'https://black-x-anime.me');
    await withFetch(
      () => {
        throw new TypeError('Failed to fetch');
      },
      async (calls) => {
        assert.equal(await fetchAnimeCatalogTotal(), 7003);
        assert.equal(calls[0].url, 'https://black-x-anime.me/api/stream/stats');
        assert.equal(nativeCalls.length, 1);
        assert.equal(nativeCalls[0].url, 'https://black-x-anime.me/api/stream/stats');
        assert.equal(nativeCalls[0].method, 'GET');
      }
    );
    // HTTP errors are real answers: no native retry.
    await withFetch(
      () => ({ status: 503, body: { error: 'down' } }),
      async () => {
        assert.equal(await fetchAnimeCatalogTotal(), null);
        assert.equal(nativeCalls.length, 1);
      }
    );
  } finally {
    delete globalThis.window;
  }
});
