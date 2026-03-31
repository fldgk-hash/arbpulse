import { memo, useMemo, useState } from 'react';
import type { ScannerState, DexOpp } from '@/hooks/useArbScanner';
import { fmtVol, fmtAge } from '@/hooks/useArbScanner';

interface AnalyticsViewProps {
  state: ScannerState;
  onClearHistory: () => void;
  onExportCSV: () => void;
}

function pumpScore(o: DexOpp): number {
  const ageHours = o.createdAt ? (Date.now() - o.createdAt) / 3600000 : 99;
  const volLiq = o.minLiq > 0 ? o.vol24h / o.minLiq : 0;
  const ageFactor = Math.max(0, 1 - ageHours / 5);
  return (o.spreadPct * 30) + (volLiq * 20) + (ageFactor * 50);
}

type SortKey = 'score' | 'age' | 'spread' | 'vol' | 'liq';

function EarlyPumpDetector({ state }: { state: ScannerState }) {
  const [sort, setSort] = useState<SortKey>('score');

  const candidates = useMemo(() => {
    const solOpps = state.dexOpps.filter(o =>
      o.chain === 'solana' &&
      o.createdAt !== null &&
      (Date.now() - (o.createdAt!)) < 18_000_000 &&
      o.minLiq >= 10_000 &&
      o.vol24h >= 20_000
    );
    const byMint: Record<string, DexOpp> = {};
    solOpps.forEach(o => {
      if (!byMint[o.mint] || o.spreadPct > byMint[o.mint].spreadPct) byMint[o.mint] = o;
    });
    return Object.values(byMint).sort((a, b) => {
      if (sort === 'score')  return pumpScore(b) - pumpScore(a);
      if (sort === 'age')    return (a.createdAt || 0) - (b.createdAt || 0);
      if (sort === 'spread') return b.spreadPct - a.spreadPct;
      if (sort === 'vol')    return b.vol24h - a.vol24h;
      if (sort === 'liq')    return b.minLiq - a.minLiq;
      return 0;
    }).slice(0, 25);
  }, [state.dexOpps, sort]);

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => setSort(k)}
      className={`text-[8px] px-2 py-0.5 rounded border cursor-pointer transition-colors font-mono uppercase tracking-wider ${
        sort === k ? 'bg-arb-green/10 border-arb-green/40 text-arb-green' : 'bg-transparent border-arb-border2 text-arb-muted hover:text-arb-text'
      }`}>{label}</button>
  );

  return (
    <div className="bg-arb-bg2 border border-arb-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-2.5 px-3 border-b border-arb-border flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-sans font-semibold text-[12px] text-arb-head">⚡ Early Pump Detector</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-arb-green/10 border border-arb-green/20 text-arb-green font-mono">
            {candidates.length} signals
          </span>
        </div>
        <div className="flex gap-1 flex-wrap">
          <SortBtn k="score" label="Score" /><SortBtn k="age" label="Age" />
          <SortBtn k="spread" label="Spread" /><SortBtn k="vol" label="Vol" /><SortBtn k="liq" label="Liq" />
        </div>
      </div>

      {candidates.length === 0 ? (
        <div className="text-center py-8 text-arb-muted text-[11px] leading-relaxed px-4">
          🔍 No early pumps detected yet.<br />
          <span className="text-[10px] text-arb-amber">Waiting for Solana tokens &lt;5h · $10k+ liq · $20k+ vol.</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[460px] text-[11px]">
            <thead>
              <tr>
                {['TOKEN','AGE','SCORE','SPREAD','VOL/LIQ','LIQ','ROUTE'].map(h => (
                  <th key={h} className="text-[7px] tracking-[2px] uppercase text-arb-muted px-2 py-2 border-b border-arb-border text-left font-semibold bg-arb-bg3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidates.map(o => {
                const score = pumpScore(o);
                const volLiq = o.minLiq > 0 ? o.vol24h / o.minLiq : 0;
                const ageHours = o.createdAt ? (Date.now() - o.createdAt) / 3600000 : null;
                const isHot = score > 60;
                const isFresh = ageHours !== null && ageHours < 1;
                const dsUrl = `https://dexscreener.com/solana/${o.buyPairAddr || o.mint}`;
                return (
                  <tr key={o.id} className={`hover:bg-arb-blue/[0.03] ${isHot ? 'bg-arb-green/[0.02]' : ''}`}>
                    <td className="px-2 py-1.5 border-b border-arb-border/30">
                      <div className="flex items-center gap-1.5">
                        {isHot && <span className="text-[8px] text-arb-amber">🔥</span>}
                        <span className="font-sans font-bold text-arb-head">{o.symbol}</span>
                        {isFresh && <span className="text-[7px] px-1 py-0.5 rounded bg-arb-red/10 border border-arb-red/30 text-arb-red font-bold animate-pulse">NEW</span>}
                      </div>
                      <div className="text-[8px] text-arb-muted truncate max-w-[70px]">{o.name}</div>
                    </td>
                    <td className="px-2 py-1.5 border-b border-arb-border/30 tabular-nums font-mono text-[10px]">
                      <span className={ageHours !== null && ageHours < 1 ? 'text-arb-red font-bold' : ageHours !== null && ageHours < 2 ? 'text-arb-amber' : 'text-arb-muted'}>
                        {o.createdAt ? fmtAge(o.createdAt) : '—'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 border-b border-arb-border/30">
                      <div className="flex items-center gap-1.5">
                        <div className="w-[36px] h-[4px] rounded bg-arb-bg3 overflow-hidden">
                          <div className={`h-full rounded transition-all ${score > 70 ? 'bg-arb-green' : score > 40 ? 'bg-arb-amber' : 'bg-arb-muted'}`}
                            style={{ width: `${Math.min(100, score)}%` }} />
                        </div>
                        <span className={`font-mono text-[9px] font-bold ${score > 70 ? 'text-arb-green' : score > 40 ? 'text-arb-amber' : 'text-arb-muted'}`}>
                          {score.toFixed(0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 border-b border-arb-border/30 tabular-nums font-mono">
                      <span className={o.spreadPct > 2 ? 'text-arb-green font-bold' : o.spreadPct > 0.5 ? 'text-arb-amber' : 'text-arb-muted'}>
                        {o.spreadPct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-2 py-1.5 border-b border-arb-border/30 tabular-nums font-mono">
                      <span className={volLiq > 5 ? 'text-arb-green font-bold' : volLiq > 2 ? 'text-arb-amber' : 'text-arb-muted'}>
                        {volLiq.toFixed(1)}×
                      </span>
                    </td>
                    <td className="px-2 py-1.5 border-b border-arb-border/30 tabular-nums font-mono text-arb-muted text-[10px]">
                      {fmtVol(o.minLiq)}
                    </td>
                    <td className="px-2 py-1.5 border-b border-arb-border/30">
                      <div className="text-[8px] text-arb-muted font-mono truncate max-w-[80px]">{o.buyDex}→{o.sellDex}</div>
                      <a href={dsUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[7px] text-arb-purple hover:text-arb-purple/70 font-mono no-underline">📊 DS ↗</a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="px-3 py-1.5 border-t border-arb-border text-[8px] text-arb-muted">
        Score = spread×30 + vol/liq×20 + ageFactor×50 · tokens &lt;5h · {sort} sort
      </div>
    </div>
  );
}

export const AnalyticsView = memo(({ state, onClearHistory, onExportCSV }: AnalyticsViewProps) => {
  return (
    <div className="flex flex-col gap-2 p-2.5 overflow-y-auto flex-1 bg-arb-bg">
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

      <EarlyPumpDetector state={state} />

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
