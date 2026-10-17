import React, { useEffect, useMemo, useRef, useState } from 'react';
import BxIcon from './BxIcon.jsx';
import { coverForMode } from './dataSaver.js';

/**
 * Computer only (website): Ctrl+K (⌘K) or «/» opens a quick search. Empty → the app's pages;
 * typing searches the catalogue (the same Algolia search as the search tab, hidden genres
 * excluded). ↑ / ↓ move, Enter opens, Ctrl / ⌘ + Enter opens a title in a new tab, Esc closes.
 */
export default function CommandPalette({ open, onClose, isRtl, dataSaver, search, onOpenItem, onOpenItemNewTab, pages = [] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    const seq = ++seqRef.current;
    setLoading(true);
    const t = setTimeout(async () => {
      let list = [];
      try {
        list = await search(q);
      } catch {
        list = [];
      }
      if (seq !== seqRef.current) return;
      setResults(Array.isArray(list) ? list.slice(0, 8) : []);
      setLoading(false);
      setActive(0);
    }, 220);
    return () => clearTimeout(t);
  }, [query, open, search]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pageRows = pages
      .filter((p) => !q || p.label.toLowerCase().includes(q) || (p.keywords || '').toLowerCase().includes(q))
      .map((p) => ({ kind: 'page', key: `p-${p.id}`, page: p }));
    const itemRows = results.map((it) => ({ kind: 'item', key: `i-${it.objectID}`, item: it }));
    return q.length >= 2 ? [...itemRows, ...pageRows] : pageRows;
  }, [pages, results, query]);

  if (!open) return null;

  const run = (row, newTab = false) => {
    if (!row) return;
    if (row.kind === 'page') {
      onClose();
      row.page.run();
      return;
    }
    if (newTab && onOpenItemNewTab?.(row.item)) return;
    onClose();
    onOpenItem(row.item);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(rows.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(rows[active], e.ctrlKey || e.metaKey);
    }
  };

  return (
    <div className="bx-palette-layer" role="presentation" onMouseDown={onClose}>
      <div className="bx-palette" role="dialog" aria-modal="true" aria-label={isRtl ? 'بحث سريع' : 'Quick search'} onMouseDown={(e) => e.stopPropagation()}>
        <div className="bx-palette-input">
          <BxIcon name="search" />
          <input
            ref={inputRef}
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isRtl ? 'دوّر على أنمي أو روح لصفحة…' : 'Search anime or jump to a page…'}
            aria-label={isRtl ? 'بحث سريع' : 'Quick search'}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="bx-palette-list" role="listbox">
          {rows.length === 0 ? (
            <p className="bx-palette-empty">
              {loading ? (isRtl ? 'بندوّر…' : 'Searching…') : query.trim().length >= 2 ? (isRtl ? 'مفيش نتايج' : 'No results') : ''}
            </p>
          ) : (
            rows.map((row, i) =>
              row.kind === 'page' ? (
                <button
                  key={row.key}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  className={`bx-palette-row${i === active ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(row)}
                >
                  <span className="bx-palette-ico">
                    <BxIcon name={row.page.icon} />
                  </span>
                  <span className="bx-palette-label">{row.page.label}</span>
                  {row.page.hint ? <kbd>{row.page.hint}</kbd> : null}
                </button>
              ) : (
                <button
                  key={row.key}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  className={`bx-palette-row is-item${i === active ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={(e) => run(row, e.ctrlKey || e.metaKey)}
                  onAuxClick={(e) => {
                    if (e.button === 1) run(row, true);
                  }}
                >
                  <img src={coverForMode(row.item.poster, dataSaver)} alt="" loading="lazy" decoding="async" />
                  <span className="bx-palette-label" dir="auto">
                    {row.item.titleEn || row.item.titleAr}
                    <small>{[row.item.year, row.item.type, row.item.rating ? `★ ${row.item.rating}` : ''].filter(Boolean).join(' • ')}</small>
                  </span>
                </button>
              )
            )
          )}
        </div>
        <div className="bx-palette-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> {isRtl ? 'تنقّل' : 'move'}
          </span>
          <span>
            <kbd>Enter</kbd> {isRtl ? 'افتح' : 'open'}
          </span>
          <span>
            <kbd>Ctrl</kbd>+<kbd>Enter</kbd> {isRtl ? 'تاب جديد' : 'new tab'}
          </span>
        </div>
      </div>
    </div>
  );
}
