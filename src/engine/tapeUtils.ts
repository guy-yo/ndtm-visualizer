import type { TapeMap } from '../types/engine';

export function initTape(input: string): TapeMap {
  const tape: TapeMap = new Map();
  for (let i = 0; i < input.length; i++) {
    tape.set(i, input[i]);
  }
  return tape;
}

export function cloneTape(tape: TapeMap): TapeMap {
  return new Map(tape);
}

export function readCell(tape: TapeMap, pos: number, blank: string): string {
  return tape.get(pos) ?? blank;
}

export function writeCell(tape: TapeMap, pos: number, symbol: string, blank: string): TapeMap {
  const next = cloneTape(tape);
  if (symbol === blank) {
    next.delete(pos);
  } else {
    next.set(pos, symbol);
  }
  return next;
}

/**
 * Serializes a window of tape cells around `head` for display/loop detection.
 * Returns an array of { pos, symbol } for positions [head - radius .. head + radius].
 */
export function tapeWindow(
  tape: TapeMap,
  head: number,
  blank: string,
  radius: number = 5
): Array<{ pos: number; symbol: string }> {
  const result: Array<{ pos: number; symbol: string }> = [];
  for (let i = head - radius; i <= head + radius; i++) {
    result.push({ pos: i, symbol: readCell(tape, i, blank) });
  }
  return result;
}

/**
 * Compact string snapshot for loop detection fingerprinting.
 */
export function tapeSnapshot(
  tape: TapeMap,
  head: number,
  blank: string,
  windowSize: number
): string {
  const parts: string[] = [];
  for (let i = head - windowSize; i <= head + windowSize; i++) {
    parts.push(readCell(tape, i, blank));
  }
  return parts.join('|');
}

/**
 * Returns printable tape as an array covering all non-blank cells plus a
 * padding of `pad` cells on each side of the head.
 */
export function tapeToDisplayArray(
  tape: TapeMap,
  head: number,
  blank: string,
  pad: number = 3
): Array<{ pos: number; symbol: string }> {
  if (tape.size === 0) {
    const result: Array<{ pos: number; symbol: string }> = [];
    for (let i = head - pad; i <= head + pad; i++) {
      result.push({ pos: i, symbol: blank });
    }
    return result;
  }
  const keys = Array.from(tape.keys());
  const minKey = Math.min(...keys, head);
  const maxKey = Math.max(...keys, head);
  const start = Math.min(minKey, head - pad);
  const end = Math.max(maxKey, head + pad);
  const result: Array<{ pos: number; symbol: string }> = [];
  for (let i = start; i <= end; i++) {
    result.push({ pos: i, symbol: readCell(tape, i, blank) });
  }
  return result;
}
