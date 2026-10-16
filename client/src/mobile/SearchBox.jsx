import React, { startTransition, useEffect, useRef, useState } from 'react';

/**
 * Search input with its own state: typing re-renders only this input; the app
 * receives the query after a short pause (or Enter) inside a transition, instead
 * of re-rendering the whole app on every key press.
 */
export default function SearchBox({ value, onCommit, delay = 280, inputStyle, placeholder, ariaLabel, autoFocus = false }) {
  const [text, setText] = useState(value || '');
  const timer = useRef(null);
  const lastCommitted = useRef(value || '');

  useEffect(() => {
    // External changes (genre chips, clear buttons) win over the local text.
    if ((value || '') !== lastCommitted.current) {
      lastCommitted.current = value || '';
      setText(value || '');
    }
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = (next) => {
    clearTimeout(timer.current);
    if (next === lastCommitted.current) return;
    lastCommitted.current = next;
    startTransition(() => onCommit(next));
  };

  return (
    <input
      type="search"
      value={text}
      enterKeyHint="search"
      autoFocus={autoFocus}
      aria-label={ariaLabel || placeholder}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        clearTimeout(timer.current);
        if (!next.trim()) commit('');
        else timer.current = setTimeout(() => commit(next), delay);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit(text);
          e.currentTarget.blur();
        }
      }}
      placeholder={placeholder}
      style={inputStyle}
    />
  );
}
