import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { NodeStatus } from '../../types/engine';
import styles from './StatsPanel.module.css';

const REASON_LABELS: Record<string, string> = {
  accept:      'Accepted — accept path found',
  exhausted:   'All branches terminated',
  'max-depth': 'Depth limit reached',
  'max-nodes': 'Node limit reached',
  running:     'Running…',
};

// ── Tiny inline SVG depth histogram ──────────────────────────────────────────
function DepthHistogram({ depthCounts }: { depthCounts: Map<number, number> }) {
  if (depthCounts.size === 0) return null;

  const maxDepth   = Math.max(...depthCounts.keys());
  const maxCount   = Math.max(...depthCounts.values());
  const BARS       = Math.min(maxDepth + 1, 14);
  const BAR_W      = 12;
  const BAR_GAP    = 2;
  const CHART_H    = 40;
  const WIDTH      = BARS * (BAR_W + BAR_GAP) - BAR_GAP;

  const bars: { x: number; h: number; depth: number; count: number }[] = [];
  for (let d = 0; d < BARS; d++) {
    const count = depthCounts.get(d) ?? 0;
    const h = maxCount > 0 ? Math.max(2, Math.round((count / maxCount) * CHART_H)) : 2;
    bars.push({ x: d * (BAR_W + BAR_GAP), h, depth: d, count });
  }

  return (
    <div className={styles.histogram}>
      <div className={styles.histLabel}>Node distribution by depth</div>
      <svg width={WIDTH} height={CHART_H} style={{ overflow: 'visible' }}>
        {bars.map((b) => (
          <rect
            key={b.depth}
            x={b.x}
            y={CHART_H - b.h}
            width={BAR_W}
            height={b.h}
            fill="var(--color-running)"
            opacity={0.75}
            rx={2}
          >
            <title>Depth {b.depth}: {b.count} node{b.count !== 1 ? 's' : ''}</title>
          </rect>
        ))}
      </svg>
    </div>
  );
}

// ── Per-status pill row ───────────────────────────────────────────────────────
function StatusCounts({ counts }: { counts: Record<NodeStatus, number> }) {
  const items: { label: string; value: number; cls: string }[] = [
    { label: 'Accept', value: counts.accept,  cls: styles.pillAccept  },
    { label: 'Reject', value: counts.reject,  cls: styles.pillReject  },
    { label: 'Loop',   value: counts.loop,    cls: styles.pillLoop    },
    { label: 'Active', value: counts.running, cls: styles.pillRunning },
  ];
  return (
    <div className={styles.pillRow}>
      {items.map(({ label, value, cls }) => (
        <div key={label} className={`${styles.pill} ${cls}`}>
          <span className={styles.pillValue}>{value}</span>
          <span className={styles.pillLabel}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Accept-path list (clickable for playback) ─────────────────────────────────
function AcceptPaths({ paths }: { paths: string[][] }) {
  const setPlaybackPath   = useAppStore((s) => s.setPlaybackPath);
  const playbackPath      = useAppStore((s) => s.playbackPath);
  const viewMode          = useAppStore((s) => s.viewMode);
  const setViewMode       = useAppStore((s) => s.setViewMode);

  if (paths.length === 0) return null;

  function handleClick(path: string[]) {
    if (viewMode !== 'tree') setViewMode('tree');
    setPlaybackPath(path);
  }

  return (
    <div className={styles.acceptPathsSection}>
      <div className={styles.acceptPathsTitle}>
        Accept paths
        <span className={styles.acceptPathsHint}> — click to animate</span>
      </div>
      <div className={styles.acceptPathsList}>
        {paths.slice(0, 6).map((path, i) => {
          const isActive = playbackPath === path ||
            (playbackPath && path.length === playbackPath.length &&
              path.every((id, j) => id === playbackPath[j]));
          return (
            <button
              key={i}
              className={`${styles.acceptPathBtn} ${isActive ? styles.acceptPathActive : ''}`}
              onClick={() => handleClick(path)}
              title={`Play back path ${i + 1} (${path.length} steps)`}
            >
              ▶ Path {i + 1}
              <span className={styles.pathLen}>{path.length} steps</span>
            </button>
          );
        })}
        {paths.length > 6 && (
          <div className={styles.moreHint}>+{paths.length - 6} more paths</div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function StatsPanel() {
  const tree  = useAppStore((s) => s.tree);
  const phase = useAppStore((s) => s.executionPhase);

  const [isOpen, setIsOpen] = React.useState(true);

  if (!tree && phase === 'idle') return null;

  if (phase === 'running') {
    return (
      <section className={styles.section}>
        <div className={styles.running}>Computing…</div>
      </section>
    );
  }

  if (!tree) return null;

  const { totalNodes, maxDepth, terminationReason } = tree.stats;
  const acceptCount = tree.acceptPaths.length;
  const isStepping  = phase === 'stepping';
  const foundAccept = acceptCount > 0;

  // ── Verdict ─────────────────────────────────────────────────
  let verdictText: string;
  let verdictCls: string;

  if (foundAccept) {
    verdictText = '✓ ACCEPTED';
    verdictCls  = styles.verdictAccept;
  } else if (isStepping) {
    verdictText = '⏸ STEPPING…';
    verdictCls  = styles.verdictStepping;
  } else {
    verdictText = '✗ REJECTED';
    verdictCls  = styles.verdictReject;
  }

  const reasonText = isStepping && !foundAccept
    ? `${totalNodes} node${totalNodes !== 1 ? 's' : ''} explored — queue not empty`
    : (REASON_LABELS[terminationReason] ?? terminationReason);

  // ── Advanced stats ───────────────────────────────────────────
  const statusCounts: Record<NodeStatus, number> = { running: 0, accept: 0, reject: 0, loop: 0 };
  const depthCounts = new Map<number, number>();
  let leafCount = 0;

  for (const config of tree.nodes.values()) {
    statusCounts[config.status] = (statusCounts[config.status] ?? 0) + 1;
    depthCounts.set(config.depth, (depthCounts.get(config.depth) ?? 0) + 1);
    if (config.children.length === 0) leafCount++;
  }

  const nonLeafCount = Math.max(1, totalNodes - leafCount);
  const branchingFactor = ((totalNodes - 1) / nonLeafCount).toFixed(2);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <button className={styles.collapseBtn} onClick={() => setIsOpen((o) => !o)}>
          <span className={styles.chevron}>{isOpen ? '▾' : '▸'}</span>
          <h2 className={styles.title}>Results</h2>
        </button>
      </div>

      {isOpen && (
        <>
          <div className={`${styles.verdict} ${verdictCls}`}>
            {verdictText}
          </div>

          {/* Core stats */}
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Nodes</span>
              <span className={styles.statValue}>{totalNodes}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Max Depth</span>
              <span className={styles.statValue}>{maxDepth}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Accept</span>
              <span className={styles.statValue}>{acceptCount}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Branch</span>
              <span className={styles.statValue}>{branchingFactor}</span>
            </div>
          </div>

          <div className={styles.reason}>{reasonText}</div>

          {/* Per-status breakdown */}
          <StatusCounts counts={statusCounts} />

          {/* Depth histogram */}
          <DepthHistogram depthCounts={depthCounts} />

          {/* Accept paths (playback) */}
          <AcceptPaths paths={tree.acceptPaths} />
        </>
      )}
    </section>
  );
}
