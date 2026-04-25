import React from 'react';
import ReactDOM from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import styles from './SaveBeforeNewModal.module.css';

interface Props {
  onClose: () => void;
}

export function SaveBeforeNewModal({ onClose }: Props) {
  const saveMachineAs = useAppStore((s) => s.saveMachineAs);
  const newMachine    = useAppStore((s) => s.newMachine);
  const machine       = useAppStore((s) => s.machine);

  // Default name: use number of states as a hint
  const defaultName = `Machine (${machine.states.length} states)`;
  const [name, setName] = React.useState(defaultName);

  // Close on Escape
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSaveAndNew() {
    const trimmed = name.trim();
    if (trimmed) saveMachineAs(trimmed);
    newMachine();
    onClose();
  }

  function handleSkip() {
    newMachine();
    onClose();
  }

  return ReactDOM.createPortal(
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>New Machine</h3>
        <p className={styles.body}>
          Save the current machine to your library before starting fresh?
        </p>

        <label className={styles.label}>Name</label>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAndNew(); }}
          autoFocus
          placeholder="Machine name…"
          maxLength={60}
        />

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.skipBtn} onClick={handleSkip}>
            New without saving
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSaveAndNew}
            disabled={!name.trim()}
          >
            Save &amp; New
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
