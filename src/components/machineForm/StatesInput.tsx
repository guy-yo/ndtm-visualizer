import React from 'react';
import styles from './StatesInput.module.css';

interface Props {
  label: string;
  value: string[];
  onChange: (values: string[]) => void;
  error?: string;
  placeholder?: string;
  hint?: string;
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

export function StatesInput({ label, value, onChange, error, placeholder, hint, blankSymbol }: Props) {
  // Local draft: typing updates draft only; commit (setMachine) fires only on blur
  const [draft, setDraft] = React.useState(() => toDisplay(value, blankSymbol));

  // Sync draft when the external value changes (e.g. machine reset, load example)
  const externalKey = toDisplay(value, blankSymbol);
  React.useEffect(() => {
    setDraft(externalKey);
  }, [externalKey]);

  return (
    <div className={styles.field}>
      {label && <label className={styles.label}>{label}</label>}
      <input
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => onChange(fromDisplay(e.target.value, blankSymbol))}
        placeholder={placeholder ?? 'comma-separated'}
        spellCheck={false}
      />
      {error && <span className={styles.error}>{error}</span>}
      {hint && !error && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
