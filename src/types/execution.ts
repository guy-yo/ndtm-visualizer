export interface ExecutionSettings {
  stopOnAccept: boolean;
  buildFullTree: boolean;
  enableLoopDetection: boolean;
  loopWindowSize: number;
  maxDepth: number;
  maxNodes: number;
}

export type ExecutionPhase = 'idle' | 'running' | 'stepping' | 'complete';

export const DEFAULT_SETTINGS: ExecutionSettings = {
  stopOnAccept: false,
  buildFullTree: true,
  enableLoopDetection: true,
  loopWindowSize: 10,
  maxDepth: 50,
  maxNodes: 500,
};
