import React from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  ConnectionMode,
  type Connection,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '../../store/useAppStore';
import { useNodePositions } from '../../store/useNodePositions';
import { stateNodeTypes } from './StateNode';
import { SelfLoopEdge } from './SelfLoopEdge';
import { FloatingEdge } from './FloatingEdge';
import { useStateDiagramNodes } from './useStateDiagramNodes';
import { AddTransitionModal } from './AddTransitionModal';
import { ExportButton } from '../flowCanvas/ExportButton';
import type { MoveDirection, Transition } from '../../types/machine';

// Must be module-level constant to prevent ReactFlow from remounting edges
const edgeTypes = { selfLoop: SelfLoopEdge, floating: FloatingEdge };

export function StateDiagram() {
  const machine            = useAppStore((s) => s.machine);
  const addTransitionDirect = useAppStore((s) => s.addTransitionDirect);
  const { nodes, edges }   = useStateDiagramNodes(machine);
  const setPosition        = useNodePositions((s) => s.setPosition);
  const clearPositions     = useNodePositions((s) => s.clearPositions);
  const wrapperRef         = React.useRef<HTMLDivElement>(null);

  // Pending connection from drag gesture → opens the add-transition modal
  const [pendingConn, setPendingConn] = React.useState<{
    from: string;
    to: string;
  } | null>(null);

  // Clear drag-position overrides whenever the states list changes
  // (new state added, state removed, or state renamed)
  const stateKey = machine.states.slice().sort().join(',');
  React.useEffect(() => {
    clearPositions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateKey]);

  function handleNodeDragStop(_: React.MouseEvent, node: Node) {
    setPosition(node.id, node.position);
  }

  function handleConnect(connection: Connection) {
    const { source, target } = connection;
    if (source && target) {
      setPendingConn({ from: source, to: target });
    }
  }

  function handleAdd(read: string, write: string, move: MoveDirection) {
    if (!pendingConn) return;
    const fields: Omit<Transition, 'id'> = {
      fromState: pendingConn.from,
      toState:   pendingConn.to,
      readSymbol:  read,
      writeSymbol: write,
      move,
    };
    addTransitionDirect(fields);
    setPendingConn(null);
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }} ref={wrapperRef}>
      <ExportButton
        canvasRef={wrapperRef}
        alwaysVisible
        filename="state-diagram.png"
      />

      {pendingConn && (
        <AddTransitionModal
          fromState={pendingConn.from}
          toState={pendingConn.to}
          machine={machine}
          onAdd={handleAdd}
          onClose={() => setPendingConn(null)}
        />
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={stateNodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        connectionMode={ConnectionMode.Loose}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
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
