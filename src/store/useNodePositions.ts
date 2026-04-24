import { create } from 'zustand';

/**
 * Separate lightweight store for user-dragged state-node positions in the
 * state diagram.  Kept outside useAppStore so:
 *  • positional changes don't pollute the undo/redo stack
 *  • immer doesn't freeze plain {x,y} objects unnecessarily
 */
interface NodePositionsState {
  positions: Record<string, { x: number; y: number }>;
  setPosition: (id: string, pos: { x: number; y: number }) => void;
  clearPositions: () => void;
}

export const useNodePositions = create<NodePositionsState>()((set) => ({
  positions: {},
  setPosition: (id, pos) =>
    set((state) => ({ positions: { ...state.positions, [id]: pos } })),
  clearPositions: () => set({ positions: {} }),
}));
