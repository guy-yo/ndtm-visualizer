import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '../../store/useAppStore';
import { nodeTypes } from '../customNodes/ConfigNode';
import { useFlowNodes } from './useFlowNodes';
import type { NodeStatus } from '../../types/engine';
import styles from './FlowCanvas.module.css';

const STATUS_COLORS: Record<NodeStatus, string> = {
  running: '#3b82f6',
  accept: '#22c55e',
  reject: '#ef4444',
  loop: '#6b7280',
};

export function FlowCanvas() {
  const tree = useAppStore((s) => s.tree);
  const collapsedNodeIds = useAppStore((s) => s.collapsedNodeIds);
  const highlightAcceptPath = useAppStore((s) => s.highlightAcceptPath);
  const allTransitions = useAppStore((s) => s.machine.transitions);
  const phase = useAppStore((s) => s.executionPhase);

  const { nodes, edges } = useFlowNodes(
    tree,
    collapsedNodeIds,
    highlightAcceptPath,
    allTransitions
  );

  if (phase === 'idle') {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>⟳</div>
        <div className={styles.emptyText}>Define your machine and press <strong>Run</strong></div>
      </div>
    );
  }

  if (phase === 'running') {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon} style={{ animation: 'spin 1s linear infinite' }}>⏳</div>
        <div className={styles.emptyText}>Computing computation tree…</div>
      </div>
    );
  }

  return (
    <div className={styles.canvas}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        onlyRenderVisibleElements={nodes.length > 200}
        minZoom={0.05}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#334155"
        />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const status = (node.data as { status: NodeStatus })?.status;
            return STATUS_COLORS[status] ?? '#94a3b8';
          }}
          nodeStrokeWidth={0}
          style={{ background: '#0f172a', border: '1px solid #475569' }}
          maskColor="rgba(0, 0, 0, 0.25)"
        />
      </ReactFlow>
    </div>
  );
}
