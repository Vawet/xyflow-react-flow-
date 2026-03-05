import type { Node, Edge } from '@xyflow/react';

const MODEL_NAMES = [
  'Seedance-01', 'Kling 2.6', 'Vidu Q2', 'Runway Gen-4', 'Pika 2.0',
  'Luma Dream', 'Sora', 'SDXL Turbo', 'Midjourney v7', 'DALL-E 4',
  'Hunyuan Video', 'CogVideoX', 'Mochi-1', 'Stable Video', 'Jimeng 2.0',
];

const TAGS = [
  '1080p', '720p', '4K', '5s', '10s', '15s',
  '运动模式', '静态模式', '创意模式', '精细模式', '快速模式',
  '人像', '风景', '动漫', '写实', '3D',
];

const EDGE_TYPES = ['reference', 'variant', 'fusion'] as const;

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTags(): string[] {
  const count = 2 + Math.floor(Math.random() * 2);
  const shuffled = [...TAGS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function generateNodes(count: number): Node[] {
  const nodes: Node[] = [];
  const cols = 10;
  const spacingX = 300;
  const spacingY = 420;

  for (let i = 0; i < count; i++) {
    const rand = Math.random();
    let type: string;
    if (rand < 0.6) type = 'image';
    else if (rand < 0.85) type = 'video';
    else type = 'compare';

    const initialWidth = type === 'compare' ? 280 : 260;
    const initialHeight = 280;

    nodes.push({
      id: `node-${i}`,
      type,
      position: { x: (i % cols) * spacingX, y: Math.floor(i / cols) * spacingY },
      style: { width: initialWidth, height: initialHeight },
      data: {
        title: randomPick(MODEL_NAMES),
        tags: randomTags(),
        credits: Math.floor(Math.random() * 50) + 5,
        genTime: `${(Math.random() * 30 + 5).toFixed(1)}s`,
        progress: Math.floor(Math.random() * 100),
        imageId: Math.floor(Math.random() * 30),
        imageId2: Math.floor(Math.random() * 30),
      },
    });
  }

  return nodes;
}

export function generateEdges(nodeCount: number, maxEdges?: number): Edge[] {
  const edges: Edge[] = [];
  const edgeCount = maxEdges ?? Math.min(Math.floor(nodeCount * 0.3), 150);
  const usedPairs = new Set<string>();
  
  // Grid layout parameters matching generateNodes
  const cols = 10;
  
  // Helper to add edge
  const addEdge = (source: number, target: number) => {
    if (target >= nodeCount) return;
    
    const key = `${Math.min(source, target)}-${Math.max(source, target)}`;
    if (usedPairs.has(key)) return;
    
    usedPairs.add(key);
    const edgeType = randomPick([...EDGE_TYPES]);
    const duration = 2 + (edges.length % 30) / 10;
    
    edges.push({
      id: `edge-${edges.length}`,
      source: `node-${source}`,
      target: `node-${target}`,
      type: 'animated',
      data: { edgeType, duration },
    });
  };

  // 1. First pass: Connect adjacent nodes (Right and Down) to form a grid-like structure
  // We iterate until we reach the desired edge count or run out of nodes
  for (let i = 0; i < nodeCount && edges.length < edgeCount; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    
    // Try connecting to the right (if not last column)
    if (col < cols - 1) {
      if (Math.random() < 0.7) { // 70% chance
        addEdge(i, i + 1);
      }
    }
    
    // Try connecting down (if not last row)
    if (edges.length < edgeCount && Math.random() < 0.7) {
      addEdge(i, i + cols);
    }
  }

  // 2. Second pass: If we still need edges, add some diagonal or random local connections
  let attempts = 0;
  const maxAttempts = nodeCount * 2;
  
  while (edges.length < edgeCount && attempts < maxAttempts) {
    attempts++;
    const source = Math.floor(Math.random() * nodeCount);
    // Pick a target that is somewhat close (within +/- 2 rows/cols)
    // But for simplicity, let's just pick random close indices
    const offset = Math.floor(Math.random() * 22) - 11; // -11 to +11
    if (offset === 0) continue;
    
    const target = source + offset;
    if (target >= 0 && target < nodeCount && target !== source) {
      addEdge(source, target);
    }
  }

  return edges;
}
