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

function formatTransitionLabel(t: Transition, blank: string): string {
  const disp = (s: string) => s === blank ? '⊔' : s;
  return `${disp(t.readSymbol)}→${disp(t.writeSymbol)},${t.move}`;
}

export function useFlowNodes(
  tree: ComputationTree | null,
  collapsedIds: Set<string>,
  highlightAcceptPath: boolean,
  allTransitions: Transition[],
  blankSymbol: string,
  stateFilter: string = '',
  playbackPath: string[] | null = null,
  playbackIndex: number = 0,
): { nodes: Node<ConfigNodeData>[]; edges: Edge<TransitionEdgeData>[] } {
  return useMemo(() => {
    if (!tree) return { nodes: [], edges: [] };

    const acceptSet = highlightAcceptPath ? buildAcceptPathSet(tree) : new Set<string>();
    const visibleIds = collectVisible(tree, collapsedIds);
    const transitionMap = new Map<string, Transition>(allTransitions.map((t) => [t.id, t]));

    // Collect loop-start node IDs
    const loopStartIds = new Set<string>();
    for (const id of visibleIds) {
      const config = tree.nodes.get(id);
      if (config?.status === 'loop' && config.loopOriginId && visibleIds.has(config.loopOriginId)) {
        loopStartIds.add(config.loopOriginId);
      }
    }

    // State filter: set of IDs that MATCH the filter (full match, case-insensitive)
    const filterLower = stateFilter.trim().toLowerCase();

    // Playback: set of highlighted IDs
    const playbackSet = playbackPath
      ? new Set(playbackPath.slice(0, playbackIndex + 1))
      : null;

    const rawNodes: Node<ConfigNodeData>[] = [];
    const rawEdges: Edge<TransitionEdgeData>[] = [];

    for (const id of visibleIds) {
      const config = tree.nodes.get(id);
      if (!config) continue;

      const hasChildren = config.children.length > 0;
      const isCollapsed = collapsedIds.has(id);

      // Filter dimming: dim nodes whose state doesn't match the filter
      const matchesFilter = !filterLower || config.state.toLowerCase().includes(filterLower);
      // Playback highlight
      const isPlaybackHighlight = playbackSet ? playbackSet.has(id) : false;

      rawNodes.push({
        id: config.id,
        type: 'configNode',
        position: { x: 0, y: 0 },
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
          isLoopStart: loopStartIds.has(id),
          loopOriginId: config.loopOriginId,
          rejectReason: config.rejectReason,
          isPlaybackHighlight,
        },
        draggable: false,
        style: (!filterLower || matchesFilter)
          ? {}
          : { opacity: 0.12 },
      });

      // Tree edge (parent → child)
      if (config.parentId && visibleIds.has(config.parentId)) {
        const t = config.transitionUsed ? transitionMap.get(config.transitionUsed) : null;
        const label = t ? formatTransitionLabel(t, blankSymbol) : '';
        const isOnPath = acceptSet.has(id) && acceptSet.has(config.parentId);
        const edgeDimmed = filterLower && !matchesFilter;

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
            opacity: edgeDimmed ? 0.12 : 1,
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

    // Run dagre layout
    const { nodes, edges } = getLayoutedElements(rawNodes, rawEdges, 'TB');

    // Add loop back-edges after layout
    const backEdges: Edge<TransitionEdgeData>[] = [];
    for (const id of visibleIds) {
      const config = tree.nodes.get(id);
      if (!config || config.status !== 'loop' || !config.loopOriginId) continue;
      if (!visibleIds.has(config.loopOriginId)) continue;

      backEdges.push({
        id: `loop-back-${id}`,
        source: id,
        target: config.loopOriginId,
        type: 'default',
        animated: true,
        style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '6,3' },
        label: '↩ loops back',
        labelShowBg: true,
        labelBgStyle: { fill: '#1e293b', fillOpacity: 0.95 },
        labelStyle: { fill: '#f59e0b', fontSize: 9, fontWeight: 700 },
        data: { transitionId: null, fromState: '', readSymbol: '', writeSymbol: '', move: '', label: '↩ loops back' },
      });
    }

    return { nodes, edges: [...edges, ...backEdges] };
  }, [tree, collapsedIds, highlightAcceptPath, allTransitions, blankSymbol, stateFilter, playbackPath, playbackIndex]);
}
