import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { imgFallback, pushToast } from '../hooks/hooks.js';
import { SkeletonGrid, EmptyState } from '../components/Loading.jsx';
import { resolveUserVipTier } from '../components/VipPlansAndDevCodes.jsx';
import {
  getSubscribedAnimeList,
  isAnimeEpisodeAlertEnabled,
  toggleAnimeEpisodeAlert,
  sendNativeDeviceNotification
} from '../utils/deviceNotifications.js';

const ANIME_GENRES = [
  { id: 'all', ar: '🌟 جميع التصنيفات', en: '🌟 All Genres' },
  { id: 'Action', ar: '⚔️ أكشن وقتال', en: '⚔️ Action' },
  { id: 'Fantasy', ar: '🔮 خيال وسحر', en: '🔮 Fantasy' },
  { id: 'Adventure', ar: '🧭 مغامرات', en: '🧭 Adventure' },
  { id: 'Supernatural', ar: '👁️ خارق للطبيعة', en: '👁️ Supernatural' },
  { id: 'Drama', ar: '🎭 دراما وغموض', en: '🎭 Drama' }
];

const GENRE_KEYWORDS = {
  Action: ['action', 'أكشن', 'قتال', 'حركة', 'قتالية', 'مغامرات', 'مغامرة', 'قتالي'],
  Fantasy: ['fantasy', 'خيال', 'فانتازيا', 'سحر', 'خيالي', 'خوارق', 'فانتازي'],
  Adventure: ['adventure', 'مغامرات', 'مغامرة', 'رحلة', 'استكشاف'],
  Supernatural: ['supernatural', 'خارق للطبيعة', 'خوارق', 'شياطين', 'قوى خارقة', 'شيطان', 'ما وراء الطبيعة'],
  Drama: ['drama', 'دراما', 'غموض', 'رومانسي', 'مأساة', 'حياة يومية', 'تشويق']
};

export default function TrendingAnime() {
  const { lang, formatNumber } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const vipTier = resolveUserVipTier(user);
  const isVip = vipTier === 'vip_basic' || vipTier === 'vip_monarch';

  const initialQ = searchParams.get('q') || '';
  const initialSource = searchParams.get('source') || 'all';
  const initialFilter = searchParams.get('filter') || 'trending';
  const [query, setQuery] = useState(initialQ);
  const [selectedSource, setSelectedSource] = useState(initialSource);
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [selectedGenre, setSelectedGenre] = useState('all');

  const [trendingList, setTrendingList] = useState([]);
  const [latestStreamList, setLatestStreamList] = useState([]);
  const [catalogList, setCatalogList] = useState([]);
  const [randomScraperList, setRandomScraperList] = useState([]);
  const [shufflingRandom, setShufflingRandom] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [resolvingSlugId, setResolvingSlugId] = useState(null);
  const [subscribedSlugs, setSubscribedSlugs] = useState(() =>
    new Set(getSubscribedAnimeList().map((a) => a.slug))
  );

  const refreshSubs = useCallback(() => {
    setSubscribedSlugs(new Set(getSubscribedAnimeList().map((a) => a.slug)));
  }, []);

  const refreshRandomAnime = useCallback(async () => {
    setShufflingRandom(true);
    try {
      const res = await api.get('/api/anime-scraper/random-anime?count=24');
      if (Array.isArray(res?.items) && res.items.length) {
        setRandomScraperList(res.items);
      }
    } catch {
      // ignore
    } finally {
      setShufflingRandom(false);
    }
  }, []);

  // Load initial trending + streaming + random scraper anime for the selected source
  useEffect(() => {
    let alive = true;
    setLoading(true);

    const promises = [
      api.get(`/api/stream/latest?source=${selectedSource}`).catch(() => ({ items: [] })),
      api.get(`/api/stream/catalog?source=${selectedSource}`).catch(() => ({ items: [] })),
      api.get('/api/anime-scraper/random-anime?count=24').catch(() => ({ items: [] }))
    ];

    if (selectedSource === 'all' || selectedSource === 'witanime') {
      promises.push(api.get('/api/anime/trending').catch(() => ({ anime: [] })));
    } else {
      promises.push(Promise.resolve({ anime: [] }));
    }

    Promise.all(promises).then(([latestData, catalogData, randomData, trendData]) => {
      if (!alive) return;
      setLatestStreamList(latestData?.items || []);
      setCatalogList(catalogData?.items || []);
      setRandomScraperList(randomData?.items || []);
      setTrendingList(trendData?.anime || []);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [selectedSource]);

  // Live Anime Search Engine handler across selected source(s)
  const runSearch = useCallback(
    async (qText) => {
      const clean = String(qText || '').trim();
      if (!clean) {
        setSearchResults(null);
        return;
      }
      setSearching(true);
      try {
        const streamPromise = api.get(`/api/stream/search?q=${encodeURIComponent(clean)}&source=${selectedSource}`).catch(() => ({ items: [] }));
        const aniPromise = (selectedSource === 'all' || selectedSource === 'witanime')
          ? api.get(`/api/anime/search?q=${encodeURIComponent(clean)}`).catch(() => ({ anime: [] }))
          : Promise.resolve({ anime: [] });

        const [streamRes, aniRes] = await Promise.all([streamPromise, aniPromise]);

        const combined = [];
        const seen = new Set();

        for (const s of streamRes?.items || streamRes?.results || []) {
          const key = `${s.source || 'src'}:${s.slug}`;
          if (seen.has(key)) continue;
          seen.add(key);
          combined.push({
            id: `st-${s.source || 'src'}-${s.slug}`,
            slug: s.slug,
            titleEn: s.titleEn || s.slug,
            titleAr: s.titleAr || s.titleEn || s.slug,
            poster: s.poster,
            episodes: s.episode || s.episodes || null,
            score: s.score || 94,
            genres: s.genres || ['Action', 'Fantasy'],
            isDirectStream: true,
            source: 'witanime',
            sourceLabel: 'سيرفر BLACK X'
          });
        }

        for (const a of aniRes?.anime || []) {
          const key = `ani:${(a.titleEnglish || a.titleRomaji || '').toLowerCase()}`;
          if (seen.has(key)) continue;
          seen.add(key);
          combined.push({
            id: `ani-${a.id}`,
            aniId: a.id,
            slug: null,
            searchTitle: a.titleRomaji || a.titleEnglish,
            titleEn: a.titleEnglish || a.titleRomaji,
            titleAr: a.titleArabic || a.titleEnglish || a.titleRomaji,
            poster: a.coverUrl,
            banner: a.bannerUrl,
            episodes: a.episodes,
            score: a.score || 89,
            genres: a.genres || ['Action'],
            isDirectStream: false,
            source: 'witanime',
            sourceLabel: 'سيرفر BLACK X'
          });
        }

        setSearchResults(combined);
      } finally {
        setSearching(false);
      }
    },
    [selectedSource]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim()) {
        runSearch(query);
      } else {
        setSearchResults(null);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  // Merge catalog, trending & stream lists into unified Anime cards
  const unifiedAnime = useMemo(() => {
    if (searchResults !== null) {
      return searchResults;
    }

    if (activeFilter === 'alerts') {
      return getSubscribedAnimeList().map((sub) => ({
        id: `sub-${sub.slug}`,
        slug: sub.slug,
        titleEn: sub.titleEn,
        titleAr: sub.titleAr,
        poster: sub.poster,
        episodes: sub.latestEpisode || 12,
        score: 94,
        genres: ['Action', 'Fantasy'],
        isDirectStream: true,
        source: 'witanime',
        sourceLabel: 'سيرفر BLACK X'
      }));
    }

    const list = [];
    const seen = new Set();

    // 1. Add catalog items for WitAnime
    for (const cat of catalogList) {
      const key = `wita:${cat.slug}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          id: `cat-wita-${cat.slug}`,
          slug: cat.slug,
          titleEn: cat.titleEn || cat.title || cat.slug,
          titleAr: cat.titleAr || cat.title || cat.titleEn || cat.slug,
          poster: cat.poster,
          banner: cat.banner,
          episodes: cat.episodeCount || cat.episodes || 24,
          score: Math.round((cat.rating || cat.score || 9.8) > 10 ? (cat.rating || cat.score || 9.8) : (cat.rating || cat.score || 9.8) * 10),
          genres: cat.genres || ['أكشن', 'فانتازيا'],
          isDirectStream: true,
          source: 'witanime',
          sourceLabel: 'سيرفر BLACK X'
        });
      }
    }

    // 2. Add latest streaming episodes
    for (const item of latestStreamList) {
      const key = `wita:${item.slug}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          id: `lat-wita-${item.slug}`,
          slug: item.slug,
          episode: item.episode || 1,
          titleEn: item.titleEn || item.slug,
          titleAr: item.titleAr || item.titleEn || item.slug,
          poster: item.poster,
          episodes: item.episode || 1,
          score: 92,
          genres: ['Action', 'Adventure'],
          isDirectStream: true,
          source: 'witanime',
          sourceLabel: 'سيرفر BLACK X'
        });
      }
    }

    // 3. Add trending AniList / WitAnime if witanime or all is selected
    if (selectedSource === 'all' || selectedSource === 'witanime') {
      for (const a of trendingList) {
        const titleRom = (a.titleRomaji || '').toLowerCase();
        const titleEng = (a.titleEnglish || '').toLowerCase();
        const matchedStream = latestStreamList.find((st) => {
          const stL = (st.titleEn || '').toLowerCase();
          return stL && (titleRom.includes(stL) || stL.includes(titleRom) || titleEng.includes(stL));
        });

        const slugKey = `wita:${matchedStream?.slug || a.id}`;
        if (seen.has(slugKey)) continue;
        seen.add(slugKey);

        list.push({
          id: `tr-${a.id}`,
          aniId: a.id,
          slug: matchedStream?.slug || null,
          searchTitle: a.titleRomaji || a.titleEnglish,
          titleEn: a.titleEnglish || a.titleRomaji,
          titleAr: a.titleArabic || matchedStream?.titleAr || a.titleEnglish || a.titleRomaji,
          poster: a.coverUrl || matchedStream?.poster,
          banner: a.bannerUrl,
          episodes: a.episodes || matchedStream?.episode || 12,
          score: a.score || 90,
          genres: Array.isArray(a.genres) ? a.genres : ['Action', 'Fantasy'],
          isDirectStream: Boolean(matchedStream?.slug),
          source: 'witanime',
          sourceLabel: 'سيرفر BLACK X'
        });
      }

      // 4. Add random & seasonal anime from 3v1ltw1n0x01/anime_scraper API
      for (const rnd of randomScraperList) {
        const slugKey = `wita:${rnd.slug || rnd.name}`;
        if (seen.has(slugKey)) continue;
        seen.add(slugKey);
        list.push({
          id: `rnd-${rnd.slug || rnd.name}`,
          slug: rnd.slug || null,
          searchTitle: rnd.titleEn || rnd.name,
          titleEn: rnd.titleEn || rnd.name || rnd.slug,
          titleAr: rnd.titleAr || rnd.name || rnd.titleEn || rnd.slug,
          poster: rnd.poster || rnd.img || rnd.src,
          episodes: rnd.episodes || 12,
          score: 93,
          genres: ['Action', 'Adventure', 'Fantasy'],
          isDirectStream: Boolean(rnd.slug),
          isRandomPick: true,
          source: 'witanime',
          sourceLabel: '🎲 أنمي مقترح (BLACK X)'
        });
      }
    }

    let filtered = list;
    if (selectedGenre !== 'all') {
      const targetKeywords = GENRE_KEYWORDS[selectedGenre] || [selectedGenre.toLowerCase()];
      filtered = list.filter((it) =>
        (it.genres || []).some((g) => {
          const gLower = String(g).toLowerCase();
          return targetKeywords.some((k) => gLower.includes(k.toLowerCase()) || k.toLowerCase().includes(gLower));
        })
      );
    }

    if (activeFilter === 'latest') {
      filtered = [...filtered].sort((a, b) => {
        const aIsLat = a.id?.startsWith('lat-') ? 1 : 0;
        const bIsLat = b.id?.startsWith('lat-') ? 1 : 0;
        return bIsLat - aIsLat;
      });
    } else if (activeFilter === 'top') {
      filtered = [...filtered].sort((a, b) => (b.score || 0) - (a.score || 0));
    } else if (activeFilter === 'random') {
      const randomOnly = filtered.filter((it) => it.isRandomPick);
      filtered = randomOnly.length ? randomOnly : [...filtered].sort(() => Math.random() - 0.5);
    }

    return filtered;
  }, [searchResults, activeFilter, selectedSource, catalogList, latestStreamList, trendingList, randomScraperList, selectedGenre, subscribedSlugs]);

  const handleOpenAnime = async (item) => {
    if (!item) return;
    const directSlug = item.slug || (item.id && item.id.startsWith('lat-wita-') ? item.id.replace('lat-wita-', '') : null) || (item.id && item.id.startsWith('cat-wita-') ? item.id.replace('cat-wita-', '') : null);
    if (directSlug && !String(directSlug).startsWith('ani-')) {
      navigate(`/show/${directSlug}`);
      return;
    }
    // Resolve streaming slug via /api/stream/search
    setResolvingSlugId(item.id);
    try {
      const q = item.searchTitle || item.titleEn || item.titleAr || '';
      if (q) {
        const res = await api.get(`/api/stream/search?q=${encodeURIComponent(q)}`);
        const first = res?.items?.[0] || res?.results?.[0];
        if (first?.slug) {
          navigate(`/show/${first.slug}`);
          return;
        }
      }
      if (latestStreamList?.[0]?.slug) {
        navigate(`/show/${latestStreamList[0].slug}`);
      } else {
        navigate('/show/one-piece');
      }
    } catch {
      if (latestStreamList?.[0]?.slug) {
        navigate(`/show/${latestStreamList[0].slug}`);
      } else {
        navigate('/show/one-piece');
      }
    } finally {
      setResolvingSlugId(null);
    }
  };

  const handleToggleAlert = async (e, item) => {
    e.stopPropagation();
    const targetSlug = item.slug || String(item.titleEn || 'anime').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await toggleAnimeEpisodeAlert(
      {
        slug: targetSlug,
        titleAr: item.titleAr || item.titleEn,
        titleEn: item.titleEn,
        poster: item.poster,
        latestEpisode: item.episodes || 1
      },
      lang
    );
    refreshSubs();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Hero Banner & Dedicated Anime Search Engine */}
      <section
        className="glass"
        style={{
          padding: '2.25rem 2rem',
          borderRadius: '26px',
          background: 'radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.32), rgba(6, 9, 20, 0.96) 70%)',
          border: '1px solid rgba(34, 211, 238, 0.35)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.28rem 0.85rem', borderRadius: '99px', background: 'rgba(245, 158, 11, 0.18)', border: '1px solid rgba(245, 158, 11, 0.45)', color: '#fde047', fontSize: '0.76rem', fontWeight: 900, marginBottom: '0.65rem' }}>
              🔥 {lang === 'ar' ? 'قسم الأنمي الحصري • بث FHD 1080p لمشتركي VIP' : 'DEDICATED ANIME HUB • FHD 1080P VIP'}
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.75rem, 3.2vw, 2.45rem)', fontWeight: 900 }}>
              🔥 {lang === 'ar' ? 'الأعمال الرائجة (Trending Anime)' : 'Trending Anime Hub'}
            </h1>
            <p style={{ margin: '0.45rem 0 0', color: 'var(--ink-dim)', fontSize: '0.94rem', maxWidth: '680px', lineHeight: 1.6 }}>
              {lang === 'ar'
                ? 'استكشف أقوى أعمال الأنمي الرائجة عالمياً مع محرك بحث فوري، وفعل إشعارات الحلقات الجديدة لتصلك مباشرة على هاتفك أو جهاز الكمبيوتر فور نزولها!'
                : 'Explore top trending anime with an instant search engine, and enable real-time Phone/PC episode notifications!'}
            </p>
          </div>

          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={async () => {
              const sample = unifiedAnime[0] || {
                titleAr: 'سولو ليفلينج (Solo Leveling)',
                titleEn: 'Solo Leveling',
                poster: '',
                slug: 'solo-leveling'
              };
              const ok = await sendNativeDeviceNotification({
                title: lang === 'ar' ? `🎬 حلقة جديدة متوفرة الآن: ${sample.titleAr}` : `🎬 New Episode Live: ${sample.titleEn}`,
                body:
                  lang === 'ar'
                    ? 'الحلقة الجديدة متاحة الآن للمشاهدة الفورية لمشتركي VIP بجودة FHD 1080p على BLACK X!'
                    : 'The new episode is now streaming in FHD 1080p on BLACK X!',
                icon: sample.poster,
                url: sample.slug ? `/show/${sample.slug}` : '/trending'
              });
              if (ok) {
                pushToast(
                  lang === 'ar'
                    ? '📲 تم إرسال إشعار حقيقي إلى شاشة هاتفك / جهاز الكمبيوتر بنجاح!'
                    : '📲 Sent a real native notification to your Phone/PC!',
                  'success'
                );
              } else {
                pushToast(
                  lang === 'ar'
                    ? '🔔 يرجى السماح بإشعارات المتصفح من شريط العنوان لتظهر الإشعارات على شاشة هاتفك/جهازك!'
                    : '🔔 Please allow browser notifications in the address bar!',
                  'info'
                );
              }
            }}
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
              color: '#fff',
              fontWeight: 900,
              padding: '0.65rem 1.15rem',
              borderRadius: '14px'
            }}
          >
            📲 {lang === 'ar' ? 'تجربة إشعار حلقة على جهازك الآن' : 'Test Device Notification Now'}
          </button>
        </div>

        {/* Dedicated Instant Anime Search Bar */}
        <div
          style={{
            display: 'flex',
            gap: '0.65rem',
            flexWrap: 'wrap',
            padding: '0.65rem',
            borderRadius: '18px',
            background: 'rgba(0, 0, 0, 0.55)',
            border: '1px solid rgba(34, 211, 238, 0.45)',
            marginBottom: '1.15rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '240px', paddingInlineStart: '0.6rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🔍</span>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.trim()) {
                  setSearchParams({ q: e.target.value }, { replace: true });
                } else {
                  setSearchParams({}, { replace: true });
                }
              }}
              placeholder={
                lang === 'ar'
                  ? 'ابحث في الأعمال الرائجة وكل الأنميات (مثال: One Piece, Solo Leveling, Attack on Titan, بليتش)...'
                  : 'Search trending & all anime (e.g. One Piece, Solo Leveling, Bleach, Jujutsu Kaisen)...'
              }
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.96rem',
                fontWeight: 700,
                outline: 'none',
                padding: '0.45rem 0'
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSearchResults(null);
                  setSearchParams({}, { replace: true });
                }}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => runSearch(query)}
            disabled={searching}
            style={{
              background: 'linear-gradient(135deg, #22d3ee, #8b5cf6)',
              color: '#050814',
              fontWeight: 900,
              borderRadius: '12px',
              padding: '0.65rem 1.4rem'
            }}
          >
            {searching ? (lang === 'ar' ? 'جارٍ البحث...' : 'Searching...') : (lang === 'ar' ? 'بحث الأنمي' : 'Search Anime')}
          </button>
        </div>

        {/* Release Policy & VIP FHD Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.75rem 1.1rem',
            borderRadius: '14px',
            background: isVip ? 'rgba(16, 185, 129, 0.14)' : 'rgba(245, 158, 11, 0.12)',
            border: isVip ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)'
          }}
        >
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: isVip ? '#34d399' : '#fde047' }}>
            {isVip
              ? (lang === 'ar'
                  ? '👑 امتيازات VIP مفعّلة لك: الحلقات الرسمية تنزل لك فور صدورها في نفس اليوم + مشاهدة وتحميل بجودة FHD 1080p!'
                  : '👑 VIP Active: Same-day official episodes + FHD 1080p streaming & downloads unlocked!')
              : (lang === 'ar'
                  ? '⏳ نظام العرض الرسمي: الحلقات الجديدة تنزل لمشتركي VIP في يوم صدورها (وتتأخر 24 ساعة للنسخة المجانية) • سيرفرات FHD 1080p حصرية لـ VIP.'
                  : '⏳ Official Release Policy: New episodes drop on release day for VIP (24h delay for Free) • FHD 1080p is VIP exclusive.')}
          </span>
          {!isVip && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => navigate('/profile?tab=referrals')}
              style={{ background: 'linear-gradient(135deg, #f59e0b, #eab308)', color: '#090d16', fontWeight: 900 }}
            >
              👑 {lang === 'ar' ? 'اشترك في VIP الآن (99 ج.م)' : 'Get VIP Now (99 EGP)'}
            </button>
          )}
        </div>
      </section>

      {/* Official BLACK X Anime Source Engine Selector (WitAnime) */}
      <div
        className="glass"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.85rem',
          padding: '0.95rem 1.25rem',
          borderRadius: '18px',
          border: '1px solid rgba(34, 211, 238, 0.4)',
          background: 'linear-gradient(135deg, rgba(8, 12, 24, 0.95), rgba(15, 23, 42, 0.9))'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ fontSize: '1.35rem' }}>🌐</span>
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#fff' }}>
              {lang === 'ar' ? 'سيرفر BLACK X للبث والتحميل:' : 'Official BLACK X Server:'}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--ink-dim)' }}>
              {lang === 'ar'
                ? 'سيرفر منصة BLACK X الرسمي الحصري فائق السرعة بدقة FHD 1080p ومجاني بالكامل'
                : 'Official ultra-fast BLACK X server with FHD 1080p quality'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', icon: '🌟', labelAr: 'جميع أعمال BLACK X', labelEn: 'All Titles' },
            { id: 'witanime', icon: '👑', labelAr: 'سيرفر BLACK X', labelEn: 'BLACK X Server', sub: 'black-x.live' }
          ].map((src) => {
            const active = selectedSource === src.id;
            return (
              <button
                key={src.id}
                type="button"
                onClick={() => {
                  setSelectedSource(src.id);
                  setQuery('');
                  setSearchResults(null);
                  const p = new URLSearchParams(searchParams);
                  if (src.id === 'all') p.delete('source');
                  else p.set('source', src.id);
                  setSearchParams(p, { replace: true });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '12px',
                  fontWeight: 900,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  transition: 'all 0.22s ease',
                  background: active
                    ? 'linear-gradient(135deg, #06b6d4, #8b5cf6)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: active ? '#040d1a' : '#cbd5e1',
                  border: active ? '1px solid transparent' : '1px solid rgba(255, 255, 255, 0.14)',
                  boxShadow: active ? '0 4px 18px rgba(34, 211, 238, 0.35)' : 'none'
                }}
              >
                <span>{src.icon}</span>
                <span>{lang === 'ar' ? src.labelAr : src.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs & Genre Chips */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'trending', ar: '🔥 الأكثر رواجاً الآن', en: '🔥 Trending Now' },
            { id: 'random', ar: '🎲 أنميات عشوائية', en: '🎲 Random Anime' },
            { id: 'latest', ar: '🎬 أحدث الحلقات المضافة', en: '🎬 Latest Episodes' },
            { id: 'top', ar: '⭐ الأعلى تقييماً', en: '⭐ Top Rated' },
            { id: 'alerts', ar: `🔔 تنبيهاتك المفعّلة (${subscribedSlugs.size})`, en: `🔔 Your Alerts (${subscribedSlugs.size})` }
          ].map((tb) => (
            <button
              key={tb.id}
              type="button"
              className={`chip ${activeFilter === tb.id && searchResults === null ? 'active' : ''}`}
              onClick={() => {
                setQuery('');
                setSearchResults(null);
                setActiveFilter(tb.id);
                if (tb.id === 'random') {
                  refreshRandomAnime();
                }
              }}
              style={{ fontWeight: 800, padding: '0.5rem 1.05rem' }}
            >
              {lang === 'ar' ? tb.ar : tb.en}
            </button>
          ))}
          <button
            type="button"
            className="chip"
            disabled={shufflingRandom}
            onClick={() => {
              setQuery('');
              setSearchResults(null);
              setActiveFilter('random');
              refreshRandomAnime();
            }}
            style={{
              fontWeight: 900,
              padding: '0.5rem 0.95rem',
              borderColor: 'rgba(255,255,255,0.35)',
              color: '#ffffff'
            }}
          >
            {shufflingRandom
              ? (lang === 'ar' ? '⏳ جاري الجلب...' : '⏳ Shuffling...')
              : (lang === 'ar' ? '🔄 خلط أنميات عشوائية' : '🔄 Shuffle Random')}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {ANIME_GENRES.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedGenre(g.id)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '99px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                border: selectedGenre === g.id ? '1px solid var(--cyan)' : '1px solid rgba(255,255,255,0.1)',
                background: selectedGenre === g.id ? 'rgba(34,211,238,0.18)' : 'rgba(255,255,255,0.04)',
                color: selectedGenre === g.id ? 'var(--cyan)' : '#cbd5e1'
              }}
            >
              {lang === 'ar' ? g.ar : g.en}
            </button>
          ))}
        </div>
      </div>

      {/* Anime Cards Grid */}
      {loading || searching ? (
        <SkeletonGrid count={12} />
      ) : unifiedAnime.length === 0 ? (
        <div className="glass" style={{ padding: '2.5rem' }}>
          <EmptyState
            icon="🎬"
            title={lang === 'ar' ? 'لا توجد أنميات مطابقة لبحثك حالياً' : 'No matching anime found'}
            sub={lang === 'ar' ? 'جرب البحث بكلمة أخرى أو تصفح قائمة الأكثر رواجاً' : 'Try another keyword or browse Trending Now'}
          />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1.35rem'
          }}
        >
          {unifiedAnime.map((item) => {
            const targetSlug = item.slug || String(item.titleEn || 'anime').toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const isSub = subscribedSlugs.has(targetSlug) || isAnimeEpisodeAlertEnabled(targetSlug);
            const isResolving = resolvingSlugId === item.id;

            return (
              <article
                key={item.id}
                onClick={() => handleOpenAnime(item)}
                className="glass glass-hover"
                style={{
                  borderRadius: '18px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'transform 0.22s ease, border-color 0.22s ease'
                }}
              >
                <div style={{ position: 'relative', aspectRatio: '2 / 2.85', width: '100%', background: '#090d18', overflow: 'hidden' }}>
                  {item.poster && (
                    <img
                      onError={imgFallback}
                      src={item.poster}
                      alt={item.titleEn}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}

                  {/* Top Badges */}
                  <div style={{ position: 'absolute', top: '8px', insetInlineStart: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '8px',
                        background: 'rgba(0, 0, 0, 0.82)',
                        border: '1px solid rgba(234, 179, 8, 0.6)',
                        color: '#fde047',
                        fontSize: '0.68rem',
                        fontWeight: 900
                      }}
                    >
                      👑 FHD 1080p VIP
                    </span>
                    <span
                      style={{
                        padding: '0.18rem 0.5rem',
                        borderRadius: '8px',
                        background: isVip ? 'rgba(16, 185, 129, 0.88)' : 'rgba(15, 23, 42, 0.88)',
                        color: '#fff',
                        fontSize: '0.65rem',
                        fontWeight: 800
                      }}
                    >
                      {isVip
                        ? (lang === 'ar' ? '⚡ يعرض فور نزوله' : '⚡ Same-Day VIP')
                        : (lang === 'ar' ? '⏳ +24س للمجاني' : '⏳ 24h Free Delay')}
                    </span>
                  </div>

                  {/* Score Badge */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '8px',
                      insetInlineEnd: '8px',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.82)',
                      color: '#fbbf24',
                      fontSize: '0.74rem',
                      fontWeight: 900
                    }}
                  >
                    ★ {((item.score || 90) / 10).toFixed(1)}
                  </span>

                  {/* Bell Alert Quick Toggle Button on Card */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleAlert(e, item)}
                    title={lang === 'ar' ? 'تفعيل إشعارات الحلقات الجديدة على هاتفك/جهازك' : 'Enable Device Episode Notifications'}
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      insetInlineEnd: '8px',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '99px',
                      border: isSub ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.25)',
                      background: isSub ? 'rgba(16, 185, 129, 0.92)' : 'rgba(8, 11, 22, 0.85)',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.5)'
                    }}
                  >
                    {isSub ? (lang === 'ar' ? '🔔 مفعّل ✓' : '🔔 On ✓') : (lang === 'ar' ? '📲 إشعارني' : '📲 Notify')}
                  </button>
                </div>

                <div style={{ padding: '0.9rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', gap: '0.55rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', marginBottom: '0.35rem' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          background: 'rgba(34, 211, 238, 0.22)',
                          color: '#38bdf8',
                          border: '1px solid rgba(34, 211, 238, 0.5)'
                        }}
                      >
                        👑 سيرفر BLACK X
                      </span>
                      {item.episodes && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--ink-dim)', fontWeight: 800 }}>
                          🎬 {formatNumber(item.episodes)} {lang === 'ar' ? 'حلقة' : 'EP'}
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#fff', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {lang === 'ar' ? (item.titleAr || item.titleEn) : item.titleEn}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                    {item.episode ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/watch/${targetSlug}/${item.episode}`);
                          }}
                          className="btn btn--primary btn--sm"
                          style={{ flex: 1, justifyContent: 'center', fontWeight: 800, fontSize: '0.74rem', padding: '0.45rem 0.6rem' }}
                        >
                          ▶ {lang === 'ar' ? `الحلقة ${formatNumber(item.episode)}` : `EP ${formatNumber(item.episode)}`}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAnime(item);
                          }}
                          className="btn btn--ghost btn--sm"
                          style={{ padding: '0.45rem 0.65rem', fontWeight: 800, fontSize: '0.74rem' }}
                          title={lang === 'ar' ? 'صفحة الأنمي وتفاصيله' : 'Anime details'}
                        >
                          {lang === 'ar' ? 'الأنمي' : 'Show'}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAnime(item);
                        }}
                        className="btn btn--primary btn--sm"
                        style={{ width: '100%', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem' }}
                      >
                        {isResolving
                          ? (lang === 'ar' ? '⏳ جارٍ الفتح...' : '⏳ Opening...')
                          : (lang === 'ar' ? '▶ مشاهدة الحلقات' : '▶ Watch Episodes')}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
