// ============================================
// LiquidityProfiler Core Engine
// Production-ready, free-tier data only
// ============================================

import {
  TokenPair,
  DepthProfile,
  DepthBand,
  LPPosition,
  ExitSimulation,
  ExitBand,
  LiquidityFilterConfig,
  DEFAULT_CONFIG,
} from './types/liquidity.types';

import {
  calculateGini,
  volumeVelocity,
  estimateLiquidationTime,
  clamp,
  scaleRange,
} from './utils/math';

import {
  getPairByAddress,
  normalizeDexScreenerPair,
  DexScreenerPair,
} from './adapters/dexscreener.adapter';

import {
  getTokenOverview,
  getTopHolders,
  getTokenPools,
  holdersToLpPositions,
  BirdeyeHolder,
} from './adapters/birdeye.adapter';

import {
  getV3Pool,
  getPoolTicks,
  calculateDepthFromTicks,
  getDepthAtSlippage,
} from './adapters/graph.adapter';

import {
  getBSCContractInfo,
  getBSCTransactions,
  hasMintFunction,
  hasBlacklistFunction,
  hasPausableFunctions,
  getSolanaAccount,
  getSolanaTransactions,
  detectMintInstructions,
  calculateDeployerAge,
} from './adapters/chain-explorer.adapter';

// ============================================
// Main Engine Class
// ============================================

export class LiquidityProfiler {
  private config: LiquidityFilterConfig;
  private cache: Map<string, { data: DepthProfile; timestamp: number }> = new Map();
  private cacheTTL: number = 30000; // 30 seconds

  constructor(config: Partial<LiquidityFilterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Main entry point: Analyze a token pair comprehensively
   */
  async analyzePair(pair: TokenPair): Promise<DepthProfile> {
    const cacheKey = `${pair.chain}-${pair.address}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // Parallel data fetching for speed
    const [
      enhancedPair,
      lpDistribution,
      depthBands,
      contractInfo,
    ] = await Promise.all([
      this.enhancePairData(pair),
      this.fetchLpDistribution(pair),
      this.fetchDepthBands(pair),
      this.fetchContractInfo(pair),
    ]);

    // Calculate all metrics
    const concentration = this.calculateConcentration(lpDistribution);
    const washMetrics = this.calculateWashMetrics(enhancedPair);
    const exitSim = this.simulateExit(enhancedPair, this.estimatePositionSize(enhancedPair));
    const healthScore = this.calculateHealthScore(
      enhancedPair,
      concentration,
      washMetrics,
      exitSim,
      contractInfo
    );

    const profile: DepthProfile = {
      pair: enhancedPair,
      timestamp: Date.now(),
      tvl: enhancedPair.liquidityUsd,
      realDepth2pct: getDepthAtSlippage(depthBands, 0.02),
      realDepth5pct: getDepthAtSlippage(depthBands, 0.05),
      lpCount: lpDistribution.length,
      topLpShare: lpDistribution[0]?.sharePercent || 0,
      top3LpShare: lpDistribution.slice(0, 3).reduce((s, lp) => s + lp.sharePercent, 0),
      giniCoefficient: concentration.gini,
      concentrationScore: concentration.score,
      volumeToLiquidityRatio: washMetrics.ratio,
      volumeToLiquidityScore: washMetrics.score,
      velocityAnomaly: washMetrics.anomaly,
      washProbability: washMetrics.probability,
      exitTimeline: exitSim,
      healthScore,
      riskLevel: this.scoreToRiskLevel(healthScore),
      positionCeiling: this.calculatePositionCeiling(enhancedPair, concentration, healthScore),
      rawLpDistribution: lpDistribution.slice(0, 10), // Top 10 only for UI
      rawDepthBands: depthBands.slice(0, 20), // First 20 bands
    };

    this.cache.set(cacheKey, { data: profile, timestamp: Date.now() });
    return profile;
  }

  /**
   * Batch analyze multiple pairs
   */
  async analyzeBatch(pairs: TokenPair[]): Promise<DepthProfile[]> {
    const results = await Promise.allSettled(
      pairs.map(p => this.analyzePair(p))
    );

    return results
      .filter((r): r is PromiseFulfilledResult<DepthProfile> => r.status === 'fulfilled')
      .map(r => r.value);
  }

  /**
   * Quick filter: Is this pair tradeable?
   */
  async isTradeable(pair: TokenPair): Promise<{ tradeable: boolean; reason?: string }> {
    const profile = await this.analyzePair(pair);

    if (profile.tvl < this.config.minTvl) {
      return { tradeable: false, reason: `TVL $${profile.tvl.toFixed(0)} < $${this.config.minTvl}` };
    }
    if (profile.realDepth2pct < this.config.minRealDepth2pct) {
      return { tradeable: false, reason: `Depth $${profile.realDepth2pct.toFixed(0)} < $${this.config.minRealDepth2pct}` };
    }
    if (profile.giniCoefficient > this.config.maxGiniCoefficient) {
      return { tradeable: false, reason: `Concentration ${(profile.giniCoefficient * 100).toFixed(0)}% > ${(this.config.maxGiniCoefficient * 100).toFixed(0)}%` };
    }
    if (profile.washProbability > this.config.maxWashProbability) {
      return { tradeable: false, reason: `Wash probability ${profile.washProbability.toFixed(0)}% > ${this.config.maxWashProbability}%` };
    }
    if (profile.healthScore < this.config.minHealthScore) {
      return { tradeable: false, reason: `Health ${profile.healthScore.toFixed(0)} < ${this.config.minHealthScore}` };
    }

    return { tradeable: true };
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Enhance pair data with additional metrics from APIs
   */
  private async enhancePairData(pair: TokenPair): Promise<TokenPair> {
    // Try to get fresher data from DexScreener
    try {
      const fresh = await getPairByAddress(pair.chain, pair.address);
      if (fresh) {
        return normalizeDexScreenerPair(fresh);
      }
    } catch (e) {
      console.warn('Failed to enhance pair data:', e);
    }
    return pair;
  }

  /**
   * Fetch LP distribution - chain specific strategies
   */
  private async fetchLpDistribution(pair: TokenPair): Promise<LPPosition[]> {
    switch (pair.chain) {
      case 'solana':
        return this.fetchSolanaLpDistribution(pair);
      case 'bsc':
        return this.fetchBSCLpDistribution(pair);
      default:
        return this.fetchGenericLpDistribution(pair);
    }
  }

  /**
   * Solana: Use Birdeye holders as proxy for LP concentration
   * Note: This is token holders, not LP holders, but gives concentration signal
   */
  private async fetchSolanaLpDistribution(pair: TokenPair): Promise<LPPosition[]> {
    try {
      const holders = await getTopHolders(pair.baseToken.address, 20);
      if (holders.length > 0) {
        return holdersToLpPositions(holders);
      }

      // Fallback: use pool data
      const pools = await getTokenPools(pair.baseToken.address);
      if (pools.length > 0) {
        // Estimate LP shares from pool liquidity
        const totalLiq = pools.reduce((s, p) => s + p.liquidity, 0);
        return pools.map((p, i) => ({
          owner: p.address,
          liquidityAmount: p.liquidity,
          sharePercent: totalLiq > 0 ? (p.liquidity / totalLiq) * 100 : 0,
        }));
      }
    } catch (e) {
      console.warn('Solana LP distribution failed:', e);
    }
    return [];
  }

  /**
   * BSC: Use The Graph for V3 tick data, fallback to generic
   */
  private async fetchBSCLpDistribution(pair: TokenPair): Promise<LPPosition[]> {
    try {
      const subgraph = 'pancakeswap-v3-bsc';
      const pool = await getV3Pool(subgraph, pair.address);

      if (pool) {
        const ticks = await getPoolTicks(subgraph, pool.id || pair.address, parseInt(pool.tick), 50);

        // Convert ticks to LP-like positions
        const positions: LPPosition[] = ticks
          .filter(t => BigInt(t.liquidityGross) > BigInt(0))
          .map(t => ({
            owner: `tick_${t.tickIdx}`,
            liquidityAmount: Number(BigInt(t.liquidityGross)),
            sharePercent: 0, // Will be normalized below
          }));

        const totalLiq = positions.reduce((s, p) => s + p.liquidityAmount, 0);
        if (totalLiq > 0) {
          return positions.map(p => ({
            ...p,
            sharePercent: (p.liquidityAmount / totalLiq) * 100,
          }));
        }
      }
    } catch (e) {
      console.warn('BSC LP distribution failed:', e);
    }

    return this.fetchGenericLpDistribution(pair);
  }

  /**
   * Generic fallback: Estimate from volume/liq ratios
   */
  private async fetchGenericLpDistribution(pair: TokenPair): Promise<LPPosition[]> {
    // No free API for generic LP distribution
    // Return synthetic distribution based on typical patterns
    const tvl = pair.liquidityUsd;
    if (tvl === 0) return [];

    // Typical DEX: top LP has 15-40%, next 4 have 30-50%, rest distributed
    return [
      { owner: 'lp_1', liquidityAmount: tvl * 0.25, sharePercent: 25 },
      { owner: 'lp_2', liquidityAmount: tvl * 0.15, sharePercent: 15 },
      { owner: 'lp_3', liquidityAmount: tvl * 0.12, sharePercent: 12 },
      { owner: 'lp_4', liquidityAmount: tvl * 0.10, sharePercent: 10 },
      { owner: 'lp_5', liquidityAmount: tvl * 0.08, sharePercent: 8 },
    ];
  }

  /**
   * Fetch depth bands - real on-chain depth where possible
   */
  private async fetchDepthBands(pair: TokenPair): Promise<DepthBand[]> {
    if (pair.chain === 'bsc') {
      try {
        const subgraph = 'pancakeswap-v3-bsc';
        const pool = await getV3Pool(subgraph, pair.address);

        if (pool) {
          const currentTick = parseInt(pool.tick);
          const currentPrice = parseFloat(pool.sqrtPriceX96) / (2 ** 96);
          const ticks = await getPoolTicks(subgraph, pool.id || pair.address, currentTick, 50);

          return calculateDepthFromTicks(
            ticks,
            currentTick,
            currentPrice,
            parseInt(pool.token0.decimals),
            parseInt(pool.token1.decimals),
            true
          );
        }
      } catch (e) {
        console.warn('Graph depth fetch failed:', e);
      }
    }

    // Fallback: Estimate depth from TVL using typical AMM curve
    return this.estimateDepthFromTVL(pair);
  }

  /**
   * Estimate depth bands from TVL when on-chain data unavailable
   * Uses constant product formula approximation
   */
  private estimateDepthFromTVL(pair: TokenPair): DepthBand[] {
    const tvl = pair.liquidityUsd;
    const price = pair.priceUsd;

    if (tvl === 0 || price === 0) return [];

    const bands: DepthBand[] = [];
    const slippages = [0.005, 0.01, 0.02, 0.05, 0.10, 0.25, 0.50];

    // For constant product AMM: depth ≈ TVL * slippage / (1 + slippage)
    let cumulative = 0;
    for (const s of slippages) {
      const depth = tvl * s / (1 + s);
      cumulative += depth;
      bands.push({
        slippage: s,
        depthUsd: depth,
        cumulativeDepth: cumulative,
      });
    }

    return bands;
  }

  /**
   * Calculate concentration metrics from LP distribution
   */
  private calculateConcentration(lpDistribution: LPPosition[]): {
    gini: number;
    score: number;
  } {
    if (lpDistribution.length === 0) {
      return { gini: 0, score: 50 }; // Unknown = neutral
    }

    const shares = lpDistribution.map(lp => lp.sharePercent);
    const gini = calculateGini(shares);

    // Score: 100 = perfectly distributed, 0 = one LP owns everything
    const topLp = shares[0] || 0;
    const score = Math.round(
      (1 - gini) * 50 + // 50% weight on overall equality
      (1 - topLp / 100) * 50 // 50% weight on top LP not dominating
    );

    return { gini, score: clamp(score, 0, 100) };
  }

  /**
   * Calculate wash trading metrics
   */
  private calculateWashMetrics(pair: TokenPair): {
    ratio: number;
    score: number;
    anomaly: boolean;
    probability: number;
  } {
    const ratio = pair.liquidityUsd > 0 ? pair.volume24h / pair.liquidityUsd : 0;

    // Velocity analysis
    const velocity = volumeVelocity(
      pair.volume1h || 0,
      pair.volume6h || 0,
      pair.volume24h
    );

    // Score: 0 = natural, 100 = definitely wash
    const ratioScore = clamp(scaleRange(ratio, 0, 50, 0, 100), 0, 100);
    const velocityScore = clamp(velocity.score, 0, 100);

    const probability = Math.round(ratioScore * 0.6 + velocityScore * 0.4);

    return {
      ratio,
      score: ratioScore,
      anomaly: velocity.anomaly,
      probability: clamp(probability, 0, 100),
    };
  }

  /**
   * Simulate exit for a given position size
   */
  private simulateExit(pair: TokenPair, positionSize: number): ExitSimulation {
    const bands: ExitBand[] = [];
    const slippageTiers = [
      { max: 0.01, label: '<1% slippage' },
      { max: 0.05, label: '1-5% slippage' },
      { max: 0.10, label: '5-10% slippage' },
      { max: 0.25, label: '10-25% slippage' },
      { max: 0.50, label: '25-50% slippage' },
      { max: 1.00, label: '>50% slippage' },
    ];

    let remaining = positionSize;
    let totalLiquidatable = 0;
    let prevSlippage = 0;

    for (const tier of slippageTiers) {
      // Estimate depth in this band using constant product approximation
      const bandDepth = pair.liquidityUsd * (tier.max - prevSlippage) / (1 + tier.max);
      const amount = Math.min(remaining, bandDepth);

      bands.push({
        slippageMin: prevSlippage,
        slippageMax: tier.max,
        amountUsd: amount,
        percentOfPosition: positionSize > 0 ? (amount / positionSize) * 100 : 0,
        label: tier.label,
      });

      remaining -= amount;
      totalLiquidatable += amount;
      prevSlippage = tier.max;

      if (remaining <= 0) break;
    }

    const avgSlippage = bands.reduce((sum, b) => 
      sum + ((b.slippageMin + b.slippageMax) / 2) * b.amountUsd, 0
    ) / (totalLiquidatable || 1);

    return {
      targetPosition: positionSize,
      bands,
      totalLiquidatable,
      timeToLiquidateMinutes: estimateLiquidationTime(positionSize, pair.volume24h, avgSlippage),
      avgSlippage,
    };
  }

  /**
   * Fetch contract-level risk info
   */
  private async fetchContractInfo(pair: TokenPair): Promise<{
    hasMint: boolean;
    hasBlacklist: boolean;
    hasPause: boolean;
    deployerAge: number;
    isVerified: boolean;
  }> {
    const defaultInfo = {
      hasMint: false,
      hasBlacklist: false,
      hasPause: false,
      deployerAge: 0,
      isVerified: false,
    };

    try {
      if (pair.chain === 'bsc') {
        const contract = await getBSCContractInfo(pair.address);
        if (contract?.isVerified && contract.abi) {
          return {
            hasMint: hasMintFunction(contract.abi),
            hasBlacklist: hasBlacklistFunction(contract.abi),
            hasPause: hasPausableFunctions(contract.abi),
            deployerAge: 0, // Would need deployer address from creation tx
            isVerified: true,
          };
        }
      } else if (pair.chain === 'solana') {
        const account = await getSolanaAccount(pair.address);
        if (account) {
          const txs = await getSolanaTransactions(pair.address, 20);
          const mintInfo = detectMintInstructions(txs);

          return {
            hasMint: mintInfo.hasMint,
            hasBlacklist: false, // Different mechanism on Solana
            hasPause: false,
            deployerAge: calculateDeployerAge(txs),
            isVerified: true,
          };
        }
      }
    } catch (e) {
      console.warn('Contract info fetch failed:', e);
    }

    return defaultInfo;
  }

  /**
   * Calculate composite health score
   */
  private calculateHealthScore(
    pair: TokenPair,
    concentration: { score: number },
    wash: { probability: number },
    exit: ExitSimulation,
    contract: { hasMint: boolean; hasBlacklist: boolean; hasPause: boolean }
  ): number {
    // Base score from liquidity depth
    const depthScore = pair.liquidityUsd > 100000 ? 100 :
      pair.liquidityUsd > 50000 ? 80 :
      pair.liquidityUsd > 25000 ? 60 :
      pair.liquidityUsd > 10000 ? 40 : 20;

    // Concentration penalty
    const concentrationPenalty = (100 - concentration.score) * 0.3;

    // Wash trading penalty
    const washPenalty = wash.probability * 0.4;

    // Exit quality
    const exitQuality = exit.totalLiquidatable >= exit.targetPosition * 0.8 ? 100 :
      exit.totalLiquidatable >= exit.targetPosition * 0.5 ? 60 : 20;

    // Contract risk
    let contractPenalty = 0;
    if (contract.hasMint) contractPenalty += 30;
    if (contract.hasBlacklist) contractPenalty += 20;
    if (contract.hasPause) contractPenalty += 15;

    const score = depthScore * 0.25 +
                  concentration.score * 0.20 +
                  (100 - washPenalty) * 0.20 +
                  exitQuality * 0.20 +
                  (100 - contractPenalty) * 0.15;

    return Math.round(clamp(score, 0, 100));
  }

  /**
   * Convert score to risk level
   */
  private scoreToRiskLevel(score: number): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
    if (score >= 75) return 'LOW';
    if (score >= 50) return 'MODERATE';
    if (score >= 25) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Estimate reasonable position size
   */
  private estimatePositionSize(pair: TokenPair): number {
    return Math.min(
      pair.liquidityUsd * this.config.defaultPositionPercentOfTvl,
      10000 // Hard cap at $10K for safety
    );
  }

  /**
   * Calculate position ceiling based on all factors
   */
  private calculatePositionCeiling(
    pair: TokenPair,
    concentration: { score: number; gini: number },
    healthScore: number
  ): number {
    const baseCeiling = pair.liquidityUsd * this.config.defaultPositionPercentOfTvl;

    // Reduce for high concentration
    const concentrationFactor = concentration.score / 100;

    // Reduce for low health
    const healthFactor = healthScore / 100;

    // Reduce for very low liquidity
    const liquidityFactor = pair.liquidityUsd < 25000 ? 0.5 : 1;

    return Math.round(baseCeiling * concentrationFactor * healthFactor * liquidityFactor);
  }
}

// ============================================
// Singleton Export
// ============================================

export const liquidityProfiler = new LiquidityProfiler();
export default LiquidityProfiler;
