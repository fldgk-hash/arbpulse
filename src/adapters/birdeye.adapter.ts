// ============================================
// Birdeye API Adapter (Solana)
// Free tier: 100 requests/minute
// https://docs.birdeye.so/
// ============================================

import { LPPosition } from '../types/liquidity.types';

const BASE_URL = 'https://public-api.birdeye.so';
const API_KEY = process.env.VITE_BIRDEYE_API_KEY || ''; // Optional, higher limits with key
const RATE_LIMIT_MS = 600; // 100 req/min = 1 per 600ms (conservative)

let lastRequestTime = 0;

async function rateLimitedFetch(url: string, options?: RequestInit): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, lastRequestTime + RATE_LIMIT_MS - now);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestTime = Date.now();

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(API_KEY ? { 'X-API-KEY': API_KEY } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };

  return fetch(url, { ...options, headers });
}

export interface BirdeyeTokenOverview {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  price: number;
  priceChange24hPercent: number;
  volume24hUSD: number;
  marketCapUSD: number;
  liquidityUSD: number;
  holderCount: number;
  top10HolderPercent: number;
}

export interface BirdeyePool {
  address: string;
  tokenA: string;
  tokenB: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  liquidity: number;
  volume24h: number;
  feeRate: number;
  apr24h: number;
}

export interface BirdeyeHolder {
  owner: string;
  amount: number;
  percentage: number;
  rank: number;
}

/**
 * Get token overview with holder stats
 */
export async function getTokenOverview(tokenAddress: string): Promise<BirdeyeTokenOverview | null> {
  try {
    const url = `${BASE_URL}/defi/token_overview?address=${tokenAddress}`;
    const res = await rateLimitedFetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch (e) {
    console.warn('Birdeye token overview failed:', e);
    return null;
  }
}

/**
 * Get top holders for concentration analysis
 */
export async function getTopHolders(tokenAddress: string, limit: number = 20): Promise<BirdeyeHolder[]> {
  try {
    const url = `${BASE_URL}/defi/token_holder?address=${tokenAddress}&offset=0&limit=${limit}`;
    const res = await rateLimitedFetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data.items || [] : [];
  } catch (e) {
    console.warn('Birdeye holders failed:', e);
    return [];
  }
}

/**
 * Get pools for a token
 */
export async function getTokenPools(tokenAddress: string): Promise<BirdeyePool[]> {
  try {
    const url = `${BASE_URL}/defi/v2/pools?address=${tokenAddress}`;
    const res = await rateLimitedFetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data.items || [] : [];
  } catch (e) {
    console.warn('Birdeye pools failed:', e);
    return [];
  }
}

/**
 * Convert Birdeye holders to LP positions
 * Note: Birdeye gives token holders, not LP holders. 
 * For LP concentration, we need to cross-reference with pool data.
 */
export function holdersToLpPositions(holders: BirdeyeHolder[]): LPPosition[] {
  return holders.map(h => ({
    owner: h.owner,
    liquidityAmount: h.amount,
    sharePercent: h.percentage,
  }));
}

/**
 * Get OHLCV data for volume analysis
 */
export async function getTokenOHLCV(
  tokenAddress: string,
  timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '12h' | '1d' = '1h',
  limit: number = 24
): Promise<{ time: number; open: number; high: number; low: number; close: number; volume: number }[]> {
  try {
    const url = `${BASE_URL}/defi/ohlcv?address=${tokenAddress}&type=${timeframe}&limit=${limit}`;
    const res = await rateLimitedFetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data.items || [] : [];
  } catch (e) {
    console.warn('Birdeye OHLCV failed:', e);
    return [];
  }
}
