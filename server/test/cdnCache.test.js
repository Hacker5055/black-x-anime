import test from 'node:test';
import assert from 'node:assert/strict';
import { addVaryOrigin, cdnCacheMiddleware } from '../src/lib/cdnCache.js';

function fakeRes() {
  const headers = {};
  const res = {
    statusCode: 200,
    getHeader: (k) => headers[k.toLowerCase()],
    setHeader: (k, v) => {
      headers[k.toLowerCase()] = v;
    },
    writeHead(status) {
      this.statusCode = status;
      this.written = { ...headers };
      return this;
    },
    json(body) {
      this.body = body;
      return this.writeHead(this.statusCode);
    }
  };
  return { res, headers };
}

test('addVaryOrigin appends Origin once and respects Vary: *', () => {
  const a = fakeRes();
  addVaryOrigin(a.res);
  assert.equal(a.headers.vary, 'Origin');
  addVaryOrigin(a.res);
  assert.equal(a.headers.vary, 'Origin');
  const b = fakeRes();
  b.res.setHeader('Vary', 'Accept-Encoding');
  addVaryOrigin(b.res);
  assert.equal(b.headers.vary, 'Accept-Encoding, Origin');
  const c = fakeRes();
  c.res.setHeader('Vary', '*');
  addVaryOrigin(c.res);
  assert.equal(c.headers.vary, '*');
});

test('cacheable public responses vary on Origin (website vs APK CORS headers)', () => {
  const { res } = fakeRes();
  cdnCacheMiddleware({ method: 'GET', path: '/api/content/library' }, res, () => {});
  res.json({ items: [{ id: 'solo-leveling' }] });
  assert.match(res.written['cache-control'], /s-maxage=600/);
  assert.equal(res.written.vary, 'Origin');
});

test('non-cacheable responses stay no-store without a Vary entry', () => {
  const { res } = fakeRes();
  cdnCacheMiddleware({ method: 'GET', path: '/api/content/library' }, res, () => {});
  res.json({ items: [] });
  assert.equal(res.written['cache-control'], 'no-store');
  assert.equal(res.written.vary, undefined);
});
