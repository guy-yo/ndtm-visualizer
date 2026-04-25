import React from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  ConnectionMode,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '../../store/useAppStore';
import { useNodePositions } from '../../store/useNodePositions';
import { stateNodeTypes } from './StateNode';
import type { StateNodeData } from './StateNode';
import { SelfLoopEdge } from './SelfLoopEdge';
import { FloatingEdge } from './FloatingEdge';
import { useStateDiagramNodes } from './useStateDiagramNodes';
import { AddTransitionModal } from './AddTransitionModal';
import type { EditableTransition } from './AddTransitionModal';
import { DiagramContextMenu, type MenuContext } from './DiagramContextMenu';
import { ExportButton } from '../flowCanvas/ExportButton';
import type { MoveDirection, Transition } from '../../types/machine';

// Must be module-level constant to prevent ReactFlow from remounting edges
const edgeTypes = { selfLoop: SelfLoopEdge, floating: FloatingEdge };

// ── Inner helper: lives inside the ReactFlow provider, exposes screenToFlowPosition ──
type XYPos = { x: number; y: number };
type ConverterRef = React.MutableRefObject<((p: XYPos) => XYPos) | null>;

function FlowPositionHelper({ converterRef }: { converterRef: ConverterRef }) {
  const { screenToFlowPosition } = useReactFlow();
  // Assign every render so the ref always holds the latest function
  converterRef.current = screenToFlowPosition;
  return null;
}

// ── Pending connection state (from drag gesture or standalone "Add" button) ───
interface PendingConn {
  /** null = free-pick mode (standalone Add Transition button) */
  from: string | null;
  to:   string | null;
}

export function StateDiagram() {
  const machine              = useAppStore((s) => s.machine);
  const addTransitionDirect  = useAppStore((s) => s.addTransitionDirect);
  const updateTransition     = useAppStore((s) => s.updateTransition);
  const removeTransition     = useAppStore((s) => s.removeTransition);
  const addState             = useAppStore((s) => s.addState);
  const removeState          = useAppStore((s) => s.removeState);
  const setStartState        = useAppStore((s) => s.setStartState);
  const toggleAcceptState    = useAppStore((s) => s.toggleAcceptState);
  const toggleRejectState    = useAppStore((s) => s.toggleRejectState);

  const { nodes: computedNodes, edges } = useStateDiagramNodes(machine);
  const setPosition     = useNodePositions((s) => s.setPosition);
  const clearPositions  = useNodePositions((s) => s.clearPositions);
  const wrapperRef      = React.useRef<HTMLDivElement>(null);

  // Ref to screenToFlowPosition — populated by FlowPositionHelper (inside ReactFlow provider)
  const converterRef = React.useRef<((p: XYPos) => XYPos) | null>(null);

  // Local node state — gives ReactFlow full control during drag for smooth movement
  const [rfNodes, setRfNodes] = React.useState<Node[]>(computedNodes);

  // Sync computed (dagre + persisted overrides) → local state whenever machine layout changes
  React.useEffect(() => {
    setRfNodes(computedNodes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedNodes]);

  // Pending connection from drag gesture → opens the add-transition modal
  const [pendingConn, setPendingConn] = React.useState<PendingConn | null>(null);

  // Transition being edited (opened via edge left-click or context menu Edit)
  const [editTrans, setEditTrans] = React.useState<{
    from: string;
    to:   string;
    t:    EditableTransition;
  } | null>(null);

  // Right-click context menu
  const [ctxMenu, setCtxMenu] = React.useState<MenuContext | null>(null);

  // Track which states existed before each render so we can detect removal vs addition
  const prevStatesRef = React.useRef<Set<string>>(new Set(machine.states));
  React.useEffect(() => {
    const prev = prevStatesRef.current;
    const curr = new Set(machine.states);
    prevStatesRef.current = curr;

    // Only clear all positions when states are removed or renamed (not just added)
    const hadRemoval = [...prev].some((s) => !curr.has(s));
    if (hadRemoval) clearPositions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine.states]);

  // Real-time smooth drag: apply every position/selection/dimension change immediately
  const handleNodesChange = React.useCallback((changes: NodeChange[]) => {
    setRfNodes((prev) => applyNodeChanges(changes, prev));
  }, []);

  // Persist final position to the store only once the drag ends
  function handleNodeDragStop(_: React.MouseEvent, node: Node) {
    setPosition(node.id, node.position);
  }

  // Block connections that originate from accept / reject states
  function handleConnect(connection: Connection) {
    const { source, target } = connection;
    const acceptSet = new Set(machine.acceptStates);
    const rejectSet = new Set(machine.rejectStates);
    if (source && (acceptSet.has(source) || rejectSet.has(source))) return;
    if (source && target) {
      setPendingConn({ from: source, to: target });
    }
  }

  // Called by modal when user confirms an Add
  function handleAdd(from: string, to: string, read: string, write: string, move: MoveDirection) {
    addTransitionDirect({ fromState: from, toState: to, readSymbol: read, writeSymbol: write, move });
    setPendingConn(null);
  }

  // Called by modal when user saves an edit
  function handleEditSave(id: string, read: string, write: string, move: MoveDirection) {
    updateTransition(id, { readSymbol: read, writeSymbol: write, move });
    setEditTrans(null);
  }

  // Left-click an edge → open edit modal for that transition's arc
  function handleEdgeClick(_: React.MouseEvent, edge: Edge) {
    // Self-loops are handled differently — open via context menu
    if (edge.type === 'selfLoop') return;
    const key = edge.id.startsWith('edge-') ? edge.id.slice(5) : edge.id;
    const [from, to] = key.split('|||');
    const transitions = machine.transitions.filter(
      (t) => t.fromState === from && t.toState === to,
    );
    if (transitions.length === 0) return;
    if (transitions.length === 1) {
      const t = transitions[0];
      setEditTrans({ from, to, t: { id: t.id, readSymbol: t.readSymbol, writeSymbol: t.writeSymbol, move: t.move } });
    } else {
      // Multiple transitions on this arc: show context menu so user can pick
      setCtxMenu({ kind: 'edge', x: 0, y: 0, transitions, blankSymbol: machine.blankSymbol });
    }
  }

  // ── Context menu handlers ────────────────────────────────────────────────────
  function handlePaneContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setCtxMenu({ kind: 'canvas', x: e.clientX, y: e.clientY });
  }

  function handleNodeContextMenu(e: React.MouseEvent, node: Node) {
    e.preventDefault();
    const d = node.data as StateNodeData;
    setCtxMenu({
      kind: 'node',
      x: e.clientX,
      y: e.clientY,
      stateName: d.stateName,
      isStart:   d.isStart,
      isAccept:  d.isAccept,
      isReject:  d.isReject,
    });
  }

  function handleEdgeContextMenu(e: React.MouseEvent, edge: Edge) {
    e.preventDefault();
    const key = edge.id.startsWith('edge-') ? edge.id.slice(5) : edge.id;
    const [from, to] = key.split('|||');
    const transitions = machine.transitions.filter(
      (t) => t.fromState === from && t.toState === to,
    );
    setCtxMenu({ kind: 'edge', x: e.clientX, y: e.clientY, transitions, blankSymbol: machine.blankSymbol });
  }

  // Add a new state and place it at the exact canvas position where the user right-clicked
  function handleAddStateAtClick(name: string) {
    addState(name);
    if (ctxMenu?.kind === 'canvas') {
      const convert = converterRef.current;
      if (convert) {
        // Convert screen coordinates → ReactFlow flow coordinates
        // Offset by half the node size (80px) so the centre of the node lands on the click point
        const flowPos = convert({ x: ctxMenu.x, y: ctxMenu.y });
        setPosition(name, { x: flowPos.x - 40, y: flowPos.y - 40 });
      }
    }
  }

  // Open edit modal from context-menu "Edit" button
  function handleEditFromMenu(t: Transition) {
    setEditTrans({
      from: t.fromState,
      to:   t.toState,
      t:    { id: t.id, readSymbol: t.readSymbol, writeSymbol: t.writeSymbol, move: t.move },
    });
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }} ref={wrapperRef}>
      <ExportButton
        canvasRef={wrapperRef}
        alwaysVisible
        filename="state-diagram.png"
      />

      {/* Standalone "Add Transition" button */}
      <button
        onClick={() => setPendingConn({ from: null, to: null })}
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 10,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 6,
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 600,
          padding: '5px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          transition: 'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-accent)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
        }}
        title="Add a transition without dragging"
      >
        ＋ Add Transition
      </button>

      {/* Add Transition modal (drag gesture or standalone button) */}
      {pendingConn && (
        <AddTransitionModal
          fromState={pendingConn.from}
          toState={pendingConn.to}
          machine={machine}
          onAdd={handleAdd}
          onClose={() => setPendingConn(null)}
        />
      )}

      {/* Edit Transition modal */}
      {editTrans && (
        <AddTransitionModal
          fromState={editTrans.from}
          toState={editTrans.to}
          machine={machine}
          editTransition={editTrans.t}
          onAdd={handleAdd}
          onEdit={handleEditSave}
          onClose={() => setEditTrans(null)}
        />
      )}

      {ctxMenu && (
        <DiagramContextMenu
          ctx={ctxMenu}
          existingStates={machine.states}
          onClose={() => setCtxMenu(null)}
          onAddState={handleAddStateAtClick}
          onDeleteState={removeState}
          onSetStart={setStartState}
          onToggleAccept={toggleAcceptState}
          onToggleReject={toggleRejectState}
          onDeleteTransition={removeTransition}
          onEditTransition={handleEditFromMenu}
        />
      )}

      <ReactFlow
        nodes={rfNodes}
        edges={edges}
        nodeTypes={stateNodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        connectionMode={ConnectionMode.Loose}
        onNodesChange={handleNodesChange}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        onEdgeClick={handleEdgeClick}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        minZoom={0.2}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
        <Controls />
        {/* Captures screenToFlowPosition from inside the ReactFlow provider */}
        <FlowPositionHelper converterRef={converterRef} />
      </ReactFlow>
    </div>
  );
}
