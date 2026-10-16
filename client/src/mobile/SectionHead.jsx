import React from 'react';
import BxIcon from './BxIcon.jsx';

/** Row header: title + an optional short "All" link (never wraps). */
export default function SectionHead({ title, onMore, isRtl, moreLabel }) {
  return (
    <div className="bx-section-head">
      <h2 className="bx-section-title">{title}</h2>
      {onMore ? (
        <button type="button" className="bx-see-all" onClick={onMore}>
          {moreLabel || (isRtl ? 'الكل' : 'See all')}
          <BxIcon name={isRtl ? 'chevron-left' : 'chevron-right'} size="1em" />
        </button>
      ) : null}
    </div>
  );
}
