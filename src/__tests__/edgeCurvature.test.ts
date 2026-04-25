import { describe, it, expect } from 'vitest';
import { computeEdgeCurvature, CLEARANCE, NODE_RADIUS } from '../components/stateDiagram/edgeCurvature';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a node centre at (cx, cy) with a dummy id. */
function node(id: string, cx: number, cy: number) {
  return { id, cx, cy };
}

describe('computeEdgeCurvature', () => {
  // ── No other nodes ─────────────────────────────────────────────────────────
  it('returns 0 when there are no other nodes (single straight edge)', () => {
    expect(computeEdgeCurvature(0, 0, 300, 0, false, [])).toBe(0);
  });

  // ── Bidirectional pair ────────────────────────────────────────────────────
  it('returns a positive value for a bidirectional pair regardless of others', () => {
    const c = computeEdgeCurvature(0, 0, 300, 0, true, []);
    expect(c).toBeGreaterThan(0);
  });

  it('bidirectional curvature is proportional to edge length (18% of len, min 40)', () => {
    const len = 400;
    const c = computeEdgeCurvature(0, 0, len, 0, true, []);
    expect(c).toBeCloseTo(len * 0.18, 1);
  });

  it('bidirectional curvature is at least 40 px for very short edges', () => {
    const c = computeEdgeCurvature(0, 0, 50, 0, true, []);
    expect(c).toBe(40);
  });

  // ── Node directly on the chord (perpDist = 0) ─────────────────────────────
  it('arcs away when a node sits exactly on the straight-line chord', () => {
    // Edge: (0,0) → (300,0) — horizontal rightward
    // Blocking node centred at the midpoint of the chord
    const mid = node('mid', 150, 0);
    const c = computeEdgeCurvature(0, 0, 300, 0, false, [mid]);
    // Must produce a non-zero curvature
    expect(Math.abs(c)).toBeGreaterThan(0);
  });

  // ── Side detection (sign of curvature) ───────────────────────────────────
  it('returns POSITIVE curvature when the blocking node is to the RIGHT of the edge', () => {
    // Rightward edge: (0,0) → (300,0)
    // Node at (150, 50) — below (= RIGHT side of a rightward edge in screen coords)
    const blocker = node('b', 150, 50); // within CLEARANCE = 85 px
    const c = computeEdgeCurvature(0, 0, 300, 0, false, [blocker]);
    expect(c).toBeGreaterThan(0); // arc LEFT (upward)
  });

  it('returns NEGATIVE curvature when the blocking node is to the LEFT of the edge', () => {
    // Rightward edge: (0,0) → (300,0)
    // Node at (150, -50) — above (= LEFT side of rightward edge)
    const blocker = node('b', 150, -50);
    const c = computeEdgeCurvature(0, 0, 300, 0, false, [blocker]);
    expect(c).toBeLessThan(0); // arc RIGHT (downward)
  });

  // ── Far-away node: no interference ────────────────────────────────────────
  it('returns 0 when the other node is far from the chord', () => {
    // Node 500 px perpendicular from a 300 px chord — well beyond CLEARANCE
    const farAway = node('f', 150, 500);
    const c = computeEdgeCurvature(0, 0, 300, 0, false, [farAway]);
    expect(c).toBe(0);
  });

  // ── Node beyond endpoints: no interference ────────────────────────────────
  it('ignores nodes that are outside the chord segment (beyond source or target)', () => {
    // Node behind the source (negative x) — t would be < 0.05
    const behind = node('b', -100, 5);
    const c = computeEdgeCurvature(0, 0, 300, 0, false, [behind]);
    expect(c).toBe(0);
  });

  // ── Required magnitude is sufficient to clear the blocking node ───────────
  it('produces enough curvature to clear a blocking node at the midpoint', () => {
    // Edge (0,0)→(300,0); node at (150, 30) — perpDist = 30, within CLEARANCE = 85
    const blocker = node('b', 150, 30);
    const curvature = computeEdgeCurvature(0, 0, 300, 0, false, [blocker]);

    // Verify the bezier midpoint (t=0.5) clears the node:
    // Deviation at t=0.5 = 0.5 × |curvature|
    // Node perpDist from chord = 30 (node is below, curvature positive → arc up)
    // The arc moves the path AWAY from node, so arc_y_at_midpoint = -0.5 * curvature
    // Distance from arc to node = |blocker.cy - arc_y| = |30 - (-0.5*curvature)| ≥ CLEARANCE
    const arcMidY = -0.5 * curvature; // negative = upward
    const clearanceAchieved = Math.abs(blocker.cy - arcMidY);
    expect(clearanceAchieved).toBeGreaterThanOrEqual(CLEARANCE);
  });

  // ── Worst blocker wins ────────────────────────────────────────────────────
  it('uses the worst (closest) blocking node when multiple interfere', () => {
    const slightlyClose  = node('a', 150, 60);  // perpDist = 60
    const veryClose      = node('b', 150, 10);  // perpDist = 10, needs more curvature
    const cSingle = computeEdgeCurvature(0, 0, 300, 0, false, [veryClose]);
    const cMulti  = computeEdgeCurvature(0, 0, 300, 0, false, [slightlyClose, veryClose]);
    expect(Math.abs(cMulti)).toBeGreaterThanOrEqual(Math.abs(cSingle));
  });

  // ── NODE_RADIUS is exported ───────────────────────────────────────────────
  it('exports NODE_RADIUS = 40', () => {
    expect(NODE_RADIUS).toBe(40);
  });

  it('exports CLEARANCE > NODE_RADIUS', () => {
    expect(CLEARANCE).toBeGreaterThan(NODE_RADIUS);
  });
});
