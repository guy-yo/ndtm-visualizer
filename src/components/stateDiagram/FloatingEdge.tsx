import React from 'react';
import {
  useNodes,
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react';
import { NODE_RADIUS, computeEdgeCurvature } from './edgeCurvature';

/**
 * Floating edge for the state diagram.
 *
 * Connection points are computed geometrically (circle-boundary intersections)
 * so every arrow exits the source at the exact angle toward its target.
 *
 * Curvature is computed LIVE from actual node positions every render via
 * computeEdgeCurvature (see edgeCurvature.ts):
 *
 *   hasMirror = true   → bidirectional pair: proportional arc so the two
 *                        directions separate on opposite sides (CW-perp)
 *   hasMirror = false  → scan every other node for path interference;
 *                        arc away with enough offset to clear each blocker
 *
 * Because curvature is recalculated on every render (useNodes() returns live
 * positions), the arc updates in real-time as the user drags any node.
 */

function getCenter(pos: { x: number; y: number }) {
  return { cx: pos.x + NODE_RADIUS, cy: pos.y + NODE_RADIUS };
}

/** Point where a line from (cx,cy) toward (px,py) exits the node circle. */
function circleEdge(cx: number, cy: number, px: number, py: number) {
  const dx = px - cx;
  const dy = py - cy;
  const d  = Math.hypot(dx, dy) || 1;
  return { x: cx + (dx / d) * (NODE_RADIUS + 1), y: cy + (dy / d) * (NODE_RADIUS + 1) };
}

export function FloatingEdge({
  id,
  source,
  target,
  data,
  label,
  markerEnd,
  style,
  selected,
}: EdgeProps) {
  const [hovered, setHovered] = React.useState(false);

  const nodes   = useNodes();
  const srcNode = nodes.find((n) => n.id === source);
  const tgtNode = nodes.find((n) => n.id === target);
  if (!srcNode || !tgtNode) return null;

  const src = getCenter(srcNode.position);
  const tgt = getCenter(tgtNode.position);

  const startPt = circleEdge(src.cx, src.cy, tgt.cx, tgt.cy);
  const endPt   = circleEdge(tgt.cx, tgt.cy, src.cx, src.cy);

  // Raw edge vector (not normalised) and length
  const dx  = endPt.x - startPt.x;
  const dy  = endPt.y - startPt.y;
  const len = Math.hypot(dx, dy) || 1;

  // CW-perpendicular unit vector  (px, py):
  //   positive curvature → arc in (px,py) direction
  //   For a rightward edge: (px,py) = (0,−1) = upward on screen
  const px =  dy / len;
  const py = -dx / len;

  const hasMirror = (data as { hasMirror?: boolean })?.hasMirror ?? false;
  const labelT    = (data as { labelT?:    number  })?.labelT    ?? 0.40;

  // Delegate all curvature math to the pure utility (testable independently)
  const others = nodes
    .filter((n) => n.id !== source && n.id !== target)
    .map((n) => ({ id: n.id, ...getCenter(n.position) }));

  const curvaturePx = computeEdgeCurvature(
    startPt.x, startPt.y,
    endPt.x,   endPt.y,
    hasMirror,
    others,
  );

  // ── Build SVG path ───────────────────────────────────────────────────────
  let edgePath: string;
  let labelX:   number;
  let labelY:   number;

  if (curvaturePx === 0) {
    // Straight line
    edgePath = `M ${startPt.x} ${startPt.y} L ${endPt.x} ${endPt.y}`;
    labelX   = startPt.x + dx * labelT + px * 20;
    labelY   = startPt.y + dy * labelT + py * 20;
  } else {
    // Quadratic bezier
    const midX = (startPt.x + endPt.x) / 2;
    const midY = (startPt.y + endPt.y) / 2;
    const cpx  = midX + px * curvaturePx;
    const cpy  = midY + py * curvaturePx;

    edgePath = `M ${startPt.x} ${startPt.y} Q ${cpx} ${cpy} ${endPt.x} ${endPt.y}`;

    // Label position: bezier point at t = labelT
    const t1  = labelT;
    const bx  = (1-t1)*(1-t1)*startPt.x + 2*(1-t1)*t1*cpx + t1*t1*endPt.x;
    const by  = (1-t1)*(1-t1)*startPt.y + 2*(1-t1)*t1*cpy + t1*t1*endPt.y;
    // Nudge label 20 px outward from chord
    const outward = curvaturePx > 0 ? 20 : -20;
    labelX = bx + px * outward;
    labelY = by + py * outward;
  }

  const edgeColor  = (style as { stroke?: string })?.stroke ?? '#475569';
  const strokeWidth = selected
    ? 2.5
    : ((style as { strokeWidth?: number })?.strokeWidth ?? 1.5);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ ...style, strokeWidth }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px) scale(${hovered ? 1.08 : 1})`,
              fontSize: selected ? 10 : 9,
              color: '#94a3b8',
              background: 'rgba(30, 41, 59, 0.93)',
              padding: '1px 5px',
              borderRadius: 3,
              borderLeft: `3px solid ${selected ? '#e2e8f0' : edgeColor}`,
              pointerEvents: 'all',
              cursor: 'default',
              whiteSpace: 'pre',
              textAlign: 'left',
              lineHeight: 1.5,
              opacity: hovered ? 1 : 0.82,
              zIndex: hovered ? 50 : undefined,
              transition: 'opacity 0.12s, transform 0.12s',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {String(label)}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
