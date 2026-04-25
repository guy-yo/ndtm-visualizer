import { useAppStore } from '../../store/useAppStore';
import { StatesInput } from './StatesInput';
import { ExamplesDropdown } from './ExamplesDropdown';
import { MachineIOButtons } from './MachineIOButtons';
import styles from './MachineForm.module.css';

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
      <div className={styles.sectionHeader}>
        <h2 className={styles.title}>Machine Definition</h2>
        <div className={styles.headerActions}>
          <ExamplesDropdown />
          <MachineIOButtons />
        </div>
      </div>

      <div className={styles.grid}>

        <StatesInput
          label="States"
          value={machine.states}
          onChange={(v) => setMachine({ states: v })}
          error={errFor('states')}
          placeholder="q0, q1, qacc, qrej"
          hint="All the states your machine can be in — separate with commas."
        />

        <StatesInput
          label="Input Alphabet"
          value={machine.inputAlphabet}
          onChange={(v) => setMachine({ inputAlphabet: v })}
          error={errFor('inputAlphabet')}
          placeholder="0, 1"
          hint="Symbols allowed in the input string."
        />

        {/* Tape alphabet: blank symbol shown separately as a fixed non-removable badge */}
        <div className={styles.tapeAlphabetField}>
          <StatesInput
            label="Tape Alphabet"
            value={machine.tapeAlphabet.filter(s => s !== machine.blankSymbol)}
            onChange={handleTapeAlphabet}
            error={errFor('tapeAlphabet')}
            placeholder="0, 1"
            hint="Everything the machine can write — includes input symbols plus extras."
          />
          <div className={styles.blankBadge} title="Blank symbol — always part of the tape alphabet and cannot be removed">
            ⊔ <span className={styles.blankBadgeNote}>always present</span>
          </div>
        </div>

        {/* Constants — all read-only display values, nothing is editable here */}
        <div className={styles.constants}>
          <span className={styles.constantsLabel}>Constants</span>

          <div className={styles.constantRow}>
            <span className={styles.constantKey}>Blank symbol</span>
            <span className={styles.constantVal}>⊔</span>
          </div>

          <div className={styles.constantRow}>
            <span className={styles.constantKey}>Start state</span>
            <span className={styles.constantVal}>{machine.startState || '—'}</span>
          </div>

          <div className={styles.constantRow}>
            <span className={styles.constantKey}>Accept state(s)</span>
            <span className={styles.constantVal}>
              {machine.acceptStates.length ? machine.acceptStates.join(', ') : '—'}
            </span>
          </div>

          <div className={styles.constantRow}>
            <span className={styles.constantKey}>Reject state(s)</span>
            <span className={styles.constantVal}>
              {machine.rejectStates.length ? machine.rejectStates.join(', ') : '—'}
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
