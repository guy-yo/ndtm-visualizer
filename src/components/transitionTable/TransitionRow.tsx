import type { Transition, MoveDirection } from '../../types/machine';
import styles from './TransitionRow.module.css';

interface Props {
  transition: Transition;
  fromStates: string[];      // states allowed in FROM (excludes accept/reject)
  availableStates: string[]; // all states, used in TO dropdown
  availableSymbols: string[];
  blankSymbol: string;
  onUpdate: (partial: Partial<Omit<Transition, 'id'>>) => void;
  onRemove: () => void;
}

function symLabel(sym: string, blank: string) {
  return sym === blank ? '⊔' : sym;
}

const MOVES: MoveDirection[] = ['L', 'S', 'R'];

export function TransitionRow({ transition, fromStates, availableStates, availableSymbols, blankSymbol, onUpdate, onRemove }: Props) {
  return (
    <tr className={styles.row}>
      <td>
        <select
          className={styles.sel}
          value={transition.fromState}
          onChange={(e) => onUpdate({ fromState: e.target.value })}
        >
          {fromStates.map((s) => <option key={s}>{s}</option>)}
        </select>
      </td>
      <td>
        <select
          className={styles.sel}
          value={transition.readSymbol}
          onChange={(e) => onUpdate({ readSymbol: e.target.value })}
        >
          <option value="Σ">Σ — any</option>
          {availableSymbols.map((s) => <option key={s} value={s}>{symLabel(s, blankSymbol)}</option>)}
        </select>
      </td>
      <td className={styles.arrow}>→</td>
      <td>
        <select
          className={styles.sel}
          value={transition.toState}
          onChange={(e) => onUpdate({ toState: e.target.value })}
        >
          {availableStates.map((s) => <option key={s}>{s}</option>)}
        </select>
      </td>
      <td>
        <select
          className={styles.sel}
          value={transition.writeSymbol}
          onChange={(e) => onUpdate({ writeSymbol: e.target.value })}
        >
          <option value="Σ">Σ — keep</option>
          {availableSymbols.map((s) => <option key={s} value={s}>{symLabel(s, blankSymbol)}</option>)}
        </select>
      </td>
      <td>
        <div className={styles.moveGroup}>
          {MOVES.map((m) => (
            <button
              key={m}
              className={`${styles.moveBtn} ${transition.move === m ? styles.moveBtnActive : ''}`}
              onClick={() => onUpdate({ move: m as MoveDirection })}
              title={{ L: 'Move Left', R: 'Move Right', S: 'Stay' }[m]}
            >
              {m}
            </button>
          ))}
        </div>
      </td>
      <td>
        <button className={styles.remove} onClick={onRemove} title="Remove transition">
          ✕
        </button>
      </td>
    </tr>
  );
}
