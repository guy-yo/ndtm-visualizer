import React from 'react';
import ReactDOM from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import { saveMachine, loadMachineFromFile } from '../../utils/machineIO';
import { copyShareUrl } from '../../utils/shareUrl';
import styles from './MachineForm.module.css';

// ── Inline "Save to My Machines" modal ───────────────────────────────────────
function SaveToLibraryModal({
  defaultName,
  onSave,
  onClose,
}: {
  defaultName: string;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = React.useState(defaultName);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div className={styles.modalOverlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>Save to My Machines</h3>
        <label className={styles.modalLabel}>Name</label>
        <input
          className={styles.modalInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onSave(name.trim()); }}
          autoFocus
          placeholder="Machine name…"
          maxLength={60}
        />
        <div className={styles.modalActions}>
          <button className={styles.modalCancel} onClick={onClose}>Cancel</button>
          <button
            className={styles.modalSave}
            onClick={() => { if (name.trim()) onSave(name.trim()); }}
            disabled={!name.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function MachineIOButtons() {
  const machine          = useAppStore((s) => s.machine);
  const inputString      = useAppStore((s) => s.inputString);
  const setMachine       = useAppStore((s) => s.setMachine);
  const newMachine       = useAppStore((s) => s.newMachine);
  const undo             = useAppStore((s) => s.undo);
  const redo             = useAppStore((s) => s.redo);
  const undoStack        = useAppStore((s) => s.undoStack);
  const redoStack        = useAppStore((s) => s.redoStack);
  const currentMachineId = useAppStore((s) => s.currentMachineId);
  const savedMachines    = useAppStore((s) => s.savedMachines);
  const saveMachineAs    = useAppStore((s) => s.saveMachineAs);

  const fileRef = React.useRef<HTMLInputElement>(null);
  const [copied, setCopied]         = React.useState(false);
  const [showSaveModal, setShowSaveModal] = React.useState(false);

  // "✓ Saved" flash — fires when the active library entry's savedAt updates
  const [savedFlash, setSavedFlash] = React.useState(false);
  const prevSavedAtRef = React.useRef<number | null>(null);

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

  // Save button: if already named → already auto-saved, just flash; else open modal
  function handleSave() {
    if (currentMachineId) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } else {
      setShowSaveModal(true);
    }
  }

  function handleSaveConfirm(name: string) {
    saveMachineAs(name);
    setShowSaveModal(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const defaultName = `Machine (${machine.states.length} states)`;

  return (
    <>
      {showSaveModal && (
        <SaveToLibraryModal
          defaultName={defaultName}
          onSave={handleSaveConfirm}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      <div className={styles.ioButtons}>
        {/* Undo / Redo */}
        <button className={styles.ioBtn} onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">↺</button>
        <button className={styles.ioBtn} onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">↻</button>

        <span className={styles.ioDivider} />

        {/* New — creates a blank machine directly; undoable */}
        <button
          className={`${styles.ioBtn} ${styles.ioBtnNew}`}
          onClick={newMachine}
          title="New blank machine (current state is undoable with ↺)"
        >
          New
        </button>

        {/* Save — saves to "My Machines" library */}
        <button
          className={styles.ioBtn}
          onClick={handleSave}
          title={currentMachineId ? 'Already auto-saved to My Machines' : 'Save to My Machines'}
        >
          Save
        </button>

        {/* Export — download as JSON file */}
        <button
          className={styles.ioBtn}
          onClick={() => saveMachine(machine)}
          title="Export machine as JSON file"
        >
          Export
        </button>

        {/* Load — import from JSON file */}
        <button
          className={styles.ioBtn}
          onClick={() => fileRef.current?.click()}
          title="Load machine from JSON file"
        >
          Load
        </button>

        {/* Share */}
        <button className={styles.ioBtn} onClick={handleShare} title="Copy shareable URL">
          {copied ? '✓ Copied!' : '🔗 Share'}
        </button>

        {savedFlash && <span className={styles.savedFlash}>✓ Saved</span>}

        <input ref={fileRef} type="file" accept=".json,application/json"
          style={{ display: 'none' }} onChange={handleLoad} />
      </div>
    </>
  );
}
