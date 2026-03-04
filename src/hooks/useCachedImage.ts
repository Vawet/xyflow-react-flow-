import { useState, useEffect, useCallback } from 'react';

/**
 * @param url - original image URL (empty string = skip)
 * @returns { src, loaded, error }
 */
export function useCachedImage(url: string, key?: string | number) {
  const [src, setSrc] = useState(() => (url ? url : ''));
  const [loaded, setLoaded] = useState(() => !!url);
  const [error, setError] = useState(false);
  void key;

  const handleElementError = useCallback(() => {
    setError(true);
  }, []);

  useEffect(() => {
    if (!url) {
      setSrc('');
      setLoaded(false);
      setError(false);
      return;
    }
    setSrc(url);
    setLoaded(true);
    setError(false);
  }, [url]);

  return { src, loaded, error, handleElementError };
}
