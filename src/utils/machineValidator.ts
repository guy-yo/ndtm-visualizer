import type { NTMDefinition } from '../types/machine';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface MachineIssue {
  severity: IssueSeverity;
  code: string;
  message: string;
  states?: string[];
}

/**
 * Semantic / design-time analysis of a machine definition.
 * Unlike the structural `validateMachine` in types/machine.ts (which blocks
 * execution), this returns advisory issues: unreachable states, dead ends, etc.
 */
export function analyzeMachine(machine: NTMDefinition): MachineIssue[] {
  const issues: MachineIssue[] = [];
  const stateSet  = new Set(machine.states);
  const acceptSet = new Set(machine.acceptStates);
  const rejectSet = new Set(machine.rejectStates);

  // ── Errors ────────────────────────────────────────────────────────────────

  // Accept ∩ Reject overlap
  const overlap = machine.acceptStates.filter((s) => rejectSet.has(s));
  if (overlap.length > 0) {
    issues.push({
      severity: 'error',
      code: 'accept-reject-overlap',
      message: `In both accept and reject: ${overlap.join(', ')}`,
      states: overlap,
    });
  }

  // ── Warnings ──────────────────────────────────────────────────────────────

  // Unreachable states (BFS from startState on the transition graph)
  if (stateSet.has(machine.startState)) {
    const reachable = new Set<string>([machine.startState]);
    const queue = [machine.startState];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const t of machine.transitions) {
        if (t.fromState === cur && !reachable.has(t.toState)) {
          reachable.add(t.toState);
          queue.push(t.toState);
        }
      }
    }
    const unreachable = machine.states.filter(
      (s) => !reachable.has(s) && s !== machine.startState,
    );
    if (unreachable.length > 0) {
      issues.push({
        severity: 'warning',
        code: 'unreachable',
        message: `Unreachable state${unreachable.length > 1 ? 's' : ''}: ${unreachable.join(', ')}`,
        states: unreachable,
      });
    }
  }

  // Dead-end states (non-terminal, no outgoing transitions)
  const hasOutgoing = new Set(machine.transitions.map((t) => t.fromState));
  const deadEnds = machine.states.filter(
    (s) => !acceptSet.has(s) && !rejectSet.has(s) && !hasOutgoing.has(s),
  );
  if (deadEnds.length > 0) {
    issues.push({
      severity: 'warning',
      code: 'dead-end',
      message: `Dead-end (no outgoing transitions): ${deadEnds.join(', ')}`,
      states: deadEnds,
    });
  }

  // Start state has no transitions and is not terminal → always rejects
  if (
    stateSet.has(machine.startState) &&
    !acceptSet.has(machine.startState) &&
    !rejectSet.has(machine.startState) &&
    !hasOutgoing.has(machine.startState)
  ) {
    issues.push({
      severity: 'warning',
      code: 'dead-start',
      message: 'Start state has no outgoing transitions — always rejects',
      states: [machine.startState],
    });
  }

  // ── Info ──────────────────────────────────────────────────────────────────

  // Nondeterministic (fromState, readSymbol) pairs
  const pairCount = new Map<string, number>();
  for (const t of machine.transitions) {
    const key = `${t.fromState}|${t.readSymbol}`;
    pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
  }
  const ndStates = new Set<string>();
  for (const [key, count] of pairCount) {
    if (count > 1) ndStates.add(key.split('|')[0]);
  }
  if (ndStates.size > 0) {
    const list = [...ndStates].join(', ');
    issues.push({
      severity: 'info',
      code: 'nondeterministic',
      message: `Nondeterministic branch${ndStates.size > 1 ? 'es' : ''} at: ${list}`,
      states: [...ndStates],
    });
  }

  return issues;
}
