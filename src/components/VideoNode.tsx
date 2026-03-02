import { memo, useRef, useCallback } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';

const VIDEO_URL = 'https://www.w3schools.com/html/mov_bbb.mp4';

const VideoNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, any>;
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = useCallback(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  return (
    <div className={`custom-node ${selected ? 'selected' : ''}`}>
      <NodeResizer
        minWidth={160}
        minHeight={180}
        isVisible={selected}
        color="#6366f1"
        handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
        lineStyle={{ borderColor: '#6366f1', borderWidth: 1 }}
      />
      <Handle type="target" position={Position.Left} />
      <div
        className="node-thumbnail"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <video
          ref={videoRef}
          src={VIDEO_URL}
          poster={`https://picsum.photos/seed/${d.imageId}/280/180`}
          muted
          loop
          playsInline
          preload="none"
          draggable={false}
        />
        <div className="video-badge">VIDEO</div>
        <div className="node-hover-actions">
          <button className="action-btn" title="下载">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button className="action-btn" title="删除">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
          <button className="action-btn" title="重新生成">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
          <button className="action-btn" title="查看大图">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          </button>
        </div>
      </div>
      <div className="node-body">
        <div className="node-title">{d.title}</div>
        <div className="node-tags">
          {(d.tags as string[]).map((tag: string, i: number) => (
            <span key={i} className="tag">{tag}</span>
          ))}
        </div>
        <div className="node-status">
          <span className="credits">{d.credits} 积分</span>
          <span className="gen-time">{d.genTime}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${d.progress}%` }} />
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

VideoNode.displayName = 'VideoNode';
export default VideoNode;
