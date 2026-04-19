import { useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { ComputationTree, NTMConfig } from '../../types/engine';
import type { ConfigNodeData, TransitionEdgeData } from '../../types/flow';
import type { Transition } from '../../types/machine';
import { getLayoutedElements } from '../../engine/layoutEngine';

function buildAcceptPathSet(tree: ComputationTree): Set<string> {
  const set = new Set<string>();
  for (const path of tree.acceptPaths) {
    for (const id of path) set.add(id);
  }
  return set;
}

function collectVisible(
  tree: ComputationTree,
  collapsedIds: Set<string>
): Set<string> {
  const visible = new Set<string>();
  const stack: string[] = [tree.rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (visible.has(id)) continue;
    visible.add(id);
    const node = tree.nodes.get(id);
    // Never traverse into accept/reject/loop nodes — they are always leaves
    if (!node || collapsedIds.has(id) || node.status === 'accept' || node.status === 'reject' || node.status === 'loop') continue;
    for (const childId of node.children) {
      stack.push(childId);
    }
  }
  return visible;
}

function formatTransitionLabel(t: Transition): string {
  return `${t.readSymbol}→${t.writeSymbol},${t.move}`;
}

export function useFlowNodes(
  tree: ComputationTree | null,
  collapsedIds: Set<string>,
  highlightAcceptPath: boolean,
  allTransitions: Transition[]
): { nodes: Node<ConfigNodeData>[]; edges: Edge<TransitionEdgeData>[] } {
  return useMemo(() => {
    if (!tree) return { nodes: [], edges: [] };

    const acceptSet = highlightAcceptPath ? buildAcceptPathSet(tree) : new Set<string>();
    const visibleIds = collectVisible(tree, collapsedIds);
    const transitionMap = new Map<string, Transition>(allTransitions.map((t) => [t.id, t]));

    const rawNodes: Node<ConfigNodeData>[] = [];
    const rawEdges: Edge<TransitionEdgeData>[] = [];

    for (const id of visibleIds) {
      const config = tree.nodes.get(id);
      if (!config) continue;

      const hasChildren = config.children.length > 0;
      const isCollapsed = collapsedIds.has(id);

      rawNodes.push({
        id: config.id,
        type: 'configNode',
        position: { x: 0, y: 0 }, // overwritten by layout
        data: {
          configId: config.id,
          state: config.state,
          tape: config.tape,
          headPosition: config.headPosition,
          status: config.status,
          transitionUsed: config.transitionUsed,
          isOnAcceptPath: acceptSet.has(id),
          isCollapsed,
          depth: config.depth,
          hasChildren,
        },
        draggable: false,
      });

      if (config.parentId && visibleIds.has(config.parentId)) {
        const t = config.transitionUsed ? transitionMap.get(config.transitionUsed) : null;
        const label = t ? formatTransitionLabel(t) : '';
        const isOnPath = acceptSet.has(id) && acceptSet.has(config.parentId);

        rawEdges.push({
          id: `${config.parentId}->${config.id}`,
          source: config.parentId,
          target: config.id,
          type: 'smoothstep',
          label,
          labelShowBg: true,
          labelBgStyle: { fill: '#1e293b', fillOpacity: 0.9 },
          labelStyle: { fill: '#94a3b8', fontSize: 10 },
          style: {
            stroke: isOnPath ? 'var(--color-accept)' : '#475569',
            strokeWidth: isOnPath ? 2.5 : 1.5,
          },
          data: {
            transitionId: t?.id ?? null,
            fromState: t?.fromState ?? '',
            readSymbol: t?.readSymbol ?? '',
            writeSymbol: t?.writeSymbol ?? '',
            move: t?.move ?? '',
            label,
          },
        });
      }
    }

    const { nodes, edges } = getLayoutedElements(rawNodes, rawEdges, 'TB');
    return { nodes, edges };
  }, [tree, collapsedIds, highlightAcceptPath, allTransitions]);
}
