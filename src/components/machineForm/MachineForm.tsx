import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { StatesInput } from './StatesInput';
import { ExamplesDropdown } from './ExamplesDropdown';
import { MyMachinesDropdown } from './MyMachinesDropdown';
import { MachineIOButtons } from './MachineIOButtons';
import styles from './MachineForm.module.css';

export function MachineForm() {
  const machine          = useAppStore((s) => s.machine);
  const errors           = useAppStore((s) => s.machineErrors);
  const setMachine       = useAppStore((s) => s.setMachine);
  const currentMachineId = useAppStore((s) => s.currentMachineId);
  const savedMachines    = useAppStore((s) => s.savedMachines);

  const [collapsed, setCollapsed] = React.useState(false);

  const currentName = currentMachineId
    ? (savedMachines.find((m) => m.id === currentMachineId)?.name ?? null)
    : null;

  function errFor(field: string) {
    return errors.find((e) => e.field === field)?.message;
  }

  function handleTapeAlphabet(vals: string[]) {
    const withBlank = vals.includes(machine.blankSymbol)
      ? vals
      : [...vals, machine.blankSymbol];
    setMachine({ tapeAlphabet: withBlank });
  }

  return (
    <section className={styles.section}>

      {/* ── Row 1: title + chevron ─────────────────────────────────────── */}
      <div className={styles.titleRow}>
        <button
          className={styles.chevronBtn}
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand' : 'Collapse'}
          aria-label={collapsed ? 'Expand section' : 'Collapse section'}
        >
          {collapsed ? '▸' : '▾'}
        </button>
        <h2 className={styles.title}>Machine Definition</h2>
        {currentName && (
          <span className={styles.currentMachineName}>{currentName}</span>
        )}
      </div>

      {/* ── Row 2: load dropdowns ──────────────────────────────────────── */}
      <div className={styles.toolRow}>
        <ExamplesDropdown />
        <MyMachinesDropdown />
      </div>

      {/* ── Row 3: undo/redo + IO buttons ─────────────────────────────── */}
      <div className={styles.toolRow}>
        <MachineIOButtons />
      </div>

      {/* ── Collapsible form body ──────────────────────────────────────── */}
      {!collapsed && (
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
      )}
    </section>
  );
}
