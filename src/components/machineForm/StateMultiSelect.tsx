import React, { useState, useRef, useEffect } from 'react';
import styles from './StateMultiSelect.module.css';

interface Props {
  label: string;
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
  error?: string;
}

export function StateMultiSelect({ label, options, selected, onChange, error }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function toggle(opt: string) {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  }

  const display = selected.length === 0 ? 'none selected' : selected.join(', ');

  return (
    <div className={styles.field} ref={ref}>
      <label className={styles.label}>{label}</label>
      <button
        type="button"
        className={`${styles.trigger} ${error ? styles.triggerError : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.display}>{display}</span>
        <span className={styles.chevron}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className={styles.dropdown}>
          {options.length === 0 && (
            <div className={styles.empty}>No states defined</div>
          )}
          {options.map((opt) => (
            <label key={opt} className={styles.option}>
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
