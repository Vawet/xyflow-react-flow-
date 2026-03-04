import { memo, useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useLodLevel, useNodeCount } from '../contexts/ZoomLodContext';
import { useCachedImage } from '../hooks/useCachedImage';
import { getThumbnailUrl } from '../utils/getThumbnailUrl';

const VIDEO_URL = 'https://vjs.zencdn.net/v/oceans.mp4';
const MAX_VIDEOS = 3;
const activeVideos = new Set<string>();

const nodePropsEqual = (prev: NodeProps, next: NodeProps) =>
  prev.id === next.id && prev.selected === next.selected && prev.data === next.data;

const VideoNode = memo(({ id, data, selected }: NodeProps) => {
  const d = data as Record<string, any>;
  const lod = useLodLevel();
  const nodeCount = useNodeCount();
  const lite = nodeCount >= 500;
  const videoRef = useRef<HTMLVideoElement>(null);

  const wantVideo = lod === 'high';
  const [hasSlot, setHasSlot] = useState(false);

  useEffect(() => {
    if (wantVideo && (activeVideos.has(id) || activeVideos.size < MAX_VIDEOS)) {
      activeVideos.add(id);
      setHasSlot(true);
      return () => { activeVideos.delete(id); setHasSlot(false); };
    }
    setHasSlot(false);
  }, [wantVideo, id]);

  const showVideo = wantVideo && hasSlot;

  const posterUrl = useMemo(() => getThumbnailUrl(d.imageId, lod), [lod, d.imageId]);

  const poster = useCachedImage(posterUrl, `${id}:${d.imageId}`);

  const handleMouseEnter = useCallback(() => {
    if (showVideo) {
      videoRef.current?.play().catch(() => {});
    }
  }, [showVideo]);

  const handleMouseLeave = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  const canShowVideo = showVideo && !!poster.src && !poster.error;

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
        className={`node-thumbnail ${!poster.loaded && lod !== 'low' ? 'loading' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* 始终渲染 placeholder 作为背景 */}
        <div className="thumbnail-placeholder video-placeholder" style={{ position: 'absolute', inset: 0 }} />
        
        {/* 视频或海报图覆盖在 placeholder 上 */}
        {lod !== 'low' && canShowVideo ? (
          <video
            ref={videoRef}
            src={VIDEO_URL}
            poster={poster.src}
            muted
            loop
            playsInline
            preload="metadata"
            draggable={false}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
          />
        ) : lod !== 'low' && !poster.error && poster.src && (
          <img 
            src={poster.src} 
            alt={d.title} 
            draggable={false} 
            onError={poster.handleElementError} 
            decoding="sync"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
          />
        )}

        {lod !== 'low' && <div className="video-badge">VIDEO</div>}
        {lod !== 'low' && !poster.src && (
          <div className="img-debug-badge">MISS vid:{String(d.imageId)} {lod}</div>
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

VideoNode.displayName = 'VideoNode';
export default VideoNode;
