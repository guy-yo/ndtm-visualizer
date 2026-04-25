import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store/useAppStore';
import type { NTMDefinition } from '../types/machine';

// ── Reset store to a known clean state before every test ──────────────────────
const CLEAN: Partial<NTMDefinition> = {
  states:        ['q0', 'qacc', 'qrej'],
  inputAlphabet: [],
  tapeAlphabet:  ['⊔'],
  startState:    'q0',
  acceptStates:  ['qacc'],
  rejectStates:  ['qrej'],
  blankSymbol:   '⊔',
  transitions:   [],
};

beforeEach(() => {
  useAppStore.setState((s) => ({
    ...s,
    machine:       { ...s.machine, ...CLEAN } as NTMDefinition,
    machineErrors: [],
    undoStack:     [],
    redoStack:     [],
    tree:          null,
    executionPhase:'idle' as const,
    treeHistory:   [],
  }));
});

const get = () => useAppStore.getState();

// ── newMachine ─────────────────────────────────────────────────────────────────
describe('newMachine', () => {
  it('creates a machine with q0, qacc and qrej', () => {
    get().newMachine();
    const { states } = get().machine;
    expect(states).toContain('q0');
    expect(states).toContain('qacc');
    expect(states).toContain('qrej');
  });

  it('sets q0 as the start state', () => {
    get().newMachine();
    expect(get().machine.startState).toBe('q0');
  });

  it('sets qacc as the only accept state', () => {
    get().newMachine();
    expect(get().machine.acceptStates).toEqual(['qacc']);
  });

  it('sets qrej as the only reject state', () => {
    get().newMachine();
    expect(get().machine.rejectStates).toEqual(['qrej']);
  });

  it('clears all transitions', () => {
    get().addTransitionDirect({ fromState: 'q0', toState: 'qacc', readSymbol: '⊔', writeSymbol: '⊔', move: 'R' });
    get().newMachine();
    expect(get().machine.transitions).toHaveLength(0);
  });
});

// ── setMachine — Input Alphabet → Tape Alphabet sync ─────────────────────────
describe('setMachine inputAlphabet sync', () => {
  it('adds new input symbols to tape alphabet automatically', () => {
    get().setMachine({ inputAlphabet: ['0', '1'] });
    const tape = get().machine.tapeAlphabet;
    expect(tape).toContain('0');
    expect(tape).toContain('1');
  });

  it('does not duplicate a symbol already in tape alphabet', () => {
    get().setMachine({ tapeAlphabet: ['0', '⊔'] });
    get().setMachine({ inputAlphabet: ['0'] });
    const tape = get().machine.tapeAlphabet;
    const count = tape.filter((s) => s === '0').length;
    expect(count).toBe(1);
  });

  it('keeps the blank symbol in tape alphabet after sync', () => {
    get().setMachine({ inputAlphabet: ['0', '1'] });
    expect(get().machine.tapeAlphabet).toContain('⊔');
  });

  it('does not touch tape alphabet when inputAlphabet is not in the partial', () => {
    const before = [...get().machine.tapeAlphabet];
    get().setMachine({ startState: 'q0' }); // no inputAlphabet key
    expect(get().machine.tapeAlphabet).toEqual(before);
  });
});

// ── addState ──────────────────────────────────────────────────────────────────
describe('addState', () => {
  it('adds a new state to the machine', () => {
    get().addState('qNew');
    expect(get().machine.states).toContain('qNew');
  });

  it('ignores empty or whitespace names', () => {
    const before = get().machine.states.length;
    get().addState('   ');
    expect(get().machine.states).toHaveLength(before);
  });

  it('ignores duplicate state names', () => {
    get().addState('q0');
    const count = get().machine.states.filter((s) => s === 'q0').length;
    expect(count).toBe(1);
  });

  it('pushes to undo stack', () => {
    const before = get().undoStack.length;
    get().addState('qX');
    expect(get().undoStack.length).toBeGreaterThan(before);
  });
});

// ── removeState ───────────────────────────────────────────────────────────────
describe('removeState', () => {
  beforeEach(() => { get().addState('qExtra'); });

  it('removes the state from states list', () => {
    get().removeState('qExtra');
    expect(get().machine.states).not.toContain('qExtra');
  });

  it('removes the state from acceptStates if present', () => {
    get().toggleAcceptState('qExtra');
    get().removeState('qExtra');
    expect(get().machine.acceptStates).not.toContain('qExtra');
  });

  it('removes the state from rejectStates if present', () => {
    get().toggleRejectState('qExtra');
    get().removeState('qExtra');
    expect(get().machine.rejectStates).not.toContain('qExtra');
  });

  it('removes all transitions that involve the deleted state', () => {
    get().addTransitionDirect({ fromState: 'q0', toState: 'qExtra', readSymbol: '⊔', writeSymbol: '⊔', move: 'R' });
    get().addTransitionDirect({ fromState: 'qExtra', toState: 'qacc', readSymbol: '⊔', writeSymbol: '⊔', move: 'R' });
    get().removeState('qExtra');
    const ts = get().machine.transitions;
    expect(ts.every((t) => t.fromState !== 'qExtra' && t.toState !== 'qExtra')).toBe(true);
  });

  it('reassigns startState when the start state is deleted', () => {
    get().setStartState('qExtra');
    get().removeState('qExtra');
    // startState should now be one of the remaining states (or empty)
    const { startState, states } = get().machine;
    expect(states.includes(startState) || startState === '').toBe(true);
  });
});

// ── setStartState ─────────────────────────────────────────────────────────────
describe('setStartState', () => {
  it('updates the startState field', () => {
    get().setStartState('qacc');
    expect(get().machine.startState).toBe('qacc');
  });

  it('pushes to undo stack', () => {
    const before = get().undoStack.length;
    get().setStartState('qacc');
    expect(get().undoStack.length).toBeGreaterThan(before);
  });
});

// ── toggleAcceptState ─────────────────────────────────────────────────────────
describe('toggleAcceptState', () => {
  it('adds a state to acceptStates when not already there', () => {
    get().toggleAcceptState('q0');
    expect(get().machine.acceptStates).toContain('q0');
  });

  it('removes a state from acceptStates when already there', () => {
    get().toggleAcceptState('qacc'); // qacc is already accept → remove it
    expect(get().machine.acceptStates).not.toContain('qacc');
  });

  it('removes the state from rejectStates when added to acceptStates', () => {
    get().toggleRejectState('q0');   // first make q0 a reject
    get().toggleAcceptState('q0');   // now toggle to accept
    expect(get().machine.rejectStates).not.toContain('q0');
    expect(get().machine.acceptStates).toContain('q0');
  });
});

// ── toggleRejectState ─────────────────────────────────────────────────────────
describe('toggleRejectState', () => {
  it('adds a state to rejectStates when not already there', () => {
    get().toggleRejectState('q0');
    expect(get().machine.rejectStates).toContain('q0');
  });

  it('removes a state from rejectStates when already there', () => {
    get().toggleRejectState('qrej'); // qrej is already reject → remove it
    expect(get().machine.rejectStates).not.toContain('qrej');
  });

  it('removes the state from acceptStates when added to rejectStates', () => {
    get().toggleAcceptState('q0');   // first make q0 accept
    get().toggleRejectState('q0');   // now toggle to reject
    expect(get().machine.acceptStates).not.toContain('q0');
    expect(get().machine.rejectStates).toContain('q0');
  });
});

// ── Undo / Redo ───────────────────────────────────────────────────────────────
describe('undo / redo', () => {
  it('undoes an addState operation', () => {
    get().addState('qUndo');
    get().undo();
    expect(get().machine.states).not.toContain('qUndo');
  });

  it('redoes an addState after undo', () => {
    get().addState('qRedo');
    get().undo();
    get().redo();
    expect(get().machine.states).toContain('qRedo');
  });

  it('undoes a removeState operation', () => {
    get().addState('qTemp');
    get().removeState('qTemp');
    get().undo();
    expect(get().machine.states).toContain('qTemp');
  });
});

// ── addTransitionDirect ───────────────────────────────────────────────────────
describe('addTransitionDirect', () => {
  it('adds a transition with a generated id', () => {
    get().addTransitionDirect({ fromState: 'q0', toState: 'qacc', readSymbol: '⊔', writeSymbol: '⊔', move: 'R' });
    const ts = get().machine.transitions;
    expect(ts).toHaveLength(1);
    expect(ts[0].id).toBeTruthy();
    expect(ts[0].fromState).toBe('q0');
  });
});

// ── updateTransition ─────────────────────────────────────────────────────────
describe('updateTransition', () => {
  it('updates only the specified fields of a transition', () => {
    get().addTransitionDirect({ fromState: 'q0', toState: 'qacc', readSymbol: '⊔', writeSymbol: '⊔', move: 'R' });
    const id = get().machine.transitions[0].id;
    get().updateTransition(id, { move: 'L', writeSymbol: '0' });
    const t = get().machine.transitions[0];
    expect(t.move).toBe('L');
    expect(t.writeSymbol).toBe('0');
    expect(t.fromState).toBe('q0'); // unchanged
  });
});

// ── removeTransition ─────────────────────────────────────────────────────────
describe('removeTransition', () => {
  it('removes the transition with the given id', () => {
    get().addTransitionDirect({ fromState: 'q0', toState: 'qacc', readSymbol: '⊔', writeSymbol: '⊔', move: 'R' });
    const id = get().machine.transitions[0].id;
    get().removeTransition(id);
    expect(get().machine.transitions).toHaveLength(0);
  });
});
