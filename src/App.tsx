import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { parseMachineFromHash } from './utils/shareUrl';
import { useAppStore } from './store/useAppStore';

export default function App() {
  useKeyboardShortcuts();

  const setMachine     = useAppStore((s) => s.setMachine);
  const setInputString = useAppStore((s) => s.setInputString);

  // On mount: check for a shared machine in the URL hash
  useEffect(() => {
    const parsed = parseMachineFromHash();
    if (parsed) {
      setMachine(parsed.machine);
      setInputString(parsed.input);
      // Remove the hash so refreshing doesn't re-apply it
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <AppShell />;
}
