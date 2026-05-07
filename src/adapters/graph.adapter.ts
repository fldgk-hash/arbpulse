// ============================================
// The Graph Protocol Adapter (Free Subgraphs)
// Uniswap V3, PancakeSwap V3 tick data
// https://thegraph.com/explorer
// ============================================

import { DepthBand } from '../types/liquidity.types';

// Free public subgraph endpoints (no API key needed for read)
const SUBGRAPHS: Record<string, string> = {
  'uniswap-v3-ethereum': 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
  'pancakeswap-v3-bsc': 'https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-bsc',
  'sushiswap-v3-bsc': 'https://api.thegraph.com/subgraphs/name/sushi-v3/v3-bsc',
};

interface GraphTick {
  tickIdx: string;
  liquidityGross: string;
  liquidityNet: string;
  price0: string;
  price1: string;
}

interface GraphPool {
  id: string;
  token0: { id: string; symbol: string; decimals: string };
  token1: { id: string; symbol: string; decimals: string };
  liquidity: string;
  sqrtPriceX96: string;
  tick: string;
  feeTier: string;
  volumeUSD: string;
  totalValueLockedUSD: string;
}

async function graphQuery(subgraph: string, query: string): Promise<any> {
  const url = SUBGRAPHS[subgraph];
  if (!url) throw new Error(`Unknown subgraph: ${subgraph}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) throw new Error(`Graph query failed: ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0].message);
  return data.data;
}

/**
 * Get pool data with current tick and liquidity
 */
export async function getV3Pool(subgraph: string, poolAddress: string): Promise<GraphPool | null> {
  const query = `
    query {
      pool(id: "${poolAddress.toLowerCase()}") {
        id
        token0 { id symbol decimals }
        token1 { id symbol decimals }
        liquidity
        sqrtPriceX96
        tick
        feeTier
        volumeUSD
        totalValueLockedUSD
      }
    }
  `;

  try {
    const data = await graphQuery(subgraph, query);
    return data?.pool || null;
  } catch (e) {
    console.warn(`Graph pool fetch failed for ${poolAddress}:`, e);
    return null;
  }
}

/**
 * Get ticks around current price for depth calculation
 * Fetches ±50 ticks (covers ~±5% for most fee tiers)
 */
export async function getPoolTicks(
  subgraph: string, 
  poolAddress: string,
  currentTick: number,
  range: number = 50
): Promise<GraphTick[]> {
  const tickLower = currentTick - range;
  const tickUpper = currentTick + range;

  const query = `
    query {
      ticks(
        where: {
          poolAddress: "${poolAddress.toLowerCase()}"
          tickIdx_gte: ${tickLower}
          tickIdx_lte: ${tickUpper}
        }
        orderBy: tickIdx
        orderDirection: asc
        first: 1000
      ) {
        tickIdx
        liquidityGross
        liquidityNet
        price0
        price1
      }
    }
  `;

  try {
    const data = await graphQuery(subgraph, query);
    return data?.ticks || [];
  } catch (e) {
    console.warn(`Graph ticks fetch failed:`, e);
    return [];
  }
}

/**
 * Calculate depth bands from V3 tick data
 * This is the core innovation - real depth from on-chain positions
 */
export function calculateDepthFromTicks(
  ticks: GraphTick[],
  currentTick: number,
  currentPrice: number,
  token0Decimals: number,
  token1Decimals: number,
  isToken0Base: boolean = true
): DepthBand[] {
  if (!ticks.length) return [];

  const bands: DepthBand[] = [];
  let cumulativeDepth = 0;

  // Sort ticks by distance from current tick
  const sortedTicks = [...ticks].sort((a, b) => 
    Math.abs(parseInt(a.tickIdx) - currentTick) - Math.abs(parseInt(b.tickIdx) - currentTick)
  );

  // Calculate liquidity at each tick
  for (const tick of sortedTicks) {
    const tickIdx = parseInt(tick.tickIdx);
    const liquidity = BigInt(tick.liquidityGross);

    // Skip if no liquidity
    if (liquidity === BigInt(0)) continue;

    // Calculate price at this tick
    const tickPrice = Math.pow(1.0001, tickIdx);
    const price0 = tickPrice / Math.pow(10, token1Decimals - token0Decimals);
    const price = isToken0Base ? price0 : 1 / price0;

    // Calculate slippage from current price
    const slippage = Math.abs(price - currentPrice) / currentPrice;

    // Convert liquidity to USD depth (simplified - assumes 50/50)
    const depthUsd = Number(liquidity) * currentPrice / Math.pow(10, token0Decimals);

    cumulativeDepth += depthUsd;

    bands.push({
      slippage,
      depthUsd,
      cumulativeDepth,
    });
  }

  // Sort by slippage ascending
  return bands.sort((a, b) => a.slippage - b.slippage);
}

/**
 * Get real depth at specific slippage thresholds
 */
export function getDepthAtSlippage(bands: DepthBand[], targetSlippage: number): number {
  const band = bands.find(b => b.slippage >= targetSlippage);
  return band?.cumulativeDepth || bands[bands.length - 1]?.cumulativeDepth || 0;
}
