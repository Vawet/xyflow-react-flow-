import { memo } from 'react';

interface ControlPanelProps {
  nodeCount: number;
  onNodeCountChange: (count: number) => void;
  virtualization: boolean;
  onVirtualizationChange: (v: boolean) => void;
  onShuffle: () => void;
  nodeCounts?: number[];
  particles?: boolean;
  onParticlesChange?: (v: boolean) => void;
  edgeCount?: number;
  onEdgeCountChange?: (count: number) => void;
  edgeCounts?: number[];
}

const DEFAULT_COUNTS = [100, 500, 1000, 2000, 5000];

const DEFAULT_EDGE_COUNTS = [0, 50, 100, 150, 300, 500];

const ControlPanel = memo(({
  nodeCount,
  onNodeCountChange,
  virtualization,
  onVirtualizationChange,
  onShuffle,
  nodeCounts = DEFAULT_COUNTS,
  particles,
  onParticlesChange,
  edgeCount,
  onEdgeCountChange,
  edgeCounts = DEFAULT_EDGE_COUNTS,
}: ControlPanelProps) => {
  return (
    <div className="control-panel">
      <div className="panel-title">React Flow Control</div>

      <div className="panel-section">
        <label className="section-label">Node Count</label>
        <div className="btn-group">
          {nodeCounts.map((count) => (
            <button
              key={count}
              className={nodeCount === count ? 'active' : ''}
              onClick={() => onNodeCountChange(count)}
            >
              {count >= 1000 ? `${count / 1000}k` : count}
            </button>
          ))}
        </div>
      </div>

      {onEdgeCountChange && (
        <div className="panel-section">
          <label className="section-label">Edge Count</label>
          <div className="btn-group">
            {edgeCounts.map((count) => (
              <button
                key={count}
                className={edgeCount === count ? 'active' : ''}
                onClick={() => onEdgeCountChange(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="panel-section">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={virtualization}
            onChange={(e) => onVirtualizationChange(e.target.checked)}
          />
          Virtualization
        </label>
      </div>

      {onParticlesChange && (
        <div className="panel-section">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={particles}
              onChange={(e) => onParticlesChange(e.target.checked)}
            />
            Edge Particles
          </label>
        </div>
      )}

      <button className="shuffle-btn" onClick={onShuffle}>
        Shuffle Layout
      </button>
    </div>
  );
});

ControlPanel.displayName = 'ControlPanel';
export default ControlPanel;
