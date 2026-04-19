import { useAppStore } from '../../store/useAppStore';
import { StatesInput } from './StatesInput';
import { StateDropdown } from './StateDropdown';
import { StateMultiSelect } from './StateMultiSelect';
import styles from './MachineForm.module.css';

export function MachineForm() {
  const machine = useAppStore((s) => s.machine);
  const errors = useAppStore((s) => s.machineErrors);
  const setMachine = useAppStore((s) => s.setMachine);

  function errFor(field: string) {
    return errors.find((e) => e.field === field)?.message;
  }

  // Always keep the blank symbol in the tape alphabet — cannot be removed
  function handleTapeAlphabet(vals: string[]) {
    const withBlank = vals.includes(machine.blankSymbol)
      ? vals
      : [machine.blankSymbol, ...vals];
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
        <StatesInput
          label="Tape Alphabet"
          value={machine.tapeAlphabet}
          onChange={handleTapeAlphabet}
          error={errFor('tapeAlphabet')}
          placeholder="0, 1, ⊔"
          blankSymbol={machine.blankSymbol}
        />
        <StateDropdown
          label="Blank Symbol (⊔)"
          options={machine.tapeAlphabet}
          value={machine.blankSymbol}
          onChange={(v) => setMachine({ blankSymbol: v })}
          error={errFor('blankSymbol')}
          blankSymbol={machine.blankSymbol}
        />
        <StateDropdown
          label="Start State"
          options={machine.states}
          value={machine.startState}
          onChange={(v) => setMachine({ startState: v })}
          error={errFor('startState')}
        />
        <StateMultiSelect
          label="Accept State(s)"
          options={machine.states.filter((s) => !machine.rejectStates.includes(s))}
          selected={machine.acceptStates}
          onChange={(v) => setMachine({ acceptStates: v })}
          error={errFor('acceptStates')}
        />
        <StateMultiSelect
          label="Reject State(s) (optional)"
          options={machine.states.filter((s) => !machine.acceptStates.includes(s))}
          selected={machine.rejectStates}
          onChange={(v) => setMachine({ rejectStates: v })}
        />
      </div>
    </section>
  );
}
