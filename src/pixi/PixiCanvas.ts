import { Application, Assets, Container, Graphics, Texture, VideoSource } from 'pixi.js';
import { NodeSprite, NODE_WIDTH, NODE_HEIGHT, type NodeData, type PixiLod } from './NodeSprite';

const EDGE_COLORS: Record<string, number> = {
  reference: 0x3b82f6,
  variant: 0x22c55e,
  fusion: 0xf97316,
};

const MODEL_NAMES = [
  'Seedance-01', 'Kling 2.6', 'Vidu Q2', 'Runway Gen-4', 'Pika 2.0',
  'Luma Dream', 'Sora', 'SDXL Turbo', 'Midjourney v7', 'DALL-E 4',
  'Hunyuan', 'CogVideoX', 'Mochi-1', 'Stable Video', 'Jimeng 2.0',
];

const TAGS = [
  '1080p', '720p', '4K', '5s', '10s', '15s',
  '运动模式', '创意模式', '精细模式', '快速模式',
];

interface EdgeData {
  source: string;
  target: string;
  edgeType: 'reference' | 'variant' | 'fusion';
  particleT: number;
  duration: number;
}

export interface PixiStats {
  fps: number;
  totalNodes: number;
  visibleNodes: number;
  edges: number;
  rendererType: string;
  frameTime: number;
}

export class PixiCanvas {
  private app!: Application;
  private world!: Container;
  private nodeLayer!: Container;
  private edgeGfx!: Graphics;
  private particleGfx!: Graphics;
  private selectionGfx!: Graphics;

  private nodes: NodeSprite[] = [];
  private nodeMap = new Map<string, NodeSprite>();
  private edges: EdgeData[] = [];
  private selectedNodes = new Set<NodeSprite>();
  private texturePool: Texture[] = [];
  private videoTexture: Texture | null = null;

  private sw = 0;
  private sh = 0;
  private zoom = 1;

  private pointerDown = false;
  private startScreen = { x: 0, y: 0 };
  private worldStart = { x: 0, y: 0 };
  private mode: 'none' | 'pan' | 'drag' | 'select' = 'none';
  private dragOffsets: { node: NodeSprite; dx: number; dy: number }[] = [];
  private hoveredNode: NodeSprite | null = null;
  private edgesDirty = false;
  private visibleCount = 0;
  private _rendererType = '';
  private _ready = false;
  private _destroyed = false;
  private _currentLod: PixiLod = 'high';
  private formSeq = 0;

  cullingEnabled = true;
  edgeAnimationEnabled = true;
  hoverEnabled = true;

  onNodeDoubleClick?: (data: NodeData) => void;
  onNodeContextMenu?: (screenX: number, screenY: number, data: NodeData) => void;

  async init(container: HTMLElement, preference: 'webgpu' | 'webgl' = 'webgpu') {
    this.sw = container.clientWidth;
    this.sh = container.clientHeight;

    this.app = new Application();
    await this.app.init({
      background: 0x08080f,
      resizeTo: container,
      preference,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    if (this._destroyed) {
      this.app.destroy(true, { children: true });
      return;
    }

    container.appendChild(this.app.canvas);

    this._rendererType = this.app.renderer.constructor.name.includes('Gpu') ? 'WebGPU' : 'WebGL';

    this.world = new Container();
    this.app.stage.addChild(this.world);

    this.edgeGfx = new Graphics();
    this.world.addChild(this.edgeGfx);

    this.particleGfx = new Graphics();
    this.world.addChild(this.particleGfx);

    this.nodeLayer = new Container();
    this.world.addChild(this.nodeLayer);

    this.selectionGfx = new Graphics();
    this.app.stage.addChild(this.selectionGfx);

    const c = this.app.canvas;
    c.addEventListener('pointerdown', this.onPointerDown);
    c.addEventListener('pointermove', this.onPointerMove);
    c.addEventListener('pointerup', this.onPointerUp);
    c.addEventListener('pointerleave', this.onPointerUp);
    c.addEventListener('wheel', this.onWheel, { passive: false });
    c.addEventListener('dblclick', this.onDblClick);
    c.addEventListener('contextmenu', this.onCtxMenu);

    this.app.ticker.add(this.tick);
    this._ready = true;

    this.loadTexturePool();
  }

  /* -------- texture pool -------- */

  private async loadTexturePool() {
    const urls = Array.from({ length: 30 }, (_, i) =>
      `https://picsum.photos/seed/${i * 37}/240/150.jpg`
    );
    const results = await Promise.allSettled(
      urls.map(url => Assets.load<Texture>(url))
    );
    if (!this._ready) return;
    this.texturePool = results
      .filter((r): r is PromiseFulfilledResult<Texture> => r.status === 'fulfilled')
      .map(r => r.value);

    this.loadVideoTexture();
    this.applyTextures();
  }

  private loadVideoTexture() {
    if (this._rendererType === 'WebGPU') {
      this.videoTexture = null;
      return;
    }
    try {
      const video = document.createElement('video');
      video.src = 'https://vjs.zencdn.net/v/oceans.mp4';
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;

      const source = new VideoSource({ resource: video, autoPlay: true, loop: true });
      this.videoTexture = new Texture({ source });
    } catch {
      this.videoTexture = null;
    }
  }

  private applyTextures() {
    if (!this.texturePool.length) return;
    const len = this.texturePool.length;
    for (const node of this.nodes) {
      if (node.data.type === 'form') {
        continue;
      } else if (node.data.type === 'video' && this.videoTexture) {
        node.setTexture(this.videoTexture);
      } else if (node.data.type === 'compare') {
        const idx = node.data.imageId % len;
        node.setTexture(this.texturePool[idx], this.texturePool[node.data.imageId2 % len]);
      } else {
        const idx = node.data.imageId % len;
        node.setTexture(this.texturePool[idx]);
      }
    }
  }

  /* -------- coordinate helpers -------- */

  private canvasPos(e: MouseEvent) {
    const r = this.app.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private toWorld(sx: number, sy: number) {
    return {
      x: (sx - this.world.x) / this.zoom,
      y: (sy - this.world.y) / this.zoom,
    };
  }

  private hitTest(sx: number, sy: number): NodeSprite | null {
    const w = this.toWorld(sx, sy);
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      if (w.x >= n.x && w.x <= n.x + NODE_WIDTH && w.y >= n.y && w.y <= n.y + NODE_HEIGHT) {
        return n;
      }
    }
    return null;
  }

  /* -------- pointer events -------- */

  private onPointerDown = (e: PointerEvent) => {
    const p = this.canvasPos(e);
    this.pointerDown = true;
    this.startScreen = p;
    const hit = this.hitTest(p.x, p.y);

    if (hit) {
      if (e.shiftKey) {
        if (this.selectedNodes.has(hit)) { this.selectedNodes.delete(hit); hit.selected = false; }
        else { this.selectedNodes.add(hit); hit.selected = true; }
      } else if (!this.selectedNodes.has(hit)) {
        this.clearSelection();
        this.selectedNodes.add(hit);
        hit.selected = true;
      }
      this.mode = 'drag';
      const ww = this.toWorld(p.x, p.y);
      this.dragOffsets = [...this.selectedNodes].map(n => ({ node: n, dx: n.x - ww.x, dy: n.y - ww.y }));
    } else if (e.shiftKey) {
      this.mode = 'select';
    } else {
      this.mode = 'pan';
      this.worldStart = { x: this.world.x, y: this.world.y };
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    const p = this.canvasPos(e);

    if (this.pointerDown) {
      if (this.mode === 'pan') {
        this.world.x = this.worldStart.x + (p.x - this.startScreen.x);
        this.world.y = this.worldStart.y + (p.y - this.startScreen.y);
      } else if (this.mode === 'drag') {
        const ww = this.toWorld(p.x, p.y);
        for (const { node, dx, dy } of this.dragOffsets) { node.x = ww.x + dx; node.y = ww.y + dy; }
        this.edgesDirty = true;
      } else if (this.mode === 'select') {
        this.drawSelection(this.startScreen, p);
      }
    } else if (this.hoverEnabled) {
      const hit = this.hitTest(p.x, p.y);
      if (hit !== this.hoveredNode) {
        this.hoveredNode?.setHovered(false);
        this.hoveredNode = hit;
        hit?.setHovered(true);
      }
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.mode === 'select' && e instanceof PointerEvent) {
      const p = this.canvasPos(e);
      const s = this.toWorld(this.startScreen.x, this.startScreen.y);
      const en = this.toWorld(p.x, p.y);
      const minX = Math.min(s.x, en.x), maxX = Math.max(s.x, en.x);
      const minY = Math.min(s.y, en.y), maxY = Math.max(s.y, en.y);
      if (!e.shiftKey) this.clearSelection();
      for (const n of this.nodes) {
        if (n.x + NODE_WIDTH > minX && n.x < maxX && n.y + NODE_HEIGHT > minY && n.y < maxY) {
          this.selectedNodes.add(n);
          n.selected = true;
        }
      }
      this.selectionGfx.clear();
    }
    this.pointerDown = false;
    this.mode = 'none';
    this.dragOffsets = [];
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const p = this.canvasPos(e);
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    const nz = Math.max(0.05, Math.min(5, this.zoom * factor));
    const wx = (p.x - this.world.x) / this.zoom;
    const wy = (p.y - this.world.y) / this.zoom;
    this.zoom = nz;
    this.world.scale.set(nz);
    this.world.x = p.x - wx * nz;
    this.world.y = p.y - wy * nz;
  };

  private onDblClick = (e: MouseEvent) => {
    const p = this.canvasPos(e);
    const hit = this.hitTest(p.x, p.y);
    if (hit) this.onNodeDoubleClick?.(hit.data);
  };

  private onCtxMenu = (e: MouseEvent) => {
    e.preventDefault();
    const p = this.canvasPos(e);
    const hit = this.hitTest(p.x, p.y);
    if (hit) this.onNodeContextMenu?.(e.clientX, e.clientY, hit.data);
  };

  /* -------- selection -------- */

  private clearSelection() {
    for (const n of this.selectedNodes) n.selected = false;
    this.selectedNodes.clear();
  }

  private drawSelection(a: { x: number; y: number }, b: { x: number; y: number }) {
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    this.selectionGfx.clear()
      .rect(x, y, w, h)
      .fill({ color: 0x6366f1, alpha: 0.08 })
      .stroke({ color: 0x6366f1, width: 1, alpha: 0.35 });
  }

  /* -------- edges -------- */

  private drawEdges() {
    this.edgeGfx.clear();
    for (const edge of this.edges) {
      const sn = this.nodeMap.get(edge.source);
      const tn = this.nodeMap.get(edge.target);
      if (!sn || !tn) continue;
      const sx = sn.x + NODE_WIDTH, sy = sn.y + NODE_HEIGHT / 2;
      const tx = tn.x, ty = tn.y + NODE_HEIGHT / 2;
      const dx = Math.abs(tx - sx) * 0.4;
      const color = EDGE_COLORS[edge.edgeType] ?? 0x3b82f6;
      this.edgeGfx.moveTo(sx, sy).bezierCurveTo(sx + dx, sy, tx - dx, ty, tx, ty)
        .stroke({ color, width: 1.5, alpha: 0.45 });
    }
  }

  private updateParticles(dt: number) {
    this.particleGfx.clear();
    if (!this.edgeAnimationEnabled) return;
    for (const edge of this.edges) {
      edge.particleT = (edge.particleT + dt / edge.duration) % 1;
      const sn = this.nodeMap.get(edge.source);
      const tn = this.nodeMap.get(edge.target);
      if (!sn || !tn) continue;
      const sx = sn.x + NODE_WIDTH, sy = sn.y + NODE_HEIGHT / 2;
      const tx = tn.x, ty = tn.y + NODE_HEIGHT / 2;
      const dx = Math.abs(tx - sx) * 0.4;
      const cx1 = sx + dx, cy1 = sy, cx2 = tx - dx, cy2 = ty;
      const t = edge.particleT, t1 = 1 - t;
      const px = t1 * t1 * t1 * sx + 3 * t1 * t1 * t * cx1 + 3 * t1 * t * t * cx2 + t * t * t * tx;
      const py = t1 * t1 * t1 * sy + 3 * t1 * t1 * t * cy1 + 3 * t1 * t * t * cy2 + t * t * t * ty;
      this.particleGfx.circle(px, py, 3).fill({ color: EDGE_COLORS[edge.edgeType] ?? 0x3b82f6, alpha: 0.8 });
    }
  }

  /* -------- culling -------- */

  private updateCulling() {
    if (!this.cullingEnabled) {
      for (const n of this.nodes) n.visible = true;
      this.visibleCount = this.nodes.length;
      return;
    }
    const pad = NODE_WIDTH;
    const minX = -this.world.x / this.zoom - pad;
    const minY = -this.world.y / this.zoom - pad;
    const maxX = (this.sw - this.world.x) / this.zoom + pad;
    const maxY = (this.sh - this.world.y) / this.zoom + pad;
    let count = 0;
    for (const n of this.nodes) {
      const v = n.x + NODE_WIDTH > minX && n.x < maxX && n.y + NODE_HEIGHT > minY && n.y < maxY;
      n.visible = v;
      if (v) count++;
    }
    this.visibleCount = count;
  }

  /* -------- LOD -------- */

  private updateLod() {
    const effectiveW = NODE_WIDTH * this.zoom;
    const lod: PixiLod = effectiveW >= 150 ? 'high' : effectiveW >= 50 ? 'medium' : 'low';
    if (this._currentLod === lod) return;
    this._currentLod = lod;
    for (const n of this.nodes) n.setLod(lod);
    if (lod === 'low') {
      this.edgeGfx.visible = false;
      this.particleGfx.visible = false;
    } else {
      this.edgeGfx.visible = true;
      this.particleGfx.visible = lod === 'high';
    }
  }

  /* -------- ticker -------- */

  private tick = () => {
    this.sw = this.app.screen.width;
    this.sh = this.app.screen.height;
    this.updateCulling();
    this.updateLod();
    if (this.edgesDirty) { this.drawEdges(); this.edgesDirty = false; }
    this.updateParticles(this.app.ticker.deltaMS / 1000);
  };

  /* -------- public API -------- */

  setNodeCount(count: number) {
    if (!this._ready || !this.nodeLayer) return;
    this.nodeLayer.removeChildren();
    this.nodes = [];
    this.nodeMap.clear();
    this.edges = [];
    this.clearSelection();

    const cols = count <= 500 ? 10 : count <= 2000 ? 20 : 30;

    const formData: NodeData = {
      id: 'canvas-form-node',
      type: 'form',
      title: '拖拽这个表单节点',
      tags: [],
      credits: 0,
      genTime: '-',
      progress: 0,
      imageId: 0,
      imageId2: 1,
      x: 80,
      y: 80,
      formA: '',
      formB: '',
      formC: '',
    };
    const formSprite = new NodeSprite(formData);
    this.nodeLayer.addChild(formSprite);
    this.nodes.push(formSprite);
    this.nodeMap.set(formData.id, formSprite);

    for (let i = 0; i < count; i++) {
      const rand = Math.random();
      const type: NodeData['type'] = rand < 0.6 ? 'image' : rand < 0.85 ? 'video' : 'compare';
      const data: NodeData = {
        id: `node-${i}`, type,
        title: MODEL_NAMES[i % MODEL_NAMES.length],
        tags: [TAGS[i % TAGS.length], TAGS[(i + 3) % TAGS.length]],
        credits: Math.floor(Math.random() * 50) + 5,
        genTime: `${(Math.random() * 30 + 5).toFixed(1)}s`,
        progress: Math.floor(Math.random() * 100),
        imageId: Math.floor(Math.random() * 1000),
        imageId2: Math.floor(Math.random() * 1000),
        x: (i % cols) * 280,
        y: Math.floor(i / cols) * 290,
      };
      const sprite = new NodeSprite(data);
      this.nodeLayer.addChild(sprite);
      this.nodes.push(sprite);
      this.nodeMap.set(data.id, sprite);
    }

    const edgeCount = Math.floor(count * 0.3);
    const used = new Set<string>();
    const types: EdgeData['edgeType'][] = ['reference', 'variant', 'fusion'];
    let att = 0;
    while (this.edges.length < edgeCount && att < edgeCount * 5) {
      att++;
      const s = Math.floor(Math.random() * count), t = Math.floor(Math.random() * count);
      if (s === t) continue;
      const k = `${Math.min(s, t)}-${Math.max(s, t)}`;
      if (used.has(k)) continue;
      used.add(k);
      this.edges.push({
        source: `node-${s}`, target: `node-${t}`,
        edgeType: types[this.edges.length % 3],
        particleT: Math.random(),
        duration: 2 + Math.random() * 3,
      });
    }

    if (count > 1) {
      this.edges.push(
        { source: 'canvas-form-node', target: 'node-0', edgeType: 'reference', particleT: Math.random(), duration: 2.5 },
        { source: 'node-1', target: 'canvas-form-node', edgeType: 'variant', particleT: Math.random(), duration: 2.8 },
      );
    } else if (count === 1) {
      this.edges.push(
        { source: 'canvas-form-node', target: 'node-0', edgeType: 'reference', particleT: Math.random(), duration: 2.5 },
      );
    }

    this.drawEdges();
    this.fitView();
    this.applyTextures();
  }

  fitView() {
    if (!this.nodes.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of this.nodes) {
      x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y);
      x1 = Math.max(x1, n.x + NODE_WIDTH); y1 = Math.max(y1, n.y + NODE_HEIGHT);
    }
    const pad = 60;
    this.zoom = Math.min((this.sw - pad * 2) / (x1 - x0), (this.sh - pad * 2) / (y1 - y0), 1);
    this.world.scale.set(this.zoom);
    this.world.x = (this.sw - (x1 - x0) * this.zoom) / 2 - x0 * this.zoom;
    this.world.y = (this.sh - (y1 - y0) * this.zoom) / 2 - y0 * this.zoom;
  }

  shuffle() {
    const cols = this.nodes.length <= 500 ? 10 : this.nodes.length <= 2000 ? 20 : 30;
    const mx = Math.ceil(this.nodes.length / cols) * 280;
    const my = Math.ceil(this.nodes.length / cols) * 290;
    for (const n of this.nodes) { n.x = Math.random() * mx; n.y = Math.random() * my; }
    this.drawEdges();
  }

  addFormNode() {
    if (!this._ready || !this.nodeLayer) return;
    const id = `canvas-form-node-${Date.now()}-${this.formSeq++}`;
    const centerWorld = this.toWorld(this.sw * 0.5, this.sh * 0.5);
    const data: NodeData = {
      id,
      type: 'form',
      title: '新建表单节点',
      tags: [],
      credits: 0,
      genTime: '-',
      progress: 0,
      imageId: 0,
      imageId2: 1,
      x: centerWorld.x - NODE_WIDTH * 0.5 + (Math.random() - 0.5) * 120,
      y: centerWorld.y - NODE_HEIGHT * 0.5 + (Math.random() - 0.5) * 80,
      formA: '',
      formB: '',
      formC: '',
    };

    const sprite = new NodeSprite(data);
    this.nodeLayer.addChild(sprite);
    this.nodes.push(sprite);
    this.nodeMap.set(id, sprite);
    sprite.setLod(this._currentLod);

    const target = this.nodes.find((n) => n.data.type !== 'form' && n.data.id !== id);
    if (target) {
      this.edges.push({
        source: id,
        target: target.data.id,
        edgeType: 'reference',
        particleT: Math.random(),
        duration: 2.6,
      });
    }
    this.drawEdges();
  }

  getNodeScreenRect(id: string) {
    const node = this.nodeMap.get(id);
    if (!node) return null;
    return {
      x: this.world.x + node.x * this.zoom,
      y: this.world.y + node.y * this.zoom,
      width: NODE_WIDTH * this.zoom,
      height: NODE_HEIGHT * this.zoom,
    };
  }

  updateFormNodeData(id: string, values: { a: string; b: string; c: string }) {
    const node = this.nodeMap.get(id);
    if (!node || node.data.type !== 'form') return;
    node.updateFormData(values);
  }

  deleteNode(id: string) {
    const node = this.nodeMap.get(id);
    if (!node) return;
    this.selectedNodes.delete(node);
    this.nodeLayer.removeChild(node);
    node.destroy({ children: true });
    this.nodes = this.nodes.filter(n => n.data.id !== id);
    this.nodeMap.delete(id);
    this.edges = this.edges.filter(e => e.source !== id && e.target !== id);
    this.drawEdges();
  }

  getNodeData(id: string): NodeData | undefined {
    return this.nodeMap.get(id)?.data;
  }

  getStats(): PixiStats {
    if (!this._ready) return { fps: 0, totalNodes: 0, visibleNodes: 0, edges: 0, rendererType: '', frameTime: 0 };
    const fps = this.app.ticker.FPS;
    return {
      fps: Math.round(fps),
      totalNodes: this.nodes.length,
      visibleNodes: this.visibleCount,
      edges: this.edges.length,
      rendererType: this._rendererType,
      frameTime: fps > 0 ? Math.round((1000 / fps) * 100) / 100 : 0,
    };
  }

  destroy() {
    this._destroyed = true;
    if (!this._ready) return;
    this._ready = false;

    this.app.stop();
    this.app.ticker.remove(this.tick);

    const c = this.app.canvas;
    c.removeEventListener('pointerdown', this.onPointerDown);
    c.removeEventListener('pointermove', this.onPointerMove);
    c.removeEventListener('pointerup', this.onPointerUp);
    c.removeEventListener('pointerleave', this.onPointerUp);
    c.removeEventListener('wheel', this.onWheel);
    c.removeEventListener('dblclick', this.onDblClick);
    c.removeEventListener('contextmenu', this.onCtxMenu);

    if (this.videoTexture) {
      const src = this.videoTexture.source;
      if (src?.resource instanceof HTMLVideoElement) {
        src.resource.pause();
        src.resource.src = '';
      }
      this.videoTexture.destroy(true);
      this.videoTexture = null;
    }

    this.texturePool = [];
    try { Assets.reset(); } catch {}
    this.app.destroy(true, { children: true });
  }
}
