import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { TransitionRow } from './TransitionRow';
import styles from './TransitionTable.module.css';

export function TransitionTable() {
  const machine = useAppStore((s) => s.machine);
  const addTransition = useAppStore((s) => s.addTransition);
  const updateTransition = useAppStore((s) => s.updateTransition);
  const removeTransition = useAppStore((s) => s.removeTransition);
  const clearTransitions = useAppStore((s) => s.clearTransitions);

  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <button className={styles.collapseBtn} onClick={() => setIsOpen((o) => !o)}>
          <span className={styles.chevron}>{isOpen ? '▾' : '▸'}</span>
          <h2 className={styles.title}>Transition Function</h2>
        </button>
        <div className={styles.headerBtns}>
          {isOpen && machine.transitions.length > 0 && (
            <button className={styles.clearBtn} onClick={clearTransitions} title="Remove all transitions">
              Clear all
            </button>
          )}
          <button className={styles.addBtn} onClick={addTransition}>
            + Add Row
          </button>
        </div>
      </div>

      {isOpen && (
        <>
          {/* Wildcard legend */}
          <div className={styles.legend}>
            <div className={styles.legendRow}>
              <code className={styles.legendCode}>Σ</code>
              <span className={styles.legendSep}>in READ</span>
              <span className={styles.legendDesc}>match any symbol from the tape alphabet</span>
            </div>
            <div className={styles.legendRow}>
              <code className={styles.legendCode}>Σ</code>
              <span className={styles.legendSep}>in WRITE</span>
              <span className={styles.legendDesc}>write back whatever was read (no change)</span>
            </div>
          </div>

          {machine.transitions.length === 0 ? (
            <div className={styles.empty}>No transitions defined. Click &quot;+ Add Row&quot; to start.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <colgroup>
                  <col /><col /><col /><col /><col /><col /><col />
                </colgroup>
                <thead>
                  <tr>
                    <th>From</th>
                    <th>Read</th>
                    <th></th>
                    <th>To</th>
                    <th>Write</th>
                    <th>Mv</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {machine.transitions.map((t) => (
                    <TransitionRow
                      key={t.id}
                      transition={t}
                      fromStates={machine.states.filter(
                        s => !machine.acceptStates.includes(s) && !machine.rejectStates.includes(s)
                      )}
                      availableStates={machine.states}
                      availableSymbols={machine.tapeAlphabet}
                      blankSymbol={machine.blankSymbol}
                      onUpdate={(partial) => updateTransition(t.id, partial)}
                      onRemove={() => removeTransition(t.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
