import { v4 as uuidv4 } from 'uuid';
import type { NTMDefinition } from '../types/machine';
import { EXAMPLE_MACHINE, EXAMPLE_INPUT } from './exampleMachine';

export interface ExampleEntry {
  label: string;
  description: string;
  machine: NTMDefinition;
  input: string;
}

// ── 1. Contains 0 (existing NDTM) ────────────────────────────────────────────
const containsZero: ExampleEntry = {
  label: 'Contains 0',
  description: 'NDTM: accepts { w ∈ {0,1}* | w contains at least one 0 }',
  machine: EXAMPLE_MACHINE,
  input: EXAMPLE_INPUT,
};

// ── 2. 0ⁿ1ⁿ recognizer (DTM) ─────────────────────────────────────────────────
// Marks each 0 with X and matching 1 with Y until both sides are exhausted.
// States: q0 (scan for 0), q1 (scan right to find 1), q2 (scan left to find X),
//         q3 (verify all Y), qacc, qrej
const zeroN1N: ExampleEntry = {
  label: '0ⁿ1ⁿ',
  description: 'DTM: accepts { 0ⁿ1ⁿ | n ≥ 1 }',
  machine: {
    states: ['q0', 'q1', 'q2', 'q3', 'qacc', 'qrej'],
    inputAlphabet: ['0', '1'],
    tapeAlphabet: ['0', '1', 'X', 'Y', 'B'],
    startState: 'q0',
    acceptStates: ['qacc'],
    rejectStates: ['qrej'],
    blankSymbol: 'B',
    transitions: [
      // q0: scan for next unmatched 0
      { id: uuidv4(), fromState: 'q0', readSymbol: '0', toState: 'q1', writeSymbol: 'X', move: 'R' },
      { id: uuidv4(), fromState: 'q0', readSymbol: 'X', toState: 'q0', writeSymbol: 'X', move: 'R' },
      { id: uuidv4(), fromState: 'q0', readSymbol: 'Y', toState: 'q3', writeSymbol: 'Y', move: 'R' },
      { id: uuidv4(), fromState: 'q0', readSymbol: '1', toState: 'qrej', writeSymbol: '1', move: 'S' },
      { id: uuidv4(), fromState: 'q0', readSymbol: 'B', toState: 'qrej', writeSymbol: 'B', move: 'S' },

      // q1: scan right to find matching 1
      { id: uuidv4(), fromState: 'q1', readSymbol: '0', toState: 'q1', writeSymbol: '0', move: 'R' },
      { id: uuidv4(), fromState: 'q1', readSymbol: 'Y', toState: 'q1', writeSymbol: 'Y', move: 'R' },
      { id: uuidv4(), fromState: 'q1', readSymbol: '1', toState: 'q2', writeSymbol: 'Y', move: 'L' },
      { id: uuidv4(), fromState: 'q1', readSymbol: 'B', toState: 'qrej', writeSymbol: 'B', move: 'S' },

      // q2: scan left back to the leftmost X
      { id: uuidv4(), fromState: 'q2', readSymbol: '0', toState: 'q2', writeSymbol: '0', move: 'L' },
      { id: uuidv4(), fromState: 'q2', readSymbol: 'Y', toState: 'q2', writeSymbol: 'Y', move: 'L' },
      { id: uuidv4(), fromState: 'q2', readSymbol: 'X', toState: 'q0', writeSymbol: 'X', move: 'R' },
      { id: uuidv4(), fromState: 'q2', readSymbol: 'B', toState: 'q0', writeSymbol: 'B', move: 'R' },

      // q3: verify only Y's remain (no unmatched 1s)
      { id: uuidv4(), fromState: 'q3', readSymbol: 'Y', toState: 'q3', writeSymbol: 'Y', move: 'R' },
      { id: uuidv4(), fromState: 'q3', readSymbol: 'B', toState: 'qacc', writeSymbol: 'B', move: 'S' },
      { id: uuidv4(), fromState: 'q3', readSymbol: '1', toState: 'qrej', writeSymbol: '1', move: 'S' },
      { id: uuidv4(), fromState: 'q3', readSymbol: '0', toState: 'qrej', writeSymbol: '0', move: 'S' },
    ],
  },
  input: '0011',
};

// ── 3. Ends in 00 (NDTM) ─────────────────────────────────────────────────────
// Nondeterministically guesses which '0' is the second-to-last symbol.
// q0: keep scanning OR guess "this 0 is the penultimate symbol" → q1
// q1: the very next symbol must be '0' → accept
const endsIn00: ExampleEntry = {
  label: 'Ends in 00',
  description: 'NDTM: accepts { w ∈ {0,1}* | w ends with 00 }',
  machine: {
    states: ['q0', 'q1', 'qacc', 'qrej'],
    inputAlphabet: ['0', '1'],
    tapeAlphabet: ['0', '1', 'B'],
    startState: 'q0',
    acceptStates: ['qacc'],
    rejectStates: ['qrej'],
    blankSymbol: 'B',
    transitions: [
      // q0: keep scanning (nondeterministic)
      { id: uuidv4(), fromState: 'q0', readSymbol: '0', toState: 'q0',   writeSymbol: '0', move: 'R' },
      { id: uuidv4(), fromState: 'q0', readSymbol: '1', toState: 'q0',   writeSymbol: '1', move: 'R' },
      // q0: guess this '0' is second-to-last → go to q1 and advance
      { id: uuidv4(), fromState: 'q0', readSymbol: '0', toState: 'q1',   writeSymbol: '0', move: 'R' },
      // q0: reached blank without guessing → reject
      { id: uuidv4(), fromState: 'q0', readSymbol: 'B', toState: 'qrej', writeSymbol: 'B', move: 'S' },

      // q1: the next symbol must be '0' followed by blank
      { id: uuidv4(), fromState: 'q1', readSymbol: '0', toState: 'qacc', writeSymbol: '0', move: 'S' },
      { id: uuidv4(), fromState: 'q1', readSymbol: '1', toState: 'qrej', writeSymbol: '1', move: 'S' },
      { id: uuidv4(), fromState: 'q1', readSymbol: 'B', toState: 'qrej', writeSymbol: 'B', move: 'S' },
    ],
  },
  input: '1100',
};

// ── 4. All zeros (DTM) ────────────────────────────────────────────────────────
// Accepts strings consisting entirely of 0s (including empty string).
const allZeros: ExampleEntry = {
  label: 'All zeros',
  description: 'DTM: accepts { 0* } — every symbol must be 0',
  machine: {
    states: ['q0', 'qacc', 'qrej'],
    inputAlphabet: ['0', '1'],
    tapeAlphabet: ['0', '1', 'B'],
    startState: 'q0',
    acceptStates: ['qacc'],
    rejectStates: ['qrej'],
    blankSymbol: 'B',
    transitions: [
      { id: uuidv4(), fromState: 'q0', readSymbol: '0', toState: 'q0',   writeSymbol: '0', move: 'R' },
      { id: uuidv4(), fromState: 'q0', readSymbol: 'B', toState: 'qacc', writeSymbol: 'B', move: 'S' },
      { id: uuidv4(), fromState: 'q0', readSymbol: '1', toState: 'qrej', writeSymbol: '1', move: 'S' },
    ],
  },
  input: '000',
};

export const EXAMPLE_MACHINES: ExampleEntry[] = [
  containsZero,
  zeroN1N,
  endsIn00,
  allZeros,
];
