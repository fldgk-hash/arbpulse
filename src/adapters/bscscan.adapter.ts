// ============================================
// BSCScan API Adapter
// Free tier: 5 calls/second (API key required but free)
// https://docs.bscscan.com/
// ============================================

const BASE_URL = 'https://api.bscscan.com/api';
const API_KEY = process.env.VITE_BSCSCAN_API_KEY || 'YourFreeApiKeyHere';
const RATE_LIMIT_MS = 250; // 5 req/sec = 1 per 200ms, use 250ms for safety

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, lastRequestTime + RATE_LIMIT_MS - now);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestTime = Date.now();
  return fetch(url);
}

export interface BscScanContract {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
}

export interface BscScanTx {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
}

export interface BscScanTokenHolder {
  TokenHolderAddress: string;
  TokenHolderQuantity: string;
  TokenHolderShare: string;
}

/**
 * Get contract ABI and source code
 */
export async function getContractSource(address: string): Promise<BscScanContract | null> {
  const url = `${BASE_URL}?module=contract&action=getsourcecode&address=${address}&apikey=${API_KEY}`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.status === '1' && data.result?.[0] ? data.result[0] : null;
}

/**
 * Check if contract is verified
 */
export async function isContractVerified(address: string): Promise<boolean> {
  const source = await getContractSource(address);
  return !!source && source.ABI !== 'Contract source code not verified';
}

/**
 * Get contract ABI for local simulation
 */
export async function getContractABI(address: string): Promise<any[] | null> {
  const url = `${BASE_URL}?module=contract&action=getabi&address=${address}&apikey=${API_KEY}`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== '1') return null;
  try {
    return JSON.parse(data.result);
  } catch {
    return null;
  }
}

/**
 * Get internal transactions (for tracing mint calls, etc.)
 */
export async function getInternalTransactions(address: string): Promise<BscScanTx[]> {
  const url = `${BASE_URL}?module=account&action=txlistinternal&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${API_KEY}`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.status === '1' ? data.result : [];
}

/**
 * Get token holders
 */
export async function getTokenHolders(tokenAddress: string, page: number = 1, offset: number = 50): Promise<BscScanTokenHolder[]> {
  const url = `${BASE_URL}?module=token&action=tokenholderlist&contractaddress=${tokenAddress}&page=${page}&offset=${offset}&apikey=${API_KEY}`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.status === '1' ? data.result : [];
}

/**
 * Get account transaction history (for deployer analysis)
 */
export async function getAccountTransactions(address: string, page: number = 1, offset: number = 50): Promise<BscScanTx[]> {
  const url = `${BASE_URL}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=${offset}&sort=asc&apikey=${API_KEY}`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.status === '1' ? data.result : [];
}

/**
 * Detect mint function in contract ABI
 */
export function detectMintFunction(abi: any[]): boolean {
  return abi.some(item => 
    item.type === 'function' && 
    (item.name?.toLowerCase().includes('mint') ||
     item.name?.toLowerCase().includes('issue') ||
     item.name?.toLowerCase().includes('mintto'))
  );
}

/**
 * Detect pause function
 */
export function detectPauseFunction(abi: any[]): boolean {
  return abi.some(item =>
    item.type === 'function' &&
    (item.name?.toLowerCase().includes('pause') ||
     item.name?.toLowerCase().includes('unpause') ||
     item.name?.toLowerCase().includes('paused'))
  );
}

/**
 * Detect blacklist function
 */
export function detectBlacklistFunction(abi: any[]): boolean {
  return abi.some(item =>
    item.type === 'function' &&
    (item.name?.toLowerCase().includes('blacklist') ||
     item.name?.toLowerCase().includes('blacklisted') ||
     item.name?.toLowerCase().includes('isblacklisted'))
  );
}

/**
 * Detect proxy pattern
 */
export function detectProxyPattern(abi: any[]): boolean {
  return abi.some(item =>
    item.type === 'function' &&
    (item.name?.toLowerCase().includes('upgrade') ||
     item.name?.toLowerCase().includes('implementation') ||
     item.name?.toLowerCase().includes('proxy'))
  );
}
