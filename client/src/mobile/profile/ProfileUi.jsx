import React from 'react';
import BxIcon from '../BxIcon.jsx';

/**
 * Building blocks of the profile hub, modelled on the grouped lists of the big platform
 * apps (iOS Settings, YouTube "You", Netflix / Crunchyroll account pages):
 * a group = optional caption + one rounded card of rows separated by inset hairlines.
 * Every row is at least 56px tall, so it is an easy thumb target, and the whole row is
 * the tap target (the switch / chevron is only the visual affordance).
 */

export function Group({ title, footer, children, className = '' }) {
  return (
    <section className={`bxp-group ${className}`.trim()}>
      {title ? <h3 className="bxp-group-title">{title}</h3> : null}
      <div className="bxp-list">{children}</div>
      {footer ? <p className="bxp-group-foot">{footer}</p> : null}
    </section>
  );
}

function RowBody({ icon, label, sub, media }) {
  return (
    <>
      {media || (icon ? (
        <span className="bxp-row-ico" aria-hidden="true">
          <BxIcon name={icon} size="1.1em" />
        </span>
      ) : null)}
      <span className="bxp-row-main">
        <span className="bxp-row-label" dir="auto">
          {label}
        </span>
        {sub ? (
          <span className="bxp-row-sub" dir="auto">
            {sub}
          </span>
        ) : null}
      </span>
    </>
  );
}

/** Navigation / action row: icon tile, label + optional subline, value or badge, chevron. */
export function Row({ icon, media, label, sub, value, badge, onClick, href, chevron, danger, className = '', ...rest }) {
  const interactive = Boolean(onClick || href);
  const showChevron = chevron ?? interactive;
  const cls = `bxp-row${interactive ? ' is-tap' : ''}${danger ? ' is-danger' : ''} ${className}`.trim();
  const tail = (
    <>
      {badge != null && badge !== false && badge !== '' ? <span className="bxp-row-badge">{badge}</span> : null}
      {value != null && value !== '' ? (
        <span className="bxp-row-value" dir="auto">
          {value}
        </span>
      ) : null}
      {showChevron ? <BxIcon name="chevron-right" size="1.05em" className="bxp-row-chev" /> : null}
    </>
  );
  if (href) {
    return (
      <a className={cls} href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} {...rest}>
        <RowBody icon={icon} media={media} label={label} sub={sub} />
        {tail}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} {...rest}>
        <RowBody icon={icon} media={media} label={label} sub={sub} />
        {tail}
      </button>
    );
  }
  return (
    <div className={cls} {...rest}>
      <RowBody icon={icon} media={media} label={label} sub={sub} />
      {tail}
    </div>
  );
}

/** Boolean setting: the whole row is the switch (role="switch"), the knob slides. */
export function SwitchRow({ icon, label, sub, checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      disabled={disabled}
      className="bxp-row is-tap"
      onClick={() => onChange(!checked)}
    >
      <RowBody icon={icon} label={label} sub={sub} />
      <span className={`bxp-switch${checked ? ' is-on' : ''}`} aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

/** Small set of choices (2–3 options): label on top, segmented control underneath. */
export function SegmentedRow({ icon, label, sub, options, value, onChange, ariaLabel }) {
  return (
    <div className="bxp-row bxp-row-stack">
      <div className="bxp-row-top">
        <RowBody icon={icon} label={label} sub={sub} />
      </div>
      <Segmented options={options} value={value} onChange={onChange} ariaLabel={ariaLabel || label} block />
    </div>
  );
}

export function Segmented({ options, value, onChange, ariaLabel, block = false, className = '' }) {
  return (
    <div className={`bx-seg bxp-seg${block ? ' is-block' : ''} ${className}`.trim()} role="radiogroup" aria-label={ariaLabel}>
      {options.map(([id, text, count]) => (
        <button
          key={String(id)}
          type="button"
          role="radio"
          aria-checked={value === id}
          className={value === id ? 'is-on' : ''}
          onClick={() => onChange(id)}
        >
          {text}
          {count != null ? <span className="bxp-seg-count">{count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** One choice of a longer list (splash themes, titles): a check mark marks the active row. */
export function ChoiceRow({ icon, label, sub, selected, onSelect, locked }) {
  return (
    <button type="button" role="radio" aria-checked={Boolean(selected)} className={`bxp-row is-tap${selected ? ' is-selected' : ''}`} onClick={onSelect}>
      <RowBody icon={icon} label={label} sub={sub} />
      {locked ? <BxIcon name="lock" size="1em" className="bxp-row-lock" /> : null}
      <span className={`bxp-check${selected ? ' is-on' : ''}`} aria-hidden="true">
        {selected ? <BxIcon name="check" size="0.95em" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

export function Empty({ icon, title, text, action }) {
  return (
    <div className="bxp-empty">
      <span className="bxp-empty-ico" aria-hidden="true">
        <BxIcon name={icon} size="1.6em" />
      </span>
      <p className="bxp-empty-title">{title}</p>
      {text ? <p className="bxp-empty-text">{text}</p> : null}
      {action || null}
    </div>
  );
}

/** Labelled form field (label above, 48px input). */
export function Field({ label, hint, children }) {
  return (
    <label className="bxp-field">
      <span className="bxp-field-label">{label}</span>
      {children}
      {hint ? <span className="bxp-field-hint">{hint}</span> : null}
    </label>
  );
}

export function GoogleMark({ size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}
