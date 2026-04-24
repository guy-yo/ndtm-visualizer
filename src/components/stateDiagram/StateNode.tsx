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
      {/* Normal edges: enter from left, exit from right */}
      <Handle type="target" position={Position.Left}  style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      {/* Self-loop handles: two points on the TOP edge, spread horizontally */}
      <Handle type="source" id="self-out" position={Position.Top} style={{ left: '28%', opacity: 0 }} />
      <Handle type="target" id="self-in"  position={Position.Top} style={{ left: '72%', opacity: 0 }} />
    </div>
  );
}
