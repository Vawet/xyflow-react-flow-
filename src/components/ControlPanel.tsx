import { memo } from 'react';

interface ControlPanelProps {
  nodeCount: number;
  onNodeCountChange: (count: number) => void;
  virtualization: boolean;
  onVirtualizationChange: (v: boolean) => void;
  onShuffle: () => void;
}

const NODE_COUNTS = [100, 500, 1000, 2000];

const ControlPanel = memo(({
  nodeCount,
  onNodeCountChange,
  virtualization,
  onVirtualizationChange,
  onShuffle,
}: ControlPanelProps) => {
  return (
    <div className="control-panel">
      <div className="panel-title">Control Panel</div>

      <div className="panel-section">
        <label className="section-label">Node Count</label>
        <div className="btn-group">
          {NODE_COUNTS.map((count) => (
            <button
              key={count}
              className={nodeCount === count ? 'active' : ''}
              onClick={() => onNodeCountChange(count)}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

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

      <button className="shuffle-btn" onClick={onShuffle}>
        Shuffle Layout
      </button>
    </div>
  );
});

ControlPanel.displayName = 'ControlPanel';
export default ControlPanel;
