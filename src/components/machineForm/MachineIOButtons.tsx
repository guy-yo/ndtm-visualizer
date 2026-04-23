import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { saveMachine, loadMachineFromFile } from '../../utils/machineIO';
import styles from './MachineForm.module.css';

export function MachineIOButtons() {
  const machine = useAppStore((s) => s.machine);
  const setMachine = useAppStore((s) => s.setMachine);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handleLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const loaded = await loadMachineFromFile(file);
      setMachine(loaded);
    } catch {
      alert('Could not load machine: invalid JSON file.');
    }
    e.target.value = '';
  }

  return (
    <div className={styles.ioButtons}>
      <button
        className={styles.ioBtn}
        onClick={() => saveMachine(machine)}
        title="Download machine definition as JSON"
      >
        Save
      </button>
      <button
        className={styles.ioBtn}
        onClick={() => fileRef.current?.click()}
        title="Load machine definition from JSON file"
      >
        Load
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleLoad}
      />
    </div>
  );
}
