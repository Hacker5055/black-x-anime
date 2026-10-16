import React from 'react';
import BxIcon from './BxIcon.jsx';
import { TAB_ORDER } from './tabMotion.js';

const TABS = {
  home: { icon: 'home', ar: 'الرئيسية', en: 'Home' },
  catalog: { icon: 'search', ar: 'البحث', en: 'Search' },
  schedule: { icon: 'calendar', ar: 'الجدول', en: 'Schedule' },
  manga: { icon: 'book', ar: 'المانجا', en: 'Manga' },
  community: { icon: 'message', ar: 'المجتمع', en: 'Community' }
};

/**
 * Bottom navigation: five equal tabs, every tab keeps its label, and one indicator
 * pill slides (transform only) to the active tab. The profile has no tab — it is
 * opened from the picture in the top bar — so on the profile no tab is highlighted.
 */
export default function MobileDock({ activeTab, hidden, isRtl, onSelect }) {
  const index = TAB_ORDER.indexOf(activeTab);
  const step = (isRtl ? -1 : 1) * Math.max(index, 0) * 100;
  return (
    <nav className={`bx-dock${hidden ? ' is-hidden' : ''}`} aria-label={isRtl ? 'التنقل الرئيسي' : 'Main navigation'}>
      <span
        className={`bx-dock-indicator${index < 0 ? ' is-off' : ''}`}
        style={{ transform: `translate3d(${step}%, 0, 0)` }}
        aria-hidden="true"
      />
      {TAB_ORDER.map((id) => {
        const tab = TABS[id];
        const active = id === activeTab;
        return (
          <button
            key={id}
            type="button"
            className={`bx-dock-item${active ? ' is-active' : ''}`}
            aria-label={isRtl ? tab.ar : tab.en}
            aria-current={active ? 'page' : undefined}
            onClick={() => onSelect(id)}
          >
            <BxIcon name={tab.icon} size="1.3em" strokeWidth={active ? 2.3 : 1.9} />
            <span className="bx-dock-label">{isRtl ? tab.ar : tab.en}</span>
          </button>
        );
      })}
    </nav>
  );
}
