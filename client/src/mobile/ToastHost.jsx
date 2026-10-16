import React, { useSyncExternalStore } from 'react';
import BxIcon from './BxIcon.jsx';
import { getToastSnapshot, subscribeToast } from './toastStore.js';

/** Top toast (icon + spring in/out). Subscribes to toastStore on its own. */
export default function ToastHost() {
  const toast = useSyncExternalStore(subscribeToast, getToastSnapshot, getToastSnapshot);
  if (!toast) return null;
  return (
    <div key={toast.id} className={`bx-toast${toast.leaving ? ' is-leaving' : ''}`} role="status" aria-live="polite">
      <span className={`bx-toast-ico${toast.icon === 'check' ? ' is-success' : ''}`}>
        <BxIcon name={toast.icon} size="1em" strokeWidth={2.4} />
      </span>
      <span>{toast.msg}</span>
    </div>
  );
}
