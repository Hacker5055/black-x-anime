/**
 * Unified Cache Service
 * Supports Redis with seamless in-memory Map fallback.
 * Guarantees zero runtime crashes if Redis server is unreachable or not configured.
 */

class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlSeconds = 7200) {
    this.store.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000
    });
  }

  del(key) {
    this.store.delete(key);
  }

  flush() {
    this.store.clear();
  }
}

class CacheService {
  constructor() {
    this.fallback = new MemoryCache();
    this.redisClient = null;
    this.isRedisReady = false;

    // Auto-detect REDIS_URL if provided in environment
    if (process.env.REDIS_URL) {
      this.initRedis(process.env.REDIS_URL);
    }
  }

  async initRedis(url) {
    try {
      // Dynamic import to prevent crash if ioredis isn't installed
      const { default: Redis } = await import('ioredis');
      this.redisClient = new Redis(url, {
        maxRetriesPerRequest: 2,
        connectTimeout: 3000,
        lazyConnect: true
      });

      await this.redisClient.connect();
      this.isRedisReady = true;
      console.log('⚡ [Redis] Connected successfully to Redis Cache');
    } catch (err) {
      console.warn('⚠️ [Redis] Connection failed, operating in high-speed in-memory cache mode:', err.message);
      this.isRedisReady = false;
    }
  }

  /**
   * Get value from cache
   * @param {string} key
   * @returns {Promise<any>}
   */
  async get(key) {
    if (this.isRedisReady && this.redisClient) {
      try {
        const raw = await this.redisClient.get(key);
        return raw ? JSON.parse(raw) : null;
      } catch (err) {
        console.warn(`[Redis Get Error: ${key}]`, err.message);
      }
    }
    return this.fallback.get(key);
  }

  /**
   * Set value in cache
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds Default: 7200 (2 hours)
   */
  async set(key, value, ttlSeconds = 7200) {
    if (this.isRedisReady && this.redisClient) {
      try {
        await this.redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      } catch (err) {
        console.warn(`[Redis Set Error: ${key}]`, err.message);
      }
    }
    this.fallback.set(key, value, ttlSeconds);
  }

  /**
   * Helper: Cache-Aside pattern (Fetch or Compute)
   */
  async wrap(key, fetcher, ttlSeconds = 7200) {
    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
    const fresh = await fetcher();
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }
}

export const cache = new CacheService();
