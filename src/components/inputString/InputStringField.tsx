import { useAppStore } from '../../store/useAppStore';
import styles from './InputStringField.module.css';

export function InputStringField() {
  const inputString = useAppStore((s) => s.inputString);
  const machine = useAppStore((s) => s.machine);
  const setInputString = useAppStore((s) => s.setInputString);

  const invalidChars = inputString
    .split('')
    .filter((c) => !machine.inputAlphabet.includes(c));
  const hasError = invalidChars.length > 0 && machine.inputAlphabet.length > 0;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Input String</h2>
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
    </section>
  );
}
