import React from 'react';
import ReactDOM from 'react-dom';
import type { MoveDirection, NTMDefinition } from '../../types/machine';
import styles from './AddTransitionModal.module.css';

interface Props {
  fromState: string;
  toState: string;
  machine: NTMDefinition;
  onAdd: (read: string, write: string, move: MoveDirection) => void;
  onClose: () => void;
}

const MOVES: MoveDirection[] = ['L', 'S', 'R'];

function symLabel(sym: string, blank: string) {
  return sym === blank ? '⊔' : sym;
}

export function AddTransitionModal({ fromState, toState, machine, onAdd, onClose }: Props) {
  const { tapeAlphabet, blankSymbol } = machine;

  const [read,  setRead]  = React.useState<string>(tapeAlphabet[0] ?? '');
  const [write, setWrite] = React.useState<string>(tapeAlphabet[0] ?? '');
  const [move,  setMove]  = React.useState<MoveDirection>('R');

  // Close on Escape key
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleAdd() {
    onAdd(read, write, move);
  }

  return ReactDOM.createPortal(
    <div className={styles.overlay} onMouseDown={handleOverlayClick}>
      <div className={styles.modal}>
        <p className={styles.title}>Add Transition</p>

        {/* Route display */}
        <div className={styles.route}>
          <span className={styles.stateLabel}>{fromState}</span>
          <span className={styles.arrow}>→</span>
          <span className={styles.stateLabel}>{toState}</span>
        </div>

        <div className={styles.fields}>
          {/* Read */}
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Read</span>
            <select
              className={styles.sel}
              value={read}
              onChange={(e) => setRead(e.target.value)}
            >
              <option value="Σ">Σ — any</option>
              {tapeAlphabet.map((s) => (
                <option key={s} value={s}>{symLabel(s, blankSymbol)}</option>
              ))}
            </select>
          </div>

          {/* Write */}
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Write</span>
            <select
              className={styles.sel}
              value={write}
              onChange={(e) => setWrite(e.target.value)}
            >
              <option value="Σ">Σ — keep</option>
              {tapeAlphabet.map((s) => (
                <option key={s} value={s}>{symLabel(s, blankSymbol)}</option>
              ))}
            </select>
          </div>

          {/* Move */}
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Move</span>
            <div className={styles.moveGroup}>
              {MOVES.map((m) => (
                <button
                  key={m}
                  className={`${styles.moveBtn} ${move === m ? styles.moveBtnActive : ''}`}
                  onClick={() => setMove(m)}
                  title={{ L: 'Move Left', S: 'Stay', R: 'Move Right' }[m]}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.addBtn}    onClick={handleAdd}>Add</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
