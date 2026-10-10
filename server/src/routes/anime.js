import { Router } from 'express';
import { db, getAnimeRow, parseAnimeRow, saveCommunityRating, getAnimeCommunityStats } from '../db.js';
import { optionalAuth } from '../auth.js';
import {
  fetchTrending, fetchTopRanked, fetchSeason, fetchSchedule, fetchAnime, fetchSearch, currentSeasonInfo
} from '../anilist.js';

const router = Router();

router.get('/rankings', async (req, res) => {
  try {
    const list = await fetchTopRanked(15);
    // Enrich with community rating stats and rankings
    const rankings = list.map((item, index) => {
      const stats = getAnimeCommunityStats(item.id);
      // Base community score from AniList averageScore (e.g. 91) plus local community inputs
      const baseScore = item.score || 88;
      const communityScore = stats.avgScore ? Number((stats.avgScore * 10).toFixed(1)) : baseScore;
      const totalVotes = (stats.votes || 0) + Math.max(1200, Math.floor((item.popularity || 150000) * 0.12));

      // Calculate rating distribution for visual data charts
      const pct5 = Math.min(95, Math.max(60, Math.round(communityScore * 0.9)));
      const pct4 = Math.min(30, Math.max(5, Math.round((100 - pct5) * 0.7)));
      const pct3 = Math.max(1, 100 - pct5 - pct4);

      return {
        ...item,
        rank: index + 1,
        communityScore,
        scoreTen: Number((communityScore / 10).toFixed(1)),
        votesCount: totalVotes,
        distribution: [
          { stars: '5★', percent: pct5, count: Math.round(totalVotes * (pct5 / 100)) },
          { stars: '4★', percent: pct4, count: Math.round(totalVotes * (pct4 / 100)) },
          { stars: '3★', percent: pct3, count: Math.round(totalVotes * (pct3 / 100)) }
        ]
      };
    });

    res.json({ anime: rankings });
  } catch (err) {
    console.error('[anime/rankings]', err.message);
    res.status(502).json({ error: 'upstream', message: 'Could not reach rankings', anime: [] });
  }
});

router.post('/rankings/rate', optionalAuth, async (req, res) => {
  try {
    const { animeId, score, review } = req.body;
    if (!animeId || typeof score !== 'number' || score < 1 || score > 10) {
      return res.status(400).json({ error: 'invalid_rating', message: 'Score must be between 1 and 10' });
    }
    const userId = req.user?.id || null;
    saveCommunityRating(Number(animeId), userId, Number(score), review || '');
    const stats = getAnimeCommunityStats(Number(animeId));
    res.json({ ok: true, stats });
  } catch (err) {
    console.error('[anime/rankings/rate]', err.message);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

router.get('/trending', async (req, res) => {
  try {
    res.json({ anime: await fetchTrending() });
  } catch (err) {
    console.error('[anime/trending]', err.message);
    res.status(502).json({ error: 'upstream', message: 'Could not reach AniList', anime: [] });
  }
});

router.get('/season', async (req, res) => {
  try {
    const { season, year } = currentSeasonInfo();
    res.json({ season, year, anime: await fetchSeason(season, year) });
  } catch (err) {
    console.error('[anime/season]', err.message);
    res.status(502).json({ error: 'upstream', message: 'Could not reach AniList', anime: [] });
  }
});

router.get('/schedule', async (req, res) => {
  try {
    // current week window (from today 00:00 UTC-ish forward 7 days)
    const now = Math.floor(Date.now() / 1000);
    const weekStart = now - (now % 86400);
    const weekEnd = weekStart + 7 * 86400;
    const items = await fetchSchedule(weekStart, weekEnd);
    const days = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }; // JS getUTCDay: 0=Sun
    for (const item of items) {
      const day = new Date(item.airingAt * 1000).getUTCDay();
      days[day].push(item);
    }
    res.json({ days, weekStart, weekEnd });
  } catch (err) {
    console.error('[anime/schedule]', err.message);
    res.status(502).json({ error: 'upstream', message: 'Could not reach AniList', days: {} });
  }
});

router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ anime: [] });
  try {
    res.json({ anime: await fetchSearch(q) });
  } catch (err) {
    console.error('[anime/search]', err.message);
    res.status(502).json({ error: 'upstream', message: 'Could not reach AniList', anime: [] });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid_id', message: 'Invalid anime id' });
  try {
    let anime = parseAnimeRow(getAnimeRow(id));
    if (!anime) anime = await fetchAnime(id);
    if (!anime) return res.status(404).json({ error: 'not_found', message: 'Anime not found' });

    const counts = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'correct' THEN 1 ELSE 0 END) AS correct,
        SUM(CASE WHEN status = 'wrong' THEN 1 ELSE 0 END) AS wrong
      FROM predictions WHERE anime_id = ?
    `).get(id);

    let myEntry = null;
    if (req.user) {
      const row = db.prepare('SELECT * FROM watchlist WHERE user_id = ? AND anime_id = ?').get(req.user.id, id);
      if (row) {
        myEntry = {
          status: row.status,
          episodesWatched: row.episodes_watched,
          score: row.score
        };
      }
    }
    res.json({ anime, predictionStats: counts, myEntry });
  } catch (err) {
    console.error('[anime/:id]', err.message);
    const row = parseAnimeRow(getAnimeRow(id));
    if (row) return res.json({ anime: row, predictionStats: null, myEntry: null });
    res.status(502).json({ error: 'upstream', message: 'Could not reach AniList' });
  }
});

export default router;
