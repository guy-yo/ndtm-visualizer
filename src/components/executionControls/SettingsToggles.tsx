import { useAppStore } from '../../store/useAppStore';
import styles from './SettingsToggles.module.css';

export function SettingsToggles() {
  const settings = useAppStore((s) => s.executionSettings);
  const setSettings = useAppStore((s) => s.setExecutionSettings);
  const highlightAcceptPath = useAppStore((s) => s.highlightAcceptPath);
  const setHighlight = useAppStore((s) => s.setHighlightAcceptPath);

  return (
    <div className={styles.group}>
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={settings.stopOnAccept && !settings.buildFullTree}
          onChange={(e) => {
            setSettings({ stopOnAccept: e.target.checked, buildFullTree: !e.target.checked });
          }}
        />
        Stop on first accept
      </label>
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={settings.buildFullTree}
          onChange={(e) => {
            setSettings({ buildFullTree: e.target.checked, stopOnAccept: !e.target.checked });
          }}
        />
        Build full tree
      </label>
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={settings.enableLoopDetection}
          onChange={(e) => setSettings({ enableLoopDetection: e.target.checked })}
        />
        Loop detection
      </label>
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={highlightAcceptPath}
          onChange={(e) => setHighlight(e.target.checked)}
        />
        Highlight accept path
      </label>
    </div>
  );
}
