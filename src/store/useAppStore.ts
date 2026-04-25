import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { setAutoFreeze } from 'immer';

// Disable auto-freeze so processBFSEntry can mutate the tree in-place during
// step-by-step execution.
setAutoFreeze(false);

import type { Node, Edge } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import type { NTMDefinition, Transition, ValidationError } from '../types/machine';
import { validateMachine } from '../types/machine';
import type { ComputationTree, NTMConfig } from '../types/engine';
import type { ExecutionSettings, ExecutionPhase } from '../types/execution';
import { DEFAULT_SETTINGS } from '../types/execution';
import type { ConfigNodeData, TransitionEdgeData } from '../types/flow';
import {
  runNTM,
  initBFS,
  processBFSEntry,
  finalizeBFS,
  type BFSQueueEntry,
} from '../engine/ntmEngine';
import { EXAMPLE_MACHINE, EXAMPLE_INPUT } from './exampleMachine';

// ── Saved-machine library ─────────────────────────────────────────────────────
export interface SavedMachine {
  id:      string;
  name:    string;
  machine: NTMDefinition;
  savedAt: number; // unix timestamp ms
}

const LS_LIBRARY_KEY = 'ndtm-machine-library-v1';

function loadLibrary(): SavedMachine[] {
  try {
    const raw = localStorage.getItem(LS_LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as SavedMachine[];
  } catch { /* ignore */ }
  return [];
}

function persistLibrary(lib: SavedMachine[]): void {
  try { localStorage.setItem(LS_LIBRARY_KEY, JSON.stringify(lib)); } catch { /* ignore */ }
}

// ── localStorage persistence ──────────────────────────────────────────────────
const LS_KEY = 'ndtm-machine-v1';

function loadSavedMachine(): NTMDefinition | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NTMDefinition;
    // Sanity-check required fields
    if (
      Array.isArray(parsed.states) &&
      Array.isArray(parsed.transitions) &&
      typeof parsed.startState === 'string'
    ) return parsed;
  } catch { /* ignore */ }
  return null;
}

// ── Deep-clone helpers for step-backward snapshots ────────────────────────────
function cloneConfig(c: NTMConfig): NTMConfig {
  return { ...c, tape: new Map(c.tape), children: [...c.children] };
}
function cloneComputationTree(tree: ComputationTree): ComputationTree {
  const nodes = new Map<string, NTMConfig>();
  for (const [id, cfg] of tree.nodes) nodes.set(id, cloneConfig(cfg));
  return {
    ...tree,
    nodes,
    acceptPaths: tree.acceptPaths.map((p) => [...p]),
    stats: { ...tree.stats },
  };
}
function cloneBFSQueue(queue: BFSQueueEntry[]): BFSQueueEntry[] {
  // BFSQueueEntry stores { configId: string, ancestorFingerprints: ReadonlyMap<string,number> }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return queue.map((e: any) => ({
    configId: e.configId,
    ancestorFingerprints: new Map(e.ancestorFingerprints),
  })) as unknown as BFSQueueEntry[];
}

// ── Machine snapshot for undo/redo ────────────────────────────────────────────
function snapshotMachine(m: NTMDefinition): NTMDefinition {
  return JSON.parse(JSON.stringify(m));
}

// ── Theme initialisation (reads localStorage, applies to <html>) ──────────────
function initTheme(): 'dark' | 'light' {
  const saved = localStorage.getItem('ndtm-theme');
  const t: 'dark' | 'light' = saved === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  return t;
}

type StepSnapshot = { tree: ComputationTree; queue: BFSQueueEntry[] };

interface AppState {
  machine: NTMDefinition;
  machineErrors: ValidationError[];
  inputString: string;
  executionPhase: ExecutionPhase;
  executionSettings: ExecutionSettings;
  tree: ComputationTree | null;
  bfsQueue: BFSQueueEntry[];
  highlightAcceptPath: boolean;
  collapsedNodeIds: Set<string>;
  hoveredNodeId: string | null;
  rfNodes: Node<ConfigNodeData>[];
  rfEdges: Edge<TransitionEdgeData>[];

  // Feature 6 — theme
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;

  // Feature 8 — state filter
  stateFilter: string;
  setStateFilter: (s: string) => void;

  // Feature 9 — step backward
  treeHistory: StepSnapshot[];
  stepBack: () => void;

  // Feature 11 — accept-path playback
  playbackPath: string[] | null;
  playbackIndex: number;
  isPlaybackPlaying: boolean;
  setPlaybackPath: (path: string[] | null) => void;
  setPlaybackIndex: (i: number) => void;
  setIsPlaybackPlaying: (v: boolean) => void;
  stopPlayback: () => void;

  // Feature 12 — undo / redo
  undoStack: NTMDefinition[];
  redoStack: NTMDefinition[];
  undo: () => void;
  redo: () => void;

  // Saved-machine library
  savedMachines:       SavedMachine[];
  currentMachineId:    string | null;  // ID of the library entry being edited
  saveMachineAs:       (name: string) => void;
  loadLibraryMachine:  (id: string) => void;
  deleteLibraryMachine:(id: string) => void;

  // Machine definition actions
  newMachine: () => void;
  setMachine: (partial: Partial<NTMDefinition>) => void;
  addState: (name: string) => void;
  removeState: (name: string) => void;
  setStartState: (name: string) => void;
  toggleAcceptState: (name: string) => void;
  toggleRejectState: (name: string) => void;
  renameState: (oldName: string, newName: string) => void;
  addTransition: () => void;
  addTransitionDirect: (fields: Omit<Transition, 'id'>) => void;
  updateTransition: (id: string, partial: Partial<Omit<Transition, 'id'>>) => void;
  removeTransition: (id: string) => void;
  clearTransitions: () => void;

  // Input
  setInputString: (s: string) => void;

  // Settings
  setExecutionSettings: (partial: Partial<ExecutionSettings>) => void;

  // Execution
  runExecution: () => void;
  startStepMode: () => void;
  stepExecution: () => void;
  resetExecution: () => void;

  // View / UI
  viewMode: 'tree' | 'diagram';
  setViewMode: (mode: 'tree' | 'diagram') => void;
  toggleCollapse: (nodeId: string) => void;
  setHoveredNode: (id: string | null) => void;
  setHighlightAcceptPath: (v: boolean) => void;
  setRfNodes: (nodes: Node<ConfigNodeData>[]) => void;
  setRfEdges: (edges: Edge<TransitionEdgeData>[]) => void;
}

export const useAppStore = create<AppState>()(
  immer((set, get) => ({
    machine: loadSavedMachine() ?? EXAMPLE_MACHINE,
    machineErrors: [],
    inputString: EXAMPLE_INPUT,
    executionPhase: 'idle',
    executionSettings: DEFAULT_SETTINGS,
    tree: null,
    bfsQueue: [],
    highlightAcceptPath: true,
    collapsedNodeIds: new Set(),
    hoveredNodeId: null,
    viewMode: 'tree' as const,
    rfNodes: [],
    rfEdges: [],

    // Feature 6
    theme: initTheme(),

    // Feature 8
    stateFilter: '',

    // Feature 9
    treeHistory: [],

    // Feature 11
    playbackPath: null,
    playbackIndex: 0,
    isPlaybackPlaying: false,

    // Machine library
    savedMachines:    loadLibrary(),
    currentMachineId: null,

    // Feature 12
    undoStack: [],
    redoStack: [],

    // ── Theme ────────────────────────────────────────────────────────────────
    setTheme: (t) => {
      set((state) => { state.theme = t; });
      document.documentElement.dataset.theme = t;
      localStorage.setItem('ndtm-theme', t);
    },

    // ── State filter ─────────────────────────────────────────────────────────
    setStateFilter: (s) => set((state) => { state.stateFilter = s; }),

    // ── Step backward ─────────────────────────────────────────────────────────
    stepBack: () => {
      const { treeHistory } = get();
      if (treeHistory.length === 0) return;
      const snapshot = treeHistory[treeHistory.length - 1];
      set((state) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state as any).tree = snapshot.tree;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state as any).bfsQueue = snapshot.queue;
        state.executionPhase = 'stepping';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state as any).treeHistory = (state.treeHistory as any[]).slice(0, -1);
      });
    },

    // ── Playback ─────────────────────────────────────────────────────────────
    setPlaybackPath: (path) => set((state) => {
      state.playbackPath = path;
      state.playbackIndex = 0;
      state.isPlaybackPlaying = path !== null;
    }),
    setPlaybackIndex: (i) => set((state) => { state.playbackIndex = i; }),
    setIsPlaybackPlaying: (v) => set((state) => { state.isPlaybackPlaying = v; }),
    stopPlayback: () => set((state) => {
      state.playbackPath = null;
      state.playbackIndex = 0;
      state.isPlaybackPlaying = false;
    }),

    // ── Undo / redo ───────────────────────────────────────────────────────────
    undo: () => {
      const { undoStack, machine } = get();
      if (undoStack.length === 0) return;
      const prev = undoStack[undoStack.length - 1];
      const curr = snapshotMachine(machine);
      set((state) => {
        Object.assign(state.machine, prev);
        state.machineErrors = validateMachine(prev);
        state.undoStack = state.undoStack.slice(0, -1) as NTMDefinition[];
        state.redoStack = [...state.redoStack, curr] as NTMDefinition[];
        state.tree = null;
        state.bfsQueue = [];
        state.executionPhase = 'idle';
        state.collapsedNodeIds = new Set();
      });
    },
    redo: () => {
      const { redoStack, machine } = get();
      if (redoStack.length === 0) return;
      const next = redoStack[redoStack.length - 1];
      const curr = snapshotMachine(machine);
      set((state) => {
        Object.assign(state.machine, next);
        state.machineErrors = validateMachine(next);
        state.redoStack = state.redoStack.slice(0, -1) as NTMDefinition[];
        state.undoStack = [...state.undoStack, curr] as NTMDefinition[];
        state.tree = null;
        state.bfsQueue = [];
        state.executionPhase = 'idle';
        state.collapsedNodeIds = new Set();
      });
    },

    // ── Machine definition ────────────────────────────────────────────────────
    setMachine: (partial) => {
      const snap = snapshotMachine(get().machine);
      set((state) => {
        Object.assign(state.machine, partial);
        // Auto-sync: every input-alphabet symbol must also be in the tape alphabet
        if (partial.inputAlphabet !== undefined) {
          const tapeSet = new Set(state.machine.tapeAlphabet);
          for (const sym of state.machine.inputAlphabet) {
            if (!tapeSet.has(sym)) {
              state.machine.tapeAlphabet.push(sym);
              tapeSet.add(sym);
            }
          }
        }
        state.machineErrors = validateMachine(state.machine as NTMDefinition);
        state.tree = null;
        state.bfsQueue = [];
        state.executionPhase = 'idle';
        state.collapsedNodeIds = new Set();
        state.undoStack = [...state.undoStack.slice(-49), snap] as NTMDefinition[];
        state.redoStack = [];
        state.treeHistory = [];
      });
    },

    renameState: (oldName, newName) => {
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName) return;
      if (get().machine.states.includes(trimmed)) return; // duplicate name
      const snap = snapshotMachine(get().machine);
      set((state) => {
        state.machine.states       = state.machine.states.map((s)       => s === oldName ? trimmed : s);
        state.machine.acceptStates = state.machine.acceptStates.map((s) => s === oldName ? trimmed : s);
        state.machine.rejectStates = state.machine.rejectStates.map((s) => s === oldName ? trimmed : s);
        if (state.machine.startState === oldName) state.machine.startState = trimmed;
        for (const t of state.machine.transitions) {
          if (t.fromState === oldName) t.fromState = trimmed;
          if (t.toState   === oldName) t.toState   = trimmed;
        }
        state.machineErrors = validateMachine(state.machine as NTMDefinition);
        state.tree = null;
        state.bfsQueue = [];
        state.executionPhase = 'idle';
        state.collapsedNodeIds = new Set();
        state.undoStack = [...state.undoStack.slice(-49), snap] as NTMDefinition[];
        state.redoStack = [];
        state.treeHistory = [];
      });
    },

    addTransitionDirect: (fields) => {
      const snap = snapshotMachine(get().machine);
      set((state) => {
        const t: Transition = { id: uuidv4(), ...fields };
        state.machine.transitions.push(t);
        state.machineErrors = validateMachine(state.machine as NTMDefinition);
        state.tree = null;
        state.bfsQueue = [];
        state.executionPhase = 'idle';
        state.collapsedNodeIds = new Set();
        state.undoStack = [...state.undoStack.slice(-49), snap] as NTMDefinition[];
        state.redoStack = [];
        state.treeHistory = [];
      });
    },

    addTransition: () => {
      const snap = snapshotMachine(get().machine);
      set((state) => {
        const { states, tapeAlphabet } = state.machine;
        const firstState = states[0] ?? '';
        const firstSym = tapeAlphabet[0] ?? '';
        const t: Transition = {
          id: uuidv4(),
          fromState: firstState,
          readSymbol: firstSym,
          toState: firstState,
          writeSymbol: firstSym,
          move: 'R',
        };
        state.machine.transitions.push(t);
        state.machineErrors = validateMachine(state.machine as NTMDefinition);
        state.tree = null;
        state.bfsQueue = [];
        state.executionPhase = 'idle';
        state.collapsedNodeIds = new Set();
        state.undoStack = [...state.undoStack.slice(-49), snap] as NTMDefinition[];
        state.redoStack = [];
        state.treeHistory = [];
      });
    },

    updateTransition: (id, partial) => {
      const snap = snapshotMachine(get().machine);
      set((state) => {
        const idx = state.machine.transitions.findIndex((t) => t.id === id);
        if (idx !== -1) Object.assign(state.machine.transitions[idx], partial);
        state.machineErrors = validateMachine(state.machine as NTMDefinition);
        state.tree = null;
        state.bfsQueue = [];
        state.executionPhase = 'idle';
        state.collapsedNodeIds = new Set();
        state.undoStack = [...state.undoStack.slice(-49), snap] as NTMDefinition[];
        state.redoStack = [];
        state.treeHistory = [];
      });
    },

    removeTransition: (id) => {
      const snap = snapshotMachine(get().machine);
      set((state) => {
        state.machine.transitions = state.machine.transitions.filter((t) => t.id !== id);
        state.machineErrors = validateMachine(state.machine as NTMDefinition);
        state.tree = null;
        state.bfsQueue = [];
        state.executionPhase = 'idle';
        state.collapsedNodeIds = new Set();
        state.undoStack = [...state.undoStack.slice(-49), snap] as NTMDefinition[];
        state.redoStack = [];
        state.treeHistory = [];
      });
    },

    clearTransitions: () => {
      const snap = snapshotMachine(get().machine);
      set((state) => {
        state.machine.transitions = [];
        state.machineErrors = validateMachine(state.machine as NTMDefinition);
        state.tree = null;
        state.bfsQueue = [];
        state.executionPhase = 'idle';
        state.collapsedNodeIds = new Set();
        state.undoStack = [...state.undoStack.slice(-49), snap] as NTMDefinition[];
        state.redoStack = [];
        state.treeHistory = [];
      });
    },

    // ── Machine library ───────────────────────────────────────────────────────
    saveMachineAs: (name) => {
      const id = uuidv4();
      const entry: SavedMachine = {
        id,
        name:    name.trim(),
        machine: snapshotMachine(get().machine),
        savedAt: Date.now(),
      };
      set((state) => {
        (state as unknown as AppState).savedMachines    = [entry, ...(state as unknown as AppState).savedMachines];
        (state as unknown as AppState).currentMachineId = id;
        persistLibrary((state as unknown as AppState).savedMachines);
      });
    },

    loadLibraryMachine: (id) => {
      const entry = get().savedMachines.find((m) => m.id === id);
      if (!entry) return;
      const snap = snapshotMachine(get().machine);
      set((state) => {
        Object.assign(state.machine, snapshotMachine(entry.machine));
        state.machineErrors    = validateMachine(entry.machine);
        state.tree             = null;
        state.bfsQueue         = [];
        state.executionPhase   = 'idle';
        state.collapsedNodeIds = new Set();
        state.undoStack        = [...state.undoStack.slice(-49), snap] as NTMDefinition[];
        state.redoStack        = [];
        state.treeHistory      = [];
        (state as unknown as AppState).currentMachineId = id;
      });
    },

    deleteLibraryMachine: (id) => {
      set((state) => {
        const next = (state as unknown as AppState).savedMachines.filter((m) => m.id !== id);
        (state as unknown as AppState).savedMachines = next;
        if ((state as unknown as AppState).currentMachineId === id) {
          (state as unknown as AppState).currentMachineId = null;
        }
        persistLibrary(next);
      });
    },

    // ── New blank machine ─────────────────────────────────────────────────────
    newMachine: () => {
      const snap = snapshotMachine(get().machine);
      const blankSym = get().machine.blankSymbol;
      const blank: NTMDefinition = {
        states:        ['q0', 'qacc', 'qrej'],
        inputAlphabet: [],
        tapeAlphabet:  [blankSym],
        startState:    'q0',
        acceptStates:  ['qacc'],
        rejectStates:  ['qrej'],
        blankSymbol:   blankSym,
        transitions:   [],
      };
      set((state) => {
        Object.assign(state.machine, blank);
        state.machineErrors    = validateMachine(blank);
        state.inputString      = '';
        state.tree             = null;
        state.bfsQueue         = [];
        state.executionPhase   = 'idle';
        state.collapsedNodeIds = new Set();
        state.undoStack        = [...state.undoStack.slice(-49), snap] as NTMDefinition[];
        state.redoStack        = [];
        state.treeHistory      = [];
        (state as unknown as AppState).currentMachineId = null;
      });
    },

    // ── Visual diagram editing ────────────────────────────────────────────────
    addState: (name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (get().machine.states.includes(trimmed)) return;
      const snap = snapshotMachine(get().machine);
      set((state) => {
        state.machine.states.push(trimmed);
        // Auto-set as start state if no start state yet
        if (!state.machine.startState) state.machine.startState = trimmed;
        state.machineErrors = validateMachine(state.machine as NTMDefinition);
        state.tree = null;
        state.bfsQueue = [];
        state.executionPhase = 'idle';
        state.collapsedNodeIds = new Set();
        state.undoStack = [...state.undoStack.slice(-49), snap] as NTMDefinition[];
        state.redoStack = [];
        state.treeHistory = [];
      });
    },

    removeState: (name) => {
      const snap = snapshotMachine(get().machine);
      set((state) => {
        state.machine.states       = state.machine.states.filter((s)       => s !== name);
        state.machine.acceptStates = state.machine.acceptStates.filter((s) => s !== name);
        state.machine.rejectStates = state.machine.rejectStates.filter((s) => s !== name);
        state.machine.transitions  = state.machine.transitions.filter(
          (t) => t.fromState !== name && t.toState !== name,
        );
        if (state.machine.startState === name) {
          state.machine.startState = state.machine.states[0] ?? '';
        }
        state.machineErrors = validateMachine(state.machine as NTMDefinition);
        state.tree = null;
        state.bfsQueue = [];
        state.executionPhase = 'idle';
        state.collapsedNodeIds = new Set();
        state.undoStack = [...state.undoStack.slice(-49), snap] as NTMDefinition[];
        state.redoStack = [];
        state.treeHistory = [];
      });
    },

    setStartState: (name) => {
      const snap = snapshotMachine(get().machine);
      set((state) => {
        state.machine.startState = name;
        state.machineErrors = validateMachine(state.machine as NTMDefinition);
        state.tree = null;
        state.bfsQueue = [];
        state.executionPhase = 'idle';
        state.collapsedNodeIds = new Set();
        state.undoStack = [...state.undoStack.slice(-49), snap] as NTMDefinition[];
        state.redoStack = [];
        state.treeHistory = [];
      });
    },

    toggleAcceptState: (name) => {
      const snap = snapshotMachine(get().machine);
      set((state) => {
        const isAccept = state.machine.acceptStates.includes(name);
        if (isAccept) {
          state.machine.acceptStates = state.machine.acceptStates.filter((s) => s !== name);
        } else {
          state.machine.acceptStates.push(name);
          state.machine.rejectStates = state.machine.rejectStates.filter((s) => s !== name);
        }
        state.machineErrors = validateMachine(state.machine as NTMDefinition);
        state.tree = null;
        state.bfsQueue = [];
        state.executionPhase = 'idle';
        state.collapsedNodeIds = new Set();
        state.undoStack = [...state.undoStack.slice(-49), snap] as NTMDefinition[];
        state.redoStack = [];
        state.treeHistory = [];
      });
    },

    toggleRejectState: (name) => {
      const snap = snapshotMachine(get().machine);
      set((state) => {
        const isReject = state.machine.rejectStates.includes(name);
        if (isReject) {
          state.machine.rejectStates = state.machine.rejectStates.filter((s) => s !== name);
        } else {
          state.machine.rejectStates.push(name);
          state.machine.acceptStates = state.machine.acceptStates.filter((s) => s !== name);
        }
        state.machineErrors = validateMachine(state.machine as NTMDefinition);
        state.tree = null;
        state.bfsQueue = [];
        state.executionPhase = 'idle';
        state.collapsedNodeIds = new Set();
        state.undoStack = [...state.undoStack.slice(-49), snap] as NTMDefinition[];
        state.redoStack = [];
        state.treeHistory = [];
      });
    },

    setInputString: (s) => set((state) => { state.inputString = s; }),

    setExecutionSettings: (partial) => {
      set((state) => { Object.assign(state.executionSettings, partial); });
    },

    // ── Run all at once ────────────────────────────────────────────────────────
    runExecution: () => {
      const { machine, inputString, executionSettings } = get();
      const errors = validateMachine(machine);
      if (errors.length > 0) {
        set((state) => { state.machineErrors = errors; });
        return;
      }
      set((state) => {
        state.executionPhase = 'running';
        state.tree = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state as any).bfsQueue = [];
        state.collapsedNodeIds = new Set();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state as any).treeHistory = [];
        state.playbackPath = null;
        state.playbackIndex = 0;
        state.isPlaybackPlaying = false;
      });
      setTimeout(() => {
        const tree = runNTM(machine, inputString, executionSettings);
        set((state) => {
          state.tree = tree as unknown as ComputationTree;
          state.executionPhase = 'complete';
          state.bfsQueue = [];
        });
      }, 0);
    },

    // ── Start step-by-step mode ────────────────────────────────────────────────
    startStepMode: () => {
      const { machine, inputString } = get();
      const errors = validateMachine(machine);
      if (errors.length > 0) {
        set((state) => { state.machineErrors = errors; });
        return;
      }
      const { tree, queue } = initBFS(machine, inputString);
      set((state) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state as any).tree = tree;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state as any).bfsQueue = queue;
        state.executionPhase = 'stepping';
        state.collapsedNodeIds = new Set();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state as any).treeHistory = [];
        state.playbackPath = null;
        state.playbackIndex = 0;
        state.isPlaybackPlaying = false;
      });
    },

    // ── Process one BFS step ───────────────────────────────────────────────────
    stepExecution: () => {
      const { tree, bfsQueue, machine, executionSettings } = get();
      if (!tree || bfsQueue.length === 0) return;

      // Snapshot BEFORE mutation for step-backward (limit to 50 entries)
      const snapshot: StepSnapshot = {
        tree: cloneComputationTree(tree),
        queue: cloneBFSQueue(bfsQueue),
      };

      const [entry, ...remainingQueue] = bfsQueue;

      const { newEntries, shouldStop } = processBFSEntry(
        entry,
        tree,
        machine,
        executionSettings,
      );

      const nextQueue = shouldStop ? [] : [...remainingQueue, ...newEntries];
      const isDone = nextQueue.length === 0 || shouldStop;
      if (isDone) finalizeBFS(tree);

      set((state) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state as any).tree = { ...tree };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state as any).bfsQueue = nextQueue;
        state.executionPhase = isDone ? 'complete' : 'stepping';
        // Push snapshot to history (keep last 50)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state as any).treeHistory = [...(state.treeHistory as any[]).slice(-49), snapshot];
      });
    },

    // ── Reset ──────────────────────────────────────────────────────────────────
    resetExecution: () => {
      set((state) => {
        state.executionPhase = 'idle';
        state.tree = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state as any).bfsQueue = [];
        state.collapsedNodeIds = new Set();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state as any).treeHistory = [];
        state.playbackPath = null;
        state.playbackIndex = 0;
        state.isPlaybackPlaying = false;
      });
    },

    toggleCollapse: (nodeId) => {
      set((state) => {
        if (state.collapsedNodeIds.has(nodeId)) {
          state.collapsedNodeIds.delete(nodeId);
        } else {
          state.collapsedNodeIds.add(nodeId);
        }
      });
    },

    setViewMode: (mode) => set((state) => { state.viewMode = mode; }),
    setHoveredNode: (id) => set((state) => { state.hoveredNodeId = id; }),
    setHighlightAcceptPath: (v) => set((state) => { state.highlightAcceptPath = v; }),
    setRfNodes: (nodes) => set((state) => { state.rfNodes = nodes as unknown as typeof state.rfNodes; }),
    setRfEdges: (edges) => set((state) => { state.rfEdges = edges as unknown as typeof state.rfEdges; }),
  }))
);

// ── Auto-save machine to localStorage + library entry on every change ─────────
useAppStore.subscribe((state, prev) => {
  if (state.machine === prev.machine) return;

  // 1. Always persist the current working machine
  try { localStorage.setItem(LS_KEY, JSON.stringify(state.machine)); } catch { /* ignore */ }

  // 2. If a named library entry is active, update it in-place
  const id = state.currentMachineId;
  if (!id) return;

  const updated = state.savedMachines.map((m) =>
    m.id === id
      ? { ...m, machine: JSON.parse(JSON.stringify(state.machine)), savedAt: Date.now() }
      : m,
  );

  persistLibrary(updated);
  // Update store without touching `machine` (prevents infinite loop)
  useAppStore.setState({ savedMachines: updated });
});
