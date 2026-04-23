import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { EXAMPLE_MACHINES } from '../../store/exampleMachines';
import styles from './MachineForm.module.css';

export function ExamplesDropdown() {
  const setMachine = useAppStore((s) => s.setMachine);
  const setInputString = useAppStore((s) => s.setInputString);
  const [value, setValue] = React.useState('');

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const idx = Number(e.target.value);
    if (isNaN(idx)) return;
    const entry = EXAMPLE_MACHINES[idx];
    if (!entry) return;
    setMachine(entry.machine);
    setInputString(entry.input);
    setValue(''); // reset to placeholder
  }

  return (
    <select
      className={styles.examplesSelect}
      value={value}
      onChange={handleChange}
      title="Load a classic example machine"
    >
      <option value="">Load example…</option>
      {EXAMPLE_MACHINES.map((ex, i) => (
        <option key={i} value={i}>{ex.label}</option>
      ))}
    </select>
  );
}
