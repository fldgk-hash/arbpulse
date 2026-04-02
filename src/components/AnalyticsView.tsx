import { memo, useMemo, useState } from 'react';
import type { ScannerState, NewPairEntry } from '@/hooks/useArbScanner';
import { fmtVol, fmtAge } from '@/hooks/useArbScanner';

interface AnalyticsViewProps {
  state: ScannerState;
  onClearHistory: () => void;
  onExportCSV: () => void;
}

// ─── Pump Score ───────────────────────────────────────────────────────────────
// Uses NewPairEntry (all tokens, including single-DEX) — NOT DexOpp (2+ DEX only).
// KEY FIX: Community Dog ($212K vol / $15K liq = 14×) was invisible because
// DexOpp only captures tokens that appear on 2+ DEXes simultaneously.
// NewPairEntry captures every pair seen in any scan, regardless of DEX count.
//
// Score formula (max ~200 for an ideal early pump):
//   vol/liq × 10   — momentum: how aggressively the pool is being traded
//   ageFactor × 50 — freshness: 1.0 at 0h → 0.0 at 5h
//   multiDex × 20  — arb bonus: also appears on 2+ DEXes → confirmed price discovery
//   arbSpread × 15 — if confirmed arb spread exists, weight it in
// ─────────────────────────────────────────────────────────────────────────────
function pumpScore(p: NewPairEntry): number {
  const ageHours = p.createdAt !== null
    ? (Date.now() - p.createdAt) / 3600000
    : 5; // unknown age → treat as 5h (no age bonus)
  const volLiq = p.liq > 0 ? p.vol / p.liq : 0;
  const ageFactor = Math.max(0, 1 - ageHours / 5);
  const arbBonus = p.hasMultiDex ? 20 : 0;
  const spreadBonus = p.arbSpread ? p.arbSpread * 15 : 0;
  return (volLiq * 10) + (ageFactor * 50) + arbBonus + spreadBonus;
}

type SortKey = 'score' | 'age' | 'volratio' | 'vol' | 'liq';

function EarlyPumpDetector({ state }: { state: ScannerState }) {
  const [sort, setSort] = useState<SortKey>('score');
  const [chainFilter, setChainFilter] = useState<'all' | 'solana' | 'bsc'>('all');

  const candidates = useMemo(() => {
    // Use newPairs — captures ALL tokens including single-DEX pumps
    const filtered = state.newPairs.filter(p => {
      if (chainFilter !== 'all' && p.chain !== chainFilter) return false;
      if (p.liq < 5_000) return false;                  // min $5k liq
      if (p.vol < 10_000) return false;                  // min $10k vol
      const volLiq = p.liq > 0 ? p.vol / p.liq : 0;
      if (volLiq < 1.5) return false;                    // vol must be 1.5× liq minimum
      // Age gate: <24h (newPairs already filters to 24h, but exclude truly ancient ones)
      if (p.createdAt !== null && (Date.now() - p.createdAt) > 86_400_000) return false;
      return true;
    });

    // Deduplicate by mint — keep highest vol/liq for each token
    const byMint: Record<string, NewPairEntry> = {};
    filtered.forEach(p => {
      const volLiq = p.liq > 0 ? p.vol / p.liq : 0;
      const existing = byMint[p.mint];
      if (!existing || volLiq > (existing.liq > 0 ? existing.vol / existing.liq : 0)) {
        byMint[p.mint] = p;
      }
    });

    return Object.values(byMint).sort((a, b) => {
      if (sort === 'score')    return pumpScore(b) - pumpScore(a);
      if (sort === 'age')      return (a.createdAt || 0) - (b.createdAt || 0);
      if (sort === 'volratio') return (b.liq > 0 ? b.vol / b.liq : 0) - (a.liq > 0 ? a.vol / a.liq : 0);
      if (sort === 'vol')      return b.vol - a.vol;
      if (sort === 'liq')      return b.liq - a.liq;
      return 0;
    }).slice(0, 30);
  }, [state.newPairs, sort, chainFilter]);

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => setSort(k)}
      className={`text-[8px] px-2 py-0.5 rounded border cursor-pointer transition-colors font-mono uppercase tracking-wider ${
        sort === k
          ? 'bg-arb-green/10 border-arb-green/40 text-arb-green'
          : 'bg-transparent border-arb-border2 text-arb-muted hover:text-arb-text'
      }`}>{label}</button>
  );

  const ChainBtn = ({ k, label }: { k: typeof chainFilter; label: string }) => (
    <button onClick={() => setChainFilter(k)}
      className={`text-[8px] px-2 py-0.5 rounded border cursor-pointer transition-colors font-mono uppercase tracking-wider ${
        chainFilter === k
          ? 'bg-arb-purple/10 border-arb-purple/40 text-arb-purple'
          : 'bg-transparent border-arb-border2 text-arb-muted hover:text-arb-text'
      }`}>{label}</button>
  );

  return (
    <div className="bg-arb-bg2 border border-arb-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-2.5 px-3 border-b border-arb-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-sans font-semibold text-[12px] text-arb-head">⚡ Early Pump Detector</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-arb-green/10 border border-arb-green/20 text-arb-green font-mono">
              {candidates.length} signals
            </span>
            <span className="text-[8px] text-arb-muted font-mono">from {state.newPairs.length} pairs</span>
          </div>
        </div>
        {/* Chain filter */}
        <div className="flex gap-1 mb-1.5 flex-wrap">
          <ChainBtn k="all" label="All" /><ChainBtn k="solana" label="SOL" /><ChainBtn k="bsc" label="BSC" />
        </div>
        {/* Sort */}
        <div className="flex gap-1 flex-wrap">
          <SortBtn k="score" label="Score" />
          <SortBtn k="age" label="Age" />
          <SortBtn k="volratio" label="Vol/Liq" />
          <SortBtn k="vol" label="Vol" />
          <SortBtn k="liq" label="Liq" />
        </div>
      </div>

      {candidates.length === 0 ? (
        <div className="text-center py-6 text-arb-muted text-[11px] leading-relaxed px-4">
          🔍 No early pumps detected yet.<br />
          <span className="text-[10px] text-arb-amber">
            Waiting for tokens with vol &gt; 1.5× liq · $5k+ liq · $10k+ vol.
          </span>
          <br />
          <span className="text-[9px] text-arb-muted mt-1 block">
            {state.newPairs.length === 0
              ? 'No pairs scanned yet — run a DEX scan first.'
              : `${state.newPairs.length} pairs scanned · none pass vol/liq ≥ 1.5× filter.`}
          </span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[420px] text-[11px]">
            <thead>
              <tr>
                {['TOKEN','CHAIN','AGE','SCORE','VOL/LIQ','VOL','LIQ'].map(h => (
                  <th key={h} className="text-[7px] tracking-[2px] uppercase text-arb-muted px-2 py-1.5 border-b border-arb-border text-left font-semibold bg-arb-bg3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidates.map(p => {
                const score = pumpScore(p);
                const volLiq = p.liq > 0 ? p.vol / p.liq : 0;
                const ageHours = p.createdAt !== null ? (Date.now() - p.createdAt) / 3600000 : null;
                const isHot = score > 60;
                const isFresh = ageHours !== null && ageHours < 1;
                const isBsc = p.chain === 'bsc';
                const dsUrl = isBsc
                  ? `https://dexscreener.com/bsc/${p.pairAddr}`
                  : `https://dexscreener.com/solana/${p.pairAddr}`;

                return (
                  <tr key={p.id} className={`hover:bg-arb-blue/[0.03] ${isHot ? 'bg-arb-green/[0.02]' : ''}`}>
                    {/* Token */}
                    <td className="px-2 py-1.5 border-b border-arb-border/30">
                      <div className="flex items-center gap-1">
                        {isHot && <span className="text-[8px]">🔥</span>}
                        <span className="font-sans font-bold text-arb-head text-[11px]">{p.symbol}</span>
                        {isFresh && (
                          <span className="text-[7px] px-1 py-0.5 rounded bg-arb-red/10 border border-arb-red/30 text-arb-red font-bold animate-pulse">NEW</span>
                        )}
                        {p.hasMultiDex && (
                          <span className="text-[7px] px-1 py-0.5 rounded bg-arb-green/10 border border-arb-green/30 text-arb-green font-bold">⚡ARB</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <a href={dsUrl} target="_blank" rel="noopener noreferrer"
                          className="text-[7px] text-arb-purple hover:text-arb-purple/70 font-mono no-underline">📊DS</a>
                        <span className="text-[7px] text-arb-muted font-mono truncate max-w-[55px]">{p.dex}</span>
                      </div>
                    </td>
                    {/* Chain */}
                    <td className="px-2 py-1.5 border-b border-arb-border/30">
                      <span className={`text-[8px] font-bold ${isBsc ? 'text-arb-amber' : 'text-arb-green'}`}>
                        {isBsc ? '🟡BSC' : '◎SOL'}
                      </span>
                    </td>
                    {/* Age */}
                    <td className="px-2 py-1.5 border-b border-arb-border/30 font-mono text-[10px]">
                      <span className={
                        ageHours !== null && ageHours < 1 ? 'text-arb-red font-bold' :
                        ageHours !== null && ageHours < 2 ? 'text-arb-amber' : 'text-arb-muted'
                      }>
                        {p.createdAt !== null ? fmtAge(p.createdAt) : `seen ${fmtAge(p.seenAt)}`}
                      </span>
                    </td>
                    {/* Score bar */}
                    <td className="px-2 py-1.5 border-b border-arb-border/30">
                      <div className="flex items-center gap-1.5">
                        <div className="w-[32px] h-[4px] rounded bg-arb-bg3 overflow-hidden">
                          <div
                            className={`h-full rounded ${score > 80 ? 'bg-arb-green' : score > 50 ? 'bg-arb-amber' : 'bg-arb-muted'}`}
                            style={{ width: `${Math.min(100, score / 2)}%` }}
                          />
                        </div>
                        <span className={`font-mono text-[9px] font-bold ${score > 80 ? 'text-arb-green' : score > 50 ? 'text-arb-amber' : 'text-arb-muted'}`}>
                          {score.toFixed(0)}
                        </span>
                      </div>
                    </td>
                    {/* Vol/Liq ratio — key metric */}
                    <td className="px-2 py-1.5 border-b border-arb-border/30 font-mono tabular-nums">
                      <span className={
                        volLiq >= 10 ? 'text-arb-green font-bold text-[11px]' :
                        volLiq >= 4  ? 'text-arb-amber font-bold' : 'text-arb-muted'
                      }>
                        {volLiq.toFixed(1)}×
                      </span>
                    </td>
                    {/* Vol */}
                    <td className="px-2 py-1.5 border-b border-arb-border/30 font-mono text-[10px] text-arb-muted tabular-nums">
                      {fmtVol(p.vol)}
                    </td>
                    {/* Liq — amber if low */}
                    <td className="px-2 py-1.5 border-b border-arb-border/30 font-mono text-[10px] tabular-nums">
                      <span className={p.liq < 15_000 ? 'text-arb-amber' : 'text-arb-muted'}>
                        {fmtVol(p.liq)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-3 py-1.5 border-t border-arb-border text-[8px] text-arb-muted leading-relaxed">
        Source: all new pairs (incl. single-DEX) · Score = vol/liq×10 + age×50 + multiDex×20 · min vol/liq 1.5× · sorted by {sort}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const AnalyticsView = memo(({ state, onClearHistory, onExportCSV }: AnalyticsViewProps) => {
  return (
    <div className="flex flex-col gap-2 p-2.5 overflow-y-auto flex-1 bg-arb-bg">
      {/* Session PnL */}
      <div className="bg-arb-bg2 border border-arb-border rounded-lg p-3.5 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[9px] tracking-[2px] uppercase text-arb-muted mb-0.5">Session PnL</div>
          <div className={`font-sans text-[26px] font-bold ${state.sessionPnl >= 0 ? 'text-arb-green' : 'text-arb-red'}`}>
            ${state.sessionPnl.toFixed(2)}
          </div>
          <div className="text-[10px] text-arb-muted mt-0.5">{state.history.length} logged · {state.wins} wins</div>
        </div>
        <div className="flex gap-2">
          <button onClick={onExportCSV} className="bg-transparent border border-arb-cyan text-arb-cyan px-2.5 py-1 text-[9px] rounded-full cursor-pointer font-mono hover:bg-arb-cyan/10 transition-colors">⬇ CSV</button>
          <button onClick={onClearHistory} className="bg-transparent border border-arb-red text-arb-red px-2.5 py-1 text-[9px] rounded-full cursor-pointer font-mono hover:bg-arb-red/10 transition-colors">✕ Clear</button>
        </div>
      </div>

      {/* ⚡ Early Pump Detector — uses newPairs, not dexOpps */}
      <EarlyPumpDetector state={state} />

      {/* Opportunity History */}
      <div className="bg-arb-bg2 border border-arb-border rounded-lg flex flex-col overflow-hidden flex-1">
        <div className="flex items-center justify-between p-2.5 px-3 border-b border-arb-border flex-shrink-0">
          <span className="font-sans font-semibold text-[12px] text-arb-head">Opportunity History</span>
          <span className="text-[9px] text-arb-muted">{state.history.length} logged</span>
        </div>
        <div className="flex flex-col gap-1.5 p-2.5 flex-1 overflow-y-auto">
          {state.history.length === 0 ? (
            <div className="text-center py-8 text-arb-muted text-[11px] leading-relaxed">
              No opportunities logged yet.<br />Press LOG on any opportunity card to save it here.
            </div>
          ) : (
            state.history.map((e, i) => (
              <div key={i} className="bg-arb-bg3 border border-arb-border rounded-md p-2.5 px-3 flex items-center gap-2.5 animate-fade-in">
                <div className="flex-1 min-w-0">
                  <div className="font-sans font-semibold text-[13px] text-arb-head flex items-center gap-1.5">
                    {e.sym}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${e.type === 'DEX' ? 'bg-arb-cyan/10 text-arb-cyan' : 'bg-arb-purple/10 text-arb-purple'}`}>{e.type}</span>
                  </div>
                  <div className="text-[9px] text-arb-muted mt-0.5">{e.route}</div>
                  <div className="text-[9px] text-arb-muted">{e.tsDisplay}</div>
                </div>
                <div className="text-right">
                  <div className={`font-sans font-bold text-[15px] ${e.net >= 0 ? 'text-arb-green' : 'text-arb-red'}`}>${e.net.toFixed(2)}</div>
                  <div className="text-[9px] text-arb-muted">{e.spread.toFixed(3)}%</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
});
