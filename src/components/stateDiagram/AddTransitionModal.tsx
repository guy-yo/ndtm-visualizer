import React from 'react';
import ReactDOM from 'react-dom';
import type { MoveDirection, NTMDefinition } from '../../types/machine';
import styles from './AddTransitionModal.module.css';

// ── Minimal transition fields needed for editing ──────────────────────────────
export interface EditableTransition {
  id: string;
  readSymbol: string;
  writeSymbol: string;
  move: MoveDirection;
}

interface Props {
  /** Pre-selected "from" state. null = show dropdown (free mode). */
  fromState: string | null;
  /** Pre-selected "to" state. null = show dropdown (free mode). */
  toState: string | null;
  machine: NTMDefinition;
  /** When provided the modal opens in edit mode (pre-filled, Save button). */
  editTransition?: EditableTransition | null;
  onAdd:  (from: string, to: string, read: string, write: string, move: MoveDirection) => void;
  onEdit?: (id: string, read: string, write: string, move: MoveDirection) => void;
  onClose: () => void;
}

const MOVES: MoveDirection[] = ['L', 'S', 'R'];

function symLabel(sym: string, blank: string) {
  return sym === blank ? '⊔' : sym;
}

export function AddTransitionModal({
  fromState,
  toState,
  machine,
  editTransition,
  onAdd,
  onEdit,
  onClose,
}: Props) {
  const { tapeAlphabet, blankSymbol, states, acceptStates, rejectStates } = machine;

  // States that may be the SOURCE of a transition (not terminal)
  const nonTerminalStates = states.filter(
    (s) => !acceptStates.includes(s) && !rejectStates.includes(s),
  );

  const isEditMode = !!editTransition;

  // From / To — mutable even when pre-set from the drag gesture
  const [selFrom, setSelFrom] = React.useState<string>(
    fromState ?? nonTerminalStates[0] ?? states[0] ?? '',
  );
  const [selTo, setSelTo] = React.useState<string>(
    toState ?? states[0] ?? '',
  );

  // Read / Write / Move
  const [read,  setRead]  = React.useState<string>(
    editTransition?.readSymbol  ?? tapeAlphabet[0] ?? '',
  );
  const [write, setWrite] = React.useState<string>(
    editTransition?.writeSymbol ?? tapeAlphabet[0] ?? '',
  );
  const [move,  setMove]  = React.useState<MoveDirection>(
    editTransition?.move ?? 'R',
  );

  // Close on Escape
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

  function handleConfirm() {
    if (isEditMode && editTransition && onEdit) {
      onEdit(editTransition.id, read, write, move);
    } else {
      onAdd(selFrom, selTo, read, write, move);
    }
  }

  const title = isEditMode ? 'Edit Transition' : 'Add Transition';
  const confirmLabel = isEditMode ? 'Save' : 'Add';

  return ReactDOM.createPortal(
    <div className={styles.overlay} onMouseDown={handleOverlayClick}>
      <div className={styles.modal}>
        <p className={styles.title}>{title}</p>

        {/* ── Route row ───────────────────────────────────────────── */}
        <div className={styles.route}>
          {isEditMode ? (
            // Edit mode: fixed labels for from/to
            <>
              <span className={styles.stateLabel}>{selFrom}</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.stateLabel}>{selTo}</span>
            </>
          ) : (
            // Add mode: dropdowns (pre-selected when from drag gesture)
            <>
              <select
                className={styles.stateSelect}
                value={selFrom}
                onChange={(e) => setSelFrom(e.target.value)}
              >
                {nonTerminalStates.length > 0
                  ? nonTerminalStates.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))
                  : states.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))
                }
              </select>
              <span className={styles.arrow}>→</span>
              <select
                className={styles.stateSelect}
                value={selTo}
                onChange={(e) => setSelTo(e.target.value)}
              >
                {states.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* ── Fields ─────────────────────────────────────────────── */}
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

        {/* ── Actions ─────────────────────────────────────────────── */}
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.addBtn} onClick={handleConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
