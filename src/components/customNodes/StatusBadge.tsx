import type { NodeStatus } from '../../types/engine';
import styles from './StatusBadge.module.css';

const LABELS: Record<NodeStatus, string> = {
  running: 'RUN',
  accept: 'ACC',
  reject: 'REJ',
  loop: 'LOOP',
};

interface Props {
  status: NodeStatus;
}

export function StatusBadge({ status }: Props) {
  return (
    <span className={`${styles.badge} ${styles[status]}`}>
      {LABELS[status]}
    </span>
  );
}
