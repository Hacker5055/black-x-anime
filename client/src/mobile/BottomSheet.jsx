import React, { useEffect, useRef, useState } from 'react';
import BxIcon from './BxIcon.jsx';
import useSwipeDismiss from './useSwipeDismiss.js';

const EXIT_MS = 240;

/**
 * Bottom sheet with a dimmed backdrop: slides up on open, slides down on close
 * (the content stays mounted for the exit animation), drag down to dismiss.
 */
export default function BottomSheet({ open, onClose, title, closeLabel = 'Close', children, footer, className = '', layerClassName = '' }) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return undefined;
    }
    if (!mounted) return undefined;
    setClosing(true);
    const t = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, EXIT_MS);
    return () => clearTimeout(t);
    // `mounted` is read only to skip the exit animation when the sheet never opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useSwipeDismiss(sheetRef, onClose, { enabled: mounted && !closing, distance: 110 });

  if (!mounted) return null;
  return (
    <div className={`bx-sheet-layer ${layerClassName}${closing ? ' is-closing' : ''}`.trim()} role="presentation" onClick={onClose}>
      <div
        ref={sheetRef}
        className={`bx-bottom-sheet ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bx-sheet-grip" aria-hidden="true" />
        {title ? (
          <div className="bx-sheet-head">
            <h3>{title}</h3>
            <button type="button" className="bx-icon-btn bx-icon-btn-sm" onClick={onClose} aria-label={closeLabel}>
              <BxIcon name="close" />
            </button>
          </div>
        ) : null}
        <div className="bx-sheet-body">{children}</div>
        {footer ? <div className="bx-sheet-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
