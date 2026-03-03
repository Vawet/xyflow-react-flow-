import { Container, Graphics, Text, Sprite, type Texture } from 'pixi.js';

export const NODE_WIDTH = 240;
export const NODE_HEIGHT = 250;
const THUMB_HEIGHT = 150;
const RADIUS = 10;

export type PixiLod = 'high' | 'medium' | 'low';

export interface NodeData {
  id: string;
  type: 'image' | 'video' | 'compare' | 'form';
  title: string;
  tags: string[];
  credits: number;
  genTime: string;
  progress: number;
  imageId: number;
  imageId2: number;
  x: number;
  y: number;
  formA?: string;
  formB?: string;
  formC?: string;
}

function hslToHex(h: number, s: number, l: number): number {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255);
}

export class NodeSprite extends Container {
  data: NodeData;
  private bg: Graphics;
  private titleText: Text;
  private infoText: Text;
  private badgeText: Text | null = null;
  private _selected = false;
  private _hovered = false;
  private _hasTexture = false;
  private _lod: PixiLod = 'high';

  private formSummary() {
    const a = this.data.formA?.trim() || '-';
    const b = this.data.formB?.trim() || '-';
    const c = this.data.formC?.trim() || '-';
    return `${a} | ${b} | ${c}`;
  }

  get selected() { return this._selected; }
  set selected(v: boolean) {
    if (this._selected === v) return;
    this._selected = v;
    this.drawBg();
  }

  constructor(data: NodeData) {
    super();
    this.data = data;
    this.x = data.x;
    this.y = data.y;

    this.bg = new Graphics();
    this.addChild(this.bg);
    this.drawBg();

    const clipMask = new Graphics();
    clipMask.roundRect(0, 0, NODE_WIDTH, NODE_HEIGHT, RADIUS).fill(0xffffff);
    this.addChild(clipMask);
    this.mask = clipMask;

    this.titleText = new Text({
      text: data.title,
      style: { fontSize: 12, fontWeight: '600', fill: 0xf0f0f0, fontFamily: 'sans-serif' },
    });
    this.titleText.x = 8;
    this.titleText.y = THUMB_HEIGHT + 6;
    this.addChild(this.titleText);

    this.infoText = new Text({
      text: data.type === 'form'
        ? this.formSummary()
        : `${data.tags.slice(0, 2).join('  ')}   ${data.credits}pts  ${data.genTime}`,
      style: { fontSize: 10, fill: 0x888888, fontFamily: 'sans-serif' },
    });
    this.infoText.x = 8;
    this.infoText.y = THUMB_HEIGHT + 26;
    this.addChild(this.infoText);

    if (data.type !== 'image') {
      this.badgeText = new Text({
        text: data.type === 'video' ? 'VIDEO' : data.type === 'compare' ? 'VS' : 'FORM',
        style: { fontSize: 9, fontWeight: '700', fill: 0xffffff, fontFamily: 'sans-serif' },
      });
      this.badgeText.x = 11;
      this.badgeText.y = 7;
      this.addChild(this.badgeText);
    }
  }

  setTexture(tex: Texture, tex2?: Texture) {
    if (this.data.type === 'form') {
      this.applyLod();
      return;
    }
    if (this._hasTexture) return;
    this._hasTexture = true;

    if (this.data.type === 'compare' && tex2) {
      const s1 = new Sprite(tex);
      s1.x = 1; s1.y = 1;
      s1.width = NODE_WIDTH / 2 - 1; s1.height = THUMB_HEIGHT;
      this.addChildAt(s1, 1);

      const s2 = new Sprite(tex2);
      s2.x = NODE_WIDTH / 2 + 1; s2.y = 1;
      s2.width = NODE_WIDTH / 2 - 2; s2.height = THUMB_HEIGHT;
      this.addChildAt(s2, 2);

      const divider = new Graphics();
      divider.rect(NODE_WIDTH / 2 - 1, 1, 2, THUMB_HEIGHT).fill(0x6366f1);
      this.addChildAt(divider, 3);
    } else {
      const s = new Sprite(tex);
      s.x = 1; s.y = 1;
      s.width = NODE_WIDTH - 2; s.height = THUMB_HEIGHT;
      this.addChildAt(s, 1);
    }

    this.applyLod();
  }

  setLod(lod: PixiLod) {
    if (this._lod === lod) return;
    this._lod = lod;
    this.applyLod();
  }

  updateFormData(values: { a: string; b: string; c: string }) {
    if (this.data.type !== 'form') return;
    this.data.formA = values.a;
    this.data.formB = values.b;
    this.data.formC = values.c;
    this.infoText.text = this.formSummary();
  }

  private applyLod() {
    const lod = this._lod;

    this.titleText.visible = lod !== 'low';
    this.infoText.visible = lod === 'high';
    if (this.badgeText) this.badgeText.visible = lod !== 'low';

    for (const child of this.children) {
      if (child instanceof Sprite) {
        child.visible = lod !== 'low';
      }
    }
  }

  private drawBg() {
    const g = this.bg;
    g.clear();

    if (this._selected) {
      g.roundRect(-3, -3, NODE_WIDTH + 6, NODE_HEIGHT + 6, RADIUS + 3)
        .stroke({ color: 0x6366f1, width: 2, alpha: 0.7 });
    }

    const border = this._hovered ? 0x3a3a5c : this._selected ? 0x6366f1 : 0x1e1e32;
    g.roundRect(0, 0, NODE_WIDTH, NODE_HEIGHT, RADIUS)
      .fill(0x14142a)
      .stroke({ color: border, width: 1 });

    const hue = (this.data.imageId * 37) % 360;
    g.rect(1, 1, NODE_WIDTH - 2, THUMB_HEIGHT).fill(hslToHex(hue, 35, 22));

    if (this.data.type === 'compare') {
      g.rect(NODE_WIDTH / 2, 1, NODE_WIDTH / 2 - 1, THUMB_HEIGHT)
        .fill(hslToHex((hue + 60) % 360, 35, 22));
      g.rect(NODE_WIDTH / 2 - 1, 1, 2, THUMB_HEIGHT).fill(0x6366f1);
    }

    if (this.data.type !== 'image') {
      const badgeColor = this.data.type === 'video' ? 0xf97316 : this.data.type === 'compare' ? 0x22c55e : 0x8b5cf6;
      const badgeWidth = this.data.type === 'video' ? 42 : this.data.type === 'compare' ? 24 : 36;
      g.roundRect(6, 4, badgeWidth, 16, 3).fill(badgeColor);
    }

    if (this.data.type === 'form') {
      g.rect(1, 1, NODE_WIDTH - 2, THUMB_HEIGHT).fill(0x1a1a34);
      g.roundRect(14, 18, NODE_WIDTH - 28, 20, 4).fill(0x101024).stroke({ color: 0x2a2a44, width: 1 });
      g.roundRect(14, 48, NODE_WIDTH - 28, 20, 4).fill(0x101024).stroke({ color: 0x2a2a44, width: 1 });
      g.roundRect(14, 78, NODE_WIDTH - 28, 20, 4).fill(0x101024).stroke({ color: 0x2a2a44, width: 1 });
      g.roundRect(14, 112, 80, 20, 4).fill(0x6366f1);
    }

    g.rect(0, NODE_HEIGHT - 3, NODE_WIDTH, 3).fill(0x1e1e32);
    g.rect(0, NODE_HEIGHT - 3, NODE_WIDTH * (this.data.progress / 100), 3).fill(0x6366f1);
  }

  setHovered(v: boolean) {
    if (this._hovered === v) return;
    this._hovered = v;
    this.scale.set(v ? 1.03 : 1);
    this.drawBg();
  }
}
