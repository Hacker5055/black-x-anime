/**
 * Shared-element transition (poster -> details header) with the View Transitions
 * API. Falls back to the normal sheet animation on old WebViews and when the
 * user asked for reduced motion.
 */
import { flushSync } from 'react-dom';

const NAME = 'bx-poster';
let lastPointerTarget = null;
let lastPointerAt = 0;
let installed = false;

export function installPointerTracker() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('pointerdown', (e) => {
    lastPointerTarget = e.target;
    lastPointerAt = Date.now();
  }, { capture: true, passive: true });
}

export function viewTransitionsAvailable() {
  if (typeof document === 'undefined' || typeof document.startViewTransition !== 'function') return false;
  try {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

/** The poster <img> of the card the user just tapped (if any). */
function tappedPoster() {
  // Only a tap from the last moment counts (programmatic opens have no source).
  if (Date.now() - lastPointerAt > 900) return null;
  let el = lastPointerTarget instanceof Element ? lastPointerTarget : null;
  // Inside the details sheet the header already carries the shared name.
  if (el && el.closest('.bx-details-sheet')) return null;
  for (let depth = 0; el && depth < 6; depth += 1, el = el.parentElement) {
    if (el.tagName === 'IMG') return el;
    const img = el.querySelector?.('img');
    if (img && img.getBoundingClientRect().width >= 48) return img;
  }
  return null;
}

/** Runs `update` (a React state change) inside a view transition from the tapped poster. */
export function transitionFromTappedPoster(update) {
  const source = viewTransitionsAvailable() ? tappedPoster() : null;
  lastPointerTarget = null;
  if (!source) {
    update();
    return false;
  }
  source.style.viewTransitionName = NAME;
  document.documentElement.classList.add('bx-vt-running');
  try {
    const t = document.startViewTransition(() => {
      flushSync(update);
      source.style.viewTransitionName = '';
    });
    t.finished.finally(() => {
      source.style.viewTransitionName = '';
      document.documentElement.classList.remove('bx-vt-running');
    });
    return true;
  } catch {
    source.style.viewTransitionName = '';
    document.documentElement.classList.remove('bx-vt-running');
    update();
    return false;
  }
}

/** Reverse transition: details header -> the card for `objectID` once it is back on screen. */
export function transitionBackToCard(update, objectID) {
  if (!viewTransitionsAvailable() || !objectID) {
    update();
    return;
  }
  document.documentElement.classList.add('bx-vt-running');
  let target = null;
  try {
    const t = document.startViewTransition(() => {
      flushSync(update);
      const safe = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(String(objectID)) : String(objectID).replace(/"/g, '');
      target = document.querySelector(`[data-bx-oid="${safe}"] img`);
      if (target && target.getBoundingClientRect().bottom > 0 && target.getBoundingClientRect().top < window.innerHeight) {
        target.style.viewTransitionName = NAME;
      } else {
        target = null;
      }
    });
    t.finished.finally(() => {
      if (target) target.style.viewTransitionName = '';
      document.documentElement.classList.remove('bx-vt-running');
    });
  } catch {
    document.documentElement.classList.remove('bx-vt-running');
    update();
  }
}

export const POSTER_TRANSITION_NAME = NAME;
