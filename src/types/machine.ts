export type MoveDirection = 'L' | 'R' | 'S';

export interface Transition {
  id: string;
  fromState: string;
  readSymbol: string;
  toState: string;
  writeSymbol: string;
  move: MoveDirection;
}

export interface NTMDefinition {
  states: string[];
  inputAlphabet: string[];
  tapeAlphabet: string[];
  startState: string;
  acceptStates: string[];
  rejectStates: string[];
  blankSymbol: string;
  transitions: Transition[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateMachine(machine: NTMDefinition): ValidationError[] {
  const errors: ValidationError[] = [];
  const stateSet = new Set(machine.states);
  const tapeSet = new Set(machine.tapeAlphabet);

  if (machine.states.length === 0) {
    errors.push({ field: 'states', message: 'At least one state required' });
  }
  if (!machine.startState) {
    errors.push({ field: 'startState', message: 'Start state required' });
  } else if (!stateSet.has(machine.startState)) {
    errors.push({ field: 'startState', message: 'Start state must be in states list' });
  }
  if (machine.acceptStates.length === 0) {
    errors.push({ field: 'acceptStates', message: 'At least one accept state required' });
  }
  for (const s of machine.acceptStates) {
    if (!stateSet.has(s)) {
      errors.push({ field: 'acceptStates', message: `Accept state "${s}" not in states list` });
    }
  }
  for (const s of machine.rejectStates) {
    if (!stateSet.has(s)) {
      errors.push({ field: 'rejectStates', message: `Reject state "${s}" not in states list` });
    }
  }
  if (machine.tapeAlphabet.length === 0) {
    errors.push({ field: 'tapeAlphabet', message: 'Tape alphabet required' });
  }
  if (!machine.blankSymbol || !tapeSet.has(machine.blankSymbol)) {
    errors.push({ field: 'blankSymbol', message: 'Blank symbol must be in tape alphabet' });
  }
  for (const sym of machine.inputAlphabet) {
    if (!tapeSet.has(sym)) {
      errors.push({ field: 'inputAlphabet', message: `Input symbol "${sym}" must also be in tape alphabet` });
    }
  }
  for (const t of machine.transitions) {
    if (!stateSet.has(t.fromState)) {
      errors.push({ field: 'transitions', message: `Transition from unknown state "${t.fromState}"` });
    }
    if (!stateSet.has(t.toState)) {
      errors.push({ field: 'transitions', message: `Transition to unknown state "${t.toState}"` });
    }
    // '*' is a reserved wildcard: read-any or write-same — skip symbol validation for it
    if (t.readSymbol !== '*' && !tapeSet.has(t.readSymbol)) {
      errors.push({ field: 'transitions', message: `Transition reads unknown symbol "${t.readSymbol}"` });
    }
    if (t.writeSymbol !== '*' && !tapeSet.has(t.writeSymbol)) {
      errors.push({ field: 'transitions', message: `Transition writes unknown symbol "${t.writeSymbol}"` });
    }
  }
  return errors;
}
