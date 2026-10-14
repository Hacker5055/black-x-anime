export default class BetterSqlite3UnavailableInWorkers {
  constructor() {
    throw new Error('better-sqlite3 native bindings are not available in Cloudflare Workers; use the Durable Object SQLite adapter.');
  }
}
