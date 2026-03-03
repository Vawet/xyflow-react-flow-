import { memo, useMemo } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useLodLevel, useNodeCount } from '../contexts/ZoomLodContext';
import { useCachedImage } from '../hooks/useCachedImage';

const nodePropsEqual = (prev: NodeProps, next: NodeProps) =>
  prev.selected === next.selected && prev.data === next.data;

const CompareNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, any>;
  const lod = useLodLevel();
  const nodeCount = useNodeCount();
  const lite = nodeCount >= 500;

  const [rawA, rawB] = useMemo(() => {
    if (lod === 'low') return ['', ''];
    const w = lod === 'high' ? 140 : 50;
    const h = lod === 'high' ? 180 : 60;
    return [
      `https://picsum.photos/seed/${d.imageId}/${w}/${h}`,
      `https://picsum.photos/seed/${d.imageId2}/${w}/${h}`,
    ];
  }, [lod, d.imageId, d.imageId2]);

  const imgA = useCachedImage(rawA);
  const imgB = useCachedImage(rawB);
  const allLoaded = imgA.loaded && imgB.loaded;
  const hasError = imgA.error || imgB.error;

  return (
    <div className={`custom-node compare lod-${lod} ${selected ? 'selected' : ''}`}>
      {selected && (
        <NodeResizer
          minWidth={200}
          minHeight={180}
          color="#6366f1"
          handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
          lineStyle={{ borderColor: '#6366f1', borderWidth: 1 }}
        />
      )}
      <Handle type="target" position={Position.Left} />
      <div className={`node-thumbnail ${!allLoaded && lod !== 'low' ? 'loading' : ''}`}>
        {lod === 'low' || hasError ? (
          <div className="thumbnail-placeholder compare-placeholder" />
        ) : (
          <div className="compare-thumbnail">
            <img src={imgA.src} alt="left" draggable={false} />
            <div className="compare-divider" />
            <img src={imgB.src} alt="right" draggable={false} />
          </div>
        )}
        {lod !== 'low' && <div className="compare-badge">VS</div>}
      </div>
      {lod !== 'low' && (
        <div className="node-body">
          <div className="node-title">{d.title}</div>
          {!lite && lod === 'high' && (
            <div className="node-tags">
              {(d.tags as string[]).map((tag: string, i: number) => (
                <span key={i} className="tag">{tag}</span>
              ))}
            </div>
          )}
          {!lite && (
            <div className="node-status">
              <span className="credits">{d.credits} 积分</span>
              <span className="gen-time">{d.genTime}</span>
            </div>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}, nodePropsEqual);

CompareNode.displayName = 'CompareNode';
export default CompareNode;
