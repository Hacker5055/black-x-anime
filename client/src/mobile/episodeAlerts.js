/**
 * New-episode alerts for followed titles only (favorites + "watching"/"planned").
 * Each check reads the show's episode list from the website API (CDN-cached) and
 * notifies when the newest episode number grew since the last check. The first
 * check of a title only records a baseline. Runs while the app is open.
 */
import { animeSlugOf } from './resumeStore.js';

const KEY = 'bx_mob_followed_eps_v16';
const LAST_RUN_KEY = 'bx_mob_followed_eps_run_v16';

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

export function lastAlertRun() {
  return Number(localStorage.getItem(LAST_RUN_KEY) || 0);
}

export async function checkFollowedTitles({ titles, fetchEpisodes, notify, limit = 20, gapMs = 1200, signal }) {
  const known = load();
  let changed = false;
  let notified = 0;
  try {
    localStorage.setItem(LAST_RUN_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  const seen = new Set();
  for (const title of titles) {
    if (signal?.aborted || seen.size >= limit) break;
    const slug = animeSlugOf(title);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    let episodes = [];
    try {
      episodes = await fetchEpisodes(title);
    } catch {
      continue;
    }
    const latest = Math.max(0, ...(Array.isArray(episodes) ? episodes : []).map((e) => Number(e?.number) || 0));
    if (!latest) continue;
    const prev = Number(known[slug]?.last) || 0;
    if (prev && latest > prev) {
      notify(title, latest);
      notified += 1;
    }
    if (prev !== latest) {
      known[slug] = { last: latest, at: Date.now() };
      changed = true;
    }
    if (gapMs) await new Promise((r) => setTimeout(r, gapMs));
  }
  if (changed) {
    try {
      localStorage.setItem(KEY, JSON.stringify(known));
    } catch {
      /* ignore */
    }
  }
  return notified;
}
