import React from 'react';
import BxIcon from './BxIcon.jsx';
import PosterCard from './PosterCard.jsx';
import SectionHead from './SectionHead.jsx';
import HeroSlideScope from './HeroSlideScope.jsx';
import LazyMount from './LazyMount.jsx';
import UpdateBanner from './UpdateBanner.jsx';
import ContinueWatchingRow from './ContinueWatchingRow.jsx';
import BecauseYouWatchedRow from './BecauseYouWatchedRow.jsx';
import { SkeletonHero, SkeletonRow } from './Skeleton.jsx';
import { coverForMode } from './dataSaver.js';

const HERO_SLIDES = 5;

function PosterRail({ title, items, loading, onMore, isRtl, onOpen, onPeek, dataSaver }) {
  if (loading && !items.length) return <SkeletonRow cards={4} cardWidth={118} cardHeight={177} animated={false} />;
  if (!items.length) return null;
  return (
    <section className="bx-section">
      <SectionHead title={title} onMore={onMore} isRtl={isRtl} />
      <div className="bx-row bx-mob-scroll">
        {items.map((item) => (
          <PosterCard key={item.objectID} item={item} onOpen={onOpen} onPeek={onPeek} dataSaver={dataSaver} />
        ))}
      </div>
    </section>
  );
}

/**
 * Home: one hero, then rows that each show something different (no row repeats the
 * same list). Every list comes from the catalogue index; nothing is hard-coded.
 */
export default function HomeTab({
  pageClassName = 'bx-page',
  isRtl,
  lang,
  dataSaver,
  loading,
  lists,
  watchHistory,
  watchedIds,
  mangaHistory,
  favorites,
  genres,
  apkRelease,
  heroPaused,
  onOpen,
  onPeek,
  onStory,
  onToggleFavorite,
  onSeeAll,
  onGenre,
  onOpenManga,
  onMangaLibrary,
  loadSimilar
}) {
  const { popular = [], topRated = [], airing = [], latest = [], movies = [], today = [] } = lists;
  const isFav = (item) => favorites.some((f) => f.objectID === item?.objectID);
  const resumeEpisode = (item) => watchHistory.find((h) => h.objectID === item?.objectID)?.episode || 1;

  return (
    <main className={`${pageClassName} bx-home`}>
      {/* 1. Hero: the five most popular titles */}
      {loading && !popular.length && <SkeletonHero height={480} />}
      <HeroSlideScope count={Math.min(HERO_SLIDES, popular.length)} paused={heroPaused}>
        {(slide, setSlide, swipe) => {
          const hero = popular[slide] || popular[0] || null;
          if (!hero) return null;
          const fav = isFav(hero);
          const meta = [hero.year, hero.type, hero.tags?.[0]].filter(Boolean);
          return (
            <section className="bx-hero" {...swipe}>
              <img
                key={hero.objectID}
                className="bx-hero-img"
                src={coverForMode(hero.poster || hero.banner, dataSaver)}
                alt=""
                decoding="async"
              />
              <div className="bx-hero-shade" aria-hidden="true" />
              <div className="bx-hero-copy" key={`copy-${hero.objectID}`}>
                <div className="bx-hero-meta">
                  {hero.rating ? (
                    <span className="bx-hero-rating">
                      <BxIcon name="star" size="0.95em" filled />
                      {hero.rating}
                    </span>
                  ) : null}
                  {meta.map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
                <h1 className="bx-hero-title" dir="auto">
                  {hero.titleEn}
                </h1>
                <div className="bx-hero-actions">
                  <button type="button" className="bx-btn bx-btn-primary" onClick={() => onOpen(hero, resumeEpisode(hero))}>
                    <BxIcon name="play" filled />
                    {isRtl ? 'تشغيل' : 'Play'}
                  </button>
                  <button type="button" className="bx-btn bx-btn-ghost" onClick={() => onOpen(hero)}>
                    <BxIcon name="info" />
                    {isRtl ? 'التفاصيل' : 'Details'}
                  </button>
                  <button
                    type="button"
                    className={`bx-icon-btn${fav ? ' is-on' : ''}`}
                    onClick={() => onToggleFavorite(hero)}
                    aria-label={fav ? (isRtl ? 'في قائمتي' : 'In my list') : isRtl ? 'أضف لقائمتي' : 'Add to my list'}
                    aria-pressed={fav}
                  >
                    <BxIcon name={fav ? 'check' : 'plus'} />
                  </button>
                </div>
              </div>
              <div className="bx-hero-dots" aria-hidden="true">
                {popular.slice(0, HERO_SLIDES).map((p, i) => (
                  <span key={p.objectID} className={i === slide ? 'is-on' : ''} onClick={() => setSlide(i)} />
                ))}
              </div>
            </section>
          );
        }}
      </HeroSlideScope>

      {/* New APK version available (from /api/app/config) */}
      <UpdateBanner release={apkRelease} lang={lang} />

      {/* 2. Continue watching (real resume positions) */}
      <ContinueWatchingRow
        history={watchHistory}
        isRtl={isRtl}
        dataSaver={dataSaver}
        onResume={(h, ep) =>
          onOpen({ objectID: h.objectID, slug: h.slug, titleEn: h.titleEn, titleAr: h.titleAr, poster: h.poster, banner: h.poster }, ep)
        }
        onInfo={(h) => onPeek({ objectID: h.objectID, slug: h.slug, titleEn: h.titleEn, titleAr: h.titleAr, poster: h.poster, banner: h.poster })}
      />

      {/* 3. Because you watched X (computed on the phone) */}
      <LazyMount minHeight={240} placeholder={<SkeletonRow cards={4} animated={false} />}>
        <BecauseYouWatchedRow
          seed={watchHistory[0]}
          excludeIds={watchedIds}
          loadSimilar={loadSimilar}
          onOpen={onOpen}
          onPeek={onPeek}
          isRtl={isRtl}
          dataSaver={dataSaver}
        />
      </LazyMount>

      {/* 4. Airing today (schedule of this weekday) */}
      {today.length > 0 && (
        <section className="bx-section">
          <SectionHead title={isRtl ? 'بتنزل النهارده' : 'Airing today'} onMore={() => onSeeAll('schedule')} isRtl={isRtl} />
          <div className="bx-row bx-mob-scroll bx-stories">
            {today.slice(0, 14).map((item, idx) => (
              <button
                key={`today-${item.objectID}`}
                type="button"
                className="bx-story"
                onClick={() => onStory({ item, index: idx, pool: today.slice(0, 14) })}
              >
                <span className="bx-story-ring">
                  <img src={coverForMode(item.poster, dataSaver)} alt="" loading="lazy" decoding="async" />
                </span>
                <span className="bx-story-name" dir="auto">
                  {item.titleEn}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 5. Top 10 by rating (an honest title: it is the rating order, not "today") */}
      {topRated.length >= 3 && (
        <LazyMount minHeight={250} placeholder={<SkeletonRow cards={3} cardWidth={150} cardHeight={200} animated={false} />}>
          <section className="bx-section">
            <SectionHead title={isRtl ? 'أعلى 10 تقييماً' : 'Top 10 by rating'} onMore={() => onSeeAll('best_mal_ranked')} isRtl={isRtl} />
            <div className="bx-row bx-mob-scroll bx-top10-row">
              {topRated.slice(0, 10).map((item, idx) => (
                <div key={`top-${item.objectID}`} className="bx-top10">
                  <span className="bx-top10-num" aria-hidden="true">
                    {idx + 1}
                  </span>
                  <PosterCard item={item} onOpen={onOpen} onPeek={onPeek} dataSaver={dataSaver} width={112} />
                </div>
              ))}
            </div>
          </section>
        </LazyMount>
      )}

      {/* 6–8. Distinct catalogue rows */}
      <LazyMount minHeight={250} placeholder={<SkeletonRow cards={4} animated={false} />}>
        <PosterRail
          title={isRtl ? 'بيتعرض دلوقتي' : 'Airing now'}
          items={airing}
          loading={loading}
          onMore={() => onSeeAll('series_fav_count_desc', 'airing')}
          isRtl={isRtl}
          onOpen={onOpen}
          onPeek={onPeek}
          dataSaver={dataSaver}
        />
      </LazyMount>
      <LazyMount minHeight={250} placeholder={<SkeletonRow cards={4} animated={false} />}>
        <PosterRail
          title={isRtl ? 'أحدث الحلقات' : 'Latest episodes'}
          items={latest}
          loading={loading}
          onMore={() => onSeeAll('series_date_created')}
          isRtl={isRtl}
          onOpen={onOpen}
          onPeek={onPeek}
          dataSaver={dataSaver}
        />
      </LazyMount>
      <LazyMount minHeight={250} placeholder={<SkeletonRow cards={4} animated={false} />}>
        <PosterRail
          title={isRtl ? 'أفلام' : 'Movies'}
          items={movies}
          loading={loading}
          onMore={() => onSeeAll('series_fav_count_desc', 'movie')}
          isRtl={isRtl}
          onOpen={onOpen}
          onPeek={onPeek}
          dataSaver={dataSaver}
        />
      </LazyMount>

      {/* 9. Continue reading (manga) */}
      {mangaHistory.length > 0 && (
        <section className="bx-section">
          <SectionHead title={isRtl ? 'كمّل قراءة' : 'Continue reading'} onMore={onMangaLibrary} isRtl={isRtl} />
          <div className="bx-row bx-mob-scroll">
            {mangaHistory.slice(0, 10).map((mh, i) => (
              <button key={`${mh.objectID}-${i}`} type="button" className="bx-read-card" onClick={() => onOpenManga(mh)}>
                <img src={mh.poster_uri} alt="" loading="lazy" decoding="async" />
                <span className="bx-read-copy">
                  <span className="bx-read-title" dir="auto">
                    {mh.name}
                  </span>
                  <span className="bx-read-sub">{isRtl ? `الفصل ${mh.lastChapter}` : `Chapter ${mh.lastChapter}`}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 10. Browse by genre */}
      <section className="bx-section bx-section-last">
        <SectionHead title={isRtl ? 'تصفح حسب النوع' : 'Browse by genre'} isRtl={isRtl} />
        <div className="bx-row bx-chip-row">
          {genres.map((g) => (
            <button key={g.id} type="button" className="bx-chip" onClick={() => onGenre(g)}>
              {isRtl ? g.ar : g.en}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
