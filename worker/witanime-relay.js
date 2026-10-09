/**
 * BLACK X — witanime relay worker (Cloudflare Workers, free tier)
 * ----------------------------------------------------------------
 * Why: witanime.site sits behind Cloudflare Bot Fight Mode which serves a
 * "Just a moment…" JS challenge to datacenter IPs (SnapDeploy, Railway, …).
 * Fetches made from a Cloudflare Worker come from Cloudflare's own network
 * and pass without a challenge. This worker is a transparent pipe:
 * it forwards method/headers/body and returns the upstream status,
 * Location and Set-Cookie untouched — so the app's scraper works as-is.
 *
 * Deploy (3 minutes, no credit card):
 *   1. dash.cloudflare.com → Workers & Pages → Create → Worker
 *   2. name it e.g. "blackx-relay" → Edit code → paste this WHOLE file → Deploy
 *   3. Your relay URL: https://blackx-relay.<your-subdomain>.workers.dev
 *   4. In SnapDeploy → black-x-anime → Environment → add
 *        WITA_RELAY=https://blackx-relay.<your-subdomain>.workers.dev
 *      → Save (it redeploys) — done.
 */
export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS preflight (the SPA talks to its own API, but be nice to tools)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,HEAD,OPTIONS',
          'access-control-allow-headers': '*',
          'access-control-expose-headers': '*'
        }
      });
    }

    const target = url.searchParams.get('url');
    if (!target) return new Response('missing ?url=', { status: 400 });

    let dest;
    try {
      dest = new URL(target);
    } catch {
      return new Response('bad url', { status: 400 });
    }
    // only the streaming source — this relay is not an open proxy
    if (dest.hostname !== 'witanime.site' && !dest.hostname.endsWith('.witanime.site')) {
      return new Response('host not allowed', { status: 403 });
    }

    // forward the scraper's headers verbatim (UA matters to their WAF)
    const headers = new Headers();
    const pass = ['user-agent', 'accept', 'accept-language', 'x-csrf-token', 'cookie', 'content-type', 'x-requested-with'];
    for (const name of pass) {
      const v = request.headers.get(name);
      if (v) headers.set(name, v);
    }

    const init = {
      method: request.method,
      headers,
      redirect: 'manual' // the app needs to SEE 302 Location headers
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = await request.arrayBuffer();
    }

    const res = await fetch(dest.href, init);

    // relay the response untouched (incl. Location + Set-Cookie for the session jar)
    const out = new Headers();
    for (const [k, v] of res.headers) out.set(k, v);
    out.set('access-control-allow-origin', '*');
    out.set('access-control-expose-headers', '*');
    out.set('x-relay', 'blackx');

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: out
    });
  }
};
