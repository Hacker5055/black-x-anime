import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(join(dataDir, 'blackx.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
-- ===== legacy prediction-engine tables (removed in streaming refactor) =====
DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS predictions;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#22d3ee',
  bio TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===== library: favorites (watchlist) =====
CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title_en TEXT,
  title_ar TEXT,
  poster TEXT,
  banner TEXT,
  episodes INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, slug)
);

-- ===== library: per-episode progress (continue watching) =====
CREATE TABLE IF NOT EXISTS progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  episode INTEGER NOT NULL,
  position REAL NOT NULL DEFAULT 0,
  duration REAL NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  title_en TEXT,
  title_ar TEXT,
  poster TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, slug, episode)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

-- ===== generic API cache (AniList + witanime responses) =====
CREATE TABLE IF NOT EXISTS api_cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

-- ===== resolved streaming sources cache (per episode) =====
CREATE TABLE IF NOT EXISTS stream_cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

-- ===== AniList metadata cache (discovery/trending) =====
CREATE TABLE IF NOT EXISTS anime_cache (
  id INTEGER PRIMARY KEY,
  title_romaji TEXT,
  title_english TEXT,
  title_arabic TEXT,
  description TEXT,
  cover_url TEXT,
  banner_url TEXT,
  color TEXT,
  genres TEXT,
  episodes INTEGER,
  status TEXT,
  format TEXT,
  season TEXT,
  season_year INTEGER,
  score INTEGER,
  popularity INTEGER,
  next_episode INTEGER,
  next_airing_at INTEGER,
  trending INTEGER NOT NULL DEFAULT 0,
  raw TEXT,
  cached_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

/* ---------------- cache helpers ---------------- */
function cacheGet(table, key) {
  const row = db.prepare(`SELECT value, expires_at FROM ${table} WHERE key = ?`).get(key);
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare(`DELETE FROM ${table} WHERE key = ?`).run(key);
    return null;
  }
  try { return JSON.parse(row.value); } catch { return null; }
}

function cacheSet(table, key, value, ttlMs = 30 * 60 * 1000) {
  db.prepare(
    `INSERT INTO ${table} (key, value, expires_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at`
  ).run(key, JSON.stringify(value), Date.now() + ttlMs);
}

export const apiGet = (key) => cacheGet('api_cache', key);
export const apiSet = (key, value, ttl) => cacheSet('api_cache', key, value, ttl);
export const streamGet = (key) => cacheGet('stream_cache', key);
export const streamSet = (key, value, ttl) => cacheSet('stream_cache', key, value, ttl);

/* ---------------- anime_cache upsert (AniList discovery) ---------------- */
export function upsertAnime(media) {
  if (!media || !media.id) return;
  db.prepare(`
    INSERT INTO anime_cache
      (id, title_romaji, title_english, title_arabic, description, cover_url, banner_url, color,
       genres, episodes, status, format, season, season_year, score, popularity,
       next_episode, next_airing_at, trending, raw, cached_at)
    VALUES
      (@id, @title_romaji, @title_english, @title_arabic, @description, @cover_url, @banner_url, @color,
       @genres, @episodes, @status, @format, @season, @season_year, @score, @popularity,
       @next_episode, @next_airing_at, @trending, @raw, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      title_romaji = excluded.title_romaji,
      title_english = excluded.title_english,
      title_arabic = COALESCE(excluded.title_arabic, anime_cache.title_arabic),
      description = excluded.description,
      cover_url = excluded.cover_url,
      banner_url = excluded.banner_url,
      color = excluded.color,
      genres = excluded.genres,
      episodes = excluded.episodes,
      status = excluded.status,
      format = excluded.format,
      season = excluded.season,
      season_year = excluded.season_year,
      score = excluded.score,
      popularity = excluded.popularity,
      next_episode = excluded.next_episode,
      next_airing_at = excluded.next_airing_at,
      trending = excluded.trending,
      raw = excluded.raw,
      cached_at = datetime('now')
  `).run({
    id: media.id,
    title_romaji: media.title_romaji ?? media.titleRomaji ?? null,
    title_english: media.title_english ?? media.titleEnglish ?? null,
    title_arabic: media.title_arabic ?? media.titleArabic ?? null,
    description: media.description ?? null,
    cover_url: media.cover_url ?? media.coverUrl ?? null,
    banner_url: media.banner_url ?? media.bannerUrl ?? null,
    color: media.color || '#8b5cf6',
    genres: JSON.stringify(media.genres || []),
    episodes: media.episodes ?? null,
    status: media.status ?? null,
    format: media.format ?? null,
    season: media.season ?? null,
    season_year: media.season_year ?? media.seasonYear ?? null,
    score: media.score ?? null,
    popularity: media.popularity ?? null,
    next_episode: media.next_episode ?? media.nextEpisode ?? null,
    next_airing_at: media.next_airing_at ?? media.nextAiringAt ?? null,
    trending: media.trending ? 1 : 0,
    raw: media.raw ? JSON.stringify(media.raw) : null
  });
}

export function getAnimeRow(id) {
  return db.prepare('SELECT * FROM anime_cache WHERE id = ?').get(id);
}

export function parseAnimeRow(row) {
  if (!row) return null;
  let genres = [];
  try { genres = JSON.parse(row.genres || '[]'); } catch { /* noop */ }
  return {
    id: row.id,
    titleRomaji: row.title_romaji,
    titleEnglish: row.title_english,
    titleArabic: row.title_arabic,
    description: row.description,
    coverUrl: row.cover_url,
    bannerUrl: row.banner_url,
    color: row.color,
    genres,
    episodes: row.episodes,
    status: row.status,
    format: row.format,
    season: row.season,
    seasonYear: row.season_year,
    score: row.score,
    popularity: row.popularity,
    nextEpisode: row.next_episode,
    nextAiringAt: row.next_airing_at
  };
}
