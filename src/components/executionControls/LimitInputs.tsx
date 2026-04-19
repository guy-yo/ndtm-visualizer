import { useAppStore } from '../../store/useAppStore';
import styles from './LimitInputs.module.css';

export function LimitInputs() {
  const settings = useAppStore((s) => s.executionSettings);
  const setSettings = useAppStore((s) => s.setExecutionSettings);

  return (
    <div className={styles.row}>
      <div className={styles.field}>
        <label className={styles.label}>Max Depth</label>
        <input
          className={styles.input}
          type="number"
          min={1}
          max={500}
          value={settings.maxDepth}
          onChange={(e) => setSettings({ maxDepth: Math.max(1, Number(e.target.value)) })}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Max Nodes</label>
        <input
          className={styles.input}
          type="number"
          min={1}
          max={5000}
          value={settings.maxNodes}
          onChange={(e) => setSettings({ maxNodes: Math.max(1, Number(e.target.value)) })}
        />
      </div>
    </div>
  );
}
