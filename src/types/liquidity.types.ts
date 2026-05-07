// ============================================
// LiquidityProfiler Core Types
// Free-tier crypto-native data, no paid APIs
// ============================================

export interface TokenPair {
  chain: 'solana' | 'bsc' | 'ethereum';
  address: string;              // Contract/pool address
  baseToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
  quoteToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
  dexId: string;                // pancakeswap-v3, raydium, orca, etc.
  priceUsd: number;
  liquidityUsd: number;         // TVL from DexScreener
  volume24h: number;
  volume6h?: number;
  volume1h?: number;
  age?: number;                  // Days since creation
}

export interface DepthBand {
  slippage: number;             // e.g., 0.01 = 1%
  depthUsd: number;             // USD depth at this slippage
  cumulativeDepth: number;      // Running total
}

export interface LPPosition {
  owner: string;
  liquidityAmount: number;      // Raw LP tokens or position size
  sharePercent: number;         // % of total pool
}

export interface DepthProfile {
  pair: TokenPair;
  timestamp: number;

  // Core metrics
  tvl: number;
  realDepth2pct: number;        // USD within ±2% of mid price
  realDepth5pct: number;        // USD within ±5%

  // Concentration analysis
  lpCount: number;
  topLpShare: number;           // % held by largest LP
  top3LpShare: number;          // % held by top 3
  giniCoefficient: number;      // 0 = perfectly equal, 1 = one LP owns all
  concentrationScore: number;   // 0-100 (inverted Gini * top LP weight)

  // Wash trading detection
  volumeToLiquidityRatio: number;
  volumeToLiquidityScore: number; // 0-100, high = suspicious
  velocityAnomaly: boolean;       // Sudden volume spike without price move
  washProbability: number;        // 0-100 composite

  // Exit simulation
  exitTimeline: ExitSimulation;

  // Derived score
  healthScore: number;            // 0-100 composite
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

  // Position sizing
  positionCeiling: number;        // Max recommended position in USD

  // Raw data for transparency
  rawLpDistribution?: LPPosition[];
  rawDepthBands?: DepthBand[];
}

export interface ExitSimulation {
  targetPosition: number;         // Input size being simulated
  bands: ExitBand[];
  totalLiquidatable: number;      // Sum of all bands
  timeToLiquidateMinutes: number;   // Estimated based on 24h volume flow
  avgSlippage: number;             // Weighted average
}

export interface ExitBand {
  slippageMin: number;
  slippageMax: number;
  amountUsd: number;
  percentOfPosition: number;
  label: string;
}

export interface LiquidityFilterConfig {
  minTvl: number;
  minRealDepth2pct: number;
  maxGiniCoefficient: number;
  maxWashProbability: number;
  minHealthScore: number;
  defaultPositionPercentOfTvl: number;  // e.g., 0.05 = 5%
}

export const DEFAULT_CONFIG: LiquidityFilterConfig = {
  minTvl: 10000,
  minRealDepth2pct: 2000,
  maxGiniCoefficient: 0.7,
  maxWashProbability: 75,
  minHealthScore: 40,
  defaultPositionPercentOfTvl: 0.05,  // 5% of TVL max
};
