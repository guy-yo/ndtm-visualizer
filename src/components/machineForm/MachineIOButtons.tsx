import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { saveMachine, loadMachineFromFile } from '../../utils/machineIO';
import { copyShareUrl } from '../../utils/shareUrl';
import { SaveBeforeNewModal } from './SaveBeforeNewModal';
import styles from './MachineForm.module.css';

export function MachineIOButtons() {
  const machine            = useAppStore((s) => s.machine);
  const inputString        = useAppStore((s) => s.inputString);
  const setMachine         = useAppStore((s) => s.setMachine);
  const undo               = useAppStore((s) => s.undo);
  const redo               = useAppStore((s) => s.redo);
  const undoStack          = useAppStore((s) => s.undoStack);
  const redoStack          = useAppStore((s) => s.redoStack);
  const currentMachineId   = useAppStore((s) => s.currentMachineId);
  const savedMachines      = useAppStore((s) => s.savedMachines);

  const fileRef = React.useRef<HTMLInputElement>(null);
  const [copied, setCopied]         = React.useState(false);
  const [showNewModal, setShowNewModal] = React.useState(false);
  // Brief "Saved ✓" flash after an auto-save updates the library
  const [savedFlash, setSavedFlash] = React.useState(false);
  const prevSavedAtRef = React.useRef<number | null>(null);

  // Detect when the active library entry's savedAt timestamp changes → flash
  React.useEffect(() => {
    if (!currentMachineId) return;
    const entry = savedMachines.find((m) => m.id === currentMachineId);
    if (!entry) return;
    const prev = prevSavedAtRef.current;
    if (prev !== null && entry.savedAt !== prev) {
      setSavedFlash(true);
      const t = setTimeout(() => setSavedFlash(false), 1800);
      return () => clearTimeout(t);
    }
    prevSavedAtRef.current = entry.savedAt;
  }, [currentMachineId, savedMachines]);

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

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  return (
    <>
      {showNewModal && <SaveBeforeNewModal onClose={() => setShowNewModal(false)} />}
      <div className={styles.ioButtons}>

        {/* Undo / Redo */}
        <button
          className={styles.ioBtn}
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          ↺
        </button>
        <button
          className={styles.ioBtn}
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          ↻
        </button>

        <span className={styles.ioDivider} />

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

        {/* Auto-save indicator */}
        {savedFlash && (
          <span className={styles.savedFlash}>✓ Saved</span>
        )}

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
