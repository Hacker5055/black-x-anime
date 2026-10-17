/**
 * BLACK X members' votes on the rankings page (/api/anime/rankings).
 *
 * Up to 2026-10-17 the votes lived in SQLite (`community_ratings`), which on Vercel is a file in
 * the function's /tmp: every instance had its own copy, a redeploy or a cold start emptied it,
 * and a vote without an account was a new row every time (unlimited votes). Now:
 *
 *  - one Firestore document, `settings/ranking_votes` (`json` = { v: 1, titles: { <AniList id>:
 *    { <voter>: score } } }), written by the server only with an updateTime precondition
 *    (settingsStore.updateSettingsDoc), so two votes at the same moment both count;
 *  - a vote needs an account; the voter is a one-way hash of the account (no name or e-mail in
 *    the document) and voting again replaces that account's vote;
 *  - only titles on the rankings list can be voted on (the document cannot be filled with
 *    random ids), with a cap per title;
 *  - reads are cached in memory for a minute (and the rankings response on the CDN).
 *
 * Not in firestore.rules.phase2's social documents, so once phase 2 is published only the server
 * (service account) can read or write it.
 */
import crypto from 'node:crypto';
import { readSettingsDoc, updateSettingsDoc } from './settingsStore.js';

export const RANKING_VOTES_DOC = 'ranking_votes';
export const MAX_VOTERS_PER_TITLE = 5000;
export const MAX_TITLES = 300;
const CACHE_MS = 60 * 1000;

let cache = { at: 0, data: null };

/** Test hook. */
export function __resetRankingVotesCacheForTests() {
  cache = { at: 0, data: null };
}

/** A stable, non-reversible id for an account identity like `u:name` or `e:mail@x`. */
export function voterKey(identity) {
  const id = String(identity || '').trim().toLowerCase();
  if (!id) return '';
  return `v${crypto.createHash('sha256').update(`bx-rank:${id}`).digest('base64url').slice(0, 16)}`;
}

/** A score as stored: 1–10, one decimal. NaN for anything else. */
export function cleanScore(value) {
  const n = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(n) || n < 1 || n > 10) return Number.NaN;
  return Math.round(n * 10) / 10;
}

/** The stored document, keeping only well-formed votes. */
export function cleanVotesDoc(raw) {
  const titles = {};
  const src = raw && typeof raw === 'object' && raw.titles && typeof raw.titles === 'object' ? raw.titles : {};
  for (const [id, voters] of Object.entries(src)) {
    if (!/^\d{1,9}$/.test(id) || !voters || typeof voters !== 'object') continue;
    const clean = {};
    for (const [voter, score] of Object.entries(voters)) {
      const s = cleanScore(score);
      if (/^v[A-Za-z0-9_-]{8,40}$/.test(voter) && Number.isFinite(s)) clean[voter] = s;
    }
    if (Object.keys(clean).length) titles[id] = clean;
  }
  return { v: 1, titles, updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : '' };
}

/** { votes, avgScore } for one title: the real count and average (null when nobody voted). */
export function statsFor(doc, animeId) {
  const voters = doc?.titles?.[String(animeId)];
  const scores = voters ? Object.values(voters).filter((s) => Number.isFinite(s)) : [];
  if (!scores.length) return { votes: 0, avgScore: null };
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { votes: scores.length, avgScore: Number(avg.toFixed(1)) };
}

/** All votes (cached for a minute). Throws when Firestore cannot be read. */
export async function loadRankingVotes({ fresh = false } = {}) {
  if (!fresh && cache.data && Date.now() - cache.at < CACHE_MS) return cache.data;
  const doc = await readSettingsDoc(RANKING_VOTES_DOC);
  cache = { at: Date.now(), data: cleanVotesDoc(doc.exists ? doc.data : null) };
  return cache.data;
}

/**
 * Save `voter`'s score for `animeId` (replacing their earlier one). Resolves the title's new
 * stats; throws `title_full` / `too_many_titles` when a cap is reached, or the store's error.
 */
export async function castRankingVote(animeId, voter, score) {
  const id = String(animeId);
  const s = cleanScore(score);
  if (!/^\d{1,9}$/.test(id) || !voter || !Number.isFinite(s)) throw new Error('invalid_vote');
  const result = await updateSettingsDoc(
    RANKING_VOTES_DOC,
    (current) => {
      const doc = cleanVotesDoc(current);
      const voters = doc.titles[id] || {};
      if (voters[voter] === s) return undefined; // same vote again: nothing to write
      if (!(voter in voters) && Object.keys(voters).length >= MAX_VOTERS_PER_TITLE) throw new Error('title_full');
      if (!doc.titles[id] && Object.keys(doc.titles).length >= MAX_TITLES) throw new Error('too_many_titles');
      doc.titles[id] = { ...voters, [voter]: s };
      doc.updatedAt = new Date().toISOString();
      return doc;
    },
    { extraFields: (next) => ({ updatedAt: next.updatedAt }) }
  );
  const doc = cleanVotesDoc(result.data);
  cache = { at: Date.now(), data: doc };
  return statsFor(doc, id);
}
