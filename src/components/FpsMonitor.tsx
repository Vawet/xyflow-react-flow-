import { useEffect, useRef, memo } from 'react';

interface FpsMonitorProps {
  nodeCount: number;
  edgeCount: number;
  rendererType?: string;
  visibleNodes?: number;
}

const UI_INTERVAL_MS = 400;
const BUSY_THRESHOLD_MS = 600;
const EMA_ALPHA = 0.2;

const FpsMonitor = memo(({ nodeCount, edgeCount, rendererType, visibleNodes }: FpsMonitorProps) => {
  const intervalRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const framesRef = useRef(0);
  const emaFpsRef = useRef(0);
  const lastTickAtRef = useRef(performance.now());
  const lastSampleAtRef = useRef(performance.now());

  const fpsValueRef = useRef<HTMLSpanElement>(null);
  const frameValueRef = useRef<HTMLSpanElement>(null);
  const busyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateColor = (fps: number) => {
      if (!fpsValueRef.current) return;
      fpsValueRef.current.style.color = fps >= 50 ? '#22c55e' : fps >= 30 ? '#eab308' : '#ef4444';
    };

    const updateBusy = (isBusy: boolean) => {
      if (!busyRef.current) return;
      busyRef.current.textContent = isBusy ? 'BUSY' : '';
    };

    const writeStats = (fps: number, frameMs: number) => {
      if (fpsValueRef.current) fpsValueRef.current.textContent = String(Math.max(0, Math.round(fps)));
      if (frameValueRef.current) frameValueRef.current.textContent = `${Math.max(0, Math.round(frameMs * 100) / 100)}ms`;
      updateColor(fps);
    };

    const resetCounters = (now = performance.now()) => {
      framesRef.current = 0;
      emaFpsRef.current = 0;
      lastTickAtRef.current = now;
      lastSampleAtRef.current = now;
      updateBusy(false);
    };

    const tick = () => {
      if (!runningRef.current) return;

      const now = performance.now();
      const frameGap = now - lastTickAtRef.current;
      lastTickAtRef.current = now;
      framesRef.current++;

      updateBusy(frameGap > BUSY_THRESHOLD_MS);

      const interval = now - lastSampleAtRef.current;
      if (interval >= UI_INTERVAL_MS) {
        const sampledFps = (framesRef.current * 1000) / interval;
        if (emaFpsRef.current === 0) {
          emaFpsRef.current = sampledFps;
        } else {
          emaFpsRef.current = emaFpsRef.current * (1 - EMA_ALPHA) + sampledFps * EMA_ALPHA;
        }

        const frameMs = emaFpsRef.current > 0 ? 1000 / emaFpsRef.current : 0;
        writeStats(emaFpsRef.current, frameMs);

        framesRef.current = 0;
        lastSampleAtRef.current = now;
      }
    };

    const start = () => {
      if (runningRef.current) return;
      runningRef.current = true;
      resetCounters();
      intervalRef.current = window.setInterval(tick, 16);
    };

    const stop = () => {
      runningRef.current = false;
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      resetCounters();
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, []);

  return (
    <div className="fps-monitor">
      <div className="fps-value"><span ref={fpsValueRef}>0</span> <span className="fps-unit">FPS</span></div>
      {rendererType && <div className="fps-stat renderer-tag">{rendererType}</div>}
      <div className="fps-stat">
        Nodes: {visibleNodes !== undefined ? `${visibleNodes} / ${nodeCount}` : nodeCount}
      </div>
      <div className="fps-stat">Edges: {edgeCount}</div>
      <div className="fps-stat">Frame: <span ref={frameValueRef}>0ms</span></div>
      <div ref={busyRef} className="fps-stat" style={{ color: '#ef4444', fontWeight: 600 }} />
    </div>
  );
});

FpsMonitor.displayName = 'FpsMonitor';
export default FpsMonitor;
