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
 * Returns true if this configuration has been seen on the current branch.
 * `ancestorFingerprints` is the set carried forward from the parent.
 */
export function isLoop(
  fp: string,
  ancestorFingerprints: ReadonlySet<string>
): boolean {
  return ancestorFingerprints.has(fp);
}

/**
 * Creates a new Set with `fp` added (immutable extension).
 * Each branch gets its own copy so sibling branches don't interfere.
 */
export function extendFingerprints(
  ancestorFingerprints: ReadonlySet<string>,
  fp: string
): Set<string> {
  const next = new Set(ancestorFingerprints);
  next.add(fp);
  return next;
}
