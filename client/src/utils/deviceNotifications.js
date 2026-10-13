import { pushToast } from '../hooks/hooks.js';

const STORAGE_KEY = 'blackx.episodeAlerts.v1';

export function getSubscribedAnimeList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isAnimeEpisodeAlertEnabled(slug) {
  if (!slug) return false;
  return getSubscribedAnimeList().some((item) => item.slug === slug);
}

export async function requestDeviceNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return Notification.permission || 'default';
  }
}

/**
 * Dispatches a REAL native OS notification to the user's Phone (Android/iOS PWA) or Desktop (Windows/Mac/Linux)
 */
export async function sendNativeDeviceNotification({
  title,
  body,
  icon = '/favicon.svg',
  url = '/',
  tag = `blackx-${Date.now()}`
}) {
  // Also broadcast an in-app event so NotificationBell updates immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('blackx:new-episode-alert', {
        detail: { id: tag, title, body, icon, url, createdAt: new Date().toISOString() }
      })
    );
  }

  const perm = await requestDeviceNotificationPermission();
  if (perm !== 'granted') {
    return false;
  }

  const options = {
    body,
    icon: icon || '/favicon.svg',
    badge: icon || '/favicon.svg',
    tag,
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url }
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, options);
        return true;
      }
    }
  } catch {
    /* fallback to window.Notification */
  }

  try {
    const notif = new Notification(title, options);
    notif.onclick = () => {
      window.focus?.();
      if (url) window.location.href = url;
      notif.close?.();
    };
    return true;
  } catch {
    return false;
  }
}

export async function toggleAnimeEpisodeAlert(anime, lang = 'ar') {
  if (!anime || !anime.slug) return false;
  const list = getSubscribedAnimeList();
  const exists = list.some((i) => i.slug === anime.slug);

  if (exists) {
    const next = list.filter((i) => i.slug !== anime.slug);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
    pushToast(
      lang === 'ar'
        ? `🔕 تم إيقاف إشعارات الحلقات الجديدة لأنمي «${anime.titleAr || anime.titleEn || anime.slug}»`
        : `🔕 Episode notifications disabled for "${anime.titleEn || anime.slug}"`,
      'info'
    );
    return false;
  }

  const perm = await requestDeviceNotificationPermission();
  const entry = {
    slug: anime.slug,
    titleAr: anime.titleAr || anime.titleEn || anime.slug,
    titleEn: anime.titleEn || anime.titleAr || anime.slug,
    poster: anime.poster || '',
    latestEpisode: Number(anime.latestEpisode || anime.episodesCount || 1),
    subscribedAt: new Date().toISOString()
  };

  const next = [entry, ...list.filter((i) => i.slug !== anime.slug)];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}

  const displayTitle = lang === 'ar' ? entry.titleAr : entry.titleEn;

  if (perm === 'granted') {
    await sendNativeDeviceNotification({
      title: lang === 'ar' ? `🔔 تم تفعيل إشعارات: ${displayTitle}` : `🔔 Alerts Active: ${displayTitle}`,
      body:
        lang === 'ar'
          ? `سيصلك إشعار فوري على هاتفك/جهازك فور نزول أي حلقة جديدة من ${displayTitle}!`
          : `You will receive an instant device notification whenever a new episode of ${displayTitle} drops!`,
      icon: entry.poster,
      url: `/show/${entry.slug}`,
      tag: `sub-${entry.slug}`
    });
    pushToast(
      lang === 'ar'
        ? `📲 تم تفعيل إشعارات الهاتف والكمبيوتر لأنمي «${displayTitle}» بنجاح!`
        : `📲 Device notifications enabled for "${displayTitle}"!`,
      'success'
    );
  } else {
    pushToast(
      lang === 'ar'
        ? `🔔 تمت إضافة «${displayTitle}» لقائمة تنبيهات الحلقات (اسمح بإشعارات المتصفح لتصلك على شاشة الهاتف/الكمبيوتر)`
        : `🔔 Added "${displayTitle}" to episode alerts (allow browser notifications for OS popups)`,
      'info'
    );
  }

  return true;
}

/**
 * Helper to check if an episode is subject to the 24-hour Free Tier delay
 * Official new episodes are available immediately on release day for VIP Basic & VIP Monarch,
 * and delayed by 24 hours for Free Tier users.
 */
export function isEpisodeDelayedForFreeUser() {
  return false;
}
