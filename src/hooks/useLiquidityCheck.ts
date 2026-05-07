// ============================================
// useLiquidityCheck.ts
// React hook for /liquidity-check command
// Integrates LiquidityProfiler into ArbPulse UI
// ============================================

import { useState, useCallback, useRef } from 'react';
import { TokenPair, DepthProfile, LiquidityFilterConfig } from '../types/liquidity.types';
import LiquidityProfiler, { createLiquidityProfiler } from '../LiquidityProfiler';

export interface LiquidityCheckState {
  profile: DepthProfile | null;
  loading: boolean;
  error: string | null;
  progress: number; // 0-100
}

export interface LiquidityCheckActions {
  analyze: (pair: TokenPair) => Promise<DepthProfile | null>;
  analyzeBatch: (pairs: TokenPair[]) => Promise<DepthProfile[]>;
  refresh: () => void;
  setConfig: (config: Partial<LiquidityFilterConfig>) => void;
}

export function useLiquidityCheck(
  initialConfig?: Partial<LiquidityFilterConfig>
): [LiquidityCheckState, LiquidityCheckActions] {
  const [state, setState] = useState<LiquidityCheckState>({
    profile: null,
    loading: false,
    error: null,
    progress: 0,
  });

  const profilerRef = useRef<LiquidityProfiler>(createLiquidityProfiler(initialConfig));

  const analyze = useCallback(async (pair: TokenPair): Promise<DepthProfile | null> => {
    setState(prev => ({ ...prev, loading: true, error: null, progress: 10 }));

    try {
      setState(prev => ({ ...prev, progress: 30 }));
      const profile = await profilerRef.current.analyze(pair);
      setState(prev => ({ ...prev, profile, loading: false, progress: 100 }));
      return profile;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Liquidity analysis failed';
      setState(prev => ({ ...prev, error: message, loading: false, progress: 0 }));
      return null;
    }
  }, []);

  const analyzeBatch = useCallback(async (pairs: TokenPair[]): Promise<DepthProfile[]> => {
    setState(prev => ({ ...prev, loading: true, error: null, progress: 0 }));

    try {
      const profiles = await profilerRef.current.analyzeBatch(pairs);
      setState(prev => ({ 
        ...prev, 
        profile: profiles[0] || null,
        loading: false, 
        progress: 100 
      }));
      return profiles;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Batch analysis failed';
      setState(prev => ({ ...prev, error: message, loading: false, progress: 0 }));
      return [];
    }
  }, []);

  const refresh = useCallback(() => {
    setState({ profile: null, loading: false, error: null, progress: 0 });
  }, []);

  const setConfig = useCallback((config: Partial<LiquidityFilterConfig>) => {
    profilerRef.current = createLiquidityProfiler(config);
    refresh();
  }, [refresh]);

  return [state, { analyze, analyzeBatch, refresh, setConfig }];
}

export default useLiquidityCheck;
