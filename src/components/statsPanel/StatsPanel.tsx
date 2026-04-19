import { useAppStore } from '../../store/useAppStore';
import styles from './StatsPanel.module.css';

const REASON_LABELS: Record<string, string> = {
  accept: 'Accepted',
  exhausted: 'Exhausted (all branches terminated)',
  'max-depth': 'Depth limit reached',
  'max-nodes': 'Node limit reached',
  running: 'Running…',
};

export function StatsPanel() {
  const tree = useAppStore((s) => s.tree);
  const phase = useAppStore((s) => s.executionPhase);

  if (!tree && phase === 'idle') return null;

  if (phase === 'running') {
    return (
      <section className={styles.section}>
        <div className={styles.running}>Computing…</div>
      </section>
    );
  }

  if (!tree) return null;

  const { totalNodes, maxDepth, terminationReason } = tree.stats;
  const acceptCount = tree.acceptPaths.length;
  const isAccepted = acceptCount > 0;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Results</h2>
      <div className={`${styles.verdict} ${isAccepted ? styles.verdictAccept : styles.verdictReject}`}>
        {isAccepted ? '✓ ACCEPTED' : '✗ REJECTED'}
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Nodes</span>
          <span className={styles.statValue}>{totalNodes}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Max Depth</span>
          <span className={styles.statValue}>{maxDepth}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Accept Paths</span>
          <span className={styles.statValue}>{acceptCount}</span>
        </div>
      </div>
      <div className={styles.reason}>
        {REASON_LABELS[terminationReason] ?? terminationReason}
      </div>
    </section>
  );
}
