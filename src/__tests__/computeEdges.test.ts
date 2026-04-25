import { describe, it, expect } from 'vitest';
import { computeEdges } from '../components/stateDiagram/useStateDiagramNodes';
import type { NTMDefinition } from '../types/machine';

const BLANK = '⊔';

function machine(overrides: Partial<NTMDefinition> = {}): NTMDefinition {
  return {
    states:        ['q0', 'q1', 'qacc', 'qrej'],
    inputAlphabet: ['0', '1'],
    tapeAlphabet:  ['0', '1', BLANK],
    startState:    'q0',
    acceptStates:  ['qacc'],
    rejectStates:  ['qrej'],
    blankSymbol:   BLANK,
    transitions:   [],
    ...overrides,
  };
}

describe('computeEdges', () => {
  it('returns empty array when there are no transitions', () => {
    expect(computeEdges(machine())).toHaveLength(0);
  });

  // ── Self-loops ────────────────────────────────────────────────────────────
  it('creates a selfLoop edge type for self-transitions', () => {
    const m = machine({ transitions: [
      { id: '1', fromState: 'q0', toState: 'q0', readSymbol: '0', writeSymbol: '0', move: 'R' },
    ] });
    const edges = computeEdges(m);
    expect(edges).toHaveLength(1);
    expect(edges[0].type).toBe('selfLoop');
  });

  it('self-loop uses self-out / self-in handles', () => {
    const m = machine({ transitions: [
      { id: '1', fromState: 'q1', toState: 'q1', readSymbol: BLANK, writeSymbol: BLANK, move: 'S' },
    ] });
    const edge = computeEdges(m)[0];
    expect(edge.sourceHandle).toBe('self-out');
    expect(edge.targetHandle).toBe('self-in');
  });

  // ── Non-self-loop edges ───────────────────────────────────────────────────
  it('creates a floating edge for a normal transition', () => {
    const m = machine({ transitions: [
      { id: '1', fromState: 'q0', toState: 'q1', readSymbol: '0', writeSymbol: '0', move: 'R' },
    ] });
    const edges = computeEdges(m);
    expect(edges).toHaveLength(1);
    expect(edges[0].type).toBe('floating');
  });

  it('sets hasMirror = false for a one-way edge', () => {
    const m = machine({ transitions: [
      { id: '1', fromState: 'q0', toState: 'q1', readSymbol: '0', writeSymbol: '0', move: 'R' },
    ] });
    const edge = computeEdges(m)[0];
    expect((edge.data as { hasMirror: boolean }).hasMirror).toBe(false);
  });

  it('sets hasMirror = true for both edges of a bidirectional pair', () => {
    const m = machine({ transitions: [
      { id: '1', fromState: 'q0', toState: 'q1', readSymbol: '0', writeSymbol: '0', move: 'R' },
      { id: '2', fromState: 'q1', toState: 'q0', readSymbol: '1', writeSymbol: '1', move: 'L' },
    ] });
    const edges = computeEdges(m);
    expect(edges).toHaveLength(2);
    edges.forEach((e) =>
      expect((e.data as { hasMirror: boolean }).hasMirror).toBe(true),
    );
  });

  // ── Label merging ─────────────────────────────────────────────────────────
  it('merges multiple transitions on the same (from, to) pair into one edge', () => {
    const m = machine({ transitions: [
      { id: '1', fromState: 'q0', toState: 'q1', readSymbol: '0', writeSymbol: '0', move: 'R' },
      { id: '2', fromState: 'q0', toState: 'q1', readSymbol: '1', writeSymbol: '1', move: 'R' },
    ] });
    const edges = computeEdges(m);
    // One merged edge, not two separate ones
    expect(edges).toHaveLength(1);
    // Both labels appear in the combined label
    const label = String(edges[0].label);
    expect(label).toContain('0→0,R');
    expect(label).toContain('1→1,R');
  });

  it('uses blank ⊔ display symbol in labels', () => {
    const m = machine({ transitions: [
      { id: '1', fromState: 'q0', toState: 'q1', readSymbol: BLANK, writeSymbol: BLANK, move: 'R' },
    ] });
    const label = String(computeEdges(m)[0].label);
    expect(label).toContain('⊔→⊔,R');
  });

  // ── Stroke colours ────────────────────────────────────────────────────────
  it('uses accept colour when target is an accept state', () => {
    const m = machine({ transitions: [
      { id: '1', fromState: 'q0', toState: 'qacc', readSymbol: '0', writeSymbol: '0', move: 'R' },
    ] });
    const edge = computeEdges(m)[0];
    expect((edge.style as { stroke: string }).stroke).toBe('var(--color-accept)');
  });

  it('uses reject colour when target is a reject state', () => {
    const m = machine({ transitions: [
      { id: '1', fromState: 'q0', toState: 'qrej', readSymbol: '0', writeSymbol: '0', move: 'R' },
    ] });
    const edge = computeEdges(m)[0];
    expect((edge.style as { stroke: string }).stroke).toBe('var(--color-reject)');
  });

  it('uses neutral colour for transitions between non-terminal states', () => {
    const m = machine({ transitions: [
      { id: '1', fromState: 'q0', toState: 'q1', readSymbol: '0', writeSymbol: '0', move: 'R' },
    ] });
    const edge = computeEdges(m)[0];
    expect((edge.style as { stroke: string }).stroke).toBe('#475569');
  });

  // ── One edge per pair (even with many transitions) ────────────────────────
  it('produces one edge per directed (from, to) pair regardless of transition count', () => {
    const m = machine({ transitions: [
      { id: '1', fromState: 'q0', toState: 'q1', readSymbol: '0', writeSymbol: '0', move: 'R' },
      { id: '2', fromState: 'q0', toState: 'q1', readSymbol: '1', writeSymbol: '1', move: 'R' },
      { id: '3', fromState: 'q0', toState: 'q1', readSymbol: BLANK, writeSymbol: BLANK, move: 'S' },
      { id: '4', fromState: 'q1', toState: 'q0', readSymbol: '0', writeSymbol: '0', move: 'L' },
    ] });
    // q0→q1 (merged) + q1→q0 = 2 floating edges
    expect(computeEdges(m)).toHaveLength(2);
  });
});
