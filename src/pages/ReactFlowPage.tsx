import { useCallback, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useOnViewportChange,
  BackgroundVariant,
  SelectionMode,
  type Node,
  type NodeChange,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NodeCountContext, LodLevelContext, ParticlesContext } from '../contexts/ZoomLodContext';
import type { LodLevel } from '../contexts/ZoomLodContext';

import ImageNode from '../components/ImageNode';
import VideoNode from '../components/VideoNode';
import CompareNode from '../components/CompareNode';
import FormCanvasNode from '../components/FormCanvasNode';
import AnimatedEdge from '../components/AnimatedEdge';
import ControlPanel from '../components/ControlPanel';
import FpsMonitor from '../components/FpsMonitor.tsx';
import DetailModal from '../components/DetailModal';
import ContextMenu from '../components/ContextMenu';
import { generateNodes, generateEdges } from '../utils/dataGenerator';
import { preloadPool, preloadImage } from '../utils/imageCache';
import { getThumbnailUrl } from '../utils/getThumbnailUrl';

const nodeTypes = {
  image: ImageNode,
  video: VideoNode,
  compare: CompareNode,
  form: FormCanvasNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
};

function FlowCanvas() {
  const [nodeCount, setNodeCount] = useState(100);
  const [edgeMax, setEdgeMax] = useState(150);
  const [virtualization, setVirtualization] = useState(true);
  const [particles, setParticles] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [modalNode, setModalNode] = useState<Node | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  const [nodes, setNodes, onNodesChangeRaw] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();
  const shuffleTimerRef = useRef<number>(0);

  const pendingChangesRef = useRef<NodeChange[]>([]);
  const pendingDragMapRef = useRef(new Map<string, NodeChange>());
  const rafIdRef = useRef(0);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const hasDrag = changes.some(c => c.type === 'position' && c.dragging);
    if (!hasDrag) {
      onNodesChangeRaw(changes);
      return;
    }
    for (const c of changes) {
      if (c.type === 'position' && c.dragging && 'id' in c) {
        pendingDragMapRef.current.set(c.id, c);
      } else {
        pendingChangesRef.current.push(c);
      }
    }
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = 0;
        const batch = [
          ...pendingChangesRef.current,
          ...pendingDragMapRef.current.values(),
        ];
        pendingChangesRef.current = [];
        pendingDragMapRef.current.clear();
        if (batch.length) onNodesChangeRaw(batch);
      });
    }
  }, [onNodesChangeRaw]);

  useEffect(() => {
    return () => { cancelAnimationFrame(rafIdRef.current); };
  }, []);

  const [lodLevel, setLodLevel] = useState<LodLevel>('high');
  const lodRef = useRef<LodLevel>('high');
  const viewportRef = useRef({ x: 0, y: 0, zoom: 1 });

  useOnViewportChange({
    onChange: useCallback((vp: { x: number; y: number; zoom: number }) => {
      const z = vp.zoom || 1;
      viewportRef.current = { x: vp.x || 0, y: vp.y || 0, zoom: z };
      const next: LodLevel = z >= 1.5 ? 'ultra' : z >= 0.5 ? 'high' : z >= 0.2 ? 'medium' : 'low';
      if (lodRef.current !== next) {
        lodRef.current = next;
        setLodLevel(next);
      }
    }, []),
  });

  useEffect(() => {
    preloadPool(
      Array.from({ length: 30 }, (_, i) => i),
      [{ w: 640, h: 360 }],
    );
  }, []);

  useEffect(() => {
    const newNodes = generateNodes(nodeCount);
    const formNode: Node = {
      id: 'canvas-form-node',
      type: 'form',
      position: { x: 80, y: 80 },
      style: { width: 290, height: 240 },
      data: {
        title: '拖拽这个表单节点',
        tags: [],
        credits: 0,
        genTime: '-',
        progress: 0,
        imageId: 0,
        imageId2: 1,
      },
    };
    const newEdges = generateEdges(nodeCount, edgeMax);
    newEdges.unshift(
      { id: 'edge-form-0', source: 'canvas-form-node', target: 'node-0', type: 'animated', data: { edgeType: 'reference', duration: 2.4 } },
      { id: 'edge-form-1', source: 'node-1', target: 'canvas-form-node', type: 'animated', data: { edgeType: 'variant', duration: 2.7 } },
    );
    setNodes([formNode, ...newNodes]);
    setEdges(newEdges);
    setTimeout(() => fitView({ duration: 400 }), 50);
  }, [nodeCount, edgeMax, setNodes, setEdges, fitView]);

  useEffect(() => {
    if (!virtualization || !nodes.length) return;
    const timer = window.setTimeout(() => {
      const { x, y, zoom } = viewportRef.current;
      if (zoom <= 0) return;

      const margin = 480;
      const worldW = window.innerWidth / zoom;
      const worldH = window.innerHeight / zoom;
      const left = (-x) / zoom - margin;
      const top = (-y) / zoom - margin;
      const right = left + worldW + margin * 2;
      const bottom = top + worldH + margin * 2;

      const prefetchLod: LodLevel = lodLevel === 'ultra' ? 'high' : lodLevel;
      let warmed = 0;
      for (const node of nodes) {
        if (warmed >= 120) break;
        const style = (node.style as Record<string, unknown> | undefined) ?? {};
        const w = Number(style.width ?? 260);
        const h = Number(style.height ?? 280);
        const nx = node.position.x;
        const ny = node.position.y;
        if (nx + w < left || nx > right || ny + h < top || ny > bottom) continue;

        const d = node.data as Record<string, unknown>;
        if (typeof d.imageId === 'number') preloadImage(getThumbnailUrl(d.imageId, prefetchLod));
        if (node.type === 'compare' && typeof d.imageId2 === 'number') preloadImage(getThumbnailUrl(d.imageId2, prefetchLod));
        warmed++;
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [nodes, lodLevel, virtualization]);

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    setModalNode(node);
  }, []);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
  }, []);

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleShuffle = useCallback(() => {
    const cols = 10;
    const maxX = Math.ceil(nodeCount / cols) * 300;
    const maxY = Math.ceil(nodeCount / cols) * 420;

    setIsShuffling(true);
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        position: {
          x: Math.random() * maxX,
          y: Math.random() * maxY,
        },
      })),
    );

    clearTimeout(shuffleTimerRef.current);
    shuffleTimerRef.current = window.setTimeout(() => {
      setIsShuffling(false);
    }, 900);
  }, [nodeCount, setNodes]);

  const handleContextAction = useCallback(
    (action: string, nodeId: string) => {
      switch (action) {
        case 'delete':
          setNodes((nds) => nds.filter((n) => n.id !== nodeId));
          setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
          break;
        case 'viewDetail': {
          const node = nodes.find((n) => n.id === nodeId);
          if (node) setModalNode(node);
          break;
        }
        case 'duplicate': {
          const node = nodes.find((n) => n.id === nodeId);
          if (node) {
            const newNode: Node = {
              ...node,
              id: `node-dup-${Date.now()}`,
              position: { x: node.position.x + 40, y: node.position.y + 40 },
            };
            setNodes((nds) => [...nds, newNode]);
          }
          break;
        }
      }
      setContextMenu(null);
    },
    [nodes, setNodes, setEdges],
  );

  const handleAddFormNode = useCallback(() => {
    const id = `canvas-form-node-${Date.now()}`;
    const formNode: Node = {
      id,
      type: 'form',
      position: { x: 140 + Math.random() * 360, y: 120 + Math.random() * 260 },
      style: { width: 290, height: 240 },
      data: {
        title: '新建表单节点',
        tags: [],
        credits: 0,
        genTime: '-',
        progress: 0,
        imageId: 0,
        imageId2: 1,
      },
    };

    const target = nodes.find((n) => n.id.startsWith('node-'));
    const newEdge: Edge | null = target
      ? {
          id: `edge-${id}-${target.id}`,
          source: id,
          target: target.id,
          type: 'animated',
          data: { edgeType: 'reference', duration: 2.6 },
        }
      : null;

    setNodes((prev) => [...prev, formNode]);
    if (newEdge) {
      setEdges((prev) => [...prev, newEdge]);
    }
  }, [nodes, setNodes, setEdges]);

  return (
    <NodeCountContext.Provider value={nodeCount}>
    <LodLevelContext.Provider value={lodLevel}>
    <ParticlesContext.Provider value={particles}>
    <div className={`app ${isShuffling ? 'shuffling' : ''} lod-${lodLevel}`}>
      <Link to="/" className="home-link">Home</Link>
      <FpsMonitor nodeCount={nodes.length} edgeCount={edges.length} rendererType="HTML/DOM + SVG" />
      <ControlPanel
        nodeCount={nodeCount}
        onNodeCountChange={setNodeCount}
        edgeCount={edgeMax}
        onEdgeCountChange={setEdgeMax}
        virtualization={virtualization}
        onVirtualizationChange={setVirtualization}
        onShuffle={handleShuffle}
        particles={particles}
        onParticlesChange={setParticles}
        onAddFormNode={handleAddFormNode}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onlyRenderVisibleElements={virtualization}
        fitView
        selectionOnDrag
        panOnDrag={[1, 2]}
        selectionMode={SelectionMode.Partial}
        minZoom={0.02}
        maxZoom={2}
        defaultEdgeOptions={{ animated: false }}
        elevateNodesOnSelect={false}
        nodesFocusable={false}
        edgesFocusable={false}
        nodesConnectable
      >
        {lodLevel !== 'high' || nodeCount < 500 ? <Background variant={BackgroundVariant.Dots} color="#333" gap={24} size={1.5} /> : null}
        <Controls position="bottom-left" />
        {nodeCount < 1000 && (
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'video') return '#f97316';
              if (node.type === 'compare') return '#22c55e';
              return '#6366f1';
            }}
            maskColor="rgba(0, 0, 0, 0.75)"
            style={{ background: '#12121f' }}
            pannable
            zoomable
          />
        )}
      </ReactFlow>

      {modalNode && <DetailModal node={modalNode} onClose={() => setModalNode(null)} />}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}
    </div>
    </ParticlesContext.Provider>
    </LodLevelContext.Provider>
    </NodeCountContext.Provider>
  );
}

export default function ReactFlowPage() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
