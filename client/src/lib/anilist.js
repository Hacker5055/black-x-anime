/**
 * Browser-side AniList GraphQL — the static (GitHub Pages) build's catalog.
 * Same media fragment & camelized shape as server/src/anilist.js so the UI
 * is identical in both modes. AniList allows cross-origin fetches.
 */

const API = 'https://graphql.anilist.co';

const MEDIA_FRAGMENT = `
  id
  description(asHtml: false)
  format
  status
  episodes
  season
  seasonYear
  averageScore
  popularity
  title { romaji english native }
  coverImage { extraLarge large color }
  bannerImage
  genres
  nextAiringEpisode { episode airingAt }
`;

async function gql(query, variables) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) {
    const e = new Error(`AniList HTTP ${res.status}`);
    e.code = 'upstream';
    e.status = 502;
    throw e;
  }
  const json = await res.json();
  if (json.errors) {
    const e = new Error(json.errors[0]?.message || 'AniList error');
    e.code = 'upstream';
    e.status = 502;
    throw e;
  }
  return json.data;
}

function toPublic(m) {
  return {
    id: m.id,
    titleRomaji: m.title?.romaji || m.title?.english || 'Untitled',
    titleEnglish: m.title?.english || m.title?.romaji || 'Untitled',
    titleArabic: null,
    description: (m.description || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim(),
    coverUrl: m.coverImage?.extraLarge || m.coverImage?.large || null,
    bannerUrl: m.bannerImage || null,
    color: m.coverImage?.color || '#8b5cf6',
    genres: m.genres || [],
    episodes: m.episodes ?? null,
    status: m.status ?? null,
    format: m.format ?? null,
    season: m.season ?? null,
    seasonYear: m.seasonYear ?? null,
    score: m.averageScore ?? null,
    popularity: m.popularity ?? null,
    nextEpisode: m.nextAiringEpisode?.episode ?? null,
    nextAiringAt: m.nextAiringEpisode?.airingAt ?? null
  };
}

/** GET /api/anime/trending shape */
export async function anilistTrending() {
  const data = await gql(
    `query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC, isAdult: false) { ${MEDIA_FRAGMENT} }
      }
    }`,
    { page: 1, perPage: 12 }
  );
  return data.Page.media.map(toPublic);
}

/** GET /api/anime/search shape (also the worker-less /api/stream/search fallback) */
export async function anilistSearch(q) {
  const data = await gql(
    `query ($search: String) {
      Page(page: 1, perPage: 20) {
        media(type: ANIME, search: $search, sort: SEARCH_MATCH, isAdult: false) { ${MEDIA_FRAGMENT} }
      }
    }`,
    { search: q }
  );
  return data.Page.media.map(toPublic);
}

/** Worker-less /api/stream/search fallback — wita-search item shape */
export async function anilistSearchItems(q) {
  const items = await anilistSearch(q);
  return items.map((a) => ({
    slug: `al-${a.id}`,
    title: a.titleEnglish || a.titleRomaji,
    poster: a.coverUrl
  }));
}

/**
 * Worker-less /api/stream/show/:slug fallback — show shape identical to
 * witanime.js fetchShow(). Handles al-<id> slugs and the known demo slugs.
 */
export async function anilistShowFallback(slug, fallbackShows) {
  const demo = fallbackShows && fallbackShows[slug];
  const m = /^al-(\d+)$/.exec(slug);
  if (m) {
    const data = await gql(
      `query ($id: Int) { Media(id: $id, type: ANIME) { ${MEDIA_FRAGMENT} } }`,
      { id: Number(m[1]) }
    );
    const a = toPublic(data.Media);
    const count = a.episodes ?? 0;
    return {
      show: {
        slug,
        kind: 'anime',
        titleEn: a.titleEnglish || a.titleRomaji,
        titleAr: null,
        description: a.description,
        poster: a.coverUrl,
        banner: a.bannerUrl || a.coverUrl,
        episodeCount: count,
        episodes: Array.from({ length: count }, (_, i) => ({ episode: i + 1, url: `/watch/${slug}/${i + 1}` }))
      }
    };
  }
  if (demo) {
    const count = demo.episodes ?? 1;
    return {
      show: {
        slug,
        kind: 'anime',
        titleEn: demo.titleEn,
        titleAr: demo.titleAr,
        description: '',
        poster: demo.poster,
        banner: null,
        episodeCount: count,
        episodes: Array.from({ length: Math.min(count, 24) }, (_, i) => ({ episode: i + 1, url: `/watch/${slug}/${i + 1}` }))
      }
    };
  }
  const e = new Error('Show not found');
  e.code = 'not_found';
  e.status = 404;
  throw e;
}
