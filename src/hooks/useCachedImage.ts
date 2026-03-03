import { useState, useEffect } from 'react';
import { getCachedImage, isImageCached, preloadImage } from '../utils/imageCache';

/**
 * @param url - original image URL (empty string = skip)
 * @returns { src, loaded, error }
 */
export function useCachedImage(url: string) {
  const [src, setSrc] = useState(() => (url ? getCachedImage(url) : ''));
  const [loaded, setLoaded] = useState(() => isImageCached(url));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) {
      setSrc('');
      setLoaded(false);
      setError(false);
      return;
    }

    if (isImageCached(url)) {
      setSrc(getCachedImage(url));
      setLoaded(true);
      setError(false);
      return;
    }

    let cancelled = false;
    setSrc(url);
    setLoaded(false);
    setError(false);

    preloadImage(url).then(blobUrl => {
      if (!cancelled) {
        setSrc(blobUrl);
        setLoaded(true);
      }
    }).catch(() => {
      if (!cancelled) setError(true);
    });

    return () => { cancelled = true; };
  }, [url]);

  return { src, loaded, error };
}
