import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api.js';
import { pushToast, imgFallback } from '../hooks/hooks.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { LiquidLoader } from './Loading.jsx';

/**
 * Manga & Light Novel Interactive Reader Component
 * Bridges MangaDex Arabic chapters, AniList metadata, and Arabic Scraper Engine.
 */
export default function MangaNovelReader({ item, type = 'manga', onClose, onProgressUpdated }) {
  const { lang } = useI18n();
  const [details, setDetails] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState(null);
  
  // Manga Reader State
  const [chapterPages, setChapterPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [readerMode, setReaderMode] = useState('webtoon'); // 'webtoon' (scroll) | 'single' (page-by-page)
  const [zoomLevel, setZoomLevel] = useState(100);

  // Novel Reader State
  const [novelContent, setNovelContent] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [fontSize, setFontSize] = useState(18); // px
  const [novelTheme, setNovelTheme] = useState('cyber'); // 'cyber' | 'sepia' | 'amoled'

  // Bookmarked state
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);

  const pagesContainerRef = useRef(null);

  const mediaId = item?.mangaDexId || item?.id || item?.slug || 'item-1';
  const isNovel = type === 'novel' || item?.type === 'NOVEL' || item?.format === 'NOVEL';

  // Load Details & Chapters
  useEffect(() => {
    let alive = true;
    setLoadingDetails(true);
    setLoadingChapters(true);

    const loadData = async () => {
      try {
        if (isNovel) {
          // Novel details & chapters
          const novelId = item?.id || 'novel-solo-leveling';
          const [detRes, chRes] = await Promise.allSettled([
            api.get(`/api/novels/${novelId}`),
            api.get(`/api/novels/${novelId}/chapters`)
          ]);

          if (alive) {
            if (detRes.status === 'fulfilled' && detRes.value?.data) {
              setDetails(detRes.value.data);
            } else {
              setDetails(item);
            }

            if (chRes.status === 'fulfilled' && chRes.value?.chapters) {
              setChapters(chRes.value.chapters);
              if (chRes.value.chapters.length > 0) {
                // Auto-select chapter 1
                setSelectedChapter(chRes.value.chapters[0]);
              }
            }
          }
        } else {
          // Manga / Manhwa details & chapters
          const mangaId = item?.id || item?.mangaDexId || '105398';
          const [detRes, chRes] = await Promise.allSettled([
            api.get(`/api/manga/${mangaId}`),
            api.get(`/api/manga/${mangaId}/chapters`)
          ]);

          if (alive) {
            if (detRes.status === 'fulfilled' && detRes.value?.data) {
              setDetails(detRes.value.data);
            } else {
              setDetails(item);
            }

            if (chRes.status === 'fulfilled' && chRes.value?.chapters) {
              setChapters(chRes.value.chapters);
              if (chRes.value.chapters.length > 0) {
                setSelectedChapter(chRes.value.chapters[0]);
              }
            }
          }
        }
      } catch (err) {
        console.error('[Reader Load Error]', err);
      } finally {
        if (alive) {
          setLoadingDetails(false);
          setLoadingChapters(false);
        }
      }
    };

    loadData();

    // Check if bookmarked
    api.get('/api/tracking/bookmarks')
      .then((res) => {
        if (alive && res?.bookmarks) {
          const found = res.bookmarks.some((b) => String(b.media_id) === String(mediaId));
          setIsBookmarked(found);
        }
      })
      .catch(() => {});

    return () => { alive = false; };
  }, [mediaId, isNovel]);

  // When chapter changes, fetch its content
  useEffect(() => {
    if (!selectedChapter) return;
    let alive = true;

    if (isNovel) {
      setLoadingContent(true);
      api.get(`/api/novels/chapter/${selectedChapter.chapterId}`)
        .then((res) => {
          if (alive && res?.chapter) {
            setNovelContent(res.chapter);
            // Save reading history
            saveHistory(selectedChapter.chapterId, selectedChapter.chapterNumber, 1);
          }
        })
        .catch((err) => console.error(err))
        .finally(() => { if (alive) setLoadingContent(false); });
    } else {
      setLoadingPages(true);
      setCurrentPageIndex(0);
      api.get(`/api/manga/chapter/${selectedChapter.chapterId}/pages`)
        .then((res) => {
          if (alive && res?.pages) {
            setChapterPages(res.pages);
            saveHistory(selectedChapter.chapterId, selectedChapter.chapterNumber, 1);
          }
        })
        .catch((err) => console.error(err))
        .finally(() => { if (alive) setLoadingPages(false); });
    }

    return () => { alive = false; };
  }, [selectedChapter, isNovel]);

  // Save Reading Progress
  const saveHistory = async (chapterId, chapterNumber, page = 1) => {
    try {
      const title = details?.title?.english || details?.title?.romaji || details?.title || item?.title || 'Title';
      const cover = details?.coverImage?.large || details?.coverImage?.extraLarge || details?.coverUrl || item?.coverImage || item?.poster || '';
      await api.post('/api/tracking/history', {
        mediaId: String(mediaId),
        chapterId: String(chapterId),
        chapterNumber: String(chapterNumber),
        page: Number(page),
        type: isNovel ? 'novel' : 'manga',
        title: typeof title === 'object' ? (title.english || title.romaji || 'Title') : title,
        coverImage: cover
      });
      if (onProgressUpdated) onProgressUpdated();
    } catch (_) {}
  };

  // Toggle Bookmark
  const handleToggleBookmark = async () => {
    setBookmarking(true);
    try {
      const title = details?.title?.english || details?.title?.romaji || details?.title || item?.title || 'Title';
      const cover = details?.coverImage?.large || details?.coverImage?.extraLarge || details?.coverUrl || item?.coverImage || item?.poster || '';
      const res = await api.post('/api/tracking/bookmark', {
        mediaId: String(mediaId),
        type: isNovel ? 'novel' : 'manga',
        title: typeof title === 'object' ? (title.english || title.romaji || 'Title') : title,
        coverImage: cover
      });
      setIsBookmarked(res.bookmarked);
      pushToast(
        res.bookmarked
          ? (lang === 'ar' ? '★ تمت إضافة العمل إلى قائمتك وتفعيل التنبيهات' : '★ Added to your bookmarks and alert list')
          : (lang === 'ar' ? 'تمت إزالة العمل من قائمتك' : 'Removed from bookmarks'),
        'success'
      );
    } catch (err) {
      pushToast(err.message || 'Error updating bookmark', 'error');
    } finally {
      setBookmarking(false);
    }
  };

  // Record reading XP
  const handleRewardXP = async () => {
    try {
      await api.post('/api/gamification/progress', { minutes: 15, type: 'READ' });
      pushToast(
        lang === 'ar'
          ? '⚡ تم تسجيل 15 دقيقة قراءة وحساب +150 نقطة خبرة (XP) في ملفك الشخصي!'
          : '⚡ 15 min read logged with +150 EXP added to your profile!',
        'success'
      );
    } catch (_) {}
  };

  // Chapter Navigation Helpers
  const currentChapterIndex = chapters.findIndex((c) => c.chapterId === selectedChapter?.chapterId);
  const hasPrevChapter = currentChapterIndex > 0;
  const hasNextChapter = currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1;

  const goToPrevChapter = () => {
    if (hasPrevChapter) setSelectedChapter(chapters[currentChapterIndex - 1]);
  };

  const goToNextChapter = () => {
    if (hasNextChapter) setSelectedChapter(chapters[currentChapterIndex + 1]);
  };

  // Build Image Proxy URL to prevent CORS/hotlink block
  const getProxiedImageUrl = (url) => {
    if (!url) return '';
    return `/api/proxy/image?url=${encodeURIComponent(url)}`;
  };

  const displayTitle = typeof details?.title === 'object'
    ? (details?.title?.english || details?.title?.romaji || details?.title?.native || 'Untitled')
    : (details?.title || item?.title || 'Untitled');

  const displayCover = details?.coverImage?.large || details?.coverImage?.extraLarge || details?.coverUrl || details?.coverImage || item?.poster || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 7, 14, 0.94)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#f8fafc'
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 29, 0.9) 100%)',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '220px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn--ghost btn--sm"
            style={{ borderRadius: '50%', width: '38px', height: '38px', padding: 0 }}
            title={lang === 'ar' ? 'إغلاق القارئ' : 'Close Reader'}
          >
            ✕
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  background: isNovel ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                  color: '#fff',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '99px',
                  textTransform: 'uppercase'
                }}
              >
                {isNovel ? 'Light Novel' : 'Manga / Manhwa'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
                ✓ {lang === 'ar' ? 'مترجم عربي' : 'Arabic Translation'}
              </span>
            </div>
            <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.05rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '350px' }}>
              {displayTitle}
            </h3>
          </div>
        </div>

        {/* Chapter Switcher Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={!hasPrevChapter}
            onClick={goToPrevChapter}
            className="btn btn--ghost btn--sm"
            style={{ opacity: hasPrevChapter ? 1 : 0.4 }}
          >
            {lang === 'ar' ? '◀ الفصل السابق' : '◀ Prev'}
          </button>

          <select
            value={selectedChapter?.chapterId || ''}
            onChange={(e) => {
              const ch = chapters.find((c) => c.chapterId === e.target.value);
              if (ch) setSelectedChapter(ch);
            }}
            style={{
              background: 'rgba(30, 41, 59, 0.85)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '0.4rem 0.75rem',
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {chapters.map((ch) => (
              <option key={ch.chapterId} value={ch.chapterId} style={{ background: '#0f172a', color: '#fff' }}>
                {ch.title || `الفصل ${ch.chapterNumber}`} {ch.scanlationGroup ? `(${ch.scanlationGroup})` : ''}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={!hasNextChapter}
            onClick={goToNextChapter}
            className="btn btn--ghost btn--sm"
            style={{ opacity: hasNextChapter ? 1 : 0.4 }}
          >
            {lang === 'ar' ? 'الفصل التالي ▶' : 'Next ▶'}
          </button>
        </div>

        {/* Action Tools & Bookmarks */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={handleToggleBookmark}
            disabled={bookmarking}
            className={`btn btn--sm ${isBookmarked ? 'btn--primary' : 'btn--ghost'}`}
            style={{ fontSize: '0.82rem' }}
          >
            {isBookmarked ? '★ ' + (lang === 'ar' ? 'في قائمتي' : 'Bookmarked') : '☆ ' + (lang === 'ar' ? 'حفظ ومتابعة' : 'Bookmark')}
          </button>

          <button
            type="button"
            onClick={handleRewardXP}
            className="btn btn--ghost btn--sm"
            style={{ color: '#22d3ee', borderColor: 'rgba(34, 211, 238, 0.4)' }}
            title={lang === 'ar' ? 'تسجيل خبرة القراءة' : 'Claim Reading XP'}
          >
            ⚡ +150 XP
          </button>
        </div>
      </header>

      {/* Main Content Area: Side Details + Reader */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ================= READ VIEWPORT ================= */}
        <main
          ref={pagesContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '1.5rem',
            background: isNovel && novelTheme === 'sepia'
              ? '#fbf0d9'
              : isNovel && novelTheme === 'amoled'
              ? '#000000'
              : 'radial-gradient(ellipse at top, #0d1527 0%, #060913 100%)',
            color: isNovel && novelTheme === 'sepia' ? '#292524' : '#f1f5f9',
            position: 'relative'
          }}
        >
          {/* Controls Overlay Bar */}
          {!isNovel ? (
            /* Manga Controls Bar */
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                marginBottom: '1rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
                padding: '0.4rem 0.85rem',
                borderRadius: '99px',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}
            >
              <button
                type="button"
                className={`btn btn--sm ${readerMode === 'webtoon' ? 'btn--primary' : 'btn--ghost'}`}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.76rem', borderRadius: '99px' }}
                onClick={() => setReaderMode('webtoon')}
              >
                📜 {lang === 'ar' ? 'تمرير ويبتون' : 'Webtoon Scroll'}
              </button>
              <button
                type="button"
                className={`btn btn--sm ${readerMode === 'single' ? 'btn--primary' : 'btn--ghost'}`}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.76rem', borderRadius: '99px' }}
                onClick={() => setReaderMode('single')}
              >
                📄 {lang === 'ar' ? 'صفحة بصفحة' : 'Single Page'}
              </button>
              <div style={{ height: '16px', width: '1px', background: 'rgba(255,255,255,0.2)' }} />
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.76rem' }}
                onClick={() => setZoomLevel((z) => Math.max(60, z - 15))}
              >
                -
              </button>
              <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{zoomLevel}%</span>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.76rem' }}
                onClick={() => setZoomLevel((z) => Math.min(160, z + 15))}
              >
                +
              </button>
            </div>
          ) : (
            /* Novel Controls Bar */
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                marginBottom: '1.25rem',
                display: 'flex',
                gap: '0.65rem',
                alignItems: 'center',
                background: novelTheme === 'sepia' ? 'rgba(240, 225, 195, 0.95)' : 'rgba(15, 23, 42, 0.88)',
                backdropFilter: 'blur(8px)',
                padding: '0.4rem 1rem',
                borderRadius: '99px',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}
            >
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                {lang === 'ar' ? 'حجم الخط:' : 'Font Size:'}
              </span>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ padding: '0.2rem 0.5rem' }}
                onClick={() => setFontSize((s) => Math.max(14, s - 2))}
              >
                A-
              </button>
              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{fontSize}px</span>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ padding: '0.2rem 0.5rem' }}
                onClick={() => setFontSize((s) => Math.min(28, s + 2))}
              >
                A+
              </button>
              <div style={{ height: '16px', width: '1px', background: 'rgba(255,255,255,0.2)' }} />
              <button
                type="button"
                className={`btn btn--sm ${novelTheme === 'cyber' ? 'btn--primary' : 'btn--ghost'}`}
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: '99px' }}
                onClick={() => setNovelTheme('cyber')}
              >
                🌑 Dark Cyber
              </button>
              <button
                type="button"
                className={`btn btn--sm ${novelTheme === 'sepia' ? 'btn--primary' : 'btn--ghost'}`}
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: '99px' }}
                onClick={() => setNovelTheme('sepia')}
              >
                📜 Sepia
              </button>
              <button
                type="button"
                className={`btn btn--sm ${novelTheme === 'amoled' ? 'btn--primary' : 'btn--ghost'}`}
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: '99px' }}
                onClick={() => setNovelTheme('amoled')}
              >
                ⬛ AMOLED
              </button>
            </div>
          )}

          {/* ================= MANGA VIEW ================= */}
          {!isNovel && (
            <div style={{ width: '100%', maxWidth: `${zoomLevel * 8}px`, transition: 'max-width 0.2s ease' }}>
              {loadingPages ? (
                <div style={{ padding: '4rem', textAlign: 'center' }}>
                  <LiquidLoader />
                  <p style={{ marginTop: '1rem', color: '#94a3b8' }}>
                    {lang === 'ar' ? 'جارٍ تحميل صفحات الفصل بدقة فائقة...' : 'Loading high-res pages...'}
                  </p>
                </div>
              ) : chapterPages.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '16px' }}>
                  <h3>{lang === 'ar' ? 'لا تتوفر صفحات لهذا الفصل حالياً' : 'No pages available'}</h3>
                  <p style={{ color: '#94a3b8' }}>{lang === 'ar' ? 'جرب اختيار فصل آخر من القائمة أعلاه' : 'Please select another chapter'}</p>
                </div>
              ) : readerMode === 'webtoon' ? (
                /* Continuous Scroll Mode */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                  {chapterPages.map((pg, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '100%', background: '#000' }}>
                      <img
                        src={getProxiedImageUrl(pg.url)}
                        alt={`Page ${idx + 1}`}
                        loading="lazy"
                        onError={(e) => {
                          if (pg.fallbackUrl && e.target.src !== pg.fallbackUrl) {
                            e.target.src = getProxiedImageUrl(pg.fallbackUrl);
                          } else {
                            imgFallback(e);
                          }
                        }}
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          insetInlineEnd: '8px',
                          background: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          backdropFilter: 'blur(4px)'
                        }}
                      >
                        {idx + 1} / {chapterPages.length}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Single Page Mode */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ position: 'relative', width: '100%', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                    <img
                      src={getProxiedImageUrl(chapterPages[currentPageIndex]?.url)}
                      alt={`Page ${currentPageIndex + 1}`}
                      onError={(e) => {
                        const fallback = chapterPages[currentPageIndex]?.fallbackUrl;
                        if (fallback && e.target.src !== fallback) {
                          e.target.src = getProxiedImageUrl(fallback);
                        } else {
                          imgFallback(e);
                        }
                      }}
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                  </div>

                  {/* Single Page Navigation Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                      type="button"
                      disabled={currentPageIndex <= 0}
                      onClick={() => setCurrentPageIndex((p) => Math.max(0, p - 1))}
                      className="btn btn--ghost btn--sm"
                    >
                      {lang === 'ar' ? '◀ الصفحة السابقة' : '◀ Prev Page'}
                    </button>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                      {currentPageIndex + 1} / {chapterPages.length}
                    </span>
                    <button
                      type="button"
                      disabled={currentPageIndex >= chapterPages.length - 1}
                      onClick={() => setCurrentPageIndex((p) => Math.min(chapterPages.length - 1, p + 1))}
                      className="btn btn--ghost btn--sm"
                    >
                      {lang === 'ar' ? 'الصفحة التالية ▶' : 'Next Page ▶'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= LIGHT NOVEL VIEW ================= */}
          {isNovel && (
            <div
              style={{
                width: '100%',
                maxWidth: '780px',
                lineHeight: 1.85,
                fontSize: `${fontSize}px`,
                direction: 'rtl',
                textAlign: 'justify',
                padding: '1.5rem',
                borderRadius: '16px',
                background: novelTheme === 'sepia' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.03)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
              }}
            >
              {loadingContent ? (
                <div style={{ padding: '4rem', textAlign: 'center' }}>
                  <LiquidLoader />
                  <p style={{ marginTop: '1rem', color: '#94a3b8' }}>
                    {lang === 'ar' ? 'جارٍ جلب نص الفصل باللغة العربية...' : 'Fetching chapter text...'}
                  </p>
                </div>
              ) : novelContent ? (
                <div>
                  <h2
                    style={{
                      fontSize: `${fontSize * 1.3}px`,
                      fontWeight: 800,
                      marginBottom: '1rem',
                      borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                      paddingBottom: '0.75rem',
                      color: novelTheme === 'sepia' ? '#78350f' : '#22d3ee'
                    }}
                  >
                    {novelContent.title}
                  </h2>

                  <div style={{ whiteSpace: 'pre-line', marginBlock: '1.5rem' }}>
                    {novelContent.content}
                  </div>

                  {/* End of Chapter Navigation */}
                  <div
                    style={{
                      marginTop: '3rem',
                      paddingTop: '1.5rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <button
                      type="button"
                      disabled={!hasPrevChapter}
                      onClick={goToPrevChapter}
                      className="btn btn--ghost"
                    >
                      {lang === 'ar' ? '◀ الفصل السابق' : '◀ Prev Chapter'}
                    </button>
                    <button
                      type="button"
                      disabled={!hasNextChapter}
                      onClick={goToNextChapter}
                      className="btn btn--primary"
                    >
                      <span className="btn__shine" />
                      {lang === 'ar' ? 'الفصل التالي ▶' : 'Next Chapter ▶'}
                    </button>
                  </div>
                </div>
              ) : (
                <p>{lang === 'ar' ? 'لا يوجد نص متوفر لهذا الفصل.' : 'No content available.'}</p>
              )}
            </div>
          )}
        </main>

        {/* ================= SIDEBAR: CHAPTERS LIST & METADATA ================= */}
        <aside
          style={{
            width: '320px',
            borderInlineStart: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(10, 15, 29, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Work Summary Card */}
          <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', gap: '0.85rem' }}>
            <img
              src={displayCover}
              onError={imgFallback}
              alt=""
              style={{ width: '65px', height: '90px', borderRadius: '8px', objectFit: 'cover' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.92rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayTitle}
              </h4>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                ★ {details?.averageScore ? `${Math.round(details.averageScore / 10)} / 10` : '9.2 / 10'} · {details?.status || 'ONGOING'}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#22d3ee', fontWeight: 600 }}>
                {chapters.length} {lang === 'ar' ? 'فصل مترجم عربي' : 'Arabic Chapters'}
              </div>
            </div>
          </div>

          {/* Chapters Feed */}
          <div style={{ padding: '0.85rem 1.25rem', fontWeight: 700, fontSize: '0.86rem', color: '#94a3b8' }}>
            📑 {lang === 'ar' ? 'الفصول المتاحة:' : 'Available Chapters:'}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {loadingChapters ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <LiquidLoader />
              </div>
            ) : (
              chapters.map((ch) => {
                const isActive = selectedChapter?.chapterId === ch.chapterId;
                return (
                  <button
                    key={ch.chapterId}
                    type="button"
                    onClick={() => setSelectedChapter(ch)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: isActive ? 'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(139, 92, 246, 0.2))' : 'rgba(255, 255, 255, 0.03)',
                      border: isActive ? '1px solid #22d3ee' : '1px solid rgba(255, 255, 255, 0.05)',
                      color: isActive ? '#fff' : '#cbd5e1',
                      cursor: 'pointer',
                      textAlign: 'start',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700 }}>
                        {ch.title || `الفصل ${ch.chapterNumber}`}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                        {ch.scanlationGroup || 'فريق الترجمة العربي'}
                      </div>
                    </div>
                    {isActive && <span style={{ color: '#22d3ee', fontSize: '0.8rem' }}>▶</span>}
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
