import { useEffect, useState } from 'react';

/**
 * Keeps an overlay mounted for its exit animation: `mounted` stays true for `exitMs`
 * after `open` turns false, with `closing` set meanwhile (add an `.is-closing` class).
 */
export default function usePresence(open, exitMs = 220) {
  const [state, setState] = useState(open ? 'open' : 'closed');
  useEffect(() => {
    if (open) {
      setState('open');
      return undefined;
    }
    setState((s) => (s === 'closed' ? 'closed' : 'closing'));
    const t = setTimeout(() => setState('closed'), exitMs);
    return () => clearTimeout(t);
  }, [open, exitMs]);
  return { mounted: open || state !== 'closed', closing: !open && state !== 'closed' };
}
