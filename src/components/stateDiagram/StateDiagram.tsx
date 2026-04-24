import React from 'react';
import { ReactFlow, Background, Controls, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '../../store/useAppStore';
import { stateNodeTypes } from './StateNode';
import { SelfLoopEdge } from './SelfLoopEdge';
import { FloatingEdge } from './FloatingEdge';
import { useStateDiagramNodes } from './useStateDiagramNodes';
import { ExportButton } from '../flowCanvas/ExportButton';

// Must be module-level constant to prevent ReactFlow from remounting edges
const edgeTypes = { selfLoop: SelfLoopEdge, floating: FloatingEdge };

export function StateDiagram() {
  const machine = useAppStore((s) => s.machine);
  const { nodes, edges } = useStateDiagramNodes(machine);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }} ref={wrapperRef}>
      <ExportButton
        canvasRef={wrapperRef}
        alwaysVisible
        filename="state-diagram.png"
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={stateNodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        minZoom={0.2}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
        <Controls />
      </ReactFlow>
    </div>
  );
}
