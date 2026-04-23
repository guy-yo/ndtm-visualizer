import { v4 as uuidv4 } from 'uuid';
import type { NTMDefinition } from '../types/machine';
import type { ExecutionSettings } from '../types/execution';
import type { NTMConfig, ComputationTree, TapeMap, TerminationReason } from '../types/engine';
import { initTape, readCell, writeCell } from './tapeUtils';
import { fingerprint, isLoop, extendFingerprints } from './loopDetector';

// ─── Public types ────────────────────────────────────────────────────────────

export interface BFSQueueEntry {
  configId: string;
  /** Maps fingerprint → number of ancestors in this branch that had that fingerprint. */
  ancestorFingerprints: ReadonlyMap<string, number>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildAcceptPath(nodes: Map<string, NTMConfig>, leafId: string): string[] {
  const path: string[] = [];
  let current: string | null = leafId;
  while (current !== null) {
    path.unshift(current);
    const node = nodes.get(current);
    current = node?.parentId ?? null;
  }
  return path;
}

/**
 * Walk up the parent chain to find the first ancestor whose fingerprint
 * matches `fp`. Returns that ancestor's ID, or null if not found.
 */
function findLoopOriginId(
  nodeId: string,
  fp: string,
  nodes: Map<string, NTMConfig>,
  machine: NTMDefinition,
  settings: ExecutionSettings,
): string | null {
  const node = nodes.get(nodeId);
  let checkId = node?.parentId ?? null;
  while (checkId !== null) {
    const ancestor = nodes.get(checkId);
    if (!ancestor) break;
    const ancestorFp = fingerprint(
      ancestor.state,
      ancestor.tape,
      ancestor.headPosition,
      machine.blankSymbol,
      settings.loopWindowSize,
    );
    if (ancestorFp === fp) return checkId;
    checkId = ancestor.parentId;
  }
  return null;
}

// ─── initBFS ─────────────────────────────────────────────────────────────────

/**
 * Creates the initial BFS state: a tree with just the root config and a
 * queue containing that root entry. Call processBFSEntry() for each step.
 */
export function initBFS(
  machine: NTMDefinition,
  input: string,
): { tree: ComputationTree; queue: BFSQueueEntry[] } {
  const nodes = new Map<string, NTMConfig>();
  const rootConfig: NTMConfig = {
    id: uuidv4(),
    parentId: null,
    state: machine.startState,
    tape: initTape(input),
    headPosition: 0,
    depth: 0,
    transitionUsed: null,
    status: 'running',
    children: [],
    loopOriginId: null,
    rejectReason: null,
  };
  nodes.set(rootConfig.id, rootConfig);

  const tree: ComputationTree = {
    rootId: rootConfig.id,
    nodes,
    acceptPaths: [],
    stats: { totalNodes: 1, maxDepth: 0, terminationReason: 'running' },
  };

  return {
    tree,
    queue: [{ configId: rootConfig.id, ancestorFingerprints: new Map<string, number>() }],
  };
}

// ─── processBFSEntry ─────────────────────────────────────────────────────────

/**
 * Processes ONE entry from the BFS queue. Mutates `tree` in place.
 * Returns new queue entries to add, and whether BFS should terminate.
 */
export function processBFSEntry(
  entry: BFSQueueEntry,
  tree: ComputationTree,
  machine: NTMDefinition,
  settings: ExecutionSettings,
): { newEntries: BFSQueueEntry[]; shouldStop: boolean } {
  const acceptStateSet = new Set(machine.acceptStates);
  const rejectStateSet = new Set(machine.rejectStates);
  const { configId, ancestorFingerprints } = entry;
  const current = tree.nodes.get(configId);
  if (!current) return { newEntries: [], shouldStop: false };

  if (current.depth > tree.stats.maxDepth) {
    tree.stats.maxDepth = current.depth;
  }

  // ── Accept ──
  if (acceptStateSet.has(current.state)) {
    current.status = 'accept';
    tree.acceptPaths.push(buildAcceptPath(tree.nodes, current.id));
    if (settings.stopOnAccept && !settings.buildFullTree) {
      tree.stats.terminationReason = 'accept';
      return { newEntries: [], shouldStop: true };
    }
    return { newEntries: [], shouldStop: false };
  }

  // ── Explicit reject ──
  if (rejectStateSet.has(current.state)) {
    current.status = 'reject';
    current.rejectReason = 'explicit';
    return { newEntries: [], shouldStop: false };
  }

  // ── Depth limit ──
  if (current.depth >= settings.maxDepth) {
    current.status = 'reject';
    current.rejectReason = 'depth-limit';
    if (tree.stats.terminationReason === 'running') tree.stats.terminationReason = 'max-depth';
    return { newEntries: [], shouldStop: false };
  }

  // ── Node limit ──
  if (tree.nodes.size >= settings.maxNodes) {
    current.status = 'reject';
    current.rejectReason = 'node-limit';
    tree.stats.terminationReason = 'max-nodes';
    return { newEntries: [], shouldStop: true };
  }

  // ── Loop detection ──
  let nextAncestors: ReadonlyMap<string, number>;
  if (settings.enableLoopDetection) {
    const fp = fingerprint(
      current.state,
      current.tape,
      current.headPosition,
      machine.blankSymbol,
      settings.loopWindowSize,
    );
    if (isLoop(fp, ancestorFingerprints)) {
      current.status = 'loop';
      current.loopOriginId = findLoopOriginId(current.id, fp, tree.nodes, machine, settings);
      return { newEntries: [], shouldStop: false };
    }
    nextAncestors = extendFingerprints(ancestorFingerprints, fp);
  } else {
    nextAncestors = ancestorFingerprints;
  }

  // ── Find transitions ──
  const readSym = readCell(current.tape, current.headPosition, machine.blankSymbol);
  // 'Σ' in readSymbol is a wildcard — matches any tape symbol
  const applicable = machine.transitions.filter(
    (t) => t.fromState === current.state && (t.readSymbol === 'Σ' || t.readSymbol === readSym),
  );

  if (applicable.length === 0) {
    current.status = 'reject';
    current.rejectReason = 'no-transition';
    return { newEntries: [], shouldStop: false };
  }

  // ── Branch ──
  const newEntries: BFSQueueEntry[] = [];
  for (const t of applicable) {
    if (tree.nodes.size >= settings.maxNodes) {
      tree.stats.terminationReason = 'max-nodes';
      current.rejectReason = 'node-limit';
      return { newEntries, shouldStop: true };
    }

    // 'Σ' in writeSymbol means "write back whatever was read" (no-change / identity)
    const writeVal = t.writeSymbol === 'Σ' ? readSym : t.writeSymbol;
    const newTape: TapeMap = writeCell(
      current.tape,
      current.headPosition,
      writeVal,
      machine.blankSymbol,
    );
    const delta = t.move === 'R' ? 1 : t.move === 'L' ? -1 : 0;
    const newHead = current.headPosition + delta;

    const child: NTMConfig = {
      id: uuidv4(),
      parentId: current.id,
      state: t.toState,
      tape: newTape,
      headPosition: newHead,
      depth: current.depth + 1,
      transitionUsed: t.id,
      status: 'running',
      children: [],
      loopOriginId: null,
      rejectReason: null,
    };

    current.children.push(child.id);
    tree.nodes.set(child.id, child);
    tree.stats.totalNodes = tree.nodes.size;
    newEntries.push({ configId: child.id, ancestorFingerprints: nextAncestors });
  }

  return { newEntries, shouldStop: false };
}

// ─── finalizeBFS ─────────────────────────────────────────────────────────────

/**
 * Called when the queue is empty. Marks remaining 'running' leaf nodes as
 * reject and resolves the final termination reason.
 * Internal nodes (with children) keep 'running' status — they are branch
 * points, not dead ends.
 */
export function finalizeBFS(tree: ComputationTree): void {
  for (const node of tree.nodes.values()) {
    // Only mark true leaf nodes as reject — internal nodes (with children) stay
    // 'running' to show they were explored and branched, not dead ends.
    if (node.status === 'running' && node.children.length === 0) {
      node.status = 'reject';
      node.rejectReason = 'no-transition';
    }
  }
  if (tree.stats.terminationReason === 'running') {
    tree.stats.terminationReason = tree.acceptPaths.length > 0 ? 'accept' : 'exhausted';
  }
}

// ─── runNTM (convenience: run to completion) ─────────────────────────────────

export function runNTM(
  machine: NTMDefinition,
  input: string,
  settings: ExecutionSettings,
): ComputationTree {
  const { tree, queue } = initBFS(machine, input);

  while (queue.length > 0) {
    const entry = queue.shift()!;
    const { newEntries, shouldStop } = processBFSEntry(entry, tree, machine, settings);
    queue.push(...newEntries);
    if (shouldStop) break;
  }

  finalizeBFS(tree);
  return tree;
}
