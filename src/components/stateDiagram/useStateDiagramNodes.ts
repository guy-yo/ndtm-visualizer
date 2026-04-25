import { useMemo } from 'react';
import dagre from 'dagre';
import { useNodePositions } from '../../store/useNodePositions';
import type { Node, Edge } from '@xyflow/react';
import type { NTMDefinition } from '../../types/machine';
import type { StateNodeData } from './StateNode';

const NODE_SIZE   = 90;   // dagre estimation (px)
const NODE_RADIUS = 40;   // half of actual 80 px node for centre calculation

// ─────────────────────────────────────────────────────────────────────────────
// 1. DAGRE NODE POSITIONS
//    Only re-runs when the SET OF STATES changes.
//    Adding / removing / changing transitions must NOT reposition existing nodes.
// ─────────────────────────────────────────────────────────────────────────────
export function computeNodePositions(machine: NTMDefinition): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 160, nodesep: 100, marginx: 60, marginy: 60 });

  for (const s of machine.states) {
    g.setNode(s, { width: NODE_SIZE, height: NODE_SIZE });
  }

  // Pass transition edges so dagre places connected states near each other
  const seenPairs = new Set<string>();
  for (const t of machine.transitions) {
    if (t.fromState !== t.toState) {
      const key = `${t.fromState}|||${t.toState}`;
      if (
        !seenPairs.has(key) &&
        machine.states.includes(t.fromState) &&
        machine.states.includes(t.toState)
      ) {
        seenPairs.add(key);
        g.setEdge(t.fromState, t.toState);
      }
    }
  }

  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number }>();
  for (const s of machine.states) {
    const pos = g.node(s);
    if (pos) positions.set(s, { x: pos.x - NODE_SIZE / 2, y: pos.y - NODE_SIZE / 2 });
  }
  return positions;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EDGE COMPUTATION
//    Topology-based curvature — no dependency on dagre positions.
//
//   Curvature semantics (consumed by FloatingEdge via data.curvature):
//     FloatingEdge offsets the bezier control-point by `curvature` px along the
//     CW-perpendicular of the directed edge vector.  Because the CW-perp of a
//     rightward vector points "up" and the CW-perp of a leftward vector points
//     "down", giving BOTH directions in a bidirectional pair the SAME positive
//     curvature makes them arc on OPPOSITE sides of the straight line — exactly
//     what the user expects.
//
//   curvature = 0     → straight (single forward edge)
//   curvature = +60   → both edges of a bidirectional pair (arc apart naturally)
//   curvature = −220  → back edge (arcs well above intermediate nodes)
// ─────────────────────────────────────────────────────────────────────────────
export function computeEdges(machine: NTMDefinition): Edge[] {
  const acceptSet = new Set(machine.acceptStates);
  const rejectSet = new Set(machine.rejectStates);

  // One edge per (fromState, toState) pair — merge labels
  const edgeMap = new Map<string, {
    labels: string[];
    strokeColor: string;
    arrowColor: string;
    isSelfLoop: boolean;
  }>();

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
    const arrowColor = acceptSet.has(t.toState)
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

  // Set of all directed non-self-loop pairs for bidirectional detection
  const pairSet = new Set<string>();
  for (const [key, { isSelfLoop }] of edgeMap) {
    if (!isSelfLoop) pairSet.add(key);
  }

  const edges: Edge[] = [];

  for (const [key, { labels, strokeColor, arrowColor, isSelfLoop }] of edgeMap) {
    const [from, to] = key.split('|||');
    const combinedLabel = labels.join('\n');

    if (isSelfLoop) {
      edges.push({
        id:           `edge-${key}`,
        source:       from,
        target:       to,
        type:         'selfLoop',
        sourceHandle: 'self-out',
        targetHandle: 'self-in',
        label:        combinedLabel,
        style:        { stroke: strokeColor, strokeWidth: 1.5 },
        markerEnd:    { type: 'arrowclosed' as const, color: arrowColor },
        data:         { selfLoopIndex: 0, selfLoopTotal: 1 },
      });
    } else {
      // hasMirror tells FloatingEdge to arc so the two directions separate.
      // All other curvature (back-edge avoidance, node-bypass) is computed
      // live inside FloatingEdge from actual node positions.
      const hasMirror = pairSet.has(`${to}|||${from}`);

      edges.push({
        id:        `edge-${key}`,
        source:    from,
        target:    to,
        type:      'floating',
        label:     combinedLabel,
        style:     { stroke: strokeColor, strokeWidth: 1.5 },
        markerEnd: { type: 'arrowclosed' as const, color: arrowColor },
        data:      { hasMirror, labelT: 0.40 },
      });
    }
  }

  return edges;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. HOOK
// ─────────────────────────────────────────────────────────────────────────────
export function useStateDiagramNodes(machine: NTMDefinition): {
  nodes: Node<StateNodeData>[];
  edges: Edge[];
} {
  const positions = useNodePositions((s) => s.positions);

  // Dagre positions — only reruns when the set of states changes
  // (transition edits, accept/reject toggles do NOT reposition nodes)
  const dagrePositions = useMemo(
    () => computeNodePositions(machine),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [machine.states.join(',')],
  );

  // Node objects — reruns on any machine change so data (isAccept/isReject/isStart)
  // stays up to date, but the POSITION comes from drag-overrides or dagre fallback.
  const nodes = useMemo((): Node<StateNodeData>[] => {
    const acceptSet = new Set(machine.acceptStates);
    const rejectSet = new Set(machine.rejectStates);
    return machine.states.map((s) => {
      const dagrePos = dagrePositions.get(s) ?? { x: 0, y: 0 };
      const override = positions[s];
      return {
        id:       s,
        type:     'stateNode',
        position: override ?? dagrePos,
        draggable: true,
        data: {
          stateName: s,
          isStart:   s === machine.startState,
          isAccept:  acceptSet.has(s),
          isReject:  rejectSet.has(s),
        },
      };
    });
  }, [machine, dagrePositions, positions]);

  // Edges — reruns on any machine change
  const edges = useMemo(
    () => computeEdges(machine),
    [machine],
  );

  return { nodes, edges };
}
