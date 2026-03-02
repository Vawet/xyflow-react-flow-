import { memo } from 'react';

interface DetailModalProps {
  node: { type?: string; data: Record<string, any> };
  onClose: () => void;
}

const VIDEO_URL = 'https://www.w3schools.com/html/mov_bbb.mp4';

const DetailModal = memo(({ node, onClose }: DetailModalProps) => {
  const d = node.data as Record<string, any>;
  const isVideo = node.type === 'video';
  const isCompare = node.type === 'compare';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="modal-media">
          {isVideo ? (
            <video
              src={VIDEO_URL}
              controls
              autoPlay
              muted
              style={{ width: '100%', borderRadius: '12px 12px 0 0' }}
            />
          ) : isCompare ? (
            <div className="modal-compare">
              <img src={`https://picsum.photos/seed/${d.imageId}/400/300`} alt="A" />
              <img src={`https://picsum.photos/seed/${d.imageId2}/400/300`} alt="B" />
            </div>
          ) : (
            <img
              src={`https://picsum.photos/seed/${d.imageId}/800/500`}
              alt={d.title}
              style={{ width: '100%', borderRadius: '12px 12px 0 0', display: 'block' }}
            />
          )}
        </div>

        <div className="modal-info">
          <h2>{d.title}</h2>
          <div className="modal-tags">
            {(d.tags as string[]).map((tag: string, i: number) => (
              <span key={i} className="tag">{tag}</span>
            ))}
          </div>
          <div className="modal-stats">
            <div className="stat-item">
              <span className="stat-label">Credits</span>
              <span className="stat-value">{d.credits}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Gen Time</span>
              <span className="stat-value">{d.genTime}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Progress</span>
              <span className="stat-value">{d.progress}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

DetailModal.displayName = 'DetailModal';
export default DetailModal;
