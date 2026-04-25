import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { MachineForm } from '../machineForm/MachineForm';
import { TransitionTable } from '../transitionTable/TransitionTable';
import { InputStringField } from '../inputString/InputStringField';
import { ExecutionControls } from '../executionControls/ExecutionControls';
import { StatsPanel } from '../statsPanel/StatsPanel';
import { BatchTest } from '../batchTest/BatchTest';
import { MachineValidation } from '../machineValidation/MachineValidation';
import { FlowCanvas } from '../flowCanvas/FlowCanvas';
import { StateDiagram } from '../stateDiagram/StateDiagram';
import { ShortcutLegend } from './ShortcutLegend';
import styles from './AppShell.module.css';

export function AppShell() {
  const phase    = useAppStore((s) => s.executionPhase);
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const theme    = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const isIdle   = phase === 'idle';

  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? '' : styles.sidebarCollapsed}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.appTitle}>NDTM Visualizer</h1>
              <span className={styles.appSub}>Nondeterministic Turing Machine</span>
            </div>
            <div className={styles.headerButtons}>
              <ShortcutLegend />
              <button
                className={styles.themeBtn}
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? '☀' : '🌙'}
              </button>
            </div>
          </div>
          {isIdle && (
            <div className={styles.tip}>
              👋 <strong>New here?</strong> A sample machine is preloaded.
              Press <strong>▶ Run All</strong> to see the computation tree.
            </div>
          )}
        </div>
        <div className={styles.sidebarScroll}>
          <MachineForm />
          <div className={styles.divider} />
          <MachineValidation />
          <div className={styles.divider} />
          <TransitionTable />
          <div className={styles.divider} />
          <InputStringField />
          <div className={styles.divider} />
          <ExecutionControls />
          <div className={styles.divider} />
          <StatsPanel />
          <div className={styles.divider} />
          <BatchTest />
        </div>
      </aside>
      <main className={styles.canvas}>
        {/* Sidebar collapse/expand tab */}
        <button
          className={styles.sidebarToggle}
          onClick={() => setSidebarOpen((o) => !o)}
          title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          {sidebarOpen ? '◄' : '►'}
        </button>

        {/* View mode toggle — pill tabs at top-center of canvas */}
        <div className={styles.canvasToolbar}>
          <button
            className={`${styles.viewToggle} ${viewMode === 'tree' ? styles.viewActive : ''}`}
            onClick={() => setViewMode('tree')}
          >
            Computation Tree
          </button>
          <button
            className={`${styles.viewToggle} ${viewMode === 'diagram' ? styles.viewActive : ''}`}
            onClick={() => setViewMode('diagram')}
          >
            State Diagram
          </button>
        </div>
        {viewMode === 'tree' ? <FlowCanvas /> : <StateDiagram />}
      </main>
    </div>
  );
}
