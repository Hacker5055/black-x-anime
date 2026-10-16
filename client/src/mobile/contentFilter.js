/**
 * Genres hidden from the whole APK (owner's decision, 2026-10-16): Ecchi, Harem and Isekai.
 *
 * Titles carrying any of them never show up in the app: home rows, search and its filters,
 * schedule, recommendations, similar titles, typed search, manga lists, saved lists (hidden on
 * screen only; the account data synced with the website is never edited), new-episode alerts,
 * and the details pages refuse to open them.
 *
 * - BLACK X 1 (the Algolia anime index) is filtered at the source with negative facet filters,
 *   so totals and pagination stay real (2026-10-16: 7,009 -> 6,034 titles).
 * - Other servers are filtered by the genre names they report. Servers that send placeholder
 *   genres (BLACK X 2's fixed list, some manga sources) cannot be classified.
 * - AniList (the manga master index) excludes them server-side (genre_not_in / tag_not_in).
 *
 * To hide another genre: add its exact Algolia `tags` value below (check the real spelling with
 * `facets=tags`), its spellings to BLOCKED_NAMES, and its AniList genre/tag if it has one.
 */

/** Exact `tags` facet values in the Algolia index (`facets=tags`, 2026-10-16:
 *  ايتشي 515, حريم 363, عالم مختلف 347 — 975 titles in all). */
export const ALGOLIA_BLOCKED_TAGS = Object.freeze(['ايتشي', 'حريم', 'عالم مختلف']);

/** AniList: Ecchi is a genre (Hentai is already off through isAdult:false); Isekai and the
 *  harem kinds are tags. */
export const ANILIST_GENRE_NOT_IN = Object.freeze(['Ecchi', 'Hentai']);
export const ANILIST_TAG_NOT_IN = Object.freeze(['Isekai', 'Male Harem', 'Female Harem', 'Mixed Gender Harem']);

/** Arabic/Latin folding so "إيتشي", "ايتشي" and "Ecchi" compare the same way. */
export function normalizeGenre(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // harakat, superscript alef, tatweel
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // آ أ إ ٱ -> ا
    .replace(/\u0649/g, '\u064A') // ى -> ي
    .replace(/\u0629/g, '\u0647') // ة -> ه
    .toLowerCase()
    .replace(/[\s_\-\u2013\u2014/\u00B7\u2022.,]+/g, ' ')
    .trim();
}

const BLOCKED_NAMES = new Set(
  [
    // Ecchi
    'ايتشي',
    'إيتشي',
    'اتشي',
    'إتشي',
    'ecchi',
    'etchi',
    // Harem
    'حريم',
    'حريم عكسي',
    'هاريم',
    'harem',
    'reverse harem',
    'male harem',
    'female harem',
    'mixed gender harem',
    // Isekai
    'عالم مختلف',
    'عالم آخر',
    'إيسيكاي',
    'ايسيكاي',
    'إسيكاي',
    'ايسكاي',
    'isekai'
  ].map(normalizeGenre)
);
// Longer names that contain a hidden genre as a whole word ("Reverse Harem", "حريم عكسي").
// Arabic is matched on word boundaries so a name such as "إيتشيغو" never counts as Ecchi.
const BLOCKED_LATIN_WORDS = /\b(?:ecchi|harem|isekai)\b/;
const BLOCKED_ARABIC_WORDS = ['ايتشي', 'اتشي', 'حريم', 'ايسيكاي', 'اسيكاي', 'عالم مختلف', 'عالم اخر'];

/** True for a genre/tag name that the app hides (any spelling). */
export function isBlockedGenre(value) {
  const name = normalizeGenre(value);
  if (name.length < 2) return false;
  if (BLOCKED_NAMES.has(name) || BLOCKED_LATIN_WORDS.test(name)) return true;
  const padded = ` ${name} `;
  return BLOCKED_ARABIC_WORDS.some((word) => padded.includes(` ${word} `));
}

/** True when any of the given genre/tag lists contains a hidden genre. */
export function hasBlockedGenre(...lists) {
  return lists.some((list) => Array.isArray(list) && list.some(isBlockedGenre));
}

/** Genre pills without the hidden ones. */
export function visibleGenres(list) {
  return Array.isArray(list) ? list.filter((g) => !isBlockedGenre(g)) : [];
}

/** Adds the exclusions to an Algolia query body; they AND with the query's own facet filters. */
export function withAlgoliaExclusions(payload = {}) {
  const own = payload.facetFilters;
  const base = Array.isArray(own) ? own : own ? [own] : [];
  return { ...payload, facetFilters: [...base, ...ALGOLIA_BLOCKED_TAGS.map((tag) => `tags:-${tag}`)] };
}

/* ---- Hidden BLACK X 1 ids: saved entries (favorites, history, follows) carry no genres ---- */

const IDS_KEY = 'bx_mob_hidden_ids_v1';
const IDS_TTL_MS = 24 * 60 * 60 * 1000;
let hiddenIds = new Set();
let hiddenIdsAt = 0;

try {
  if (typeof localStorage !== 'undefined') {
    const saved = JSON.parse(localStorage.getItem(IDS_KEY) || 'null');
    if (saved && Array.isArray(saved.ids)) {
      hiddenIds = new Set(saved.ids.map(String));
      hiddenIdsAt = Number(saved.at) || 0;
    }
  }
} catch {
  /* first run, private storage or not a browser */
}

/** The current hidden-id set (replaced, never mutated, when refreshed). */
export function getHiddenIds() {
  return hiddenIds;
}

/**
 * Loads the ids of every hidden BLACK X 1 title (one query per tag, each well under Algolia's
 * 1,000-hit page cap) at most once a day. `rawQuery(index, body)` must be the Algolia query
 * WITHOUT the exclusions. Resolves to the new Set, or null when nothing changed.
 */
export async function refreshHiddenIds(rawQuery, { force = false } = {}) {
  if (!force && hiddenIdsAt && Date.now() - hiddenIdsAt < IDS_TTL_MS) return null;
  const results = await Promise.all(
    ALGOLIA_BLOCKED_TAGS.map((tag) =>
      rawQuery('series_fav_count_desc', {
        query: '',
        facetFilters: [[`tags:${tag}`]],
        hitsPerPage: 1000,
        attributesToRetrieve: ['objectID'],
        attributesToHighlight: [],
        attributesToSnippet: [],
        analytics: false
      })
    )
  );
  const ids = new Set();
  for (const res of results) for (const hit of res?.hits || []) if (hit?.objectID) ids.add(String(hit.objectID));
  if (!ids.size) return null;
  hiddenIds = ids;
  hiddenIdsAt = Date.now();
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(IDS_KEY, JSON.stringify({ at: hiddenIdsAt, ids: [...ids] }));
  } catch {
    /* storage full: keep the in-memory set */
  }
  return ids;
}

/** Anime card, saved entry or website show object. */
export function isHiddenAnime(item, ids = hiddenIds) {
  if (!item || typeof item !== 'object') return false;
  if (hasBlockedGenre(item.tags, item.tagsAr, item.genres)) return true;
  return item.objectID != null && ids.has(String(item.objectID));
}

/** Manga card or saved manga entry (classified by the genres its server reports). */
export function isHiddenManga(item) {
  return Boolean(item && typeof item === 'object' && hasBlockedGenre(item.genres, item.tags));
}
