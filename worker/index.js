import { handleAsNodeRequest } from 'cloudflare:node';
import { DurableObject } from 'cloudflare:workers';
import { createCloudflareSqliteAdapter } from './sqlite-adapter.js';

const NODE_SERVER_PORT = 8787;
const LEGACY_API_PATH = /^\/(?:search-anime|get-episodes|get-episode-dl|latest-episodes|fetch-seasonals|get-anime-info)(?:\/|$)/;

// Node's Workers HTTP bridge registers servers in an isolate-level port table.
// Durable Object instances can be reconstructed while that table survives, so
// calling app.listen() in every constructor causes EADDRINUSE on later requests.
// This promise ensures the Express server is registered only once per isolate.
let apiServerInitialization;

function ensureApiServer(storage) {
  if (!apiServerInitialization) {
    apiServerInitialization = (async () => {
      globalThis.__BLACKX_CLOUDFLARE_RUNTIME__ = true;
      globalThis.__BLACKX_DB_ADAPTER__ = createCloudflareSqliteAdapter(storage);

      // Import only after injecting the Durable Object database so the app's
      // schema and existing synchronous data-access helpers use Cloudflare DB.
      const { default: app } = await import('../server/src/index.js');
      const server = app.listen(NODE_SERVER_PORT);

      // Wait for the port registration to complete before routing requests.
      await new Promise((resolve, reject) => {
        if (server.listening) {
          resolve();
          return;
        }
        server.once('listening', resolve);
        server.once('error', reject);
      });

      return server;
    })().catch((error) => {
      // Allow a later request to retry initialization if registration failed.
      apiServerInitialization = undefined;
      throw error;
    });
  }

  return apiServerInitialization;
}

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
    this.ready = ctx.blockConcurrencyWhile(() => ensureApiServer(ctx.storage));
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
