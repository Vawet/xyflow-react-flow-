import { useEffect, useRef, useState, memo, useCallback } from 'react';

interface FpsMonitorProps {
  nodeCount: number;
  edgeCount: number;
  rendererType?: string;
  visibleNodes?: number;
}

interface LongTaskInfo {
  duration: number;
  count: number;
  lastAt: number;
}

const FpsMonitor = memo(({ nodeCount, edgeCount, rendererType, visibleNodes }: FpsMonitorProps) => {
  const [fps, setFps] = useState(0);
  const [frameTime, setFrameTime] = useState(0);
  const [longTask, setLongTask] = useState<LongTaskInfo | null>(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const framesRef = useRef(0);
  const longTaskCountRef = useRef(0);
  const longTaskTimerRef = useRef(0);

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

  const handleLongTask = useCallback((entries: PerformanceEntryList) => {
    for (const entry of entries) {
      longTaskCountRef.current++;
      const dur = Math.round(entry.duration);
      const attribution = (entry as any).attribution;
      const source = attribution?.[0]?.containerType || 'unknown';

      console.warn(
        `[LongTask] ${dur}ms | source: ${source} | total: ${longTaskCountRef.current}`,
        entry
      );

      setLongTask({
        duration: dur,
        count: longTaskCountRef.current,
        lastAt: Date.now(),
      });

      clearTimeout(longTaskTimerRef.current);
      longTaskTimerRef.current = window.setTimeout(() => setLongTask(null), 3000);
    }
  }, []);

  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return;
    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) => handleLongTask(list.getEntries()));
      observer.observe({ type: 'longtask', buffered: true });
    } catch {
      return;
    }
    return () => {
      observer?.disconnect();
      clearTimeout(longTaskTimerRef.current);
    };
  }, [handleLongTask]);

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
      {longTask && (
        <div className="fps-stat long-task-warn">
          LongTask: {longTask.duration}ms (x{longTask.count})
        </div>
      )}
    </div>
  );
});

FpsMonitor.displayName = 'FpsMonitor';
export default FpsMonitor;
