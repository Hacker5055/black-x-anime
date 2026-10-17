/**
 * Light haptic feedback through the Web Vibration API. The APK manifest already
 * declares android.permission.VIBRATE, which Android WebView needs for
 * navigator.vibrate(); browsers without it simply ignore the call.
 */
const KEY = 'bx_mob_haptics';
const PATTERNS = { tap: 8, select: 12, toggle: 14, success: [12, 40, 20], warning: [26, 60, 26], error: [30, 50, 30, 50, 30], heavy: 24 };

export function hapticsEnabled() {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setHapticsEnabled(on) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}

export function haptic(kind = 'tap') {
  try {
    if (!hapticsEnabled() || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    navigator.vibrate(PATTERNS[kind] ?? PATTERNS.tap);
  } catch {
    /* some WebViews throw without a user gesture */
  }
}
