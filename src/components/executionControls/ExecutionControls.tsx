import { useAppStore } from '../../store/useAppStore';
import { SettingsToggles } from './SettingsToggles';
import { LimitInputs } from './LimitInputs';
import styles from './ExecutionControls.module.css';

export function ExecutionControls() {
  const phase = useAppStore((s) => s.executionPhase);
  const errors = useAppStore((s) => s.machineErrors);
  const bfsQueue = useAppStore((s) => s.bfsQueue);
  const runExecution = useAppStore((s) => s.runExecution);
  const startStepMode = useAppStore((s) => s.startStepMode);
  const stepExecution = useAppStore((s) => s.stepExecution);
  const resetExecution = useAppStore((s) => s.resetExecution);

  const hasErrors = errors.length > 0;
  const isIdle = phase === 'idle' || phase === 'complete';
  const isStepping = phase === 'stepping';
  const isRunning = phase === 'running';
  const queueEmpty = bfsQueue.length === 0;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Execution</h2>

      <SettingsToggles />
      <LimitInputs />

      <div className={styles.buttons}>
        {/* Run All */}
        <button
          className={`${styles.btn} ${styles.runBtn}`}
          disabled={hasErrors || isRunning || isStepping}
          onClick={runExecution}
          title="Run all steps at once"
        >
          {isRunning ? '⏳ Running…' : '▶ Run All'}
        </button>

        {/* Step */}
        <button
          className={`${styles.btn} ${styles.stepBtn}`}
          disabled={hasErrors || isRunning || phase === 'complete' || (isStepping && queueEmpty)}
          onClick={isStepping ? stepExecution : startStepMode}
          title={phase === 'complete' ? 'Press ↺ to reset and step again' : isStepping ? `Step (${bfsQueue.length} in queue)` : 'Start step-by-step mode'}
        >
          {isStepping
            ? `⏭ Step (${bfsQueue.length})`
            : '⏭ Step'}
        </button>

        {/* Reset */}
        <button
          className={`${styles.btn} ${styles.resetBtn}`}
          onClick={resetExecution}
          title="Reset"
        >
          ↺
        </button>
      </div>

      {isStepping && (
        <div className={styles.stepInfo}>
          {queueEmpty
            ? '✓ All branches exhausted'
            : `${bfsQueue.length} configuration${bfsQueue.length !== 1 ? 's' : ''} pending`}
        </div>
      )}

      {hasErrors && (
        <div className={styles.errorList}>
          {errors.map((e, i) => (
            <div key={i} className={styles.errorItem}>⚠ {e.message}</div>
          ))}
        </div>
      )}
    </section>
  );
}
