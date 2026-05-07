// ============================================
// demo.ts — Usage Example
// Run this to test the LiquidityProfiler
// ============================================

import { createLiquidityProfiler } from './LiquidityProfiler';
import { TokenPair } from './types/liquidity.types';

// Example: LMAO! from your earlier scan
const lmaoPair: TokenPair = {
  chain: 'solana',
  address: 'dGd8dL...pump',
  baseToken: {
    address: 'dGd8dL...pump',
    symbol: 'LMAO!',
    decimals: 9,
  },
  quoteToken: {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    decimals: 6,
  },
  dexId: 'pumpswap',
  priceUsd: 0.002434,
  liquidityUsd: 36000,
  volume24h: 974000,
  volume6h: 400000,
  volume1h: 150000,
  age: 201,
};

// Example: OP/USDT from CEX scan
const opPair: TokenPair = {
  chain: 'bsc',
  address: '0x...',
  baseToken: {
    address: '0x...',
    symbol: 'OP',
    decimals: 18,
  },
  quoteToken: {
    address: '0x...',
    symbol: 'USDT',
    decimals: 18,
  },
  dexId: 'pancakeswap-v3',
  priceUsd: 1.465,
  liquidityUsd: 5900000,
  volume24h: 4100000,
  volume6h: 1200000,
  volume1h: 300000,
  age: 1133,
};

async function runDemo() {
  console.log('🚀 ArbPulse LiquidityProfiler Demo\n');

  const profiler = createLiquidityProfiler({
    minTvl: 10000,
    minRealDepth2pct: 2000,
    maxGiniCoefficient: 0.7,
    maxWashProbability: 75,
    minHealthScore: 40,
    defaultPositionPercentOfTvl: 0.05,
  });

  // Analyze LMAO! (should be terrible)
  console.log('📊 Analyzing LMAO!/SOL...');
  try {
    const lmaoProfile = await profiler.analyze(lmaoPair);
    console.log('✅ LMAO! Analysis Complete:');
    console.log(`   Health Score: ${lmaoProfile.healthScore}/100 (${lmaoProfile.riskLevel})`);
    console.log(`   TVL: $${lmaoProfile.tvl.toLocaleString()}`);
    console.log(`   Real Depth ±2%: $${lmaoProfile.realDepth2pct.toLocaleString()}`);
    console.log(`   Wash Probability: ${lmaoProfile.washProbability}%`);
    console.log(`   Position Ceiling: $${lmaoProfile.positionCeiling.toLocaleString()}`);
    console.log(`   Exit Time: ${lmaoProfile.exitTimeline.timeToLiquidateMinutes}m`);
    console.log(`   Passes Filter: ${profiler.passesFilter(lmaoProfile)}\n`);
  } catch (e) {
    console.error('❌ LMAO! analysis failed:', e);
  }

  // Analyze OP (should be good)
  console.log('📊 Analyzing OP/USDT...');
  try {
    const opProfile = await profiler.analyze(opPair);
    console.log('✅ OP Analysis Complete:');
    console.log(`   Health Score: ${opProfile.healthScore}/100 (${opProfile.riskLevel})`);
    console.log(`   TVL: $${opProfile.tvl.toLocaleString()}`);
    console.log(`   Real Depth ±2%: $${opProfile.realDepth2pct.toLocaleString()}`);
    console.log(`   Wash Probability: ${opProfile.washProbability}%`);
    console.log(`   Position Ceiling: $${opProfile.positionCeiling.toLocaleString()}`);
    console.log(`   Exit Time: ${opProfile.exitTimeline.timeToLiquidateMinutes}m`);
    console.log(`   Passes Filter: ${profiler.passesFilter(opProfile)}\n`);
  } catch (e) {
    console.error('❌ OP analysis failed:', e);
  }

  // Batch analysis
  console.log('📊 Batch Analysis (both pairs)...');
  const profiles = await profiler.analyzeBatch([lmaoPair, opPair]);
  console.log(`   Analyzed ${profiles.length} pairs`);
  profiles.forEach(p => {
    console.log(`   ${p.pair.baseToken.symbol}: ${p.healthScore}/100 — ${p.riskLevel}`);
  });
}

runDemo().catch(console.error);
