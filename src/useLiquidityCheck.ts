// ============================================
// useLiquidityCheck Hook
// React integration for ArbPulse Pro
// Drop-in replacement for existing liquidity checks
// ============================================

import { useState, useCallback, useRef } from 'react';
import { 
  LiquidityProfiler, 
  liquidityProfiler as defaultProfiler 
} from '../LiquidityProfiler';
import { 
  TokenPair, 
  DepthProfile, 
  LiquidityFilterConfig 
} from '../types/liquidity.types';

export interface UseLiquidityCheckReturn {
  profile: DepthProfile | null;
  loading: boolean;
  error: string | null;
  isTradeable: boolean | null;
  tradeableReason: string | null;
  analyze: (pair: TokenPair) => Promise<void>;
  analyzeBatch: (pairs: TokenPair[]) => Promise<void>;
  profiles: DepthProfile[];
  clear: () => void;
}

export function useLiquidityCheck(
  config?: Partial<LiquidityFilterConfig>,
  customProfiler?: LiquidityProfiler
): UseLiquidityCheckReturn {
  const profiler = useRef(customProfiler || new LiquidityProfiler(config));

  const [profile, setProfile] = useState<DepthProfile | null>(null);
  const [profiles, setProfiles] = useState<DepthProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTradeable, setIsTradeable] = useState<boolean | null>(null);
  const [tradeableReason, setTradeableReason] = useState<string | null>(null);

  const analyze = useCallback(async (pair: TokenPair) => {
    setLoading(true);
    setError(null);

    try {
      const result = await profiler.current.analyzePair(pair);
      setProfile(result);

      const tradeable = await profiler.current.isTradeable(pair);
      setIsTradeable(tradeable.tradeable);
      setTradeableReason(tradeable.reason || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setProfile(null);
      setIsTradeable(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeBatch = useCallback(async (pairs: TokenPair[]) => {
    setLoading(true);
    setError(null);

    try {
      const results = await profiler.current.analyzeBatch(pairs);
      setProfiles(results);

      // Set first as current profile if available
      if (results.length > 0) {
        setProfile(results[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setProfile(null);
    setProfiles([]);
    setError(null);
    setIsTradeable(null);
    setTradeableReason(null);
  }, []);

  return {
    profile,
    loading,
    error,
    isTradeable,
    tradeableReason,
    analyze,
    analyzeBatch,
    profiles,
    clear,
  };
}

export default useLiquidityCheck;
