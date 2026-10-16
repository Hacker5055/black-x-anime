/**
 * Browser history for the phone website (the app interface served by the website).
 *
 * The app keeps its own stack (tabs, title page, player, sheets, profile pages) and already
 * knows how to step back one level (the Android back button). In a browser:
 *
 * - the address bar always shows the page on screen (replaceState), so reloading or sharing
 *   the link opens the same page (webRoutes.js maps both ways);
 * - while the app has something to close, ONE extra history entry (the "trap") sits on top.
 *   The browser's back button pops it, the app steps back one level, and the trap comes back
 *   if there is still something to close. With nothing open the back button leaves the site
 *   like on any website (no "press back again to exit" inside a browser);
 * - closing something with an in-app button removes the trap again, so the history never
 *   fills up with dead entries.
 *
 * Chrome skips history entries added before the visitor has touched the page, so the trap is
 * only added after the first tap or key press (a deep link opened from another site can be
 * left with one back press until then).
 */

let installed = false;
let armed = false; // the current history entry is our trap
let ignorePops = 0; // pops caused by our own history.back()
let ignoreTimer = 0;
let pendingUrl = '';
let activated = false;
let wantTrap = false;
let currentUrl = '';
let onBackHandler = null;
let recheckTimer = 0;

function here() {
  return `${window.location.pathname}${window.location.search}`;
}

function replaceUrl(url, trap) {
  try {
    const state = window.history.state;
    const isTrap = Boolean(state && state.bxTrap);
    if (url === here() && isTrap === trap) return;
    window.history.replaceState(trap ? { bxTrap: 1 } : null, '', url);
  } catch {
    /* a sandboxed frame can refuse history changes */
  }
}

function pushTrap(url) {
  try {
    window.history.pushState({ bxTrap: 1 }, '', url || here());
    armed = true;
  } catch {
    armed = false;
  }
}

/**
 * Steps back one app level on the browser's back button. The listeners stay for the life of
 * the page (the app is the whole page); the returned cleanup only detaches `onBack`, so React
 * re-running the effect never loses track of the trap entry.
 */
export function installWebHistory(onBack) {
  onBackHandler = onBack;
  const detach = () => {
    if (onBackHandler === onBack) onBackHandler = null;
  };
  if (installed) return detach;
  installed = true;
  activated = Boolean(window.navigator?.userActivation?.hasBeenActive);

  const onPop = (event) => {
    if (ignorePops > 0) {
      ignorePops -= 1;
      if (pendingUrl) replaceUrl(pendingUrl, false);
      pendingUrl = '';
      return;
    }
    if (event.state && event.state.bxTrap) {
      // "Forward" back into a trap entry: nothing to undo, just keep it as the trap.
      armed = true;
      if (currentUrl) replaceUrl(currentUrl, true);
      return;
    }
    armed = false;
    if (typeof onBackHandler === 'function') onBackHandler();
    // If stepping back changed nothing on screen, no new sync arrives: put the trap back.
    clearTimeout(recheckTimer);
    recheckTimer = setTimeout(() => {
      if (wantTrap && !armed && activated) pushTrap(currentUrl);
    }, 80);
  };
  const onActivate = (event) => {
    // Only a real tap / key press counts (the app also fires programmatic clicks).
    if (activated || !event.isTrusted) return;
    activated = true;
    if (wantTrap && !armed) pushTrap(currentUrl);
  };

  window.addEventListener('popstate', onPop);
  window.addEventListener('click', onActivate, true);
  window.addEventListener('touchend', onActivate, { capture: true, passive: true });
  window.addEventListener('keydown', onActivate, true);
  return detach;
}

/** Called after every navigation inside the app: `url` of the page on screen, `depth` > 0 when back can close something. */
export function syncWebHistory(url, depth) {
  currentUrl = url;
  wantTrap = depth > 0;
  if (wantTrap) {
    if (armed) replaceUrl(url, true);
    else if (activated) pushTrap(url);
    else replaceUrl(url, false);
    return;
  }
  if (armed) {
    // Closed with an in-app button: drop the trap so the next back press leaves the site.
    armed = false;
    ignorePops += 1;
    pendingUrl = url;
    clearTimeout(ignoreTimer);
    ignoreTimer = setTimeout(() => {
      ignorePops = 0;
      if (pendingUrl) replaceUrl(pendingUrl, false);
      pendingUrl = '';
    }, 900);
    try {
      window.history.back();
    } catch {
      ignorePops = 0;
      replaceUrl(url, false);
    }
    return;
  }
  replaceUrl(url, false);
}

/** For tests and diagnostics. */
export function webHistoryState() {
  return { armed, activated, wantTrap, ignorePops, currentUrl };
}
