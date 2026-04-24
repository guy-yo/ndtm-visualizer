import React from 'react';
import ReactDOM from 'react-dom';
import styles from './ShortcutLegend.module.css';

interface ShortcutRow {
  keys: string[];
  action: string;
}

const SHORTCUTS: ShortcutRow[] = [
  { keys: ['Space'],            action: 'Run All / Step' },
  { keys: ['Shift', 'Space'],   action: 'Step backward' },
  { keys: ['R'],                action: 'Reset' },
  { keys: ['H'],                action: 'Toggle accept-path highlight' },
  { keys: ['Ctrl', 'Z'],        action: 'Undo machine edit' },
  { keys: ['Ctrl', '⇧', 'Z'],   action: 'Redo machine edit' },
];

export function ShortcutLegend() {
  const [open, setOpen]   = React.useState(false);
  const [pos,  setPos]    = React.useState<{ top: number; left: number } | null>(null);
  const wrapperRef        = React.useRef<HTMLDivElement>(null);
  const triggerRef        = React.useRef<HTMLButtonElement>(null);

  function handleToggle() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left });
    }
    setOpen((v) => !v);
  }

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const popover = open && pos
    ? ReactDOM.createPortal(
        <div
          className={styles.popover}
          style={{ top: pos.top, left: pos.left }}
          // Keep portal inside the outside-click ref chain
          ref={(el) => {
            // nothing — the wrapperRef check already covers the trigger
            void el;
          }}
        >
          <div className={styles.popoverTitle}>Keyboard Shortcuts</div>
          <table className={styles.table}>
            <tbody>
              {SHORTCUTS.map((row, i) => (
                <tr key={i}>
                  <td className={styles.keysCell}>
                    {row.keys.map((k, j) => (
                      <React.Fragment key={k}>
                        {j > 0 && <span className={styles.plus}>+</span>}
                        <kbd className={styles.key}>{k}</kbd>
                      </React.Fragment>
                    ))}
                  </td>
                  <td className={styles.actionCell}>{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        ref={triggerRef}
        className={styles.trigger}
        onClick={handleToggle}
        title="Keyboard shortcuts"
        aria-label="Show keyboard shortcuts"
      >
        ?
      </button>
      {popover}
    </div>
  );
}
