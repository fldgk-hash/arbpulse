// ============================================
// The Graph Protocol Adapter
// Free tier: 100k queries/month via public endpoints
// https://thegraph.com/explorer
// ============================================

import { DepthBand } from '../types/liquidity.types';

// Public subgraph endpoints (free, rate-limited)
const SUBGRAPHS = {
  uniswapV3Bsc: 'https://gateway-arbitrum.network.thegraph.com/api/[API_KEY]/subgraphs/id/8shY7i...', // Replace with actual
  pancakeswapV3Bsc: 'https://gateway-arbitrum.network.thegraph.com/api/[API_KEY]/subgraphs/id/...',
  // Fallback: use hosted service URLs or self-hosted
};

// Free hosted service endpoints (deprecated but still work for basic queries)
const HOSTED_ENDPOINTS = {
  uniswapV3: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
  pancakeswapV3: 'https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-bsc',
  sushiswap: 'https://api.thegraph.com/subgraphs/name/sushiswap/exchange',
};

const RATE_LIMIT_MS = 1000; // 1 sec between requests (conservative for free tier)
let lastRequestTime = 0;

async function graphQuery(endpoint: string, query: string, variables?: Record<string, any>): Promise<any> {
  const now = Date.now();
  const wait = Math.max(0, lastRequestTime + RATE_LIMIT_MS - now);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestTime = Date.now();

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`Graph query failed: ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0].message);
  return data.data;
}

export interface GraphPool {
  id: string;
  token0: { id: string; symbol: string; decimals: number };
  token1: { id: string; symbol: string; decimals: number };
  liquidity: string;
  sqrtPriceX96: string;
  tick: string;
  feeTier: string;
  volumeUSD: string;
  txCount: string;
  totalValueLockedUSD: string;
}

export interface GraphTick {
  id: string;
  tickIdx: string;
  liquidityNet: string;
  liquidityGross: string;
  price0: string;
  price1: string;
}

export interface GraphPosition {
  id: string;
  owner: string;
  liquidity: string;
  tickLower: { tickIdx: string };
  tickUpper: { tickIdx: string };
  token0: { symbol: string };
  token1: { symbol: string };
  pool: { id: string };
}

/**
 * Get pool data from The Graph
 */
export async function getPoolData(poolAddress: string, endpoint: string): Promise<GraphPool | null> {
  const query = `
    query GetPool($id: ID!) {
      pool(id: $id) {
        id
        token0 { id symbol decimals }
        token1 { id symbol decimals }
        liquidity
        sqrtPriceX96
        tick
        feeTier
        volumeUSD
        txCount
        totalValueLockedUSD
      }
    }
  `;

  try {
    const data = await graphQuery(endpoint, query, { id: poolAddress.toLowerCase() });
    return data?.pool || null;
  } catch (e) {
    console.warn('Graph pool query failed:', e);
    return null;
  }
}

/**
 * Get active ticks around current price for depth analysis
 * This is the KEY function for real depth calculation in V3 pools
 */
export async function getPoolTicks(
  poolAddress: string,
  endpoint: string,
  currentTick: number,
  range: number = 100 // Ticks to fetch on each side
): Promise<GraphTick[]> {
  const query = `
    query GetTicks($pool: String!, $tickLower: Int!, $tickUpper: Int!) {
      ticks(
        where: {
          pool: $pool,
          tickIdx_gte: $tickLower,
          tickIdx_lte: $tickUpper
        }
        orderBy: tickIdx
        orderDirection: asc
        first: 1000
      ) {
        id
        tickIdx
        liquidityNet
        liquidityGross
        price0
        price1
      }
    }
  `;

  try {
    const data = await graphQuery(endpoint, query, {
      pool: poolAddress.toLowerCase(),
      tickLower: currentTick - range,
      tickUpper: currentTick + range,
    });
    return data?.ticks || [];
  } catch (e) {
    console.warn('Graph ticks query failed:', e);
    return [];
  }
}

/**
 * Get LP positions for a pool (concentration analysis)
 */
export async function getPoolPositions(poolAddress: string, endpoint: string): Promise<GraphPosition[]> {
  const query = `
    query GetPositions($pool: String!) {
      positions(
        where: { pool: $pool, liquidity_gt: 0 }
        orderBy: liquidity
        orderDirection: desc
        first: 100
      ) {
        id
        owner
        liquidity
        tickLower { tickIdx }
        tickUpper { tickIdx }
        token0 { symbol }
        token1 { symbol }
        pool { id }
      }
    }
  `;

  try {
    const data = await graphQuery(endpoint, query, { pool: poolAddress.toLowerCase() });
    return data?.positions || [];
  } catch (e) {
    console.warn('Graph positions query failed:', e);
    return [];
  }
}

/**
 * Calculate depth bands from V3 tick data
 * This converts tick liquidity into USD depth at specific slippage levels
 */
export function calculateV3DepthBands(
  ticks: GraphTick[],
  currentSqrtPriceX96: string,
  token0Decimals: number,
  token1Decimals: number,
  token0PriceUsd: number,
  slippageLevels: number[] = [0.005, 0.01, 0.02, 0.05, 0.1]
): DepthBand[] {
  const Q96 = 2n ** 96n;
  const sqrtPrice = BigInt(currentSqrtPriceX96);
  const currentPrice = Number((sqrtPrice * sqrtPrice * 10n ** BigInt(token0Decimals)) / (Q96 * Q96 * 10n ** BigInt(token1Decimals)));

  const bands: DepthBand[] = [];
  let cumulativeDepth = 0;

  for (const slippage of slippageLevels) {
    const targetPrice = currentPrice * (1 + slippage);
    let depthAtSlippage = 0;

    // Sum liquidity in ticks between current and target
    for (const tick of ticks) {
      const tickIdx = parseInt(tick.tickIdx);
      const tickPrice = 1.0001 ** tickIdx;

      if ((slippage > 0 && tickPrice <= targetPrice && tickPrice >= currentPrice) ||
          (slippage < 0 && tickPrice >= targetPrice && tickPrice <= currentPrice)) {
        const liquidity = parseFloat(tick.liquidityNet);
        // Convert liquidity to USD depth (simplified)
        const depthUsd = liquidity * token0PriceUsd * Math.sqrt(tickPrice);
        depthAtSlippage += depthUsd;
      }
    }

    cumulativeDepth += depthAtSlippage;
    bands.push({
      slippage,
      depthUsd: depthAtSlippage,
      cumulativeDepth,
    });
  }

  return bands;
}

/**
 * Fallback: When The Graph is unavailable, estimate depth from TVL
 */
export function estimateDepthFromTVL(tvl: number, slippage: number): number {
  // V2-style constant product approximation
  // Depth at slippage S ≈ TVL * S / (1 + S) for small S
  if (slippage <= 0) return 0;
  return tvl * slippage / (1 + slippage);
}
