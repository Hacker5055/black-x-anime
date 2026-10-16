import React, { useEffect, useRef, useState } from 'react';
import BottomSheet from './BottomSheet.jsx';
import BxIcon from './BxIcon.jsx';
import { coverForMode } from './dataSaver.js';

export const POST_CATEGORIES = [
  { id: 'discussion', ar: 'نقاش', en: 'Discussion' },
  { id: 'recommend', ar: 'ترشيح', en: 'Recommendation' },
  { id: 'theory', ar: 'نظرية', en: 'Theory' },
  { id: 'review', ar: 'مراجعة', en: 'Review' },
  { id: 'spoiler', ar: 'فيه حرق', en: 'Spoiler' }
];

/** "دلوقتي" / "من 5 د" / "من 3 س" / "من يومين" / a date — from the real createdAt of a post. */
export function postTimeLabel(p, lang) {
  const ar = lang === 'ar';
  const at = Date.parse(p?.createdAt || '');
  if (!Number.isFinite(at)) return p?.time && p.time !== 'الآن' && p.time !== 'Just now' ? p.time : '';
  const sec = Math.max(0, (Date.now() - at) / 1000);
  if (sec < 60) return ar ? 'دلوقتي' : 'now';
  const min = Math.floor(sec / 60);
  if (min < 60) return ar ? `من ${min} د` : `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return ar ? `من ${hr} س` : `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return ar ? (day === 1 ? 'امبارح' : day === 2 ? 'من يومين' : `من ${day} أيام`) : `${day}d`;
  try {
    return new Date(at).toLocaleDateString(ar ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' });
  } catch (_) {
    return '';
  }
}

/** A post is a spoiler when it was flagged, or posted in the «فيه حرق» category (website posts too). */
export function isSpoilerPost(p) {
  return Boolean(p && (p.isSpoiler || p.category === 'spoiler'));
}

/** The anime a post is about, as stored on the post (only what the card needs). */
export function postAnimeSnapshot(anime) {
  if (!anime?.objectID) return null;
  return {
    objectID: String(anime.objectID),
    slug: anime.slug || '',
    titleEn: anime.titleEn || anime.titleRomaji || String(anime.objectID),
    poster: anime.poster || ''
  };
}

/** Search sheet used by the composer to tie a post to an anime. */
function PostAnimePicker({ open, onClose, isRtl, dataSaver, searchAnime, onPick }) {
  const [q, setQ] = useState('');
  const [state, setState] = useState({ loading: false, items: [] });
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setQ('');
    setState({ loading: false, items: [] });
    const t = setTimeout(() => inputRef.current?.focus?.(), 260);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const query = q.trim();
    if (query.length < 2) {
      setState({ loading: false, items: [] });
      return undefined;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    const t = setTimeout(() => {
      searchAnime(query)
        .then((items) => alive && setState({ loading: false, items: Array.isArray(items) ? items.slice(0, 8) : [] }))
        .catch(() => alive && setState({ loading: false, items: [] }));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, open, searchAnime]);

  return (
    <BottomSheet open={open} onClose={onClose} title={isRtl ? 'البوست عن أنهي أنمي؟' : 'Which anime is it about?'} closeLabel={isRtl ? 'إغلاق' : 'Close'}>
      <label className="bx-ep-search bx-post-picker-search">
        <BxIcon name="search" size="1em" />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={isRtl ? 'اكتب اسم الأنمي' : 'Type an anime title'}
          aria-label={isRtl ? 'اسم الأنمي' : 'Anime title'}
          dir="auto"
        />
      </label>
      <div className="bx-post-picker-list">
        {state.loading ? (
          <p className="bx-post-picker-note">
            <BxIcon name="loader" spin className="bx-ico-lead" />
            {isRtl ? 'بيدوّر...' : 'Searching...'}
          </p>
        ) : q.trim().length >= 2 && state.items.length === 0 ? (
          <p className="bx-post-picker-note">{isRtl ? 'مفيش نتايج.' : 'No results.'}</p>
        ) : (
          state.items.map((item) => (
            <button key={item.objectID} type="button" className="bx-alerts-row" onClick={() => onPick(item)}>
              <img src={coverForMode(item.poster, dataSaver)} alt="" loading="lazy" decoding="async" />
              <span className="bx-alerts-copy">
                <span className="bx-alerts-title" dir="auto">
                  {item.titleEn}
                </span>
                <span className="bx-alerts-sub">{[item.year, item.type].filter(Boolean).join(' • ')}</span>
              </span>
              <BxIcon name="plus" />
            </button>
          ))
        )}
      </div>
    </BottomSheet>
  );
}

/**
 * Community feed (one feed, shared with the website): composer (with an optional anime the
 * post is about), posts with a real time, likes, replies, a spoiler cover over posts flagged
 * as spoilers, and a tappable card for the anime a post is about.
 */
export default function CommunityTab({
  pageClassName,
  isRtl,
  lang,
  dataSaver,
  user,
  posts,
  myPostKey,
  draft,
  onDraft,
  category,
  onCategory,
  postAnime,
  onPostAnime,
  onPublish,
  onLike,
  onReply,
  replyingToPostId,
  onReplyingTo,
  replyText,
  onReplyText,
  onSignIn,
  onNeedSignIn,
  pickerOpen,
  onPickerOpen,
  searchAnime,
  onOpenAnime
}) {
  const [revealed, setRevealed] = useState({});

  return (
    <main className={`${pageClassName} bx-community`} style={{ padding: '0.25rem 1rem 1rem' }}>
      {user ? (
        <form onSubmit={onPublish} className="bx-composer">
          <div className="bx-composer-row">
            <span className="bx-post-avatar" aria-hidden="true">
              {(user.displayName?.[0] || user.username?.[0] || 'X').toUpperCase()}
            </span>
            <textarea
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              placeholder={isRtl ? 'شارك رأيك أو نظريتك...' : 'Share your thoughts...'}
              rows={2}
              maxLength={600}
              dir="auto"
              aria-label={isRtl ? 'اكتب بوست' : 'Write a post'}
            />
          </div>
          {postAnime ? (
            <div className="bx-composer-anime">
              <img src={coverForMode(postAnime.poster, dataSaver)} alt="" />
              <span dir="auto">{postAnime.titleEn}</span>
              <button type="button" className="bx-icon-btn bx-icon-btn-sm" onClick={() => onPostAnime(null)} aria-label={isRtl ? 'شيل الأنمي' : 'Remove the anime'}>
                <BxIcon name="close" />
              </button>
            </div>
          ) : null}
          <div className="bx-composer-foot">
            <div className="bx-composer-cats">
              {POST_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`bx-chip bx-chip-sm${category === cat.id ? ' is-active' : ''}`}
                  aria-pressed={category === cat.id}
                  onClick={() => onCategory(cat.id)}
                >
                  {isRtl ? cat.ar : cat.en}
                </button>
              ))}
              {!postAnime ? (
                <button type="button" className="bx-chip bx-chip-sm bx-composer-attach" onClick={() => onPickerOpen(true)}>
                  <BxIcon name="film" size="1em" />
                  {isRtl ? 'عن أنمي' : 'About an anime'}
                </button>
              ) : null}
            </div>
            <button type="submit" className="bx-btn bx-btn-primary bx-btn-sm" disabled={!draft.trim()}>
              {isRtl ? 'نشر' : 'Post'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bx-signin-card">
          <span className="bx-signin-ico" aria-hidden="true">
            <BxIcon name="message" />
          </span>
          <div className="bx-signin-copy">
            <strong>{isRtl ? 'سجّل دخولك عشان تكتب وتعمل لايك' : 'Sign in to post and like'}</strong>
            <span>{isRtl ? 'تقدر تقرا البوستات من غير حساب.' : 'You can read posts without an account.'}</span>
          </div>
          <button type="button" className="bx-btn bx-btn-primary bx-btn-sm" onClick={onSignIn}>
            {isRtl ? 'دخول' : 'Sign in'}
          </button>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="bx-empty">
          <BxIcon name="message" size="2rem" />
          <p>{isRtl ? 'لسه مفيش بوستات. اكتب أول بوست!' : 'No posts yet. Write the first one!'}</p>
        </div>
      ) : (
        <div className="bx-feed bx-stagger">
          {posts.map((p) => {
            const spoiler = isSpoilerPost(p);
            const covered = spoiler && !revealed[p.id];
            const liked = Boolean(myPostKey && Array.isArray(p.likedBy) && p.likedBy.includes(myPostKey));
            const likes = Math.max(0, Number(p.likes) || 0);
            const replies = Array.isArray(p.replies) ? p.replies : [];
            const cat = POST_CATEGORIES.find((c) => c.id === p.category);
            const anime = p.anime && p.anime.objectID ? p.anime : null;
            return (
              <article key={p.id} className="bx-post">
                <header className="bx-post-head">
                  <span className="bx-post-avatar" aria-hidden="true">
                    {(p.author?.[0] || 'X').toUpperCase()}
                  </span>
                  <div className="bx-post-who">
                    <span className="bx-post-author" dir="auto">
                      {p.author}
                    </span>
                    {p.role === 'developer' && <span className="bx-post-role">{isRtl ? 'المطور' : 'Developer'}</span>}
                  </div>
                  <span className="bx-post-time">{postTimeLabel(p, lang)}</span>
                </header>
                {cat && cat.id !== 'discussion' && <span className="bx-post-cat">{isRtl ? cat.ar : cat.en}</span>}
                {anime ? (
                  <button type="button" className="bx-post-anime" onClick={() => onOpenAnime(anime)}>
                    <img src={coverForMode(anime.poster, dataSaver)} alt="" loading="lazy" decoding="async" />
                    <span className="bx-post-anime-copy">
                      <strong dir="auto">{anime.titleEn}</strong>
                      <span>{isRtl ? 'افتح صفحة الأنمي' : 'Open the anime'}</span>
                    </span>
                    <BxIcon name={isRtl ? 'chevron-left' : 'chevron-right'} />
                  </button>
                ) : null}
                {spoiler ? (
                  <div className={`bx-post-spoiler${covered ? ' is-covered' : ''}`}>
                    <p className="bx-post-text" dir="auto" aria-hidden={covered ? 'true' : undefined}>
                      {p.text}
                    </p>
                    {covered ? (
                      <button type="button" className="bx-spoiler-btn" onClick={() => setRevealed((prev) => ({ ...prev, [p.id]: true }))}>
                        <BxIcon name="eye-off" />
                        {isRtl ? 'فيه حرق — اضغط عشان تشوفه' : 'Spoiler — tap to reveal'}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="bx-post-text" dir="auto">
                    {p.text}
                  </p>
                )}
                <footer className="bx-post-actions">
                  <button
                    type="button"
                    className={`bx-post-act${liked ? ' is-on' : ''}`}
                    aria-pressed={liked}
                    aria-label={isRtl ? 'لايك' : 'Like'}
                    onClick={() => onLike(p.id)}
                  >
                    <BxIcon name="heart" filled={liked} />
                    {likes > 0 ? likes : ''}
                  </button>
                  <button
                    type="button"
                    className="bx-post-act"
                    aria-label={isRtl ? 'رد' : 'Reply'}
                    onClick={() => {
                      if (!user) {
                        onNeedSignIn();
                        return;
                      }
                      onReplyingTo(replyingToPostId === p.id ? null : p.id);
                    }}
                  >
                    <BxIcon name="message" />
                    {replies.length > 0 ? replies.length : ''}
                  </button>
                </footer>

                {replies.length > 0 && !covered && (
                  <div className="bx-replies">
                    {replies.map((r) => (
                      <div key={r.id} className="bx-reply">
                        <strong dir="auto">{r.author}</strong>
                        <span dir="auto">{r.text}</span>
                        <time>{postTimeLabel(r, lang)}</time>
                      </div>
                    ))}
                  </div>
                )}

                {replyingToPostId === p.id && user && (
                  <div className="bx-reply-box">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => onReplyText(e.target.value)}
                      placeholder={isRtl ? 'اكتب ردك...' : 'Write a reply...'}
                      maxLength={300}
                      dir="auto"
                    />
                    <button type="button" className="bx-btn bx-btn-primary bx-btn-sm" disabled={!replyText.trim()} onClick={() => onReply(p.id)}>
                      {isRtl ? 'إرسال' : 'Send'}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <PostAnimePicker
        open={pickerOpen}
        onClose={() => onPickerOpen(false)}
        isRtl={isRtl}
        dataSaver={dataSaver}
        searchAnime={searchAnime}
        onPick={(item) => {
          onPostAnime(postAnimeSnapshot(item));
          onPickerOpen(false);
        }}
      />
    </main>
  );
}
