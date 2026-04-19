import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { setAutoFreeze } from 'immer';

// Disable auto-freeze so processBFSEntry can mutate the tree in-place during
// step-by-step execution. Reactivity is triggered by assigning a new shallow
// wrapper reference to state.tree inside set().
setAutoFreeze(false);
import type { Node, Edge } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import type { NTMDefinition, Transition, ValidationError } from '../types/machine';
import { validateMachine } from '../types/machine';
import type { ComputationTree } from '../types/engine';
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

  // Machine definition actions
  setMachine: (partial: Partial<NTMDefinition>) => void;
  addTransition: () => void;
  updateTransition: (id: string, partial: Partial<Omit<Transition, 'id'>>) => void;
  removeTransition: (id: string) => void;

  // Input
  setInputString: (s: string) => void;

  // Settings
  setExecutionSettings: (partial: Partial<ExecutionSettings>) => void;

  // Execution
  runExecution: () => void;
  startStepMode: () => void;
  stepExecution: () => void;
  resetExecution: () => void;

  // UI
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
    rfNodes: [],
    rfEdges: [],

    setMachine: (partial) => {
      set((state) => {
        Object.assign(state.machine, partial);
        state.machineErrors = validateMachine(state.machine as NTMDefinition);
      });
    },

    addTransition: () => {
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
      });
    },

    updateTransition: (id, partial) => {
      set((state) => {
        const idx = state.machine.transitions.findIndex((t) => t.id === id);
        if (idx !== -1) Object.assign(state.machine.transitions[idx], partial);
        state.machineErrors = validateMachine(state.machine as NTMDefinition);
      });
    },

    removeTransition: (id) => {
      set((state) => {
        state.machine.transitions = state.machine.transitions.filter((t) => t.id !== id);
        state.machineErrors = validateMachine(state.machine as NTMDefinition);
      });
    },

    setInputString: (s) => set((state) => { state.inputString = s; }),

    setExecutionSettings: (partial) => {
      set((state) => { Object.assign(state.executionSettings, partial); });
    },

    // ── Run all at once ────────────────────────────────────────────────────
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
        state.bfsQueue = [];
        state.collapsedNodeIds = new Set();
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

    // ── Start step-by-step mode ────────────────────────────────────────────
    startStepMode: () => {
      const { machine, inputString } = get();
      const errors = validateMachine(machine);
      if (errors.length > 0) {
        set((state) => { state.machineErrors = errors; });
        return;
      }
      const { tree, queue } = initBFS(machine, inputString);
      set((state) => {
        state.tree = tree as unknown as ComputationTree;
        state.bfsQueue = queue as unknown as BFSQueueEntry[];
        state.executionPhase = 'stepping';
        state.collapsedNodeIds = new Set();
      });
    },

    // ── Process one BFS step ───────────────────────────────────────────────
    stepExecution: () => {
      // Read current state (auto-freeze is OFF, so tree is a plain mutable object)
      const { tree, bfsQueue, machine, executionSettings } = get();
      if (!tree || bfsQueue.length === 0) return;

      const [entry, ...remainingQueue] = bfsQueue;

      // Mutate tree in-place (safe because setAutoFreeze(false))
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
        // Shallow-wrap tree to create a new reference → triggers useMemo in useFlowNodes
        state.tree = { ...tree } as unknown as ComputationTree;
        state.bfsQueue = nextQueue as unknown as BFSQueueEntry[];
        state.executionPhase = isDone ? 'complete' : 'stepping';
      });
    },

    // ── Reset ──────────────────────────────────────────────────────────────
    resetExecution: () => {
      set((state) => {
        state.executionPhase = 'idle';
        state.tree = null;
        state.bfsQueue = [];
        state.collapsedNodeIds = new Set();
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

    setHoveredNode: (id) => set((state) => { state.hoveredNodeId = id; }),
    setHighlightAcceptPath: (v) => set((state) => { state.highlightAcceptPath = v; }),
    setRfNodes: (nodes) => set((state) => { state.rfNodes = nodes as unknown as typeof state.rfNodes; }),
    setRfEdges: (edges) => set((state) => { state.rfEdges = edges as unknown as typeof state.rfEdges; }),
  }))
);
