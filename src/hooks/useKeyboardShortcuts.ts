import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * Global keyboard shortcuts (active when focus is NOT in an input/textarea/select).
 *
 *  Space       → Run All (idle/complete) or Step (stepping)
 *  Shift+Space → Step backward
 *  R           → Reset
 *  H           → Toggle accept-path highlight
 *  Ctrl+Z      → Undo machine edit
 *  Ctrl+Shift+Z → Redo machine edit
 */
export function useKeyboardShortcuts() {
  const phase             = useAppStore((s) => s.executionPhase);
  const runExecution      = useAppStore((s) => s.runExecution);
  const stepExecution     = useAppStore((s) => s.stepExecution);
  const stepBack          = useAppStore((s) => s.stepBack);
  const resetExecution    = useAppStore((s) => s.resetExecution);
  const highlightAcceptPath   = useAppStore((s) => s.highlightAcceptPath);
  const setHighlightAcceptPath = useAppStore((s) => s.setHighlightAcceptPath);
  const machineErrors     = useAppStore((s) => s.machineErrors);
  const undo              = useAppStore((s) => s.undo);
  const redo              = useAppStore((s) => s.redo);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Ctrl / Cmd combos
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
          return;
        }
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (machineErrors.length > 0) return;
          if (e.shiftKey) {
            stepBack();
          } else if (phase === 'idle' || phase === 'complete') {
            runExecution();
          } else if (phase === 'stepping') {
            stepExecution();
          }
          break;

        case 'r':
        case 'R':
          if (!e.ctrlKey && !e.metaKey) resetExecution();
          break;

        case 'h':
        case 'H':
          setHighlightAcceptPath(!highlightAcceptPath);
          break;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, highlightAcceptPath, machineErrors, runExecution, stepExecution,
      stepBack, resetExecution, setHighlightAcceptPath, undo, redo]);
}
