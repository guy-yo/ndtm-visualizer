import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import styles from './InputStringField.module.css';

export function InputStringField() {
  const inputString  = useAppStore((s) => s.inputString);
  const machine      = useAppStore((s) => s.machine);
  const setInputString = useAppStore((s) => s.setInputString);

  const [isOpen, setIsOpen] = React.useState(true);

  const invalidChars = inputString
    .split('')
    .filter((c) => !machine.inputAlphabet.includes(c));
  const hasError = invalidChars.length > 0 && machine.inputAlphabet.length > 0;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <button className={styles.collapseBtn} onClick={() => setIsOpen((o) => !o)}>
          <span className={styles.chevron}>{isOpen ? '▾' : '▸'}</span>
          <h2 className={styles.title}>Input String</h2>
        </button>
      </div>

      {isOpen && (
        <>
          <input
            className={`${styles.input} ${hasError ? styles.inputError : ''}`}
            value={inputString}
            onChange={(e) => setInputString(e.target.value)}
            placeholder="Enter input string..."
            spellCheck={false}
          />
          {hasError && (
            <span className={styles.error}>
              Invalid characters: {[...new Set(invalidChars)].map((c) => `"${c}"`).join(', ')}
            </span>
          )}
          <span className={styles.hint}>
            Allowed: {machine.inputAlphabet.length > 0 ? machine.inputAlphabet.join(', ') : '(none)'} · this is what the machine will read
          </span>
        </>
      )}
    </section>
  );
}
