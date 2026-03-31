import { memo, useState, useMemo } from 'react';
import type { NewPairEntry } from '@/hooks/useArbScanner';
import { fmtPrice, fmtVol, fmtAge } from '@/hooks/useArbScanner';

interface NewTokensViewProps {
  newPairs: NewPairEntry[];
  onClear: () => void;
}

type AgeFilter = 'all' | '1h' | '6h' | '24h';
type ChainFilter = 'all' | 'solana' | 'bsc';

export const NewTokensView = memo(({ newPairs, onClear }: NewTokensViewProps) => {
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all');
  const [chainFilter, setChainFilter] = useState<ChainFilter>('all');
  const [arbOnly, setArbOnly] = useState(false);
  const [minLiq, setMinLiq] = useState(0);

  const AGE_MS: Record<AgeFilter, number> = {
    all: Infinity, '1h': 3600000, '6h': 21600000, '24h': 86400000,
  };

  const filtered = useMemo(() => {
    const now = Date.now(); // computed inside memo so age is fresh on re-render
    return newPairs.filter(p => {
      if (chainFilter !== 'all' && p.chain !== chainFilter) return false;
      if (arbOnly && !p.hasMultiDex) return false;
      if (minLiq > 0 && p.liq < minLiq) return false;
      const age = p.createdAt !== null ? now - p.createdAt : Infinity; // Infinity → only shows in 'all'
      if (age > AGE_MS[ageFilter]) return false;
      return true;
    });
  }, [newPairs, chainFilter, arbOnly, minLiq, ageFilter]); // now computed inside memo

  const arbCount = filtered.filter(p => p.hasMultiDex).length;
  const freshCount = filtered.filter(p => p.createdAt && (Date.now() - p.createdAt) < 3600000).length;

  return (
    <div className="flex flex-col gap-2 p-2.5 overflow-y-auto flex-1 bg-arb-bg">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="font-sans font-semibold text-[13px] text-arb-head flex items-center gap-2">
          🆕 New Listings
          <span className="text-[10px] text-arb-muted">{filtered.length} pairs</span>
          {arbCount > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-arb-green/10 border border-arb-green/30 text-arb-green font-bold">
              ⚡ {arbCount} ARB
            </span>
          )}
          {freshCount > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-arb-red/10 border border-arb-red/30 text-arb-red font-bold animate-pulse">
              🔴 {freshCount} &lt;1h
            </span>
          )}
        </div>
        <button onClick={onClear}
          className="text-[9px] text-arb-muted border border-arb-border px-2 py-0.5 cursor-pointer hover:text-arb-red hover:border-arb-red transition-colors font-mono uppercase tracking-wider bg-transparent">
          CLEAR
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-1.5 items-center flex-wrap bg-arb-bg2 border border-arb-border rounded-md p-2 px-2.5 flex-shrink-0">
        {/* Age filter */}
        <div className="flex items-center gap-1 text-[9px] text-arb-muted">
          <span>Age</span>
          {(['all','1h','6h','24h'] as AgeFilter[]).map(a => (
            <button key={a} onClick={() => setAgeFilter(a)}
              className={`px-2 py-0.5 font-mono text-[9px] rounded border cursor-pointer transition-colors ${ageFilter === a ? 'bg-arb-green/10 border-arb-green/40 text-arb-green' : 'bg-transparent border-arb-border2 text-arb-muted hover:text-arb-text'}`}>
              {a === 'all' ? 'ALL' : a}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-arb-border2" />

        {/* Chain filter */}
        <div className="flex items-center gap-1 text-[9px] text-arb-muted">
          <span>Chain</span>
          {(['all','solana','bsc'] as ChainFilter[]).map(c => (
            <button key={c} onClick={() => setChainFilter(c)}
              className={`px-2 py-0.5 font-mono text-[9px] rounded border cursor-pointer transition-colors ${chainFilter === c ? 'bg-arb-green/10 border-arb-green/40 text-arb-green' : 'bg-transparent border-arb-border2 text-arb-muted hover:text-arb-text'}`}>
              {c === 'all' ? 'ALL' : c === 'solana' ? '◎ SOL' : '🟡 BSC'}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-arb-border2" />

        {/* Arb only toggle */}
        <label className="flex items-center gap-1 text-[9px] text-arb-muted cursor-pointer select-none">
          <input type="checkbox" checked={arbOnly} onChange={e => setArbOnly(e.target.checked)} className="hidden" />
          <div className={`w-[26px] h-[13px] rounded-full relative transition-colors ${arbOnly ? 'bg-arb-green' : 'bg-arb-border2'}`}>
            <div className={`absolute w-[9px] h-[9px] bg-white rounded-full top-[2px] transition-all ${arbOnly ? 'left-[15px]' : 'left-[2px]'}`} />
          </div>
          <span>⚡ Arb only</span>
        </label>

        <div className="w-px h-4 bg-arb-border2" />

        {/* Min liquidity */}
        <div className="flex items-center gap-1 text-[9px] text-arb-muted">
          <span>Liq $</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={minLiq === 0 ? '' : minLiq.toString()}
            placeholder="0"
            onFocus={e => e.target.select()}
            onChange={e => {
              const v = e.target.value.replace(/[^0-9]/g, '');
              setMinLiq(v === '' ? 0 : parseInt(v, 10));
            }}
            className="w-[62px] bg-arb-bg3 border border-arb-border2 text-arb-head px-1.5 py-0.5 font-mono text-[10px] rounded outline-none focus:border-arb-green"
          />
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-arb-muted text-[11px] leading-relaxed">
          🔍 No new pairs yet.<br /><br />
          <span className="text-arb-amber text-[10px]">New listings appear here as scans run.<br />Pairs with ⚡ ARB badge have been spotted on 2+ DEXes.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.slice(0, 100).map(p => (
            <NewPairCard key={p.id} pair={p} />
          ))}
        </div>
      )}
    </div>
  );
});

/* ─── Card ──────────────────────────────────────────────────────────────────── */
function NewPairCard({ pair: p }: { pair: NewPairEntry }) {
  const [copied, setCopied] = useState(false);
  const now = Date.now();
  // FIX: ageMs must use createdAt ONLY — seenAt is "when WE scanned it", not "when it was created".
  // Using seenAt as fallback made years-old pairs show as 🔴 NEW (seenAt ≈ now → ageMs ≈ 0).
  // If createdAt is null → age is unknown → treat as old (Infinity) → no fresh badge.
  const ageMs = p.createdAt !== null ? now - p.createdAt : Infinity;
  const isFresh = ageMs < 3600000;      // < 1h on-chain age
  const isVFresh = ageMs < 1800000;     // < 30min — pulse animation
  const isBsc = p.chain === 'bsc';

  const dsUrl = isBsc
    ? `https://dexscreener.com/bsc/${p.pairAddr}`
    : `https://dexscreener.com/solana/${p.pairAddr}`;
  const explorerUrl = isBsc
    ? `https://bscscan.com/token/${p.mint}`
    : `https://solscan.io/token/${p.mint}`;

  const copyMint = () => {
    navigator.clipboard?.writeText(p.mint).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const solNames: Record<string, string> = { raydium: 'Raydium', 'pump-fun': 'Pump.fun', meteora: 'Meteora', orca: 'Orca', jupiter: 'Jupiter', 'raydium-clmm': 'Raydium CLMM', 'raydium-cp': 'Raydium CP', whirlpool: 'Whirlpool' };
  const bscNames: Record<string, string> = { 'pancakeswap-v3': 'PCS V3', 'pancakeswap-v2': 'PCS V2', 'pancakeswap': 'PancakeSwap', 'uniswap-v3-bsc': 'UNI V3', 'uniswap-v4-bsc': 'UNI V4', 'uniswap': 'Uniswap', 'thena-v3': 'THENA V3', 'thena-fusion': 'THENA', biswap: 'Biswap', 'biswap-v3': 'Biswap V3', apeswap: 'ApeSwap', babyswap: 'BabySwap', sushiswap: 'SushiSwap', 'sushiswap-v3': 'Sushi V3', squadswap: 'SquadSwap', 'ellipsis-finance': 'Ellipsis' };
  const rawDex = p.dex.startsWith('unknown:') ? p.dex.slice(8) : p.dex; // strip our "unknown:" flag
  const isContractAddr = /^0x[0-9a-fA-F]{8,}/.test(rawDex);
  const dexLabel = isContractAddr
    ? rawDex.slice(0, 6) + '…' + rawDex.slice(-4) // show short addr, not full 42 chars
    : ((isBsc ? bscNames : solNames)[rawDex] || rawDex);

  return (
    <div className={`rounded-md border p-2.5 transition-all ${
      p.hasMultiDex
        ? 'bg-arb-green/[0.03] border-arb-green/20'
        : 'bg-arb-bg2 border-arb-border'
    } ${isVFresh ? 'animate-pulse-border' : ''}`}>

      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {/* Chain badge */}
          <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold border ${
            isBsc
              ? 'bg-arb-amber/10 border-arb-amber/30 text-arb-amber'
              : 'bg-arb-green/10 border-arb-green/30 text-arb-green'
          }`}>
            {isBsc ? '🟡 BSC' : '◎ SOL'}
          </span>

          {/* Symbol */}
          <span className="font-sans font-bold text-[13px] text-arb-head truncate">{p.symbol}</span>
          <span className="text-[10px] text-arb-muted truncate max-w-[120px]">{p.name}</span>

          {/* Arb badge */}
          {p.hasMultiDex && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-arb-green/10 border border-arb-green/30 text-arb-green font-bold whitespace-nowrap">
              ⚡ ARB {p.arbSpread ? p.arbSpread.toFixed(2) + '%' : ''}
            </span>
          )}

          {/* Fresh badge */}
          {isFresh && (
            <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold border whitespace-nowrap ${
              isVFresh
                ? 'bg-arb-red/10 border-arb-red/30 text-arb-red'
                : 'bg-arb-amber/10 border-arb-amber/30 text-arb-amber'
            }`}>
              {isVFresh ? '🔴 NEW' : '🟡 <1h'}
            </span>
          )}
        </div>

        {/* Age */}
        <span className="text-[9px] text-arb-muted whitespace-nowrap flex-shrink-0">
          {p.createdAt ? fmtAge(p.createdAt) : `seen ${fmtAge(p.seenAt)}`}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-1 mb-2">
        <MiniStat label="Price" value={'$' + fmtPrice(p.price)} />
        <MiniStat label="Liq" value={fmtVol(p.liq)} cls={p.liq < 5000 ? 'text-arb-red' : p.liq < 25000 ? 'text-arb-amber' : 'text-arb-head'} />
        <MiniStat label="Vol 24h" value={fmtVol(p.vol)} />
        <MiniStat label="DEX" value={dexLabel} />
      </div>

      {/* Mint address + links */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button onClick={copyMint}
          className="text-[8px] font-mono text-arb-blue hover:text-arb-cyan transition-colors cursor-pointer border border-arb-border2 bg-arb-bg3 px-1.5 py-0.5 rounded">
          {copied ? '✓ copied' : (isBsc ? p.mint.slice(0, 6) + '…' + p.mint.slice(-4) : p.mint.slice(0, 6) + '…' + p.mint.slice(-4))}
        </button>
        <a href={dsUrl} target="_blank" rel="noopener noreferrer"
          className="text-[8px] font-mono text-arb-purple hover:text-arb-purple/80 border border-arb-border2 bg-arb-bg3 px-1.5 py-0.5 rounded transition-colors no-underline">
          📊 DS
        </a>
        <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
          className="text-[8px] font-mono text-arb-muted hover:text-arb-blue border border-arb-border2 bg-arb-bg3 px-1.5 py-0.5 rounded transition-colors no-underline">
          🔍 {isBsc ? 'BSCscan' : 'Solscan'}
        </a>
      </div>
    </div>
  );
}

/* ─── Mini stat ─────────────────────────────────────────────────────────────── */
function MiniStat({ label, value, cls = 'text-arb-head' }: { label: string; value: string; cls?: string }) {
  return (
    <div className="bg-arb-bg3 rounded p-1 px-1.5">
      <div className="text-[7px] text-arb-muted uppercase tracking-wider">{label}</div>
      <div className={`text-[10px] font-semibold mt-0.5 tabular-nums truncate ${cls}`}>{value}</div>
    </div>
  );
}
