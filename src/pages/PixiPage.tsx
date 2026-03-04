import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PixiCanvas, type PixiStats } from '../pixi/PixiCanvas';
import type { NodeData } from '../pixi/NodeSprite';
import FpsMonitor from '../components/FpsMonitor.tsx';
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
  const [formEditor, setFormEditor] = useState<{
    nodeId: string;
    x: number;
    y: number;
    a: string;
    b: string;
    c: string;
  } | null>(null);

  nodeCountRef.current = nodeCount;

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    const px = new PixiCanvas();
    canvasRef.current = px;

    px.init(containerRef.current, preference).then(() => {
      if (disposed) return;
      readyRef.current = true;
      px.cullingEnabled = culling;
      px.edgeAnimationEnabled = edgeAnim;
      px.hoverEnabled = hover;
      px.setNodeCount(nodeCountRef.current);
      px.onNodeDoubleClick = (d: NodeData) => {
        if (d.type === 'form') {
          const rect = px.getNodeScreenRect(d.id);
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const width = 300;
          const height = 240;
          const left = rect ? rect.x + rect.width + 12 : vw * 0.5 - width * 0.5;
          const top = rect ? rect.y : vh * 0.5 - height * 0.5;
          setFormEditor({
            nodeId: d.id,
            x: Math.max(10, Math.min(vw - width - 10, left)),
            y: Math.max(10, Math.min(vh - height - 10, top)),
            a: d.formA ?? '',
            b: d.formB ?? '',
            c: d.formC ?? '',
          });
          return;
        }
        setModalNode({ type: d.type, data: d as any });
      };
      px.onNodeContextMenu = (x, y, d: NodeData) => setCtxMenu({ x, y, nodeId: d.id });
    });

    const timer = setInterval(() => {
      if (canvasRef.current) setPixiInfo(canvasRef.current.getStats());
    }, 250);

    return () => {
      disposed = true;
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

  const onFormSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formEditor || !canvasRef.current) return;
    canvasRef.current.updateFormNodeData(formEditor.nodeId, {
      a: formEditor.a,
      b: formEditor.b,
      c: formEditor.c,
    });
    setFormEditor(null);
  }, [formEditor]);

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
        <button className="shuffle-btn" onClick={() => canvasRef.current?.addFormNode()}>
          Add Form Node
        </button>
      </div>

      <div ref={containerRef} className="pixi-container" />

      {formEditor && (
        <div className="pixi-form-editor" style={{ left: formEditor.x, top: formEditor.y }}>
          <div className="canvas-form-header">编辑表单节点</div>
          <form className="canvas-form-body" onSubmit={onFormSubmit}>
            <input
              className="form-input"
              placeholder="Field 1"
              value={formEditor.a}
              onChange={(e) => setFormEditor((prev) => (prev ? { ...prev, a: e.target.value } : prev))}
            />
            <input
              className="form-input"
              placeholder="Field 2"
              value={formEditor.b}
              onChange={(e) => setFormEditor((prev) => (prev ? { ...prev, b: e.target.value } : prev))}
            />
            <input
              className="form-input"
              placeholder="Field 3"
              value={formEditor.c}
              onChange={(e) => setFormEditor((prev) => (prev ? { ...prev, c: e.target.value } : prev))}
            />
            <div className="pixi-form-editor-actions">
              <button type="button" className="shuffle-btn" onClick={() => setFormEditor(null)}>
                Cancel
              </button>
              <button type="submit" className="shuffle-btn">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

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
