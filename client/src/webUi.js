/**
 * Which interface the website shows (owner's decision, 2026-10-16):
 *
 * - Phones get the BLACK X app interface itself (client/src/mobile, the same code the APK runs),
 *   so every app update reaches the phone website automatically.
 * - Computers and tablets keep the website pages (client/src/App.jsx).
 *
 * Visitors can switch by hand: `?ui=app` / `?ui=site` (also used by the "computer version"
 * row in the app's profile and the "phone interface" link in the website footer). The choice
 * is remembered on that browser. `?apk_ui=1` (older preview link) opens the app interface
 * without remembering it.
 *
 * Keep this file tiny and free of imports: main.jsx runs it before anything else is loaded.
 */
export const WEB_UI_KEY = 'bx_web_ui';

function mediaMatches(query) {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

/** A phone: small screen (shorter side ≤ 600 CSS px) used by touch, or a phone browser. */
export function isPhoneDevice() {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator || {};
  const scr = window.screen || {};
  const sides = [Number(scr.width) || 0, Number(scr.height) || 0].filter((n) => n > 0);
  const shortSide = sides.length ? Math.min(...sides) : Number(window.innerWidth) || 0;
  if (!shortSide || shortSide > 600) return false;
  const uaMobile =
    nav.userAgentData && typeof nav.userAgentData.mobile === 'boolean' && nav.userAgentData.mobile
      ? true
      : /Android.+Mobile|iPhone|iPod|Windows Phone|IEMobile|Opera Mini|Mobile Safari/i.test(String(nav.userAgent || ''));
  const touchOnly = mediaMatches('(pointer: coarse)') && mediaMatches('(hover: none)');
  return uaMobile || touchOnly;
}

/** The visitor's saved choice ('app' | 'site') or ''. */
export function savedWebUi() {
  try {
    const saved = window.localStorage.getItem(WEB_UI_KEY);
    return saved === 'app' || saved === 'site' ? saved : '';
  } catch {
    return '';
  }
}

/** 'app' (the phone app interface) or 'site' (the website pages). */
export function decideWebUi() {
  if (typeof window === 'undefined') return 'site';
  let params = null;
  try {
    params = new URLSearchParams(window.location.search);
  } catch {
    params = null;
  }
  const forced = params ? params.get('ui') : '';
  if (forced === 'app' || forced === 'site') {
    try {
      window.localStorage.setItem(WEB_UI_KEY, forced);
    } catch {
      /* private mode: still honour it for this visit */
    }
    return forced;
  }
  if (params && params.get('apk_ui') === '1') return 'app';
  return savedWebUi() || (isPhoneDevice() ? 'app' : 'site');
}

/**
 * Switch interface and reload. `path` is where to land (defaults to the current page,
 * without any `ui` / `apk_ui` parameter).
 */
export function switchWebUi(mode, path = '') {
  const next = mode === 'app' ? 'app' : 'site';
  try {
    window.localStorage.setItem(WEB_UI_KEY, next);
  } catch {
    /* the ?ui= parameter below still switches this visit */
  }
  let target = path;
  if (!target) {
    const params = new URLSearchParams(window.location.search);
    params.delete('ui');
    params.delete('apk_ui');
    const qs = params.toString();
    target = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
  }
  const sep = target.includes('?') ? '&' : '?';
  window.location.assign(`${target}${sep}ui=${next}`);
}
