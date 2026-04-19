export type TapeMap = Map<number, string>;

export type NodeStatus = 'running' | 'accept' | 'reject' | 'loop';

export type TerminationReason =
  | 'accept'
  | 'exhausted'
  | 'max-depth'
  | 'max-nodes'
  | 'running';

export interface NTMConfig {
  id: string;
  parentId: string | null;
  state: string;
  tape: TapeMap;
  headPosition: number;
  depth: number;
  transitionUsed: string | null;
  status: NodeStatus;
  children: string[];
}

export interface TreeStats {
  totalNodes: number;
  maxDepth: number;
  terminationReason: TerminationReason;
}

export interface ComputationTree {
  rootId: string;
  nodes: Map<string, NTMConfig>;
  acceptPaths: string[][];
  stats: TreeStats;
}
