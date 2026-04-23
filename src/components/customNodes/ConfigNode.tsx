import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { ConfigNodeData } from '../../types/flow';

type ConfigNodeType = Node<ConfigNodeData, 'configNode'>;
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from './StatusBadge';
import { TapeRenderer } from './TapeRenderer';
import styles from './ConfigNode.module.css';

// Module-level — never recreated, prevents RF from remounting nodes
export const nodeTypes = { configNode: ConfigNode };

const REJECT_LABELS: Record<string, string> = {
  'no-transition': 'no transition',
  'depth-limit':   'depth limit',
  'explicit':      'explicit reject',
  'node-limit':    'node limit',
};

export function ConfigNode({ data }: NodeProps<ConfigNodeType>) {
  const toggleCollapse = useAppStore((s) => s.toggleCollapse);
  const blankSymbol = useAppStore((s) => s.machine.blankSymbol);
  const { state, tape, headPosition, status, isOnAcceptPath, isCollapsed, hasChildren, depth, isLoopStart, rejectReason } = data;

  const borderClass = styles[status];

  return (
    <div
      className={`${styles.node} ${borderClass} ${isOnAcceptPath ? styles.acceptPath : ''} ${isLoopStart ? styles.loopStart : ''}`}
      onClick={() => hasChildren && toggleCollapse(data.configId)}
      title={hasChildren ? (isCollapsed ? 'Click to expand' : 'Click to collapse') : undefined}
      style={{ cursor: hasChildren ? 'pointer' : 'default' }}
    >
      <Handle type="target" position={Position.Top} className={styles.handle} />

      <div className={styles.header}>
        <span className={styles.state}>{state}</span>
        <div className={styles.meta}>
          <span className={styles.depth}>d={depth}</span>
          <StatusBadge status={status} />
          {hasChildren && (
            <span className={styles.collapseIcon}>{isCollapsed ? '▶' : '▼'}</span>
          )}
        </div>
      </div>

      <div className={styles.tapeWrap}>
        <TapeRenderer tape={tape} headPosition={headPosition} blankSymbol={blankSymbol} />
      </div>

      {status === 'reject' && rejectReason && (
        <div className={styles.rejectReason}>{REJECT_LABELS[rejectReason as string] ?? rejectReason}</div>
      )}

      <Handle type="source" position={Position.Bottom} className={styles.handle} />
    </div>
  );
}
