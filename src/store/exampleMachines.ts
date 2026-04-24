import { v4 as uuidv4 } from 'uuid';
import type { NTMDefinition } from '../types/machine';

export interface ExampleEntry {
  label: string;
  description: string;
  machine: NTMDefinition;
  input: string;
}

// ── 1. Contains 0 (NDTM) ─────────────────────────────────────────────────────
// qScan scans right.  On '0' it can either accept immediately (nondeterministic
// guess) OR keep scanning, demonstrating a branching tree.
const containsZero: ExampleEntry = {
  label: 'Contains 0',
  description: 'NDTM: accepts { w ∈ {0,1}* | w contains at least one 0 }',
  machine: {
    states: ['qScan', 'qacc', 'qrej'],
    inputAlphabet: ['0', '1'],
    tapeAlphabet: ['0', '1', 'B'],
    startState: 'qScan',
    acceptStates: ['qacc'],
    rejectStates: ['qrej'],
    blankSymbol: 'B',
    transitions: [
      // On '0': nondeterministically accept OR keep scanning
      { id: uuidv4(), fromState: 'qScan', readSymbol: '0', toState: 'qacc', writeSymbol: '0', move: 'S' },
      { id: uuidv4(), fromState: 'qScan', readSymbol: '0', toState: 'qScan', writeSymbol: '0', move: 'R' },
      // On '1': always keep scanning
      { id: uuidv4(), fromState: 'qScan', readSymbol: '1', toState: 'qScan', writeSymbol: '1', move: 'R' },
      // On blank: no 0 found → reject
      { id: uuidv4(), fromState: 'qScan', readSymbol: 'B', toState: 'qrej', writeSymbol: 'B', move: 'S' },
    ],
  },
  input: '10',
};

// ── 2. 0ⁿ1ⁿ recognizer (DTM) ─────────────────────────────────────────────────
// Marks each 0 with X and matching 1 with Y until both sides are exhausted.
const zeroN1N: ExampleEntry = {
  label: '0ⁿ1ⁿ',
  description: 'DTM: accepts { 0ⁿ1ⁿ | n ≥ 1 }',
  machine: {
    states: ['qMark0', 'qFind1', 'qGoBack', 'qVerify', 'qacc', 'qrej'],
    inputAlphabet: ['0', '1'],
    tapeAlphabet: ['0', '1', 'X', 'Y', 'B'],
    startState: 'qMark0',
    acceptStates: ['qacc'],
    rejectStates: ['qrej'],
    blankSymbol: 'B',
    transitions: [
      // qMark0: find next unmatched 0, mark it X
      { id: uuidv4(), fromState: 'qMark0', readSymbol: '0',  toState: 'qFind1', writeSymbol: 'X', move: 'R' },
      { id: uuidv4(), fromState: 'qMark0', readSymbol: 'X',  toState: 'qMark0', writeSymbol: 'X', move: 'R' },
      { id: uuidv4(), fromState: 'qMark0', readSymbol: 'Y',  toState: 'qVerify',writeSymbol: 'Y', move: 'R' },
      { id: uuidv4(), fromState: 'qMark0', readSymbol: '1',  toState: 'qrej',   writeSymbol: '1', move: 'S' },
      { id: uuidv4(), fromState: 'qMark0', readSymbol: 'B',  toState: 'qrej',   writeSymbol: 'B', move: 'S' },

      // qFind1: scan right to find matching 1, mark it Y
      { id: uuidv4(), fromState: 'qFind1', readSymbol: '0',  toState: 'qFind1', writeSymbol: '0', move: 'R' },
      { id: uuidv4(), fromState: 'qFind1', readSymbol: 'Y',  toState: 'qFind1', writeSymbol: 'Y', move: 'R' },
      { id: uuidv4(), fromState: 'qFind1', readSymbol: '1',  toState: 'qGoBack',writeSymbol: 'Y', move: 'L' },
      { id: uuidv4(), fromState: 'qFind1', readSymbol: 'B',  toState: 'qrej',   writeSymbol: 'B', move: 'S' },

      // qGoBack: scan left back to the leftmost X
      { id: uuidv4(), fromState: 'qGoBack', readSymbol: '0', toState: 'qGoBack',writeSymbol: '0', move: 'L' },
      { id: uuidv4(), fromState: 'qGoBack', readSymbol: 'Y', toState: 'qGoBack',writeSymbol: 'Y', move: 'L' },
      { id: uuidv4(), fromState: 'qGoBack', readSymbol: 'X', toState: 'qMark0', writeSymbol: 'X', move: 'R' },
      { id: uuidv4(), fromState: 'qGoBack', readSymbol: 'B', toState: 'qMark0', writeSymbol: 'B', move: 'R' },

      // qVerify: all 0s matched — check only Y's remain (no unmatched 1s)
      { id: uuidv4(), fromState: 'qVerify', readSymbol: 'Y', toState: 'qVerify',writeSymbol: 'Y', move: 'R' },
      { id: uuidv4(), fromState: 'qVerify', readSymbol: 'B', toState: 'qacc',   writeSymbol: 'B', move: 'S' },
      { id: uuidv4(), fromState: 'qVerify', readSymbol: '1', toState: 'qrej',   writeSymbol: '1', move: 'S' },
      { id: uuidv4(), fromState: 'qVerify', readSymbol: '0', toState: 'qrej',   writeSymbol: '0', move: 'S' },
    ],
  },
  input: '0011',
};

// ── 3. Ends in 00 (NDTM) ─────────────────────────────────────────────────────
// Nondeterministically guesses which '0' is the second-to-last symbol.
const endsIn00: ExampleEntry = {
  label: 'Ends in 00',
  description: 'NDTM: accepts { w ∈ {0,1}* | w ends with 00 }',
  machine: {
    states: ['qScan', 'qSaw0', 'qSaw00', 'qacc', 'qrej'],
    inputAlphabet: ['0', '1'],
    tapeAlphabet: ['0', '1', 'B'],
    startState: 'qScan',
    acceptStates: ['qacc'],
    rejectStates: ['qrej'],
    blankSymbol: 'B',
    transitions: [
      // qScan: keep scanning OR guess "this '0' is the penultimate symbol"
      { id: uuidv4(), fromState: 'qScan', readSymbol: '0', toState: 'qScan',  writeSymbol: '0', move: 'R' },
      { id: uuidv4(), fromState: 'qScan', readSymbol: '1', toState: 'qScan',  writeSymbol: '1', move: 'R' },
      { id: uuidv4(), fromState: 'qScan', readSymbol: '0', toState: 'qSaw0',  writeSymbol: '0', move: 'R' },
      { id: uuidv4(), fromState: 'qScan', readSymbol: 'B', toState: 'qrej',   writeSymbol: 'B', move: 'S' },

      // qSaw0: guessed penultimate 0 — next must also be '0'
      { id: uuidv4(), fromState: 'qSaw0', readSymbol: '0', toState: 'qSaw00', writeSymbol: '0', move: 'R' },
      { id: uuidv4(), fromState: 'qSaw0', readSymbol: '1', toState: 'qrej',   writeSymbol: '1', move: 'S' },
      { id: uuidv4(), fromState: 'qSaw0', readSymbol: 'B', toState: 'qrej',   writeSymbol: 'B', move: 'S' },

      // qSaw00: saw "00" — must now be at end of string
      { id: uuidv4(), fromState: 'qSaw00', readSymbol: 'B', toState: 'qacc',  writeSymbol: 'B', move: 'S' },
      { id: uuidv4(), fromState: 'qSaw00', readSymbol: '0', toState: 'qrej',  writeSymbol: '0', move: 'S' },
      { id: uuidv4(), fromState: 'qSaw00', readSymbol: '1', toState: 'qrej',  writeSymbol: '1', move: 'S' },
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
    states: ['qScan', 'qacc', 'qrej'],
    inputAlphabet: ['0', '1'],
    tapeAlphabet: ['0', '1', 'B'],
    startState: 'qScan',
    acceptStates: ['qacc'],
    rejectStates: ['qrej'],
    blankSymbol: 'B',
    transitions: [
      { id: uuidv4(), fromState: 'qScan', readSymbol: '0', toState: 'qScan', writeSymbol: '0', move: 'R' },
      { id: uuidv4(), fromState: 'qScan', readSymbol: 'B', toState: 'qacc', writeSymbol: 'B', move: 'S' },
      { id: uuidv4(), fromState: 'qScan', readSymbol: '1', toState: 'qrej', writeSymbol: '1', move: 'S' },
    ],
  },
  input: '000',
};

// ── 5. Palindrome over {a, b} (DTM) ──────────────────────────────────────────
// Erases leftmost symbol, scans right to check rightmost matches, erases it,
// scans back, repeats.  Accepts if all pairs matched and centre (if odd) is ok.
const palindromeAB: ExampleEntry = {
  label: 'Palindrome {a,b}',
  description: 'DTM: accepts { w ∈ {a,b}* | w is a palindrome }',
  machine: {
    states: ['qReadLeft', 'qScanA', 'qScanB', 'qMatchA', 'qMatchB', 'qReturn', 'qacc', 'qrej'],
    inputAlphabet: ['a', 'b'],
    tapeAlphabet: ['a', 'b', 'B'],
    startState: 'qReadLeft',
    acceptStates: ['qacc'],
    rejectStates: ['qrej'],
    blankSymbol: 'B',
    transitions: [
      // qReadLeft: erase leftmost char and remember it
      { id: uuidv4(), fromState: 'qReadLeft', readSymbol: 'a', toState: 'qScanA',  writeSymbol: 'B', move: 'R' },
      { id: uuidv4(), fromState: 'qReadLeft', readSymbol: 'b', toState: 'qScanB',  writeSymbol: 'B', move: 'R' },
      { id: uuidv4(), fromState: 'qReadLeft', readSymbol: 'B', toState: 'qacc',    writeSymbol: 'B', move: 'S' },
      // qScanA: scan right to end (remembering left char was 'a')
      { id: uuidv4(), fromState: 'qScanA',    readSymbol: 'a', toState: 'qScanA',  writeSymbol: 'a', move: 'R' },
      { id: uuidv4(), fromState: 'qScanA',    readSymbol: 'b', toState: 'qScanA',  writeSymbol: 'b', move: 'R' },
      { id: uuidv4(), fromState: 'qScanA',    readSymbol: 'B', toState: 'qMatchA', writeSymbol: 'B', move: 'L' },
      // qMatchA: rightmost symbol must be 'a'
      { id: uuidv4(), fromState: 'qMatchA',   readSymbol: 'a', toState: 'qReturn', writeSymbol: 'B', move: 'L' },
      { id: uuidv4(), fromState: 'qMatchA',   readSymbol: 'b', toState: 'qrej',    writeSymbol: 'b', move: 'S' },
      { id: uuidv4(), fromState: 'qMatchA',   readSymbol: 'B', toState: 'qacc',    writeSymbol: 'B', move: 'S' },
      // qScanB: scan right to end (remembering left char was 'b')
      { id: uuidv4(), fromState: 'qScanB',    readSymbol: 'a', toState: 'qScanB',  writeSymbol: 'a', move: 'R' },
      { id: uuidv4(), fromState: 'qScanB',    readSymbol: 'b', toState: 'qScanB',  writeSymbol: 'b', move: 'R' },
      { id: uuidv4(), fromState: 'qScanB',    readSymbol: 'B', toState: 'qMatchB', writeSymbol: 'B', move: 'L' },
      // qMatchB: rightmost symbol must be 'b'
      { id: uuidv4(), fromState: 'qMatchB',   readSymbol: 'b', toState: 'qReturn', writeSymbol: 'B', move: 'L' },
      { id: uuidv4(), fromState: 'qMatchB',   readSymbol: 'a', toState: 'qrej',    writeSymbol: 'a', move: 'S' },
      { id: uuidv4(), fromState: 'qMatchB',   readSymbol: 'B', toState: 'qacc',    writeSymbol: 'B', move: 'S' },
      // qReturn: scan left back to the leftmost blank
      { id: uuidv4(), fromState: 'qReturn',   readSymbol: 'a', toState: 'qReturn', writeSymbol: 'a', move: 'L' },
      { id: uuidv4(), fromState: 'qReturn',   readSymbol: 'b', toState: 'qReturn', writeSymbol: 'b', move: 'L' },
      { id: uuidv4(), fromState: 'qReturn',   readSymbol: 'B', toState: 'qReadLeft',writeSymbol: 'B', move: 'R' },
    ],
  },
  input: 'abba',
};

// ── 6. Unary addition (DTM) ───────────────────────────────────────────────────
// Input: 1^m | 1^n  (| is the separator).  Output: 1^(m+n).
// Converts '|' → '1', scans to end, erases the last '1'.
const unaryAddition: ExampleEntry = {
  label: 'Unary addition',
  description: 'DTM: 1ᵐ|1ⁿ → 1ᵐ⁺ⁿ  (replaces | with 1, removes last 1)',
  machine: {
    states: ['qFindSep', 'qScanEnd', 'qErase', 'qacc', 'qrej'],
    inputAlphabet: ['1', '|'],
    tapeAlphabet: ['1', '|', 'B'],
    startState: 'qFindSep',
    acceptStates: ['qacc'],
    rejectStates: ['qrej'],
    blankSymbol: 'B',
    transitions: [
      // qFindSep: scan right to find the '|' separator
      { id: uuidv4(), fromState: 'qFindSep', readSymbol: '1', toState: 'qFindSep', writeSymbol: '1', move: 'R' },
      { id: uuidv4(), fromState: 'qFindSep', readSymbol: '|', toState: 'qScanEnd', writeSymbol: '1', move: 'R' },
      { id: uuidv4(), fromState: 'qFindSep', readSymbol: 'B', toState: 'qrej',     writeSymbol: 'B', move: 'S' },
      // qScanEnd: scan right to end of the second group
      { id: uuidv4(), fromState: 'qScanEnd', readSymbol: '1', toState: 'qScanEnd', writeSymbol: '1', move: 'R' },
      { id: uuidv4(), fromState: 'qScanEnd', readSymbol: 'B', toState: 'qErase',   writeSymbol: 'B', move: 'L' },
      // qErase: erase last '1' (the extra one added for the separator)
      { id: uuidv4(), fromState: 'qErase',   readSymbol: '1', toState: 'qacc',     writeSymbol: 'B', move: 'S' },
      { id: uuidv4(), fromState: 'qErase',   readSymbol: 'B', toState: 'qacc',     writeSymbol: 'B', move: 'S' },
    ],
  },
  input: '111|11',
};

// ── 7. aⁿbⁿcⁿ recognizer (DTM) ───────────────────────────────────────────────
// Each pass marks one 'a' → X, one 'b' → Y, one 'c' → Z and sweeps back.
// When all a's are consumed, verifies only Y's and Z's remain.
const aNbNcN: ExampleEntry = {
  label: 'aⁿbⁿcⁿ',
  description: 'DTM: accepts { aⁿbⁿcⁿ | n ≥ 1 }',
  machine: {
    states: ['qMarkA', 'qMarkB', 'qMarkC', 'qReturn', 'qVerify', 'qacc', 'qrej'],
    inputAlphabet: ['a', 'b', 'c'],
    tapeAlphabet: ['a', 'b', 'c', 'X', 'Y', 'Z', 'B'],
    startState: 'qMarkA',
    acceptStates: ['qacc'],
    rejectStates: ['qrej'],
    blankSymbol: 'B',
    transitions: [
      // qMarkA: find next unmatched 'a', mark it X
      { id: uuidv4(), fromState: 'qMarkA',  readSymbol: 'a', toState: 'qMarkB',  writeSymbol: 'X', move: 'R' },
      { id: uuidv4(), fromState: 'qMarkA',  readSymbol: 'X', toState: 'qMarkA',  writeSymbol: 'X', move: 'R' },
      { id: uuidv4(), fromState: 'qMarkA',  readSymbol: 'Y', toState: 'qVerify', writeSymbol: 'Y', move: 'R' },
      { id: uuidv4(), fromState: 'qMarkA',  readSymbol: 'b', toState: 'qrej',    writeSymbol: 'b', move: 'S' },
      { id: uuidv4(), fromState: 'qMarkA',  readSymbol: 'c', toState: 'qrej',    writeSymbol: 'c', move: 'S' },
      { id: uuidv4(), fromState: 'qMarkA',  readSymbol: 'Z', toState: 'qrej',    writeSymbol: 'Z', move: 'S' },
      { id: uuidv4(), fromState: 'qMarkA',  readSymbol: 'B', toState: 'qrej',    writeSymbol: 'B', move: 'S' },

      // qMarkB: scan right to find unmatched 'b', mark it Y
      { id: uuidv4(), fromState: 'qMarkB',  readSymbol: 'a', toState: 'qMarkB',  writeSymbol: 'a', move: 'R' },
      { id: uuidv4(), fromState: 'qMarkB',  readSymbol: 'X', toState: 'qMarkB',  writeSymbol: 'X', move: 'R' },
      { id: uuidv4(), fromState: 'qMarkB',  readSymbol: 'Y', toState: 'qMarkB',  writeSymbol: 'Y', move: 'R' },
      { id: uuidv4(), fromState: 'qMarkB',  readSymbol: 'b', toState: 'qMarkC',  writeSymbol: 'Y', move: 'R' },
      { id: uuidv4(), fromState: 'qMarkB',  readSymbol: 'B', toState: 'qrej',    writeSymbol: 'B', move: 'S' },
      { id: uuidv4(), fromState: 'qMarkB',  readSymbol: 'c', toState: 'qrej',    writeSymbol: 'c', move: 'S' },
      { id: uuidv4(), fromState: 'qMarkB',  readSymbol: 'Z', toState: 'qrej',    writeSymbol: 'Z', move: 'S' },

      // qMarkC: scan right to find unmatched 'c', mark it Z
      { id: uuidv4(), fromState: 'qMarkC',  readSymbol: 'b', toState: 'qMarkC',  writeSymbol: 'b', move: 'R' },
      { id: uuidv4(), fromState: 'qMarkC',  readSymbol: 'Y', toState: 'qMarkC',  writeSymbol: 'Y', move: 'R' },
      { id: uuidv4(), fromState: 'qMarkC',  readSymbol: 'Z', toState: 'qMarkC',  writeSymbol: 'Z', move: 'R' },
      { id: uuidv4(), fromState: 'qMarkC',  readSymbol: 'c', toState: 'qReturn', writeSymbol: 'Z', move: 'L' },
      { id: uuidv4(), fromState: 'qMarkC',  readSymbol: 'B', toState: 'qrej',    writeSymbol: 'B', move: 'S' },
      { id: uuidv4(), fromState: 'qMarkC',  readSymbol: 'a', toState: 'qrej',    writeSymbol: 'a', move: 'S' },
      { id: uuidv4(), fromState: 'qMarkC',  readSymbol: 'X', toState: 'qrej',    writeSymbol: 'X', move: 'S' },

      // qReturn: scan left back to beginning of tape
      { id: uuidv4(), fromState: 'qReturn', readSymbol: 'a', toState: 'qReturn', writeSymbol: 'a', move: 'L' },
      { id: uuidv4(), fromState: 'qReturn', readSymbol: 'b', toState: 'qReturn', writeSymbol: 'b', move: 'L' },
      { id: uuidv4(), fromState: 'qReturn', readSymbol: 'c', toState: 'qReturn', writeSymbol: 'c', move: 'L' },
      { id: uuidv4(), fromState: 'qReturn', readSymbol: 'X', toState: 'qReturn', writeSymbol: 'X', move: 'L' },
      { id: uuidv4(), fromState: 'qReturn', readSymbol: 'Y', toState: 'qReturn', writeSymbol: 'Y', move: 'L' },
      { id: uuidv4(), fromState: 'qReturn', readSymbol: 'Z', toState: 'qReturn', writeSymbol: 'Z', move: 'L' },
      { id: uuidv4(), fromState: 'qReturn', readSymbol: 'B', toState: 'qMarkA',  writeSymbol: 'B', move: 'R' },

      // qVerify: all a's matched — verify only Y's and Z's remain
      { id: uuidv4(), fromState: 'qVerify', readSymbol: 'Y', toState: 'qVerify', writeSymbol: 'Y', move: 'R' },
      { id: uuidv4(), fromState: 'qVerify', readSymbol: 'Z', toState: 'qVerify', writeSymbol: 'Z', move: 'R' },
      { id: uuidv4(), fromState: 'qVerify', readSymbol: 'B', toState: 'qacc',    writeSymbol: 'B', move: 'S' },
      { id: uuidv4(), fromState: 'qVerify', readSymbol: 'a', toState: 'qrej',    writeSymbol: 'a', move: 'S' },
      { id: uuidv4(), fromState: 'qVerify', readSymbol: 'b', toState: 'qrej',    writeSymbol: 'b', move: 'S' },
      { id: uuidv4(), fromState: 'qVerify', readSymbol: 'c', toState: 'qrej',    writeSymbol: 'c', move: 'S' },
      { id: uuidv4(), fromState: 'qVerify', readSymbol: 'X', toState: 'qrej',    writeSymbol: 'X', move: 'S' },
    ],
  },
  input: 'aaabbbccc',
};

// ── 8. Binary increment (DTM) ─────────────────────────────────────────────────
// Scans to the rightmost bit, flips 1→0 with carry, stops when it flips 0→1.
const binaryIncrement: ExampleEntry = {
  label: 'Binary increment',
  description: 'DTM: increments a binary number (0111 → 1000)',
  machine: {
    states: ['qScanEnd', 'qCarry', 'qacc', 'qrej'],
    inputAlphabet: ['0', '1'],
    tapeAlphabet: ['0', '1', 'B'],
    startState: 'qScanEnd',
    acceptStates: ['qacc'],
    rejectStates: ['qrej'],
    blankSymbol: 'B',
    transitions: [
      // qScanEnd: scan right to the end of the number
      { id: uuidv4(), fromState: 'qScanEnd', readSymbol: '0', toState: 'qScanEnd', writeSymbol: '0', move: 'R' },
      { id: uuidv4(), fromState: 'qScanEnd', readSymbol: '1', toState: 'qScanEnd', writeSymbol: '1', move: 'R' },
      { id: uuidv4(), fromState: 'qScanEnd', readSymbol: 'B', toState: 'qCarry',   writeSymbol: 'B', move: 'L' },
      // qCarry: propagate carry rightward from LSB
      { id: uuidv4(), fromState: 'qCarry',   readSymbol: '1', toState: 'qCarry',   writeSymbol: '0', move: 'L' },
      { id: uuidv4(), fromState: 'qCarry',   readSymbol: '0', toState: 'qacc',     writeSymbol: '1', move: 'S' },
      { id: uuidv4(), fromState: 'qCarry',   readSymbol: 'B', toState: 'qacc',     writeSymbol: '1', move: 'S' },
    ],
  },
  input: '0111',
};

export const EXAMPLE_MACHINES: ExampleEntry[] = [
  containsZero,
  zeroN1N,
  endsIn00,
  allZeros,
  palindromeAB,
  unaryAddition,
  aNbNcN,
  binaryIncrement,
];
