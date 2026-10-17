/**
 * Website only: the address of a card's title, so a middle click (or Ctrl / ⌘ + click) on a
 * poster opens it in a new browser tab like any link. MobileApkApp sets the builder on the
 * website; in the APK it stays unset and cards behave as before.
 */
let builder = null;

export function setPosterHrefBuilder(fn) {
  builder = typeof fn === 'function' ? fn : null;
}

export function posterHref(item) {
  if (!builder || !item) return '';
  try {
    return String(builder(item) || '');
  } catch {
    return '';
  }
}

/** Opens `href` in a new tab; true when a link was opened. */
export function openInNewTab(href) {
  if (!href || typeof window === 'undefined') return false;
  const w = window.open(href, '_blank', 'noopener');
  if (w) {
    try {
      w.opener = null;
    } catch {
      /* cross-origin */
    }
  }
  return true;
}
