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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NodeCountContext, LodLevelContext, ParticlesContext } from '../contexts/ZoomLodContext';
import type { LodLevel } from '../contexts/ZoomLodContext';

import ImageNode from '../components/ImageNode';
import VideoNode from '../components/VideoNode';
import CompareNode from '../components/CompareNode';
import AnimatedEdge from '../components/AnimatedEdge';
import ControlPanel from '../components/ControlPanel';
import FpsMonitor from '../components/FpsMonitor';
import DetailModal from '../components/DetailModal';
import ContextMenu from '../components/ContextMenu';
import { generateNodes, generateEdges } from '../utils/dataGenerator';
import { preloadPool } from '../utils/imageCache';

const nodeTypes = {
  image: ImageNode,
  video: VideoNode,
  compare: CompareNode,
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
  const rafIdRef = useRef(0);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const hasDrag = changes.some(c => c.type === 'position' && c.dragging);
    if (!hasDrag) {
      onNodesChangeRaw(changes);
      return;
    }
    pendingChangesRef.current.push(...changes);
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = 0;
        const batch = pendingChangesRef.current;
        pendingChangesRef.current = [];
        if (batch.length) onNodesChangeRaw(batch);
      });
    }
  }, [onNodesChangeRaw]);

  useEffect(() => {
    return () => { cancelAnimationFrame(rafIdRef.current); };
  }, []);

  const [lodLevel, setLodLevel] = useState<LodLevel>('high');
  const lodRef = useRef<LodLevel>('high');

  useOnViewportChange({
    onChange: useCallback(({ zoom: z }: { zoom: number }) => {
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
    const newEdges = generateEdges(nodeCount, edgeMax);
    setNodes(newNodes);
    setEdges(newEdges);
    setTimeout(() => fitView({ duration: 400 }), 50);
  }, [nodeCount, edgeMax, setNodes, setEdges, fitView]);

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
        onlyRenderVisibleElements
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
        nodesConnectable={false}
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
