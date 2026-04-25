import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SettingsToggles } from './SettingsToggles';
import { LimitInputs } from './LimitInputs';
import styles from './ExecutionControls.module.css';

export function ExecutionControls() {
  const phase          = useAppStore((s) => s.executionPhase);
  const errors         = useAppStore((s) => s.machineErrors);
  const bfsQueue       = useAppStore((s) => s.bfsQueue);
  const treeHistory    = useAppStore((s) => s.treeHistory);
  const runExecution   = useAppStore((s) => s.runExecution);
  const startStepMode  = useAppStore((s) => s.startStepMode);
  const stepExecution  = useAppStore((s) => s.stepExecution);
  const stepBack       = useAppStore((s) => s.stepBack);
  const resetExecution = useAppStore((s) => s.resetExecution);

  const [isOpen, setIsOpen] = React.useState(true);

  const hasErrors  = errors.length > 0;
  const isStepping = phase === 'stepping';
  const isRunning  = phase === 'running';
  const queueEmpty = bfsQueue.length === 0;
  const canStepBack = treeHistory.length > 0 && isStepping;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <button className={styles.collapseBtn} onClick={() => setIsOpen((o) => !o)}>
          <span className={styles.chevron}>{isOpen ? '▾' : '▸'}</span>
          <h2 className={styles.title}>Execution</h2>
        </button>
      </div>

      {isOpen && (
        <>
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

        {/* Step backward */}
        <button
          className={`${styles.btn} ${styles.backBtn}`}
          disabled={!canStepBack}
          onClick={stepBack}
          title={canStepBack ? `Step back (${treeHistory.length} available)` : 'No step history — start stepping first'}
        >
          ⏮
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

      <div className={styles.shortcuts}>
        <span className={styles.shortcut}><kbd>Space</kbd> Run / Step</span>
        <span className={styles.shortcut}><kbd>⇧Space</kbd> Back</span>
        <span className={styles.shortcut}><kbd>R</kbd> Reset</span>
        <span className={styles.shortcut}><kbd>H</kbd> Highlight</span>
      </div>

      {hasErrors && (
        <div className={styles.errorList}>
          {errors.map((e, i) => (
            <div key={i} className={styles.errorItem}>⚠ {e.message}</div>
          ))}
        </div>
      )}
        </>
      )}
    </section>
  );
}
