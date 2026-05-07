// ============================================
// useArbScanner.ts — ENHANCED with LiquidityProfiler
// Drop-in replacement for existing scanner
// ============================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { liquidityProfiler } from '../LiquidityProfiler';
import { TokenPair, DepthProfile } from '../types/liquidity.types';

// ============================================
// Types
// ============================================

export interface ArbOpportunity {
  id: string;
  pair: string;
  chain: 'solana' | 'bsc';
  buyVenue: string;
  sellVenue: string;
  buyPrice: number;
  sellPrice: number;
  spreadPercent: number;
  netProfit: number;

  // NEW: Liquidity intelligence
  liquidityProfile: DepthProfile | null;
  isTradeable: boolean;
  tradeableReason: string | null;
  positionCeiling: number;
  healthScore: number;
  riskLevel: string;

  // Legacy
  timestamp: number;
}

export interface ScannerConfig {
  minSpread: number;
  minProfit: number;
  maxSlippage: number;
  tradeSize: number;

  // NEW: Liquidity filters
  minHealthScore: number;
  maxWashProbability: number;
  maxGiniCoefficient: number;
  enableLiquidityCheck: boolean;
}

export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  minSpread: 0.5,
  minProfit: 1.0,
  maxSlippage: 2.0,
  tradeSize: 1000,

  // NEW defaults
  minHealthScore: 40,
  maxWashProbability: 75,
  maxGiniCoefficient: 0.7,
  enableLiquidityCheck: true,
};

// ============================================
// Hook
// ============================================

export function useArbScanner(config: Partial<ScannerConfig> = {}) {
  const cfg = useRef({ ...DEFAULT_SCANNER_CONFIG, ...config });
  const [opportunities, setOpportunities] = useState<ArbOpportunity[]>([]);
  const [filteredOpps, setFilteredOpps] = useState<ArbOpportunity[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [lastScan, setLastScan] = useState<Date | null>(null);

  // NEW: Liquidity analysis state
  const [analyzingLiquidity, setAnalyzingLiquidity] = useState(false);
  const [liquidityStats, setLiquidityStats] = useState({
    totalChecked: 0,
    tradeableCount: 0,
    skippedCount: 0,
    avgHealthScore: 0,
  });

  useEffect(() => {
    cfg.current = { ...DEFAULT_SCANNER_CONFIG, ...config };
  }, [config]);

  /**
   * Process raw pair data with liquidity analysis
   */
  const processOpportunity = useCallback(async (
    rawPair: TokenPair,
    buyVenue: string,
    sellVenue: string,
    buyPrice: number,
    sellPrice: number,
    spreadPercent: number,
    netProfit: number
  ): Promise<ArbOpportunity | null> => {

    const baseOpportunity: ArbOpportunity = {
      id: `${rawPair.chain}-${rawPair.address}-${Date.now()}`,
      pair: `${rawPair.baseToken.symbol}/${rawPair.quoteToken.symbol}`,
      chain: rawPair.chain,
      buyVenue,
      sellVenue,
      buyPrice,
      sellPrice,
      spreadPercent,
      netProfit,
      liquidityProfile: null,
      isTradeable: true,
      tradeableReason: null,
      positionCeiling: rawPair.liquidityUsd * 0.05,
      healthScore: 50,
      riskLevel: 'UNKNOWN',
      timestamp: Date.now(),
    };

    if (cfg.current.enableLiquidityCheck) {
      try {
        const profile = await liquidityProfiler.analyzePair(rawPair);

        baseOpportunity.liquidityProfile = profile;
        baseOpportunity.healthScore = profile.healthScore;
        baseOpportunity.riskLevel = profile.riskLevel;
        baseOpportunity.positionCeiling = profile.positionCeiling;

        const tradeableCheck = await liquidityProfiler.isTradeable(rawPair);
        baseOpportunity.isTradeable = tradeableCheck.tradeable;
        baseOpportunity.tradeableReason = tradeableCheck.reason || null;

        if (profile.washProbability > cfg.current.maxWashProbability) {
          baseOpportunity.isTradeable = false;
          baseOpportunity.tradeableReason = `Wash ${profile.washProbability}% > ${cfg.current.maxWashProbability}%`;
        }
        if (profile.giniCoefficient > cfg.current.maxGiniCoefficient) {
          baseOpportunity.isTradeable = false;
          baseOpportunity.tradeableReason = `Gini ${(profile.giniCoefficient * 100).toFixed(0)}% > ${(cfg.current.maxGiniCoefficient * 100).toFixed(0)}%`;
        }
        if (profile.healthScore < cfg.current.minHealthScore) {
          baseOpportunity.isTradeable = false;
          baseOpportunity.tradeableReason = `Health ${profile.healthScore} < ${cfg.current.minHealthScore}`;
        }

      } catch (e) {
        console.warn('Liquidity analysis failed, using legacy check:', e);
        if (rawPair.liquidityUsd < 10000) {
          baseOpportunity.isTradeable = false;
          baseOpportunity.tradeableReason = `TVL $${rawPair.liquidityUsd} < $10K (legacy)`;
        }
      }
    }

    return baseOpportunity;
  }, []);

  const filterOpportunities = useCallback((opps: ArbOpportunity[]) => {
    return opps.filter(opp => {
      if (opp.spreadPercent < cfg.current.minSpread) return false;
      if (opp.netProfit < cfg.current.minProfit) return false;
      if (cfg.current.enableLiquidityCheck) {
        if (!opp.isTradeable) return false;
        if (opp.healthScore < cfg.current.minHealthScore) return false;
      }
      return true;
    });
  }, []);

  const scan = useCallback(async (rawPairs: TokenPair[]) => {
    setScanning(true);
    setAnalyzingLiquidity(true);

    const startTime = Date.now();
    const newOpportunities: ArbOpportunity[] = [];
    let checked = 0;
    let tradeable = 0;
    let skipped = 0;
    let totalHealth = 0;

    const batchSize = 5;
    for (let i = 0; i < rawPairs.length; i += batchSize) {
      const batch = rawPairs.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (pair) => {
          const mockBuyPrice = pair.priceUsd * 0.993;
          const mockSellPrice = pair.priceUsd * 1.007;
          const spread = ((mockSellPrice - mockBuyPrice) / mockBuyPrice) * 100;
          const netProfit = (mockSellPrice - mockBuyPrice) * 1000;

          const opp = await processOpportunity(
            pair, 'pancakeswap', 'uniswap',
            mockBuyPrice, mockSellPrice, spread, netProfit
          );

          if (opp) {
            checked++;
            if (opp.isTradeable) tradeable++;
            else skipped++;
            if (opp.liquidityProfile) totalHealth += opp.healthScore;
          }
          return opp;
        })
      );

      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          newOpportunities.push(result.value);
        }
      });
    }

    setOpportunities(newOpportunities);
    setFilteredOpps(filterOpportunities(newOpportunities));
    setScanCount(prev => prev + 1);
    setLastScan(new Date());

    setLiquidityStats({
      totalChecked: checked,
      tradeableCount: tradeable,
      skippedCount: skipped,
      avgHealthScore: checked > 0 ? Math.round(totalHealth / checked) : 0,
    });

    setAnalyzingLiquidity(false);
    setScanning(false);

    console.log(`Scan: ${tradeable} tradeable / ${skipped} skipped in ${Date.now() - startTime}ms`);
    return newOpportunities;
  }, [processOpportunity, filterOpportunities]);

  const quickScan = useCallback(async (rawPairs: TokenPair[]) => {
    const quickOpps: ArbOpportunity[] = rawPairs.map(pair => ({
      id: `${pair.chain}-${pair.address}-${Date.now()}`,
      pair: `${pair.baseToken.symbol}/${pair.quoteToken.symbol}`,
      chain: pair.chain,
      buyVenue: 'unknown', sellVenue: 'unknown',
      buyPrice: pair.priceUsd, sellPrice: pair.priceUsd,
      spreadPercent: 0, netProfit: 0,
      liquidityProfile: null,
      isTradeable: pair.liquidityUsd >= 10000,
      tradeableReason: pair.liquidityUsd < 10000 ? `TVL $${pair.liquidityUsd} < $10K` : null,
      positionCeiling: pair.liquidityUsd * 0.05,
      healthScore: 50, riskLevel: 'UNKNOWN',
      timestamp: Date.now(),
    }));

    setOpportunities(quickOpps);
    setFilteredOpps(quickOpps);
    return quickOpps;
  }, []);

  return {
    opportunities,
    filteredOpportunities: filteredOpps,
    scanning,
    analyzingLiquidity,
    scanCount,
    lastScan,
    liquidityStats,
    scan,
    quickScan,
    filterOpportunities,
    config: cfg.current,
  };
}

export default useArbScanner;
