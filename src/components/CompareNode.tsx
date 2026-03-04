import { memo, useMemo } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useLodLevel, useNodeCount } from '../contexts/ZoomLodContext';
import { useCachedImage } from '../hooks/useCachedImage';
import { getThumbnailUrl } from '../utils/getThumbnailUrl';

const nodePropsEqual = (prev: NodeProps, next: NodeProps) =>
  prev.selected === next.selected && prev.data === next.data;

const CompareNode = memo(({ id, data, selected }: NodeProps) => {
  const d = data as Record<string, any>;
  const lod = useLodLevel();
  const nodeCount = useNodeCount();
  const lite = nodeCount >= 500;

  const [rawA, rawB] = useMemo(() => [
    getThumbnailUrl(d.imageId, lod),
    getThumbnailUrl(d.imageId2, lod),
  ], [lod, d.imageId, d.imageId2]);

  const imgA = useCachedImage(rawA, `${id}:a:${d.imageId}`);
  const imgB = useCachedImage(rawB, `${id}:b:${d.imageId2}`);
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
        {/* 始终渲染 placeholder 作为背景 */}
        <div className="thumbnail-placeholder compare-placeholder" style={{ position: 'absolute', inset: 0 }} />
        
        {/* 图片加载成功后覆盖在 placeholder 上 */}
        {lod !== 'low' && !hasError && imgA.src && imgB.src && (
          <div className="compare-thumbnail" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <img 
              src={imgA.src} 
              alt="left" 
              draggable={false} 
              onError={imgA.handleElementError} 
              decoding="sync"
            />
            <div className="compare-divider" />
            <img 
              src={imgB.src} 
              alt="right" 
              draggable={false} 
              onError={imgB.handleElementError} 
              decoding="sync"
            />
          </div>
        )}

        {lod !== 'low' && <div className="compare-badge">VS</div>}
        {lod !== 'low' && (!imgA.src || !imgB.src) && (
          <div className="img-debug-badge">MISS cmp:{String(d.imageId)}/{String(d.imageId2)} {lod}</div>
        )}
      </div>
      {lod !== 'low' && (
        <div className="node-body">
          <div className="node-title">{d.title}</div>
          {!lite && (lod === 'high' || lod === 'ultra') && (
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
