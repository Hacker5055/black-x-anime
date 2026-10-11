import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import ShowCard, { EpisodeTile } from '../components/ShowCard.jsx';
import { ShowSearch, Modal } from '../components/Modals.jsx';
import { SkeletonGrid, EmptyState, LiquidLoader } from '../components/Loading.jsx';
import { pushToast, imgFallback } from '../hooks/hooks.js';
import MangaNovelReader from '../components/MangaNovelReader.jsx';

export default function Browse() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || 'anime';

  const [activeCategory, setActiveCategory] = useState(initialCategory); // anime | manga | manhwa | novel | book
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [latest, setLatest] = useState(null);
  const [latestError, setLatestError] = useState(false);
  const [query, setQuery] = useState(initialQ);

  // Library reader items (Manga, Manhwa, Novels, Books)
  const [libraryItems, setLibraryItems] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [selectedLibraryItem, setSelectedLibraryItem] = useState(null);
  const [activeChapter, setActiveChapter] = useState(null);
  const [loggingRead, setLoggingRead] = useState(false);
  const [activeReaderItem, setActiveReaderItem] = useState(null);

  // Categories config
  const categories = [
    { id: 'anime', labelAr: '🎬 كل الأنمي', labelEn: '🎬 Anime', icon: '🎬' },
    { id: 'manga', labelAr: '📖 المانجا اليابانية', labelEn: '📖 Manga', icon: '📖' },
    { id: 'manhwa', labelAr: '⚡ المانهوا الكورية', labelEn: '⚡ Manhwa', icon: '⚡' },
    { id: 'novel', labelAr: '📚 الروايات الخفيفة', labelEn: '📚 Light Novels', icon: '📚' },
    { id: 'book', labelAr: '📕 الكتب والمراجع', labelEn: '📕 Books', icon: '📕' }
  ];

  const runSearch = useCallback(async (q) => {
    if (!q?.trim()) { setResults(null); return; }
    setSearching(true);
    try {
      if (activeCategory === 'anime') {
        const d = await api.get(`/api/stream/search?q=${encodeURIComponent(q)}`);
        setResults(d.items || []);
      } else {
        const searchType = activeCategory === 'novel' ? 'novel' : 'manga';
        try {
          const liveRes = await api.get(`/api/search?query=${encodeURIComponent(q)}&type=${searchType}`);
          if (liveRes?.results && liveRes.results.length > 0) {
            const mapped = liveRes.results.map((r, i) => ({
              id: r.id || r.mangaDexId || `res_${i}`,
              mangaDexId: r.mangaDexId,
              title_ar: r.title || r.romajiTitle,
              title_en: r.romajiTitle || r.title || 'Manga',
              poster: r.coverImage?.large || r.coverImage?.extraLarge || r.coverUrl || r.coverImage || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600',
              type: activeCategory.toUpperCase(),
              author: r.author || (r.source === 'mangadex' ? 'MangaDex (مترجم عربي)' : r.source === 'anilist' ? 'AniList' : 'المصدر العربي'),
              rating: r.averageScore ? (r.averageScore / 10).toFixed(1) : '9.3',
              description_ar: r.description || r.synopsisArabic || r.arabicSynopsis || 'متاح بترجمة عربية وفصول مباشرة.',
              description_en: r.description || 'Full Arabic translated chapters available.',
              chapters_count: r.chapters || r.chaptersCount || 40,
              source: r.source
            }));
            setLibraryItems(mapped);
            return;
          }
        } catch (_) {}

        // Fallback to library DB
        const d = await api.get(`/api/content/library?type=${activeCategory.toUpperCase()}&q=${encodeURIComponent(q)}`);
        setLibraryItems(d.items || []);
      }
    } catch {
      if (activeCategory === 'anime') setResults([]);
      else setLibraryItems([]);
    } finally {
      setSearching(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    if (initialQ) runSearch(initialQ);
  }, [initialQ, runSearch]);

  const loadLatest = useCallback(() => {
    setLatest(null);
    setLatestError(false);
    api.get('/api/stream/latest')
      .then((d) => setLatest(d.items || []))
      .catch(() => { setLatest([]); setLatestError(true); });
  }, []);

  const loadLibrary = useCallback((cat) => {
    if (cat === 'anime') return;
    setLoadingLibrary(true);
    api.get(`/api/content/library?type=${cat.toUpperCase()}`)
      .then((res) => {
        setLibraryItems(res.items || []);
      })
      .catch(() => {
        setLibraryItems([]);
      })
      .finally(() => {
        setLoadingLibrary(false);
      });
  }, []);

  useEffect(() => {
    if (activeCategory === 'anime') {
      loadLatest();
    } else {
      loadLibrary(activeCategory);
    }
  }, [activeCategory, loadLatest, loadLibrary]);

  const handleCategoryChange = (catId) => {
    setActiveCategory(catId);
    setSearchParams(query ? { category: catId, q: query } : { category: catId }, { replace: true });
    if (catId !== 'anime') {
      loadLibrary(catId);
    }
  };

  const openLibraryReader = (item) => {
    setActiveReaderItem(item);
  };

  const handleRecordReading = async () => {
    if (!selectedLibraryItem) return;
    setLoggingRead(true);
    try {
      const res = await api.post(`/api/content/library/${selectedLibraryItem.id}/read`, { minutes: 20 });
      pushToast(
        lang === 'ar'
          ? `✓ تم تسجيل 20 دقيقة قراءة! ارتفع مستواك إلى المستوى ${res.currentLevel} (+200 XP)`
          : `✓ 20 mins read recorded! Current Level ${res.currentLevel} (+200 XP)`,
        'success'
      );
    } catch (err) {
      pushToast(err.message || 'Please log in to record reading XP', 'error');
    } finally {
      setLoggingRead(false);
    }
  };

  return (
    <>
      <div className="page-head reveal">
        <h1>⌕ {t('browse.title')}</h1>
        <p>{t('browse.subtitle')}</p>
      </div>

      {/* Categories Switcher Tabs */}
      <div className="media-tabs reveal">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`media-tab-btn ${activeCategory === c.id ? 'active' : ''}`}
            onClick={() => handleCategoryChange(c.id)}
          >
            {lang === 'ar' ? c.labelAr : c.labelEn}
          </button>
        ))}
      </div>

      <div className="filter-bar glass reveal" style={{ gap: '1rem' }}>
        <form
          style={{ display: 'flex', gap: '0.65rem', flex: 1, flexWrap: 'wrap' }}
          onSubmit={(e) => {
            e.preventDefault();
            const q = e.currentTarget.elements.q.value;
            setQuery(q);
            setSearchParams(q ? { category: activeCategory, q } : { category: activeCategory }, { replace: true });
            runSearch(q);
          }}
        >
          <input
            className="input"
            name="q"
            defaultValue={initialQ}
            placeholder={
              activeCategory === 'anime'
                ? t('browse.searchPh')
                : lang === 'ar'
                ? `ابحث في قسم ${categories.find((c) => c.id === activeCategory)?.labelAr}...`
                : `Search ${categories.find((c) => c.id === activeCategory)?.labelEn}...`
            }
            style={{ flex: 1, minWidth: '220px' }}
          />
          <button type="submit" className="btn btn--primary">
            <span className="btn__shine" />
            {t('common.search')}
          </button>
        </form>
        <span className="chip" style={{ cursor: 'default' }}>⚡ {t('browse.sourceNote')}</span>
      </div>

      {searching && <LiquidLoader />}

      {/* ================= SECTION: ANIME CONTENT ================= */}
      {activeCategory === 'anime' && (
        <>
          {results && !searching && (
            <section className="section" style={{ marginBlockStart: '1.25rem' }}>
              <div className="section__head">
                <h2 className="section__title">{t('browse.results', { q: query })}</h2>
              </div>
              {results.length === 0 ? (
                <div className="glass">
                  <EmptyState icon="🔍" title={t('browse.empty')} />
                </div>
              ) : (
                <div className="grid-anime">
                  {results.map((s, i) => (
                    <ShowCard key={`${s.kind}-${s.slug}`} show={s} delay={i} />
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="section">
            <div className="section__head">
              <h2 className="section__title">🔥 {t('browse.latest')}</h2>
            </div>
            {!latest ? (
              <SkeletonGrid count={8} height={280} />
            ) : latestError || latest.length === 0 ? (
              <div className="glass" style={{ padding: '1.5rem' }}>
                <EmptyState icon="📡" title={t('error.upstream')}>
                  <button type="button" className="btn btn--ghost" onClick={loadLatest}>{t('common.retry')}</button>
                </EmptyState>
              </div>
            ) : (
              <div className="grid-episodes">
                {latest.map((it, i) => (
                  <EpisodeTile key={`${it.slug}-${it.episode}`} item={it} delay={i} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ================= SECTION: EXPANDED LIBRARY (MANGA, MANHWA, NOVELS, BOOKS) ================= */}
      {activeCategory !== 'anime' && (
        <section className="section" style={{ marginBlockStart: '1.5rem' }}>
          <div className="section__head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 className="section__title">
              {categories.find((c) => c.id === activeCategory)?.[lang === 'ar' ? 'labelAr' : 'labelEn']}
            </h2>
            <span style={{ color: 'var(--ink-dim)', fontSize: '0.88rem' }}>
              {libraryItems.length} {lang === 'ar' ? 'أعمال متاحة' : 'titles available'}
            </span>
          </div>

          {loadingLibrary ? (
            <SkeletonGrid count={6} height={320} />
          ) : libraryItems.length === 0 ? (
            <div className="glass">
              <EmptyState icon="📚" title={lang === 'ar' ? 'لا توجد نتائج مطابقة' : 'No items found'} />
            </div>
          ) : (
            <div className="grid-anime">
              {libraryItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="glass show-card reveal"
                  style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    animationDelay: `${idx * 0.05}s`
                  }}
                >
                  <div style={{ position: 'relative', width: '100%', height: '260px', overflow: 'hidden' }}>
                    <img
                      onError={imgFallback}
                      src={item.poster}
                      alt={item.title_en}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        insetInlineStart: '10px'
                      }}
                    >
                      <span className={`media-tag-badge media-tag-badge--${item.type?.toLowerCase()}`}>
                        {item.type}
                      </span>
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        insetInlineEnd: '10px',
                        background: 'rgba(0, 0, 0, 0.75)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '99px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: '#fbbf24',
                        backdropFilter: 'blur(6px)'
                      }}
                    >
                      ★ {item.rating}
                    </div>
                  </div>

                  <div style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.35rem', lineHeight: 1.3 }}>
                      {lang === 'ar' ? item.title_ar : item.title_en}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--ink-dim)', marginBottom: '0.65rem' }}>
                      ✍️ {item.author || 'Author'} · {item.release_year || '2024'}
                    </div>

                    <p
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--ink-dim)',
                        lineHeight: 1.45,
                        margin: '0 0 1rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {lang === 'ar' ? item.description_ar : item.description_en}
                    </p>

                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--cyan)' }}>
                        {item.chapters_count} {item.type === 'BOOK' ? (lang === 'ar' ? 'فصل/باب' : 'Chapters') : (lang === 'ar' ? 'فصلاً' : 'Chs')}
                      </span>
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => openLibraryReader(item)}
                        style={{ padding: '0.4rem 0.95rem', fontSize: '0.82rem' }}
                      >
                        <span className="btn__shine" />
                        📖 {lang === 'ar' ? 'استعراض وقراءة' : 'Read Now'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ================= LIBRARY READER MODAL ================= */}
      {selectedLibraryItem && (
        <Modal
          title={lang === 'ar' ? selectedLibraryItem.title_ar : selectedLibraryItem.title_en}
          sub={`${selectedLibraryItem.type} · ${selectedLibraryItem.author}`}
          onClose={() => setSelectedLibraryItem(null)}
          wide={true}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 280px) 1fr', gap: '1.5rem', marginBlockEnd: '1.5rem' }}>
            <div>
              <img
                onError={imgFallback}
                src={selectedLibraryItem.poster}
                alt=""
                style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', border: '1px solid rgba(255, 255, 255, 0.15)' }}
              />
              <div style={{ marginTop: '1rem', background: 'rgba(255, 255, 255, 0.04)', padding: '0.85rem', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-dim)', marginBottom: '0.35rem' }}>
                  {lang === 'ar' ? 'الحالة:' : 'Status:'} <strong style={{ color: '#34d399' }}>{selectedLibraryItem.status}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-dim)', marginBottom: '0.35rem' }}>
                  {lang === 'ar' ? 'التقييم:' : 'Score:'} <strong style={{ color: '#fbbf24' }}>★ {selectedLibraryItem.rating} / 10</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-dim)' }}>
                  {lang === 'ar' ? 'إجمالي الفصول:' : 'Total Chapters:'} <strong>{selectedLibraryItem.chapters_count}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '1.15rem' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 800 }}>
                  {lang === 'ar' ? 'نبذة عن العمل' : 'Synopsis'}
                </h4>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--ink-dim)', margin: 0 }}>
                  {lang === 'ar' ? selectedLibraryItem.description_ar : selectedLibraryItem.description_en}
                </p>
              </div>

              {/* Read & Leveling Action Bar */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.1), rgba(139, 92, 246, 0.1))',
                  border: '1px solid rgba(34, 211, 238, 0.25)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div>
                  <strong style={{ display: 'block', fontSize: '0.92rem', color: 'var(--cyan)' }}>
                    ⚡ {lang === 'ar' ? 'نظام المستويات والنشاط' : 'Leveling Activity Tracker'}
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--ink-dim)' }}>
                    {lang === 'ar'
                      ? 'قراءة هذا العمل تزيد من دقائق القراءة وترفع مستواك (Level & XP) في الموقع'
                      : 'Reading this title rewards read time and levels up your Otaku Rank'}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={handleRecordReading}
                  disabled={loggingRead}
                  style={{ background: 'linear-gradient(135deg, #22d3ee, #8b5cf6)', color: '#fff' }}
                >
                  <span className="btn__shine" />
                  📖 {loggingRead ? (lang === 'ar' ? 'جارٍ التسجيل...' : 'Recording...') : (lang === 'ar' ? 'سجل قراءة (20 دقيقة +200 XP)' : 'Log 20m Read (+200 XP)')}
                </button>
              </div>

              {/* Chapters & Content List */}
              <h4 style={{ margin: '0 0 0.65rem', fontSize: '0.95rem', fontWeight: 700 }}>
                📑 {lang === 'ar' ? 'قائمة الفصول والأجزاء المتاحة' : 'Available Chapters & Volumes'}
              </h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingInlineEnd: '0.4rem' }}>
                {(selectedLibraryItem.chapters || []).map((ch) => (
                  <div
                    key={ch.number}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: activeChapter?.number === ch.number ? 'rgba(34, 211, 238, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: activeChapter?.number === ch.number ? '1px solid var(--cyan)' : '1px solid transparent',
                      cursor: 'pointer'
                    }}
                    onClick={() => setActiveChapter(ch)}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{ch.title}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-dim)' }}>{ch.pages} {lang === 'ar' ? 'صفحة' : 'pages'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
      {/* Interactive Manga & Light Novel Reader */}
      {activeReaderItem && (
        <MangaNovelReader
          item={activeReaderItem}
          type={activeCategory === 'novel' ? 'novel' : 'manga'}
          onClose={() => setActiveReaderItem(null)}
        />
      )}
    </>
  );
}
