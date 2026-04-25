import { describe, it, expect } from 'vitest';
import { validateMachine } from '../types/machine';
import type { NTMDefinition } from '../types/machine';

// ── Minimal valid machine used as a baseline for each test ────────────────────
const BASE: NTMDefinition = {
  states:        ['q0', 'qacc', 'qrej'],
  inputAlphabet: ['0', '1'],
  tapeAlphabet:  ['0', '1', '⊔'],
  startState:    'q0',
  acceptStates:  ['qacc'],
  rejectStates:  ['qrej'],
  blankSymbol:   '⊔',
  transitions: [
    { id: 't1', fromState: 'q0', toState: 'qacc', readSymbol: '0', writeSymbol: '0', move: 'R' },
  ],
};

function make(overrides: Partial<NTMDefinition>): NTMDefinition {
  return { ...BASE, ...overrides };
}

describe('validateMachine', () => {
  it('returns no errors for a valid machine', () => {
    expect(validateMachine(BASE)).toHaveLength(0);
  });

  it('errors when states list is empty', () => {
    const errs = validateMachine(make({ states: [], startState: '' }));
    expect(errs.some((e) => e.field === 'states')).toBe(true);
  });

  it('errors when startState is missing', () => {
    const errs = validateMachine(make({ startState: '' }));
    expect(errs.some((e) => e.field === 'startState')).toBe(true);
  });

  it('errors when startState is not in states list', () => {
    const errs = validateMachine(make({ startState: 'qUnknown' }));
    expect(errs.some((e) => e.field === 'startState')).toBe(true);
  });

  it('errors when acceptStates is empty', () => {
    const errs = validateMachine(make({ acceptStates: [] }));
    expect(errs.some((e) => e.field === 'acceptStates')).toBe(true);
  });

  it('errors when an accept state is not in states list', () => {
    const errs = validateMachine(make({ acceptStates: ['qMissing'] }));
    expect(errs.some((e) => e.field === 'acceptStates')).toBe(true);
  });

  it('errors when a reject state is not in states list', () => {
    const errs = validateMachine(make({ rejectStates: ['qGhost'] }));
    expect(errs.some((e) => e.field === 'rejectStates')).toBe(true);
  });

  it('errors when blank symbol is not in tape alphabet', () => {
    const errs = validateMachine(make({ blankSymbol: 'X' }));
    expect(errs.some((e) => e.field === 'blankSymbol')).toBe(true);
  });

  it('errors when input alphabet has a symbol not in tape alphabet', () => {
    const errs = validateMachine(make({ inputAlphabet: ['0', '1', 'X'] }));
    expect(errs.some((e) => e.field === 'inputAlphabet')).toBe(true);
  });

  it('errors when a transition uses an unknown state', () => {
    const errs = validateMachine(make({
      transitions: [{ id: 'x', fromState: 'qGhost', toState: 'qacc', readSymbol: '0', writeSymbol: '0', move: 'R' }],
    }));
    expect(errs.some((e) => e.field === 'transitions')).toBe(true);
  });

  it('errors when a transition reads an unknown symbol', () => {
    const errs = validateMachine(make({
      transitions: [{ id: 'x', fromState: 'q0', toState: 'qacc', readSymbol: 'Z', writeSymbol: '0', move: 'R' }],
    }));
    expect(errs.some((e) => e.field === 'transitions')).toBe(true);
  });

  it('allows Σ wildcard as read / write symbol without tape-alphabet check', () => {
    const errs = validateMachine(make({
      transitions: [{ id: 'x', fromState: 'q0', toState: 'qacc', readSymbol: 'Σ', writeSymbol: 'Σ', move: 'R' }],
    }));
    expect(errs).toHaveLength(0);
  });
});
