import { useAppStore } from '../../store/useAppStore';
import { TransitionRow } from './TransitionRow';
import styles from './TransitionTable.module.css';

export function TransitionTable() {
  const machine = useAppStore((s) => s.machine);
  const addTransition = useAppStore((s) => s.addTransition);
  const updateTransition = useAppStore((s) => s.updateTransition);
  const removeTransition = useAppStore((s) => s.removeTransition);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Transition Function</h2>
        <button className={styles.addBtn} onClick={addTransition}>
          + Add Row
        </button>
      </div>

      {machine.transitions.length === 0 ? (
        <div className={styles.empty}>No transitions defined. Click &quot;Add Row&quot; to start.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>From</th>
                <th>Read</th>
                <th></th>
                <th>To</th>
                <th>Write</th>
                <th>Move</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {machine.transitions.map((t) => (
                <TransitionRow
                  key={t.id}
                  transition={t}
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
    </section>
  );
}
