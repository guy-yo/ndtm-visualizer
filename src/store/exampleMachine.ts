import { v4 as uuidv4 } from 'uuid';
import type { NTMDefinition } from '../types/machine';

/**
 * NDTM: recognizes { w ∈ {0,1}* | w contains at least one '0' }
 *
 * The loop branch cycles through three distinct states.  Each state moves
 * the tape head in a different direction so the tape view changes visibly:
 *
 *   qL1 (head=X)   → R →  qL2 (head=X+1)   tape shows next cell under head
 *   qL2 (head=X+1) → L →  qL3 (head=X)     tape head returns left
 *   qL3 (head=X)   → S →  qL1 (head=X)     fingerprint matches → LOOP
 *
 * With input "10" the tree is:
 *
 *   root [q0, pos=0, reads '1']
 *   ├─ qrej (REJ)
 *   ├─ q0, pos=1, reads '0'
 *   │   ├─ qacc (ACC ✓)
 *   │   ├─ q0, pos=2, reads 'B' → qrej (REJ)
 *   │   └─ qL1(pos=1) → qL2(pos=2) → qL3(pos=1) → qL1(LOOP ∞)
 *   └─ qL1(pos=0) → qL2(pos=1) → qL3(pos=0) → qL1(LOOP ∞)
 */
export const EXAMPLE_MACHINE: NTMDefinition = {
  states: ['q0', 'qacc', 'qrej', 'qL1', 'qL2', 'qL3'],
  inputAlphabet: ['0', '1'],
  tapeAlphabet: ['0', '1', 'B'],
  startState: 'q0',
  acceptStates: ['qacc'],
  rejectStates: ['qrej'],
  blankSymbol: 'B',
  transitions: [
    // ── q0, reading '0': three-way branch ───────────────────────────
    { id: uuidv4(), fromState: 'q0', readSymbol: '0', toState: 'qacc', writeSymbol: '0', move: 'S' },
    { id: uuidv4(), fromState: 'q0', readSymbol: '0', toState: 'q0',   writeSymbol: '0', move: 'R' },
    { id: uuidv4(), fromState: 'q0', readSymbol: '0', toState: 'qL1',  writeSymbol: '0', move: 'S' },

    // ── q0, reading '1': three-way branch ───────────────────────────
    { id: uuidv4(), fromState: 'q0', readSymbol: '1', toState: 'qrej', writeSymbol: '1', move: 'S' },
    { id: uuidv4(), fromState: 'q0', readSymbol: '1', toState: 'q0',   writeSymbol: '1', move: 'R' },
    { id: uuidv4(), fromState: 'q0', readSymbol: '1', toState: 'qL1',  writeSymbol: '1', move: 'S' },

    // ── q0, reading 'B': reject ──────────────────────────────────────
    { id: uuidv4(), fromState: 'q0', readSymbol: 'B', toState: 'qrej', writeSymbol: 'B', move: 'S' },

    // ── 3-state loop cycle with visible head movement ────────────────
    // qL1: head moves RIGHT → tape view shifts, qL2 shows the next cell
    { id: uuidv4(), fromState: 'qL1', readSymbol: '0', toState: 'qL2', writeSymbol: '0', move: 'R' },
    { id: uuidv4(), fromState: 'qL1', readSymbol: '1', toState: 'qL2', writeSymbol: '1', move: 'R' },
    { id: uuidv4(), fromState: 'qL1', readSymbol: 'B', toState: 'qL2', writeSymbol: 'B', move: 'R' },

    // qL2: head moves LEFT → returns to original position, qL3 shows same cell as qL1
    { id: uuidv4(), fromState: 'qL2', readSymbol: '0', toState: 'qL3', writeSymbol: '0', move: 'L' },
    { id: uuidv4(), fromState: 'qL2', readSymbol: '1', toState: 'qL3', writeSymbol: '1', move: 'L' },
    { id: uuidv4(), fromState: 'qL2', readSymbol: 'B', toState: 'qL3', writeSymbol: 'B', move: 'L' },

    // qL3: stays put → fingerprint (qL1, head, tape) will match → LOOP detected
    { id: uuidv4(), fromState: 'qL3', readSymbol: '0', toState: 'qL1', writeSymbol: '0', move: 'S' },
    { id: uuidv4(), fromState: 'qL3', readSymbol: '1', toState: 'qL1', writeSymbol: '1', move: 'S' },
    { id: uuidv4(), fromState: 'qL3', readSymbol: 'B', toState: 'qL1', writeSymbol: 'B', move: 'S' },
  ],
};

export const EXAMPLE_INPUT = '10';
