import React, { useEffect, useRef, useState } from 'react';

/**
 * Renders its children only once the placeholder is about to scroll into view
 * (then keeps them mounted). The home screen used to build ~1,600 elements and
 * 111 images at once on open.
 */
export default function LazyMount({ children, minHeight = 220, rootMargin = '360px 0px', placeholder = null, eager = false }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(() => eager || typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (visible) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);
  if (visible) return children;
  return (
    <div ref={ref} style={{ minHeight }} aria-hidden="true">
      {placeholder}
    </div>
  );
}
