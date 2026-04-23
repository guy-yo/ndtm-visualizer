import type { TapeMap } from '../types/engine';
import { tapeSnapshot } from './tapeUtils';

/**
 * Creates a fingerprint string for a configuration.
 * Used to detect cycles within a single computation branch.
 */
export function fingerprint(
  state: string,
  tape: TapeMap,
  head: number,
  blank: string,
  windowSize: number
): string {
  const snap = tapeSnapshot(tape, head, blank, windowSize);
  return `${state}|${head}|${snap}`;
}

/**
 * `ancestorFingerprints` maps each fingerprint to how many times it has
 * appeared in the current branch's ancestor chain.
 *
 * Returns true when the count reaches 1, meaning the exact same
 * (state, headPosition, tapeWindow) has already appeared as an ancestor —
 * the branch will loop forever. Cut off here; the cycle is already visible
 * above as the full state chain that led back to this fingerprint.
 */
export function isLoop(
  fp: string,
  ancestorFingerprints: ReadonlyMap<string, number>
): boolean {
  return (ancestorFingerprints.get(fp) ?? 0) >= 1;
}

/**
 * Returns a new Map with the count for `fp` incremented by 1.
 * Each branch gets its own copy so sibling branches don't interfere.
 */
export function extendFingerprints(
  ancestorFingerprints: ReadonlyMap<string, number>,
  fp: string
): Map<string, number> {
  const next = new Map(ancestorFingerprints);
  next.set(fp, (next.get(fp) ?? 0) + 1);
  return next;
}
