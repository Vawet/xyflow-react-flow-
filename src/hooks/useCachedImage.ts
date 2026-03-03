import { useState, useEffect, useCallback, useRef } from 'react';
import { getCachedImage, isImageCached, preloadImage, retryFailed, onImageCached } from '../utils/imageCache';

const persistedByKey = new Map<string | number, string>();

/**
 * @param url - original image URL (empty string = skip)
 * @returns { src, loaded, error }
 */
export function useCachedImage(url: string, key?: string | number) {
  const [src, setSrc] = useState(() => {
    if (key !== undefined && persistedByKey.has(key)) return persistedByKey.get(key)!;
    return url ? getCachedImage(url) : '';
  });
  const [loaded, setLoaded] = useState(() => !!url && isImageCached(url));
  const [error, setError] = useState(false);
  const lastGoodRef = useRef(src);
  const lastKeyRef = useRef(key);
  const commitRafRef = useRef(0);

  const commitView = useCallback((next: { src: string; loaded: boolean; error: boolean }) => {
    cancelAnimationFrame(commitRafRef.current);
    commitRafRef.current = requestAnimationFrame(() => {
      setSrc(next.src);
      setLoaded(next.loaded);
      setError(next.error);
    });
  }, []);

  useEffect(() => {
    if (lastKeyRef.current !== key) {
      lastKeyRef.current = key;
      const persisted = key !== undefined ? persistedByKey.get(key) || '' : '';
      lastGoodRef.current = persisted;
      commitView({ src: persisted, loaded: !!persisted, error: false });
    }
  }, [key, commitView]);

  const load = useCallback((target: string) => {
    if (!target) {
      commitView({ src: '', loaded: false, error: false });
      return;
    }

    if (isImageCached(target)) {
      const cached = getCachedImage(target);
      lastGoodRef.current = cached;
      if (key !== undefined) persistedByKey.set(key, cached);
      commitView({ src: cached, loaded: true, error: false });
      return;
    }

    if (lastGoodRef.current) {
      commitView({ src: lastGoodRef.current, loaded: true, error: false });
    } else {
      commitView({ src: '', loaded: false, error: false });
    }

    preloadImage(target).then(blobUrl => {
      if (blobUrl) {
        lastGoodRef.current = blobUrl;
        if (key !== undefined) persistedByKey.set(key, blobUrl);
        commitView({ src: blobUrl, loaded: true, error: false });
      } else {
        // Fallback: let browser load direct URL if blob fetch fails/rate-limited
        lastGoodRef.current = target;
        if (key !== undefined) persistedByKey.set(key, target);
        commitView({ src: target, loaded: true, error: false });
      }
    });
  }, [key, commitView]);

  useEffect(() => {
    load(url);

    if (!url || isImageCached(url)) return;

    const unsub = onImageCached(url, () => {
      const cached = getCachedImage(url);
      if (!cached) return;
      lastGoodRef.current = cached;
      if (key !== undefined) persistedByKey.set(key, cached);
      commitView({ src: cached, loaded: true, error: false });
    });

    return unsub;
  }, [url, load, key, commitView]);

  useEffect(() => {
    if (!error || !url) return;
    const timer = setTimeout(() => {
      commitView({ src: lastGoodRef.current || '', loaded: !!lastGoodRef.current, error: false });
      retryFailed(url).then(blobUrl => {
        if (blobUrl) {
          lastGoodRef.current = blobUrl;
          if (key !== undefined) persistedByKey.set(key, blobUrl);
          commitView({ src: blobUrl, loaded: true, error: false });
        } else {
          // Retry fallback: keep direct URL and avoid permanent black block
          lastGoodRef.current = url;
          if (key !== undefined) persistedByKey.set(key, url);
          commitView({ src: url, loaded: true, error: false });
        }
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [error, url, key, commitView]);

  const handleElementError = useCallback(() => {
    if (!url) {
      commitView({ src: '', loaded: false, error: true });
      return;
    }
    commitView({ src: lastGoodRef.current || '', loaded: !!lastGoodRef.current, error: true });
  }, [url, commitView]);

  useEffect(() => {
    return () => cancelAnimationFrame(commitRafRef.current);
  }, []);

  return { src, loaded, error, handleElementError };
}
