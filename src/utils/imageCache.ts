const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

/**
 * @param url - picsum.photos URL
 * @returns blob URL (cached) or original URL (fallback)
 */
export function getCachedImage(url: string): string {
  return cache.get(url) || url;
}

export function isImageCached(url: string): boolean {
  return cache.has(url);
}

export function preloadImage(url: string): Promise<string> {
  if (cache.has(url)) return Promise.resolve(cache.get(url)!);
  if (pending.has(url)) return pending.get(url)!;

  const p = fetch(url)
    .then(r => {
      if (!r.ok) throw new Error(r.statusText);
      return r.blob();
    })
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      cache.set(url, blobUrl);
      pending.delete(url);
      return blobUrl;
    })
    .catch(() => {
      pending.delete(url);
      return url;
    });

  pending.set(url, p);
  return p;
}

/**
 * @param seeds - imageId array (e.g. 0-29)
 * @param sizes - [{w, h}] per LOD level
 */
export function preloadPool(
  seeds: number[],
  sizes: { w: number; h: number }[],
): void {
  for (const seed of seeds) {
    for (const { w, h } of sizes) {
      preloadImage(`https://picsum.photos/seed/${seed}/${w}/${h}`);
    }
  }
}
