import React from 'react';
import ReactDOM from 'react-dom';
import type { Transition } from '../../types/machine';
import styles from './DiagramContextMenu.module.css';

// ── Discriminated union for the three menu variants ───────────────────────────
export type MenuContext =
  | { kind: 'canvas'; x: number; y: number }
  | { kind: 'node';   x: number; y: number; stateName: string; isStart: boolean; isAccept: boolean; isReject: boolean }
  | { kind: 'edge';   x: number; y: number; transitions: Transition[]; blankSymbol: string };

interface Props {
  ctx: MenuContext;
  existingStates: string[];
  onClose: () => void;
  // diagram actions (bound to store)
  onAddState:          (name: string)       => void;
  onDeleteState:       (name: string)       => void;
  onSetStart:          (name: string)       => void;
  onToggleAccept:      (name: string)       => void;
  onToggleReject:      (name: string)       => void;
  onDeleteTransition:  (id: string)         => void;
  onEditTransition?:   (t: Transition)      => void;
}

function symLabel(sym: string, blank: string) {
  return sym === blank ? '⊔' : sym;
}

// ── Canvas menu — "Add State" ─────────────────────────────────────────────────
function CanvasMenu({ onClose, onAddState, existingStates }: {
  onClose: () => void;
  onAddState: (name: string) => void;
  existingStates: string[];
}) {
  const [showInput, setShowInput] = React.useState(false);
  const [name, setName] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (showInput) inputRef.current?.focus();
  }, [showInput]);

  const error = name.trim() && existingStates.includes(name.trim())
    ? 'State already exists'
    : '';

  function commit() {
    const trimmed = name.trim();
    if (!trimmed || error) return;
    onAddState(trimmed);
    onClose();
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  }

  if (!showInput) {
    return (
      <button className={styles.item} onClick={() => setShowInput(true)}>
        <span>➕</span> Add State
      </button>
    );
  }

  return (
    <div className={styles.addStateRow}>
      <input
        ref={inputRef}
        className={styles.addStateInput}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKey}
        placeholder="state name…"
        spellCheck={false}
      />
      {error
        ? <p className={styles.addStateError}>{error}</p>
        : <p className={styles.addStateHint}>Press Enter to add · Esc to cancel</p>
      }
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function DiagramContextMenu({
  ctx, existingStates, onClose,
  onAddState, onDeleteState, onSetStart, onToggleAccept, onToggleReject,
  onDeleteTransition, onEditTransition,
}: Props) {
  // Clamp so the menu doesn't go off-screen
  const [menuPos, setMenuPos] = React.useState({ left: ctx.x, top: ctx.y });
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuRef.current) return;
    const { width, height } = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setMenuPos({
      left: Math.min(ctx.x, vw - width - 8),
      top:  Math.min(ctx.y, vh - height - 8),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <>
      {/* Invisible backdrop catches any outside click */}
      <div className={styles.backdrop} onMouseDown={onClose} />

      <div
        ref={menuRef}
        className={styles.menu}
        style={{ left: menuPos.left, top: menuPos.top }}
        onMouseDown={(e) => e.stopPropagation()} // don't let clicks fall through to backdrop
      >
        {/* ── CANVAS MENU ── */}
        {ctx.kind === 'canvas' && (
          <CanvasMenu
            onClose={onClose}
            onAddState={onAddState}
            existingStates={existingStates}
          />
        )}

        {/* ── NODE MENU ── */}
        {ctx.kind === 'node' && (() => {
          const { stateName, isStart, isAccept, isReject } = ctx;
          return (
            <>
              <div className={styles.menuHeader}>{stateName}</div>

              <button
                className={styles.item}
                onClick={() => { onSetStart(stateName); onClose(); }}
              >
                <span className={styles.checkIcon}>{isStart ? '✓' : ''}</span>
                Set as Start
              </button>

              <button
                className={styles.item}
                onClick={() => { onToggleAccept(stateName); onClose(); }}
              >
                <span className={styles.checkIcon} style={{ color: isAccept ? 'var(--color-accept)' : 'transparent' }}>✓</span>
                Toggle Accept
              </button>

              <button
                className={styles.item}
                onClick={() => { onToggleReject(stateName); onClose(); }}
              >
                <span className={`${styles.checkIcon} ${styles.checkIconReject}`} style={{ color: isReject ? 'var(--color-reject)' : 'transparent' }}>✓</span>
                Toggle Reject
              </button>

              <div className={styles.divider} />

              <button
                className={`${styles.item} ${styles.itemDanger}`}
                onClick={() => { onDeleteState(stateName); onClose(); }}
              >
                <span>🗑</span> Delete State
              </button>
            </>
          );
        })()}

        {/* ── EDGE MENU ── */}
        {ctx.kind === 'edge' && (() => {
          const { transitions, blankSymbol } = ctx;
          // Build a header from the first transition's from/to
          const header = transitions.length > 0
            ? `${transitions[0].fromState} → ${transitions[0].toState}`
            : 'Transition';
          return (
            <>
              <div className={styles.menuHeader}>{header}</div>
              {transitions.map((t) => {
                const r = symLabel(t.readSymbol,  blankSymbol);
                const w = symLabel(t.writeSymbol, blankSymbol);
                const label = `${r} → ${w}, ${t.move}`;
                return (
                  <div key={t.id} className={styles.transRow}>
                    <span className={styles.transLabel}>{label}</span>
                    <div className={styles.transActions}>
                      {onEditTransition && (
                        <button
                          className={styles.transEdit}
                          onClick={() => { onEditTransition(t); onClose(); }}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        className={styles.transDelete}
                        onClick={() => { onDeleteTransition(t.id); onClose(); }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          );
        })()}
      </div>
    </>,
    document.body,
  );
}
