import { useAppStore } from '../../store/useAppStore';
import { MachineForm } from '../machineForm/MachineForm';
import { TransitionTable } from '../transitionTable/TransitionTable';
import { InputStringField } from '../inputString/InputStringField';
import { ExecutionControls } from '../executionControls/ExecutionControls';
import { StatsPanel } from '../statsPanel/StatsPanel';
import { FlowCanvas } from '../flowCanvas/FlowCanvas';
import styles from './AppShell.module.css';

export function AppShell() {
  const phase = useAppStore((s) => s.executionPhase);
  const isIdle = phase === 'idle';

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.appTitle}>NDTM Visualizer</h1>
          <span className={styles.appSub}>Nondeterministic Turing Machine</span>
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
          <TransitionTable />
          <div className={styles.divider} />
          <InputStringField />
          <div className={styles.divider} />
          <ExecutionControls />
          <div className={styles.divider} />
          <StatsPanel />
        </div>
      </aside>
      <main className={styles.canvas}>
        <FlowCanvas />
      </main>
    </div>
  );
}
