import { memo, useMemo } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useLodLevel, useNodeCount } from '../contexts/ZoomLodContext';
import { useCachedImage } from '../hooks/useCachedImage';
import { getThumbnailUrl } from '../utils/getThumbnailUrl';

const nodePropsEqual = (prev: NodeProps, next: NodeProps) =>
  prev.id === next.id &&
  prev.selected === next.selected &&
  prev.dragging === next.dragging &&
  prev.data === next.data;

const ImageNode = memo(({ id, data, selected }: NodeProps) => {
  const d = data as Record<string, any>;
  const lod = useLodLevel();
  const nodeCount = useNodeCount();
  const lite = nodeCount >= 500;

  const rawUrl = useMemo(() => getThumbnailUrl(d.imageId, lod), [lod, d.imageId]);

  const { src, loaded, error, handleElementError } = useCachedImage(rawUrl, `${id}:${d.imageId}`);

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
      <div className={`node-thumbnail ${!loaded && lod !== 'low' ? 'loading' : ''}`}>
        {/* 始终渲染 placeholder 作为背景，避免图片加载/切换时的闪烁 */}
        <div className="thumbnail-placeholder" style={{ position: 'absolute', inset: 0 }} />
        
        {/* 图片加载成功后覆盖在 placeholder 上 */}
        {src && lod !== 'low' && !error && (
          <img 
            src={src} 
            alt={d.title} 
            draggable={false} 
            onError={handleElementError} 
            loading="eager"
            decoding="sync"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        
        {lod !== 'low' && !src && (
          <div className="img-debug-badge">MISS img:{String(d.imageId)} {lod}</div>
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

ImageNode.displayName = 'ImageNode';
export default ImageNode;
