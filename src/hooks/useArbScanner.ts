import { useCallback, useEffect, useRef, useState } from 'react';

// ═══ CONFIG ═══
export const SYMBOLS = [
  'BTC','ETH','SOL','BNB','XRP','DOGE','TON','TRX','SHIB','PEPE',
  'FLOKI','BONK','WIF','SUI','TIA','FET','RENDER','WLD','INJ','ARB',
  'OP','APT','AVAX','LINK','ADA','DOT','UNI','ATOM','LTC','BCH',
  'NEAR','FIL','ICP','STX','HBAR','VET','XLM','ALGO','RUNE','THETA',
  'FTM','AAVE','MKR','LDO','PENDLE','ONDO','PYTH','JUP'
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
  STX:'blockstack',HBAR:'hedera-hashgraph',VET:'vechain',XLM:'stellar',
  ALGO:'algorand',RUNE:'thorchain',THETA:'theta-token',FTM:'fantom',
  AAVE:'aave',MKR:'maker',LDO:'lido-dao',PENDLE:'pendle',ONDO:'ondo-finance',
  PYTH:'pyth-network',JUP:'jupiter-exchange-solana'
};

const OKX_ALIAS: Record<string, string> = { MATIC: 'POL' };
const BYBIT_ALIAS: Record<string, string> = { MATIC: 'POL' };
const KRAKEN_WS_MAP: Record<string, string> = {
  BTC:'BTC/USD',ETH:'ETH/USD',SOL:'SOL/USD',XRP:'XRP/USD',ADA:'ADA/USD',
  AVAX:'AVAX/USD',DOGE:'DOGE/USD',LINK:'LINK/USD',DOT:'DOT/USD',BNB:'BNB/USD',
  ATOM:'ATOM/USD',LTC:'LTC/USD',BCH:'BCH/USD',NEAR:'NEAR/USD',FIL:'FIL/USD',
  APT:'APT/USD',ARB:'ARB/USD',OP:'OP/USD',INJ:'INJ/USD',SUI:'SUI/USD',
  TIA:'TIA/USD',UNI:'UNI/USD',ICP:'ICP/USD',WLD:'WLD/USD',FET:'FET/USD',
  PEPE:'PEPE/USD',BONK:'BONK/USD',RENDER:'RENDER/USD',RUNE:'RUNE/USD',
  AAVE:'AAVE/USD',MKR:'MKR/USD',
};
const KRAKEN_REV = Object.fromEntries(Object.entries(KRAKEN_WS_MAP).map(([k, v]) => [v, k]));

const REAL_CROSS_PAIRS = [
  'ethbtc','bnbbtc','xrpbtc','adabtc','ltcbtc','dotbtc','linkbtc','solbtc',
  'avaxbtc','atombtc','nearbtc','injbtc','suibtc',
  'ethbnb','solbnb','xrpbnb','adabnb','dotbnb',
  'soleth','avaxeth','linketh','doteth','arbeth',
];

const SLIPPAGE = 0.0012;
export const SCAN_INTERVAL = 25000;

export interface PriceData {
  price?: number;
  bid?: number;
  ask?: number;
  chg24?: number;
}

export interface Opportunity {
  id: string;
  type: 'triangular' | 'cross';
  label: string;
  route?: string[];
  buyExchange?: string;
  sellExchange?: string;
  buyAt: number;
  sellAt: number;
  spreadPct: number;
  grossPnl: number;
  netPnl: number;
  hot: boolean;
}

export interface LogEntry {
  time: string;
  msg: string;
  type: 'ok' | 'info' | 'warn' | 'err';
}

export interface HistoryItem {
  time: string;
  label: string;
  profit: number;
  spread: number;
}

export interface ExchangeStatus {
  id: string;
  ok: boolean;
  msg: string;
}

export interface ScannerFilters {
  minSpread: number;
  minProfit: number;
  tradeSize: number;
  alertThreshold: number;
  showTri: boolean;
  showCross: boolean;
  autoRefresh: boolean;
}

export interface ScannerState {
  running: boolean;
  scanCount: number;
  totalScanned: number;
  bestProfit: number;
  hrProfit: number;
  sessionOpps: number;
  prices: Record<string, PriceData>;
  opportunities: Opportunity[];
  logs: LogEntry[];
  history: HistoryItem[];
  exchangeStatuses: Record<string, ExchangeStatus>;
  soundOn: boolean;
  countdownPct: number;
  countdownSec: number;
  scanProgress: number;
}

// Audio
let audioCtx: AudioContext | null = null;
function playAlertSound(freq = 880, dur = 0.12) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    o.frequency.value = freq;
    o.type = 'sine';
    g.gain.setValueAtTime(0.3, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  } catch {}
}

export function fmtPrice(p: number | undefined): string {
  if (!p) return '—';
  if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(6);
}

export function useArbScanner() {
  const [state, setState] = useState<ScannerState>({
    running: true,
    scanCount: 0,
    totalScanned: 0,
    bestProfit: 0,
    hrProfit: 0,
    sessionOpps: 0,
    prices: {},
    opportunities: [],
    logs: [],
    history: [],
    exchangeStatuses: Object.fromEntries(EXCHANGES.map(e => [e.id, { id: e.id, ok: false, msg: 'Init' }])),
    soundOn: false,
    countdownPct: 0,
    countdownSec: 0,
    scanProgress: 0,
  });

  const [filters, setFilters] = useState<ScannerFilters>({
    minSpread: 0.04,
    minProfit: 0.5,
    tradeSize: 1000,
    alertThreshold: 0.5,
    showTri: true,
    showCross: true,
    autoRefresh: true,
  });

  const pricesRef = useRef<Record<string, PriceData>>({});
  const bookRef = useRef<Record<string, { bid: number; ask: number; _real?: boolean }>>({});
  const okxPricesRef = useRef<Record<string, PriceData>>({});
  const bybitPricesRef = useRef<Record<string, PriceData>>({});
  const krakenPricesRef = useRef<Record<string, PriceData>>({});
  const binanceWSRef = useRef<WebSocket | null>(null);
  const crossWSRef = useRef<WebSocket | null>(null);
  const krakenWSRef = useRef<WebSocket | null>(null);
  const wsDataReceivedRef = useRef(false);
  const cgLastFetchRef = useRef(0);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const runningRef = useRef(true);
  const filtersRef = useRef(filters);
  const stateRef = useRef(state);
  const triPathsRef = useRef<string[][]>([]);
  const soundOnRef = useRef(false);

  useEffect(() => { filtersRef.current = filters; }, [filters]);
  useEffect(() => { runningRef.current = state.running; stateRef.current = state; soundOnRef.current = state.soundOn; }, [state]);

  const addLog = useCallback((msg: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('en-GB');
    setState(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-399), { time, msg, type }],
    }));
  }, []);

  const setExStatus = useCallback((id: string, ok: boolean, msg: string) => {
    setState(prev => ({
      ...prev,
      exchangeStatuses: { ...prev.exchangeStatuses, [id]: { id, ok, msg } },
    }));
  }, []);

  useEffect(() => {
    const bases = ['BTC', 'ETH', 'BNB', 'SOL'];
    const paths: string[][] = [];
    bases.forEach(base => {
      SYMBOLS.forEach(quote => {
        if (quote === base) return;
        paths.push([`${base}USDT`, `${quote}${base}`, `${quote}USDT`]);
      });
    });
    triPathsRef.current = paths.slice(0, 140);
  }, []);

  const buildSyntheticCrossPairs = useCallback(() => {
    const B = bookRef.current;
    const p = pricesRef.current;
    const SP = 0.0004;
    function synth(q: string, b: string, key: string) {
      if (B[key]?._real) return;
      const pq = p[q]?.price;
      const pb = p[b]?.price;
      if (!pq || !pb) return;
      const mid = pq / pb;
      B[key] = { bid: mid * (1 - SP), ask: mid * (1 + SP), _real: false };
    }
    ['ETH','SOL','XRP','ADA','LINK','LTC','DOT','BNB','AVAX','ATOM','UNI','DOGE','ARB','INJ','SUI'].forEach(s => synth(s, 'BTC', s + 'BTC'));
    ['SOL','AVAX','LINK','DOT','UNI','ATOM','ARB'].forEach(s => synth(s, 'ETH', s + 'ETH'));
    ['ETH','SOL','XRP','DOT','ADA'].forEach(s => synth(s, 'BNB', s + 'BNB'));
    ['ETH','SOL','XRP','ADA','DOGE','DOT'].forEach(s => synth(s, 'SOL', s + 'SOL'));
  }, []);

  const connectBinanceWS = useCallback(() => {
    return new Promise<boolean>(resolve => {
      if (binanceWSRef.current?.readyState === WebSocket.OPEN) { resolve(true); return; }
      const s1 = SYMBOLS.map(s => `${s.toLowerCase()}usdt@bookTicker`).join('/');
      const s2 = SYMBOLS.map(s => `${s.toLowerCase()}usdt@ticker`).join('/');
      const url = `wss://stream.binance.com:9443/stream?streams=${s1}/${s2}`;
      addLog('Connecting to Binance WS…');
      const ws = new WebSocket(url);
      binanceWSRef.current = ws;
      let resolved = false;
      ws.onopen = () => {
        setExStatus('binance', true, 'WS Live');
        addLog('Binance WS connected', 'ok');
        if (!resolved) { resolved = true; resolve(true); }
      };
      ws.onmessage = evt => {
        try {
          const msg = JSON.parse(evt.data);
          const d = msg.data;
          if (!d) return;
          const sym = d.s?.replace('USDT', '');
          if (!sym || !SYMBOLS.includes(sym)) return;
          if (d.e === 'bookTicker') {
            const bid = parseFloat(d.b), ask = parseFloat(d.a);
            bookRef.current[d.s] = { bid, ask };
            if (!pricesRef.current[sym]) pricesRef.current[sym] = {};
            pricesRef.current[sym].bid = bid;
            pricesRef.current[sym].ask = ask;
            if (!pricesRef.current[sym].price) pricesRef.current[sym].price = (bid + ask) / 2;
          }
          if (d.e === '24hrTicker') {
            if (!pricesRef.current[sym]) pricesRef.current[sym] = {};
            pricesRef.current[sym].price = parseFloat(d.c);
            pricesRef.current[sym].chg24 = parseFloat(d.P);
          }
          wsDataReceivedRef.current = true;
        } catch {}
      };
      ws.onerror = () => {
        setExStatus('binance', false, 'WS Error');
        if (!resolved) { resolved = true; resolve(false); }
      };
      ws.onclose = () => {
        binanceWSRef.current = null;
        addLog('Binance WS closed — reconnecting in 5s…', 'warn');
        setTimeout(() => { if (runningRef.current) connectBinanceWS(); }, 5000);
      };
      setTimeout(() => { if (!resolved) { resolved = true; resolve(false); } }, 5000);
    });
  }, [addLog, setExStatus]);

  const connectCrossWS = useCallback(() => {
    if (crossWSRef.current?.readyState === WebSocket.OPEN) return;
    const streams = REAL_CROSS_PAIRS.map(s => `${s}@bookTicker`).join('/');
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    crossWSRef.current = ws;
    ws.onopen = () => addLog(`Cross-pair WS: ${REAL_CROSS_PAIRS.length} pairs`, 'ok');
    ws.onmessage = evt => {
      try {
        const msg = JSON.parse(evt.data);
        const d = msg.data;
        if (d?.e === 'bookTicker') bookRef.current[d.s] = { bid: parseFloat(d.b), ask: parseFloat(d.a) };
      } catch {}
    };
    ws.onclose = () => { crossWSRef.current = null; setTimeout(connectCrossWS, 7000); };
    ws.onerror = () => { crossWSRef.current?.close(); };
  }, [addLog]);

  const connectKrakenWS = useCallback(() => {
    return new Promise<boolean>(resolve => {
      if (krakenWSRef.current?.readyState === WebSocket.OPEN) { resolve(true); return; }
      const ws = new WebSocket('wss://ws.kraken.com/v2');
      krakenWSRef.current = ws;
      let resolved = false;
      ws.onopen = () => {
        ws.send(JSON.stringify({ method: 'subscribe', params: { channel: 'ticker', symbol: Object.values(KRAKEN_WS_MAP) } }));
        setExStatus('kraken', true, 'WS Live');
        addLog(`Kraken WS: ${Object.keys(KRAKEN_WS_MAP).length} pairs`, 'ok');
        if (!resolved) { resolved = true; setTimeout(() => resolve(true), 2000); }
      };
      ws.onmessage = evt => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.channel === 'ticker' && msg.data) {
            msg.data.forEach((d: any) => {
              const sym = KRAKEN_REV[d.symbol];
              if (!sym) return;
              krakenPricesRef.current[sym] = { bid: d.bid || d.last * 0.9997, ask: d.ask || d.last * 1.0003, price: d.last };
            });
          }
        } catch {}
      };
      ws.onerror = () => {
        setExStatus('kraken', false, 'Error');
        if (!resolved) { resolved = true; resolve(false); }
      };
      ws.onclose = () => {
        krakenWSRef.current = null;
        addLog('Kraken WS closed — reconnecting in 8s…', 'warn');
        setTimeout(() => { if (runningRef.current) connectKrakenWS(); }, 8000);
      };
      setTimeout(() => { if (!resolved) { resolved = true; resolve(false); } }, 6000);
    });
  }, [addLog, setExStatus]);

  const fetchCoinGecko = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    if (now - cgLastFetchRef.current < 20000) { addLog('CoinGecko: rate-limit guard'); return Object.keys(pricesRef.current).length > 0; }
    cgLastFetchRef.current = now;
    try {
      const ids = Object.values(CG_MAP).join(',');
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
      if (!res.ok) { if (res.status === 429) cgLastFetchRef.current = now - 15000; throw new Error('HTTP ' + res.status); }
      const data = await res.json();
      SYMBOLS.forEach(sym => {
        const d = data[CG_MAP[sym]];
        if (!d) return;
        const price = d.usd;
        const sp = price * 0.0005;
        pricesRef.current[sym] = { price, chg24: d.usd_24h_change || 0, bid: price - sp, ask: price + sp };
        bookRef.current[sym + 'USDT'] = { bid: price - sp, ask: price + sp };
      });
      buildSyntheticCrossPairs();
      setExStatus('binance', true, 'CoinGecko');
      addLog(`CoinGecko: ${SYMBOLS.length} prices loaded`, 'ok');
      return true;
    } catch (e: any) {
      addLog('CoinGecko: ' + e.message, 'err');
      return false;
    }
  }, [addLog, setExStatus, buildSyntheticCrossPairs]);

  const fetchBinancePrices = useCallback(async (): Promise<boolean> => {
    const hasCached = Object.keys(pricesRef.current).length > 0;
    if (!binanceWSRef.current || binanceWSRef.current.readyState !== WebSocket.OPEN) {
      connectBinanceWS();
      if (hasCached) { buildSyntheticCrossPairs(); setExStatus('binance', true, 'Cached'); return true; }
      return await fetchCoinGecko();
    }
    if (!wsDataReceivedRef.current) {
      if (hasCached) { buildSyntheticCrossPairs(); return true; }
      return await fetchCoinGecko();
    }
    buildSyntheticCrossPairs();
    setExStatus('binance', true, 'WS Live');
    return true;
  }, [connectBinanceWS, buildSyntheticCrossPairs, setExStatus, fetchCoinGecko]);

  const fetchOKX = useCallback(async () => {
    try {
      const res = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (data.code !== '0') throw new Error('code ' + data.code);
      const map: Record<string, any> = {};
      data.data.forEach((t: any) => { map[t.instId] = t; });
      let count = 0;
      SYMBOLS.forEach(sym => {
        const t = map[`${OKX_ALIAS[sym] || sym}-USDT`];
        if (!t) return;
        const price = parseFloat(t.last);
        if (!price) return;
        okxPricesRef.current[sym] = { bid: parseFloat(t.bidPx) || price * 0.9997, ask: parseFloat(t.askPx) || price * 1.0003, price };
        count++;
      });
      setExStatus('okx', true, `Live ${count}p`);
      addLog(`OKX: ${count} pairs`, 'ok');
    } catch (e: any) {
      setExStatus('okx', false, 'Error');
      addLog('OKX: ' + e.message, 'err');
    }
  }, [addLog, setExStatus]);

  const fetchBybit = useCallback(async () => {
    try {
      const res = await fetch('https://api.bybit.com/v5/market/tickers?category=spot');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (data.retCode !== 0) throw new Error('retCode ' + data.retCode);
      const rev = Object.fromEntries(Object.entries(BYBIT_ALIAS).map(([k, v]) => [v, k]));
      let count = 0;
      (data.result?.list || []).forEach((t: any) => {
        let sym = t.symbol.replace('USDT', '');
        if (rev[sym]) sym = rev[sym];
        if (!SYMBOLS.includes(sym)) return;
        const price = parseFloat(t.lastPrice);
        if (!price) return;
        bybitPricesRef.current[sym] = { bid: parseFloat(t.bid1Price) || price * 0.9997, ask: parseFloat(t.ask1Price) || price * 1.0003, price };
        count++;
      });
      setExStatus('bybit', true, `Live ${count}p`);
      addLog(`Bybit: ${count} pairs`, 'ok');
    } catch (e: any) {
      setExStatus('bybit', false, 'Error');
      addLog('Bybit: ' + e.message, 'err');
    }
  }, [addLog, setExStatus]);

  const calcTriangular = useCallback((): Opportunity[] => {
    const book = bookRef.current;
    const f = filtersRef.current;
    const fee = 0.001;
    const results: Opportunity[] = [];
    triPathsRef.current.forEach(([ab, bc, ca]) => {
      try {
        const p1 = book[ab]?.ask, p2 = book[bc]?.ask, p3 = book[ca]?.bid;
        if (!p1 || !p2 || !p3) return;
        const qty1 = (f.tradeSize / p1) * (1 - fee - SLIPPAGE);
        const qty2 = (qty1 / p2) * (1 - fee - SLIPPAGE);
        const final_ = qty2 * p3 * (1 - fee - SLIPPAGE);
        const gross = final_ - f.tradeSize;
        const pct = (gross / f.tradeSize) * 100;
        if (pct > f.minSpread && gross > f.minProfit) {
          results.push({
            id: `tri-${ab}-${bc}`,
            type: 'triangular',
            label: `${ab.replace('USDT', '')} → ${bc.replace(ab.replace('USDT', ''), '').replace('USDT', '')} → USDT`,
            route: [ab, bc, ca],
            buyAt: p1,
            sellAt: p3,
            spreadPct: pct,
            grossPnl: gross,
            netPnl: gross - f.tradeSize * fee * 3,
            hot: pct > 0.35,
          });
        }
      } catch {}
    });
    return results.sort((a, b) => b.netPnl - a.netPnl);
  }, []);

  const calcCrossExchange = useCallback((): Opportunity[] => {
    const f = filtersRef.current;
    const results: Opportunity[] = [];
    const exs = [
      { id: 'binance', name: 'Binance', prices: pricesRef.current, fee: 0.001 },
      { id: 'okx', name: 'OKX', prices: okxPricesRef.current, fee: 0.001 },
      { id: 'bybit', name: 'Bybit', prices: bybitPricesRef.current, fee: 0.001 },
      { id: 'kraken', name: 'Kraken', prices: krakenPricesRef.current, fee: 0.002 },
    ];
    SYMBOLS.forEach(sym => {
      for (let i = 0; i < exs.length; i++) {
        for (let j = 0; j < exs.length; j++) {
          if (i === j) continue;
          const bE = exs[i], sE = exs[j];
          const bA = bE.prices[sym]?.ask || bE.prices[sym]?.price;
          const sB = sE.prices[sym]?.bid || sE.prices[sym]?.price;
          if (!bA || !sB || bA <= 0) continue;
          const qty = f.tradeSize / bA;
          const gross = (sB - bA) * qty;
          const fees = f.tradeSize * (bE.fee + sE.fee);
          const net = gross - fees;
          const pct = ((sB - bA) / bA) * 100;
          if (pct > f.minSpread && net > f.minProfit) {
            results.push({
              id: `cross-${sym}-${bE.id}-${sE.id}`,
              type: 'cross',
              label: `${sym}/USDT`,
              buyExchange: bE.name,
              sellExchange: sE.name,
              buyAt: bA,
              sellAt: sB,
              spreadPct: pct,
              grossPnl: gross,
              netPnl: net,
              hot: pct > 0.5,
            });
          }
        }
      }
    });
    return results.sort((a, b) => b.netPnl - a.netPnl);
  }, []);

  const runScan = useCallback(async () => {
    if (!runningRef.current) return;

    setState(prev => ({
      ...prev,
      scanCount: prev.scanCount + 1,
      scanProgress: 10,
    }));

    addLog(`— Scan #${stateRef.current.scanCount + 1} started`);

    const binOk = await fetchBinancePrices();

    if (!binOk) {
      addLog('Skipping — no price data', 'warn');
      setState(prev => ({ ...prev, scanProgress: 0 }));
      return;
    }

    setState(prev => ({ ...prev, scanProgress: 40 }));

    if (!krakenWSRef.current || krakenWSRef.current.readyState !== WebSocket.OPEN) connectKrakenWS();
    await Promise.all([fetchOKX(), fetchBybit()]);

    setState(prev => ({ ...prev, scanProgress: 80 }));

    const triOpps = calcTriangular();
    const crossOpps = calcCrossExchange();
    const allOpps = [...triOpps, ...crossOpps].sort((a, b) => b.netPnl - a.netPnl);

    if (allOpps.length > 0 && soundOnRef.current) {
      const top = allOpps[0];
      if (top.spreadPct >= filtersRef.current.alertThreshold) {
        playAlertSound(880, 0.1);
        setTimeout(() => playAlertSound(1100, 0.08), 120);
      }
    }

    const newScanned = stateRef.current.totalScanned + SYMBOLS.length * 4;
    let newSessionOpps = stateRef.current.sessionOpps;
    let newBestProfit = stateRef.current.bestProfit;
    let newHrProfit = stateRef.current.hrProfit;
    const newHistory = [...stateRef.current.history];

    if (allOpps.length > 0) {
      newSessionOpps += allOpps.length;
      const best = allOpps[0];
      if (best.netPnl > newBestProfit) newBestProfit = best.netPnl;
      newHrProfit = allOpps.reduce((s, o) => s + Math.max(0, o.netPnl), 0) * (3600 / (SCAN_INTERVAL / 1000));
      newHistory.unshift({ time: new Date().toLocaleTimeString('en-GB'), label: best.label, profit: best.netPnl, spread: best.spreadPct });
      if (newHistory.length > 10) newHistory.pop();
    }

    setState(prev => ({
      ...prev,
      prices: { ...pricesRef.current },
      opportunities: allOpps,
      totalScanned: newScanned,
      sessionOpps: newSessionOpps,
      bestProfit: newBestProfit,
      hrProfit: newHrProfit,
      history: newHistory,
      scanProgress: 0,
    }));

    addLog(`Scan done: ${triOpps.length} tri + ${crossOpps.length} cross opps`, 'ok');
  }, [addLog, fetchBinancePrices, connectKrakenWS, fetchOKX, fetchBybit, calcTriangular, calcCrossExchange]);

  const startCountdown = useCallback(() => {
    const start = Date.now();
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / SCAN_INTERVAL) * 100);
      const rem = Math.max(0, Math.ceil((SCAN_INTERVAL - elapsed) / 1000));
      setState(prev => ({ ...prev, countdownPct: pct, countdownSec: rem }));
      if (pct >= 100) clearInterval(countdownTimerRef.current!);
    }, 500);
  }, []);

  const scheduleNextScan = useCallback(() => {
    if (!filtersRef.current.autoRefresh || !runningRef.current) return;
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    startCountdown();
    scanTimerRef.current = setTimeout(() => {
      runScan().then(scheduleNextScan);
    }, SCAN_INTERVAL);
  }, [runScan, startCountdown]);

  const toggleScanner = useCallback(() => {
    setState(prev => {
      const newRunning = !prev.running;
      if (newRunning) {
        addLog('Scanner resumed', 'ok');
        setTimeout(scheduleNextScan, 0);
      } else {
        addLog('Scanner paused', 'warn');
        if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      }
      return { ...prev, running: newRunning };
    });
  }, [addLog, scheduleNextScan]);

  const toggleSound = useCallback(() => {
    setState(prev => {
      const newSound = !prev.soundOn;
      if (newSound) playAlertSound(660, 0.08);
      return { ...prev, soundOn: newSound };
    });
  }, []);

  const clearResults = useCallback(() => {
    setState(prev => ({ ...prev, opportunities: [], bestProfit: 0, hrProfit: 0, sessionOpps: 0 }));
    addLog('Results cleared', 'warn');
  }, [addLog]);

  const clearLogs = useCallback(() => {
    setState(prev => ({ ...prev, logs: [] }));
  }, []);

  const manualScan = useCallback(() => {
    runScan().then(() => {});
  }, [runScan]);

  useEffect(() => {
    connectCrossWS();
    addLog('ArbPulse Pro v4.0 initialized', 'ok');
    addLog(`${SYMBOLS.length} symbols · ${triPathsRef.current.length} tri paths · ${EXCHANGES.length} exchanges · dual WS`);
    runScan().then(() => {
      addLog('Ready — auto-refresh every 25s', 'ok');
      scheduleNextScan();
    });

    return () => {
      binanceWSRef.current?.close();
      crossWSRef.current?.close();
      krakenWSRef.current?.close();
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  return {
    state,
    filters,
    setFilters,
    toggleScanner,
    toggleSound,
    clearResults,
    clearLogs,
    manualScan,
  };
}
