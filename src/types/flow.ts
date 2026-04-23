import type { TapeMap, NodeStatus, RejectReason } from './engine';
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
  /** True when this node is the ancestor whose fingerprint is repeated by a loop leaf. */
  isLoopStart: boolean;
  /** ID this loop node's origin, or null if not a loop node. */
  loopOriginId: string | null;
  /** Why this node rejected. Null unless status === 'reject'. */
  rejectReason: RejectReason;
}

export interface TransitionEdgeData extends Record<string, unknown> {
  transitionId: string | null;
  fromState: string;
  readSymbol: string;
  writeSymbol: string;
  move: MoveDirection | '';
  label: string;
}
