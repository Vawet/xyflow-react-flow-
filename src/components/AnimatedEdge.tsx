import { memo, useState } from 'react';
import { BaseEdge, getBezierPath, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';

const EDGE_COLORS: Record<string, string> = {
  reference: '#3b82f6',
  variant: '#22c55e',
  fusion: '#f97316',
};

const EDGE_LABELS: Record<string, string> = {
  reference: '参考',
  variant: '变体',
  fusion: '融合',
};

const AnimatedEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) => {
  const [hovered, setHovered] = useState(false);

  const edgeType = (data?.edgeType as string) || 'reference';
  const color = EDGE_COLORS[edgeType] || EDGE_COLORS.reference;
  const label = EDGE_LABELS[edgeType] || '';
  const duration = (data?.duration as number) || 3;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: hovered ? 3 : 1.5,
          opacity: hovered ? 1 : 0.6,
          filter: hovered ? `drop-shadow(0 0 6px ${color})` : 'none',
          transition: 'stroke-width 0.2s, opacity 0.2s, filter 0.2s',
        }}
      />
      <circle r={hovered ? 5 : 3} fill={color} opacity={0.9}>
        <animateMotion dur={`${duration}s`} repeatCount="indefinite" path={edgePath} />
      </circle>
      {hovered && (
        <EdgeLabelRenderer>
          <div
            className="edge-label"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: color,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

AnimatedEdge.displayName = 'AnimatedEdge';
export default AnimatedEdge;
