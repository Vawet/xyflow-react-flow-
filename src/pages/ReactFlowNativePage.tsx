import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  useOnViewportChange,
  addEdge,
  type Node,
  type Edge,
  type NodeTypes,
  type Viewport,
  type Connection,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import NativeImageNode from '../components/native/NativeImageNode';
import NativeCompareNode from '../components/native/NativeCompareNode';
import NativeVideoNode from '../components/native/NativeVideoNode';
import FormCanvasNode from '../components/FormCanvasNode';
import ControlPanel from '../components/ControlPanel';
import FpsMonitor from '../components/FpsMonitor';
import { generateNodes, generateEdges } from '../utils/dataGenerator';
import { NodeCountContext, ParticlesContext } from '../contexts/ZoomLodContext';

const nodeTypes: NodeTypes = {
  image: NativeImageNode,
  compare: NativeCompareNode,
  video: NativeVideoNode,
  form: FormCanvasNode,
};

function FlowCanvas() {
  const { setNodes, setEdges, getNodes, getEdges, getViewport } = useReactFlow();
  
  const [nodeCount, setNodeCount] = useState(100);
  const [edgeCount, setEdgeCount] = useState(50);
  const [virtualization, setVirtualization] = useState(false);
  const [particlesEnabled, setParticlesEnabled] = useState(false);

  // 使用默认节点和边，避免 React 状态更新触发重渲染
  const [initialNodes, setInitialNodes] = useState<Node[]>([]);
  const [initialEdges, setInitialEdges] = useState<Edge[]>([]);

  // 核心剔除逻辑：复用函数
  const cullEdges = useCallback((viewport: Viewport) => {
    // 1. 计算视口边界
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // 增加一点缓冲区 (buffer)，避免边缘闪烁
    const buffer = 50;
    
    const minX = -viewport.x / viewport.zoom - buffer;
    const maxX = (-viewport.x + width) / viewport.zoom + buffer;
    const minY = -viewport.y / viewport.zoom - buffer;
    const maxY = (-viewport.y + height) / viewport.zoom + buffer;

    // 2. 找出可见节点
    const visibleNodeIds = new Set<string>();
    const nodes = getNodes();
    
    for (const node of nodes) {
      const w = node.measured?.width ?? node.style?.width ?? 200;
      const h = node.measured?.height ?? node.style?.height ?? 200;
      const x = node.position.x;
      const y = node.position.y;

      // AABB 碰撞检测
      if (x + Number(w) > minX && x < maxX && y + Number(h) > minY && y < maxY) {
        visibleNodeIds.add(node.id);
      }
    }

    // 3. 更新边的 hidden 属性
    const edges = getEdges();
    let hasChanges = false;
    let hiddenCount = 0;
    
    const newEdges = edges.map(edge => {
      const sourceVisible = visibleNodeIds.has(edge.source);
      const targetVisible = visibleNodeIds.has(edge.target);
      
      // 严格逻辑：只要有一个端点可见，就显示。如果两个都不可见，就隐藏。
      const shouldBeVisible = sourceVisible || targetVisible;
      const isHidden = !shouldBeVisible;

      if (isHidden) hiddenCount++;

      if (edge.hidden !== isHidden) {
        hasChanges = true;
        return { ...edge, hidden: isHidden };
      }
      return edge;
    });

    if (hasChanges) {
      console.log(`[Culling] Hidden Edges: ${hiddenCount} / ${edges.length}`);
      setEdges(newEdges);
    }
  }, [getNodes, getEdges, setEdges]);

  // 监听视口变化
  useOnViewportChange({
    onChange: (viewport: Viewport) => {
      // 使用 requestAnimationFrame 节流，避免过于频繁的计算
      requestAnimationFrame(() => cullEdges(viewport));
    }
  });

  // 处理连线事件
  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, type: 'animated' }, eds));
  }, [setEdges]);

  // 定义回调函数 (移动到 useEffect 之前，虽然不影响提升，但逻辑更清晰)
  const handleShuffle = useCallback(() => {
    setNodes((nds) => {
      return nds.map((node) => {
        if (node.id === 'canvas-form-node') return node;
        return {
          ...node,
          position: {
            x: Math.random() * 2500,
            y: Math.random() * 2500,
          },
        };
      });
    });
  }, [setNodes]);

  const handleAddFormNode = useCallback(() => {
    const id = `form-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'form',
      position: { x: Math.random() * 1000, y: Math.random() * 1000 },
      data: { title: 'New Form Node' },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  // 初始化数据
  useEffect(() => {
    const newNodes = generateNodes(nodeCount);
    const formNode: Node = {
      id: 'canvas-form-node',
      type: 'form',
      position: { x: 80, y: 80 },
      style: { width: 290, height: 240 },
      data: { title: '拖拽这个表单节点' },
    };
    
    const newEdges = generateEdges(nodeCount, edgeCount);
    
    if (newNodes.length > 1) {
      newEdges.unshift(
        { id: 'edge-form-0', source: 'canvas-form-node', target: 'node-0' },
        { id: 'edge-form-1', source: 'node-1', target: 'canvas-form-node' }
      );
    }

    const allNodes = [formNode, ...newNodes];
    
    setInitialNodes(allNodes);
    setInitialEdges(newEdges);
    setNodes(allNodes);
    setEdges(newEdges);

    // 数据初始化后，立即执行一次剔除，确保初始状态正确
    setTimeout(() => {
      const viewport = getViewport();
      cullEdges(viewport);
    }, 100);

  }, [nodeCount, edgeCount, setNodes, setEdges, getViewport, cullEdges]);

  return (
    <div className="native-flow-page" style={{ width: '100vw', height: '100vh', background: '#08080f' }}>
      <NodeCountContext.Provider value={nodeCount}>
        <ParticlesContext.Provider value={particlesEnabled}>
          <ReactFlow
            key={`flow-${nodeCount}-${edgeCount}`}
            defaultNodes={initialNodes}
            defaultEdges={initialEdges}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.1}
            maxZoom={4}
            onlyRenderVisibleElements={virtualization}
            proOptions={{ hideAttribution: true }}
            nodesConnectable={true}
            elementsSelectable={true}
            onConnect={onConnect}
            onInit={(instance) => {
               // 确保初始化时执行一次剔除
               setTimeout(() => cullEdges(instance.getViewport()), 50);
            }}
          >
            <Background color="#2a2a44" gap={20} />
            <Controls />
            
            <ControlPanel
              nodeCount={nodeCount}
              onNodeCountChange={setNodeCount}
              virtualization={virtualization}
              onVirtualizationChange={setVirtualization}
              onShuffle={handleShuffle}
              particles={particlesEnabled}
              onParticlesChange={setParticlesEnabled}
              edgeCount={edgeCount}
              onEdgeCountChange={setEdgeCount}
              onAddFormNode={handleAddFormNode}
            />
            
            <FpsMonitor />
            
            <div style={{ position: 'absolute', bottom: 10, left: 10, color: '#666', fontSize: 12, pointerEvents: 'none' }}>
              Native Mode (Uncontrolled + Strict Edge Culling)
            </div>
          </ReactFlow>
        </ParticlesContext.Provider>
      </NodeCountContext.Provider>
    </div>
  );
}

export default function ReactFlowNativePage() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
