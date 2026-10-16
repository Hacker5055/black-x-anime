/**
 * Toasts live outside the app component: showing one re-renders only <ToastHost>,
 * not the whole 15k-line app tree (it used to be root state).
 */
import { stripEmoji } from './BxIcon.jsx';

let current = null;
let timers = [];
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

export function showToastMessage(msg, icon = 'info') {
  const text = stripEmoji(String(msg ?? ''));
  if (!text) return;
  const id = Date.now() + Math.random();
  timers.forEach(clearTimeout);
  current = { id, msg: text, icon: icon || 'info', leaving: false };
  emit();
  timers = [
    setTimeout(() => {
      if (current?.id === id) {
        current = { ...current, leaving: true };
        emit();
      }
    }, 3000),
    setTimeout(() => {
      if (current?.id === id) {
        current = null;
        emit();
      }
    }, 3300)
  ];
}

export function subscribeToast(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getToastSnapshot() {
  return current;
}
