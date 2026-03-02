import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PixiCanvas, type PixiStats } from '../pixi/PixiCanvas';
import type { NodeData } from '../pixi/NodeSprite';
import FpsMonitor from '../components/FpsMonitor';
import DetailModal from '../components/DetailModal';
import ContextMenu from '../components/ContextMenu';

const NODE_COUNTS = [100, 500, 1000, 2000, 5000];

export default function PixiPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<PixiCanvas | null>(null);
  const readyRef = useRef(false);
  const nodeCountRef = useRef(100);

  const [nodeCount, setNodeCount] = useState(100);
  const [preference, setPreference] = useState<'webgpu' | 'webgl'>('webgpu');
  const [culling, setCulling] = useState(true);
  const [edgeAnim, setEdgeAnim] = useState(true);
  const [hover, setHover] = useState(true);
  const [pixiInfo, setPixiInfo] = useState<PixiStats>({ fps: 0, totalNodes: 0, visibleNodes: 0, edges: 0, rendererType: '', frameTime: 0 });
  const [modalNode, setModalNode] = useState<{ type: string; data: Record<string, any> } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  nodeCountRef.current = nodeCount;

  useEffect(() => {
    if (!containerRef.current) return;
    const px = new PixiCanvas();
    canvasRef.current = px;

    px.init(containerRef.current, preference).then(() => {
      readyRef.current = true;
      px.cullingEnabled = culling;
      px.edgeAnimationEnabled = edgeAnim;
      px.hoverEnabled = hover;
      px.setNodeCount(nodeCountRef.current);
      px.onNodeDoubleClick = (d: NodeData) => setModalNode({ type: d.type, data: d as any });
      px.onNodeContextMenu = (x, y, d: NodeData) => setCtxMenu({ x, y, nodeId: d.id });
    });

    const timer = setInterval(() => {
      if (canvasRef.current) setPixiInfo(canvasRef.current.getStats());
    }, 250);

    return () => {
      clearInterval(timer);
      readyRef.current = false;
      px.destroy();
      canvasRef.current = null;
    };
  }, [preference]);

  useEffect(() => { if (readyRef.current) canvasRef.current?.setNodeCount(nodeCount); }, [nodeCount]);
  useEffect(() => { if (canvasRef.current) canvasRef.current.cullingEnabled = culling; }, [culling]);
  useEffect(() => { if (canvasRef.current) canvasRef.current.edgeAnimationEnabled = edgeAnim; }, [edgeAnim]);
  useEffect(() => { if (canvasRef.current) canvasRef.current.hoverEnabled = hover; }, [hover]);

  const handleCtxAction = useCallback((action: string, nodeId: string) => {
    if (!canvasRef.current) return;
    if (action === 'delete') {
      canvasRef.current.deleteNode(nodeId);
    } else if (action === 'viewDetail') {
      const d = canvasRef.current.getNodeData(nodeId);
      if (d) setModalNode({ type: d.type, data: d as any });
    }
    setCtxMenu(null);
  }, []);

  return (
    <div className="app">
      <Link to="/" className="home-link">Home</Link>

      <FpsMonitor
        nodeCount={pixiInfo.totalNodes}
        edgeCount={pixiInfo.edges}
        rendererType={pixiInfo.rendererType}
        visibleNodes={pixiInfo.visibleNodes}
      />

      <div className="control-panel">
        <div className="panel-title">PixiJS v8 Control</div>

        <div className="panel-section">
          <label className="section-label">Renderer</label>
          <div className="btn-group">
            <button className={preference === 'webgpu' ? 'active' : ''} onClick={() => setPreference('webgpu')}>
              WebGPU
            </button>
            <button className={preference === 'webgl' ? 'active' : ''} onClick={() => setPreference('webgl')}>
              WebGL
            </button>
          </div>
        </div>

        <div className="panel-section">
          <label className="section-label">Node Count</label>
          <div className="btn-group">
            {NODE_COUNTS.map((c) => (
              <button key={c} className={nodeCount === c ? 'active' : ''} onClick={() => setNodeCount(c)}>
                {c >= 1000 ? `${c / 1000}k` : c}
              </button>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <label className="toggle-label">
            <input type="checkbox" checked={culling} onChange={(e) => setCulling(e.target.checked)} />
            Viewport Culling
          </label>
        </div>
        <div className="panel-section">
          <label className="toggle-label">
            <input type="checkbox" checked={edgeAnim} onChange={(e) => setEdgeAnim(e.target.checked)} />
            Edge Particles
          </label>
        </div>
        <div className="panel-section">
          <label className="toggle-label">
            <input type="checkbox" checked={hover} onChange={(e) => setHover(e.target.checked)} />
            Hover Effects
          </label>
        </div>

        <button className="shuffle-btn" onClick={() => canvasRef.current?.shuffle()}>
          Shuffle Layout
        </button>
      </div>

      <div ref={containerRef} className="pixi-container" />

      {modalNode && <DetailModal node={modalNode} onClose={() => setModalNode(null)} />}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x} y={ctxMenu.y} nodeId={ctxMenu.nodeId}
          onClose={() => setCtxMenu(null)} onAction={handleCtxAction}
        />
      )}
    </div>
  );
}
