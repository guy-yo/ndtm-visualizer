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

  // Machine definition actions
  setMachine: (partial: Partial<NTMDefinition>) => void;
  addTransition: () => void;
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
    machine: EXAMPLE_MACHINE,
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
