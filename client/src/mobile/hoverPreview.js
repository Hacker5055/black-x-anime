/**
 * Computer only (website): the preview card that opens when the mouse rests on a poster
 * (HoverPreview.jsx renders it). Posters call `hoverEnter` / `hoverLeave`; one listener
 * (the mounted HoverPreview) receives { item, rect, onOpen } after the mouse stayed still on
 * the card for HOVER_DELAY_MS, and `null` when it should close.
 */
export const HOVER_DELAY_MS = 480;
const LEAVE_GRACE_MS = 180;

let listener = null;
let enabled = false;
let enterTimer = 0;
let leaveTimer = 0;
let current = null;

/** The preview covers the rail it came from: keep that rail's arrows up meanwhile. */
function markRail(on) {
  const rail = current && current.rail;
  if (rail && rail.classList) rail.classList.toggle('is-previewing', on);
}

/** HoverPreview mounts → enabled (website + mouse + wide screen are checked there). */
export function setHoverListener(fn) {
  listener = typeof fn === 'function' ? fn : null;
  enabled = Boolean(listener);
  if (!enabled) {
    clearTimeout(enterTimer);
    clearTimeout(leaveTimer);
    markRail(false);
    current = null;
  }
}

function canHover() {
  if (!enabled || typeof window === 'undefined') return false;
  if (window.innerWidth < 1024) return false;
  return document.documentElement.classList.contains('bx-has-mouse');
}

export function hoverEnter(item, el, onOpen) {
  if (!canHover() || !item || !el) return;
  clearTimeout(leaveTimer);
  clearTimeout(enterTimer);
  if (current && current.item && current.item.objectID === item.objectID) return;
  enterTimer = setTimeout(() => {
    if (!el.isConnected) return;
    markRail(false);
    current = { item, rect: el.getBoundingClientRect(), onOpen, rail: el.closest ? el.closest('.bx-rail-wrap') : null };
    markRail(true);
    listener?.(current);
  }, HOVER_DELAY_MS);
}

/** The mouse left a poster or the preview: close unless it enters the other one quickly. */
export function hoverLeave() {
  clearTimeout(enterTimer);
  if (!current) return;
  clearTimeout(leaveTimer);
  leaveTimer = setTimeout(() => {
    markRail(false);
    current = null;
    listener?.(null);
  }, LEAVE_GRACE_MS);
}

/** The mouse is on the preview itself: keep it open. */
export function hoverKeep() {
  clearTimeout(leaveTimer);
}

export function hoverClose() {
  clearTimeout(enterTimer);
  clearTimeout(leaveTimer);
  if (!current) return;
  markRail(false);
  current = null;
  listener?.(null);
}
