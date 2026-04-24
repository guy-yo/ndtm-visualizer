import { useMemo } from 'react';
import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { NTMDefinition } from '../../types/machine';
import type { StateNodeData } from './StateNode';

const NODE_SIZE   = 90;  // dagre estimation (px)
const NODE_RADIUS = 40;  // actual half-size used for center calculation

/**
 * Run dagre layout then enrich every non-self-loop edge with:
 *
 *   data.curvature — controls the quadratic bezier shape in FloatingEdge:
 *     0          → straight line  (single forward edge, no reverse partner)
 *     ±32        → gentle arc     (bidirectional pair — bow apart)
 *     −130…−250  → tall arc above (back edge, clears all nodes)
 *
 *   data.labelT — where along the bezier to place the label (0–1), default 0.40.
 */
function layoutStateNodes<N extends Node, E extends Edge>(
  nodes: N[],
  edges: E[],
): { nodes: N[]; edges: E[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 160, nodesep: 100, marginx: 60, marginy: 60 });

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_SIZE, height: NODE_SIZE });
  }
  for (const e of edges) {
    if (e.source !== e.target) g.setEdge(e.source, e.target);
  }
  dagre.layout(g);

  // Positioned nodes: dagre returns center; subtract half-size for RF top-left
  const positioned = nodes.map((n) => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - NODE_SIZE / 2, y: pos.y - NODE_SIZE / 2 } };
  });

  // Center-position lookup (using actual 80 px node size, not dagre's 90 px)
  const centers = new Map(
    positioned.map((n) => [
      n.id,
      { cx: n.position.x + NODE_RADIUS, cy: n.position.y + NODE_RADIUS },
    ]),
  );

  // Set of directed edge pairs for bidirectional detection
  const pairSet = new Set(
    edges.filter((e) => e.source !== e.target).map((e) => `${e.source}|||${e.target}`),
  );

  const enriched = edges.map((e): E => {
    if (e.source === e.target) return e; // self-loops handled by SelfLoopEdge

    const src = centers.get(e.source);
    const tgt = centers.get(e.target);
    if (!src || !tgt) return e;

    const dx       = tgt.cx - src.cx; // positive → forward in LR layout
    const hasMirror = pairSet.has(`${e.target}|||${e.source}`);

    let curvature = 0;
    if (hasMirror) {
      // Bidirectional pair: bow each edge ±32 px from the straight line
      curvature = dx > 0 ? 32 : -32;
    } else if (dx < -20) {
      // Back edge: arc well above intermediate nodes
      curvature = -(Math.max(130, Math.abs(dx) * 0.5));
    }

    return {
      ...e,
      data: {
        ...(e.data && typeof e.data === 'object' ? e.data : {}),
        curvature,
        labelT: 0.40,
      },
    } as E;
  });

  return { nodes: positioned, edges: enriched };
}

export function useStateDiagramNodes(machine: NTMDefinition): {
  nodes: Node<StateNodeData>[];
  edges: Edge[];
} {
  return useMemo(() => {
    const acceptSet = new Set(machine.acceptStates);
    const rejectSet = new Set(machine.rejectStates);

    // ── Nodes: one per state ──────────────────────────────────────────────
    const rawNodes: Node<StateNodeData>[] = machine.states.map((s) => ({
      id: s,
      type: 'stateNode',
      position: { x: 0, y: 0 },
      draggable: false,
      data: {
        stateName: s,
        isStart: s === machine.startState,
        isAccept: acceptSet.has(s),
        isReject: rejectSet.has(s),
      },
    }));

    // ── Edges: ONE edge per (fromState, toState) pair ─────────────────────
    // All transitions on the same pair are merged into one edge whose label
    // lists every operation, one per line.
    //
    // Self-loop index tracking: multiple self-loops on the same node get
    // stacked at different heights so they don't overlap.
    const edgeMap = new Map<string, {
      labels: string[];
      strokeColor: string;
      arrowColor: string;
      isSelfLoop: boolean;
    }>();

    // First pass: count self-loops per node for height stacking
    const selfLoopTotalMap = new Map<string, number>();
    for (const t of machine.transitions) {
      if (t.fromState === t.toState) {
        // All self-loops on same node go into ONE merged edge
        // (so there's only ever 1 self-loop per node in the edge map)
      }
    }

    for (const t of machine.transitions) {
      const key        = `${t.fromState}|||${t.toState}`;
      const isSelfLoop = t.fromState === t.toState;
      const readDisp   = t.readSymbol  === machine.blankSymbol ? '⊔' : t.readSymbol;
      const writeDisp  = t.writeSymbol === machine.blankSymbol ? '⊔' : t.writeSymbol;
      const label      = `${readDisp}→${writeDisp},${t.move}`;

      const strokeColor = acceptSet.has(t.toState)
        ? 'var(--color-accept)'
        : rejectSet.has(t.toState)
          ? 'var(--color-reject)'
          : '#475569';
      const arrowColor  = acceptSet.has(t.toState)
        ? '#22c55e'
        : rejectSet.has(t.toState)
          ? '#ef4444'
          : '#475569';

      if (edgeMap.has(key)) {
        edgeMap.get(key)!.labels.push(label);
      } else {
        edgeMap.set(key, { labels: [label], strokeColor, arrowColor, isSelfLoop });
      }
    }

    // Count how many distinct self-loop edges exist per node
    for (const [key, entry] of edgeMap) {
      if (entry.isSelfLoop) {
        const node = key.split('|||')[0];
        selfLoopTotalMap.set(node, (selfLoopTotalMap.get(node) ?? 0) + 1);
      }
    }
    // Since we merge all self-loops on a node into ONE edge, the total is always 1
    // (the map above will always give 1). We keep the structure for future use.

    const rawEdges: Edge[] = [];
    for (const [key, { labels, strokeColor, arrowColor, isSelfLoop }] of edgeMap) {
      const [from, to] = key.split('|||');
      const combinedLabel = labels.join('\n');

      if (isSelfLoop) {
        rawEdges.push({
          id: `edge-${key}`,
          source: from,
          target: to,
          type: 'selfLoop',
          sourceHandle: 'self-out',
          targetHandle: 'self-in',
          label: combinedLabel,
          style: { stroke: strokeColor, strokeWidth: 1.5 },
          markerEnd: { type: 'arrowclosed' as const, color: arrowColor },
          data: { selfLoopIndex: 0, selfLoopTotal: 1 },
        });
      } else {
        rawEdges.push({
          id: `edge-${key}`,
          source: from,
          target: to,
          type: 'floating',
          label: combinedLabel,
          style: { stroke: strokeColor, strokeWidth: 1.5 },
          markerEnd: { type: 'arrowclosed' as const, color: arrowColor },
          // curvature and labelT are added by layoutStateNodes after dagre runs
        });
      }
    }

    return layoutStateNodes(rawNodes, rawEdges);
  }, [machine]);
}
