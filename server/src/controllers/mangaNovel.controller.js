/**
 * Manga, Novel & Tracking Controller
 * Bridges AniList GraphQL, MangaLik (مانجا ليك - https://mangalik.net/), and Scraper Engine.
 */

import { anilistService } from '../services/anilist.service.js';
import { mangalikService } from '../services/mangalik.service.js';
import { scraperService } from '../services/scraper.service.js';
import { getUserId } from '../lib/api.js';
import { db } from '../db.js';

export const mangaNovelController = {
  /**
   * GET /api/search?query=...&type=manga|novel
   */
  async search(req, res) {
    try {
      const { query = '', type = 'manga' } = req.query;
      const cleanQuery = query.trim();

      if (!cleanQuery) {
        // Return latest trending releases from MangaLik
        const trending = await mangalikService.getLatestFromHome(15);
        return res.json({ success: true, total: trending.length, results: trending });
      }

      if (type === 'novel') {
        // Search Light Novels in AniList & Scraper
        const [aniListNovels, scrapedNovels] = await Promise.allSettled([
          anilistService.search(cleanQuery, 'NOVEL'),
          scraperService.searchArabicNovels(cleanQuery)
        ]);

        const novels = [
          ...(scrapedNovels.status === 'fulfilled' ? scrapedNovels.value : []),
          ...(aniListNovels.status === 'fulfilled' ? aniListNovels.value : [])
        ];

        return res.json({
          success: true,
          type: 'novel',
          total: novels.length,
          results: novels
        });
      }

      // Default: Search Manga / Manhwa via MangaLik (https://mangalik.net/), AniList, and Arabic Scraper
      const [mangaLikResults, aniListManga, scrapedManga] = await Promise.allSettled([
        mangalikService.searchManga(cleanQuery, 12),
        anilistService.search(cleanQuery, 'MANGA'),
        scraperService.searchArabicManga(cleanQuery)
      ]);

      const results = [
        ...(mangaLikResults.status === 'fulfilled' ? mangaLikResults.value : []),
        ...(aniListManga.status === 'fulfilled' ? aniListManga.value : []),
        ...(scrapedManga.status === 'fulfilled' ? scrapedManga.value : [])
      ];

      return res.json({
        success: true,
        type: 'manga',
        total: results.length,
        results
      });
    } catch (err) {
      console.error('[Search API Error]', err);
      res.status(500).json({ error: 'search_failed', message: err.message });
    }
  },

  /**
   * GET /api/manga/:id
   */
  async getMangaDetails(req, res) {
    try {
      const { id } = req.params;

      // Check if numeric (AniList ID)
      if (/^\d+$/.test(id)) {
        const details = await anilistService.getDetails(id);
        if (!details) {
          return res.status(404).json({ error: 'not_found', message: 'Manga not found' });
        }

        // Locate corresponding MangaLik Arabic ID
        let mangaLikMatch = null;
        try {
          const mlResults = await mangalikService.searchManga(details.title, 3);
          if (mlResults.length > 0) {
            mangaLikMatch = mlResults[0].slug || mlResults[0].id;
          }
        } catch (_) {}

        return res.json({
          success: true,
          data: {
            ...details,
            mangalikSlug: mangaLikMatch,
            mangaSlayerId: mangaLikMatch,
            mangaDexId: mangaLikMatch
          }
        });
      }

      // If id is MangaLik slug or ID, fetch directly
      const mlDetails = await mangalikService.getMangaDetails(id);
      if (mlDetails) {
        return res.json({
          success: true,
          data: {
            ...mlDetails,
            mangalikSlug: mlDetails.slug || mlDetails.id,
            mangaSlayerId: mlDetails.slug || mlDetails.id,
            mangaDexId: mlDetails.slug || mlDetails.id
          }
        });
      }

      res.status(404).json({ error: 'not_found', message: 'Manga not found' });
    } catch (err) {
      res.status(500).json({ error: 'manga_details_failed', message: err.message });
    }
  },

  /**
   * GET /api/manga/:id/chapters (Arabic only from MangaLik)
   */
  async getMangaChapters(req, res) {
    try {
      const { id } = req.params;
      let targetId = id;

      // If id is numeric (AniList), resolve to MangaLik ID
      if (/^\d+$/.test(id)) {
        const details = await anilistService.getDetails(id);
        if (details) {
          const mlResults = await mangalikService.searchManga(details.title, 1);
          if (mlResults.length > 0) {
            targetId = mlResults[0].slug || mlResults[0].id;
          }
        }
      }

      // Fetch Arabic chapters from MangaLik
      const chapters = await mangalikService.getArabicChapters(targetId);

      return res.json({
        success: true,
        source: 'mangalik',
        sourceUrl: `https://mangalik.net/manga/${targetId}/`,
        mangaId: id,
        mangalikSlug: targetId,
        total: chapters.length,
        language: 'ar',
        chapters
      });
    } catch (err) {
      res.status(500).json({ error: 'chapters_fetch_failed', message: err.message });
    }
  },

  /**
   * GET /api/manga/chapter/:chapter_id/pages
   */
  async getChapterPages(req, res) {
    try {
      const { chapter_id } = req.params;
      const pageData = await mangalikService.getChapterPages(chapter_id);
      return res.json({ success: true, ...pageData });
    } catch (err) {
      res.status(500).json({ error: 'pages_fetch_failed', message: err.message });
    }
  },

  /**
   * GET /api/novels/:id
   */
  async getNovelDetails(req, res) {
    try {
      const { id } = req.params;
      const details = await scraperService.getNovelDetails(id);
      return res.json({ success: true, data: details });
    } catch (err) {
      res.status(500).json({ error: 'novel_details_failed', message: err.message });
    }
  },

  /**
   * GET /api/novels/:id/chapters
   */
  async getNovelChapters(req, res) {
    try {
      const { id } = req.params;
      const data = await scraperService.getNovelChapters(id);
      return res.json({ success: true, ...data });
    } catch (err) {
      res.status(500).json({ error: 'novel_chapters_failed', message: err.message });
    }
  },

  /**
   * GET /api/novels/chapter/:chapter_id
   */
  async getNovelChapter(req, res) {
    try {
      const { chapter_id } = req.params;
      const data = await scraperService.getNovelChapterContent(chapter_id);
      return res.json({ success: true, ...data });
    } catch (err) {
      res.status(500).json({ error: 'novel_content_failed', message: err.message });
    }
  },

  /**
   * User Tracking: POST /api/tracking/bookmark
   */
  async toggleBookmark(req, res) {
    try {
      const userId = getUserId(req) || req.body?.userId || 'guest_user';
      const { mediaId, type = 'manga', title, coverImage } = req.body;

      if (!mediaId) {
        return res.status(400).json({ error: 'missing_id', message: 'mediaId is required' });
      }

      db.exec(`
        CREATE TABLE IF NOT EXISTS user_bookmarks (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          media_id TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT,
          cover_image TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, media_id, type)
        )
      `);

      const existing = db.prepare('SELECT id FROM user_bookmarks WHERE user_id = ? AND media_id = ? AND type = ?').get(userId, mediaId, type);

      if (existing) {
        db.prepare('DELETE FROM user_bookmarks WHERE id = ?').run(existing.id);
        return res.json({ success: true, bookmarked: false, message: 'Removed from bookmarks' });
      }

      const id = `bm_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      db.prepare(`
        INSERT INTO user_bookmarks (id, user_id, media_id, type, title, cover_image)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, userId, mediaId, type, title || '', coverImage || '');

      return res.json({ success: true, bookmarked: true, message: 'Added to bookmarks' });
    } catch (err) {
      res.status(500).json({ error: 'bookmark_failed', message: err.message });
    }
  },

  /**
   * User Tracking: GET /api/tracking/bookmarks
   */
  async getBookmarks(req, res) {
    try {
      const userId = getUserId(req) || req.query?.userId || 'guest_user';
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_bookmarks (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          media_id TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT,
          cover_image TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, media_id, type)
        )
      `);

      const rows = db.prepare('SELECT * FROM user_bookmarks WHERE user_id = ? ORDER BY created_at DESC').all(userId);
      return res.json({ success: true, bookmarks: rows });
    } catch (err) {
      res.status(500).json({ error: 'fetch_bookmarks_failed', message: err.message });
    }
  },

  /**
   * User Tracking: POST /api/tracking/history
   */
  async updateReadingHistory(req, res) {
    try {
      const userId = getUserId(req) || req.body?.userId || 'guest_user';
      const { mediaId, chapterId, chapterNumber, page = 1, type = 'manga', title, coverImage } = req.body;

      db.exec(`
        CREATE TABLE IF NOT EXISTS reading_history (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          media_id TEXT NOT NULL,
          chapter_id TEXT NOT NULL,
          chapter_number TEXT NOT NULL,
          page INTEGER DEFAULT 1,
          type TEXT NOT NULL,
          title TEXT,
          cover_image TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, media_id)
        )
      `);

      const id = `hist_${userId}_${mediaId}`;
      db.prepare(`
        INSERT INTO reading_history (id, user_id, media_id, chapter_id, chapter_number, page, type, title, cover_image, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, media_id) DO UPDATE SET
          chapter_id = excluded.chapter_id,
          chapter_number = excluded.chapter_number,
          page = excluded.page,
          title = COALESCE(excluded.title, reading_history.title),
          cover_image = COALESCE(excluded.cover_image, reading_history.cover_image),
          updated_at = CURRENT_TIMESTAMP
      `).run(id, userId, mediaId, chapterId, chapterNumber, page, type, title || '', coverImage || '');

      res.json({ success: true, message: 'Reading progress recorded' });
    } catch (err) {
      res.status(500).json({ error: 'history_failed', message: err.message });
    }
  },

  /**
   * User Tracking: GET /api/tracking/history
   */
  async getReadingHistory(req, res) {
    try {
      const userId = getUserId(req) || req.query?.userId || 'guest_user';
      db.exec(`
        CREATE TABLE IF NOT EXISTS reading_history (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          media_id TEXT NOT NULL,
          chapter_id TEXT NOT NULL,
          chapter_number TEXT NOT NULL,
          page INTEGER DEFAULT 1,
          type TEXT NOT NULL,
          title TEXT,
          cover_image TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, media_id)
        )
      `);

      const rows = db.prepare('SELECT * FROM reading_history WHERE user_id = ? ORDER BY updated_at DESC').all(userId);
      return res.json({ success: true, history: rows });
    } catch (err) {
      res.status(500).json({ error: 'fetch_history_failed', message: err.message });
    }
  },

  /**
   * User Notifications: GET /api/tracking/notifications
   */
  async getNotifications(req, res) {
    try {
      const userId = getUserId(req) || req.query?.userId || 'guest_user';
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          link TEXT,
          read INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      let rows = db.prepare('SELECT * FROM user_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(userId);
      
      // If empty, seed initial friendly release notification
      if (rows.length === 0) {
        const seedId = `notif_${Date.now()}`;
        db.prepare(`
          INSERT INTO user_notifications (id, user_id, title, message, link, read)
          VALUES (?, ?, ?, ?, ?, 0)
        `).run(
          seedId,
          userId,
          '🔥 فصل جديد متوفر!',
          'صدر الفصل الجديد مترجماً باللغة العربية الآن على مانجا ليك (MangaLik - https://mangalik.net/).',
          '/browse?category=manga'
        );
        rows = db.prepare('SELECT * FROM user_notifications WHERE user_id = ? ORDER BY created_at DESC').all(userId);
      }

      return res.json({ success: true, notifications: rows });
    } catch (err) {
      res.status(500).json({ error: 'fetch_notifications_failed', message: err.message });
    }
  },

  /**
   * Image Streaming Proxy (Bypasses Hotlink Protection, Referer blocks & CORS)
   * GET /api/proxy/image?url=...
   */
  async imageProxy(req, res) {
    try {
      let { url } = req.query;
      if (!url) return res.status(400).send('URL is required');

      // Unwrap nested proxy requests if present
      while (url.includes('/api/proxy/image?url=')) {
        const parts = url.split('/api/proxy/image?url=');
        url = decodeURIComponent(parts[parts.length - 1]);
      }

      // If relative URL or invalid format, convert to valid URL or fail gracefully
      let target;
      try {
        target = new URL(url);
      } catch (_) {
        return res.status(400).send('Invalid URL format');
      }

      const isMangalik = target.origin.includes('mangalik') || target.origin.includes('tempsolo');

      const upstream = await fetch(target.href, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
          'Referer': isMangalik ? 'https://mangalik.net/' : (target.origin || 'https://mangalik.net/'),
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
        },
        signal: AbortSignal.timeout(12000)
      });

      if (!upstream.ok) {
        // Fallback manga panel SVG to prevent broken image icon in browser
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(`
          <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100">
            <rect width="800" height="1100" fill="#0b0f19"/>
            <rect x="30" y="30" width="740" height="1040" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="8 6"/>
            <text x="400" y="480" fill="#10b981" font-size="28" font-family="sans-serif" font-weight="bold" text-anchor="middle">📖 مانجا ليك (MangaLik)</text>
            <text x="400" y="530" fill="#94a3b8" font-size="20" font-family="sans-serif" text-anchor="middle">الصفحة قيد المعالجة من السيرفر المباشر</text>
            <text x="400" y="580" fill="#64748b" font-size="16" font-family="sans-serif" text-anchor="middle">جاري إعادة التوجيه إلى خادم CDN المباشر...</text>
          </svg>
        `);
      }

      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable'); // 7 days cache
      res.send(Buffer.from(await upstream.arrayBuffer()));
    } catch (err) {
      console.warn('[Image Proxy Warning]', err.message);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(`
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100">
          <rect width="800" height="1100" fill="#090d16"/>
          <text x="400" y="520" fill="#10b981" font-size="24" font-family="sans-serif" text-anchor="middle">⚡ مانجا ليك - تحميل الصفحة</text>
          <text x="400" y="560" fill="#64748b" font-size="16" font-family="sans-serif" text-anchor="middle">جاري الاتصال بسيرفر مانجا ليك...</text>
        </svg>
      `);
    }
  }
};
