import { CDN_CACHE_PROFILES, findPublicCacheRoute } from '../../../shared/publicCacheRoutes.js';

/**
 * Vercel CDN caching for the public routes listed in shared/publicCacheRoutes.js.
 *
 * Vercel caches a Function response only when it carries `s-maxage`, and then
 * serves it to every visitor, so the route list must stay user-independent.
 * This middleware also refuses to cache anything that looks like a failure:
 *  - only 200/304 responses are marked cacheable;
 *  - JSON bodies that report an error or contain only empty lists are sent
 *    with `no-store` (upstream outages usually answer 200 + []), so a
 *    temporary outage is never frozen into the CDN for everyone;
 *  - responses that set a cookie are never cached.
 * `stale-if-error` lets the CDN keep serving the last good copy while an
 * upstream source is down.
 */

const LIST_KEYS = ['items', 'results', 'anime', 'episodes', 'data', 'media', 'list'];

export function buildCacheControl(profile) {
  const parts = ['public', `max-age=${profile.browserMaxAge}`, `s-maxage=${profile.sMaxAge}`];
  if (profile.staleWhileRevalidate) parts.push(`stale-while-revalidate=${profile.staleWhileRevalidate}`);
  if (profile.staleIfError) parts.push(`stale-if-error=${profile.staleIfError}`);
  return parts.join(', ');
}

/** True when a JSON body is a real result worth sharing from the CDN. */
export function isCacheablePayload(body) {
  if (body === null || body === undefined) return false;
  if (Array.isArray(body)) return body.length > 0;
  if (typeof body !== 'object') return true;
  if (body.success === false || body.error) return false;
  const lists = LIST_KEYS.filter((key) => Array.isArray(body[key]));
  if (lists.length === 0) return true;
  return lists.some((key) => body[key].length > 0);
}

export function cdnCacheMiddleware(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const route = findPublicCacheRoute(req.path);
  if (!route) return next();

  const cacheControl = buildCacheControl(CDN_CACHE_PROFILES[route.profile]);
  let payloadIsCacheable = null;

  const originalJson = res.json;
  res.json = function cdnCacheJson(body) {
    if (payloadIsCacheable === null) payloadIsCacheable = isCacheablePayload(body);
    return originalJson.call(this, body);
  };

  // Decide at the last moment, once the final status code is known. Node calls
  // writeHead implicitly for res.send/res.end/stream.pipe as well.
  const originalWriteHead = res.writeHead;
  res.writeHead = function cdnCacheWriteHead(statusCode, ...rest) {
    const status = Number(statusCode) || res.statusCode;
    const cacheable =
      (status === 200 || status === 304) &&
      payloadIsCacheable !== false &&
      !res.getHeader('set-cookie');
    res.setHeader('Cache-Control', cacheable ? cacheControl : 'no-store');
    return originalWriteHead.call(this, statusCode, ...rest);
  };

  return next();
}
