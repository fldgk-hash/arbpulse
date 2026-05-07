// ============================================
// Chain Explorer Adapters (Free Tiers)
// BSCScan: 5 calls/sec (free API key)
// SolanaFM: 50 req/min (free tier)
// ============================================

const BSCSCAN_API_KEY = process.env.VITE_BSCSCAN_API_KEY || '';
const BSCSCAN_BASE = 'https://api.bscscan.com/api';

const SOLANAFM_BASE = 'https://api.solana.fm/v0';

// Rate limiters
let bscLastCall = 0;
let solanaFmLastCall = 0;

async function bscRateLimit(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, bscLastCall + 200 - now); // 5/sec = 200ms
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  bscLastCall = Date.now();
}

async function solanaFmRateLimit(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, solanaFmLastCall + 1200 - now); // 50/min = 1200ms
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  solanaFmLastCall = Date.now();
}

// ============ BSCScan ============

export interface BSCContractInfo {
  address: string;
  isVerified: boolean;
  sourceCode?: string;
  abi?: any[];
  compilerVersion?: string;
  optimizationUsed?: boolean;
}

export interface BSCTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  timeStamp: string;
  input: string;
  isError: string;
}

/**
 * Get contract ABI and source code
 */
export async function getBSCContractInfo(address: string): Promise<BSCContractInfo | null> {
  await bscRateLimit();

  try {
    const url = `${BSCSCAN_BASE}?module=contract&action=getsourcecode&address=${address}&apikey=${BSCSCAN_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    if (data.status !== '1' || !data.result?.[0]) return null;

    const result = data.result[0];
    return {
      address,
      isVerified: result.ABI !== 'Contract source code not verified',
      sourceCode: result.SourceCode,
      abi: result.ABI !== 'Contract source code not verified' ? JSON.parse(result.ABI) : undefined,
      compilerVersion: result.CompilerVersion,
      optimizationUsed: result.OptimizationUsed === '1',
    };
  } catch (e) {
    console.warn('BSCScan contract info failed:', e);
    return null;
  }
}

/**
 * Get transaction history for an address
 */
export async function getBSCTransactions(
  address: string,
  startBlock: number = 0,
  endBlock: number = 99999999,
  page: number = 1,
  offset: number = 50
): Promise<BSCTx[]> {
  await bscRateLimit();

  try {
    const url = `${BSCSCAN_BASE}?module=account&action=txlist&address=${address}&startblock=${startBlock}&endblock=${endBlock}&page=${page}&offset=${offset}&sort=desc&apikey=${BSCSCAN_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.status === '1' ? data.result : [];
  } catch (e) {
    console.warn('BSCScan tx history failed:', e);
    return [];
  }
}

/**
 * Check if contract has mint function in ABI
 */
export function hasMintFunction(abi: any[]): boolean {
  if (!abi || !Array.isArray(abi)) return false;
  return abi.some(item => 
    item.type === 'function' && 
    (item.name?.toLowerCase().includes('mint') || 
     item.name?.toLowerCase().includes('increase'))
  );
}

/**
 * Check for blacklist function
 */
export function hasBlacklistFunction(abi: any[]): boolean {
  if (!abi || !Array.isArray(abi)) return false;
  return abi.some(item =>
    item.type === 'function' &&
    (item.name?.toLowerCase().includes('blacklist') ||
     item.name?.toLowerCase().includes('ban'))
  );
}

/**
 * Check for pause/unpause
 */
export function hasPausableFunctions(abi: any[]): boolean {
  if (!abi || !Array.isArray(abi)) return false;
  return abi.some(item =>
    item.type === 'function' &&
    (item.name?.toLowerCase().includes('pause') ||
     item.name?.toLowerCase().includes('unpause') ||
     item.name?.toLowerCase().includes('paused'))
  );
}

// ============ SolanaFM ============

export interface SolanaAccount {
  pubkey: string;
  lamports: number;
  owner: string;
  executable: boolean;
  rentEpoch: number;
  data: any;
}

export interface SolanaTx {
  signature: string;
  blockTime: number;
  status: string;
  fee: number;
  instructions: {
    programId: string;
    type: string;
    data: any;
  }[];
}

/**
 * Get Solana account info
 */
export async function getSolanaAccount(address: string): Promise<SolanaAccount | null> {
  await solanaFmRateLimit();

  try {
    const url = `${SOLANAFM_BASE}/accounts/${address}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.result || null;
  } catch (e) {
    console.warn('SolanaFM account failed:', e);
    return null;
  }
}

/**
 * Get transaction history for Solana address
 */
export async function getSolanaTransactions(address: string, limit: number = 50): Promise<SolanaTx[]> {
  await solanaFmRateLimit();

  try {
    const url = `${SOLANAFM_BASE}/accounts/${address}/transactions?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.result?.transactions || [];
  } catch (e) {
    console.warn('SolanaFM tx history failed:', e);
    return [];
  }
}

/**
 * Detect mint instructions in Solana transactions
 */
export function detectMintInstructions(txs: SolanaTx[]): {
  hasMint: boolean;
  mintCount: number;
  mintAuthority: string | null;
} {
  let mintCount = 0;
  let mintAuthority: string | null = null;

  for (const tx of txs) {
    for (const ix of tx.instructions) {
      if (ix.type?.toLowerCase().includes('mint') || 
          ix.data?.mintAuthority ||
          ix.data?.mint) {
        mintCount++;
        if (ix.data?.mintAuthority) {
          mintAuthority = ix.data.mintAuthority;
        }
      }
    }
  }

  return {
    hasMint: mintCount > 0,
    mintCount,
    mintAuthority,
  };
}

/**
 * Calculate deployer age from first transaction
 */
export function calculateDeployerAge(txs: SolanaTx[] | BSCTx[]): number {
  if (!txs.length) return 0;

  const firstTx = [...txs].sort((a, b) => {
    const timeA = 'timeStamp' in a ? parseInt(a.timeStamp) * 1000 : a.blockTime * 1000;
    const timeB = 'timeStamp' in b ? parseInt(b.timeStamp) * 1000 : b.blockTime * 1000;
    return timeA - timeB;
  })[0];

  const firstTime = 'timeStamp' in firstTx 
    ? parseInt(firstTx.timeStamp) * 1000 
    : firstTx.blockTime * 1000;

  return Math.floor((Date.now() - firstTime) / (1000 * 60 * 60 * 24));
}
