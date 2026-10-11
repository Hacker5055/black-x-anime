import { imgFallback } from '../hooks/hooks.js';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { pushToast } from '../hooks/hooks.js';
import { LiquidLoader, EmptyState } from '../components/Loading.jsx';
import { UserBadges, BADGE_DEFINITIONS } from '../components/UserBadges.jsx';
import OrnamentAvatar from '../ornaments/OrnamentAvatar.jsx';
import OrnamentGallery from '../ornaments/OrnamentGallery.jsx';
import { auth, onProfileSnapshot, onDeveloperProfileSnapshot } from '../firebase.js';

// Preset high quality anime character avatars for quick selection
const PRESET_AVATARS = [
  { name: 'Luffy', url: 'https://s4.anilist.co/file/anilistcdn/character/large/b40-I2Dk58fN7QnJ.png' },
  { name: 'Gojo', url: 'https://s4.anilist.co/file/anilistcdn/character/large/b127492-tT3qGf1rLqPn.png' },
  { name: 'Zoro', url: 'https://s4.anilist.co/file/anilistcdn/character/large/b62-P01Yf0hR1E44.png' },
  { name: 'Levi', url: 'https://s4.anilist.co/file/anilistcdn/character/large/b45627-8K3q3r4a.png' },
  { name: 'Tanjiro', url: 'https://s4.anilist.co/file/anilistcdn/character/large/b126071-G4M5qX.png' },
  { name: 'Naruto', url: 'https://s4.anilist.co/file/anilistcdn/character/large/b17-7V4A.png' },
  { name: 'Sung Jinwoo', url: 'https://s4.anilist.co/file/anilistcdn/character/large/b169550-yU8a.png' },
  { name: 'Sukuna', url: 'https://s4.anilist.co/file/anilistcdn/character/large/b133889-qR9a.png' }
];

const PRESET_BANNERS = [
  { label: 'Cyberpunk Tokyo', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Dark Nebula', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Sakura Sunset', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Shadow Monarch', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Anime Skyline', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Neon Samurai', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop&q=80' }
];

const PRESET_FRAMES = [
  { id: 'default', labelAr: 'بدون إطار (طبيعي)', labelEn: 'Default (Clean)', icon: '⚪', color: '#94a3b8' },
  { id: 'royal-flame', labelAr: 'لهب التنين الملكي 🔥', labelEn: 'Royal Flame 🔥', icon: '🔥', color: '#f97316' },
  { id: 'cyber-neon', labelAr: 'نيون سايبربانك ⚡', labelEn: 'Cyber Neon ⚡', icon: '⚡', color: '#22d3ee' },
  { id: 'shadow-monarch', labelAr: 'هالة ملك الظلال 👑', labelEn: 'Shadow Monarch 👑', icon: '👑', color: '#8b5cf6' },
  { id: 'imperial-gold', labelAr: 'التاج الذهبي ⚜️', labelEn: 'Imperial Gold ⚜️', icon: '⚜️', color: '#eab308' },
  { id: 'sakura-blossom', labelAr: 'أزهار الساكورا 🌸', labelEn: 'Sakura Blossom 🌸', icon: '🌸', color: '#f472b6' },
  { id: 'prismatic-diamond', labelAr: 'الماسة الكريستالية 💎', labelEn: 'Prismatic Diamond 💎', icon: '💎', color: '#38bdf8' }
];

const PALETTE = ['#22d3ee', '#8b5cf6', '#f472b6', '#a3e635', '#fb923c', '#f87171', '#60a5fa', '#eab308'];

export default function ProfileDashboard({ onOpenAuth }) {
  const { t, lang, formatNumber } = useI18n();
  const { user, stats, updateProfile, applyRealtimeProfileUpdate, refresh, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  const isDeveloper = user?.role === 'developer' || user?.email?.toLowerCase() === 'mz0970mmz@gmail.com' || user?.isDeveloper;

  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(urlTab === 'developer' && isDeveloper ? 'developer' : (urlTab || 'profile'));

  useEffect(() => {
    if (urlTab === 'developer' && isDeveloper) {
      setActiveTab('developer');
    }
  }, [urlTab, isDeveloper]);

  /* ---------------- Profile & Customization State ---------------- */
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [avatarColor, setAvatarColor] = useState('#22d3ee');
  const [bio, setBio] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [frameStyle, setFrameStyle] = useState('default');
  const [bannerStyle, setBannerStyle] = useState('off');
  const [ornamentQuality, setOrnamentQuality] = useState('auto');
  const [ornament3d, setOrnament3d] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  /* ---------------- Social, Gamification & Referrals State ---------------- */
  const [gamificationStats, setGamificationStats] = useState(null);
  const [socialNetwork, setSocialNetwork] = useState(null);
  const [referralData, setReferralData] = useState(null);
  const [followInputName, setFollowInputName] = useState('');
  const [busyFollow, setBusyFollow] = useState(false);
  const [invitingFriend, setInvitingFriend] = useState(false);
  const [syncingActivity, setSyncingActivity] = useState(false);

  /* ---------------- Support Tickets (Admin / Dev) State ---------------- */
  const [adminTickets, setAdminTickets] = useState([]);
  const [loadingAdminTickets, setLoadingAdminTickets] = useState(false);
  const [ticketFilter, setTicketFilter] = useState('ALL'); // ALL | OPEN | RESOLVED
  const [adminReplies, setAdminReplies] = useState({}); // ticketId -> string
  const [replyingTicketId, setReplyingTicketId] = useState(null);

  /* ---------------- Developer Tools State ---------------- */
  const [footerTagline, setFooterTagline] = useState('');
  const [footerNotice, setFooterNotice] = useState('');
  const [footerSaving, setFooterSaving] = useState(false);

  const [userStats, setUserStats] = useState(null);
  const [loadingUserStats, setLoadingUserStats] = useState(false);

  // Badge granting modal state
  const [badgeModalUser, setBadgeModalUser] = useState(null);
  const [selectedBadges, setSelectedBadges] = useState([]);
  const [savingBadges, setSavingBadges] = useState(false);

  const openBadgeModal = (targetUser) => {
    setBadgeModalUser(targetUser);
    setSelectedBadges(targetUser.badges || []);
  };

  const toggleBadge = (badgeId) => {
    setSelectedBadges((prev) =>
      prev.includes(badgeId) ? prev.filter((b) => b !== badgeId) : [...prev, badgeId]
    );
  };

  const handleSaveBadges = async () => {
    if (!badgeModalUser) return;
    setSavingBadges(true);
    try {
      const res = await api.put(`/api/dev/users/${badgeModalUser.id}/badges`, { badges: selectedBadges });
      if (res?.ok) {
        setUserStats((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            users: (prev.users || []).map((u) => u.id === badgeModalUser.id ? { ...u, badges: selectedBadges } : u)
          };
        });
        if (user?.id === badgeModalUser.id) {
          refresh?.();
        }
        pushToast(lang === 'ar' ? 'تم تحديث شارات الحساب بنجاح!' : 'Badges updated successfully!', 'success');
        setBadgeModalUser(null);
      }
    } catch (err) {
      pushToast(err.message || 'Failed to update badges', 'error');
    } finally {
      setSavingBadges(false);
    }
  };

  const [diagnostics, setDiagnostics] = useState(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);

  const [systemLogs, setSystemLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Initialize profile form and load feature data
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setUsername(user.username || '');
      setPhotoUrl(user.photoUrl || user.photoURL || '');
      setAvatarColor(user.avatarColor || '#22d3ee');
      setBio(user.bio || '');

      // Load customization (banner, frames)
      api.get('/api/profile/profile')
        .then((res) => {
          if (res?.data) {
            if (res.data.bannerUrl) setBannerUrl(res.data.bannerUrl);
            if (res.data.frameStyle) setFrameStyle(res.data.frameStyle);
            if (res.data.bannerStyle) setBannerStyle(res.data.bannerStyle);
          }
        })
        .catch(() => {});

      // Load gamification stats (level, xp, rank)
      api.get('/api/gamification/stats')
        .then((res) => {
          if (res?.data) setGamificationStats(res.data);
        })
        .catch(() => {});

      // Load network (followers, following)
      if (user.username) {
        api.get(`/api/community/network/${encodeURIComponent(user.username)}`)
          .then((res) => setSocialNetwork(res))
          .catch(() => {});
      }

      // Load referrals
      api.get('/api/gamification/referrals')
        .then((res) => {
          if (res?.data) setReferralData(res.data);
        })
        .catch(() => {});
    }
  }, [user]);

  // Real-time listener: pulls latest username and profile image from Firestore across all devices
  useEffect(() => {
    if (!user) return;
    const targetUid = user.firebaseUid || auth.currentUser?.uid || (isDeveloper ? 'developer' : String(user.id));

    const handleProfileUpdate = (data) => {
      if (!data) return;
      if (data.username) setUsername(data.username);
      if (data.displayName) setDisplayName(data.displayName);
      const photo = data.photoUrl || data.photoURL;
      if (photo !== undefined) setPhotoUrl(photo || '');
      if (data.avatarColor) setAvatarColor(data.avatarColor);
      if (data.bio !== undefined) setBio(data.bio || '');
      applyRealtimeProfileUpdate?.(data);
    };

    const unsubUser = targetUid ? onProfileSnapshot(targetUid, handleProfileUpdate) : () => {};

    const unsubDev = isDeveloper
      ? onDeveloperProfileSnapshot(handleProfileUpdate)
      : () => {};

    const unsubDevDoc = isDeveloper && targetUid !== 'developer'
      ? onProfileSnapshot('developer', handleProfileUpdate)
      : () => {};

    return () => {
      unsubUser();
      unsubDev();
      unsubDevDoc();
    };
  }, [user?.firebaseUid, user?.id, isDeveloper, applyRealtimeProfileUpdate]);

  // Load site settings & dev data when on developer tab
  const loadDevData = useCallback(async () => {
    if (!isDeveloper) return;
    try {
      const footerData = await api.get('/api/settings/footer');
      setFooterTagline(footerData.tagline || '');
      setFooterNotice(footerData.notice || '');
    } catch {}

    setLoadingUserStats(true);
    try {
      const statsData = await api.get('/api/dev/users-stats');
      setUserStats(statsData);
    } catch {} finally {
      setLoadingUserStats(false);
    }

    setLoadingLogs(true);
    try {
      const logsData = await api.get('/api/dev/logs');
      setSystemLogs(logsData.logs || []);
    } catch {} finally {
      setLoadingLogs(false);
    }

    setLoadingAdminTickets(true);
    try {
      const ticketsRes = await api.get('/api/support/admin/tickets');
      setAdminTickets(ticketsRes.tickets || []);
    } catch {} finally {
      setLoadingAdminTickets(false);
    }
  }, [isDeveloper]);

  useEffect(() => {
    if (activeTab === 'developer') {
      loadDevData();
    }
  }, [activeTab, loadDevData]);

  if (authLoading) return <LiquidLoader />;

  if (!user) {
    return (
      <div className="glass" style={{ padding: '3rem', textAlign: 'center' }}>
        <EmptyState icon="🔒" title={t('error.authRequired')} sub={t('dashboard.loginPrompt')}>
          <button type="button" className="btn btn--primary" onClick={() => onOpenAuth?.('login')}>
            <span className="btn__shine" />
            {t('nav.login')}
          </button>
        </EmptyState>
      </div>
    );
  }

  /* ---------------- Phone / Device Image Upload Handler ---------------- */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      pushToast(lang === 'ar' ? 'يرجى اختيار ملف صورة صالح' : 'Please choose a valid image file', 'error');
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress/resize image to avatar scale (max 360x360) via Canvas
        const canvas = document.createElement('canvas');
        const maxDim = 360;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setPhotoUrl(dataUrl);
        setUploadingImage(false);
        pushToast(lang === 'ar' ? 'تم اختيار وتجهيز الصورة من هاتفك بنجاح!' : 'Photo loaded from device successfully!', 'success');
      };
      img.onerror = () => {
        setUploadingImage(false);
        pushToast(lang === 'ar' ? 'تعذر قراءة الصورة' : 'Could not read image', 'error');
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      setUploadingImage(false);
      pushToast(lang === 'ar' ? 'حدث خطأ أثناء قراءة الملف' : 'File read error', 'error');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  /* ---------------- Save Profile & Customization Handler ---------------- */
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        displayName,
        username,
        photoUrl,
        avatarColor,
        bio
      });

      // Save banner and frame style to social customization store
      try {
        await api.put('/api/profile/customize', {
          bannerUrl: bannerUrl.trim(),
          frameStyle,
          bannerStyle
        });
      } catch (custErr) {
        console.warn('Customization save notice:', custErr);
      }

      try {
        window.dispatchEvent(new CustomEvent('blackx:ornaments-updated', {
          detail: { frameStyle, bannerStyle }
        }));
      } catch { /* no DOM */ }

      pushToast(t('profile.savedSuccess'), 'success');
      await refresh();
    } catch (err) {
      pushToast(err.message || t('auth.errGeneric'), 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- Follow & Social Handlers ---------------- */
  const handleFollowUser = async (e) => {
    e?.preventDefault?.();
    const target = followInputName.trim();
    if (!target || busyFollow) return;
    setBusyFollow(true);
    try {
      await api.post('/api/community/follow', { targetUsername: target });
      pushToast(lang === 'ar' ? `✓ تمت متابعة ${target} بنجاح!` : `Followed @${target}!`, 'success');
      setFollowInputName('');
      if (user?.username) {
        const net = await api.get(`/api/community/network/${encodeURIComponent(user.username)}`);
        setSocialNetwork(net);
      }
    } catch (err) {
      pushToast(err.message || 'Follow failed', 'error');
    } finally {
      setBusyFollow(false);
    }
  };

  const handleUnfollowUser = async (targetUsername) => {
    if (busyFollow) return;
    setBusyFollow(true);
    try {
      await api.post('/api/community/unfollow', { targetUsername });
      pushToast(lang === 'ar' ? `تم إلغاء متابعة ${targetUsername}` : `Unfollowed @${targetUsername}`, 'info');
      if (user?.username) {
        const net = await api.get(`/api/community/network/${encodeURIComponent(user.username)}`);
        setSocialNetwork(net);
      }
    } catch (err) {
      pushToast(err.message || 'Unfollow failed', 'error');
    } finally {
      setBusyFollow(false);
    }
  };

  /* ---------------- Referral Mock Invite Handler ---------------- */
  const handleMockInvite = async () => {
    setInvitingFriend(true);
    try {
      const res = await api.post('/api/gamification/referrals/mock-invite');
      pushToast(`✓ ${res.message}`, 'success');
      if (res?.data?.isVipUnlocked) {
        pushToast(
          lang === 'ar'
            ? '👑 مبروك! وصلت إلى 3 دعوات وفزت باشتراك VIP Basic مجاناً!'
            : '👑 Congratulations! You invited 3 friends and unlocked VIP Basic free!',
          'success'
        );
      }
      const refRes = await api.get('/api/gamification/referrals');
      if (refRes?.data) setReferralData(refRes.data);
      refresh?.();
    } catch (err) {
      pushToast(err.message || 'Error', 'error');
    } finally {
      setInvitingFriend(false);
    }
  };

  /* ---------------- Leveling & Activity Simulation Handler ---------------- */
  const handleSimulateActivity = async (type, sessionMinutes) => {
    setSyncingActivity(true);
    try {
      const res = await api.post('/api/gamification/sync-time', { type, sessionMinutes });
      pushToast(
        lang === 'ar'
          ? `✓ تم تسجيل النشاط! ${type === 'watch' ? 'مشاهدة أنمي' : 'قراءة أعمال'} (+${sessionMinutes * 10} XP)`
          : `✓ Activity logged! ${type === 'watch' ? 'Anime watch' : 'Reading session'} (+${sessionMinutes * 10} XP)`,
        'success'
      );
      if (res?.levelUp) {
        pushToast(
          lang === 'ar'
            ? `🎉 مبروك! ارتقيت إلى المستوى الجديد: Level ${res.newLevel}!`
            : `🎉 Level Up! You reached Level ${res.newLevel}!`,
          'success'
        );
      }
      const gRes = await api.get('/api/gamification/stats');
      if (gRes?.data) setGamificationStats(gRes.data);
    } catch (err) {
      pushToast(err.message || 'Error', 'error');
    } finally {
      setSyncingActivity(false);
    }
  };

  /* ---------------- Admin: Reply to Support Ticket ---------------- */
  const handleReplyAdminTicket = async (ticketId) => {
    const replyText = adminReplies[ticketId]?.trim();
    if (!replyText) {
      pushToast(lang === 'ar' ? 'يرجى كتابة نص الرد أولاً' : 'Please type a reply message', 'error');
      return;
    }
    setReplyingTicketId(ticketId);
    try {
      const res = await api.post(`/api/support/admin/tickets/${ticketId}/reply`, {
        reply: replyText,
        status: 'RESOLVED'
      });
      if (res?.success) {
        pushToast(lang === 'ar' ? '✓ تم إرسال الرد وحل التذكرة بنجاح!' : 'Reply sent & ticket resolved!', 'success');
        setAdminReplies((prev) => ({ ...prev, [ticketId]: '' }));
        // Refresh admin tickets
        const tRes = await api.get('/api/support/admin/tickets');
        setAdminTickets(tRes.tickets || []);
      }
    } catch (err) {
      pushToast(err.message || 'Failed to reply to ticket', 'error');
    } finally {
      setReplyingTicketId(null);
    }
  };

  /* ---------------- Developer: Update Footer ---------------- */
  const handleUpdateFooter = async (e) => {
    e.preventDefault();
    setFooterSaving(true);
    try {
      await api.put('/api/settings/footer', {
        tagline: footerTagline,
        notice: footerNotice
      });
      pushToast(t('dev.footerUpdated'), 'success');
      // trigger page-level reload or broadcast
      window.dispatchEvent(new CustomEvent('site_settings_updated'));
    } catch (err) {
      pushToast(err.message || t('auth.errGeneric'), 'error');
    } finally {
      setFooterSaving(false);
    }
  };

  /* ---------------- Developer: Run Diagnostics ---------------- */
  const handleRunDiagnostics = async () => {
    setRunningDiagnostics(true);
    try {
      const data = await api.get('/api/dev/diagnostics');
      setDiagnostics(data);
      pushToast('Diagnostics completed', 'success');
      // Refresh logs
      const logsData = await api.get('/api/dev/logs');
      setSystemLogs(logsData.logs || []);
    } catch (err) {
      pushToast('Diagnostics run failed: ' + err.message, 'error');
    } finally {
      setRunningDiagnostics(false);
    }
  };

  /* ---------------- Developer: Trigger Test Log ---------------- */
  const handleTestPing = async () => {
    try {
      await api.post('/api/dev/test-log', {
        level: 'info',
        message: `Diagnostic ping by developer ${user.email} at ${new Date().toLocaleTimeString()}`
      });
      pushToast('Test diagnostic event emitted', 'success');
      const logsData = await api.get('/api/dev/logs');
      setSystemLogs(logsData.logs || []);
    } catch (err) {
      pushToast(err.message, 'error');
    }
  };

  return (
    <div className="container" style={{ paddingBlock: '1.5rem 3.5rem' }}>
      {/* Header */}
      <div style={{ marginBlockEnd: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)', margin: 0, fontWeight: 800 }}>
              {t('profile.title')}
            </h1>
            <p style={{ color: 'var(--ink-dim)', margin: '0.4rem 0 0', fontSize: '0.95rem' }}>
              {t('profile.subtitle')}
            </p>
          </div>

          {/* Role Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {isDeveloper ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 1.1rem',
                  borderRadius: '99px',
                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(139, 92, 246, 0.2))',
                  border: '1px solid rgba(236, 72, 153, 0.5)',
                  color: '#f472b6',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  boxShadow: '0 0 20px rgba(236, 72, 153, 0.25)'
                }}
              >
                🛡️ {t('profile.roleDeveloper')} · {user.email}
              </span>
            ) : (
              <span
                style={{
                  padding: '0.4rem 0.95rem',
                  borderRadius: '99px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'var(--ink-dim)',
                  fontWeight: 600,
                  fontSize: '0.84rem'
                }}
              >
                {t('profile.roleUser')}
              </span>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.75rem', overflowX: 'auto' }}>
          <button
            type="button"
            className={`chip ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
            style={{ fontSize: '0.92rem', padding: '0.55rem 1.25rem', whiteSpace: 'nowrap' }}
          >
            👤 {lang === 'ar' ? 'الملف والتخصيص' : 'Profile & Look'}
          </button>
          <button
            type="button"
            className={`chip ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
            style={{ fontSize: '0.92rem', padding: '0.55rem 1.25rem', whiteSpace: 'nowrap' }}
          >
            🏆 {lang === 'ar' ? 'المستويات والنشاط' : 'Levels & XP'}
          </button>
          <button
            type="button"
            className={`chip ${activeTab === 'social' ? 'active' : ''}`}
            onClick={() => setActiveTab('social')}
            style={{ fontSize: '0.92rem', padding: '0.55rem 1.25rem', whiteSpace: 'nowrap' }}
          >
            👥 {lang === 'ar' ? 'المتابعون والأصدقاء' : 'Followers & Social'}
          </button>
          <button
            type="button"
            className={`chip ${activeTab === 'referrals' ? 'active' : ''}`}
            onClick={() => setActiveTab('referrals')}
            style={{ fontSize: '0.92rem', padding: '0.55rem 1.25rem', whiteSpace: 'nowrap' }}
          >
            🎁 {lang === 'ar' ? 'نظام الدعوات ومكافأة VIP' : 'Referrals & VIP'}
          </button>
          {isDeveloper && (
            <button
              type="button"
              className={`chip ${activeTab === 'developer' ? 'active' : ''}`}
              onClick={() => setActiveTab('developer')}
              style={{ fontSize: '0.92rem', padding: '0.55rem 1.25rem', whiteSpace: 'nowrap' }}
            >
              👑 {t('profile.tabDev')}
            </button>
          )}
        </div>
      </div>

      {/* ================= TAB 1: Profile & Customization (Banner, Frames, Avatar) ================= */}
      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Left Preview Card */}
          <div className="glass" style={{ padding: '0 0 2rem 0', textAlign: 'center', borderRadius: '20px', overflow: 'hidden' }}>
            {/* Profile Banner */}
            <div className={`profile-banner ${bannerStyle && bannerStyle !== 'off' ? 'profile-banner--3d' : ''}`}>
              {bannerStyle && bannerStyle !== 'off' ? (
                /* live 3D header — the AI image (if any) becomes the plane
                   texture so it still gets curvature, rails and bloom */
                <Ornament3D
                  mode="banner"
                  ornament={bannerStyle}
                  eager
                  quality={ornamentQuality}
                  overrides={{ imageOverride: bannerUrl || undefined }}
                  style={{ position: 'absolute', inset: 0 }}
                />
              ) : (
                bannerUrl ? (
                  <img onError={imgFallback} src={bannerUrl} alt="Profile Banner" className="profile-banner__img" />
                ) : (
                  <div className="profile-banner__fallback" />
                )
              )}
              <div className="profile-banner__overlay" />
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  const el = document.getElementById('prof-banner-input');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  position: 'absolute',
                  top: '10px',
                  insetInlineEnd: '10px',
                  background: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(8px)',
                  fontSize: '0.74rem',
                  padding: '0.3rem 0.65rem'
                }}
              >
                🖼️ {lang === 'ar' ? 'تغيير البانر' : 'Change Banner'}
              </button>
            </div>

            <div style={{ padding: '0 1.5rem', marginTop: '-45px', position: 'relative', zIndex: 3 }}>
              {/* Avatar with Frame Ornament */}
              <div className="avatar-frame-wrapper" style={{ margin: '0 auto 1.15rem' }}>
                <div style={{ position: 'relative', width: '110px', height: '110px' }}>
                  <OrnamentAvatar
                    src={photoUrl || ''}
                    fallbackLabel={(displayName || username || 'X').slice(0, 2)}
                    avatarColor={avatarColor}
                    frameStyle={frameStyle}
                    size={110}
                    pointerMode="block"
                    eager
                    quality={ornamentQuality}
                    style={{ margin: 0 }}
                  />
                  <div style={{ position: 'absolute', inset: 0 }}>
                  {/* Quick camera button over avatar */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    style={{
                      position: 'absolute',
                      insetInlineEnd: '-4px',
                      bottom: '-2px',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #22d3ee, #8b5cf6)',
                      border: '2px solid #06070d',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
                      transition: 'transform 0.2s',
                      padding: 0
                    }}
                    title={lang === 'ar' ? 'رفع صورة من الهاتف' : 'Upload photo from phone'}
                    aria-label={lang === 'ar' ? 'رفع صورة من الهاتف' : 'Upload photo from phone'}
                  >
                    📷
                  </button>
                  </div>
                </div>
              </div>

              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.35rem', fontWeight: 800 }}>{displayName || username}</h3>
              <div style={{ color: 'var(--cyan)', fontSize: '0.86rem', fontWeight: 600, marginBlockEnd: '0.35rem' }}>
                @{username}
              </div>

              {/* Level & Rank Badge */}
              {gamificationStats && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.3rem 0.85rem',
                  borderRadius: '99px',
                  background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.15), rgba(139, 92, 246, 0.2))',
                  border: '1px solid rgba(34, 211, 238, 0.35)',
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  marginBlock: '0.35rem 0.5rem'
                }}>
                  <span>{gamificationStats.rank?.icon || '🎖️'}</span>
                  <span>{lang === 'ar' ? `المستوى ${gamificationStats.currentLevel} · ${gamificationStats.rank?.titleAr}` : `Level ${gamificationStats.currentLevel} · ${gamificationStats.rank?.titleEn}`}</span>
                </div>
              )}

              {/* VIP Member Badge if unlocked */}
              {(referralData?.isVipUnlocked || user?.badges?.includes('gold_vip')) && (
                <div style={{ marginBlockEnd: '0.4rem' }}>
                  <span className="badge badge--vip" style={{ fontSize: '0.75rem', padding: '0.2rem 0.65rem' }}>
                    👑 VIP Basic Active
                  </span>
                </div>
              )}

              {/* Social Network Counters */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBlock: '0.65rem 0.85rem' }}>
                <div style={{ fontSize: '0.82rem' }}>
                  <strong style={{ color: 'var(--cyan)', fontSize: '1rem' }}>{socialNetwork?.followersCount || 0}</strong>{' '}
                  <span style={{ color: 'var(--ink-dim)' }}>{lang === 'ar' ? 'المتابعون' : 'Followers'}</span>
                </div>
                <div style={{ width: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />
                <div style={{ fontSize: '0.82rem' }}>
                  <strong style={{ color: 'var(--magenta)', fontSize: '1rem' }}>{socialNetwork?.followingCount || 0}</strong>{' '}
                  <span style={{ color: 'var(--ink-dim)' }}>{lang === 'ar' ? 'يتابع' : 'Following'}</span>
                </div>
              </div>

              {user?.badges && user.badges.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBlockEnd: '0.85rem' }}>
                  <UserBadges badges={user.badges} size="md" showLabels={true} />
                </div>
              )}

              {bio && (
                <p style={{ color: 'var(--ink-dim)', fontSize: '0.86rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
                  {bio}
                </p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.15rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '0.75rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--cyan)' }}>
                    {formatNumber(stats?.favorites || 0)}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--ink-dim)' }}>{t('mylist.favorites')}</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '0.75rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--magenta)' }}>
                    {formatNumber(stats?.watchedEpisodes || 0)}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--ink-dim)' }}>{t('watch.watched')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Edit Form */}
          <div className="glass" style={{ padding: '2.25rem', borderRadius: '20px' }}>
            <form onSubmit={handleSaveProfile} noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBlockEnd: '1.25rem' }}>
                <div className="field" style={{ margin: 0 }}>
                  <label className="label" htmlFor="prof-display">{t('profile.displayName')}</label>
                  <input
                    id="prof-display"
                    type="text"
                    className="input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    maxLength={60}
                  />
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label className="label" htmlFor="prof-username">{t('profile.username')}</label>
                  <input
                    id="prof-username"
                    type="text"
                    className="input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    maxLength={24}
                  />
                </div>
              </div>

              {/* Phone / Device Image Upload Section */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  padding: '1.15rem',
                  marginBottom: '1.35rem'
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.65rem' }}>
                  <div>
                    <strong style={{ fontSize: '0.92rem', display: 'block' }}>
                      📷 {lang === 'ar' ? 'إضافة صورة من الهاتف / الجهاز' : 'Upload photo from phone / device'}
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--ink-dim)' }}>
                      {lang === 'ar' ? 'اختر صورة من معرض هاتفك أو التقط صورة جديدة' : 'Choose directly from your camera roll or photo library'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      style={{
                        background: 'linear-gradient(135deg, #22d3ee, #8b5cf6)',
                        color: '#fff',
                        fontWeight: 700
                      }}
                    >
                      <span className="btn__shine" />
                      📱 {uploadingImage ? (lang === 'ar' ? 'جارٍ المعالجة...' : 'Processing...') : (lang === 'ar' ? 'اختيار صورة من الهاتف' : 'Choose from phone')}
                    </button>
                    {photoUrl && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => setPhotoUrl('')}
                        style={{ color: 'var(--red)' }}
                        title={lang === 'ar' ? 'إزالة الصورة' : 'Remove photo'}
                      >
                        ✕ {lang === 'ar' ? 'إزالة' : 'Remove'}
                      </button>
                    )}
                  </div>
                </div>

                {/* If image is uploaded from phone (data URL) */}
                {photoUrl?.startsWith('data:') && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '0.8rem 1rem',
                      background: 'rgba(34, 211, 238, 0.08)',
                      border: '1px solid rgba(34, 211, 238, 0.35)',
                      borderRadius: '12px',
                      marginTop: '0.65rem',
                      marginBottom: '0.65rem'
                    }}
                  >
                    <img onError={imgFallback}
                      src={photoUrl}
                      alt="Device Preview"
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--cyan)',
                        flexShrink: 0
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--cyan)' }}>
                        ✓ {lang === 'ar' ? 'تم اختيار صورة من هاتفك بنجاح' : 'Phone image attached successfully'}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--ink-dim)' }}>
                        {lang === 'ar' ? 'الصورة جاهزة للمعاينة، اضغط «حفظ التعديلات» بالأسفل لاعتمادها في الحساب' : 'Ready! Click "Save Changes" below to apply to your account'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setPhotoUrl('')}
                      style={{ color: 'var(--red)', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                      title={lang === 'ar' ? 'إلغاء' : 'Cancel'}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Or image URL input */}
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.75rem' }}>
                  <label className="label" htmlFor="prof-photo" style={{ fontSize: '0.78rem', marginBottom: '0.35rem' }}>
                    🔗 {lang === 'ar' ? 'أو أدخل رابط صورة من الإنترنت (اختياري):' : 'Or enter an image web URL (optional):'}
                  </label>
                  <input
                    id="prof-photo"
                    type="text"
                    className="input"
                    placeholder={photoUrl?.startsWith('data:') ? (lang === 'ar' ? '(يتم استخدام الصورة المختارة من هاتفك)' : '(Using photo chosen from phone)') : t('profile.photoPh')}
                    value={photoUrl?.startsWith('data:') ? '' : photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                  />
                  {photoUrl && !photoUrl.startsWith('data:') && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--cyan)', marginTop: '0.35rem' }}>
                      ✓ {lang === 'ar' ? 'رابط الصورة نشط' : 'Image URL active'}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Preset Avatars Picker */}
              <div style={{ marginBlockEnd: '1.5rem' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--ink-dim)', fontWeight: 600, marginBlockEnd: '0.65rem' }}>
                  {t('profile.orChoosePreset')}
                </div>
                <div style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.35rem' }}>
                  {PRESET_AVATARS.map((av) => (
                    <button
                      key={av.name}
                      type="button"
                      onClick={() => setPhotoUrl(av.url)}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        padding: 0,
                        border: photoUrl === av.url ? '3px solid var(--cyan)' : '2px solid rgba(255, 255, 255, 0.15)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: 'rgba(255, 255, 255, 0.05)',
                        flexShrink: 0,
                        transition: 'transform 0.2s, border-color 0.2s'
                      }}
                      title={av.name}
                    >
                      <img onError={imgFallback} src={av.url} alt={av.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Theme Selector */}
              <div className="field">
                <label className="label">{t('profile.colorTheme')}</label>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatarColor(c)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: c,
                        border: avatarColor === c ? '3px solid #fff' : '2px solid transparent',
                        boxShadow: avatarColor === c ? `0 0 12px ${c}` : 'none',
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                      }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
              </div>

              {/* Banner Customization Section */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  padding: '1.15rem',
                  marginBottom: '1.35rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '0.92rem' }}>
                    🖼️ {lang === 'ar' ? 'بانر الملف الشخصي (Profile Banner)' : 'Profile Header Banner'}
                  </strong>
                  {bannerUrl && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setBannerUrl('')}
                      style={{ color: 'var(--red)', fontSize: '0.76rem', padding: '0.2rem 0.5rem' }}
                    >
                      ✕ {lang === 'ar' ? 'إزالة' : 'Remove'}
                    </button>
                  )}
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--ink-dim)', margin: '0 0 0.75rem' }}>
                  {lang === 'ar' ? 'اختر بانراً جاهزاً أو الصق رابط صورة عالية الدقة لتزيين رأس بروفايلك:' : 'Select a preset anime banner or enter a custom URL:'}
                </p>

                {/* Preset Banners */}
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                  {PRESET_BANNERS.map((pb) => (
                    <button
                      key={pb.label}
                      type="button"
                      className="btn btn--ghost btn--sm"
                      style={{
                        fontSize: '0.76rem',
                        padding: '0.35rem 0.7rem',
                        borderColor: bannerUrl === pb.url ? 'var(--cyan)' : 'rgba(255,255,255,0.15)',
                        background: bannerUrl === pb.url ? 'rgba(34, 211, 238, 0.15)' : 'rgba(255,255,255,0.04)'
                      }}
                      onClick={() => setBannerUrl(pb.url)}
                    >
                      {pb.label}
                    </button>
                  ))}
                </div>

                <input
                  id="prof-banner-input"
                  type="url"
                  className="input"
                  placeholder="https://images.unsplash.com/…"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                />
              </div>

              {/* ═════════ 3D ORNAMENTS — live frames + 3D banners ═════════ */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  padding: '1.15rem',
                  marginBottom: '1.35rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  <strong style={{ fontSize: '0.92rem' }}>
                    ✨ {t('profile.ornTitle')}
                  </strong>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className={`chip ${ornament3d ? 'active' : ''}`}
                      onClick={() => setOrnament3d((v) => !v)}
                      style={{ fontSize: '0.74rem', padding: '0.28rem 0.7rem' }}
                      title={t('profile.ornToggle3d')}
                    >
                      {ornament3d ? `🧊 ${t('profile.ornMode3d')}` : `🖼️ ${t('profile.ornMode2d')}`}
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--ink-dim)', margin: '0 0 0.85rem' }}>
                  {t('profile.ornSubtitle')}
                </p>

                <OrnamentGallery
                  mode="frame"
                  value={frameStyle}
                  threeDEnabled={ornament3d}
                  quality={ornamentQuality}
                  onQualityChange={setOrnamentQuality}
                  onChange={({ frameStyle: next }) => setFrameStyle(next)}
                  avatar={{ photoUrl, label: displayName || username || 'X', color: avatarColor }}
                />

                <div style={{ marginTop: '1.1rem' }}>
                  <strong style={{ fontSize: '0.88rem', display: 'block', marginBottom: '0.5rem' }}>
                    🏙️ {t('profile.ornBannerTitle')}
                  </strong>
                  <OrnamentGallery
                    mode="banner"
                    value={bannerStyle}
                    compact
                    showStage={false}
                    showAdvanced={false}
                    threeDEnabled={ornament3d}
                    quality={ornamentQuality}
                    onChange={({ bannerStyle: next }) => setBannerStyle(next)}
                    avatar={{ photoUrl, label: displayName || username || 'X', color: avatarColor }}
                  />
                </div>
              </div>

              {/* Bio Field */}
              <div className="field">
                <label className="label" htmlFor="prof-bio">{t('profile.bio')}</label>
                <textarea
                  id="prof-bio"
                  className="textarea"
                  placeholder={t('profile.bioPh')}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={200}
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.75rem' }}>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  <span className="btn__shine" />
                  {saving ? t('profile.saving') : t('profile.saveBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= TAB 2: Leveling & Activity System (Activity-Based XP) ================= */}
      {activeTab === 'activity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass" style={{ padding: '2.25rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '2rem' }}>🏆</span>
                <div>
                  <h2 style={{ fontSize: '1.45rem', margin: 0, fontWeight: 800 }}>
                    {lang === 'ar' ? 'نظام المستويات والنشاط (Leveling System)' : 'Activity & Leveling System'}
                  </h2>
                  <p style={{ color: 'var(--ink-dim)', margin: '0.25rem 0 0', fontSize: '0.88rem' }}>
                    {lang === 'ar' ? 'كلما زادت مدة مشاهدتك للأنمي أو قراءتك للمانجا والكتب، ارتفع مستواك ورتبتك التلقائية!' : 'Watch anime and read library works to gain XP and level up automatically!'}
                  </p>
                </div>
              </div>

              {gamificationStats?.rank && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '99px',
                  background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(139, 92, 246, 0.2))',
                  border: '1px solid rgba(34, 211, 238, 0.4)'
                }}>
                  <span style={{ fontSize: '1.4rem' }}>{gamificationStats.rank.icon}</span>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-dim)', display: 'block' }}>{lang === 'ar' ? 'الرتبة الحالية' : 'Rank'}</span>
                    <strong style={{ color: gamificationStats.rank.color || 'var(--cyan)', fontSize: '0.96rem' }}>
                      {lang === 'ar' ? gamificationStats.rank.titleAr : gamificationStats.rank.titleEn}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Metrics Tiles */}
            <div className="fx-grid fx-grid--stats" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-tile">
                <div className="stat-tile__value" style={{ color: 'var(--cyan)' }}>
                  Lv. {gamificationStats?.currentLevel || 1}
                </div>
                <div className="stat-tile__label">{lang === 'ar' ? 'المستوى الحالي' : 'Current Level'}</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile__value" style={{ color: '#fbbf24' }}>
                  {formatNumber(gamificationStats?.xp || 0)} XP
                </div>
                <div className="stat-tile__label">{lang === 'ar' ? 'مجموع نقاط الخبرة' : 'Total XP'}</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile__value" style={{ color: '#38bdf8' }}>
                  {formatNumber(gamificationStats?.totalWatchTimeMin || 0)} د
                </div>
                <div className="stat-tile__label">{lang === 'ar' ? 'دقائق المشاهدة' : 'Watch Time (mins)'}</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile__value" style={{ color: '#a78bfa' }}>
                  {formatNumber(gamificationStats?.totalReadTimeMin || 0)} د
                </div>
                <div className="stat-tile__label">{lang === 'ar' ? 'دقائق القراءة' : 'Read Time (mins)'}</div>
              </div>
            </div>

            {/* Level Progress Bar */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--ink-dim)' }}>
                  {lang === 'ar' ? 'التقدم نحو المستوى التالي:' : 'Progress to next level:'}
                </span>
                <strong style={{ color: 'var(--cyan)' }}>{gamificationStats?.progressPercentage || 0}%</strong>
              </div>
              <div className="fx-progress" style={{ height: '10px' }}>
                <div className="fx-progress__fill" style={{ width: `${Math.min(100, gamificationStats?.progressPercentage || 0)}%` }} />
              </div>
            </div>

            {/* Test Activity Recording Buttons */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: '14px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <strong style={{ fontSize: '0.92rem', display: 'block', marginBottom: '0.2rem' }}>
                  ⚡ {lang === 'ar' ? 'تسجيل نشاط فوري واختبار زيادة المستوى' : 'Log Instant Activity & Level Up'}
                </strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--ink-dim)' }}>
                  {lang === 'ar' ? 'يمكنك محاكاة جلسة مشاهدة أو قراءة لاختبار ارتقاء المستوى تلقائياً' : 'Simulate watch or read sessions to test automatic level up'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => handleSimulateActivity('watch', 30)}
                  disabled={syncingActivity}
                >
                  <span className="btn__shine" />
                  🎬 {lang === 'ar' ? '+30 د مشاهدة (+300 XP)' : '+30m Watch (+300 XP)'}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => handleSimulateActivity('read', 25)}
                  disabled={syncingActivity}
                >
                  📖 {lang === 'ar' ? '+25 د قراءة (+250 XP)' : '+25m Read (+250 XP)'}
                </button>
              </div>
            </div>

            {/* Unlocked Badges */}
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '2rem 0 1rem' }}>
              🎖️ {lang === 'ar' ? 'الشارات والأوسمة المكتسبة' : 'Unlocked Badges'}
            </h3>
            {gamificationStats?.unlockedBadges?.length ? (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {gamificationStats.unlockedBadges.map((b) => (
                  <div
                    key={b.name}
                    className="glass"
                    style={{
                      padding: '0.65rem 1rem',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      border: '1px solid rgba(255, 255, 255, 0.12)'
                    }}
                  >
                    <span>🏅</span>
                    <strong style={{ fontSize: '0.85rem' }}>{b.name}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--ink-dim)', margin: 0, fontSize: '0.88rem' }}>
                {lang === 'ar' ? 'لم تكتسب شارات بعد — واصل المشاهدة والقراءة لتفتح أول شارة!' : 'No badges unlocked yet — keep watching and reading!'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: Social & Followers System ================= */}
      {activeTab === 'social' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass" style={{ padding: '2.25rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2rem' }}>👥</span>
              <div>
                <h2 style={{ fontSize: '1.45rem', margin: 0, fontWeight: 800 }}>
                  {lang === 'ar' ? 'نظام المتابعة والأصدقاء (Followers / Following)' : 'Followers & Social Network'}
                </h2>
                <p style={{ color: 'var(--ink-dim)', margin: '0.25rem 0 0', fontSize: '0.88rem' }}>
                  {lang === 'ar' ? 'تابع المستخدمين والمنتجين وشاهد من يتابعك في المنصة' : 'Connect with creators, friends, and fellow anime otaku'}
                </p>
              </div>
            </div>

            {/* Follow Form */}
            <form onSubmit={handleFollowUser} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="input"
                placeholder={lang === 'ar' ? 'أدخل اسم المستخدم لمتابعته (مثل: luffy, zoro)...' : 'Enter username to follow...'}
                value={followInputName}
                onChange={(e) => setFollowInputName(e.target.value)}
                style={{ flex: 1, minWidth: '220px' }}
              />
              <button type="submit" className="btn btn--primary" disabled={busyFollow || !followInputName.trim()}>
                <span className="btn__shine" />
                ➕ {lang === 'ar' ? 'متابعة المستخدم' : 'Follow User'}
              </button>
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {/* Followers List */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 1rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{lang === 'ar' ? 'المتابعون (Followers)' : 'Followers'}</span>
                  <span style={{ color: 'var(--cyan)' }}>{socialNetwork?.followers?.length || 0}</span>
                </h3>
                {socialNetwork?.followers?.length === 0 ? (
                  <p style={{ color: 'var(--ink-dim)', fontSize: '0.85rem' }}>
                    {lang === 'ar' ? 'لا يوجد متابعون بعد. شارك منشورات في المجتمع لجذب المتابعين!' : 'No followers yet. Post in community to gain followers!'}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                    {socialNetwork?.followers?.map((name) => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.04)' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>@{name}</span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--cyan)' }}>✓ متابع</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Following List */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 1rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{lang === 'ar' ? 'تتابعهم (Following)' : 'Following'}</span>
                  <span style={{ color: 'var(--magenta)' }}>{socialNetwork?.following?.length || 0}</span>
                </h3>
                {socialNetwork?.following?.length === 0 ? (
                  <p style={{ color: 'var(--ink-dim)', fontSize: '0.85rem' }}>
                    {lang === 'ar' ? 'أنت لا تتابع أي حساب بعد. ابحث عن الأصدقاء أعلاه لمتابعتهم!' : 'You are not following anyone yet.'}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                    {socialNetwork?.following?.map((name) => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.04)' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>@{name}</span>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => handleUnfollowUser(name)}
                          style={{ color: 'var(--red)', fontSize: '0.74rem', padding: '0.2rem 0.55rem' }}
                        >
                          {lang === 'ar' ? 'إلغاء المتابعة' : 'Unfollow'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: Referrals & VIP Reward System ================= */}
      {activeTab === 'referrals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass" style={{ padding: '2.25rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2rem' }}>🎁</span>
              <div>
                <h2 style={{ fontSize: '1.45rem', margin: 0, fontWeight: 800 }}>
                  {lang === 'ar' ? 'نظام الدعوات ومكافأة VIP المجانية' : 'Referral System & VIP Basic Rewards'}
                </h2>
                <p style={{ color: 'var(--ink-dim)', margin: '0.25rem 0 0', fontSize: '0.88rem' }}>
                  {lang === 'ar' ? 'ادعُ 3 من أصدقائك للتسجيل في الموقع واحصل على اشتراك (VIP Basic) مجاناً وتلقائياً!' : 'Invite friends to register and earn a free VIP Basic membership automatically!'}
                </p>
              </div>
            </div>

            {/* VIP Status Banner */}
            {referralData?.isVipUnlocked ? (
              <div className="vip-card-banner" style={{ marginBottom: '1.75rem' }}>
                <div>
                  <strong style={{ fontSize: '1.15rem', color: '#eab308', display: 'block', marginBottom: '0.25rem' }}>
                    👑 {lang === 'ar' ? 'اشتراك VIP Basic مفعّل في حسابك!' : 'VIP Basic Membership Active!'}
                  </strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--ink-dim)' }}>
                    {lang === 'ar' ? 'لقد أكملت بنجاح دعوة 3 أصدقاء، وحصلت على شارة VIP وميزات المشاهدة الممتازة!' : 'You reached the referral milestone and unlocked all VIP perks!'}
                  </span>
                </div>
                <span className="badge badge--vip" style={{ fontSize: '0.88rem', padding: '0.4rem 1rem' }}>
                  VIP Active ✓
                </span>
              </div>
            ) : (
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <span>{lang === 'ar' ? `الأصدقاء المسجلون عبر دعوتك: ${referralData?.count || 0} من ${referralData?.target || 3}` : `Friends Invited: ${referralData?.count || 0} / ${referralData?.target || 3}`}</span>
                  <strong style={{ color: 'var(--cyan)' }}>
                    {Math.round(((referralData?.count || 0) / (referralData?.target || 3)) * 100)}%
                  </strong>
                </div>
                <div className="fx-progress" style={{ height: '10px' }}>
                  <div
                    className="fx-progress__fill"
                    style={{ width: `${Math.min(100, Math.round(((referralData?.count || 0) / (referralData?.target || 3)) * 100))}%` }}
                  />
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--ink-dim)', marginTop: '0.5rem' }}>
                  {lang === 'ar' ? `متبقي ${(referralData?.target || 3) - (referralData?.count || 0)} دعوات للحصول على VIP Basic مجاناً` : `${(referralData?.target || 3) - (referralData?.count || 0)} more invites to unlock free VIP Basic`}
                </div>
              </div>
            )}

            {/* Referral Link Box */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.86rem', color: 'var(--ink-dim)', display: 'block', marginBottom: '0.45rem' }}>
                🔗 {lang === 'ar' ? 'رابط الدعوة المخصص لك:' : 'Your Unique Referral Link:'}
              </label>
              <div className="referral-box">
                <span style={{ fontSize: '0.88rem', fontFamily: 'monospace', color: 'var(--cyan)', wordBreak: 'break-all' }}>
                  {referralData?.referralLink || `${window.location.origin}/?ref=${user?.username || 'user'}`}
                </span>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => {
                    const lk = referralData?.referralLink || `${window.location.origin}/?ref=${user?.username || 'user'}`;
                    navigator.clipboard.writeText(lk);
                    pushToast(lang === 'ar' ? 'تم نسخ رابط الدعوة!' : 'Referral link copied!', 'success');
                  }}
                >
                  <span className="btn__shine" />
                  📋 {lang === 'ar' ? 'نسخ الرابط' : 'Copy Link'}
                </button>
              </div>
            </div>

            {/* Mock Invite Simulation Button for testing */}
            <button
              type="button"
              className="btn btn--ghost btn--block"
              onClick={handleMockInvite}
              disabled={invitingFriend}
              style={{ border: '1px dashed rgba(255, 255, 255, 0.25)' }}
            >
              🚀 {invitingFriend ? '...' : (lang === 'ar' ? 'محاكاة دعوة صديق جديد لاختبار الترقية إلى VIP Basic' : 'Simulate friend invite to test VIP Basic unlock')}
            </button>
          </div>
        </div>
      )}
      {activeTab === 'developer' && isDeveloper && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Feature 1: Footer Text Editor */}
          <div className="glass" style={{ padding: '2.25rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBlockEnd: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>✍️</span>
              <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 800 }}>
                {t('dev.footerSection')}
              </h2>
            </div>
            <p style={{ color: 'var(--ink-dim)', margin: '0 0 1.5rem', fontSize: '0.9rem' }}>
              {t('dev.footerDesc')}
            </p>

            <form onSubmit={handleUpdateFooter}>
              <div className="field">
                <label className="label" htmlFor="dev-foot-tagline">{t('dev.footerTagline')}</label>
                <input
                  id="dev-foot-tagline"
                  type="text"
                  className="input"
                  value={footerTagline}
                  onChange={(e) => setFooterTagline(e.target.value)}
                  placeholder="Stream every episode. Track your shows. Own the night."
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="dev-foot-notice">{t('dev.footerNotice')}</label>
                <input
                  id="dev-foot-notice"
                  type="text"
                  className="input"
                  value={footerNotice}
                  onChange={(e) => setFooterNotice(e.target.value)}
                  placeholder="BLACK X — Interactive Anime Platform"
                  required
                />
              </div>

              {/* Live Footer Preview */}
              <div
                style={{
                  margin: '1.25rem 0',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px dashed rgba(255, 255, 255, 0.2)'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--cyan)', fontWeight: 700, marginBlockEnd: '0.5rem', textTransform: 'uppercase' }}>
                  Live Preview:
                </div>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{footerTagline}</div>
                <div style={{ opacity: 0.7, fontSize: '0.82rem', marginTop: '0.35rem' }}>{footerNotice}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn--primary" disabled={footerSaving}>
                  <span className="btn__shine" />
                  {footerSaving ? t('common.loading') : t('dev.footerUpdateBtn')}
                </button>
              </div>
            </form>
          </div>

          {/* Feature 2: Site User Count & Analytics */}
          <div className="glass" style={{ padding: '2.25rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBlockEnd: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>👥</span>
                <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 800 }}>
                  {t('dev.usersSection')}
                </h2>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  background: 'rgba(34, 211, 238, 0.12)',
                  padding: '0.45rem 1.1rem',
                  borderRadius: '99px',
                  border: '1px solid rgba(34, 211, 238, 0.35)'
                }}
              >
                <span style={{ color: 'var(--ink-dim)', fontSize: '0.85rem' }}>{t('dev.totalUsers')}:</span>
                <strong style={{ color: 'var(--cyan)', fontSize: '1.15rem' }}>
                  {formatNumber(userStats?.totalUsers || 0)}
                </strong>
              </div>
            </div>

            {loadingUserStats ? (
              <LiquidLoader />
            ) : (
              <div style={{ overflowX: 'auto', maxHeight: '380px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'start' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.12)', color: 'var(--ink-dim)' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'start' }}>#</th>
                      <th style={{ padding: '0.75rem', textAlign: 'start' }}>User</th>
                      <th style={{ padding: '0.75rem', textAlign: 'start' }}>Email</th>
                      <th style={{ padding: '0.75rem', textAlign: 'start' }}>Role</th>
                      <th style={{ padding: '0.75rem', textAlign: 'start' }}>{lang === 'ar' ? 'الشارات' : 'Badges'}</th>
                      <th style={{ padding: '0.75rem', textAlign: 'start' }}>Registered</th>
                      <th style={{ padding: '0.75rem', textAlign: 'start' }}>{lang === 'ar' ? 'إدارة' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(userStats?.users || []).map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '0.75rem', color: 'var(--ink-dim)', fontFamily: 'monospace' }}>{u.id}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: u.avatarColor || '#22d3ee',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}
                            >
                              {u.photoUrl ? (
                                <img onError={imgFallback} src={u.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                u.displayName?.[0]?.toUpperCase() || u.username?.[0]?.toUpperCase()
                              )}
                            </div>
                            <div>
                              <strong style={{ display: 'block', color: 'var(--ink)' }}>{u.displayName}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--ink-faint)' }}>@{u.username}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--ink-dim)' }}>{u.email}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: '99px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: u.role === 'developer' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                              color: u.role === 'developer' ? '#f472b6' : 'var(--ink-dim)',
                              border: u.role === 'developer' ? '1px solid rgba(236, 72, 153, 0.4)' : '1px solid transparent'
                            }}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <UserBadges badges={u.badges} size="sm" />
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--ink-dim)', fontSize: '0.8rem' }}>{u.createdAt}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            style={{
                              padding: '0.25rem 0.65rem',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
                              color: '#fff'
                            }}
                            onClick={() => openBadgeModal(u)}
                            title={lang === 'ar' ? 'منح وتعديل شارات الحساب' : 'Grant and manage badges'}
                          >
                            <span className="btn__shine" />
                            🎖️ {lang === 'ar' ? 'منح شارات' : 'Badges'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Feature 3: Integrated System Diagnostics & Error Discovery Window */}
          <div className="glass" style={{ padding: '2.25rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBlockEnd: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🩺</span>
                <div>
                  <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 800 }}>
                    {t('dev.diagnosticsSection')}
                  </h2>
                  <p style={{ color: 'var(--ink-dim)', margin: '0.25rem 0 0', fontSize: '0.86rem' }}>
                    {t('dev.diagnosticsDesc')}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={handleTestPing}
                >
                  ⚡ {t('dev.testPingBtn')}
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={handleRunDiagnostics}
                  disabled={runningDiagnostics}
                >
                  <span className="btn__shine" />
                  {runningDiagnostics ? t('dev.diagnosticsRunning') : t('dev.runDiagnosticsBtn')}
                </button>
              </div>
            </div>

            {/* Diagnostic Results Card */}
            {diagnostics && (
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.55)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  marginBlockEnd: '1.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBlockEnd: '1rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>System Health Report</span>
                  <span
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '99px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      background: diagnostics.overallStatus === 'healthy' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(251, 113, 133, 0.2)',
                      color: diagnostics.overallStatus === 'healthy' ? '#4ade80' : '#fb7185',
                      border: `1px solid ${diagnostics.overallStatus === 'healthy' ? '#4ade80' : '#fb7185'}`
                    }}
                  >
                    ● {diagnostics.overallStatus.toUpperCase()} ({diagnostics.totalDurationMs}ms)
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  {diagnostics.checks.map((chk, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '0.85rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '0.88rem' }}>{chk.service}</strong>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: chk.status === 'ok' ? '#4ade80' : chk.status === 'degraded' ? '#fbbf24' : '#fb7185'
                          }}
                        >
                          {chk.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--ink-dim)', marginTop: '0.4rem' }}>
                        {chk.details} {chk.latencyMs !== undefined ? `(${chk.latencyMs}ms)` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error & Diagnostic Event Logs Console Window */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBlockEnd: '0.65rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink-dim)' }}>
                  🖥️ {t('dev.errorLogs')}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--ink-faint)', fontFamily: 'monospace' }}>
                  {systemLogs.length} events
                </span>
              </div>

              <div
                style={{
                  background: '#04060b',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '1rem',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.82rem'
                }}
              >
                {loadingLogs ? (
                  <div style={{ color: 'var(--ink-dim)', textAlign: 'center', padding: '1rem' }}>{t('common.loading')}</div>
                ) : systemLogs.length === 0 ? (
                  <div style={{ color: 'var(--ink-dim)', textAlign: 'center', padding: '1rem' }}>{t('dev.noLogs')}</div>
                ) : (
                  systemLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        padding: '0.45rem 0',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '0.75rem',
                        lineHeight: 1.4
                      }}
                    >
                      <span style={{ color: 'var(--ink-faint)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                        {log.createdAt}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.74rem',
                          color: log.level === 'error' ? '#fb7185' : log.level === 'warn' ? '#fbbf24' : '#22d3ee',
                          textTransform: 'uppercase'
                        }}
                      >
                        [{log.level}]
                      </span>
                      <span style={{ color: 'var(--ink-dim)', fontSize: '0.76rem' }}>
                        [{log.category}]
                      </span>
                      <span style={{ color: '#fff', wordBreak: 'break-all' }}>
                        {log.message}
                      </span>
                      {log.details && (
                        <span style={{ color: 'var(--ink-faint)', fontSize: '0.75rem' }}>
                          {log.details}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Badge Management Modal for Developer */}
      {badgeModalUser && (
        <div
          className="modal-backdrop"
          onClick={() => setBadgeModalUser(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(5, 7, 13, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            className="glass modal reveal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '540px',
              borderRadius: '24px',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '1rem', marginBlockEnd: '1.25rem' }}>
              <div>
                <span className="badge badge--cat" style={{ background: 'linear-gradient(135deg, #eab308, #ec4899)', color: '#fff' }}>
                  👑 {lang === 'ar' ? 'صلاحيات مطور الموقع' : 'Developer Console'}
                </span>
                <h3 style={{ margin: '0.35rem 0 0', fontSize: '1.3rem', fontWeight: 800 }}>
                  🎖️ {lang === 'ar' ? 'منح الشارات للحساب' : 'Grant Badges'}
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--cyan)' }}>
                  @{badgeModalUser.username} ({badgeModalUser.displayName})
                </span>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setBadgeModalUser(null)}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--ink-dim)', margin: '0 0 1rem' }}>
              {lang === 'ar'
                ? 'اختر الشارات التي ترغب في منحها أو سحبها من هذا المستخدم. تظهر الشارات بجانب اسم المستخدم في حسابه وفي شريط الموقع:'
                : 'Select the badges to grant or revoke for this account. Badges display next to user name across the site:'}
            </p>

            {/* Badges Toggle List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBlockEnd: '1.5rem' }}>
              {Object.values(BADGE_DEFINITIONS).map((b) => {
                const isSelected = selectedBadges.includes(b.id);
                return (
                  <div
                    key={b.id}
                    onClick={() => toggleBadge(b.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      borderRadius: '14px',
                      background: isSelected ? b.bg : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? `2px solid ${b.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: b.bg,
                          color: b.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `1px solid ${b.border}`,
                          boxShadow: isSelected ? `0 0 12px ${b.color}55` : 'none'
                        }}
                      >
                        {b.icon}
                      </div>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.92rem', color: isSelected ? '#fff' : 'var(--ink)' }}>
                          {lang === 'ar' ? b.nameAr : b.nameEn}
                        </strong>
                        <span style={{ fontSize: '0.76rem', color: 'var(--ink-dim)' }}>
                          {lang === 'ar' ? b.descAr : b.descEn}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: isSelected ? `2px solid ${b.color}` : '2px solid rgba(255, 255, 255, 0.3)',
                        background: isSelected ? b.color : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000',
                        fontSize: '0.8rem',
                        fontWeight: 900
                      }}
                    >
                      {isSelected ? '✓' : ''}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setBadgeModalUser(null)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={handleSaveBadges}
                disabled={savingBadges}
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
                  color: '#fff',
                  fontWeight: 700,
                  padding: '0.5rem 1.25rem'
                }}
              >
                <span className="btn__shine" />
                {savingBadges ? t('common.loading') : (lang === 'ar' ? '💾 حفظ الشارات' : 'Save Badges')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
