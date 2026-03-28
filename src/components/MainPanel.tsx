import { memo, useMemo } from 'react';
import type { ScannerState, ScannerFilters, Opportunity } from '@/hooks/useArbScanner';
import { SYMBOLS, SCAN_INTERVAL, fmtPrice } from '@/hooks/useArbScanner';

interface MainPanelProps {
  state: ScannerState;
  filters: ScannerFilters;
}

export const MainPanel = memo(({ state, filters }: MainPanelProps) => {
  const visibleOpps = useMemo(() => {
    return state.opportunities.filter(o =>
      !((o.type === 'triangular' && !filters.showTri) || (o.type === 'cross' && !filters.showCross))
    );
  }, [state.opportunities, filters.showTri, filters.showCross]);

  const bestSpread = visibleOpps.length > 0
    ? Math.max(...visibleOpps.map(o => o.spreadPct)).toFixed(3) + '%'
    : '—';

  const tickerText = useMemo(() => {
    if (!visibleOpps.length) return 'No arbitrage opportunities found this scan · Monitoring 48 assets across 4 exchanges · ArbPulse Pro';
    return visibleOpps.slice(0, 5).map(o => `${o.label}: ${o.spreadPct.toFixed(3)}% spread · Net $${o.netPnl.toFixed(2)}`).join(' · · · ');
  }, [visibleOpps]);

  return (
    <div className="flex flex-col gap-3 p-4 overflow-y-auto flex-1 bg-arb-bg">
      {/* Alert Ticker */}
      <div className={`bg-gradient-to-r from-arb-bg3 via-arb-bg4 to-arb-bg3 border rounded p-2 px-3.5 flex items-center gap-2.5 text-[10px] overflow-hidden ${visibleOpps.length > 0 ? 'border-arb-green/30 bg-arb-green/[0.04]' : 'border-arb-border2'}`}>
        <span className="font-sans text-[9px] font-bold text-arb-green tracking-wider uppercase whitespace-nowrap flex-shrink-0">▶ LIVE</span>
        <div className="overflow-hidden flex-1 whitespace-nowrap">
          <span className={`inline-block text-arb-text ${visibleOpps.length > 0 ? 'animate-ticker' : ''}`}>
            {tickerText}
          </span>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <KPICard accent="green" label="Best Spread" value={bestSpread} sub="Current scan" />
        <KPICard accent="amber" label="Est. Profit/hr" value={`$${Math.round(state.hrProfit)}`} sub="At current rate" />
        <KPICard accent="blue" label="Total Scanned" value={state.totalScanned.toString()} sub="Pairs × exchanges" />
        <KPICard accent="purple" label="Opportunities" value={visibleOpps.length.toString()} sub={`${state.sessionOpps} total this session`} />
      </div>

      {/* Live Prices */}
      <div className="bg-arb-bg2 border border-arb-border rounded overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-arb-border">
          <span className="font-sans text-[13px] font-bold text-arb-head">Live Prices</span>
          <span className="text-[10px] text-arb-muted">Updated {new Date().toLocaleTimeString()}</span>
        </div>
        <div className="grid gap-px bg-arb-border" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
          {SYMBOLS.map(sym => {
            const p = state.prices[sym];
            if (!p?.price) {
              return (
                <div key={sym} className="bg-arb-bg2 px-2.5 py-2">
                  <div className="text-[9px] text-arb-muted font-sans font-semibold tracking-wide">{sym}</div>
                  <div className="text-[13px] text-arb-muted">—</div>
                </div>
              );
            }
            const chg = p.chg24 ?? 0;
            const isUp = chg >= 0;
            const barW = Math.min(100, Math.abs(chg) * 10);
            return (
              <div key={sym} className="bg-arb-bg2 px-2.5 py-2 hover:bg-arb-bg3 transition-colors cursor-default">
                <div className="text-[9px] text-arb-muted font-sans font-semibold tracking-wide">{sym}</div>
                <div className="text-[13px] text-arb-head font-medium tabular-nums">${fmtPrice(p.price)}</div>
                <div className={`text-[10px] mt-0.5 font-sans font-semibold ${isUp ? 'text-arb-green' : 'text-arb-red'}`}>
                  {isUp ? '+' : ''}{chg.toFixed(2)}%
                </div>
                <div className="h-0.5 mt-1 rounded-sm bg-arb-border2 overflow-hidden">
                  <div className={`h-full rounded-sm opacity-50 transition-all duration-500 ${isUp ? 'bg-arb-green' : 'bg-arb-red'}`} style={{ width: `${barW}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Opportunities Table - Desktop */}
      <div className="hidden lg:block bg-arb-bg2 border border-arb-border rounded overflow-hidden flex-1 min-h-[200px]">
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-arb-border">
          <span className="font-sans text-[13px] font-bold text-arb-head">Arbitrage Opportunities</span>
          <span className="text-[10px] text-arb-muted">{visibleOpps.length} found · sorted by net profit</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[640px]">
            <thead>
              <tr>
                {['PAIR / ROUTE', 'TYPE', 'BUY AT', 'SELL AT', 'SPREAD', 'GROSS', 'NET PROFIT', 'ACTION'].map(h => (
                  <th key={h} className="text-[8px] tracking-[2px] uppercase text-arb-muted px-3 py-2 border-b border-arb-border text-left font-semibold font-sans bg-arb-bg3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleOpps.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState />
                  </td>
                </tr>
              ) : (
                visibleOpps.slice(0, 50).map(o => <OppRow key={o.id} opp={o} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Opportunities Cards - Mobile */}
      <div className="lg:hidden flex flex-col gap-2">
        {visibleOpps.length === 0 ? (
          <EmptyState />
        ) : (
          visibleOpps.slice(0, 20).map(o => <OppCard key={o.id} opp={o} />)
        )}
      </div>

      {/* Countdown */}
      <div className="flex items-center gap-2 px-3.5 py-1.5 bg-arb-bg3 border-t border-arb-border flex-shrink-0 text-[10px]">
        <span className="text-[9px] text-arb-muted whitespace-nowrap font-sans">Next scan in {state.countdownSec}s</span>
        <div className="flex-1 h-[3px] bg-arb-border2 rounded overflow-hidden">
          <div className="h-full bg-gradient-to-r from-arb-green to-arb-blue rounded transition-all duration-1000" style={{ width: `${state.countdownPct}%` }} />
        </div>
      </div>
    </div>
  );
});

function KPICard({ accent, label, value, sub }: { accent: string; label: string; value: string; sub: string }) {
  const colorMap: Record<string, string> = {
    green: 'text-arb-green',
    amber: 'text-arb-amber',
    blue: 'text-arb-blue',
    purple: 'text-arb-purple',
  };
  const gradMap: Record<string, string> = {
    green: 'from-transparent via-arb-green to-transparent',
    amber: 'from-transparent via-arb-amber to-transparent',
    blue: 'from-transparent via-arb-blue to-transparent',
    purple: 'from-transparent via-arb-purple to-transparent',
  };
  return (
    <div className="bg-arb-bg2 border border-arb-border rounded p-3 px-3.5 flex flex-col gap-1 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradMap[accent]}`} />
      <div className="text-[9px] font-sans font-semibold text-arb-muted uppercase tracking-wider">{label}</div>
      <div className={`font-sans text-xl font-bold ${colorMap[accent] || 'text-arb-head'}`}>{value}</div>
      <div className="text-[9px] text-arb-muted">{sub}</div>
    </div>
  );
}

function OppRow({ opp: o }: { opp: Opportunity }) {
  const sColor = o.spreadPct > 1 ? 'text-arb-green' : o.spreadPct > 0.5 ? 'text-arb-amber' : 'text-arb-blue';
  const sW = Math.min(100, (o.spreadPct / 2) * 100);
  const sBg = o.spreadPct > 1 ? 'bg-arb-green' : o.spreadPct > 0.5 ? 'bg-arb-amber' : 'bg-arb-blue';

  const copySignal = () => {
    const txt = `ArbPulse Signal · ${o.label}\nType: ${o.type}\nSpread: ${o.spreadPct.toFixed(3)}%\nNet Profit: $${o.netPnl.toFixed(2)}\nBuy at: $${fmtPrice(o.buyAt)}\nSell at: $${fmtPrice(o.sellAt)}\nTime: ${new Date().toLocaleTimeString()}`;
    navigator.clipboard?.writeText(txt);
  };

  return (
    <tr className="animate-fade-in hover:bg-arb-blue/[0.03]">
      <td className="px-3 py-2.5 border-b border-arb-border/30">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-arb-head text-xs font-sans">{o.label}</span>
          <span className="text-[9px] text-arb-muted">{o.type === 'triangular' ? o.route?.join(' → ') : `${o.buyExchange} → ${o.sellExchange}`}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 border-b border-arb-border/30">
        {o.type === 'triangular' ? <Badge variant="tri">TRI</Badge> : <Badge variant="cross">CROSS</Badge>}
        {o.hot && <Badge variant="hot">🔥 HOT</Badge>}
      </td>
      <td className="px-3 py-2.5 border-b border-arb-border/30">
        <ExchTag>{o.type === 'triangular' ? 'Binance' : o.buyExchange!}</ExchTag>
        ${fmtPrice(o.buyAt)}
      </td>
      <td className="px-3 py-2.5 border-b border-arb-border/30">
        <ExchTag>{o.type === 'triangular' ? 'Binance' : o.sellExchange!}</ExchTag>
        ${fmtPrice(o.sellAt)}
      </td>
      <td className="px-3 py-2.5 border-b border-arb-border/30">
        <span className={`${sColor} font-sans font-semibold`}>{o.spreadPct.toFixed(3)}%</span>
        <div className="mt-1">
          <div className="h-[3px] w-[55px] bg-arb-border2 relative rounded overflow-hidden inline-block align-middle">
            <div className={`h-full absolute left-0 top-0 rounded ${sBg}`} style={{ width: `${sW}%` }} />
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 border-b border-arb-border/30">${o.grossPnl.toFixed(2)}</td>
      <td className={`px-3 py-2.5 border-b border-arb-border/30 font-sans font-semibold ${o.netPnl > 0 ? 'text-arb-green' : 'text-arb-muted'}`}>
        ${o.netPnl.toFixed(2)}
      </td>
      <td className="px-3 py-2.5 border-b border-arb-border/30">
        <button onClick={copySignal} className="px-2.5 py-1 bg-arb-green/[0.04] border border-arb-green/25 text-arb-green font-sans text-[9px] font-bold cursor-pointer tracking-wide transition-all rounded hover:bg-arb-green/10 hover:shadow-[0_0_12px_hsl(155,100%,48%,0.15)]">
          COPY
        </button>
      </td>
    </tr>
  );
}

function OppCard({ opp: o }: { opp: Opportunity }) {
  const sColor = o.spreadPct > 1 ? 'text-arb-green' : o.spreadPct > 0.5 ? 'text-arb-amber' : 'text-arb-blue';
  const typeClass = o.type === 'triangular' ? 'from-arb-purple to-arb-blue' : 'from-arb-blue to-arb-cyan';

  return (
    <div className={`bg-arb-bg2 border rounded-lg p-3 px-3.5 relative overflow-hidden animate-card-in ${o.hot ? 'border-arb-red/30' : 'border-arb-border'}`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${typeClass}`} />
      <div className="flex gap-1.5 mb-1.5 flex-wrap">
        {o.type === 'triangular' ? <Badge variant="tri">TRI</Badge> : <Badge variant="cross">CROSS</Badge>}
        {o.hot && <Badge variant="hot">🔥 HOT</Badge>}
      </div>
      <div className="flex items-start justify-between mb-2.5">
        <div>
          <div className="font-sans text-sm font-bold text-arb-head">{o.label}</div>
          <div className="text-[9px] text-arb-muted mt-0.5">{o.type === 'triangular' ? o.route?.join(' → ') : `${o.buyExchange} → ${o.sellExchange}`}</div>
        </div>
        <div className="font-sans text-base font-bold text-arb-green">+${o.netPnl.toFixed(2)}</div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <MoppStat label="Spread" value={`${o.spreadPct.toFixed(3)}%`} className={sColor} />
        <MoppStat label="Buy at" value={`$${fmtPrice(o.buyAt)}`} />
        <MoppStat label="Sell at" value={`$${fmtPrice(o.sellAt)}`} />
      </div>
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-arb-border">
        <span className="text-[9px] text-arb-muted">Gross: ${o.grossPnl.toFixed(2)}</span>
        <button className="px-2.5 py-1 bg-arb-green/[0.04] border border-arb-green/25 text-arb-green font-sans text-[9px] font-bold cursor-pointer tracking-wide transition-all rounded hover:bg-arb-green/10">
          COPY SIGNAL
        </button>
      </div>
    </div>
  );
}

function MoppStat({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[8px] text-arb-muted uppercase tracking-wide">{label}</div>
      <div className={`text-[11px] text-arb-head font-medium ${className}`}>{value}</div>
    </div>
  );
}

function Badge({ variant, children }: { variant: 'tri' | 'cross' | 'hot'; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    tri: 'bg-arb-purple/10 border border-arb-purple/35 text-arb-purple',
    cross: 'bg-arb-blue/10 border border-arb-blue/35 text-arb-blue',
    hot: 'bg-gradient-to-br from-[#ff6b35] to-arb-red border-none text-white animate-hot-glow',
  };
  return <span className={`text-[8px] px-2 py-0.5 rounded font-bold inline-block mr-1 font-sans tracking-wide ${styles[variant]}`}>{children}</span>;
}

function ExchTag({ children }: { children: React.ReactNode }) {
  return <span className="text-[8px] px-1.5 py-0.5 border border-arb-border2 text-arb-muted inline-block mr-1 rounded font-sans font-semibold">{children}</span>;
}

function EmptyState() {
  return (
    <div className="text-center py-10 px-5 text-arb-muted">
      <div className="text-4xl mb-3 opacity-40">🔍</div>
      <div className="font-sans text-sm font-semibold text-arb-text mb-1.5">No opportunities found</div>
      <div className="text-[11px] leading-relaxed">
        Try lowering Min Spread to 0.04% or Min Profit to $0.50<br />
        Markets are currently tight — scanner is active
      </div>
    </div>
  );
}
