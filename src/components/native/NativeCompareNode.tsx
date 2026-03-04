import { memo } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';

const getFixedUrl = (seed: number) => `https://picsum.photos/seed/${seed}/400/300`;

const NativeCompareNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, any>;
  const srcA = getFixedUrl(d.imageId);
  const srcB = getFixedUrl(d.imageId2);

  return (
    <div className={`custom-node native-node compare ${selected ? 'selected' : ''}`}>
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
      <div className="node-thumbnail">
        <div className="compare-thumbnail" style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
          <img 
            src={srcA} 
            alt="left" 
            draggable={false} 
            style={{ width: '50%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div className="compare-divider" style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: '#6366f1', transform: 'translateX(-50%)' }} />
          <img 
            src={srcB} 
            alt="right" 
            draggable={false} 
            style={{ width: '50%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
        <div className="compare-badge">VS</div>
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

NativeCompareNode.displayName = 'NativeCompareNode';
export default NativeCompareNode;
