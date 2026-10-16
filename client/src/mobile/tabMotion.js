/**
 * Directional tab navigation. Switching tabs slides the page in from the side of the
 * tab that was tapped (mirrored for RTL), opening the profile pushes it up, and the
 * top bar + dock stay perfectly still while the page moves.
 *
 * - WebViews with the View Transitions API (Chrome 111+): the whole page is animated
 *   by ::view-transition-old/new(root) (styled through html[data-bx-vt]).
 * - Older WebViews: the freshly mounted page gets a directional CSS entrance class.
 *
 * The entrance class of a page is decided once, when the page mounts (pageEnterClass),
 * and never changes afterwards — toggling an animation on a live element would replay it.
 * Reduced-motion users get no movement at all.
 */
import { flushSync } from 'react-dom';

export const TAB_ORDER = ['home', 'catalog', 'schedule', 'manga', 'community'];

const VT_ATTR = 'bxVt';
const FRESH_MS = 700;
let pending = null; // { kind, at } of the navigation that is mounting a page right now
let running = null; // the ViewTransition that is animating right now
let relayInstalled = false;

/**
 * While a view transition runs, the browser hit-tests the transition snapshot, so every
 * tap lands on <html> and a quick second tap on the dock was simply lost (any tap within
 * ~0.4 s of the previous tab switch). The dock and the top bar never move during a
 * transition (they have their own view-transition-name), so a tap that lands on <html>
 * over one of their buttons finishes the running transition at once and is handed to
 * that button.
 */
function ensureTapRelay() {
  if (relayInstalled || typeof document === 'undefined') return;
  relayInstalled = true;
  document.addEventListener(
    'click',
    (e) => {
      const t = running;
      const root = document.documentElement;
      if (!t || (e.target !== root && e.target !== document.body)) return;
      const x = e.clientX;
      const y = e.clientY;
      const button = [...document.querySelectorAll('.bx-dock button, .bx-topbar button')].find((b) => {
        const r = b.getBoundingClientRect();
        return r.width > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      });
      if (!button) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        t.skipTransition();
      } catch {
        /* already finished */
      }
      t.finished.finally(() => requestAnimationFrame(() => button.click()));
    },
    true
  );
}

function reducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** 'from-left' | 'from-right' | 'push' | 'pop' | 'fade' — where the new page comes from. */
export function tabMotion(from, to, rtl) {
  if (from === to) return 'fade';
  if (to === 'profile') return 'push';
  if (from === 'profile') return 'pop';
  const a = TAB_ORDER.indexOf(from);
  const b = TAB_ORDER.indexOf(to);
  if (a < 0 || b < 0) return 'fade';
  const forward = b > a;
  // LTR: later tabs sit to the right; RTL: later tabs sit to the left.
  return forward !== Boolean(rtl) ? 'from-right' : 'from-left';
}

/** Class list for a page that is mounting now (call once per mount). */
export function pageEnterClass() {
  if (pending && Date.now() - pending.at < FRESH_MS) return `bx-page bx-enter-${pending.kind}`;
  return 'bx-page';
}

/**
 * Runs `update` (synchronous React state changes) with a directional page transition.
 * Returns true when an animated transition was started.
 */
export function navigateWithMotion(from, to, rtl, update) {
  const root = typeof document !== 'undefined' ? document.documentElement : null;
  if (!root || from === to || reducedMotion()) {
    pending = null;
    update();
    return false;
  }
  const motion = tabMotion(from, to, rtl);
  const vtBusy = root.classList.contains('bx-vt-running');

  if (typeof document.startViewTransition === 'function' && !vtBusy) {
    ensureTapRelay();
    root.dataset[VT_ATTR] = motion;
    root.classList.add('bx-vt-running');
    pending = { kind: 'vt', at: Date.now() };
    try {
      const t = document.startViewTransition(() => {
        pending = { kind: 'vt', at: Date.now() };
        flushSync(update);
      });
      running = t;
      t.finished.finally(() => {
        if (running === t) running = null;
        delete root.dataset[VT_ATTR];
        root.classList.remove('bx-vt-running');
      });
      return true;
    } catch {
      delete root.dataset[VT_ATTR];
      root.classList.remove('bx-vt-running');
    }
  }

  pending = { kind: motion, at: Date.now() };
  update();
  return true;
}
