import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';

const NODE_WIDTH = 240;
const NODE_HEIGHT = 110;

export function getLayoutedElements<N extends Node, E extends Edge>(
  nodes: N[],
  edges: E[],
  direction: 'TB' | 'LR' = 'TB'
): { nodes: N[]; edges: E[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 80,
    nodesep: 40,
    marginx: 20,
    marginy: 20,
  });

  for (const node of nodes) {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    dagreGraph.setEdge(edge.source, edge.target);
  }

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const pos = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
