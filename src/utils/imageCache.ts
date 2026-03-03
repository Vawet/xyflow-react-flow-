const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
const failed = new Set<string>();
const listeners = new Map<string, Set<() => void>>();

const MAX_CONCURRENT = 6;
const MAX_RETRIES = 3;
let activeCount = 0;
const queue: (() => void)[] = [];

function runNext() {
  while (activeCount < MAX_CONCURRENT && queue.length) {
    const task = queue.shift()!;
    activeCount++;
    task();
  }
}

function fetchWithRetry(url: string, maxRetries = MAX_RETRIES): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let remaining = maxRetries;
    const run = () => {
      fetch(url)
        .then(r => {
          if (!r.ok) throw new Error(r.statusText);
          return r.blob();
        })
        .then(blob => {
          activeCount--;
          runNext();
          resolve(blob);
        })
        .catch(err => {
          activeCount--;
          runNext();
          remaining--;
          if (remaining > 0) {
            const delay = (maxRetries - remaining) * 1000;
            setTimeout(() => {
              queue.push(run);
              runNext();
            }, delay);
          } else {
            reject(err);
          }
        });
    };
    queue.push(run);
    runNext();
  });
}

/**
 * @param url - picsum.photos URL
 * @returns blob URL or empty string
 */
export function getCachedImage(url: string): string {
  return cache.get(url) || '';
}

export function isImageCached(url: string): boolean {
  return cache.has(url);
}

export function onImageCached(url: string, cb: () => void): () => void {
  if (!listeners.has(url)) listeners.set(url, new Set());
  listeners.get(url)!.add(cb);
  return () => { listeners.get(url)?.delete(cb); };
}

export function preloadImage(url: string): Promise<string> {
  if (cache.has(url)) return Promise.resolve(cache.get(url)!);
  if (pending.has(url)) return pending.get(url)!;

  failed.delete(url);

  const p = fetchWithRetry(url)
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      cache.set(url, blobUrl);
      pending.delete(url);
      listeners.get(url)?.forEach(cb => cb());
      listeners.delete(url);
      return blobUrl;
    })
    .catch(() => {
      pending.delete(url);
      failed.add(url);
      listeners.delete(url);
      return '';
    });

  pending.set(url, p);
  return p;
}

export function hasFailed(url: string): boolean {
  return failed.has(url);
}

export function retryFailed(url: string): Promise<string> {
  failed.delete(url);
  pending.delete(url);
  return preloadImage(url);
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
