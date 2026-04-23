import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
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

  const cls = [
    styles.circle,
    isAccept ? styles.accept : '',
    isReject ? styles.reject : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      {isStart && <span className={styles.startArrow}>→</span>}
      <span className={styles.label}>{stateName}</span>
      <Handle type="target" position={Position.Left}  style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      {/* Extra handles for self-loops */}
      <Handle type="target" id="top"    position={Position.Top}    style={{ opacity: 0 }} />
      <Handle type="source" id="bottom" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}
