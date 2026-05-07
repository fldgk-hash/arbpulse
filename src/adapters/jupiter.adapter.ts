// ============================================
// Jupiter Aggregator API Adapter
// Free tier: No API key required, generous limits
// https://station.jup.ag/docs/
// ============================================

const BASE_URL = 'https://quote-api.jup.ag/v6';
const RATE_LIMIT_MS = 200; // Conservative

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, lastRequestTime + RATE_LIMIT_MS - now);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestTime = Date.now();
  return fetch(url);
}

export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: {
    amount: string;
    feeBps: number;
  } | null;
  priceImpactPct: string;
  routePlan: {
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }[];
  contextSlot: number;
  timeTaken: number;
}

export interface JupiterSwapInstructions {
  tokenLedgerInstruction: any;
  computeBudgetInstructions: any[];
  setupInstructions: any[];
  swapInstruction: any;
  cleanupInstruction: any | null;
  addressLookupTableAddresses: string[];
  prioritizationFeeLamports: number;
}

/**
 * Get quote for a swap (used for slippage simulation)
 */
export async function getQuote(
  inputMint: string,
  outputMint: string,
  amount: number, // In base units
  slippageBps: number = 50, // 0.5%
  onlyDirectRoutes: boolean = false
): Promise<JupiterQuote | null> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amount.toString(),
    slippageBps: slippageBps.toString(),
    onlyDirectRoutes: onlyDirectRoutes.toString(),
  });

  try {
    const url = `${BASE_URL}/quote?${params}`;
    const res = await rateLimitedFetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('Jupiter quote failed:', e);
    return null;
  }
}

/**
 * Simulate slippage for multiple position sizes
 * Returns: slippage % for each size tested
 */
export async function simulateSlippageCurve(
  inputMint: string,
  outputMint: string,
  positionSizes: number[], // In USD
  tokenPrice: number,
  decimals: number = 6
): Promise<{ size: number; slippagePct: number; priceImpactPct: number }[]> {
  const results = [];

  for (const sizeUsd of positionSizes) {
    const amount = Math.floor((sizeUsd / tokenPrice) * 10 ** decimals);

    try {
      const quote = await getQuote(inputMint, outputMint, amount, 50);
      if (quote) {
        results.push({
          size: sizeUsd,
          slippagePct: parseFloat(quote.priceImpactPct),
          priceImpactPct: parseFloat(quote.priceImpactPct),
        });
      } else {
        results.push({
          size: sizeUsd,
          slippagePct: Infinity,
          priceImpactPct: Infinity,
        });
      }
    } catch {
      results.push({
        size: sizeUsd,
        slippagePct: Infinity,
        priceImpactPct: Infinity,
      });
    }
  }

  return results;
}

/**
 * Get swap instructions (for actual execution, not analysis)
 */
export async function getSwapInstructions(
  quoteResponse: JupiterQuote,
  userPublicKey: string,
  wrapAndUnwrapSol: boolean = true
): Promise<JupiterSwapInstructions | null> {
  try {
    const res = await fetch(`${BASE_URL}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('Jupiter swap instructions failed:', e);
    return null;
  }
}

/**
 * Get token list (for address resolution)
 */
export async function getTokenList(): Promise<{ address: string; symbol: string; name: string; decimals: number }[]> {
  try {
    const res = await fetch('https://token.jup.ag/all');
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.warn('Jupiter token list failed:', e);
    return [];
  }
}
