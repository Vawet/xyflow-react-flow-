import { memo } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';

const getFixedUrl = (seed: number) => `https://picsum.photos/seed/${seed}/400/300`;
const VIDEO_URL = 'https://vjs.zencdn.net/v/oceans.mp4';

const NativeVideoNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, any>;
  const poster = getFixedUrl(d.imageId);

  return (
    <div className={`custom-node native-node ${selected ? 'selected' : ''}`}>
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
        <video
          src={VIDEO_URL}
          poster={poster}
          muted
          loop
          playsInline
          controls={false}
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
          onMouseLeave={(e) => {
            e.currentTarget.pause();
            e.currentTarget.currentTime = 0;
          }}
        />
        <div className="video-badge">VIDEO</div>
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
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

NativeVideoNode.displayName = 'NativeVideoNode';
export default NativeVideoNode;
