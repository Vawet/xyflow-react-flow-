import { useEffect, useRef, useState, memo } from 'react';

interface FpsMonitorProps {
  nodeCount: number;
  edgeCount: number;
  rendererType?: string;
  visibleNodes?: number;
}

const FpsMonitor = memo(({ nodeCount, edgeCount, rendererType, visibleNodes }: FpsMonitorProps) => {
  const [fps, setFps] = useState(0);
  const [frameTime, setFrameTime] = useState(0);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const framesRef = useRef(0);

  useEffect(() => {
    const loop = () => {
      framesRef.current++;
      const now = performance.now();
      const delta = now - lastTimeRef.current;

      if (delta >= 1000) {
        setFps(Math.round((framesRef.current * 1000) / delta));
        setFrameTime(Math.round((delta / framesRef.current) * 100) / 100);
        framesRef.current = 0;
        lastTimeRef.current = now;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const fpsColor = fps >= 50 ? '#22c55e' : fps >= 30 ? '#eab308' : '#ef4444';

  return (
    <div className="fps-monitor">
      <div className="fps-value" style={{ color: fpsColor }}>{fps} <span className="fps-unit">FPS</span></div>
      {rendererType && <div className="fps-stat renderer-tag">{rendererType}</div>}
      <div className="fps-stat">
        Nodes: {visibleNodes !== undefined ? `${visibleNodes} / ${nodeCount}` : nodeCount}
      </div>
      <div className="fps-stat">Edges: {edgeCount}</div>
      <div className="fps-stat">Frame: {frameTime}ms</div>
    </div>
  );
});

FpsMonitor.displayName = 'FpsMonitor';
export default FpsMonitor;
