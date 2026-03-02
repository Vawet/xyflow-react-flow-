import { useCallback, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  BackgroundVariant,
  SelectionMode,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import ImageNode from './components/ImageNode';
import VideoNode from './components/VideoNode';
import CompareNode from './components/CompareNode';
import AnimatedEdge from './components/AnimatedEdge';
import ControlPanel from './components/ControlPanel';
import FpsMonitor from './components/FpsMonitor';
import DetailModal from './components/DetailModal';
import ContextMenu from './components/ContextMenu';
import { generateNodes, generateEdges } from './utils/dataGenerator';

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
  const [virtualization, setVirtualization] = useState(true);
  const [isShuffling, setIsShuffling] = useState(false);
  const [modalNode, setModalNode] = useState<Node | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();
  const shuffleTimerRef = useRef<number>(0);

  useEffect(() => {
    const newNodes = generateNodes(nodeCount);
    const newEdges = generateEdges(nodeCount);
    setNodes(newNodes);
    setEdges(newEdges);
    setTimeout(() => fitView({ duration: 400 }), 50);
  }, [nodeCount, setNodes, setEdges, fitView]);

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
    <div className={`app ${isShuffling ? 'shuffling' : ''}`}>
      <FpsMonitor nodeCount={nodes.length} edgeCount={edges.length} />
      <ControlPanel
        nodeCount={nodeCount}
        onNodeCountChange={setNodeCount}
        virtualization={virtualization}
        onVirtualizationChange={setVirtualization}
        onShuffle={handleShuffle}
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
        defaultEdgeOptions={{ animated: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#333" gap={24} size={1.5} />
        <Controls position="bottom-left" />
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
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
