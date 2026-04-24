import React from 'react';
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
  const cells   = tapeToDisplayArray(tape, headPosition, blankSymbol, pad);
  const headRef = React.useRef<HTMLDivElement>(null);

  // After every render, scroll the tape strip so the head cell is centred.
  // useLayoutEffect fires before the browser paints, so there is no visible jump.
  React.useLayoutEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const container = el.parentElement;
    if (!container) return;
    container.scrollLeft =
      el.offsetLeft - container.clientWidth / 2 + el.offsetWidth / 2;
  });

  return (
    <div className={styles.tape}>
      {cells.map(({ pos, symbol }) => (
        <div
          key={pos}
          ref={pos === headPosition ? headRef : undefined}
          className={`${styles.cell} ${pos === headPosition ? styles.head : ''} ${symbol === blankSymbol ? styles.blank : ''}`}
          title={`pos ${pos}`}
        >
          {symbol === blankSymbol ? '⊔' : symbol}
        </div>
      ))}
    </div>
  );
}
