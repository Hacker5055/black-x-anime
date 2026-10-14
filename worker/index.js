import { handleAsNodeRequest } from 'cloudflare:node';
import { DurableObject } from 'cloudflare:workers';
import { createCloudflareSqliteAdapter } from './sqlite-adapter.js';

const NODE_SERVER_PORT = 8787;
const LEGACY_API_PATH = /^\/(?:search-anime|get-episodes|get-episode-dl|latest-episodes|fetch-seasonals|get-anime-info)(?:\/|$)/;

function isApiRequest(pathname) {
  return pathname.startsWith('/api/') || LEGACY_API_PATH.test(pathname);
}

/**
 * The existing BLACK X Express API relies on synchronous SQLite calls. A
 * singleton SQLite-backed Durable Object provides persistent SQLite storage
 * on Cloudflare and preserves that API shape while requests are migrated.
 */
export class BlackXApiState extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ready = ctx.blockConcurrencyWhile(async () => {
      globalThis.__BLACKX_CLOUDFLARE_RUNTIME__ = true;
      globalThis.__BLACKX_DB_ADAPTER__ = createCloudflareSqliteAdapter(ctx.storage);

      // Import only after injecting the Durable Object database so the app's
      // schema and existing synchronous data-access helpers use Cloudflare DB.
      const { default: app } = await import('../server/src/index.js');
      app.listen(NODE_SERVER_PORT);
    });
  }

  async fetch(request) {
    await this.ready;
    return handleAsNodeRequest(NODE_SERVER_PORT, request);
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (!isApiRequest(pathname)) {
      return env.ASSETS.fetch(request);
    }

    const id = env.BLACKX_API.idFromName('black-x-primary-api');
    return env.BLACKX_API.get(id).fetch(request);
  }
};
