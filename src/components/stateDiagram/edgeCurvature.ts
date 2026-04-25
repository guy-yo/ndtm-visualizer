/**
 * Pure curvature computation for FloatingEdge — no React, no DOM.
 * Extracted so it can be unit-tested independently.
 *
 * Model
 * ─────
 * A quadratic bezier with control point  CP = mid + perp × curvature
 * deviates from the straight chord at parameter t by:
 *
 *   δ(t) = 2 · t · (1−t) · curvature
 *
 * Maximum deviation at t = 0.5 → δ = 0.5 · curvature.
 *
 * Given a node at perpendicular distance `d` from the chord at parameter `t_n`,
 * the required curvature to push the arc `clearance` pixels away is:
 *
 *   curvature = (clearance − d + margin) / (2 · t_n · (1 − t_n))
 *
 * Sign convention (CW-perp system used by FloatingEdge):
 *   The perpendicular unit vector is  (px, py) = (dy/len, −dx/len).
 *   Positive curvature → arc in (px, py) direction (LEFT of directed edge).
 *   Cross product of edge-vector × node-vector:
 *     cross > 0  →  node is to the RIGHT  →  arc LEFT  (+curvature)
 *     cross < 0  →  node is to the LEFT   →  arc RIGHT (−curvature)
 */

export const NODE_RADIUS = 40;   // half of the 80 px visual circle
export const CLEARANCE   = NODE_RADIUS + 45; // desired gap from arc to any other node centre
const MARGIN = 20;                // extra safety buffer beyond CLEARANCE

export interface NodeCentre {
  id:  string;
  cx:  number;
  cy:  number;
}

/**
 * Compute the curvature (in pixels, along the CW-perpendicular) for a
 * floating edge from (sx,sy) → (ex,ey) given a set of other node centres.
 *
 * @param sx        startPt.x   (circle-boundary exit of source node)
 * @param sy        startPt.y
 * @param ex        endPt.x     (circle-boundary entry of target node)
 * @param ey        endPt.y
 * @param hasMirror true when the reverse edge (target→source) also exists
 * @param others    centres of every node that is neither source nor target
 */
export function computeEdgeCurvature(
  sx: number, sy: number,
  ex: number, ey: number,
  hasMirror: boolean,
  others: NodeCentre[],
): number {
  const dx  = ex - sx;
  const dy  = ey - sy;
  const len = Math.hypot(dx, dy) || 1;

  if (hasMirror) {
    // Bidirectional pair: proportional arc so it looks balanced at any distance.
    // Minimum 40 px so very close nodes are still visually distinct.
    return Math.max(40, len * 0.18);
  }

  // Single-direction edge: stay straight unless another node blocks the path.
  let best = 0;

  for (const node of others) {
    // Projection parameter t of the closest chord point to this node (clamped
    // away from endpoints so we only react to nodes actually between them)
    const t = Math.max(0.05, Math.min(0.95,
      ((node.cx - sx) * dx + (node.cy - sy) * dy) / (len * len),
    ));

    const closestX = sx + t * dx;
    const closestY = sy + t * dy;
    const perpDist = Math.hypot(node.cx - closestX, node.cy - closestY);

    if (perpDist < CLEARANCE) {
      const deviation = (CLEARANCE - perpDist) + MARGIN;
      const factor    = 2 * t * (1 - t); // ∈ (0, 0.5]
      const needed    = deviation / factor;

      // cross > 0 → node is RIGHT of directed edge → arc LEFT → positive
      // cross = 0 → node is exactly on the chord → default to arcing LEFT (+)
      const cross     = dx * (node.cy - sy) - dy * (node.cx - sx);
      const candidate = (cross >= 0 ? 1 : -1) * needed;

      if (Math.abs(candidate) > Math.abs(best)) best = candidate;
    }
  }

  return best;
}
