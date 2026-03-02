import { memo, useMemo } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useZoomLod, type LodLevel } from '../contexts/ZoomLodContext';

const ImageNode = memo(({ data, selected, width }: NodeProps) => {
  const d = data as Record<string, any>;
  const { zoom } = useZoomLod();
  const nodeW = width || 260;
  const effectiveW = nodeW * zoom;
  const lod: LodLevel = effectiveW >= 150 ? 'high' : effectiveW >= 50 ? 'medium' : 'low';

  const imgSrc = useMemo(() => {
    if (lod === 'low') return '';
    const w = lod === 'high' ? 280 : 80;
    const h = lod === 'high' ? 180 : 50;
    return `https://picsum.photos/seed/${d.imageId}/${w}/${h}`;
  }, [lod, d.imageId]);

  return (
    <div className={`custom-node lod-${lod} ${selected ? 'selected' : ''}`}>
      {selected && (
        <NodeResizer
          minWidth={160}
          minHeight={180}
          color="#6366f1"
          handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
          lineStyle={{ borderColor: '#6366f1', borderWidth: 1 }}
        />
      )}
      <Handle type="target" position={Position.Left} />
      <div className="node-thumbnail">
        {lod === 'low' ? (
          <div className="thumbnail-placeholder" />
        ) : (
          <img src={imgSrc} alt={d.title} loading="lazy" draggable={false} />
        )}
      </div>
      {lod !== 'low' && (
        <div className="node-body">
          <div className="node-title">{d.title}</div>
          {lod === 'high' && (
            <div className="node-tags">
              {(d.tags as string[]).map((tag: string, i: number) => (
                <span key={i} className="tag">{tag}</span>
              ))}
            </div>
          )}
          <div className="node-status">
            <span className="credits">{d.credits} 积分</span>
            <span className="gen-time">{d.genTime}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${d.progress}%` }} />
          </div>
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

ImageNode.displayName = 'ImageNode';
export default ImageNode;
