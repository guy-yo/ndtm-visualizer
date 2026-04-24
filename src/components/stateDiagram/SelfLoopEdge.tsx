import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';

/**
 * Custom self-loop edge — draws an inverted-U arc ABOVE the node.
 *
 * Handle layout in StateNode:
 *   "self-out"  Position.Top, left: 28%  → (nodeX + 22, nodeY)
 *   "self-in"   Position.Top, left: 72%  → (nodeX + 58, nodeY)
 *
 * Both handles sit on the top edge of the 80×80 circle, so:
 *   sourceX < targetX   (left / right of top edge)
 *   sourceY ≈ targetY   (both at node top)
 *
 * Cubic bezier with control points pulled straight up:
 *   M  sourceX sourceY
 *   C  sourceX (sourceY − h),  targetX (targetY − h),  targetX targetY
 * produces a smooth arch above the node.
 *
 * Multiple self-loops on the same node are stacked at increasing heights
 * so each arc is individually readable:
 *   index 0 → arcHeight 48 px  (nearest to node)
 *   index 1 → arcHeight 72 px
 *   index 2 → arcHeight 96 px
 *   …and so on.
 */
export function SelfLoopEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
  markerEnd,
  style,
  data,
}: EdgeProps) {
  const selfLoopIndex = (data as { selfLoopIndex?: number })?.selfLoopIndex ?? 0;
  const arcHeight     = 48 + selfLoopIndex * 24; // 48, 72, 96, 120 …

  const topY = Math.min(sourceY, targetY);

  const edgePath =
    `M ${sourceX} ${sourceY} ` +
    `C ${sourceX} ${topY - arcHeight}, ` +
    `${targetX} ${topY - arcHeight}, ` +
    `${targetX} ${targetY}`;

  // At t = 0.5 a symmetric cubic bezier peaks at topY − 0.75 * arcHeight.
  // Place the label a little above that peak so it clears the arc line.
  const labelX = (sourceX + targetX) / 2;
  const labelY = topY - arcHeight * 0.92;

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              fontSize: 9,
              color: '#94a3b8',
              background: 'rgba(30, 41, 59, 0.92)',
              padding: '1px 5px',
              borderRadius: 3,
              pointerEvents: 'none',
              whiteSpace: 'pre',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            {String(label)}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
