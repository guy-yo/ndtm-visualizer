import React from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '../../store/useAppStore';
import { nodeTypes } from '../customNodes/ConfigNode';
import { useFlowNodes } from './useFlowNodes';
import { ExportButton } from './ExportButton';
import styles from './FlowCanvas.module.css';

// ── Auto-focus: inside ReactFlow context, pans to the next BFS node ──────────
function AutoFocus() {
  const { setCenter, getNode, getZoom } = useReactFlow();
  const bfsQueue = useAppStore((s) => s.bfsQueue);
  const phase    = useAppStore((s) => s.executionPhase);

  React.useEffect(() => {
    if (phase !== 'stepping' || bfsQueue.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nextId = (bfsQueue[0] as any).configId as string | undefined;
    if (!nextId) return;

    // ReactFlow processes the updated node list asynchronously after the store
    // update, so we wait one frame before querying node positions.
    const timer = setTimeout(() => {
      const rfNode = getNode(nextId);
      if (!rfNode) return;
      const zoom = getZoom();
      // Center on the node (node is 240×110 px)
      setCenter(rfNode.position.x + 120, rfNode.position.y + 55, { zoom, duration: 300 });
    }, 60);
    return () => clearTimeout(timer);
  // Only re-run when the queue actually changes length (not on every render)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bfsQueue.length, phase]);

  return null;
}

// ── Playback bar ──────────────────────────────────────────────────────────────
function PlaybackBar() {
  const playbackPath     = useAppStore((s) => s.playbackPath);
  const playbackIndex    = useAppStore((s) => s.playbackIndex);
  const isPlaying        = useAppStore((s) => s.isPlaybackPlaying);
  const setPlaybackIndex = useAppStore((s) => s.setPlaybackIndex);
  const setIsPlaying     = useAppStore((s) => s.setIsPlaybackPlaying);
  const stopPlayback     = useAppStore((s) => s.stopPlayback);

  // Auto-advance when playing
  React.useEffect(() => {
    if (!isPlaying || !playbackPath) return;
    const timer = setInterval(() => {
      setPlaybackIndex(
        (playbackIndex + 1) >= playbackPath.length ? 0 : playbackIndex + 1,
      );
    }, 350);
    return () => clearInterval(timer);
  }, [isPlaying, playbackPath, playbackIndex, setPlaybackIndex]);

  if (!playbackPath) return null;
  const total = playbackPath.length;

  return (
    <div className={styles.playbackBar}>
      <span className={styles.playbackTitle}>Path</span>

      <button
        className={styles.pbBtn}
        onClick={() => setPlaybackIndex(0)}
        title="Restart"
        disabled={playbackIndex === 0}
      >⏮</button>

      <button
        className={styles.pbBtn}
        onClick={() => setIsPlaying(!isPlaying)}
        title={isPlaying ? 'Pause' : 'Play'}
      >{isPlaying ? '⏸' : '▶'}</button>

      <button
        className={styles.pbBtn}
        onClick={() => setPlaybackIndex(Math.min(playbackIndex + 1, total - 1))}
        title="Next"
        disabled={playbackIndex >= total - 1}
      >⏭</button>

      <span className={styles.playbackStep}>{playbackIndex + 1} / {total}</span>

      <button
        className={`${styles.pbBtn} ${styles.pbClose}`}
        onClick={stopPlayback}
        title="Stop playback"
      >✕</button>
    </div>
  );
}


export function FlowCanvas() {
  const canvasRef     = React.useRef<HTMLDivElement>(null);
  const tree          = useAppStore((s) => s.tree);
  const collapsedNodeIds   = useAppStore((s) => s.collapsedNodeIds);
  const highlightAcceptPath = useAppStore((s) => s.highlightAcceptPath);
  const allTransitions = useAppStore((s) => s.machine.transitions);
  const blankSymbol    = useAppStore((s) => s.machine.blankSymbol);
  const phase          = useAppStore((s) => s.executionPhase);
  const inputString    = useAppStore((s) => s.inputString);
  const stateFilter    = useAppStore((s) => s.stateFilter);
  const setStateFilter = useAppStore((s) => s.setStateFilter);
  const playbackPath   = useAppStore((s) => s.playbackPath);
  const playbackIndex  = useAppStore((s) => s.playbackIndex);

  const { nodes, edges } = useFlowNodes(
    tree,
    collapsedNodeIds,
    highlightAcceptPath,
    allTransitions,
    blankSymbol,
    stateFilter,
    playbackPath,
    playbackIndex,
  );

  if (phase === 'idle') {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyGlyph}>⟳</div>
        <div className={styles.emptyTitle}>Ready to simulate your Turing machine</div>
        <div className={styles.emptySub}>
          This canvas will show the computation tree — every branch the machine explores,
          with <strong style={{ color: 'var(--color-accept)' }}>ACCEPT</strong>,{' '}
          <strong style={{ color: 'var(--color-reject)' }}>REJECT</strong>, and{' '}
          <strong style={{ color: 'var(--color-loop)' }}>LOOP</strong> outcomes color-coded.
        </div>
        <div className={styles.checklist}>
          <div className={`${styles.checkStep} ${styles.done}`}>
            <span className={styles.stepNum}>✓</span>
            <span>A sample machine is already loaded</span>
          </div>
          <div className={`${styles.checkStep} ${styles.done}`}>
            <span className={styles.stepNum}>✓</span>
            <span>
              Input string set to{' '}
              <code style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-accent)' }}>
                {inputString || '""'}
              </code>
            </span>
          </div>
          <div className={styles.checkStep}>
            <span className={styles.stepNum}>3</span>
            <span>
              Press <strong>▶ Run All</strong> to see the full tree — or{' '}
              <strong>⏭ Step</strong> to go branch-by-branch
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'running') {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyGlyph} style={{ animation: 'spin 1s linear infinite' }}>⏳</div>
        <div className={styles.emptyTitle}>Computing computation tree…</div>
        <div className={styles.emptySub}>Exploring every nondeterministic branch.</div>
      </div>
    );
  }

  return (
    <div className={styles.canvas} ref={canvasRef}>
      <ExportButton canvasRef={canvasRef} />

      {/* State filter */}
      <input
        className={styles.filterInput}
        placeholder="Filter by state…"
        value={stateFilter}
        onChange={(e) => setStateFilter(e.target.value)}
        title="Dim nodes not matching this state name"
      />

      <PlaybackBar />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        onlyRenderVisibleElements={nodes.length > 200}
        minZoom={0.05}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <AutoFocus />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#334155"
        />
        <Controls />
      </ReactFlow>
    </div>
  );
}
