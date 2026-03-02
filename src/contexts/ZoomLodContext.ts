import { createContext, useContext } from 'react';

export type LodLevel = 'high' | 'medium' | 'low';

interface ZoomLodValue {
  zoom: number;
  nodeCount: number;
}

export const ZoomLodContext = createContext<ZoomLodValue>({ zoom: 1, nodeCount: 100 });

export function useZoomLod(): ZoomLodValue {
  return useContext(ZoomLodContext);
}
