import { v4 as uuidv4 } from 'uuid';
import type { NTMDefinition } from '../types/machine';

/**
 * NDTM: recognizes { w ∈ {0,1}* | w contains at least one '0' }
 *
 * The machine nondeterministically "guesses" a position and checks if it holds
 * a '0'. This creates genuine branching at every '0' it encounters:
 *
 *   q0  — scanning state. On each symbol, the machine can EITHER:
 *           (a) commit: if the current cell is '0' → go to qacc (accept now), OR
 *               if the current cell is '1' → go to qrej (bad guess, reject), OR
 *           (b) keep scanning right (stay in q0), OR
 *           (c) enter qloop — an infinite-loop branch (always present)
 *
 *   qacc  — accept (leaf)
 *   qrej  — explicit reject (leaf)
 *   qloop — loops forever (S-move on every symbol)
 *
 * With input "10" the tree is:
 *
 *   root [q0, pos=0, reads '1']
 *   ├─ commit: qrej (REJ — bad guess, '1' ≠ '0')
 *   ├─ scan:   q0, pos=1, reads '0'
 *   │   ├─ commit: qacc (ACC ✓)
 *   │   ├─ scan:   q0, pos=2, reads 'B' → qrej (REJ — end of string)
 *   │   └─ loop:   qloop (LOOP ∞)
 *   └─ loop:   qloop (LOOP ∞)
 *
 * All three leaf types — ACCEPT, REJECT, LOOP — appear in one run.
 */
export const EXAMPLE_MACHINE: NTMDefinition = {
  states: ['q0', 'qacc', 'qrej', 'qloop'],
  inputAlphabet: ['0', '1'],
  tapeAlphabet: ['0', '1', 'B'],
  startState: 'q0',
  acceptStates: ['qacc'],
  rejectStates: ['qrej'],
  blankSymbol: 'B',
  transitions: [
    // ── q0, reading '0': three-way nondeterministic choice ───────────
    // (a) commit and accept — this position holds a '0'
    { id: uuidv4(), fromState: 'q0', readSymbol: '0', toState: 'qacc',  writeSymbol: '0', move: 'S' },
    // (b) keep scanning right
    { id: uuidv4(), fromState: 'q0', readSymbol: '0', toState: 'q0',    writeSymbol: '0', move: 'R' },
    // (c) enter loop branch
    { id: uuidv4(), fromState: 'q0', readSymbol: '0', toState: 'qloop', writeSymbol: '0', move: 'S' },

    // ── q0, reading '1': three-way nondeterministic choice ───────────
    // (a) commit and reject — guessed this cell but it's '1'
    { id: uuidv4(), fromState: 'q0', readSymbol: '1', toState: 'qrej',  writeSymbol: '1', move: 'S' },
    // (b) keep scanning right
    { id: uuidv4(), fromState: 'q0', readSymbol: '1', toState: 'q0',    writeSymbol: '1', move: 'R' },
    // (c) enter loop branch
    { id: uuidv4(), fromState: 'q0', readSymbol: '1', toState: 'qloop', writeSymbol: '1', move: 'S' },

    // ── q0, reading 'B' (end of input): reject ───────────────────────
    { id: uuidv4(), fromState: 'q0', readSymbol: 'B', toState: 'qrej',  writeSymbol: 'B', move: 'S' },

    // ── qloop: stay forever (loop detection catches this) ────────────
    { id: uuidv4(), fromState: 'qloop', readSymbol: '0', toState: 'qloop', writeSymbol: '0', move: 'S' },
    { id: uuidv4(), fromState: 'qloop', readSymbol: '1', toState: 'qloop', writeSymbol: '1', move: 'S' },
    { id: uuidv4(), fromState: 'qloop', readSymbol: 'B', toState: 'qloop', writeSymbol: 'B', move: 'S' },
  ],
};

export const EXAMPLE_INPUT = '10';
