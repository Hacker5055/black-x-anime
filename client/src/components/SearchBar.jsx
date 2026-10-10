import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { api } from '../api.js';

const POPULAR_SEARCH_TAGS = [
  'One Piece',
  'Bleach',
  'Steel Ball Run',
  'Black Clover',
  'Tokyo Revengers',
  'Solo Leveling',
  'Attack on Titan',
  'Demon Slayer'
];

export default function SearchBar({
  variant = 'hero',
  onResultsChange,
  onSelectAnime,
  autoFocus = false,
  placeholder
}) {
  const { t, lang, formatNumber } = useI18n();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [activeSource, setActiveSource] = useState('all'); // 'all' | 'streaming' | 'anilist'

  const containerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const abortCtrlRef = useRef(null);

  /* ---------------- Fetch from external Anime APIs ---------------- */
  const fetchDynamicResults = useCallback(async (searchQuery) => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setResults([]);
      setLoading(false);
      setDropdownOpen(false);
      onResultsChange?.([], q);
      return;
    }

    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
    }
    abortCtrlRef.current = new AbortController();

    setLoading(true);

    try {
      // Query both external APIs concurrently for maximum coverage
      const [streamRes, anilistRes] = await Promise.allSettled([
        api.get(`/api/stream/search?q=${encodeURIComponent(q)}`, { signal: abortCtrlRef.current.signal }),
        api.get(`/api/anime/search?q=${encodeURIComponent(q)}`, { signal: abortCtrlRef.current.signal })
      ]);

      const streamItems = streamRes.status === 'fulfilled' && streamRes.value?.items ? streamRes.value.items : [];
      const anilistItems = anilistRes.status === 'fulfilled' && anilistRes.value?.anime ? anilistRes.value.anime : [];

      // Merge and deduplicate by title/slug
      const merged = [];
      const seenTitles = new Set();

      // 1. Process stream items (playable)
      for (const item of streamItems) {
        const titleKey = (item.titleEn || item.slug || '').toLowerCase().trim();
        if (titleKey && !seenTitles.has(titleKey)) {
          seenTitles.add(titleKey);
          merged.push({
            id: item.slug,
            slug: item.slug,
            titleEn: item.titleEn,
            titleAr: item.titleAr,
            poster: item.poster,
            episode: item.episode,
            type: item.type || 'Series',
            source: 'streaming',
            playable: true
          });
        }
      }

      // 2. Process AniList items (rich metadata, scores, genres)
      for (const item of anilistItems) {
        const titleKey = (item.titleEnglish || item.titleRomaji || '').toLowerCase().trim();
        const existing = merged.find((m) => {
          const mKey = (m.titleEn || '').toLowerCase().trim();
          return mKey.includes(titleKey) || titleKey.includes(mKey);
        });

        if (existing) {
          // Enrich existing streaming anime with AniList score, genres, banner
          existing.score = item.score;
          existing.genres = item.genres;
          existing.banner = item.bannerUrl;
          existing.episodes = item.episodes || existing.episode;
          existing.description = item.description;
        } else if (!seenTitles.has(titleKey)) {
          seenTitles.add(titleKey);
          merged.push({
            id: `anilist-${item.id}`,
            slug: `find-${item.id}`,
            titleEn: item.titleEnglish || item.titleRomaji,
            titleAr: item.titleArabic,
            poster: item.coverUrl,
            banner: item.bannerUrl,
            score: item.score,
            genres: item.genres,
            episodes: item.episodes,
            type: item.format || 'Anime',
            description: item.description,
            source: 'anilist',
            searchQuery: item.titleEnglish || item.titleRomaji
          });
        }
      }

      setResults(merged);
      setDropdownOpen(true);
      setHighlightIndex(-1);
      onResultsChange?.(merged, q);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('External anime search error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [onResultsChange]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (val.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        fetchDynamicResults(val);
      }, 260);
    } else {
      setResults([]);
      setDropdownOpen(false);
      onResultsChange?.([], '');
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setDropdownOpen(false);
    setHighlightIndex(-1);
    onResultsChange?.([], '');
  };

  const handleSelect = (item) => {
    setDropdownOpen(false);
    if (onSelectAnime) {
      onSelectAnime(item);
      return;
    }
    if (item.playable && item.slug) {
      navigate(`/show/${item.slug}`);
    } else if (item.searchQuery) {
      navigate(`/browse?q=${encodeURIComponent(item.searchQuery)}`);
    } else {
      navigate(`/browse?q=${encodeURIComponent(item.titleEn || '')}`);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (highlightIndex >= 0 && results[highlightIndex]) {
      handleSelect(results[highlightIndex]);
      return;
    }
    const q = query.trim();
    if (!q) return;
    setDropdownOpen(false);
    navigate(`/browse?q=${encodeURIComponent(q)}`);
  };

  const handleTagClick = (tag) => {
    setQuery(tag);
    fetchDynamicResults(tag);
  };

  const handleKeyDown = (e) => {
    if (!dropdownOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter results if user selected specific source filter
  const displayedResults = results.filter((r) => {
    if (activeSource === 'streaming') return r.source === 'streaming';
    if (activeSource === 'anilist') return r.source === 'anilist';
    return true;
  });

  return (
    <div className={`search-bar-wrapper search-bar-wrapper--${variant}`} ref={containerRef}>
      <form className="hero-search-box" onSubmit={handleSubmit} role="search">
        {/* Search Icon */}
        <div className="hero-search-box__icon" aria-hidden="true">
          {loading ? (
            <svg
              className="animate-spin"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--cyan)"
              strokeWidth="2.5"
              style={{ animation: 'spin 1s linear infinite' }}
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
        </div>

        {/* Input Field */}
        <input
          type="text"
          className="hero-search-box__input"
          placeholder={placeholder || t('hero.searchPlaceholder')}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setDropdownOpen(true);
          }}
          autoFocus={autoFocus}
          autoComplete="off"
          aria-label={t('common.search')}
          aria-autocomplete="list"
          aria-expanded={dropdownOpen}
        />

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            className="hero-search-box__clear"
            onClick={handleClear}
            aria-label={t('search.clear')}
            title={t('search.clear')}
          >
            ✕
          </button>
        )}

        {/* Submit Search Button */}
        <button type="submit" className="btn btn--primary hero-search-box__submit">
          <span className="btn__shine" />
          {t('hero.searchAction')}
        </button>

        {/* Dynamic Search Results Dropdown Overlay */}
        {dropdownOpen && (
          <div className="hero-search-dropdown" role="listbox">
            {/* Source switcher header in dropdown */}
            {results.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 1rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  fontSize: '0.8rem'
                }}
              >
                <span style={{ color: 'var(--ink-dim)', fontWeight: 600 }}>
                  {t('search.resultsCount', { n: displayedResults.length })}
                </span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveSource('all'); }}
                    className={`chip ${activeSource === 'all' ? 'active' : ''}`}
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                  >
                    {t('search.allSources')}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveSource('streaming'); }}
                    className={`chip ${activeSource === 'streaming' ? 'active' : ''}`}
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                  >
                    {t('search.sourceStreaming')}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveSource('anilist'); }}
                    className={`chip ${activeSource === 'anilist' ? 'active' : ''}`}
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                  >
                    {t('search.sourceAniList')}
                  </button>
                </div>
              </div>
            )}

            {/* List of dynamic anime results */}
            {displayedResults.length === 0 ? (
              <div style={{ padding: '1.4rem', textAlign: 'center', color: 'var(--ink-dim)', fontSize: '0.9rem' }}>
                {loading ? t('search.searchingExternal') : t('hero.noResults')}
              </div>
            ) : (
              displayedResults.slice(0, 8).map((item, idx) => {
                const itemTitle = (lang === 'ar' ? item.titleAr : item.titleEn) || item.titleEn || item.slug;
                const altTitle = lang === 'ar' ? item.titleEn : item.titleAr;
                return (
                  <div
                    key={item.id || idx}
                    className={`hero-search-item ${idx === highlightIndex ? 'highlighted' : ''}`}
                    onClick={() => handleSelect(item)}
                    role="option"
                    aria-selected={idx === highlightIndex}
                  >
                    {item.poster ? (
                      <img
                        src={item.poster}
                        alt={itemTitle}
                        className="hero-search-item__poster"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className="hero-search-item__poster"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-dim)' }}
                      >
                        🎬
                      </div>
                    )}
                    <div className="hero-search-item__info">
                      <div className="hero-search-item__title">
                        {itemTitle}
                      </div>
                      <div className="hero-search-item__sub">
                        {altTitle && <span style={{ opacity: 0.8 }}>{altTitle} · </span>}
                        <span>{item.type || 'Anime'}</span>
                        {item.episode && <span> · Ep. {item.episode}</span>}
                        {item.episodes && !item.episode && <span> · {item.episodes} eps</span>}
                        {item.score && (
                          <span style={{ color: 'var(--amber)', fontWeight: 700, marginInlineStart: '0.4rem' }}>
                            ⭐ {item.score}%
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ color: 'var(--cyan)', fontSize: '0.95rem', fontWeight: 700 }}>
                      {item.playable ? '▶' : '→'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </form>

      {/* Popular Trending Tags Underneath Search Input */}
      <div className="hero-search-tags">
        <span className="hero-search-tags__label">{t('hero.trendingTags')}</span>
        {POPULAR_SEARCH_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            className="hero-search-tag-chip"
            onClick={() => handleTagClick(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
