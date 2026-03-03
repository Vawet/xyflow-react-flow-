import { createContext, useContext } from 'react';

export type LodLevel = 'high' | 'medium' | 'low';

export const NodeCountContext = createContext<number>(100);
export const LodLevelContext = createContext<LodLevel>('high');
export const ParticlesContext = createContext<boolean>(true);

export function useNodeCount(): number {
  return useContext(NodeCountContext);
}

export function useLodLevel(): LodLevel {
  return useContext(LodLevelContext);
}

export function useParticles(): boolean {
  return useContext(ParticlesContext);
}
