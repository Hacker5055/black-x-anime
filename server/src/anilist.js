import { apiGet as cacheGet, apiSet as cacheSet, upsertAnime, getAnimeRow, parseAnimeRow } from './db.js';

const ANILIST_URL = 'https://graphql.anilist.co';

const MEDIA_FRAGMENT = `
  id
  type
  status
  format
  episodes
  duration
  title { romaji english native }
  description(asHtml: false)
  coverImage { extraLarge large color }
  bannerImage
  genres
  averageScore
  meanScore
  popularity
  season
  seasonYear
  nextAiringEpisode { episode airingAt }
  studios(isMain: true) { nodes { name } }
`;

/** Normalize an AniList media object into our flat shape + cache it. */
function normalizeMedia(m, extra = {}) {
  if (!m) return null;
  const flat = {
    id: m.id,
    title_romaji: m.title?.romaji || m.title?.english || 'Untitled',
    title_english: m.title?.english || m.title?.romaji || 'Untitled',
    title_arabic: extra.title_arabic ?? null,
    description: (m.description || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim(),
    cover_url: m.coverImage?.extraLarge || m.coverImage?.large || null,
    banner_url: m.bannerImage || null,
    color: m.coverImage?.color || '#8b5cf6',
    genres: m.genres || [],
    episodes: m.episodes ?? null,
    status: m.status ?? null,
    format: m.format ?? null,
    season: m.season ?? null,
    season_year: m.seasonYear ?? null,
    score: m.averageScore ?? null,
    popularity: m.popularity ?? null,
    next_episode: m.nextAiringEpisode?.episode ?? null,
    next_airing_at: m.nextAiringEpisode?.airingAt ?? null,
    trending: extra.trending ? 1 : 0,
    raw: m
  };
  upsertAnime(flat);
  return flat;
}

export function mediaToJson(flat) {
  if (!flat) return null;
  return parseAnimeRow({
    ...flat,
    title_romaji: flat.title_romaji,
    genres: JSON.stringify(flat.genres || [])
  });
}

let lastFetch = 0;
const MIN_INTERVAL = 400; // stay well under AniList rate limits

async function anilistQuery(query, variables = {}) {
  // gentle client-side throttle
  const wait = MIN_INTERVAL - (Date.now() - lastFetch);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetch = Date.now();

  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AniList HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  if (json.errors?.length) throw new Error(`AniList: ${json.errors[0].message}`);
  return json.data;
}

async function cachedQuery(cacheKey, ttl, query, variables, mapper) {
  const hit = cacheGet(cacheKey);
  if (hit) return hit;
  const data = await anilistQuery(query, variables);
  const mapped = mapper(data);
  cacheSet(cacheKey, mapped, ttl);
  return mapped;
}

/* ------------------------------ queries ------------------------------ */

export async function fetchTrending() {
  return cachedQuery(
    'anilist:trending',
    20 * 60 * 1000,
    `query ($page: Int) {
      Page(page: $page, perPage: 12) {
        media(sort: TRENDING_DESC, type: ANIME, isAdult: false) { ${MEDIA_FRAGMENT} }
      }
    }`,
    { page: 1 },
    (data) => data.Page.media.map((m) => mediaToJson(normalizeMedia(m, { trending: true })))
  );
}

export async function fetchSeason(season, seasonYear) {
  return cachedQuery(
    `anilist:season:${season}:${seasonYear}`,
    30 * 60 * 1000,
    `query ($season: MediaSeason, $year: Int) {
      Page(perPage: 16) {
        media(season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC, isAdult: false) { ${MEDIA_FRAGMENT} }
      }
    }`,
    { season, year: seasonYear },
    (data) => data.Page.media.map((m) => mediaToJson(normalizeMedia(m)))
  );
}

export async function fetchSchedule(weekStart, weekEnd) {
  return cachedQuery(
    `anilist:schedule:${weekStart}`,
    15 * 60 * 1000,
    `query ($start: Int, $end: Int) {
      Page(perPage: 50) {
        airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
          episode
          airingAt
          media { ${MEDIA_FRAGMENT} }
        }
      }
    }`,
    { start: weekStart, end: weekEnd },
    (data) =>
      data.Page.airingSchedules.map((s) => ({
        episode: s.episode,
        airingAt: s.airingAt,
        media: mediaToJson(normalizeMedia(s.media))
      }))
  );
}

export async function fetchAnime(id) {
  const cacheKey = `anilist:media:${id}`;
  return cachedQuery(
    cacheKey,
    60 * 60 * 1000,
    `query ($id: Int) { Media(id: $id, type: ANIME) { ${MEDIA_FRAGMENT} } }`,
    { id },
    (data) => mediaToJson(normalizeMedia(data.Media))
  );
}

export async function fetchAnimeRaw(id) {
  const data = await anilistQuery(
    `query ($id: Int) { Media(id: $id, type: ANIME) { ${MEDIA_FRAGMENT} } }`,
    { id }
  );
  return mediaToJson(normalizeMedia(data.Media));
}

export async function fetchSearch(q) {
  return cachedQuery(
    `anilist:search:${q.toLowerCase().trim()}`,
    30 * 60 * 1000,
    `query ($search: String) {
      Page(perPage: 12) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH, isAdult: false) { ${MEDIA_FRAGMENT} }
      }
    }`,
    { search: q },
    (data) => data.Page.media.map((m) => mediaToJson(normalizeMedia(m)))
  );
}

export async function fetchByIds(ids) {
  const unique = [...new Set(ids.map(Number).filter(Boolean))];
  const out = new Map();
  const missing = [];
  for (const id of unique) {
    const row = getAnimeRow(id);
    if (row && row.cached_at) out.set(id, parseAnimeRow(row));
    else missing.push(id);
  }
  // batch-fetch missing in chunks of 8 using aliases
  for (let i = 0; i < missing.length; i += 8) {
    const chunk = missing.slice(i, i + 8);
    const parts = chunk.map((id, idx) => `m${idx}: Media(id: ${id}, type: ANIME) { ${MEDIA_FRAGMENT} }`).join('\n');
    try {
      const data = await anilistQuery(`{ ${parts} }`);
      chunk.forEach((id, idx) => {
        const flat = normalizeMedia(data[`m${idx}`]);
        if (flat) out.set(id, mediaToJson(flat));
      });
    } catch (err) {
      console.error('[anilist] batch fetch failed:', err.message);
    }
  }
  return out;
}

/** Current season helper based on today's date (server-side). */
export function currentSeasonInfo(date = new Date()) {
  const month = date.getMonth() + 1;
  const season = month <= 3 ? 'WINTER' : month <= 6 ? 'SPRING' : month <= 9 ? 'SUMMER' : 'FALL';
  return { season, year: date.getFullYear() };
}
