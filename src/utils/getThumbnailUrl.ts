import type { LodLevel } from '../contexts/ZoomLodContext';

const LOD_SIZE: Record<Exclude<LodLevel, 'low'>, [number, number]> = {
  ultra: [3840, 2160],
  high:  [1280, 720],
  medium: [640, 360],
};

/**
 * @param seed - picsum seed ID
 * @param lod - current LOD level
 * @param width - override width
 * @param height - override height
 * @returns resized image URL, or empty string for 'low' LOD
 */
export function getThumbnailUrl(
  seed: number,
  lod: LodLevel,
  width?: number,
  height?: number,
): string {
  if (lod === 'low') return '';
  const [w, h] = LOD_SIZE[lod];
  return `https://picsum.photos/seed/${seed}/${width ?? w}/${height ?? h}`;
}
