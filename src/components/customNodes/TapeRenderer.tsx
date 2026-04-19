import type { TapeMap } from '../../types/engine';
import { tapeToDisplayArray } from '../../engine/tapeUtils';
import styles from './TapeRenderer.module.css';

interface Props {
  tape: TapeMap;
  headPosition: number;
  blankSymbol: string;
  pad?: number;
}

export function TapeRenderer({ tape, headPosition, blankSymbol, pad = 3 }: Props) {
  const cells = tapeToDisplayArray(tape, headPosition, blankSymbol, pad);

  return (
    <div className={styles.tape}>
      {cells.map(({ pos, symbol }) => (
        <div
          key={pos}
          className={`${styles.cell} ${pos === headPosition ? styles.head : ''} ${symbol === blankSymbol ? styles.blank : ''}`}
          title={`pos ${pos}`}
        >
          {symbol === blankSymbol ? '⊔' : symbol}
        </div>
      ))}
    </div>
  );
}
