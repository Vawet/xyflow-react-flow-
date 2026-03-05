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
  addEdge,
  Connection,
  BackgroundVariant,
  SelectionMode,
  type Node,
  type NodeChange,
  type Edge,
  type Viewport,
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
  const [virtualization, setVirtualization] = useState(true); // 默认开启官方虚拟化
  const [particles, setParticles] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [modalNode, setModalNode] = useState<Node | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  const [nodes, setNodes, onNodesChangeRaw] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView, getNodes, getEdges, getViewport } = useReactFlow();
  const shuffleTimerRef = useRef<number>(0);
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChangeRaw(changes);
  }, [onNodesChangeRaw]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const [lodLevel, setLodLevel] = useState<LodLevel>('high');
  const lodRef = useRef<LodLevel>('high');
  const viewportRef = useRef({ x: 0, y: 0, zoom: 1 });
  
  // 标记是否正在移动/缩放
  const isMovingRef = useRef(false);

  // 核心剔除逻辑：暂时禁用以排查性能问题
  /*
  const cullElements = useCallback((viewport: { x: number; y: number; zoom: number }, enableVirtualization: boolean) => {
    // ... (代码省略，暂时注释掉以恢复原生性能)
  }, [getNodes, getEdges, setNodes, setEdges]);
  */

  useOnViewportChange({
    onChange: useCallback((vp: { x: number; y: number; zoom: number }) => {
      const z = vp.zoom || 1;
      viewportRef.current = { x: vp.x || 0, y: vp.y || 0, zoom: z };
      
      if (isMovingRef.current) return;

      const next: LodLevel = z >= 1.5 ? 'ultra' : z >= 0.5 ? 'high' : z >= 0.2 ? 'medium' : 'low';
      if (lodRef.current !== next) {
        lodRef.current = next;
        setLodLevel(next);
      }

      // 暂时禁用手动剔除，完全依赖 React Flow 原生虚拟化
      // const now = performance.now();
      // if (now - lastCullTimeRef.current > 100) {
      //   lastCullTimeRef.current = now;
      //   cullElements(vp, virtualization);
      // }

    }, [virtualization]), 
  });

  // 处理移动开始
  const onMoveStart = useCallback(() => {
    isMovingRef.current = true;
    const container = document.querySelector('.react-flow-page .react-flow');
    if (container) container.classList.add('hiding-edges');
  }, []);

  // 处理移动结束
  const onMoveEnd = useCallback(() => {
    isMovingRef.current = false;
    const container = document.querySelector('.react-flow-page .react-flow');
    if (container) container.classList.remove('hiding-edges');
    
    const vp = getViewport();
    const z = vp.zoom || 1;
    const next: LodLevel = z >= 1.5 ? 'ultra' : z >= 0.5 ? 'high' : z >= 0.2 ? 'medium' : 'low';
    if (lodRef.current !== next) {
      lodRef.current = next;
      setLodLevel(next);
    }
    // cullElements(vp, virtualization);
  }, [getViewport, virtualization]);

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

    // setTimeout(() => {
    //   const vp = getViewport();
    //   cullElements(vp, virtualization);
    // }, 100);

  }, [nodeCount, edgeMax, setNodes, setEdges, fitView, getViewport, virtualization]);

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
    <div className={`app react-flow-page ${isShuffling ? 'shuffling' : ''} lod-${lodLevel}`}>
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
        // 恢复官方虚拟化逻辑，因为它比手动计算更高效
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
        onConnect={onConnect}
        onMoveStart={onMoveStart}
        onMoveEnd={onMoveEnd}
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
