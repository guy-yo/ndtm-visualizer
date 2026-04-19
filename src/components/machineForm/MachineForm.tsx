import { useAppStore } from '../../store/useAppStore';
import { StatesInput } from './StatesInput';
import styles from './MachineForm.module.css';

function parseList(raw: string): string[] {
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

export function MachineForm() {
  const machine = useAppStore((s) => s.machine);
  const errors = useAppStore((s) => s.machineErrors);
  const setMachine = useAppStore((s) => s.setMachine);

  function errFor(field: string) {
    return errors.find((e) => e.field === field)?.message;
  }

  // Tape alphabet excludes blank symbol in the text field — blank shown as a fixed badge
  function handleTapeAlphabet(vals: string[]) {
    const withBlank = vals.includes(machine.blankSymbol)
      ? vals
      : [...vals, machine.blankSymbol];
    setMachine({ tapeAlphabet: withBlank });
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Machine Definition</h2>
      <div className={styles.grid}>

        <StatesInput
          label="States"
          value={machine.states}
          onChange={(v) => setMachine({ states: v })}
          error={errFor('states')}
          placeholder="q0, q1, qacc, qrej"
        />

        <StatesInput
          label="Input Alphabet"
          value={machine.inputAlphabet}
          onChange={(v) => setMachine({ inputAlphabet: v })}
          error={errFor('inputAlphabet')}
          placeholder="0, 1"
        />

        {/* Tape alphabet: blank symbol shown separately as a fixed non-removable badge */}
        <div className={styles.tapeAlphabetField}>
          <StatesInput
            label="Tape Alphabet"
            value={machine.tapeAlphabet.filter(s => s !== machine.blankSymbol)}
            onChange={handleTapeAlphabet}
            error={errFor('tapeAlphabet')}
            placeholder="0, 1"
          />
          <div className={styles.blankBadge} title="Blank symbol — always part of the tape alphabet and cannot be removed">
            ⊔ <span className={styles.blankBadgeNote}>always present</span>
          </div>
        </div>

        {/* Constants — text inputs (no dropdowns / choosers) */}
        <div className={styles.constants}>
          <span className={styles.constantsLabel}>Constants</span>

          {/* Blank symbol: shown as a fixed label (always ⊔) */}
          <div className={styles.constantRow}>
            <span className={styles.constantKey}>Blank symbol</span>
            <span className={styles.constantVal}>⊔</span>
          </div>

          {/* Start state */}
          <div className={styles.constantRow}>
            <span className={styles.constantKey}>Start state</span>
            <input
              className={`${styles.constantInput} ${errFor('startState') ? styles.constantInputError : ''}`}
              value={machine.startState}
              onChange={(e) => setMachine({ startState: e.target.value.trim() })}
              spellCheck={false}
              placeholder="q0"
            />
          </div>

          {/* Accept states */}
          <div className={styles.constantRow}>
            <span className={styles.constantKey}>Accept state(s)</span>
            <input
              className={`${styles.constantInput} ${errFor('acceptStates') ? styles.constantInputError : ''}`}
              defaultValue={machine.acceptStates.join(', ')}
              key={machine.acceptStates.join(',')}
              onBlur={(e) => setMachine({ acceptStates: parseList(e.target.value) })}
              onChange={(e) => setMachine({ acceptStates: parseList(e.target.value) })}
              spellCheck={false}
              placeholder="qacc"
            />
          </div>

          {/* Reject states */}
          <div className={styles.constantRow}>
            <span className={styles.constantKey}>Reject state(s)</span>
            <input
              className={styles.constantInput}
              defaultValue={machine.rejectStates.join(', ')}
              key={machine.rejectStates.join(',')}
              onBlur={(e) => setMachine({ rejectStates: parseList(e.target.value) })}
              onChange={(e) => setMachine({ rejectStates: parseList(e.target.value) })}
              spellCheck={false}
              placeholder="qrej"
            />
          </div>
        </div>

      </div>
    </section>
  );
}
