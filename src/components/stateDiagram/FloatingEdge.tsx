import React from 'react';
import {
  useNodes,
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react';

/**
 * Floating edge for the state diagram.
 *
 * Connection points are computed geometrically (circle-boundary intersections)
 * so every arrow exits the source at the exact angle toward its target.
 *
 * Path shape is driven by `data.curvature` (set by layoutStateNodes):
 *
 *   curvature = 0          → straight line  (unidirectional forward edge)
 *   curvature = ±32 ± fan  → gentle arc     (bidirectional pair / parallel fan)
 *   curvature = −130…−250  → tall arc above (back edge, clears all nodes)
 *
 * For the quadratic bezier the control point is offset perpendicularly:
 *   cp = midpoint + (CW-perp-unit) × curvature
 * CW-perp of a right-going vector is "upward", so:
 *   positive curvature → arc above the straight line
 *   negative curvature → arc below  (back edges use negative to go UP because
 *                         for a right→left vector CW-perp points downward)
 *
 * Label placement:
 *   • Driven by `data.labelT` (0–1 along the bezier), default 0.40
 *   • Staggered per-pair-index by layoutStateNodes (0.35, 0.50, 0.62) so
 *     labels on parallel edges don't overlap each other
 *   • Nudged 20 px outward from the arc (away from the chord)
 *
 * Interactive:
 *   • Hover → label scales up slightly and becomes fully opaque
 *   • Selected (click) → stroke thickens, label border turns bright white
 */

const NODE_RADIUS = 40;

function getCenter(pos: { x: number; y: number }) {
  return { cx: pos.x + NODE_RADIUS, cy: pos.y + NODE_RADIUS };
}

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

  // Edge vector and CW-perpendicular unit vector
  const dx  = endPt.x - startPt.x;
  const dy  = endPt.y - startPt.y;
  const len = Math.hypot(dx, dy) || 1;
  // CW perp: (dy/len, −dx/len) — points "left" of the directed edge
  const px  =  dy / len;
  const py  = -dx / len;

  const curvature = (data as { curvature?: number })?.curvature ?? 0;
  // labelT: where along the bezier to anchor the label (0 = source, 1 = target)
  const labelT    = (data as { labelT?: number })?.labelT ?? 0.40;

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (curvature === 0) {
    // ── Straight line ────────────────────────────────────────────────────
    edgePath = `M ${startPt.x} ${startPt.y} L ${endPt.x} ${endPt.y}`;

    // At labelT from source + 20 px perp lift so label floats above the stroke
    labelX = startPt.x + dx * labelT + px * 20;
    labelY = startPt.y + dy * labelT + py * 20;
  } else {
    // ── Quadratic bezier ─────────────────────────────────────────────────
    const midX = (startPt.x + endPt.x) / 2;
    const midY = (startPt.y + endPt.y) / 2;
    const cpx  = midX + px * curvature;
    const cpy  = midY + py * curvature;

    edgePath = `M ${startPt.x} ${startPt.y} Q ${cpx} ${cpy} ${endPt.x} ${endPt.y}`;

    // Bezier point at t=labelT: (1−t)²·P0 + 2·(1−t)·t·CP + t²·P1
    const t1 = labelT;
    const bx  = (1 - t1) * (1 - t1) * startPt.x + 2 * (1 - t1) * t1 * cpx + t1 * t1 * endPt.x;
    const by  = (1 - t1) * (1 - t1) * startPt.y + 2 * (1 - t1) * t1 * cpy + t1 * t1 * endPt.y;

    // Nudge label outward (away from chord) by 20 px
    const outward = curvature > 0 ? 20 : -20;
    labelX = bx + px * outward;
    labelY = by + py * outward;
  }

  const edgeColor = (style as { stroke?: string })?.stroke ?? '#475569';
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
