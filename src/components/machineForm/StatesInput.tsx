import React from 'react';
import styles from './StatesInput.module.css';

interface Props {
  label: string;
  value: string[];
  onChange: (values: string[]) => void;
  error?: string;
  placeholder?: string;
  /** If provided, this symbol is displayed as ⊔ and ⊔ is parsed back to it */
  blankSymbol?: string;
}

function toDisplay(vals: string[], blank?: string) {
  if (!blank) return vals.join(', ');
  return vals.map((v) => (v === blank ? '⊔' : v)).join(', ');
}

function fromDisplay(raw: string, blank?: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (blank && s === '⊔' ? blank : s));
}

export function StatesInput({ label, value, onChange, error, placeholder, blankSymbol }: Props) {
  const raw = toDisplay(value, blankSymbol);

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    onChange(fromDisplay(e.target.value, blankSymbol));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(fromDisplay(e.target.value, blankSymbol));
  }

  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        defaultValue={raw}
        key={raw}
        onBlur={handleBlur}
        onChange={handleChange}
        placeholder={placeholder ?? 'comma-separated'}
        spellCheck={false}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
