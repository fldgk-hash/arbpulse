// ============================================
// SolanaFM API Adapter
// Free tier: generous limits for basic queries
// https://docs.solana.fm/
// ============================================

const BASE_URL = 'https://api.solana.fm/v1';
const RATE_LIMIT_MS = 300; // Conservative

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, lastRequestTime + RATE_LIMIT_MS - now);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestTime = Date.now();
  return fetch(url);
}

export interface SolanaFMAccount {
  account: string;
  lamports: number;
  ownerProgram: string;
  executable: boolean;
  rentEpoch: number;
  data: {
    parsed?: any;
    raw?: string;
  };
}

export interface SolanaFMTransaction {
  signature: string;
  blockTime: number;
  status: string;
  fee: number;
  lamport: number;
  signer: string[];
  parsedInstructions: {
    type: string;
    programId: string;
    data: any;
  }[];
}

export interface SolanaFMTokenAccount {
  tokenAccount: string;
  mint: string;
  owner: string;
  amount: number;
  decimals: number;
}

/**
 * Get account info
 */
export async function getAccountInfo(address: string): Promise<SolanaFMAccount | null> {
  try {
    const url = `${BASE_URL}/accounts/${address}`;
    const res = await rateLimitedFetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.result || null;
  } catch (e) {
    console.warn('SolanaFM account info failed:', e);
    return null;
  }
}

/**
 * Get transaction history for an account
 */
export async function getAccountTransactions(
  address: string,
  limit: number = 50,
  before?: string
): Promise<SolanaFMTransaction[]> {
  try {
    let url = `${BASE_URL}/accounts/${address}/transactions?limit=${limit}`;
    if (before) url += `&before=${before}`;
    const res = await rateLimitedFetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.result?.transactions || [];
  } catch (e) {
    console.warn('SolanaFM transactions failed:', e);
    return [];
  }
}

/**
 * Get token accounts for a wallet
 */
export async function getTokenAccounts(wallet: string): Promise<SolanaFMTokenAccount[]> {
  try {
    const url = `${BASE_URL}/tokens/${wallet}/accounts`;
    const res = await rateLimitedFetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.result || [];
  } catch (e) {
    console.warn('SolanaFM token accounts failed:', e);
    return [];
  }
}

/**
 * Get token metadata
 */
export async function getTokenMetadata(mint: string): Promise<any | null> {
  try {
    const url = `${BASE_URL}/tokens/${mint}`;
    const res = await rateLimitedFetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.result || null;
  } catch (e) {
    console.warn('SolanaFM token metadata failed:', e);
    return null;
  }
}

/**
 * Analyze deployer wallet history
 * Returns: age in days, token launch count, linked wallets
 */
export async function analyzeDeployerHistory(deployerAddress: string): Promise<{
  ageDays: number;
  transactionCount: number;
  tokenLaunches: number;
  linkedWallets: string[];
  fundingSource: 'cex' | 'bridge' | 'mixer' | 'unknown';
}> {
  const transactions = await getAccountTransactions(deployerAddress, 100);

  if (transactions.length === 0) {
    return {
      ageDays: 0,
      transactionCount: 0,
      tokenLaunches: 0,
      linkedWallets: [],
      fundingSource: 'unknown',
    };
  }

  // Calculate age
  const oldestTx = Math.min(...transactions.map(tx => tx.blockTime));
  const ageDays = Math.floor((Date.now() / 1000 - oldestTx) / 86400);

  // Count token launches (CreateAccount + InitializeMint instructions)
  const tokenLaunches = transactions.filter(tx =>
    tx.parsedInstructions.some(inst =>
      inst.type === 'initializeMint' ||
      inst.type === 'createAccount' && inst.data?.owner?.includes('Token')
    )
  ).length;

  // Find linked wallets (frequent counterparties)
  const counterpartyCounts: Record<string, number> = {};
  transactions.forEach(tx => {
    tx.signer.forEach(signer => {
      if (signer !== deployerAddress) {
        counterpartyCounts[signer] = (counterpartyCounts[signer] || 0) + 1;
      }
    });
  });

  const linkedWallets = Object.entries(counterpartyCounts)
    .filter(([, count]) => count >= 3)
    .map(([addr]) => addr)
    .slice(0, 10);

  // Detect funding source from first transaction
  const firstTx = transactions[transactions.length - 1]; // Oldest
  const fundingSource = detectFundingSource(firstTx);

  return {
    ageDays,
    transactionCount: transactions.length,
    tokenLaunches,
    linkedWallets,
    fundingSource,
  };
}

function detectFundingSource(tx: SolanaFMTransaction): 'cex' | 'bridge' | 'mixer' | 'unknown' {
  // Known CEX program IDs (simplified)
  const CEX_PROGRAMS = [
    '11111111111111111111111111111111', // System program, often used by CEXes
    // Add more known CEX program IDs
  ];

  const BRIDGE_PROGRAMS = [
    'worm2ZoG...', // Wormhole
    // Add more bridge program IDs
  ];

  for (const inst of tx.parsedInstructions) {
    if (CEX_PROGRAMS.includes(inst.programId)) return 'cex';
    if (BRIDGE_PROGRAMS.includes(inst.programId)) return 'bridge';
  }

  return 'unknown';
}
