import React from 'react';
import BottomSheet from './BottomSheet.jsx';

/** Every keyboard / mouse shortcut of the website on a computer (opened with «?»). */
export const SHORTCUT_GROUPS = [
  {
    ar: 'في أي مكان',
    en: 'Anywhere',
    keys: [
      { k: ['Ctrl', 'K'], ar: 'بحث سريع', en: 'Quick search' },
      { k: ['/'], ar: 'بحث سريع', en: 'Quick search' },
      { k: ['?'], ar: 'الشاشة دي', en: 'This list' },
      { k: ['Esc'], ar: 'اقفل اللي مفتوح', en: 'Close what is open' }
    ]
  },
  {
    ar: 'المشغل',
    en: 'Player',
    keys: [
      { k: ['Space'], ar: 'تشغيل / إيقاف', en: 'Play / pause' },
      { k: ['K'], ar: 'تشغيل / إيقاف', en: 'Play / pause' },
      { k: ['←', 'J'], ar: 'رجوع 10 ثواني', en: 'Back 10 s' },
      { k: ['→', 'L'], ar: 'قدّام 10 ثواني', en: 'Forward 10 s' },
      { k: ['↑', '↓'], ar: 'الصوت', en: 'Volume' },
      { k: ['M'], ar: 'كتم الصوت', en: 'Mute' },
      { k: ['F'], ar: 'ملء الشاشة', en: 'Full screen' },
      { k: ['T'], ar: 'وضع السينما', en: 'Cinema mode' },
      { k: ['Shift', 'N'], ar: 'الحلقة اللي بعدها', en: 'Next episode' }
    ]
  },
  {
    ar: 'الماوس',
    en: 'Mouse',
    keys: [
      { k: [{ ar: 'وقّف الماوس على بوستر', en: 'Rest on a poster' }], ar: 'معاينة سريعة', en: 'Quick preview' },
      { k: [{ ar: 'الزرار الوسطاني', en: 'Middle click' }], ar: 'افتح في تاب جديد', en: 'Open in a new tab' },
      { k: ['Ctrl', { ar: 'كليك', en: 'Click' }], ar: 'افتح في تاب جديد', en: 'Open in a new tab' },
      { k: [{ ar: 'كليك على الفيديو', en: 'Click the video' }], ar: 'تشغيل / إيقاف', en: 'Play / pause' },
      { k: [{ ar: 'دبل كليك', en: 'Double click' }], ar: 'ملء الشاشة', en: 'Full screen' }
    ]
  }
];

export default function ShortcutsSheet({ open, onClose, isRtl }) {
  return (
    <BottomSheet open={open} onClose={onClose} title={isRtl ? 'اختصارات الكيبورد والماوس' : 'Keyboard & mouse shortcuts'} closeLabel={isRtl ? 'إغلاق' : 'Close'} className="bx-shortcuts-sheet">
      {SHORTCUT_GROUPS.map((g) => (
        <section key={g.en} className="bx-shortcuts-group">
          <h4>{isRtl ? g.ar : g.en}</h4>
          <ul>
            {g.keys.map((row, i) => (
              <li key={i}>
                <span className="bx-shortcuts-keys">
                  {row.k.map((key, j) => (
                    <kbd key={j}>{typeof key === 'string' ? key : isRtl ? key.ar : key.en}</kbd>
                  ))}
                </span>
                <span>{isRtl ? row.ar : row.en}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </BottomSheet>
  );
}
