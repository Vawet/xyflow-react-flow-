import { memo, useRef, useCallback, useMemo } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useZoomLod, type LodLevel } from '../contexts/ZoomLodContext';

const VIDEO_URL = 'https://vjs.zencdn.net/v/oceans.mp4';

const VideoNode = memo(({ data, selected, width }: NodeProps) => {
  const d = data as Record<string, any>;
  const { zoom, nodeCount } = useZoomLod();
  const nodeW = width || 260;
  const effectiveW = nodeW * zoom;
  const lod: LodLevel = effectiveW >= 150 ? 'high' : effectiveW >= 50 ? 'medium' : 'low';
  const lite = nodeCount >= 500;
  const videoRef = useRef<HTMLVideoElement>(null);

  const posterSrc = useMemo(() => {
    if (lod === 'low') return '';
    const w = lod === 'high' ? 280 : 80;
    const h = lod === 'high' ? 180 : 50;
    return `https://picsum.photos/seed/${d.imageId}/${w}/${h}`;
  }, [lod, d.imageId]);

  const handleMouseEnter = useCallback(() => {
    if (lod === 'high') {
      videoRef.current?.play().catch(() => {});
    }
  }, [lod]);

  const handleMouseLeave = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

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
      <div
        className="node-thumbnail"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {lod === 'low' ? (
          <div className="thumbnail-placeholder video-placeholder" />
        ) : lod === 'high' ? (
          <video
            ref={videoRef}
            src={VIDEO_URL}
            poster={posterSrc}
            muted
            loop
            playsInline
            preload="metadata"
            draggable={false}
          />
        ) : (
          <img src={posterSrc} alt={d.title} loading="lazy" draggable={false} />
        )}
        {lod !== 'low' && <div className="video-badge">VIDEO</div>}
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
});

VideoNode.displayName = 'VideoNode';
export default VideoNode;
