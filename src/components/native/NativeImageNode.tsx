import { memo } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';

// 使用固定分辨率
const getFixedUrl = (seed: number) => `https://picsum.photos/seed/${seed}/400/300`;

const nodePropsEqual = (prev: NodeProps, next: NodeProps) =>
  prev.id === next.id &&
  prev.selected === next.selected &&
  prev.dragging === next.dragging &&
  prev.data === next.data;

const NativeImageNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, any>;
  const src = getFixedUrl(d.imageId);

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
      {/* 添加背景色，防止图片加载/解码时的白色闪烁 */}
      <div className="node-thumbnail" style={{ backgroundColor: '#2a2a4a' }}>
        <img 
          src={src} 
          alt={d.title} 
          draggable={false} 
          loading="eager" // 立即加载
          decoding="sync" // 同步解码，减少绘制时的闪烁
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', 
            display: 'block',
            // 移除强制硬件加速，只在 CSS 中对 dragging 状态应用
            backfaceVisibility: 'hidden'
          }}
        />
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
}, nodePropsEqual);

NativeImageNode.displayName = 'NativeImageNode';
export default NativeImageNode;
