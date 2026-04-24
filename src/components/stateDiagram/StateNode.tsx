import React from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useAppStore } from '../../store/useAppStore';
import styles from './StateNode.module.css';

export interface StateNodeData extends Record<string, unknown> {
  stateName: string;
  isStart: boolean;
  isAccept: boolean;
  isReject: boolean;
}

type StateNodeType = Node<StateNodeData, 'stateNode'>;

// Module-level constant — prevents ReactFlow from remounting nodes on re-render
export const stateNodeTypes = { stateNode: StateNode };

export function StateNode({ data }: NodeProps<StateNodeType>) {
  const { stateName, isStart, isAccept, isReject } = data;
  const renameState = useAppStore((s) => s.renameState);

  const [editing, setEditing] = React.useState(false);
  const [draft,   setDraft]   = React.useState(stateName);

  // Keep draft in sync if the prop changes (e.g. after undo)
  React.useEffect(() => {
    if (!editing) setDraft(stateName);
  }, [stateName, editing]);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(stateName);
    setEditing(true);
  }

  function commitEdit() {
    setEditing(false);
    renameState(stateName, draft);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter')  { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); setEditing(false); setDraft(stateName); }
  }

  const cls = [
    styles.circle,
    isAccept ? styles.accept : '',
    isReject ? styles.reject : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} onDoubleClick={startEdit}>
      {isStart && <span className={styles.startArrow}>→</span>}

      {editing ? (
        <input
          className={`${styles.editInput} nodrag nowheel nopan`}
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          spellCheck={false}
        />
      ) : (
        <span className={styles.label} title="Double-click to rename">{stateName}</span>
      )}

      {/* Normal edges: enter from left, exit from right (visible on hover for connecting) */}
      <Handle type="target" position={Position.Left}  className={styles.handle} />
      <Handle type="source" position={Position.Right} className={styles.handle} />
      {/* Self-loop handles: invisible positioning anchors on the top edge */}
      <Handle type="source" id="self-out" position={Position.Top} style={{ left: '28%', opacity: 0, pointerEvents: 'none' }} />
      <Handle type="target" id="self-in"  position={Position.Top} style={{ left: '72%', opacity: 0, pointerEvents: 'none' }} />
    </div>
  );
}
