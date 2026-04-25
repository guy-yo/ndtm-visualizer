/**
 * Vitest global setup — runs before every test file.
 * Provides browser globals that the store and utilities expect in Node/happy-dom.
 */
import { enableMapSet } from 'immer';

// Required so Immer can proxy Set / Map values inside the Zustand store state.
// (The store has `collapsedNodeIds: new Set()` and similar.)
enableMapSet();

// Ensure localStorage is available (happy-dom provides it, but make it explicit)
if (typeof localStorage === 'undefined') {
  const store: Record<string, string> = {};
  Object.defineProperty(global, 'localStorage', {
    value: {
      getItem:    (k: string) => store[k] ?? null,
      setItem:    (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear:      () => { Object.keys(store).forEach((k) => delete store[k]); },
    },
    writable: true,
  });
}
