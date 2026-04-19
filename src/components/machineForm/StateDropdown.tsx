import styles from './StateDropdown.module.css';

interface Props {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  error?: string;
  blankSymbol?: string;
}

function symLabel(sym: string, blank?: string) {
  return sym === blank ? '⊔' : sym;
}

export function StateDropdown({ label, options, value, onChange, error, blankSymbol }: Props) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <select
        className={`${styles.select} ${error ? styles.selectError : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.length === 0 && <option value="">-- add states first --</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {symLabel(opt, blankSymbol)}
          </option>
        ))}
      </select>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
