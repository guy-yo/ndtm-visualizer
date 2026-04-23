import { useMemo } from 'react';
import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { NTMDefinition } from '../../types/machine';
import type { StateNodeData } from './StateNode';

const NODE_SIZE = 90; // diameter — used for dagre estimation

function layoutStateNodes<N extends Node, E extends Edge>(
  nodes: N[],
  edges: E[],
): { nodes: N[]; edges: E[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 100, nodesep: 60, marginx: 40, marginy: 40 });

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_SIZE, height: NODE_SIZE });
  }
  // Only add non-self-loop edges to dagre (self-loops don't affect layout)
  for (const e of edges) {
    if (e.source !== e.target) g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  const positioned = nodes.map((n) => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - NODE_SIZE / 2, y: pos.y - NODE_SIZE / 2 } };
  });

  return { nodes: positioned, edges };
}

export function useStateDiagramNodes(machine: NTMDefinition): {
  nodes: Node<StateNodeData>[];
  edges: Edge[];
} {
  return useMemo(() => {
    const acceptSet = new Set(machine.acceptStates);
    const rejectSet = new Set(machine.rejectStates);

    // ── Nodes: one per state ──────────────────────────────────────────
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

    // ── Edges: group transitions by (fromState, toState) ─────────────
    // Multiple transitions between same pair → merged into one edge label
    const edgeMap = new Map<string, string[]>();
    for (const t of machine.transitions) {
      const key = `${t.fromState}|||${t.toState}`;
      const readDisp = t.readSymbol === machine.blankSymbol ? '⊔' : t.readSymbol;
      const writeDisp = t.writeSymbol === machine.blankSymbol ? '⊔' : t.writeSymbol;
      const label = `${readDisp}→${writeDisp},${t.move}`;
      if (!edgeMap.has(key)) edgeMap.set(key, []);
      edgeMap.get(key)!.push(label);
    }

    const rawEdges: Edge[] = [];
    for (const [key, labels] of edgeMap) {
      const [from, to] = key.split('|||');
      const isSelfLoop = from === to;
      rawEdges.push({
        id: `edge-${key}`,
        source: from,
        target: to,
        type: isSelfLoop ? 'default' : 'smoothstep',
        ...(isSelfLoop
          ? { sourceHandle: 'bottom', targetHandle: 'top' }
          : {}),
        label: labels.join('\n'),
        labelShowBg: true,
        labelBgStyle: { fill: '#1e293b', fillOpacity: 0.9 },
        labelStyle: { fill: '#94a3b8', fontSize: 9 },
        style: {
          stroke: acceptSet.has(to) ? 'var(--color-accept)' : '#475569',
          strokeWidth: 1.5,
        },
        markerEnd: { type: 'arrowclosed' as const, color: acceptSet.has(to) ? '#22c55e' : '#475569' },
      });
    }

    return layoutStateNodes(rawNodes, rawEdges);
  }, [machine]);
}
