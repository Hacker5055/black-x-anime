/**
 * Express Router for 3v1ltw1n0x01/anime_scraper API
 * Exposes the exact endpoints from https://github.com/3v1ltw1n0x01/anime_scraper/blob/master/main.py
 * both at root (`/search-anime/:name`, `/get-episodes/:s_id`, `/get-episode-dl/:s_id`, etc.)
 * and under `/api/anime-scraper/...`
 */
import express from 'express';
import {
  scraperSearchAnime,
  scraperGetEpisodes,
  scraperGetEpisodeDl,
  scraperLatestEpisodes,
  scraperFetchSeasonals,
  scraperGetAnimeInfo
} from '../animeScraperApi.js';

export const animeScraperRouter = express.Router();

// GET /search-anime/:name
animeScraperRouter.get('/search-anime/:name', async (req, res) => {
  try {
    const results = await scraperSearchAnime(req.params.name);
    res.json(results);
  } catch (err) {
    res.status(502).json({ error: 'search-anime failed', detail: err.message });
  }
});

// GET /get-episodes/:s_id
animeScraperRouter.get('/get-episodes/:s_id', async (req, res) => {
  try {
    const results = await scraperGetEpisodes(req.params.s_id);
    res.json(results);
  } catch (err) {
    res.status(502).json({ error: 'get-episodes failed', detail: err.message });
  }
});

// GET /get-episode-dl/:s_id and /get-episode-dl/:s_id/:ep
animeScraperRouter.get('/get-episode-dl/:s_id/:ep?', async (req, res) => {
  try {
    const ep = req.params.ep || req.query.ep || 1;
    const results = await scraperGetEpisodeDl(req.params.s_id, ep);
    res.json(results);
  } catch (err) {
    res.status(502).json({ error: 'get-episode-dl failed', detail: err.message });
  }
});

// GET /latest-episodes
animeScraperRouter.get('/latest-episodes', async (_req, res) => {
  try {
    const results = await scraperLatestEpisodes();
    res.json(results);
  } catch (err) {
    res.status(502).json({ error: 'latest-episodes failed', detail: err.message });
  }
});

// GET /fetch-seasonals
animeScraperRouter.get('/fetch-seasonals', async (_req, res) => {
  try {
    const results = await scraperFetchSeasonals();
    res.json(results);
  } catch (err) {
    res.status(502).json({ error: 'fetch-seasonals failed', detail: err.message });
  }
});

// GET /get-anime-info/:s_id
animeScraperRouter.get('/get-anime-info/:s_id', async (req, res) => {
  try {
    const results = await scraperGetAnimeInfo(req.params.s_id);
    if (!results) return res.status(404).json({ error: 'Anime not found' });
    res.json(results);
  } catch (err) {
    res.status(502).json({ error: 'get-anime-info failed', detail: err.message });
  }
});
