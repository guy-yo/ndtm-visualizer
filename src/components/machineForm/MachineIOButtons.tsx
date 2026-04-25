import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { saveMachine, loadMachineFromFile } from '../../utils/machineIO';
import { copyShareUrl } from '../../utils/shareUrl';
import { SaveBeforeNewModal } from './SaveBeforeNewModal';
import styles from './MachineForm.module.css';

export function MachineIOButtons() {
  const machine      = useAppStore((s) => s.machine);
  const inputString  = useAppStore((s) => s.inputString);
  const setMachine   = useAppStore((s) => s.setMachine);
  const fileRef      = React.useRef<HTMLInputElement>(null);
  const [copied, setCopied]   = React.useState(false);
  const [showNewModal, setShowNewModal] = React.useState(false);

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

  async function handleShare() {
    const ok = await copyShareUrl(machine, inputString);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      alert('Could not copy URL — try a modern browser.');
    }
  }

  return (
    <>
    {showNewModal && <SaveBeforeNewModal onClose={() => setShowNewModal(false)} />}
    <div className={styles.ioButtons}>
      <button
        className={`${styles.ioBtn} ${styles.ioBtnNew}`}
        onClick={() => setShowNewModal(true)}
        title="Start with a blank machine"
      >
        New
      </button>
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
      <button
        className={styles.ioBtn}
        onClick={handleShare}
        title="Copy shareable URL to clipboard"
      >
        {copied ? '✓ Copied!' : '🔗 Share'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleLoad}
      />
    </div>
    </>
  );
}
