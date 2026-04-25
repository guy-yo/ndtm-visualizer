import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import styles from './MyMachinesDropdown.module.css';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function MyMachinesDropdown() {
  const savedMachines      = useAppStore((s) => s.savedMachines);
  const loadLibraryMachine = useAppStore((s) => s.loadLibraryMachine);
  const deleteLibraryMachine = useAppStore((s) => s.deleteLibraryMachine);

  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (savedMachines.length === 0) return null;

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        title="Your saved machines"
      >
        My Machines{savedMachines.length > 0 ? ` (${savedMachines.length})` : ''} ▾
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>Saved Machines</div>
          <ul className={styles.list}>
            {savedMachines.map((m) => (
              <li key={m.id} className={styles.item}>
                <button
                  className={styles.loadBtn}
                  onClick={() => { loadLibraryMachine(m.id); setOpen(false); }}
                  title={`Load "${m.name}"`}
                >
                  <span className={styles.machineName}>{m.name}</span>
                  <span className={styles.machineDate}>{formatDate(m.savedAt)}</span>
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => { e.stopPropagation(); deleteLibraryMachine(m.id); }}
                  title="Remove from library"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
