import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * Global keyboard shortcuts (active when focus is NOT in an input/textarea/select).
 *
 *  Space  → Run All (idle/complete) or Step (stepping)
 *  R      → Reset
 *  H      → Toggle accept-path highlight
 */
export function useKeyboardShortcuts() {
  const phase = useAppStore((s) => s.executionPhase);
  const runExecution = useAppStore((s) => s.runExecution);
  const stepExecution = useAppStore((s) => s.stepExecution);
  const resetExecution = useAppStore((s) => s.resetExecution);
  const highlightAcceptPath = useAppStore((s) => s.highlightAcceptPath);
  const setHighlightAcceptPath = useAppStore((s) => s.setHighlightAcceptPath);
  const machineErrors = useAppStore((s) => s.machineErrors);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (machineErrors.length > 0) return;
          if (phase === 'idle' || phase === 'complete') runExecution();
          else if (phase === 'stepping') stepExecution();
          break;

        case 'r':
        case 'R':
          resetExecution();
          break;

        case 'h':
        case 'H':
          setHighlightAcceptPath(!highlightAcceptPath);
          break;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, highlightAcceptPath, machineErrors, runExecution, stepExecution, resetExecution, setHighlightAcceptPath]);
}
