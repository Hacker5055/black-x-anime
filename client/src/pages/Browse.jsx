import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { Modal } from '../components/Modals.jsx';
import { SkeletonGrid, EmptyState, LiquidLoader } from '../components/Loading.jsx';
import { pushToast, imgFallback } from '../hooks/hooks.js';
import MangaNovelReader from '../components/MangaNovelReader.jsx';

export default function Browse() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialFilter = searchParams.get('filter') || 'ALL';

  const [filter, setFilter] = useState(initialFilter); // ALL | MANHWA | MANGA | TOP_RATED | ONGOING | COMPLETED
  const [query, setQuery] = useState(initialQ);
  const [libraryItems, setLibraryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchingLive, setSearchingLive] = useState(false);
  const [liveSearchResults, setLiveSearchResults] = useState(null);

  // Selected item for chapter modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [loadingItemDetails, setLoadingItemDetails] = useState(false);
  const [itemChapters, setItemChapters] = useState([]);
  const [loggingRead, setLoggingRead] = useState(false);

  // Active item and chapter for reading in MangaNovelReader
  const [readerItem, setReaderItem] = useState(null);

  // Filter chips configuration
  const filterChips = [
    { id: 'ALL', labelAr: '🌟 الكل (الرائجة والشائعة)', labelEn: '🌟 All Trending' },
    { id: 'MANHWA', labelAr: '⚡ مانهوا كورية', labelEn: '⚡ Manhwa' },
    { id: 'MANGA', labelAr: '📖 مانجا يابانية', labelEn: '📖 Manga' },
    { id: 'TOP_RATED', labelAr: '⭐ الأعلى تقييماً', labelEn: '⭐ Top Rated' },
    { id: 'ONGOING', labelAr: '⌛ مستمرة', labelEn: '⌛ Ongoing' },
    { id: 'COMPLETED', labelAr: '✔ مكتملة', labelEn: '✔ Completed' }
  ];

  // Fetch trending items from server
  const loadLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/content/library?type=ALL');
      setLibraryItems(res.items || []);
    } catch {
      setLibraryItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  // Live search against MangaLik or local library
  const handleSearch = async (e) => {
    e?.preventDefault?.();
    const q = query.trim();
    if (!q) {
      setLiveSearchResults(null);
      return;
    }

    setSearchingLive(true);
    try {
      const res = await api.get(`/api/search?query=${encodeURIComponent(q)}&type=manga`);
      if (res?.results && res.results.length > 0) {
        const mapped = res.results.map((r, i) => ({
          id: r.mangalikSlug || r.slug || `res_${i}`,
          mangalikSlug: r.mangalikSlug || r.slug,
          title_ar: r.arabicTitle || r.title || r.romajiTitle,
          title_en: r.englishTitle || r.romajiTitle || r.title || 'Manga',
          type: (r.type || 'MANHWA').toUpperCase(),
          poster: r.coverUrl || r.poster || 'https://io.mangalik.net/wp-content/app/lekmanganet/512.png',
          banner: r.coverUrl || r.banner,
          author: r.author || 'مانجا ليك (MangaLik)',
          rating: r.rating || (r.averageScore ? (r.averageScore / 10).toFixed(1) : '9.8'),
          description_ar: r.description || 'فصول مترجمة عالية الجودة متاحة مباشرة عبر مانجا ليك.',
          description_en: r.description || 'Full Arabic translated chapters on MangaLik.',
          chapters_count: r.chaptersCount || 25,
          status: r.status || 'مستمرة',
          genres: r.genres || ['أكشن', 'مترجم عربي'],
          source: 'mangalik'
        }));
        setLiveSearchResults(mapped);
      } else {
        setLiveSearchResults([]);
      }
    } catch {
      setLiveSearchResults([]);
    } finally {
      setSearchingLive(false);
    }
  };

  // Filtered display items
  const displayedItems = useMemo(() => {
    if (liveSearchResults !== null) return liveSearchResults;

    let items = [...libraryItems];

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      items = items.filter(
        (it) =>
          (it.title_ar && it.title_ar.toLowerCase().includes(q)) ||
          (it.title_en && it.title_en.toLowerCase().includes(q)) ||
          (it.author && it.author.toLowerCase().includes(q))
      );
    }

    switch (filter) {
      case 'MANHWA':
        return items.filter((it) => it.type === 'MANHWA');
      case 'MANGA':
        return items.filter((it) => it.type === 'MANGA');
      case 'TOP_RATED':
        return [...items].sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
      case 'ONGOING':
        return items.filter((it) => String(it.status).toUpperCase().includes('ONGOING') || String(it.status).includes('مستمر'));
      case 'COMPLETED':
        return items.filter((it) => String(it.status).toUpperCase().includes('COMPLETED') || String(it.status).includes('مكتمل'));
      case 'ALL':
      default:
        return items;
    }
  }, [libraryItems, liveSearchResults, filter, query]);

  // Featured Spotlight item (Solo Leveling or first manhwa in list)
  const spotlightItem = useMemo(() => {
    return (
      libraryItems.find((it) => it.id === 'solo-leveling') ||
      libraryItems.find((it) => it.type === 'MANHWA') ||
      libraryItems[0] ||
      null
    );
  }, [libraryItems]);

  // Open chapter list details modal
  const openItemDetails = async (item) => {
    setSelectedItem(item);
    setLoadingItemDetails(true);
    setItemChapters([]);

    try {
      const res = await api.get(`/api/content/library/${encodeURIComponent(item.id || item.mangalikSlug)}`);
      if (res?.item?.chapters) {
        setItemChapters(res.item.chapters);
      } else {
        // Fallback to manga chapters route
        const chRes = await api.get(`/api/manga/${encodeURIComponent(item.id || item.mangalikSlug)}/chapters`);
        setItemChapters(chRes.chapters || []);
      }
    } catch {
      setItemChapters([]);
    } finally {
      setLoadingItemDetails(false);
    }
  };

  // Launch reader directly
  const launchReader = (item, chapterNum = null) => {
    setReaderItem({
      ...item,
      mangalikSlug: item.mangalikSlug || item.id,
      slug: item.mangalikSlug || item.id,
      title: item.title_ar || item.title_en,
      initialChapterNumber: chapterNum
    });
    setSelectedItem(null);
  };

  // Log reading time
  const handleRecordReading = async () => {
    if (!selectedItem) return;
    setLoggingRead(true);
    try {
      const res = await api.post(`/api/content/library/${selectedItem.id}/read`, { minutes: 20 });
      pushToast(
        lang === 'ar'
          ? `✓ تم تسجيل 20 دقيقة قراءة! ارتفع مستواك إلى المستوى ${res.currentLevel} (+200 XP)`
          : `✓ 20 mins read recorded! Current Level ${res.currentLevel} (+200 XP)`,
        'success'
      );
    } catch (err) {
      pushToast(err.message || 'يرجى تسجيل الدخول لحفظ نقاط القراءة', 'error');
    } finally {
      setLoggingRead(false);
    }
  };

  return (
    <div className="library-container" style={{ paddingBlock: '1.25rem' }}>
      {/* Page Header */}
      <div className="page-head reveal" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.3rem)', fontWeight: 900, margin: 0 }}>
            📖 {lang === 'ar' ? 'المكتبة (مانهوا ومانجا)' : 'The Library (Manhwa & Manga)'}
          </h1>
          <span
            style={{
              background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(139, 92, 246, 0.2))',
              border: '1px solid rgba(34, 211, 238, 0.4)',
              color: '#38bdf8',
              fontSize: '0.78rem',
              fontWeight: 800,
              padding: '0.25rem 0.65rem',
              borderRadius: '99px'
            }}
          >
            ⚡ {lang === 'ar' ? 'المصدر الحصري: مانجا ليك (MangaLik)' : 'Source: MangaLik'}
          </span>
        </div>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--ink-dim)', fontSize: '0.94rem' }}>
          {lang === 'ar'
            ? 'تصفح مباشرة أفضل المانهوا الكورية والمانجا اليابانية الرائجة، أو اختر عملك المفضل وابدأ القراءة فوراً بدون الحاجة للبحث!'
            : 'Browse top trending Korean Manhwa and Japanese Manga, and start reading in high resolution with one tap!'}
        </p>
      </div>

      {/* Featured Hero Banner for Top Trending Hit */}
      {spotlightItem && !query && (
        <div
          className="library-spotlight reveal glass"
          style={{
            position: 'relative',
            borderRadius: '20px',
            overflow: 'hidden',
            marginBottom: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 27, 75, 0.85))'
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.5rem',
              padding: 'clamp(1.2rem, 3vw, 2rem)',
              alignItems: 'center'
            }}
          >
            {/* Poster & Badges */}
            <div style={{ position: 'relative', maxWidth: '300px', margin: '0 auto', width: '100%' }}>
              <div
                style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.7), 0 0 25px rgba(34, 211, 238, 0.25)',
                  aspectRatio: '3/4',
                  position: 'relative'
                }}
              >
                <img
                  onError={imgFallback}
                  src={spotlightItem.poster}
                  alt={spotlightItem.title_en}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '12px',
                    insetInlineStart: '12px',
                    background: 'rgba(239, 68, 68, 0.9)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '8px',
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  🔥 {lang === 'ar' ? 'الأكثر رواجاً #1' : '#1 Trending'}
                </span>
                <span
                  style={{
                    position: 'absolute',
                    top: '12px',
                    insetInlineEnd: '12px',
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: '#fbbf24',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '8px'
                  }}
                >
                  ★ {spotlightItem.rating}
                </span>
              </div>
            </div>

            {/* Information & Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: 'rgba(34, 211, 238, 0.18)',
                    color: '#38bdf8',
                    border: '1px solid rgba(34, 211, 238, 0.4)',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '99px',
                    fontSize: '0.78rem',
                    fontWeight: 800
                  }}
                >
                  {spotlightItem.type === 'MANHWA' ? '⚡ مانهوا كورية' : '📖 مانجا يابانية'}
                </span>
                <span
                  style={{
                    background: 'rgba(52, 211, 153, 0.18)',
                    color: '#34d399',
                    border: '1px solid rgba(52, 211, 153, 0.4)',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '99px',
                    fontSize: '0.78rem',
                    fontWeight: 800
                  }}
                >
                  {spotlightItem.status}
                </span>
                <span
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '99px',
                    fontSize: '0.78rem',
                    fontWeight: 700
                  }}
                >
                  {spotlightItem.chapters_count} {lang === 'ar' ? 'فصلاً مترجماً' : 'Chapters'}
                </span>
              </div>

              <h2 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', fontWeight: 900, margin: 0, lineHeight: 1.25 }}>
                {lang === 'ar' ? spotlightItem.title_ar : spotlightItem.title_en}
              </h2>
              <div style={{ color: 'var(--ink-dim)', fontSize: '0.9rem', fontWeight: 600 }}>
                {spotlightItem.title_en} · ✍️ {spotlightItem.author}
              </div>

              <p
                style={{
                  color: '#e2e8f0',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  margin: 0,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {lang === 'ar' ? spotlightItem.description_ar : spotlightItem.description_en}
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => launchReader(spotlightItem)}
                  style={{
                    padding: '0.75rem 1.6rem',
                    fontSize: '0.96rem',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                    boxShadow: '0 8px 20px -4px rgba(6, 182, 212, 0.5)'
                  }}
                >
                  <span className="btn__shine" />
                  📖 {lang === 'ar' ? 'اقرأ الآن (الفصل الأول)' : 'Read Chapter 1'}
                </button>

                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => openItemDetails(spotlightItem)}
                  style={{
                    padding: '0.75rem 1.3rem',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                >
                  📑 {lang === 'ar' ? 'فهرس الفصول والتفاصيل' : 'Chapters & Details'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Control Bar */}
      <div className="filter-bar glass reveal" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
        <form
          style={{ display: 'flex', gap: '0.65rem', flex: 1, flexWrap: 'wrap' }}
          onSubmit={handleSearch}
        >
          <input
            className="input"
            name="q"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) setLiveSearchResults(null);
            }}
            placeholder={
              lang === 'ar'
                ? 'ابحث باسم المانهوا أو المانجا (سولو، ون بيس، جوجوتسو، بيرسيرك...)'
                : 'Search Manga or Manhwa title...'
            }
            style={{ flex: 1, minWidth: '220px' }}
          />
          <button type="submit" className="btn btn--primary">
            <span className="btn__shine" />
            {lang === 'ar' ? 'بحث في مانجا ليك' : 'Search MangaLik'}
          </button>
          {liveSearchResults !== null && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setQuery('');
                setLiveSearchResults(null);
              }}
            >
              ✕ {lang === 'ar' ? 'إلغاء البحث' : 'Clear'}
            </button>
          )}
        </form>
        <span
          className="chip"
          style={{
            cursor: 'default',
            background: 'rgba(34, 211, 238, 0.1)',
            borderColor: 'rgba(34, 211, 238, 0.3)',
            color: '#38bdf8',
            fontSize: '0.82rem'
          }}
        >
          ⚡ {lang === 'ar' ? 'قراءة مباشرة عالية الدقة' : 'Direct High-Res Arabic Reader'}
        </span>
      </div>

      {/* Filter Chips Pills */}
      <div
        className="reveal"
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '1.75rem',
          alignItems: 'center'
        }}
      >
        <span style={{ fontSize: '0.86rem', color: 'var(--ink-dim)', marginInlineEnd: '0.35rem', fontWeight: 700 }}>
          {lang === 'ar' ? 'تصنيف:' : 'Filter:'}
        </span>
        {filterChips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => {
              setFilter(chip.id);
              setSearchParams(query ? { filter: chip.id, q: query } : { filter: chip.id }, { replace: true });
            }}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '99px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: filter === chip.id ? '1px solid var(--cyan)' : '1px solid rgba(255, 255, 255, 0.12)',
              background: filter === chip.id ? 'rgba(34, 211, 238, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: filter === chip.id ? '#38bdf8' : '#e2e8f0'
            }}
          >
            {lang === 'ar' ? chip.labelAr : chip.labelEn}
          </button>
        ))}
      </div>

      {searchingLive && <LiquidLoader />}

      {/* Section Header */}
      <div
        className="section__head reveal"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}
      >
        <h2 className="section__title" style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
          {liveSearchResults !== null
            ? lang === 'ar'
              ? `نتائج البحث عن "${query}" (${displayedItems.length})`
              : `Search Results for "${query}" (${displayedItems.length})`
            : lang === 'ar'
            ? '🔥 الأعمال الرائجة والمتاحة للقراءة فوراً'
            : '🔥 Trending Manga & Manhwa Ready to Read'}
        </h2>
        <span style={{ color: 'var(--ink-dim)', fontSize: '0.88rem' }}>
          {displayedItems.length} {lang === 'ar' ? 'عملاً متاحاً' : 'titles'}
        </span>
      </div>

      {/* Grid of Trending Manga and Manhwa Cards */}
      {loading ? (
        <SkeletonGrid count={8} height={340} />
      ) : displayedItems.length === 0 ? (
        <div className="glass reveal" style={{ padding: '2.5rem', textAlign: 'center', borderRadius: '16px' }}>
          <EmptyState
            icon="📚"
            title={lang === 'ar' ? 'لم يتم العثور على أعمال مطابقة' : 'No titles matched your search'}
          >
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setQuery('');
                setFilter('ALL');
                setLiveSearchResults(null);
                loadLibrary();
              }}
              style={{ marginTop: '1rem' }}
            >
              {lang === 'ar' ? 'عرض كافة الأعمال الرائجة' : 'Reset & Show All'}
            </button>
          </EmptyState>
        </div>
      ) : (
        <div className="grid-anime">
          {displayedItems.map((item, idx) => (
            <div
              key={item.id || item.mangalikSlug || idx}
              className="glass show-card reveal"
              style={{
                borderRadius: '16px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animationDelay: `${idx * 0.04}s`,
                border: '1px solid rgba(255, 255, 255, 0.09)',
                transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease'
              }}
            >
              {/* Card Poster with Badges */}
              <div
                style={{ position: 'relative', width: '100%', height: '270px', overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => openItemDetails(item)}
              >
                <img
                  onError={imgFallback}
                  src={item.poster}
                  alt={item.title_en}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {/* Type Badge */}
                <div style={{ position: 'absolute', top: '10px', insetInlineStart: '10px' }}>
                  <span
                    style={{
                      background: item.type === 'MANHWA' ? 'rgba(139, 92, 246, 0.88)' : 'rgba(6, 182, 212, 0.88)',
                      color: '#fff',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '8px',
                      backdropFilter: 'blur(6px)'
                    }}
                  >
                    {item.type === 'MANHWA' ? '⚡ مانهوا' : '📖 مانجا'}
                  </span>
                </div>

                {/* Rating Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    insetInlineEnd: '10px',
                    background: 'rgba(0, 0, 0, 0.78)',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: '#fbbf24',
                    backdropFilter: 'blur(6px)'
                  }}
                >
                  ★ {item.rating}
                </div>

                {/* Status Badge */}
                <div style={{ position: 'bottom', bottom: '10px', insetInlineStart: '10px', position: 'absolute' }}>
                  <span
                    style={{
                      background: 'rgba(0, 0, 0, 0.75)',
                      color: '#e2e8f0',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '6px'
                    }}
                  >
                    {item.status}
                  </span>
                </div>
              </div>

              {/* Card Details */}
              <div style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3
                  onClick={() => openItemDetails(item)}
                  style={{
                    fontSize: '1.02rem',
                    fontWeight: 800,
                    margin: '0 0 0.35rem',
                    lineHeight: 1.35,
                    cursor: 'pointer'
                  }}
                  title={item.title_ar}
                >
                  {lang === 'ar' ? item.title_ar : item.title_en}
                </h3>

                <div style={{ fontSize: '0.78rem', color: 'var(--ink-dim)', marginBottom: '0.65rem' }}>
                  ✍️ {item.author || 'MangaLik'} · {item.release_year || '2024'}
                </div>

                {/* Genre chips */}
                {Array.isArray(item.genres) && item.genres.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                    {item.genres.slice(0, 3).map((g, gi) => (
                      <span
                        key={gi}
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--ink-dim)'
                        }}
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* Synopsis */}
                <p
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--ink-dim)',
                    lineHeight: 1.45,
                    margin: '0 0 1rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {lang === 'ar' ? item.description_ar : item.description_en}
                </p>

                {/* Actions */}
                <div
                  style={{
                    marginTop: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--cyan)' }}>
                    {item.chapters_count} {lang === 'ar' ? 'فصلاً' : 'Chs'}
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => openItemDetails(item)}
                      style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}
                      title={lang === 'ar' ? 'قائمة الفصول' : 'Chapters'}
                    >
                      📑
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => launchReader(item)}
                      style={{ padding: '0.4rem 0.95rem', fontSize: '0.82rem', fontWeight: 700 }}
                    >
                      <span className="btn__shine" />
                      📖 {lang === 'ar' ? 'اقرأ الآن' : 'Read'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= CHAPTERS & DETAILS MODAL ================= */}
      {selectedItem && (
        <Modal
          title={lang === 'ar' ? selectedItem.title_ar : selectedItem.title_en}
          sub={`${selectedItem.type === 'MANHWA' ? '⚡ مانهوا كورية' : '📖 مانجا يابانية'} · ${selectedItem.author}`}
          onClose={() => setSelectedItem(null)}
          wide={true}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
              marginBlockEnd: '1.5rem'
            }}
          >
            {/* Left Cover & Stats */}
            <div style={{ maxWidth: '240px', width: '100%', margin: '0 auto' }}>
              <img
                onError={imgFallback}
                src={selectedItem.poster}
                alt=""
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.4)'
                }}
              />
              <div
                style={{
                  marginTop: '1rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '0.85rem',
                  borderRadius: '10px'
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-dim)', marginBottom: '0.35rem' }}>
                  {lang === 'ar' ? 'الحالة:' : 'Status:'} <strong style={{ color: '#34d399' }}>{selectedItem.status}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-dim)', marginBottom: '0.35rem' }}>
                  {lang === 'ar' ? 'التقييم:' : 'Score:'} <strong style={{ color: '#fbbf24' }}>★ {selectedItem.rating} / 10</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-dim)' }}>
                  {lang === 'ar' ? 'المصدر:' : 'Source:'} <strong style={{ color: '#38bdf8' }}>مانجا ليك (MangaLik)</strong>
                </div>
              </div>

              <button
                type="button"
                className="btn btn--primary"
                onClick={() => launchReader(selectedItem)}
                style={{ width: '100%', marginTop: '0.75rem', fontWeight: 800 }}
              >
                <span className="btn__shine" />
                📖 {lang === 'ar' ? 'بدء القراءة فوراً' : 'Start Reading'}
              </button>
            </div>

            {/* Right: Synopsis & Chapter list */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '1.15rem' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 800 }}>
                  {lang === 'ar' ? 'قصة العمل' : 'Synopsis'}
                </h4>
                <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: '#cbd5e1', margin: 0 }}>
                  {lang === 'ar' ? selectedItem.description_ar : selectedItem.description_en}
                </p>
              </div>

              {/* XP Leveling Tracker */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.1), rgba(139, 92, 246, 0.1))',
                  border: '1px solid rgba(34, 211, 238, 0.25)',
                  borderRadius: '12px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div>
                  <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--cyan)' }}>
                    ⚡ {lang === 'ar' ? 'مكافآت القراءة والنشاط' : 'Reading XP & Otaku Rank'}
                  </strong>
                  <span style={{ fontSize: '0.76rem', color: 'var(--ink-dim)' }}>
                    {lang === 'ar'
                      ? 'قراءة فصول هذا العمل تزيد من دقائق القراءة وترفع مستواك في المنصة'
                      : 'Reading logs activity minutes and levels up your rank'}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={handleRecordReading}
                  disabled={loggingRead}
                  style={{ fontSize: '0.8rem' }}
                >
                  {loggingRead ? (lang === 'ar' ? 'جارٍ التسجيل...' : 'Recording...') : (lang === 'ar' ? 'تسجيل 20 دقيقة (+200 XP)' : 'Log 20m (+200 XP)')}
                </button>
              </div>

              {/* Chapters list */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>
                  📑 {lang === 'ar' ? 'الفصول المتاحة من مانجا ليك' : 'Chapters available on MangaLik'}
                </h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--ink-dim)' }}>
                  {itemChapters.length} {lang === 'ar' ? 'فصل' : 'chapters'}
                </span>
              </div>

              {loadingItemDetails ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <LiquidLoader />
                  <p style={{ fontSize: '0.85rem', color: 'var(--ink-dim)', marginTop: '0.5rem' }}>
                    {lang === 'ar' ? 'جلب الفصول المباشرة من مانجا ليك...' : 'Fetching live chapters from MangaLik...'}
                  </p>
                </div>
              ) : itemChapters.length === 0 ? (
                <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 0.5rem', color: 'var(--ink-dim)', fontSize: '0.85rem' }}>
                    {lang === 'ar' ? 'الفصول جاهزة للقراءة في القارئ المباشر' : 'Chapters ready in reader'}
                  </p>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => launchReader(selectedItem)}
                  >
                    📖 {lang === 'ar' ? 'فتح القارئ فوراً' : 'Open Reader'}
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: '260px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                    paddingInlineEnd: '0.4rem'
                  }}
                >
                  {itemChapters.map((ch, idx) => (
                    <div
                      key={ch.chapterId || ch.slug || ch.number || idx}
                      onClick={() => launchReader(selectedItem, ch.number || ch.slug)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(34, 211, 238, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                      }}
                    >
                      <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc' }}>
                        {ch.title || `الفصل ${ch.number || ch.slug}`}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600 }}>
                        اقرأ 📖
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MOBILE-READY READER MODAL ================= */}
      {readerItem && (
        <MangaNovelReader
          item={readerItem}
          type="manga"
          initialChapter={readerItem.initialChapterNumber}
          onClose={() => setReaderItem(null)}
        />
      )}
    </div>
  );
}
