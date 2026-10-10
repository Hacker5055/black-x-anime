import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { pushToast } from '../hooks/hooks.js';
import { UserBadges } from '../components/UserBadges.jsx';
import { onCommunitySnapshot, syncCommunityPostToFirestore } from '../firebase.js';

const TOPICS = [
  { id: 'general', nameEn: 'General', nameAr: 'عام', icon: '💬' },
  { id: 'one-piece', nameEn: 'One Piece', nameAr: 'ون بيس', icon: '⚔️' },
  { id: 'jojo', nameEn: 'JoJo Bizarre Adventure', nameAr: 'جوجو', icon: '⚡' },
  { id: 'bleach', nameEn: 'Bleach', nameAr: 'بليتش', icon: '🗡️' },
  { id: 'black-clover', nameEn: 'Black Clover', nameAr: 'بلاك كلوفر', icon: '🍀' },
  { id: 'reviews', nameEn: 'Reviews & Ratings', nameAr: 'مراجعات وتقييمات', icon: '⭐' },
  { id: 'theories', nameEn: 'Episode Theories', nameAr: 'نظريات وتحليلات', icon: '💡' },
  { id: 'memes', nameEn: 'Anime Memes', nameAr: 'ميمز وطرائف', icon: '🎭' }
];

const REACTIONS = [
  { type: 'like', emoji: '👍', labelEn: 'Like', labelAr: 'إعجاب', color: '#22d3ee' },
  { type: 'love', emoji: '❤️', labelEn: 'Love', labelAr: 'أحببته', color: '#f43f5e' },
  { type: 'haha', emoji: '😂', labelEn: 'Haha', labelAr: 'أضحكني', color: '#fbbf24' },
  { type: 'wow', emoji: '🤩', labelEn: 'Wow', labelAr: 'واو', color: '#8b5cf6' },
  { type: 'sad', emoji: '😢', labelEn: 'Sad', labelAr: 'محزن', color: '#60a5fa' }
];

function formatTimeAgo(dateString, lang = 'ar') {
  if (!dateString) return '';
  const now = new Date();
  const past = new Date(dateString);
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return lang === 'ar' ? 'الآن' : 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return lang === 'ar' ? `منذ ${diffMin} د` : `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return lang === 'ar' ? `منذ ${diffHr} س` : `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return lang === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
  return past.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
}

export default function Community({ onOpenAuth }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('general');

  // Composer state
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Active reactions picker & open comment boxes
  const [reactionPickerPostId, setReactionPickerPostId] = useState(null);
  const [openComments, setOpenComments] = useState({}); // postId -> bool
  const [commentsData, setCommentsData] = useState({}); // postId -> array
  const [loadingComments, setLoadingComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({}); // postId -> string
  const [submittingComment, setSubmittingComment] = useState({});

  const isDev = user?.role === 'developer' || user?.email?.toLowerCase() === 'mz0970mmz@gmail.com' || user?.isDeveloper;

  // Load posts from API + bind Firestore real-time snapshot
  const loadPosts = useCallback(async () => {
    try {
      const data = await api.get('/api/community/posts');
      if (data && data.posts) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.warn('API posts load note:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();

    // Bind Firestore real-time listener if available
    const unsub = onCommunitySnapshot((fsPosts) => {
      if (fsPosts && fsPosts.length > 0) {
        // Merge with existing posts to ensure real-time update
        setPosts((prev) => {
          const map = new Map();
          // Put Firestore items first
          fsPosts.forEach((p) => map.set(String(p.id), p));
          // Keep local API items if not present
          prev.forEach((p) => {
            if (!map.has(String(p.id))) {
              map.set(String(p.id), p);
            }
          });
          return Array.from(map.values()).sort((a, b) => {
            if (b.is_pinned !== a.is_pinned) return (b.is_pinned || 0) - (a.is_pinned || 0);
            return new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0);
          });
        });
      }
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [loadPosts]);

  // Handle post creation
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (!user) {
      if (typeof onOpenAuth === 'function') onOpenAuth('login');
      return;
    }

    setSubmitting(true);
    const chosenTopicObj = TOPICS.find((tp) => tp.id === selectedTopic) || TOPICS[0];
    const tagName = lang === 'ar' ? chosenTopicObj.nameAr : chosenTopicObj.nameEn;

    try {
      const payload = {
        content: content.trim(),
        tag: selectedTopic,
        tagName: `${chosenTopicObj.icon} ${tagName}`,
        imageUrl: imageUrl.trim(),
        authorName: user.displayName || user.username || (isDev ? 'Developer MZ' : 'عاشق الأنمي'),
        authorUsername: user.username || '',
        authorAvatar: user.photoURL || user.photoUrl || '',
        authorRole: isDev ? 'developer' : (user.role || 'user'),
        uid: user.uid || user.id || user.email,
        isPinned: isDev && isPinned
      };

      const res = await api.post('/api/community/posts', payload);
      if (res && res.post) {
        setPosts((prev) => [res.post, ...prev]);

        // Also push to Firestore for cross-device real-time sync
        syncCommunityPostToFirestore(res.post);

        setContent('');
        setImageUrl('');
        setShowImageInput(false);
        setIsPinned(false);
        pushToast(t('community.postSuccess'), 'success');
      }
    } catch (err) {
      pushToast(err?.message || 'Failed to publish post', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle or submit reaction
  const handleReact = async (postId, reactionType = 'like') => {
    if (!user) {
      if (typeof onOpenAuth === 'function') onOpenAuth('login');
      return;
    }

    setReactionPickerPostId(null);

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const currentReaction = p.userReaction;
        const isSame = currentReaction === reactionType;
        const newReaction = isSame ? null : reactionType;

        const updatedReactions = { ...(p.reactions || { like: 0, love: 0, haha: 0, wow: 0, sad: 0 }) };
        if (currentReaction && updatedReactions[currentReaction] > 0) {
          updatedReactions[currentReaction]--;
        }
        if (newReaction) {
          updatedReactions[newReaction] = (updatedReactions[newReaction] || 0) + 1;
        }

        const newLikesCount = Math.max(0, (p.likes_count || 0) + (isSame ? -1 : currentReaction ? 0 : 1));

        return {
          ...p,
          userReaction: newReaction,
          reactions: updatedReactions,
          likes_count: newLikesCount
        };
      })
    );

    try {
      const res = await api.post(`/api/community/posts/${postId}/react`, {
        reactionType,
        userId: user.uid || user.id || user.email
      });

      if (res && res.ok) {
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;
            return {
              ...p,
              userReaction: res.userReaction,
              reactions: res.reactions || p.reactions,
              likes_count: res.likesCount !== undefined ? res.likesCount : p.likes_count
            };
          })
        );
      }
    } catch (err) {
      console.warn('React error:', err);
    }
  };

  // Toggle comments and fetch them
  const toggleComments = async (postId) => {
    const nextState = !openComments[postId];
    setOpenComments((prev) => ({ ...prev, [postId]: nextState }));

    if (nextState && !commentsData[postId]) {
      setLoadingComments((prev) => ({ ...prev, [postId]: true }));
      try {
        const res = await api.get(`/api/community/posts/${postId}/comments`);
        if (res && res.comments) {
          setCommentsData((prev) => ({ ...prev, [postId]: res.comments }));
        }
      } catch (err) {
        console.warn('Error loading comments:', err);
      } finally {
        setLoadingComments((prev) => ({ ...prev, [postId]: false }));
      }
    }
  };

  // Submit comment
  const handleAddComment = async (postId) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;

    if (!user) {
      if (typeof onOpenAuth === 'function') onOpenAuth('login');
      return;
    }

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await api.post(`/api/community/posts/${postId}/comments`, {
        content: text,
        authorName: user.displayName || user.username || 'متابع الأنمي',
        authorAvatar: user.photoURL || user.photoUrl || '',
        authorRole: isDev ? 'developer' : (user.role || 'user'),
        userId: user.uid || user.id || user.email
      });

      if (res && res.comment) {
        setCommentsData((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), res.comment]
        }));
        setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
        // Update comments count on post
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comments_count: res.commentsCount || (p.comments_count || 0) + 1 } : p))
        );
      }
    } catch (err) {
      pushToast(err?.message || 'Failed to add comment', 'error');
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Delete post
  const handleDeletePost = async (postId) => {
    if (!window.confirm(t('community.deleteConfirm'))) return;
    try {
      await api.delete(`/api/community/posts/${postId}`, {
        userId: user?.uid || user?.id || user?.email,
        userRole: user?.role
      });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      pushToast(t('toast.deleted'), 'success');
    } catch (err) {
      pushToast(err?.message || 'Delete failed', 'error');
    }
  };

  // Share post
  const handleShare = (post) => {
    const url = window.location.origin + '/community#post-' + post.id;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        pushToast(t('community.linkCopied'), 'success');
      });
    } else {
      pushToast(t('community.linkCopied'), 'success');
    }
  };

  // Filter posts
  const filteredPosts = posts.filter((p) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'trending') return true; // Handled by sorting
    if (activeTab === 'announcements') return p.is_pinned || p.tag === 'announcement' || p.author_role === 'developer';
    if (activeTab === 'theories') return p.tag === 'theories';
    if (activeTab === 'reviews') return p.tag === 'reviews';
    if (activeTab === 'mine') return user && (p.uid === user.uid || p.uid === user.id || p.uid === user.email);
    return p.tag === activeTab;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (activeTab === 'trending') {
      const scoreA = (a.likes_count || 0) * 2 + (a.comments_count || 0) * 3;
      const scoreB = (b.likes_count || 0) * 2 + (b.comments_count || 0) * 3;
      return scoreB - scoreA;
    }
    // Default pinned first, then newest
    if ((b.is_pinned || 0) !== (a.is_pinned || 0)) {
      return (b.is_pinned || 0) - (a.is_pinned || 0);
    }
    return new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0);
  });

  return (
    <div className="community-page">
      {/* ================= Clean Responsive Header ================= */}
      <div className="community-header">
        <div className="community-header__top-row">
          <div className="community-header__title-group">
            <h1 className="community-header__title">
              <span className="community-header__icon">💬</span> {t('community.title')}
            </h1>
            <p className="community-header__desc">{t('community.sub')}</p>
          </div>
          <span className="community-header__badge">
            <span className="live-dot" /> {posts.length} {lang === 'ar' ? 'منشور' : 'posts'}
          </span>
        </div>
      </div>

      <div className="community-layout">
        {/* ================= Main Feed ================= */}
        <div className="community-feed">
          {/* ================= Facebook-style Post Composer Card ================= */}
          <div className="fb-composer glass glass--strong">
            <div className="fb-composer__top">
              <div className="avatar fb-composer__avatar" style={{ background: user?.avatarColor || '#22d3ee' }}>
                {(user?.photoURL || user?.photoUrl) ? (
                  <img src={user.photoURL || user.photoUrl} alt="Avatar" />
                ) : (
                  user?.displayName?.[0]?.toUpperCase() || '👤'
                )}
              </div>

              <div className="fb-composer__input-wrap">
                <textarea
                  className="fb-composer__textarea"
                  rows={content.length > 70 ? 3 : 2}
                  placeholder={
                    user
                      ? t('community.whatsOnYourMind')
                      : t('community.loginPrompt')
                  }
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onClick={() => !user && onOpenAuth && onOpenAuth('login')}
                />
              </div>
            </div>

            {/* Attached Image Preview if entered */}
            {imageUrl && (
              <div className="fb-composer__img-preview">
                <img src={imageUrl} alt="Upload preview" onError={() => setImageUrl('')} />
                <button
                  type="button"
                  className="fb-composer__img-remove"
                  onClick={() => setImageUrl('')}
                  aria-label="Remove image"
                >
                  ✕
                </button>
              </div>
            )}

            {showImageInput && (
              <div className="fb-composer__extra-row">
                <input
                  type="url"
                  className="input input--sm"
                  placeholder={t('community.imageUrl')}
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
            )}

            {/* Composer Footer Actions */}
            <div className="fb-composer__bottom">
              <div className="fb-composer__tools">
                {/* Topic selector */}
                <select
                  className="fb-composer__select"
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  aria-label={t('community.topic')}
                >
                  {TOPICS.map((tp) => (
                    <option key={tp.id} value={tp.id}>
                      {tp.icon} {lang === 'ar' ? tp.nameAr : tp.nameEn}
                    </option>
                  ))}
                </select>

                {/* Add Photo Button */}
                <button
                  type="button"
                  className={`fb-composer__tool-btn ${showImageInput ? 'active' : ''}`}
                  onClick={() => setShowImageInput((v) => !v)}
                  title={lang === 'ar' ? 'إرفاق صورة' : 'Attach Photo'}
                >
                  <span>🖼️</span>
                  <span>{lang === 'ar' ? 'صورة' : 'Photo'}</span>
                </button>

                {/* Developer pin toggle */}
                {isDev && (
                  <label className="fb-composer__pin-toggle" title="تثبيت كإعلان رسمي">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={(e) => setIsPinned(e.target.checked)}
                    />
                    <span>📌 {lang === 'ar' ? 'تثبيت' : 'Pin'}</span>
                  </label>
                )}
              </div>

              <div className="fb-composer__submit-wrap">
                <button
                  type="button"
                  className="btn btn--primary fb-composer__submit"
                  onClick={handleCreatePost}
                  disabled={submitting || !content.trim()}
                >
                  <span className="btn__shine" />
                  {submitting ? t('community.posting') : `➤ ${t('community.post')}`}
                </button>
              </div>
            </div>
          </div>

          {/* ================= Filter Tabs (Facebook style) ================= */}
          <div className="fb-tabs-bar" role="tablist">
            <button
              type="button"
              className={`fb-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              🌐 {t('community.filterAll')}
            </button>
            <button
              type="button"
              className={`fb-tab ${activeTab === 'trending' ? 'active' : ''}`}
              onClick={() => setActiveTab('trending')}
            >
              {t('community.filterTrending')}
            </button>
            <button
              type="button"
              className={`fb-tab ${activeTab === 'announcements' ? 'active' : ''}`}
              onClick={() => setActiveTab('announcements')}
            >
              {t('community.filterAnnouncements')}
            </button>
            <button
              type="button"
              className={`fb-tab ${activeTab === 'theories' ? 'active' : ''}`}
              onClick={() => setActiveTab('theories')}
            >
              {t('community.filterDiscussions')}
            </button>
            <button
              type="button"
              className={`fb-tab ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              {t('community.filterReviews')}
            </button>
            {user && (
              <button
                type="button"
                className={`fb-tab ${activeTab === 'mine' ? 'active' : ''}`}
                onClick={() => setActiveTab('mine')}
              >
                {t('community.filterMine')}
              </button>
            )}
          </div>

          {/* ================= Posts Stream ================= */}
          {loading ? (
            <div className="community-loading">
              <div className="spinner" />
              <span>{t('common.loading')}</span>
            </div>
          ) : sortedPosts.length === 0 ? (
            <div className="community-empty glass">
              <span style={{ fontSize: '3rem' }}>💬</span>
              <h3>{t('community.empty')}</h3>
              <p>{t('community.sub')}</p>
            </div>
          ) : (
            <div className="fb-posts-stream">
              {sortedPosts.map((post) => {
                const isAuthor = user && (post.uid === user.uid || post.uid === user.id || post.uid === user.email);
                const canDelete = isAuthor || isDev;
                const isPostDev = post.author_role === 'developer' || post.uid === 'mz0970mmz@gmail.com' || post.uid === 'dev-mz';
                const userReaction = post.userReaction;
                const currentReactionObj = REACTIONS.find((r) => r.type === userReaction);

                return (
                  <article key={post.id} id={`post-${post.id}`} className={`fb-post-card glass ${post.is_pinned ? 'fb-post-card--pinned' : ''}`}>
                    {/* Pinned banner if pinned */}
                    {post.is_pinned ? (
                      <div className="fb-post-card__pinned-badge">
                        <span>📌</span> {t('community.pinned')}
                      </div>
                    ) : null}

                    {/* Post Header */}
                    <div className="fb-post-card__head">
                      <div className="fb-post-card__author">
                        <div className="avatar fb-post-card__avatar" style={{ background: isPostDev ? '#ec4899' : '#22d3ee' }}>
                          {post.author_avatar ? (
                            <img src={post.author_avatar} alt={post.author_name} />
                          ) : (
                            post.author_name?.[0]?.toUpperCase() || '👤'
                          )}
                        </div>

                        <div className="fb-post-card__meta">
                          <div className="fb-post-card__author-row">
                            <span className="fb-post-card__author-name">{post.author_name}</span>
                            {isPostDev && (
                              <span className="fb-dev-badge" title="Verified Developer">
                                👑 {lang === 'ar' ? 'مطور BLACK X' : 'Developer'}
                              </span>
                            )}
                            <UserBadges badges={post.author_role === 'developer' ? ['dev'] : []} size="sm" />
                          </div>

                          <div className="fb-post-card__sub-meta">
                            <span className="fb-post-card__time">
                              {formatTimeAgo(post.created_at || post.createdAt, lang)}
                            </span>
                            {post.tag_name && (
                              <span className="fb-post-card__tag-pill">
                                {post.tag_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Header menu (delete, share) */}
                      <div className="fb-post-card__actions-top">
                        <button
                          type="button"
                          className="fb-post-card__icon-btn"
                          onClick={() => handleShare(post)}
                          title={t('community.share')}
                        >
                          ↗️
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            className="fb-post-card__icon-btn fb-post-card__icon-btn--danger"
                            onClick={() => handleDeletePost(post.id)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="fb-post-card__body">
                      <p className="fb-post-card__text">{post.content}</p>

                      {post.image_url && (
                        <div className="fb-post-card__media">
                          <img src={post.image_url} alt="Attached media" loading="lazy" />
                        </div>
                      )}
                    </div>

                    {/* Reactions & Comments summary count */}
                    <div className="fb-post-card__counts-bar">
                      <div className="fb-post-card__reactions-summary">
                        {(post.likes_count > 0 || Object.values(post.reactions || {}).some((v) => v > 0)) && (
                          <>
                            <span className="fb-reaction-icons-stack">
                              {post.reactions?.love > 0 && <span>❤️</span>}
                              {post.reactions?.like > 0 && <span>👍</span>}
                              {post.reactions?.haha > 0 && <span>😂</span>}
                              {post.reactions?.wow > 0 && <span>🤩</span>}
                              {post.reactions?.sad > 0 && <span>😢</span>}
                              {!Object.values(post.reactions || {}).some((v) => v > 0) && <span>👍</span>}
                            </span>
                            <span className="fb-counts-num">{post.likes_count || 1}</span>
                          </>
                        )}
                      </div>

                      <div className="fb-post-card__comments-summary">
                        {(post.comments_count || 0) > 0 && (
                          <button
                            type="button"
                            className="fb-link-btn"
                            onClick={() => toggleComments(post.id)}
                          >
                            {post.comments_count} {t('community.comments')}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Main Interaction Buttons Bar (Like, Comment, Share) */}
                    <div className="fb-post-card__interactions">
                      {/* React Button & Floating Picker */}
                      <div
                        className="fb-react-wrap"
                        onMouseEnter={() => setReactionPickerPostId(post.id)}
                        onMouseLeave={() => setReactionPickerPostId(null)}
                      >
                        {/* Reaction Picker Popup on hover/tap */}
                        {reactionPickerPostId === post.id && (
                          <div className="fb-reaction-picker">
                            {REACTIONS.map((r) => (
                              <button
                                key={r.type}
                                type="button"
                                className="fb-reaction-picker__btn"
                                onClick={() => handleReact(post.id, r.type)}
                                title={lang === 'ar' ? r.labelAr : r.labelEn}
                              >
                                <span className="fb-reaction-picker__emoji">{r.emoji}</span>
                                <span className="fb-reaction-picker__label">
                                  {lang === 'ar' ? r.labelAr : r.labelEn}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          className={`fb-action-btn ${userReaction ? 'active' : ''}`}
                          style={{ color: currentReactionObj ? currentReactionObj.color : undefined }}
                          onClick={() => handleReact(post.id, userReaction || 'like')}
                        >
                          <span className="fb-action-btn__icon">
                            {currentReactionObj ? currentReactionObj.emoji : '👍'}
                          </span>
                          <span>
                            {currentReactionObj
                              ? (lang === 'ar' ? currentReactionObj.labelAr : currentReactionObj.labelEn)
                              : t('community.like')}
                          </span>
                        </button>
                      </div>

                      {/* Comment Button */}
                      <button
                        type="button"
                        className={`fb-action-btn ${openComments[post.id] ? 'active' : ''}`}
                        onClick={() => toggleComments(post.id)}
                      >
                        <span className="fb-action-btn__icon">💬</span>
                        <span>{t('community.comment')}</span>
                      </button>

                      {/* Share Button */}
                      <button
                        type="button"
                        className="fb-action-btn"
                        onClick={() => handleShare(post)}
                      >
                        <span className="fb-action-btn__icon">↗️</span>
                        <span>{t('community.share')}</span>
                      </button>
                    </div>

                    {/* Expandable Comments Section */}
                    {openComments[post.id] && (
                      <div className="fb-comments-section">
                        {/* New Comment Input */}
                        <div className="fb-comments-composer">
                          <div className="avatar fb-comments-composer__avatar" style={{ background: user?.avatarColor || '#22d3ee' }}>
                            {(user?.photoURL || user?.photoUrl) ? (
                              <img src={user.photoURL || user.photoUrl} alt="Me" />
                            ) : (
                              user?.displayName?.[0]?.toUpperCase() || '👤'
                            )}
                          </div>
                          <div className="fb-comments-composer__box">
                            <input
                              type="text"
                              className="fb-comments-composer__input"
                              placeholder={t('community.writeComment')}
                              value={commentInputs[post.id] || ''}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddComment(post.id);
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="fb-comments-composer__send"
                              onClick={() => handleAddComment(post.id)}
                              disabled={submittingComment[post.id] || !(commentInputs[post.id] || '').trim()}
                              aria-label="Send comment"
                            >
                              ➤
                            </button>
                          </div>
                        </div>

                        {/* Comments List */}
                        {loadingComments[post.id] ? (
                          <div className="fb-comments-loading">
                            <div className="spinner spinner--sm" />
                            <span>{t('common.loading')}</span>
                          </div>
                        ) : (commentsData[post.id] || []).length === 0 ? (
                          <div className="fb-comments-empty">
                            {lang === 'ar' ? 'كن أول من يعلق على هذا المنشور!' : 'Be the first to comment on this post!'}
                          </div>
                        ) : (
                          <div className="fb-comments-list">
                            {(commentsData[post.id] || []).map((c) => {
                              const isCommDev = c.author_role === 'developer' || c.user_id === 'mz0970mmz@gmail.com';
                              return (
                                <div key={c.id} className="fb-comment-item">
                                  <div className="avatar fb-comment-item__avatar" style={{ background: isCommDev ? '#ec4899' : '#22d3ee' }}>
                                    {c.author_avatar ? (
                                      <img src={c.author_avatar} alt={c.author_name} />
                                    ) : (
                                      c.author_name?.[0]?.toUpperCase() || '👤'
                                    )}
                                  </div>

                                  <div className="fb-comment-item__content">
                                    <div className="fb-comment-bubble">
                                      <div className="fb-comment-bubble__head">
                                        <span className="fb-comment-bubble__author">{c.author_name}</span>
                                        {isCommDev && (
                                          <span className="fb-dev-badge fb-dev-badge--xs">👑 dev</span>
                                        )}
                                      </div>
                                      <div className="fb-comment-bubble__text">{c.content}</div>
                                    </div>
                                    <div className="fb-comment-item__meta">
                                      <span>{formatTimeAgo(c.created_at, lang)}</span>
                                      <button
                                        type="button"
                                        className="fb-link-btn"
                                        onClick={() => pushToast('❤️', 'info')}
                                      >
                                        {t('community.like')}
                                      </button>
                                      <button
                                        type="button"
                                        className="fb-link-btn"
                                        onClick={() => {
                                          setCommentInputs((prev) => ({
                                            ...prev,
                                            [post.id]: `@${c.author_name} `
                                          }));
                                        }}
                                      >
                                        {t('community.reply')}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
