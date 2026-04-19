import type { TapeMap, NodeStatus } from './engine';
import type { MoveDirection } from './machine';

// Both interfaces extend Record<string, unknown> to satisfy @xyflow/react's
// Node<T> constraint (which requires T extends Record<string, unknown>).
// Every property type is assignable to `unknown`, so this is always valid.

export interface ConfigNodeData extends Record<string, unknown> {
  configId: string;
  state: string;
  tape: TapeMap;
  headPosition: number;
  status: NodeStatus;
  transitionUsed: string | null;
  isOnAcceptPath: boolean;
  isCollapsed: boolean;
  depth: number;
  hasChildren: boolean;
}

export interface TransitionEdgeData extends Record<string, unknown> {
  transitionId: string | null;
  fromState: string;
  readSymbol: string;
  writeSymbol: string;
  move: MoveDirection | '';
  label: string;
}
