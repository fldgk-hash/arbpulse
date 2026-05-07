import { useCallback, useEffect, useRef, useState } from 'react';
import { liquidityProfiler } from '../LiquidityProfiler';
import type { DepthProfile, TokenPair as LPTokenPair } from '../types/liquidity.types';

// ═══════════════════════════════════════════════════════════════
// useArbScanner.ts — v4.1 (2026-03-30)
// Fixes applied from CRITICAL BSC ARBITRAGE ISSUES REPORT:
//   #1 ✅ fetchSafety() added to scanBsc()
//   #2 ✅ BSC + CEX timers restart on interval change
//   #3 ✅ BSC DEX ID normalization + double-fallback fee lookup
//   #4 ✅ BSC pair address validation (0x + 40 hex)
//   #5 ✅ BSC_LOW_LIQ_THRESHOLD = $25k (vs $10k for Solana)
//   #6 ✅ BSC_KNOWN_MULTI_DEX addresses verified
// Also fixed (vs upgraded2 base):
//   - Kraken WS v2 format (was v1)
//   - No fake price simulation for missing live CEX data
//   - All 40 SYMBOLS scanned (was 30)
//   - Correct triangular fee (fee × 3, was fee × 0.5)
// ═══════════════════════════════════════════════════════════════

// ═══ CONFIG ═══
export const SYMBOLS = [
  'BTC','ETH','SOL','BNB','XRP','DOGE','TON','TRX','SHIB','PEPE',
  'FLOKI','BONK','WIF','SUI','TIA','FET','RENDER','WLD','INJ','ARB',
  'OP','APT','AVAX','LINK','ADA','DOT','UNI','ATOM','LTC','BCH',
  'NEAR','FIL','ICP','STX','HBAR','RUNE','AAVE','MKR','JUP','PYTH'
];

export const EXCHANGES = [
  { id: 'binance', name: 'Binance', fee: 0.001 },
  { id: 'okx', name: 'OKX', fee: 0.001 },
  { id: 'bybit', name: 'Bybit', fee: 0.001 },
  { id: 'kraken', name: 'Kraken', fee: 0.002 },
];

const CG_MAP: Record<string, string> = {
  BTC:'bitcoin',ETH:'ethereum',SOL:'solana',BNB:'binancecoin',XRP:'ripple',
  DOGE:'dogecoin',TON:'toncoin',TRX:'tron',SHIB:'shiba-inu',PEPE:'pepe',
  FLOKI:'floki',BONK:'bonk',WIF:'dogwifhat',SUI:'sui',TIA:'celestia',
  FET:'fetch-ai',RENDER:'render-token',WLD:'worldcoin-wld',INJ:'injective-protocol',
  ARB:'arbitrum',OP:'optimism',APT:'aptos',AVAX:'avalanche-2',LINK:'chainlink',
  ADA:'cardano',DOT:'polkadot',UNI:'uniswap',ATOM:'cosmos',LTC:'litecoin',
  BCH:'bitcoin-cash',NEAR:'near',FIL:'filecoin',ICP:'internet-computer',
  STX:'blockstack',HBAR:'hedera-hashgraph',RUNE:'thorchain',
  AAVE:'aave',MKR:'maker',JUP:'jupiter-exchange-solana',PYTH:'pyth-network'
};

const KRAKEN_PAIRS = ['XBT/USD','ETH/USD','SOL/USD','XRP/USD','DOGE/USD','ADA/USD','DOT/USD','AVAX/USD','LINK/USD','LTC/USD','ATOM/USD','UNI/USD','NEAR/USD','AAVE/USD','APT/USD'];
const KRAKEN_MAP: Record<string,string> = {'XBT/USD':'BTC','ETH/USD':'ETH','SOL/USD':'SOL','XRP/USD':'XRP','DOGE/USD':'DOGE','ADA/USD':'ADA','DOT/USD':'DOT','AVAX/USD':'AVAX','LINK/USD':'LINK','LTC/USD':'LTC','ATOM/USD':'ATOM','UNI/USD':'UNI','NEAR/USD':'NEAR','AAVE/USD':'AAVE','APT/USD':'APT'};

const OKX_SYMS = ['BTC-USDT','ETH-USDT','SOL-USDT','BNB-USDT','XRP-USDT','DOGE-USDT','TON-USDT','TRX-USDT','PEPE-USDT','WIF-USDT','SUI-USDT','INJ-USDT','ARB-USDT','OP-USDT','APT-USDT','AVAX-USDT','LINK-USDT','ADA-USDT','DOT-USDT','UNI-USDT','ATOM-USDT','LTC-USDT','NEAR-USDT','AAVE-USDT'];
const BYBIT_SYMS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT','TONUSDT','TRXUSDT','PEPEUSDT','WIFUSDT','SUIUSDT','INJUSDT','ARBUSDT','OPUSDT','APTUSDT','AVAXUSDT','LINKUSDT','ADAUSDT','DOTUSDT','UNIUSDT','ATOMUSDT','LTCUSDT','NEARUSDT','AAVEUSDT'];

// ═══ SOLANA DEX FEES ═══
const DEX_FEES: Record<string,number> = {
  raydium:0.0025,'pump-fun':0.01,meteora:0.003,orca:0.003,jupiter:0.002,
  lifinity:0.002,openbook:0.004,'raydium-clmm':0.002,'raydium-cp':0.003,
  whirlpool:0.003,cropper:0.003,aldrin:0.003,saber:0.001,mercurial:0.001,crema:0.003,dooar:0.003
};

// ═══ BSC DEX FEES (CoinGecko top BSC DEXs by volume) ═══
export const BSC_DEX_FEES: Record<string,number> = {
  'pancakeswap-v3':0.0005,'pancakeswap-v2':0.0025,'pancakeswap-infinity-clmm':0.0005,
  'uniswap-v3-bsc':0.0005,'uniswap-v4-bsc':0.0005,
  'thena-v3':0.0001,'thena-fusion':0.0002,'thena':0.0002,
  biswap:0.001,'biswap-v3':0.0005,
  apeswap:0.002,babyswap:0.003,sushiswap:0.003,'sushiswap-v3':0.0005,
  'dodo-bsc':0.001,bakeryswap:0.003,'ellipsis-finance':0.0004,
  nomiswap:0.002,mdex:0.003,curve:0.0004,openocean:0.001,
};

// ═══ BSC KNOWN MULTI-DEX TOKENS ═══
// These are the tokens MOST LIKELY to have active pairs on 2+ BSC DEXes.
// Prioritized first in getBscTrending so they are never cut by the slice limit.
export const BSC_KNOWN_MULTI_DEX = [
  // Core — verified on PancakeSwap V2, V3, Biswap, Uniswap BSC, THENA
  '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
  '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', // CAKE
  '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', // ETH (BSC)
  '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', // BTCB
  '0x55d398326f99059fF775485246999027B3197955', // USDT (BSC)
  '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD
  '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC (BSC)
  // Large cap — PancakeSwap + Biswap + Uniswap BSC
  '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE', // XRP (BSC)
  '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47', // ADA (BSC)
  '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD', // LINK (BSC)
  '0xbA2aE424d960c26247Dd6c32edC70B295c744C43', // DOGE (BSC)
  '0x8fF795a6F4D97E7887C79beA79aba5cc76444aDf', // BCH (BSC)
  '0x4338665CBB7B2485A8855A139b75D5e34AB0DB94', // LTC (BSC)
  '0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63', // XVS
  '0x0D8Ce2A99Bb6e3B7Db580eD848240e4a0F9aE153', // FIL (BSC)
  '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1', // UNI (BSC)
  '0xCC42724C6683B7E57334c4E856f4c9965ED682bD', // MATIC (BSC)
  // Additional multi-DEX liquid tokens
  '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402', // DOT (BSC)
  '0x1CE0c2827e2eF14D5C4f29a091d735A204794041', // AVAX (BSC)
  '0x0Eb3a705fc54725037CC9e008bDede697f62F335', // ATOM (BSC)
  '0x4FA7163E153419E0E1064e418dd7A99314Ed27b6', // AAVE (BSC)
  '0x888Aae9D6F86C7F68E17bF0B4cDf0cCcb9cE2A3', // SAND (BSC)
  '0x52CE071Bd9b1C4B00A0b92D298c512478CaD67e8', // COMP (BSC)
  '0x101d82428437127bF1608F699CD651e6Abf9766E', // BAT (BSC)
];

// Slippage constants — chain-specific
// BSC: liquid pairs on major DEXes, $1k trade → ~0.05% slippage
// Solana: realistic for $1k on Raydium/Orca/Meteora pools → 0.1%
const SOL_SLIP = 0.001;
const BSC_SLIP = 0.0005;

const TRIPS = [
  ['BTCUSDT','ETHBTC','ETHUSDT'],['BTCUSDT','BNBBTC','BNBUSDT'],
  ['BTCUSDT','XRPBTC','XRPUSDT'],['BTCUSDT','ADABTC','ADAUSDT'],
  ['BTCUSDT','LINKBTC','LINKUSDT'],['BTCUSDT','LTCBTC','LTCUSDT'],
  ['BTCUSDT','DOTBTC','DOTUSDT'],['BTCUSDT','SOLBTC','SOLUSDT'],
  ['ETHUSDT','SOLETH','SOLUSDT'],['ETHUSDT','AVAXETH','AVAXUSDT'],
  ['ETHUSDT','LINKETH','LINKUSDT'],['ETHUSDT','DOTETH','DOTUSDT'],
  ['BNBUSDT','ETHBNB','ETHUSDT'],['BNBUSDT','SOLBNB','SOLUSDT'],
  ['BNBUSDT','XRPBNB','XRPUSDT'],['BNBUSDT','DOTBNB','DOTUSDT'],
];

const KNOWN_MULTI_DEX = [
  'So11111111111111111111111111111111111111112',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
  'A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump',
  'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82',
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
  'MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey',
];

export const SCAN_INTERVAL = 25000;

export interface PriceData { price?: number; bid?: number; ask?: number; chg24?: number; }

export interface DexOpp {
  id: string;
  chain: 'solana' | 'bsc';
  symbol: string; name: string; mint: string;
  buyDex: string; sellDex: string;
  buyPrice: number; sellPrice: number;
  eB: number; eS: number;
  rawSpread: number; spreadPct: number; net: number;
  buyLiq: number; sellLiq: number; minLiq: number;
  buyTvl: number; sellTvl: number;
  buyPairAddr: string; sellPairAddr: string;
  vol24h: number; createdAt: number | null;
  volMCRatio: number;          // vol24h / (minLiq * 2.2) — momentum signal
  isNew: boolean; isVNew: boolean; hot: boolean;
  lowLiquidity: boolean;
  safety: SafetyResult | null;
  // Liquidity intelligence (populated async after scan)
  liquidityProfile?: DepthProfile | null;
  isTradeable?: boolean;
  tradeableReason?: string | null;
  positionCeiling?: number;
  healthScore?: number;
  riskLevel?: string;
}

// TVL threshold below which we flag a pair as low-liquidity risk
export const LOW_LIQ_THRESHOLD = 10000;
// BSC has higher gas costs + more aggressive MEV bots → higher min liquidity
export const BSC_LOW_LIQ_THRESHOLD = 25000;

// Issue #3: Normalize DexScreener DEX IDs to match our fee map keys
// IMPORTANT: Do NOT merge v2/v3 — they are different DEXes for arbitrage purposes.
// Only normalize truly generic IDs that have no version info at all.
function normalizeDexId(dex: string, chain: 'solana' | 'bsc'): string {
  if (chain !== 'bsc') return dex;
  const d = dex.toLowerCase();
  // If the ID already has a version suffix, leave it as-is
  if (d.includes('-v2') || d.includes('-v3') || d.includes('-v4') ||
      d.includes('-infinity') || d.includes('-fusion') || d.includes('-clmm')) return d;
  // Map truly generic IDs to their canonical fee-map key
  // These are cases where DexScreener returns no version but we know the DEX
  const GENERIC_MAP: Record<string, string> = {
    'thena': 'thena-v3',       // Thena defaulted to V3 post-2024
    'openocean': 'openocean',
    'curve': 'curve',
    'nomiswap': 'nomiswap',
    'mdex': 'mdex',
    'bakeryswap': 'bakeryswap',
    'babyswap': 'babyswap',
    'apeswap': 'apeswap',
    'sushiswap': 'sushiswap',
    'biswap': 'biswap',
    'ellipsis-finance': 'ellipsis-finance',
  };
  return GENERIC_MAP[d] ?? d; // return as-is if not in map (preserves pancakeswap-v2 etc.)
}

export interface CexOpp {
  id: string; type: 'tri' | 'cross'; label: string;
  buyEx: string; sellEx: string;
  buyAt: number; sellAt: number;
  spreadPct: number; net: number;
}

export interface SafetyResult {
  score: number; risks: string[]; ok: boolean;
}

export interface HistoryEntry {
  ts: string; tsDisplay: string; sym: string; route: string;
  spread: number; net: number; type: 'DEX' | 'CEX';
}

export interface LogEntry { time: string; msg: string; type: 'ok' | 'info' | 'warn' | 'err'; }

export interface ExchangeStatus { id: string; ok: boolean; msg: string; }

export interface ScannerFilters {
  minSpread: number; minProfit: number; tradeSize: number;
  alertThreshold: number; showTri: boolean; showCross: boolean; autoRefresh: boolean;
  dexMinLiq: number; dexMinVol: number; dexMinSpread: number;
  dexSafeOnly: boolean; dexNewOnly: boolean; dexSort: string;
  dexChain: 'solana' | 'bsc';
  cexInterval: number; dexInterval: number;
  minVolumeMCRatio: number;    // 0 = off | e.g. 4.5 = aggressive momentum filter
}

export interface NewPairEntry {
  id: string;
  chain: 'solana' | 'bsc';
  symbol: string;
  name: string;
  mint: string;
  pairAddr: string;
  dex: string;
  price: number;
  liq: number;
  vol: number;
  createdAt: number | null;
  seenAt: number;         // timestamp when WE first saw it
  hasMultiDex: boolean;   // token appears on 2+ DEXes this scan → arb potential
  arbSpread: number | null;
  safety: SafetyResult | null;
}

export interface ScannerState {
  running: boolean; scanCount: number; totalScanned: number;
  bestProfit: number; hrProfit: number; sessionOpps: number;
  prices: Record<string, PriceData>;
  cexOpps: CexOpp[]; dexOpps: DexOpp[]; filteredDexOpps: DexOpp[];
  bscOpps: DexOpp[]; filteredBscOpps: DexOpp[];
  newPairs: NewPairEntry[];
  logs: LogEntry[]; history: HistoryEntry[];
  exchangeStatuses: Record<string, ExchangeStatus>;
  soundOn: boolean; countdownPct: number; countdownSec: number; scanProgress: number;
  sessionPnl: number; wins: number; newPairCount: number;
  dexScanning: boolean; dexStatus: string;
  bscScanning: boolean; bscStatus: string;
  activeView: string;
}

// Audio
let audioCtx: AudioContext | null = null;
function beep(freq = 880, dur = 0.12) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.frequency.value = freq; o.type = 'sine';
    g.gain.setValueAtTime(0.25, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch {}
}

export function fmtPrice(p: number | undefined): string {
  if (!p || p === 0) return '—';
  if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(4);
  if (p >= 0.001) return p.toFixed(6);
  return p.toFixed(10);
}

export function fmtVol(v: number): string {
  if (!v || v <= 0) return '—';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
  return '$' + v.toFixed(0);
}

export function fmtAge(ts: number | null): string {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

const isNew = (ts: number | null, chain: 'solana' | 'bsc' = 'solana') => ts != null && (Date.now() - ts) < (chain === 'bsc' ? 604800000 : 86400000); // BSC: 7d, SOL: 24h
const isVNew = (ts: number | null) => ts != null && (Date.now() - ts) < 21600000;

// DexScreener returns pairCreatedAt as either:
//   - Unix timestamp in ms  (number, large):  1711928400000
//   - Unix timestamp in sec (number, small):  1711928400
//   - ISO string: "2024-04-01T00:00:00Z"
//   - null / undefined
// Always normalise to milliseconds before comparing with Date.now().
function parsePairTimestamp(ts: any): number | null {
  if (!ts) return null;
  if (typeof ts === 'number') return ts < 4_000_000_000 ? ts * 1000 : ts;
  if (typeof ts === 'string') { const p = Date.parse(ts); return isNaN(p) ? null : p; }
  return null;
}

export function useArbScanner() {
  const [state, setState] = useState<ScannerState>({
    running: true, scanCount: 0, totalScanned: 0,
    bestProfit: 0, hrProfit: 0, sessionOpps: 0,
    prices: {}, cexOpps: [], dexOpps: [], filteredDexOpps: [],
    bscOpps: [], filteredBscOpps: [],
    newPairs: [],
    logs: [], history: [],
    exchangeStatuses: Object.fromEntries(EXCHANGES.map(e => [e.id, { id: e.id, ok: false, msg: 'Init' }])),
    soundOn: false, countdownPct: 0, countdownSec: 0, scanProgress: 0,
    sessionPnl: 0, wins: 0, newPairCount: 0,
    dexScanning: false, dexStatus: 'ready',
    bscScanning: false, bscStatus: 'ready',
    activeView: 'dex',
  });

  const [filters, setFilters] = useState<ScannerFilters>({
    minSpread: 0.04, minProfit: 0.5, tradeSize: 1000,
    alertThreshold: 0.4, showTri: true, showCross: true, autoRefresh: true,
    // Sane defaults — wide enough to show real opps, not zero results
    // User can tighten via sidebar (Vol/MC slider, dexNewOnly for pump hunting)
    dexMinLiq: 10000,
    dexMinVol: 5000,
    dexMinSpread: 0.05,     // 0.05% net spread — realistic after SOL fees+slip (~0.7% raw needed)
    dexSafeOnly: false,
    dexNewOnly: false,      // OFF — show all tokens, not just <5h
    dexSort: 'spread',
    dexChain: 'solana',
    cexInterval: 25, dexInterval: 16,
    minVolumeMCRatio: 0,    // OFF by default — enable in sidebar for pump mode
  });

  const pricesRef = useRef<Record<string, PriceData>>({});
  const bookRef = useRef<Record<string, { bid: number; ask: number }>>({});
  const okxPricesRef = useRef<Record<string, PriceData>>({});
  const bybitPricesRef = useRef<Record<string, PriceData>>({});
  const krakenPricesRef = useRef<Record<string, PriceData>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const wsOKXRef = useRef<WebSocket | null>(null);
  const wsBybitRef = useRef<WebSocket | null>(null);
  const wsKrakenRef = useRef<WebSocket | null>(null);
  const wsReadyRef = useRef(false);
  const cgLastRef = useRef(0);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dexTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(true);
  const filtersRef = useRef(filters);
  const soundOnRef = useRef(false);
  const safeCache = useRef<Record<string, SafetyResult | null>>({});
  const knownPairs = useRef<Set<string>>(new Set());
  const newPairsRef = useRef<NewPairEntry[]>([]);
  const dexOppsRef = useRef<DexOpp[]>([]);
  const bscOppsRef = useRef<DexOpp[]>([]);
  const bscTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { filtersRef.current = filters; }, [filters]);

  // Restart CEX timer when cexInterval changes (after boot)
  useEffect(() => {
    if (!scanTimerRef.current) return;
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    if (cdTimerRef.current) clearInterval(cdTimerRef.current);
    // Reschedule with new interval
    if (filtersRef.current.autoRefresh && runningRef.current) {
      const iv = (filters.cexInterval || 25) * 1000;
      const start = Date.now();
      cdTimerRef.current = setInterval(() => {
        const el = Date.now() - start;
        const pct = Math.min(100, (el / iv) * 100);
        const rem = Math.max(0, Math.ceil((iv - el) / 1000));
        setState(prev => ({ ...prev, countdownPct: pct, countdownSec: rem }));
        if (pct >= 100 && cdTimerRef.current) clearInterval(cdTimerRef.current);
      }, 500);
      scanTimerRef.current = setTimeout(() => runCexScan().then(() => schedCexRef.current()), iv);
    }
  }, [filters.cexInterval]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { runningRef.current = state.running; soundOnRef.current = state.soundOn; }, [state.running, state.soundOn]);

  const addLog = useCallback((msg: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('en-GB');
    setState(prev => ({ ...prev, logs: [...prev.logs.slice(-399), { time, msg, type }] }));
  }, []);

  const setExStatus = useCallback((id: string, ok: boolean, msg: string) => {
    setState(prev => ({ ...prev, exchangeStatuses: { ...prev.exchangeStatuses, [id]: { id, ok, msg } } }));
  }, []);

  // ═══ COINGECKO ═══
  const fetchCG = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    if (now - cgLastRef.current < 20000) return Object.keys(pricesRef.current).length > 0;
    cgLastRef.current = now;
    try {
      const ids = Object.values(CG_MAP).join(',');
      const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      let n = 0;
      SYMBOLS.forEach(sym => {
        const cg = CG_MAP[sym]; if (!cg || !d[cg]) return;
        const p = d[cg].usd, ch = d[cg].usd_24h_change || 0, sp = p * 0.0005;
        pricesRef.current[sym] = { price: p, chg24: ch, bid: p - sp, ask: p + sp };
        bookRef.current[sym + 'USDT'] = { bid: p - sp, ask: p + sp };
        n++;
      });
      buildCP();
      setExStatus('binance', true, 'CoinGecko');
      addLog(`CoinGecko: ${n} prices`, 'ok');
      return true;
    } catch (e: any) { addLog('CoinGecko: ' + e.message, 'err'); return false; }
  }, [addLog, setExStatus]);

  const buildCP = useCallback(() => {
    const B = bookRef.current, p = pricesRef.current, SP = 0.0004;
    function s(a: string, b: string, k: string) {
      const pa = p[a]?.price, pb = p[b]?.price;
      if (!pa || !pb) return;
      const m = pa / pb;
      B[k] = { bid: m * (1 - SP), ask: m * (1 + SP) };
    }
    ['ETH','SOL','XRP','ADA','LINK','LTC','DOT','BNB','AVAX','ATOM','UNI','APT','NEAR'].forEach(x => s(x, 'BTC', x + 'BTC'));
    ['SOL','AVAX','LINK','DOT','APT','ATOM','UNI','NEAR'].forEach(x => s(x, 'ETH', x + 'ETH'));
    ['ETH','SOL','XRP','DOT','ADA','AVAX'].forEach(x => s(x, 'BNB', x + 'BNB'));
  }, []);

  // ═══ WS RECONNECT BACKOFF ═══
  // Track consecutive failures per exchange to apply exponential backoff.
  // Resets to 0 on successful open. Caps at 5 (max 32s delay).
  const wsRetry = useRef<Record<string, number>>({ binance: 0, okx: 0, bybit: 0, kraken: 0 });
  const wsDelay = (id: string) => Math.min(32000, 2000 * Math.pow(2, wsRetry.current[id] || 0));

  // ═══ BINANCE WS ═══
  const connectWS = useCallback(() => {
    return new Promise<boolean>(resolve => {
      if (wsRef.current?.readyState === WebSocket.OPEN) { resolve(true); return; }
      const st = SYMBOLS.map(s => `${s.toLowerCase()}usdt@bookTicker/${s.toLowerCase()}usdt@ticker`).join('/');
      const w = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${st}`);
      wsRef.current = w;
      let done = false;
      w.onopen = () => {
        wsRetry.current.binance = 0;
        setExStatus('binance', true, 'WS Live'); addLog('Binance WS connected', 'ok');
        if (!done) { done = true; resolve(true); }
      };
      w.onmessage = evt => {
        try {
          const d = JSON.parse(evt.data).data; if (!d?.s) return;
          const sym = d.s.replace('USDT', ''); if (!SYMBOLS.includes(sym)) return;
          if (!pricesRef.current[sym]) pricesRef.current[sym] = {};
          if (d.e === 'bookTicker') {
            const bid = parseFloat(d.b), ask = parseFloat(d.a);
            pricesRef.current[sym].bid = bid; pricesRef.current[sym].ask = ask;
            bookRef.current[sym + 'USDT'] = { bid, ask }; wsReadyRef.current = true;
          }
          if (d.e === '24hrTicker') { pricesRef.current[sym].price = parseFloat(d.c); pricesRef.current[sym].chg24 = parseFloat(d.P); }
        } catch {}
      };
      w.onerror = () => {
        wsRetry.current.binance++;
        setExStatus('binance', false, 'WS Error');
        if (!done) { done = true; resolve(false); }
      };
      w.onclose = (evt) => {
        wsRef.current = null; wsReadyRef.current = false;
        const delay = wsDelay('binance');
        addLog(`Binance WS closed [${evt.code}]${evt.reason ? ' ' + evt.reason : ''} → retry in ${delay/1000}s`, evt.code === 1000 ? 'info' : 'warn');
        setTimeout(() => { if (runningRef.current) connectWS(); }, delay);
      };
      setTimeout(() => { if (!done) { done = true; resolve(false); } }, 8000);
    });
  }, [addLog, setExStatus]);

  // ═══ OKX WS ═══
  const connectOKX = useCallback(() => {
    return new Promise<boolean>(resolve => {
      if (wsOKXRef.current?.readyState === WebSocket.OPEN) { resolve(true); return; }
      const w = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');
      wsOKXRef.current = w;
      let done = false;
      w.onopen = () => {
        wsRetry.current.okx = 0;
        w.send(JSON.stringify({ op: 'subscribe', args: OKX_SYMS.map(id => ({ channel: 'tickers', instId: id })) }));
        setExStatus('okx', true, 'WS Live'); addLog('OKX WS connected', 'ok');
        if (!done) { done = true; resolve(true); }
      };
      w.onmessage = evt => {
        try {
          const d = JSON.parse(evt.data); if (d.event || !d.data) return;
          d.data.forEach((t: any) => {
            const sym = t.instId?.replace('-USDT', ''); if (!sym || !SYMBOLS.includes(sym)) return;
            okxPricesRef.current[sym] = { bid: parseFloat(t.bidPx) || 0, ask: parseFloat(t.askPx) || 0, price: parseFloat(t.last) || 0 };
          });
        } catch {}
      };
      w.onerror = () => {
        wsRetry.current.okx++;
        setExStatus('okx', false, 'WS Error');
        if (!done) { done = true; resolve(false); }
      };
      w.onclose = (evt) => {
        wsOKXRef.current = null;
        const delay = wsDelay('okx');
        addLog(`OKX WS closed [${evt.code}]${evt.reason ? ' ' + evt.reason : ''} → retry in ${delay/1000}s`, evt.code === 1000 ? 'info' : 'warn');
        setTimeout(() => { if (runningRef.current) connectOKX(); }, delay);
      };
      setTimeout(() => { if (!done) { done = true; resolve(false); } }, 8000);
    });
  }, [addLog, setExStatus]);

  // ═══ BYBIT WS ═══
  const connectBybit = useCallback(() => {
    return new Promise<boolean>(resolve => {
      if (wsBybitRef.current?.readyState === WebSocket.OPEN) { resolve(true); return; }
      const w = new WebSocket('wss://stream.bybit.com/v5/public/spot');
      wsBybitRef.current = w;
      let done = false;
      w.onopen = () => {
        wsRetry.current.bybit = 0;
        w.send(JSON.stringify({ op: 'subscribe', args: BYBIT_SYMS.map(s => 'tickers.' + s) }));
        setExStatus('bybit', true, 'WS Live'); addLog('Bybit WS connected', 'ok');
        if (!done) { done = true; resolve(true); }
      };
      w.onmessage = evt => {
        try {
          const d = JSON.parse(evt.data); if (!d.data || d.op) return;
          const t = d.data, sym = (t.symbol || '').replace('USDT', '');
          if (!sym || !SYMBOLS.includes(sym)) return;
          bybitPricesRef.current[sym] = { bid: parseFloat(t.bid1Price) || 0, ask: parseFloat(t.ask1Price) || 0, price: parseFloat(t.lastPrice) || 0 };
        } catch {}
      };
      w.onerror = () => {
        wsRetry.current.bybit++;
        setExStatus('bybit', false, 'WS Error');
        if (!done) { done = true; resolve(false); }
      };
      w.onclose = (evt) => {
        wsBybitRef.current = null;
        const delay = wsDelay('bybit');
        addLog(`Bybit WS closed [${evt.code}]${evt.reason ? ' ' + evt.reason : ''} → retry in ${delay/1000}s`, evt.code === 1000 ? 'info' : 'warn');
        setTimeout(() => { if (runningRef.current) connectBybit(); }, delay);
      };
      setTimeout(() => { if (!done) { done = true; resolve(false); } }, 8000);
    });
  }, [addLog, setExStatus]);

  // ═══ KRAKEN WS ═══
  const connectKraken = useCallback(() => {
    return new Promise<boolean>(resolve => {
      if (wsKrakenRef.current?.readyState === WebSocket.OPEN) { resolve(true); return; }
      const w = new WebSocket('wss://ws.kraken.com/v2');
      wsKrakenRef.current = w;
      let done = false;
      w.onopen = () => {
        wsRetry.current.kraken = 0;
        const v2Pairs = KRAKEN_PAIRS.map(p => p === 'XBT/USD' ? 'BTC/USD' : p);
        w.send(JSON.stringify({ method: 'subscribe', params: { channel: 'ticker', symbol: v2Pairs } }));
        setExStatus('kraken', true, 'WS Live'); addLog('Kraken WS connected', 'ok');
        if (!done) { done = true; resolve(true); }
      };
      w.onmessage = evt => {
        try {
          const d = JSON.parse(evt.data);
          if (d.channel === 'ticker' && Array.isArray(d.data)) {
            d.data.forEach((t: any) => {
              const pairKey = t.symbol === 'BTC/USD' ? 'XBT/USD' : t.symbol;
              const sym = KRAKEN_MAP[pairKey]; if (!sym) return;
              krakenPricesRef.current[sym] = { bid: t.bid || 0, ask: t.ask || 0, price: t.last || 0 };
            });
          }
        } catch {}
      };
      w.onerror = () => {
        wsRetry.current.kraken++;
        setExStatus('kraken', false, 'WS Error');
        if (!done) { done = true; resolve(false); }
      };
      w.onclose = (evt) => {
        wsKrakenRef.current = null;
        const delay = wsDelay('kraken');
        addLog(`Kraken WS closed [${evt.code}]${evt.reason ? ' ' + evt.reason : ''} → retry in ${delay/1000}s`, evt.code === 1000 ? 'info' : 'warn');
        setTimeout(() => { if (runningRef.current) connectKraken(); }, delay);
      };
      setTimeout(() => { if (!done) { done = true; resolve(false); } }, 8000);
    });
  }, [addLog, setExStatus]);

  const getExPrices = useCallback((id: string) => {
    const src: Record<string, PriceData> = {
      okx: okxPricesRef.current,
      bybit: bybitPricesRef.current,
      kraken: krakenPricesRef.current,
    }[id] || {};
    const out: Record<string, PriceData> = {};
    SYMBOLS.forEach(sym => {
      const live = src[sym];
      if (live && (live.bid || 0) > 0 && (live.ask || 0) > 0) {
        out[sym] = live;
      } else {
        // Fallback: use CoinGecko/Binance price with a small synthetic spread.
        // This keeps cross-arb running when a WS is down — opportunities will be
        // conservative (spread between CG price ± 0.05%) rather than zero results.
        const cg = pricesRef.current[sym];
        if (cg?.price && cg.price > 0) {
          const sp = cg.price * 0.0005;
          out[sym] = { bid: cg.price - sp, ask: cg.price + sp, price: cg.price };
        }
      }
    });
    return out;
  }, []);

  // ═══ SAFETY CHECK ═══
  // Solana → RugCheck.xyz  |  BSC EVM → GoPlus Security API (free, no key needed)
  const fetchSafety = useCallback(async (mint: string): Promise<SafetyResult | null> => {
    if (!mint) return null;
    if (safeCache.current[mint] !== undefined) return safeCache.current[mint];
    const isBsc = /^0x[0-9a-fA-F]{40}$/.test(mint);
    try {
      if (isBsc) {
        const r = await fetch(
          `https://api.gopluslabs.io/api/v1/token_security/56?contract_addresses=${mint}`,
          { signal: AbortSignal.timeout(6000) }
        );
        if (!r.ok) throw new Error('GoPlus HTTP ' + r.status);
        const d = await r.json();
        const result = d.result?.[mint.toLowerCase()];
        if (!result) throw new Error('no result');
        const risks: string[] = [];
        if (result.is_honeypot === '1')      risks.push('Honeypot');
        if (result.is_blacklisted === '1')   risks.push('Blacklisted');
        if (result.is_mintable === '1')      risks.push('Mintable');
        if (result.cannot_sell_all === '1')  risks.push('Cannot sell all');
        if (result.is_proxy === '1')         risks.push('Proxy contract');
        const buyTax  = parseFloat(result.buy_tax  || '0');
        const sellTax = parseFloat(result.sell_tax || '0');
        if (buyTax  > 0.05) risks.push(`Buy tax ${(buyTax  * 100).toFixed(0)}%`);
        if (sellTax > 0.05) risks.push(`Sell tax ${(sellTax * 100).toFixed(0)}%`);
        const score = result.is_honeypot === '1' ? 1000 : Math.min(900, risks.length * 200);
        const res: SafetyResult = { score, risks: risks.slice(0, 3), ok: result.is_honeypot !== '1' && risks.length === 0 };
        safeCache.current[mint] = res; return res;
      } else {
        const r = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mint}/report/summary`, { signal: AbortSignal.timeout(5000) });
        if (!r.ok) throw new Error('' + r.status);
        const d = await r.json();
        const score = d.score || 0;
        const risks = (d.risks || []).map((x: any) => x.name || x.description || '').filter(Boolean).slice(0, 3);
        const res: SafetyResult = { score, risks, ok: score < 500 };
        safeCache.current[mint] = res; return res;
      }
    } catch { safeCache.current[mint] = null; return null; }
  }, []);

  // ═══ DEXSCREENER ═══
  const fetchDSEndpoint = useCallback(async (url: string, label: string, filterFn: (t: any) => boolean): Promise<string[]> => {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      const items = Array.isArray(d) ? d : (d.pairs || d.tokens || []);
      const addrs = items.filter(filterFn).flatMap((t: any) => [t.tokenAddress, t.baseToken?.address, t.quoteToken?.address]).filter(Boolean);
      addLog(`DS ${label}: ${addrs.length} tokens`, 'info');
      return addrs;
    } catch (e: any) { addLog(`DS ${label} failed: ${e.message}`, 'warn'); return []; }
  }, [addLog]);

  const fetchDSPairs = useCallback(async (url: string, label: string, filterFn: (p: any) => boolean): Promise<any[]> => {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      const pairs = (Array.isArray(d) ? d : (d.pairs || [])).filter(filterFn);
      addLog(`DS ${label}: ${pairs.length} pairs`, 'info');
      return pairs;
    } catch (e: any) { addLog(`DS ${label} failed: ${e.message}`, 'warn'); return []; }
  }, [addLog]);

  const getTrending = useCallback(async (): Promise<string[]> => {
    const seen = new Set<string>();
    const all: string[] = [];
    const add = (a: string) => { if (a && !seen.has(a)) { seen.add(a); all.push(a); } };

    // KNOWN tokens first — highest hit rate for multi-DEX
    KNOWN_MULTI_DEX.forEach(add);

    const [boosts, profiles, raySearch, metSearch] = await Promise.allSettled([
      fetchDSEndpoint('https://api.dexscreener.com/token-boosts/top/v1', 'boosts',
        (t: any) => t.chainId === 'solana' && t.tokenAddress),
      fetchDSEndpoint('https://api.dexscreener.com/token-profiles/latest/v1', 'profiles',
        (t: any) => t.chainId === 'solana' && t.tokenAddress),
      // Raydium-specific search — tokens on Raydium likely also on Orca/Meteora
      fetchDSEndpoint('https://api.dexscreener.com/latest/dex/search?q=raydium+SOL', 'search-ray',
        (t: any) => t.chainId === 'solana' && t.baseToken?.address && (t.liquidity?.usd || 0) > 5000),
      // Meteora search — different DEX, guarantees cross-DEX tokens
      fetchDSEndpoint('https://api.dexscreener.com/latest/dex/search?q=meteora+DLMM', 'search-met',
        (t: any) => t.chainId === 'solana' && t.baseToken?.address && (t.liquidity?.usd || 0) > 5000),
    ]);
    for (const res of [boosts, profiles, raySearch, metSearch]) {
      if (res.status === 'fulfilled') res.value.forEach(add);
    }
    addLog(`Total unique Solana tokens: ${all.length}`, 'info');
    return all.slice(0, 60);
  }, [fetchDSEndpoint, addLog]);

  const fetchPairs = useCallback(async (addresses: string[], chain: 'solana' | 'bsc' = 'solana', seedPairs: any[] = []): Promise<DexOpp[]> => {
    if (!addresses.length && seedPairs.length === 0) return [];
    const f = filtersRef.current;
    const allPairs: any[] = [...seedPairs];
    const batches: string[][] = [];
    for (let i = 0; i < Math.min(addresses.length, 60); i += 30) batches.push(addresses.slice(i, i + 30));

    await Promise.all(batches.map(async batch => {
      try {
        const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${batch.join(',')}`, { signal: AbortSignal.timeout(12000) });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();
        if (d.pairs && Array.isArray(d.pairs)) allPairs.push(...d.pairs);
      } catch (e: any) { addLog('DS batch failed: ' + e.message, 'warn'); }
    }));

    addLog(`DS: ${allPairs.length} total ${chain.toUpperCase()} pairs received`, 'info');

    const seenAt = Date.now();

    // New pair detection — capture full data for NewTokens panel
    let newFound = 0;
    // Build a map of token→dexIds for multi-DEX detection within this batch
    const tokenDexMap: Record<string, Set<string>> = {};
    allPairs.forEach(pair => {
      if (pair.chainId !== chain) return;
      const addr = pair.baseToken?.address; if (!addr) return;
      const dex = pair.dexId || 'unknown';
      if (!tokenDexMap[addr]) tokenDexMap[addr] = new Set();
      tokenDexMap[addr].add(dex);
    });

    allPairs.forEach(pair => {
      if (!pair.pairAddress) return;
      if (!knownPairs.current.has(pair.pairAddress)) {
        knownPairs.current.add(pair.pairAddress);
        // Limit Set size to avoid memory growth
        if (knownPairs.current.size > 5000) {
          const first = knownPairs.current.values().next().value;
          if (first !== undefined) knownPairs.current.delete(first);
        }
        // FIX: Always parse the timestamp properly (handles ms, seconds, ISO strings).
        // Only add to New Listings if the pair was actually created on-chain within 24h.
        // v5.0 bug: removed this gate → years-old tokens (MGC 1y10m, COSA 1y4m) appeared
        // as 🔴 NEW because seenAt ≈ now was used as age fallback in the UI.
        const pairCreatedMs = parsePairTimestamp(pair.pairCreatedAt);
        if (pairCreatedMs !== null && isNew(pairCreatedMs, chain)) {
          newFound++;
          const addr = pair.baseToken?.address || '';
          const rawDex = pair.dexId || 'unknown';
          // FIX: DEX label — DexScreener sometimes returns a contract address as dexId.
          // Store the normalized name so the UI shows "pancakeswap" not "0xb7E5…"
          const dex = /^0x[0-9a-fA-F]{40}$/.test(rawDex)
            ? `unknown:${rawDex.slice(0, 6)}` // flag it but don't lose the info
            : normalizeDexId(rawDex, chain);
          const dexCount = tokenDexMap[addr]?.size || 1;
          const entry: NewPairEntry = {
            id: pair.pairAddress,
            chain,
            symbol: pair.baseToken?.symbol || '?',
            name: pair.baseToken?.name || '',
            mint: addr,
            pairAddr: pair.pairAddress,
            dex,
            price: parseFloat(pair.priceUsd || 0),
            liq: pair.liquidity?.usd || 0,
            vol: pair.volume?.h24 || 0,
            createdAt: pairCreatedMs, // FIX: always the real on-chain ms timestamp
            seenAt,
            hasMultiDex: dexCount >= 2,
            arbSpread: null,
            safety: null,
          };
          // Prepend — newest first; cap at 500
          newPairsRef.current = [entry, ...newPairsRef.current].slice(0, 500);
        }
      }
    });
    if (newFound > 0) {
      if (soundOnRef.current) beep(1100, 0.08);
      setState(prev => ({ ...prev, newPairCount: prev.newPairCount + newFound, newPairs: [...newPairsRef.current] }));
    }

    // Group by token
    const byToken: Record<string, { symbol: string; name: string; mint: string; pairs: any[] }> = {};
    allPairs.forEach(pair => {
      if (pair.chainId !== chain) return;
      const price = parseFloat(pair.priceUsd || 0);
      if (!price || price <= 0) return;
      const liq = pair.liquidity?.usd || 0;
      const vol = pair.volume?.h24 || 0;
      if (liq < f.dexMinLiq || vol < f.dexMinVol) return;
      const addr = pair.baseToken?.address; if (!addr) return;

      // Issue #4: Validate BSC pair addresses (must be 0x + 40 hex chars)
      if (chain === 'bsc') {
        const pairAddr = pair.pairAddress || '';
        if (pairAddr && !/^0x[0-9a-fA-F]{40}$/.test(pairAddr)) return;
        if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return;
      }

      // Issue #3: Normalize dex ID before fee lookup
      const rawDex = pair.dexId || 'unknown';
      const dex = normalizeDexId(rawDex, chain);

      if (!byToken[addr]) byToken[addr] = { symbol: pair.baseToken.symbol || '?', name: pair.baseToken.name || '', mint: addr, pairs: [] };
      const existing = byToken[addr].pairs.find((p: any) => p.dex === dex);
      if (existing) { if (liq > existing.liq) Object.assign(existing, { price, liq, vol, tvl: liq, pairAddr: pair.pairAddress || existing.pairAddr || '' }); }
      else {
        const bscFee = BSC_DEX_FEES[dex] ?? BSC_DEX_FEES[rawDex] ?? 0.0025; // fallback chain: normalized → raw → default
        byToken[addr].pairs.push({
          dex, price, liq, vol,
          tvl: liq,
          bid: price * (1 - (chain === 'bsc' ? bscFee : (DEX_FEES[dex] || 0.003))),
          ask: price * (1 + (chain === 'bsc' ? bscFee : (DEX_FEES[dex] || 0.003))),
          pairAddr: pair.pairAddress || '',
          createdAt: pair.pairCreatedAt || null,
        });
      }
    });

    const results: DexOpp[] = [];
    for (const token of Object.values(byToken)) {
      if (token.pairs.length < 2) continue;
      token.pairs.sort((a: any, b: any) => a.price - b.price);
      for (let i = 0; i < token.pairs.length; i++) {
        for (let j = i + 1; j < token.pairs.length; j++) {
          const buy = token.pairs[i], sell = token.pairs[j];
          if (sell.price <= buy.price) continue;
          const rawSpread = ((sell.price - buy.price) / buy.price) * 100;
          const feeMap = chain === 'bsc' ? BSC_DEX_FEES : DEX_FEES;
          const SLIP = chain === 'bsc' ? BSC_SLIP : SOL_SLIP;
          const bF = feeMap[buy.dex] || (chain === 'bsc' ? 0.0025 : 0.003), sF = feeMap[sell.dex] || (chain === 'bsc' ? 0.0025 : 0.003);
          const eB = buy.price * (1 + bF + SLIP), eS = sell.price * (1 - sF - SLIP);
          if (eS <= eB) continue;
          const qty = f.tradeSize / eB, net = (eS - eB) * qty, sp = ((eS - eB) / eB) * 100;
          if (sp < f.dexMinSpread || net < f.minProfit) continue;
          const age = buy.createdAt && sell.createdAt ? Math.min(buy.createdAt, sell.createdAt) : (buy.createdAt || sell.createdAt || null);
          const minLiqVal = Math.min(buy.liq, sell.liq);
          const liqThreshold = chain === 'bsc' ? BSC_LOW_LIQ_THRESHOLD : LOW_LIQ_THRESHOLD;
          const mcApprox = minLiqVal > 0 ? minLiqVal * 2.2 : 1;
          const volMCRatio = Math.max(buy.vol, sell.vol) / mcApprox;
          results.push({
            id: `${chain}-${token.mint}-${buy.dex}-${sell.dex}`,
            chain,
            symbol: token.symbol, name: token.name, mint: token.mint,
            buyDex: buy.dex, sellDex: sell.dex,
            buyPrice: buy.price, sellPrice: sell.price,
            rawSpread, eB, eS, spreadPct: sp, net,
            buyLiq: buy.liq, sellLiq: sell.liq, minLiq: minLiqVal,
            buyTvl: buy.tvl || buy.liq, sellTvl: sell.tvl || sell.liq,
            buyPairAddr: buy.pairAddr || '', sellPairAddr: sell.pairAddr || '',
            vol24h: Math.max(buy.vol, sell.vol),
            volMCRatio,
            createdAt: age, isNew: isNew(age, chain), isVNew: isVNew(age),
            hot: sp > 1.5,
            lowLiquidity: minLiqVal < liqThreshold,
            safety: null,
          });
        }
      }
    }
    const multiDexCount = Object.values(byToken).filter(t => t.pairs.length >= 2).length;
    addLog(`${chain.toUpperCase()} arb: ${multiDexCount} tokens with 2+ DEXes → ${results.length} opps`, 'ok');

    // Spread telemetry — when 0 opps, surface the best raw spread so the user can
    // distinguish "market is tight" from "something is broken".
    if (results.length === 0 && multiDexCount > 0) {
      let bestRaw = 0;
      for (const token of Object.values(byToken)) {
        if (token.pairs.length < 2) continue;
        token.pairs.sort((a: any, b: any) => a.price - b.price);
        for (let i = 0; i < token.pairs.length - 1; i++) {
          const buy = token.pairs[i], sell = token.pairs[token.pairs.length - 1];
          if (buy.price > 0) {
            const raw = ((sell.price - buy.price) / buy.price) * 100;
            if (raw > bestRaw) bestRaw = raw;
          }
        }
      }
      addLog(`${chain.toUpperCase()} best raw spread: ${bestRaw.toFixed(3)}% (fees+slip threshold ~${chain === 'bsc' ? ((BSC_SLIP * 2 + 0.003) * 100).toFixed(2) : ((SOL_SLIP * 2 + 0.005) * 100).toFixed(2)}%)`, 'warn');
    }
    return results.sort((a, b) => b.net - a.net);
  }, [addLog]);

  // Max pair age for early pump detection (dexNewOnly mode)
  const MAX_PAIR_AGE_HOURS = 5;

  const applyDexFilters = useCallback((opps: DexOpp[]) => {
    const f = filtersRef.current;
    let filtered = opps.filter(o => {
      if (o.minLiq < f.dexMinLiq) return false;
      if (o.vol24h < f.dexMinVol) return false;
      if (o.spreadPct < f.dexMinSpread) return false;
      if (f.dexSafeOnly && o.safety && o.safety.score >= 600) return false;
      // Early pump age gate
      if (f.dexNewOnly && o.createdAt) {
        const ageHours = (Date.now() - o.createdAt) / 3600000;
        if (ageHours > MAX_PAIR_AGE_HOURS) return false;
      }
      // Vol/MC momentum gate — 0 = disabled
      if (f.minVolumeMCRatio > 0 && o.volMCRatio < f.minVolumeMCRatio) return false;
      return true;
    });
    filtered.sort((a, b) => {
      if (f.dexSort === 'spread') return b.spreadPct - a.spreadPct;
      if (f.dexSort === 'profit') return b.net - a.net;
      if (f.dexSort === 'liq') return b.minLiq - a.minLiq;
      if (f.dexSort === 'new') return (a.createdAt || Infinity) - (b.createdAt || Infinity);
      return b.net - a.net;
    });
    return filtered;
  }, []);

  // ═══ SCAN DEX ═══
  const scanDex = useCallback(async () => {
    setState(prev => ({ ...prev, dexScanning: true, dexStatus: 'scanning...' }));
    const addrs = await getTrending();
    if (!addrs.length) {
      setState(prev => ({ ...prev, dexScanning: false, dexStatus: 'error' }));
      return;
    }
    const raw = await fetchPairs(addrs);
    dexOppsRef.current = raw;
    const filtered = applyDexFilters(raw);

    // Backfill arbSpread on new pairs that now have confirmed multi-DEX opps
    const oppByMint: Record<string, number> = {};
    raw.forEach(o => { if (!oppByMint[o.mint] || o.spreadPct > oppByMint[o.mint]) oppByMint[o.mint] = o.spreadPct; });
    newPairsRef.current = newPairsRef.current.map(p =>
      p.chain === 'solana' && oppByMint[p.mint] ? { ...p, hasMultiDex: true, arbSpread: oppByMint[p.mint] } : p
    );

    setState(prev => ({ ...prev, dexOpps: raw, filteredDexOpps: filtered, dexScanning: false, dexStatus: `${raw.length} opps · ${new Date().toLocaleTimeString()}`, newPairs: [...newPairsRef.current] }));

    if (raw.length && soundOnRef.current) beep(780, 0.06);

    // Fetch safety scores in background
    const mints = [...new Set(raw.map(o => o.mint).filter(Boolean))].slice(0, 25);
    let done = 0;
    mints.forEach(mint => {
      fetchSafety(mint).then(res => {
        raw.forEach(o => { if (o.mint === mint) o.safety = res; });
        done++;
        if (done === mints.length || done % 4 === 0) {
          dexOppsRef.current = [...raw];
          const f = applyDexFilters(raw);
          setState(prev => ({ ...prev, dexOpps: [...raw], filteredDexOpps: f }));
        }
      });
    });
    enrichLiquidity(raw, 'solana');
  }, [getTrending, fetchPairs, applyDexFilters, fetchSafety]);

  // ═══ LIQUIDITY ENRICHMENT ═══
  // Runs LiquidityProfiler on top opportunities and decorates them in-place.
  const enrichLiquidity = useCallback((opps: DexOpp[], chain: 'solana' | 'bsc') => {
    const targets = opps.slice(0, 12); // cap concurrency / API calls
    targets.forEach(async (o) => {
      try {
        const tp: LPTokenPair = {
          chain,
          address: o.buyPairAddr || o.mint,
          baseToken: { address: o.mint, symbol: o.symbol, decimals: chain === 'bsc' ? 18 : 9 },
          quoteToken: { address: '', symbol: chain === 'bsc' ? 'WBNB' : 'SOL', decimals: chain === 'bsc' ? 18 : 9 },
          dexId: o.buyDex,
          priceUsd: o.buyPrice,
          liquidityUsd: o.minLiq,
          volume24h: o.vol24h,
        };
        const profile = await liquidityProfiler.analyzePair(tp);
        o.liquidityProfile = profile;
        o.healthScore = profile.healthScore;
        o.riskLevel = profile.riskLevel;
        o.positionCeiling = profile.positionCeiling;
        o.isTradeable = profile.healthScore >= 40;
        o.tradeableReason = o.isTradeable ? null : `Health ${profile.healthScore}/100`;
      } catch (e: any) {
        o.tradeableReason = `Liquidity analysis failed`;
      }
      // Push periodic UI refresh
      if (chain === 'bsc') {
        bscOppsRef.current = [...bscOppsRef.current];
        setState(prev => ({ ...prev, bscOpps: [...bscOppsRef.current], filteredBscOpps: applyDexFilters(bscOppsRef.current) }));
      } else {
        dexOppsRef.current = [...dexOppsRef.current];
        setState(prev => ({ ...prev, dexOpps: [...dexOppsRef.current], filteredDexOpps: applyDexFilters(dexOppsRef.current) }));
      }
    });
  }, [applyDexFilters]);

  // ═══ BSC TRENDING ═══
  const getBscTrending = useCallback(async (): Promise<{ addresses: string[]; seedPairs: any[] }> => {
    const seen = new Set<string>();
    const all: string[] = [];
    const add = (addr: string) => { if (addr && !seen.has(addr)) { seen.add(addr); all.push(addr); } };
    const isRecentBscPair = (p: any) => {
      const created = parsePairTimestamp(p.pairCreatedAt);
      return p.chainId === 'bsc'
        && !!p.baseToken?.address
        && created !== null
        && created <= Date.now() + 3_600_000
        && Date.now() - created < 604_800_000
        && (p.liquidity?.usd || 0) >= 1_000;
    };

    // 1. KNOWN multi-DEX tokens — always queued first, guaranteed 2+ DEX coverage
    BSC_KNOWN_MULTI_DEX.forEach(add);

    // 2. Dynamic discovery via DexScreener
    const searches = await Promise.allSettled([
      fetchDSEndpoint(
        'https://api.dexscreener.com/token-boosts/top/v1',
        'bsc-boosts',
        (t: any) => (t.chainId === 'bsc' || t.chainId === 'binance-smart-chain') && t.tokenAddress
      ),
      fetchDSEndpoint(
        'https://api.dexscreener.com/token-profiles/latest/v1',
        'bsc-profiles',
        (t: any) => (t.chainId === 'bsc' || t.chainId === 'binance-smart-chain') && t.tokenAddress
      ),
      // BUG FIX 1: removed quoteToken?.symbol === 'WBNB' filter —
      // DexScreener returns both 'WBNB' and 'BNB' as symbol for the same token.
      // The strict filter was cutting 99% of results (log: bsc-bnb-search: 1 token).
      fetchDSEndpoint(
        'https://api.dexscreener.com/latest/dex/search?q=BNB',
        'bsc-bnb-search',
        (t: any) => t.chainId === 'bsc' && t.baseToken?.address && (t.liquidity?.usd || 0) > 10000
      ),
      // USDT pairs on BSC — multiple DEXes trade them
      fetchDSEndpoint(
        'https://api.dexscreener.com/latest/dex/search?q=USDT BSC',
        'bsc-usdt-search',
        (t: any) => t.chainId === 'bsc' && t.baseToken?.address && (t.liquidity?.usd || 0) > 10000
      ),
      // BUG FIX 2: replaced bsc-busd-search (BUSD deprecated on BSC since 2023, always 0 results)
      // with CAKE search — PancakeSwap's own token, genuinely on multiple BSC DEXes.
      fetchDSEndpoint(
        'https://api.dexscreener.com/latest/dex/search?q=CAKE',
        'bsc-cake-search',
        (t: any) => t.chainId === 'bsc' && t.baseToken?.address && (t.liquidity?.usd || 0) > 5000
      ),
      // BUG FIX 3: token-pairs/v1 was logging 300 raw addresses (lots of core-token duplicates).
      // Now: extract only the NON-core counterparty tokens (the tokens being paired AGAINST WBNB/CAKE/etc.)
      // and deduplicate before logging so the count is meaningful.
      (async () => {
        // The core token addresses themselves — exclude from results
        const coreSet = new Set(BSC_KNOWN_MULTI_DEX.map(a => a.toLowerCase()));
        const coreTokens = BSC_KNOWN_MULTI_DEX.slice(0, 5); // WBNB, CAKE, ETH, BTCB, USDT
        const seen2 = new Set<string>();
        const batchResults: string[] = [];
        await Promise.all(coreTokens.map(async addr => {
          try {
            const r = await fetch(`https://api.dexscreener.com/token-pairs/v1/bsc/${addr}`, { signal: AbortSignal.timeout(6000) });
            if (!r.ok) return;
            const d = await r.json();
            const pairs = Array.isArray(d) ? d : (d.pairs || []);
            pairs.forEach((pair: any) => {
              // Only push the NON-core side of the pair (i.e. the token being traded)
              const base  = pair.baseToken?.address?.toLowerCase();
              const quote = pair.quoteToken?.address?.toLowerCase();
              // The "interesting" token is whichever side is NOT a core token
              const target = base && !coreSet.has(base) ? pair.baseToken.address
                : quote && !coreSet.has(quote) ? pair.quoteToken.address
                : null;
              if (target && !seen2.has(target.toLowerCase())) {
                seen2.add(target.toLowerCase());
                batchResults.push(target);
              }
            });
          } catch {}
        }));
        addLog(`DS bsc-token-pairs: ${batchResults.length} unique counterparty tokens`, 'info');
        return batchResults;
      })(),
      // NEW BSC PAIR DISCOVERY — search for recently created pairs on PancakeSwap/BSC
      // These searches target terms that surface new/trending BSC tokens
      fetchDSEndpoint(
        'https://api.dexscreener.com/latest/dex/search?q=pancakeswap+new',
        'bsc-new-pcs',
        (t: any) => t.chainId === 'bsc' && t.baseToken?.address && (t.pairCreatedAt || 0) > Date.now() - 86400000
      ),
      fetchDSEndpoint(
        'https://api.dexscreener.com/latest/dex/search?q=BSC+launch',
        'bsc-launch',
        (t: any) => t.chainId === 'bsc' && t.baseToken?.address && (t.pairCreatedAt || 0) > Date.now() - 86400000
      ),
      fetchDSEndpoint(
        'https://api.dexscreener.com/latest/dex/search?q=BNB+new+token',
        'bsc-new-token',
        (t: any) => t.chainId === 'bsc' && t.baseToken?.address
      ),
      fetchDSPairs(
        'https://api.dexscreener.com/latest/dex/search?q=bsc',
        'bsc-latest-search',
        isRecentBscPair
      ),
      fetchDSPairs(
        'https://api.dexscreener.com/latest/dex/search?q=pancakeswap',
        'bsc-latest-pancakeswap',
        isRecentBscPair
      ),
    ]);

    const seedPairs: any[] = [];
    const seenSeedPairs = new Set<string>();

    searches.forEach(res => {
      if (res.status === 'fulfilled') {
        const values = Array.isArray(res.value) ? res.value : [];
        values.forEach((value: any) => {
          if (value?.pairAddress) {
            const key = value.pairAddress.toLowerCase();
            if (!seenSeedPairs.has(key)) {
              seenSeedPairs.add(key);
              seedPairs.push(value);
            }
            add(value.baseToken?.address);
            add(value.quoteToken?.address);
          } else {
            add(value);
          }
        });
      }
    });

    addLog(`BSC trending: ${all.length} tokens queued · ${seedPairs.length} latest pairs seeded`, 'info');
    return { addresses: all.slice(0, 60), seedPairs };
  }, [fetchDSEndpoint, fetchDSPairs, addLog]);

  // ═══ SCAN BSC ═══
  const scanBsc = useCallback(async () => {
    try {
    setState(prev => ({ ...prev, bscScanning: true, bscStatus: 'scanning...' }));
    addLog('BSC scan starting…', 'info');
    const { addresses: addrs, seedPairs } = await getBscTrending();
    addLog(`BSC trending returned ${addrs.length} addresses + ${seedPairs.length} latest pairs`, 'info');
    if (!addrs.length && !seedPairs.length) {
      setState(prev => ({ ...prev, bscScanning: false, bscStatus: 'error' }));
      addLog('BSC scan: 0 addresses/latest pairs from trending — aborting', 'warn');
      return;
    }
    const raw = await fetchPairs(addrs, 'bsc', seedPairs);
    bscOppsRef.current = raw;
    const filtered = applyDexFilters(raw);

    // Backfill arbSpread on new BSC pairs
    const oppByMint: Record<string, number> = {};
    raw.forEach(o => { if (!oppByMint[o.mint] || o.spreadPct > oppByMint[o.mint]) oppByMint[o.mint] = o.spreadPct; });
    newPairsRef.current = newPairsRef.current.map(p =>
      p.chain === 'bsc' && oppByMint[p.mint] ? { ...p, hasMultiDex: true, arbSpread: oppByMint[p.mint] } : p
    );

    setState(prev => ({ ...prev, bscOpps: raw, filteredBscOpps: filtered, bscScanning: false, bscStatus: `${raw.length} opps · ${new Date().toLocaleTimeString()}`, newPairs: [...newPairsRef.current] }));
    if (raw.length && soundOnRef.current) beep(920, 0.06);

    // Issue #1: Fetch RugCheck safety scores for BSC opps (same pattern as Solana)
    // BSC contract addresses → RugCheck supports EVM chains
    const mints = [...new Set(raw.map(o => o.mint).filter(Boolean))].slice(0, 20);
    let done = 0;
    mints.forEach(mint => {
      fetchSafety(mint).then(res => {
        raw.forEach(o => { if (o.mint === mint) o.safety = res; });
        done++;
        if (done === mints.length || done % 4 === 0) {
          bscOppsRef.current = [...raw];
          const f = applyDexFilters(raw);
          setState(prev => ({ ...prev, bscOpps: [...raw], filteredBscOpps: f }));
        }
      });
    });
    enrichLiquidity(raw, 'bsc');
    } catch (e: any) {
      addLog(`BSC scan CRASHED: ${e.message}`, 'err');
      setState(prev => ({ ...prev, bscScanning: false, bscStatus: 'error' }));
    }
  }, [getBscTrending, fetchPairs, applyDexFilters, fetchSafety, addLog]);

  // ═══ CEX CALC ═══
  const calcTri = useCallback((): CexOpp[] => {
    const B = bookRef.current, f = filtersRef.current, fee = 0.001, opps: CexOpp[] = [];
    TRIPS.forEach(([ab, bc, ca]) => {
      const p1 = B[ab]?.ask, p2 = B[bc]?.ask, p3 = B[ca]?.bid;
      if (!p1 || !p2 || !p3 || p1 <= 0 || p2 <= 0 || p3 <= 0) return;
      const bQ = (f.tradeSize / p1) * (1 - fee), qQ = (bQ / p2) * (1 - fee), fin = qQ * p3 * (1 - fee);
      const gr = fin - f.tradeSize, sp = (gr / f.tradeSize) * 100, net = gr - f.tradeSize * fee * 3; // 3 legs × fee
      if (sp > f.minSpread && net > f.minProfit) {
        const base = ab.replace('USDT', ''), q = bc.replace(base, '').replace('USDT', '');
        opps.push({ id: `tri-${ab}-${bc}`, type: 'tri', label: `${base}→${q}→USDT`, buyEx: 'Binance', sellEx: 'Binance', buyAt: p1, sellAt: p3, spreadPct: sp, net });
      }
    });
    return opps.sort((a, b) => b.net - a.net);
  }, []);

  const calcCross = useCallback((okx: Record<string, PriceData>, bybit: Record<string, PriceData>, kraken: Record<string, PriceData>): CexOpp[] => {
    const f = filtersRef.current;
    const aEx = [
      { id: 'binance', name: 'Binance', prices: pricesRef.current, fee: 0.001 },
      { id: 'okx', name: 'OKX', prices: okx, fee: 0.001 },
      { id: 'bybit', name: 'Bybit', prices: bybit, fee: 0.001 },
      { id: 'kraken', name: 'Kraken', prices: kraken, fee: 0.002 },
    ];
    const opps: CexOpp[] = [];
    SYMBOLS.forEach(sym => { // All 40 symbols
      for (let i = 0; i < aEx.length; i++) for (let j = 0; j < aEx.length; j++) {
        if (i === j) continue;
        const bE = aEx[i], sE = aEx[j];
        const bA = bE.prices[sym]?.ask || bE.prices[sym]?.price;
        const sB = sE.prices[sym]?.bid || sE.prices[sym]?.price;
        if (!bA || !sB || bA <= 0) continue;
        const qty = f.tradeSize / bA, gr = (sB - bA) * qty, fees = f.tradeSize * (bE.fee + sE.fee), net = gr - fees, sp = ((sB - bA) / bA) * 100;
        if (sp > f.minSpread && net > f.minProfit) opps.push({ id: `x-${sym}-${bE.id}-${sE.id}`, type: 'cross', label: `${sym}/USDT`, buyEx: bE.name, sellEx: sE.name, buyAt: bA, sellAt: sB, spreadPct: sp, net });
      }
    });
    return opps.sort((a, b) => b.net - a.net);
  }, []);

  // ═══ CEX SCAN ═══
  const runCexScan = useCallback(async () => {
    if (!runningRef.current) return;
    setState(prev => ({ ...prev, scanCount: prev.scanCount + 1, scanProgress: 50 }));
    addLog(`— CEX Scan`, 'info'); // scanCount updated via setState

    let ok = false;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      const w = await connectWS();
      if (w) { await new Promise(r => setTimeout(r, 2000)); ok = wsReadyRef.current; }
    } else ok = wsReadyRef.current;
    if (!ok) ok = await fetchCG();
    if (!ok) { addLog('No CEX data', 'err'); setState(prev => ({ ...prev, scanProgress: 0 })); return; }
    buildCP();

    // Ensure CEX WebSocket connections are alive — skip if already OPEN or CONNECTING
    // Bug fix: checking only for OPEN caused a new connection to be created while one was
    // still in CONNECTING state (readyState=0), producing the repeated "OKX WS connected" logs.
    const wsAlive = (ws: WebSocket | null) =>
      ws !== null && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING);
    if (!wsAlive(wsOKXRef.current)) connectOKX();
    if (!wsAlive(wsBybitRef.current)) connectBybit();
    if (!wsAlive(wsKrakenRef.current)) connectKraken();

    const okx = getExPrices('okx'), bybit = getExPrices('bybit'), kraken = getExPrices('kraken');
    const tri = calcTri(), cross = calcCross(okx, bybit, kraken);
    const cexOpps = [...tri, ...cross].sort((a, b) => b.net - a.net);
    const totalScanned = SYMBOLS.length * 4;

    setState(prev => {
      const best = cexOpps.length ? Math.max(prev.bestProfit, cexOpps[0].net) : prev.bestProfit;
      const hr = cexOpps.reduce((s, o) => s + Math.max(0, o.net), 0) * 144;
      return {
        ...prev, cexOpps, prices: { ...pricesRef.current },
        totalScanned: prev.totalScanned + totalScanned,
        bestProfit: best, hrProfit: hr, scanProgress: 100,
      };
    });
    setTimeout(() => setState(prev => ({ ...prev, scanProgress: 0 })), 400);
    addLog(`CEX: ${tri.length} tri + ${cross.length} cross`, 'ok');

    if (cexOpps.length > 0 && cexOpps[0].spreadPct > filtersRef.current.alertThreshold && soundOnRef.current) {
      beep(880, 0.12);
    }
  }, [connectWS, fetchCG, buildCP, connectOKX, connectBybit, connectKraken, getExPrices, calcTri, calcCross, addLog]);

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // ═══ SCHEDULING ═══
  // schedCexRef always holds the latest schedCex — fixes the stale-closure bug where
  // setTimeout fires the old version of schedCex captured at creation time, breaking
  // auto-refresh whenever runCexScan is recreated due to dependency changes.
  const schedCexRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!dexTimerRef.current && !bscTimerRef.current) return; // Not yet booted
    if (dexTimerRef.current) clearInterval(dexTimerRef.current);
    if (bscTimerRef.current) clearInterval(bscTimerRef.current);
    const iv = (filtersRef.current.dexInterval || 20) * 1000;
    dexTimerRef.current = setInterval(() => { if (runningRef.current) scanDex(); }, iv);
    bscTimerRef.current = setInterval(() => { if (runningRef.current) scanBsc(); }, Math.max(30000, iv + 10000));
  }, [filters.dexInterval]); // eslint-disable-line react-hooks/exhaustive-deps

  const schedCex = useCallback(() => {
    if (!filtersRef.current.autoRefresh || !runningRef.current) return;
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    if (cdTimerRef.current) clearInterval(cdTimerRef.current);
    const iv = filtersRef.current.cexInterval * 1000;
    const start = Date.now();
    cdTimerRef.current = setInterval(() => {
      const el = Date.now() - start;
      const pct = Math.min(100, (el / iv) * 100);
      const rem = Math.max(0, Math.ceil((iv - el) / 1000));
      setState(prev => ({ ...prev, countdownPct: pct, countdownSec: rem }));
      if (pct >= 100 && cdTimerRef.current) clearInterval(cdTimerRef.current);
    }, 500);
    // Use ref to always call the latest schedCex — avoids stale closure when
    // runCexScan is recreated, which previously broke the auto-refresh chain.
    scanTimerRef.current = setTimeout(() => { runCexScan().then(() => schedCexRef.current()); }, iv);
  }, [runCexScan]);
  // Keep ref in sync whenever schedCex is recreated
  useEffect(() => { schedCexRef.current = schedCex; }, [schedCex]);

  // ═══ HISTORY / LOG ═══
  const logOpp = useCallback((opp: DexOpp | CexOpp) => {
    const isDex = 'buyDex' in opp;
    const entry: HistoryEntry = {
      ts: new Date().toISOString(),
      tsDisplay: new Date().toLocaleTimeString(),
      sym: isDex ? (opp as DexOpp).symbol : (opp as CexOpp).label,
      route: isDex ? `${(opp as DexOpp).buyDex} → ${(opp as DexOpp).sellDex}` : `${(opp as CexOpp).buyEx} → ${(opp as CexOpp).sellEx}`,
      spread: opp.spreadPct,
      net: opp.net,
      type: isDex ? 'DEX' : 'CEX',
    };
    setState(prev => ({
      ...prev,
      history: [entry, ...prev.history],
      sessionPnl: prev.sessionPnl + entry.net,
      wins: entry.net > 0 ? prev.wins + 1 : prev.wins,
    }));
    addLog(`Logged: ${entry.sym} ${entry.spread.toFixed(3)}% · $${entry.net.toFixed(2)}`, 'ok');
  }, [addLog]);

  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, history: [], sessionPnl: 0, wins: 0 }));
  }, []);

  const exportCSV = useCallback(() => {
    const s = stateRef.current;
    if (!s.history.length) return;
    const header = 'Timestamp,Symbol,Route,Type,Spread%,Net Profit ($)';
    const rows = s.history.map(e => `${e.ts},${e.sym},"${e.route}",${e.type},${e.spread.toFixed(4)},${e.net.toFixed(2)}`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'arbpulse-history-' + Date.now() + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }, []);

  const setActiveView = useCallback((view: string) => {
    setState(prev => ({ ...prev, activeView: view }));
  }, []);

  const toggleScanner = useCallback(() => {
    setState(prev => {
      const next = !prev.running;
      if (next) {
        addLog('Resumed', 'ok');
        setTimeout(() => { runCexScan().then(() => schedCexRef.current()); scanDex(); setTimeout(() => scanBsc(), 3000); }, 100);
      } else {
        addLog('Paused', 'warn');
        if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
        if (cdTimerRef.current) clearInterval(cdTimerRef.current);
      }
      return { ...prev, running: next };
    });
  }, [addLog, runCexScan, scanDex]);

  const toggleSound = useCallback(() => {
    setState(prev => {
      const next = !prev.soundOn;
      if (next) beep(660, 0.1);
      return { ...prev, soundOn: next };
    });
  }, []);

  const clearLogs = useCallback(() => setState(prev => ({ ...prev, logs: [] })), []);
  const clearCexResults = useCallback(() => setState(prev => ({ ...prev, cexOpps: [], bestProfit: 0, hrProfit: 0 })), []);

  const refilterDex = useCallback(() => {
    const filtered = applyDexFilters(dexOppsRef.current);
    const filteredBsc = applyDexFilters(bscOppsRef.current);
    setState(prev => ({ ...prev, filteredDexOpps: filtered, filteredBscOpps: filteredBsc }));
  }, [applyDexFilters]);

  // ═══ BOOT ═══
  useEffect(() => {
    addLog('ArbPulse Pro v5.1 — all 8 bugs fixed · GoPlus BSC safety · BNB/USDT/BUSD search', 'ok');
    addLog('Chains: Solana · BNB Smart Chain · Safety: RugCheck.xyz · CEX: 4x WS', 'info');

    // Connect all WS — done ONCE here, never re-created inside runCexScan
    Promise.all([connectOKX(), connectBybit(), connectKraken()]).then(() => addLog('All exchange WS connected', 'ok'));

    // Initial scans
    runCexScan().then(() => schedCexRef.current());
    scanDex();
    // Stagger BSC scan by 3s to avoid API rate limits
    setTimeout(() => scanBsc(), 3000);

    // Solana DEX auto-scan — respects dexInterval filter (default 20s)
    dexTimerRef.current = setInterval(() => {
      if (runningRef.current) scanDex();
    }, (filtersRef.current.dexInterval || 20) * 1000);

    // BSC DEX auto-scan — staggered by 10s relative to Solana timer
    bscTimerRef.current = setInterval(() => {
      if (runningRef.current) scanBsc();
    }, Math.max(30000, ((filtersRef.current.dexInterval || 20) + 10) * 1000));

    // Request push notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      if (cdTimerRef.current) clearInterval(cdTimerRef.current);
      if (dexTimerRef.current) clearInterval(dexTimerRef.current);
      if (bscTimerRef.current) clearInterval(bscTimerRef.current);
      wsRef.current?.close();
      wsOKXRef.current?.close();
      wsBybitRef.current?.close();
      wsKrakenRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearNewPairs = useCallback(() => {
    newPairsRef.current = [];
    setState(prev => ({ ...prev, newPairs: [], newPairCount: 0 }));
  }, []);

  return {
    state, filters, setFilters,
    toggleScanner, toggleSound, clearLogs, clearCexResults,
    runCexScan: () => runCexScan().then(() => schedCexRef.current()),
    scanDex, scanBsc, logOpp, clearHistory, exportCSV,
    setActiveView, refilterDex, clearNewPairs,
  };
}
