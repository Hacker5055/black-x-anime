import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api.js';
import { pushToast, imgFallback } from '../hooks/hooks.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { LiquidLoader } from './Loading.jsx';

/**
 * Mobile-First Interactive Manga & Manhwa Reader Component
 * Source: MangaLik (مانجا ليك - https://mangalik.net/)
 * Features edge-to-edge vertical webtoon view, tap-to-toggle immersion,
 * auto-scroll hands-free reading, mobile bottom navigation dock, and chapter drawer.
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
  const [serverMode, setServerMode] = useState('proxy'); // 'proxy' | 'direct'

  // Mobile Immersion & UI Controls
  const [showUI, setShowUI] = useState(true);
  const [showChapterDrawer, setShowChapterDrawer] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(1); // 1 (slow), 2 (medium), 3 (fast)
  const [chapterFilter, setChapterFilter] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);

  // Novel Reader State
  const [novelContent, setNovelContent] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [fontSize, setFontSize] = useState(18); // px
  const [novelTheme, setNovelTheme] = useState('amoled'); // 'cyber' | 'sepia' | 'amoled'

  // Bookmarked state
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);

  const pagesContainerRef = useRef(null);
  const readerRootRef = useRef(null);
  const autoScrollTimerRef = useRef(null);

  const mediaId = item?.mangalikSlug || item?.slug || item?.mangaSlayerId || item?.mangaDexId || item?.id || 'solo-swordmaster';
  const isNovel = type === 'novel' || item?.type === 'NOVEL' || item?.format === 'NOVEL';

  // Load Details & Chapters
  useEffect(() => {
    let alive = true;
    setLoadingDetails(true);
    setLoadingChapters(true);

    const loadData = async () => {
      try {
        if (isNovel) {
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
                setSelectedChapter(chRes.value.chapters[0]);
              }
            }
          }
        } else {
          // Manga / Manhwa details & chapters from MangaLik
          const mangaSlug = item?.mangalikSlug || item?.slug || item?.id || item?.mangaSlayerId || 'solo-swordmaster';
          const [detRes, chRes] = await Promise.allSettled([
            api.get(`/api/manga/${mangaSlug}`),
            api.get(`/api/manga/${mangaSlug}/chapters`)
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
            saveHistory(selectedChapter.chapterId, selectedChapter.chapterNumber, 1);
          }
        })
        .catch((err) => console.error(err))
        .finally(() => { if (alive) setLoadingContent(false); });
    } else {
      setLoadingPages(true);
      setCurrentPageIndex(0);
      setAutoScrollActive(false);
      api.get(`/api/manga/chapter/${encodeURIComponent(selectedChapter.chapterId)}/pages`)
        .then((res) => {
          if (alive && res?.pages) {
            setChapterPages(res.pages);
            saveHistory(selectedChapter.chapterId, selectedChapter.chapterNumber, 1);
            // scroll back to top smoothly
            if (pagesContainerRef.current) {
              pagesContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }
        })
        .catch((err) => console.error(err))
        .finally(() => { if (alive) setLoadingPages(false); });
    }

    return () => { alive = false; };
  }, [selectedChapter, isNovel]);

  // Auto-scroll loop for mobile hands-free reading
  useEffect(() => {
    if (!autoScrollActive || readerMode !== 'webtoon') {
      if (autoScrollTimerRef.current) clearInterval(autoScrollTimerRef.current);
      return;
    }

    const speedPx = autoScrollSpeed === 1 ? 2 : autoScrollSpeed === 2 ? 4 : 7;
    autoScrollTimerRef.current = setInterval(() => {
      if (pagesContainerRef.current) {
        pagesContainerRef.current.scrollBy({ top: speedPx, behavior: 'smooth' });
      }
    }, 35);

    return () => {
      if (autoScrollTimerRef.current) clearInterval(autoScrollTimerRef.current);
    };
  }, [autoScrollActive, autoScrollSpeed, readerMode]);

  // Scroll listener for reading progress bar
  const handleScroll = useCallback(() => {
    if (!pagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = pagesContainerRef.current;
    if (scrollHeight <= clientHeight) {
      setScrollProgress(100);
      return;
    }
    const pct = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
    setScrollProgress(Math.min(100, Math.max(0, pct)));
  }, []);

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
          ? (lang === 'ar' ? '★ تمت إضافة العمل إلى قائمتك وتفعيل التنبيهات' : '★ Added to bookmarks')
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

  // Toggle Fullscreen on Mobile / Desktop
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (readerRootRef.current?.requestFullscreen) {
        readerRootRef.current.requestFullscreen().catch(() => {});
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Toggle UI visibility when tapping the screen
  const toggleUIVisibility = (e) => {
    // If user clicked a button or select or drawer, ignore
    if (e.target.closest('button') || e.target.closest('select') || e.target.closest('input') || e.target.closest('.no-toggle')) {
      return;
    }
    setShowUI((prev) => !prev);
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

  // Build Image Proxy URL
  const getProxiedImageUrl = (url) => {
    if (!url) return '';
    if (serverMode === 'direct') {
      if (url.includes('/api/proxy/image?url=')) {
        return decodeURIComponent(url.split('/api/proxy/image?url=')[1]);
      }
      return url;
    }
    if (url.startsWith('/api/proxy/image')) return url;
    return `/api/proxy/image?url=${encodeURIComponent(url)}`;
  };

  const displayTitle = typeof details?.title === 'object'
    ? (details?.title?.english || details?.title?.romaji || details?.title?.native || 'مانجا ليك')
    : (details?.title || item?.title || 'مانجا ليك');

  const displayCover = details?.coverImage?.large || details?.coverImage?.extraLarge || details?.coverUrl || item?.poster || 'https://io.mangalik.net/wp-content/app/lekmanganet/512.png';

  const filteredChapters = chapters.filter((c) => {
    if (!chapterFilter) return true;
    return (
      String(c.chapterNumber).includes(chapterFilter) ||
      (c.title && c.title.toLowerCase().includes(chapterFilter.toLowerCase()))
    );
  });

  return (
    <div
      ref={readerRootRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#040711',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#f8fafc',
        fontFamily: 'inherit',
        userSelect: 'none'
      }}
    >
      {/* Top Reading Progress Bar (always visible) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'rgba(255, 255, 255, 0.1)',
          zIndex: 100
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${scrollProgress}%`,
            background: 'linear-gradient(90deg, #10b981, #06b6d4)',
            transition: 'width 0.15s ease'
          }}
        />
      </div>

      {/* ================= TOP HEADER BAR (AutoHideable) ================= */}
      <header
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 90,
          transform: showUI ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.6rem 0.85rem',
          background: 'linear-gradient(180deg, rgba(4, 7, 17, 0.98) 0%, rgba(4, 7, 17, 0.85) 85%, rgba(4, 7, 17, 0) 100%)',
          backdropFilter: 'blur(12px)',
          gap: '0.5rem'
        }}
      >
        {/* Left: Close & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#fff',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            ✕
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'nowrap' }}>
              <span
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '0.1rem 0.45rem',
                  borderRadius: '99px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}
              >
                ✓ مانجا ليك (MangaLik)
              </span>
              {selectedChapter && (
                <span
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.4rem',
                    borderRadius: '6px',
                    color: '#38bdf8',
                    whiteSpace: 'nowrap'
                  }}
                >
                  فصل {selectedChapter.chapterNumber}
                </span>
              )}
            </div>
            <h3
              style={{
                margin: '0.15rem 0 0',
                fontSize: '0.9rem',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: '#fff'
              }}
              title={displayTitle}
            >
              {displayTitle}
            </h3>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleToggleBookmark}
            disabled={bookmarking}
            style={{
              background: isBookmarked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: isBookmarked ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.12)',
              color: isBookmarked ? '#10b981' : '#cbd5e1',
              borderRadius: '20px',
              padding: '0.35rem 0.65rem',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isBookmarked ? '★ محفوظ' : '☆ حفظ'}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
            title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
          >
            {isFullscreen ? '⛶' : '⛶'}
          </button>
        </div>
      </header>

      {/* ================= MAIN READ VIEWPORT (Mobile Optimized) ================= */}
      <main
        ref={pagesContainerRef}
        onScroll={handleScroll}
        onClick={toggleUIVisibility}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 0, // 0 padding for edge-to-edge mobile viewing
          background: isNovel && novelTheme === 'sepia'
            ? '#fbf0d9'
            : isNovel && novelTheme === 'amoled'
            ? '#000000'
            : '#05070e',
          color: isNovel && novelTheme === 'sepia' ? '#292524' : '#f1f5f9',
          position: 'relative',
          paddingTop: showUI ? '54px' : '0px',
          paddingBottom: showUI ? '68px' : '16px',
          transition: 'padding 0.25s ease'
        }}
      >
        {/* ================= MANGA VIEW ================= */}
        {!isNovel && (
          <div
            style={{
              width: '100%',
              maxWidth: readerMode === 'webtoon' ? `${zoomLevel * 8}px` : '780px',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            {loadingPages ? (
              <div style={{ padding: '6rem 1rem', textAlign: 'center' }}>
                <LiquidLoader />
                <p style={{ marginTop: '1.25rem', color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>
                  {lang === 'ar' ? 'جارٍ جلب صفحات الفصل من سيرفر مانجا ليك بدقة فائقة...' : 'Loading MangaLik pages...'}
                </p>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {lang === 'ar' ? 'سيرفر الترجمة العربية المباشر (https://mangalik.net/)' : 'Live Arabic translation server'}
                </span>
              </div>
            ) : chapterPages.length === 0 ? (
              <div
                style={{
                  margin: '4rem 1rem',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📖</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                  {lang === 'ar' ? 'جارٍ تحميل أو إعداد صفحات هذا الفصل' : 'No pages available'}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.5rem 0 1.25rem' }}>
                  {lang === 'ar' ? 'يمكنك التبديل إلى فصل آخر عبر القائمة السريعة بالأسفل' : 'Please select another chapter from the drawer'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowChapterDrawer(true)}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '24px',
                    padding: '0.6rem 1.4rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  📑 تصفح فصول مانجا ليك
                </button>
              </div>
            ) : readerMode === 'webtoon' ? (
              /* Continuous Webtoon Strip Mode (Mobile standard) */
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center' }}>
                {chapterPages.map((pg, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      width: '100%',
                      background: '#05070e',
                      lineHeight: 0
                    }}
                  >
                    <img
                      src={getProxiedImageUrl(pg.url)}
                      alt={`Page ${idx + 1}`}
                      loading={idx < 3 ? 'eager' : 'lazy'}
                      decoding="async"
                      onError={(e) => {
                        const target = e.currentTarget;
                        const step = Number(target.dataset.errorStep || '0');
                        if (step === 0 && pg.directUrl) {
                          target.dataset.errorStep = '1';
                          target.src = pg.directUrl;
                        } else if (step === 1 && pg.fallbackUrl) {
                          target.dataset.errorStep = '2';
                          target.src = pg.fallbackUrl;
                        } else {
                          imgFallback(e);
                        }
                      }}
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        margin: 0,
                        padding: 0
                      }}
                    />
                    {/* Small page number indicator */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        background: 'rgba(0, 0, 0, 0.65)',
                        color: '#fff',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        backdropFilter: 'blur(4px)',
                        pointerEvents: 'none'
                      }}
                    >
                      {idx + 1} / {chapterPages.length}
                    </div>
                  </div>
                ))}

                {/* End of Chapter Floating Bar */}
                <div
                  style={{
                    width: '100%',
                    padding: '2.5rem 1.5rem 4rem',
                    textAlign: 'center',
                    background: 'linear-gradient(180deg, #05070e 0%, #0b0f19 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                >
                  <div style={{ color: '#10b981', fontWeight: 800, fontSize: '1rem' }}>
                    🎉 نهاية الفصل {selectedChapter?.chapterNumber}
                  </div>

                  {/* Interactive Chapter Reactions Bar */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      padding: '0.65rem 1rem',
                      borderRadius: '16px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {[
                      { emoji: '🔥', label: 'فصل ناري' },
                      { emoji: '🙌', label: 'سينما مطلقة' },
                      { emoji: '😱', label: 'صدمة!' },
                      { emoji: '👑', label: 'أسطوري' },
                      { emoji: '😭', label: 'مؤثر' }
                    ].map((rx) => (
                      <button
                        key={rx.emoji}
                        type="button"
                        onClick={() => pushToast(`${rx.emoji} تم تسجيل تفاعلك (${rx.label}) على الفصل ${selectedChapter?.chapterNumber} (+15 XP)!`, 'success')}
                        style={{
                          padding: '0.38rem 0.75rem',
                          borderRadius: '99px',
                          background: 'rgba(34, 211, 238, 0.1)',
                          border: '1px solid rgba(34, 211, 238, 0.3)',
                          color: '#fff',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {rx.emoji} {rx.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', width: '100%', maxWidth: '380px' }}>
                    <button
                      type="button"
                      disabled={!hasPrevChapter}
                      onClick={goToPrevChapter}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        opacity: hasPrevChapter ? 1 : 0.4,
                        cursor: 'pointer'
                      }}
                    >
                      ◀ الفصل السابق
                    </button>
                    <button
                      type="button"
                      disabled={!hasNextChapter}
                      onClick={goToNextChapter}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: hasNextChapter ? 'linear-gradient(135deg, #10b981, #06b6d4)' : 'rgba(255, 255, 255, 0.08)',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        opacity: hasNextChapter ? 1 : 0.4,
                        cursor: 'pointer'
                      }}
                    >
                      الفصل التالي ▶
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Single Page Mode (Slide by Slide) */
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '100%',
                  padding: '0.5rem'
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    background: '#000',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}
                >
                  <img
                    src={getProxiedImageUrl(chapterPages[currentPageIndex]?.url)}
                    alt={`Page ${currentPageIndex + 1}`}
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                  {/* Tap Left / Right targets on mobile */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentPageIndex > 0) setCurrentPageIndex((p) => p - 1);
                    }}
                    style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '35%', cursor: 'w-resize' }}
                  />
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentPageIndex < chapterPages.length - 1) setCurrentPageIndex((p) => p + 1);
                    }}
                    style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '35%', cursor: 'e-resize' }}
                  />
                </div>

                {/* Bottom page switcher */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    disabled={currentPageIndex <= 0}
                    onClick={() => setCurrentPageIndex((p) => Math.max(0, p - 1))}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.8rem'
                    }}
                  >
                    ◀ السابق
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                    {currentPageIndex + 1} / {chapterPages.length}
                  </span>
                  <button
                    type="button"
                    disabled={currentPageIndex >= chapterPages.length - 1}
                    onClick={() => setCurrentPageIndex((p) => Math.min(chapterPages.length - 1, p + 1))}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.8rem'
                    }}
                  >
                    التالي ▶
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
              maxWidth: '720px',
              padding: '1.25rem',
              lineHeight: 1.85,
              fontSize: `${fontSize}px`,
              direction: 'rtl',
              textAlign: 'justify'
            }}
          >
            {loadingContent ? (
              <div style={{ padding: '5rem 1rem', textAlign: 'center' }}>
                <LiquidLoader />
                <p style={{ marginTop: '1rem', color: '#94a3b8' }}>
                  {lang === 'ar' ? 'جارٍ جلب نص الرواية باللغة العربية...' : 'Fetching chapter text...'}
                </p>
              </div>
            ) : novelContent ? (
              <div>
                <h2
                  style={{
                    fontSize: `${fontSize * 1.25}px`,
                    fontWeight: 800,
                    marginBottom: '1rem',
                    borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                    paddingBottom: '0.75rem',
                    color: novelTheme === 'sepia' ? '#78350f' : '#38bdf8'
                  }}
                >
                  {novelContent.title}
                </h2>
                <div style={{ whiteSpace: 'pre-line', marginBlock: '1.25rem' }}>
                  {novelContent.content}
                </div>
              </div>
            ) : (
              <p>{lang === 'ar' ? 'لا يوجد نص متوفر لهذا الفصل.' : 'No content available.'}</p>
            )}
          </div>
        )}
      </main>

      {/* ================= MOBILE BOTTOM FLOATING DOCK ================= */}
      <footer
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: showUI ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(120%)',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: 90,
          background: 'rgba(8, 12, 24, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '99px',
          padding: '0.4rem 0.65rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
          maxWidth: '92vw',
          width: 'max-content'
        }}
      >
        {/* Prev Chapter */}
        <button
          type="button"
          disabled={!hasPrevChapter}
          onClick={goToPrevChapter}
          aria-label="Previous Chapter"
          style={{
            background: 'transparent',
            border: 'none',
            color: hasPrevChapter ? '#fff' : 'rgba(255,255,255,0.3)',
            padding: '0.35rem 0.5rem',
            fontSize: '0.85rem',
            cursor: hasPrevChapter ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          ◀
        </button>

        {/* Chapters Drawer Button */}
        <button
          type="button"
          onClick={() => setShowChapterDrawer(true)}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#fff',
            borderRadius: '99px',
            padding: '0.35rem 0.85rem',
            fontSize: '0.78rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            whiteSpace: 'nowrap'
          }}
        >
          📑 {selectedChapter ? `فصل ${selectedChapter.chapterNumber}` : 'الفصول'}
        </button>

        {/* Next Chapter */}
        <button
          type="button"
          disabled={!hasNextChapter}
          onClick={goToNextChapter}
          aria-label="Next Chapter"
          style={{
            background: 'transparent',
            border: 'none',
            color: hasNextChapter ? '#fff' : 'rgba(255,255,255,0.3)',
            padding: '0.35rem 0.5rem',
            fontSize: '0.85rem',
            cursor: hasNextChapter ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          ▶
        </button>

        <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.2)' }} />

        {/* Auto Scroll Toggle (Hands-free phone reading) */}
        {!isNovel && readerMode === 'webtoon' && (
          <button
            type="button"
            onClick={() => setAutoScrollActive((a) => !a)}
            style={{
              background: autoScrollActive ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255, 255, 255, 0.08)',
              border: autoScrollActive ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              borderRadius: '99px',
              padding: '0.35rem 0.65rem',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            title={autoScrollActive ? 'إيقاف التمرير التلقائي' : 'تشغيل التمرير التلقائي'}
          >
            {autoScrollActive ? '⏸️ تمرير' : '▶ تمرير'}
          </button>
        )}

        {/* Settings Drawer Button */}
        <button
          type="button"
          onClick={() => setShowSettingsDrawer(true)}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#fff',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.82rem',
            cursor: 'pointer'
          }}
          title="إعدادات القراءة"
        >
          ⚙️
        </button>
      </footer>

      {/* ================= MOBILE BOTTOM SHEET: CHAPTER LIST ================= */}
      {showChapterDrawer && (
        <div
          className="no-toggle"
          onClick={() => setShowChapterDrawer(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#090d1a',
              borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '1.25rem 1rem 2rem',
              maxHeight: '75vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.8)'
            }}
          >
            {/* Drawer Handle */}
            <div style={{ width: '40px', height: '4px', background: 'rgba(255, 255, 255, 0.3)', borderRadius: '99px', margin: '0 auto 1rem' }} />

            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                  📑 فصول مانجا ليك ({chapters.length})
                </h4>
                <span style={{ fontSize: '0.72rem', color: '#10b981' }}>
                  ✓ ترجمة عربية كاملة - MangaLik
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowChapterDrawer(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#cbd5e1',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Quick Search in Chapters */}
            <input
              type="text"
              placeholder="ابحث برقم الفصل..."
              value={chapterFilter}
              onChange={(e) => setChapterFilter(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '0.6rem 0.85rem',
                color: '#fff',
                fontSize: '0.85rem',
                marginBottom: '0.85rem',
                direction: 'rtl'
              }}
            />

            {/* Chapters Scrollable List */}
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '55vh' }}>
              {filteredChapters.map((ch) => {
                const isActive = selectedChapter?.chapterId === ch.chapterId;
                return (
                  <button
                    key={ch.chapterId}
                    type="button"
                    onClick={() => {
                      setSelectedChapter(ch);
                      setShowChapterDrawer(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: '12px',
                      background: isActive ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.2))' : 'rgba(255, 255, 255, 0.03)',
                      border: isActive ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.06)',
                      color: isActive ? '#fff' : '#cbd5e1',
                      cursor: 'pointer',
                      textAlign: 'start'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                        {ch.title || `الفصل ${ch.chapterNumber}`}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                        {ch.scanlationGroup || 'مانجا ليك (MangaLik)'}
                      </div>
                    </div>
                    {isActive && <span style={{ color: '#10b981', fontWeight: 800 }}>✓ قيد القراءة</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= MOBILE BOTTOM SHEET: SETTINGS ================= */}
      {showSettingsDrawer && (
        <div
          className="no-toggle"
          onClick={() => setShowSettingsDrawer(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#090d1a',
              borderTop: '1px solid rgba(255, 255, 255, 0.15)',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '1.25rem 1.25rem 2.5rem',
              maxHeight: '75vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.8)',
              gap: '1.25rem'
            }}
          >
            {/* Drawer Handle */}
            <div style={{ width: '40px', height: '4px', background: 'rgba(255, 255, 255, 0.3)', borderRadius: '99px', margin: '0 auto 0.5rem' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>⚙️ إعدادات تجربة القراءة</h4>
              <button
                type="button"
                onClick={() => setShowSettingsDrawer(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Reading Mode Switcher */}
            {!isNovel && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 700 }}>
                  نمط عرض المانجا والمانهو:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setReaderMode('webtoon')}
                    style={{
                      flex: 1,
                      padding: '0.65rem',
                      borderRadius: '12px',
                      background: readerMode === 'webtoon' ? 'linear-gradient(135deg, #10b981, #06b6d4)' : 'rgba(255,255,255,0.06)',
                      border: readerMode === 'webtoon' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    📜 تمرير ويبتون عمودي
                  </button>
                  <button
                    type="button"
                    onClick={() => setReaderMode('single')}
                    style={{
                      flex: 1,
                      padding: '0.65rem',
                      borderRadius: '12px',
                      background: readerMode === 'single' ? 'linear-gradient(135deg, #10b981, #06b6d4)' : 'rgba(255,255,255,0.06)',
                      border: readerMode === 'single' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    📄 صفحة بصفحة
                  </button>
                </div>
              </div>
            )}

            {/* Auto Scroll Speed */}
            {!isNovel && readerMode === 'webtoon' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 700 }}>
                  سرعة التمرير التلقائي للهاتف:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1, 2, 3].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setAutoScrollSpeed(spd)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: '10px',
                        background: autoScrollSpeed === spd ? '#10b981' : 'rgba(255,255,255,0.06)',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      {spd === 1 ? 'هادئ 1x' : spd === 2 ? 'متوسط 2x' : 'سريع 3x'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Server Mode */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 700 }}>
                سيرفر صور الفصول:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setServerMode('proxy')}
                  style={{
                    flex: 1,
                    padding: '0.55rem',
                    borderRadius: '10px',
                    background: serverMode === 'proxy' ? '#10b981' : 'rgba(255,255,255,0.06)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  🛡️ سيرفر البروكسي (مستقر)
                </button>
                <button
                  type="button"
                  onClick={() => setServerMode('direct')}
                  style={{
                    flex: 1,
                    padding: '0.55rem',
                    borderRadius: '10px',
                    background: serverMode === 'direct' ? '#10b981' : 'rgba(255,255,255,0.06)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  ⚡ سيرفر مباشر
                </button>
              </div>
            </div>

            {/* Reward Reading XP */}
            <button
              type="button"
              onClick={handleRewardXP}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(16, 185, 129, 0.2))',
                border: '1px solid #38bdf8',
                color: '#38bdf8',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              ⚡ تسجيل 15 دقيقة قراءة (+150 XP)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
