// ============================================
// DexScreener API Adapter
// Free tier: 300 requests/minute
// https://docs.dexscreener.com/
// ============================================

import { TokenPair } from '../types/liquidity.types';

const BASE_URL = 'https://api.dexscreener.com/latest/dex';
const RATE_LIMIT_MS = 200; // 300 req/min = 1 per 200ms

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, lastRequestTime + RATE_LIMIT_MS - now);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestTime = Date.now();
  return fetch(url);
}

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; symbol: string; name: string };
  quoteToken: { address: string; symbol: string; name: string };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  marketCap: number;
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    websites?: string[];
    socials?: { type: string; url: string }[];
  };
}

export interface DexScreenerResponse {
  schemaVersion: string;
  pairs: DexScreenerPair[];
}

/**
 * Fetch pairs by token address (multi-chain)
 */
export async function getPairsByToken(tokenAddress: string): Promise<DexScreenerPair[]> {
  const url = `${BASE_URL}/tokens/${tokenAddress}`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) throw new Error(`DexScreener tokens API failed: ${res.status}`);
  const data: DexScreenerResponse = await res.json();
  return data.pairs || [];
}

/**
 * Fetch specific pair by address
 */
export async function getPairByAddress(chain: string, pairAddress: string): Promise<DexScreenerPair | null> {
  const url = `${BASE_URL}/pairs/${chain}/${pairAddress}`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) throw new Error(`DexScreener pairs API failed: ${res.status}`);
  const data: DexScreenerResponse = await res.json();
  return data.pairs?.[0] || null;
}

/**
 * Search pairs by query
 */
export async function searchPairs(query: string): Promise<DexScreenerPair[]> {
  const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) throw new Error(`DexScreener search API failed: ${res.status}`);
  const data: DexScreenerResponse = await res.json();
  return data.pairs || [];
}

/**
 * Convert DexScreener pair to our TokenPair type
 */
export function normalizeDexScreenerPair(pair: DexScreenerPair): TokenPair {
  const chain = pair.chainId.toLowerCase() as 'solana' | 'bsc' | 'ethereum';
  const age = pair.pairCreatedAt 
    ? Math.floor((Date.now() - pair.pairCreatedAt) / (1000 * 60 * 60 * 24))
    : undefined;

  return {
    chain,
    address: pair.pairAddress,
    baseToken: {
      address: pair.baseToken.address,
      symbol: pair.baseToken.symbol,
      decimals: 9, // Will be refined by chain-specific adapters
    },
    quoteToken: {
      address: pair.quoteToken.address,
      symbol: pair.quoteToken.symbol,
      decimals: 9,
    },
    dexId: pair.dexId,
    priceUsd: parseFloat(pair.priceUsd) || 0,
    liquidityUsd: pair.liquidity?.usd || 0,
    volume24h: pair.volume?.h24 || 0,
    volume6h: pair.volume?.h6,
    volume1h: pair.volume?.h1,
    age,
  };
}

/**
 * Batch fetch multiple pairs (respects rate limits)
 */
export async function batchFetchPairs(addresses: { chain: string; address: string }[]): Promise<Map<string, DexScreenerPair>> {
  const results = new Map<string, DexScreenerPair>();

  for (const { chain, address } of addresses) {
    try {
      const pair = await getPairByAddress(chain, address);
      if (pair) results.set(address, pair);
    } catch (e) {
      console.warn(`Failed to fetch ${chain}/${address}:`, e);
    }
  }

  return results;
}
