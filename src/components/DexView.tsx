import { memo, useCallback, useState, useMemo } from 'react';
import type { DexOpp, ScannerFilters, LogEntry, SafetyResult } from '@/hooks/useArbScanner';
import { fmtPrice, fmtVol, fmtAge, LOW_LIQ_THRESHOLD } from '@/hooks/useArbScanner';

interface DexViewProps {
  // Solana
  opps: DexOpp[];
  scanning: boolean;
  status: string;
  onScan: () => void;
  // BSC
  bscOpps: DexOpp[];
  bscScanning: boolean;
  bscStatus: string;
  onBscScan: () => void;
  // shared
  filters: ScannerFilters;
  setFilters: React.Dispatch<React.SetStateAction<ScannerFilters>>;
  onRefilter: () => void;
  onLogOpp: (opp: DexOpp) => void;
  onCalc: (opp: DexOpp) => void;
  logs: LogEntry[];   // for real-time diagnostics in empty state
}

export const DexView = memo(({ opps, scanning, status, onScan, bscOpps, bscScanning, bscStatus, onBscScan, filters, setFilters, onRefilter, onLogOpp, onCalc, logs }: DexViewProps) => {
  const [chain, setChain] = useState<'solana' | 'bsc'>('solana');

  const updateFilter = useCallback((key: keyof ScannerFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setTimeout(onRefilter, 50);
  }, [setFilters, onRefilter]);

  const activeOpps = chain === 'solana' ? opps : bscOpps;
  const activeScanning = chain === 'solana' ? scanning : bscScanning;
  const activeStatus = chain === 'solana' ? status : bscStatus;
  const activeScan = chain === 'solana' ? onScan : onBscScan;

  // Extract last spread telemetry from logs for smart empty-state diagnostics
  const spreadInfo = useMemo(() => {
    const prefix = chain === 'solana' ? 'SOLANA best raw spread:' : 'BSC best raw spread:';
    const entry = [...logs].reverse().find(l => l.msg.startsWith(prefix));
    if (!entry) return null;
    // "SOLANA best raw spread: 0.048% (fees+slip threshold ~0.70%)"
    const rawMatch = entry.msg.match(/([\d.]+)%\s*\(fees\+slip threshold ~([\d.]+)%\)/);
    if (!rawMatch) return null;
    return { raw: parseFloat(rawMatch[1]), threshold: parseFloat(rawMatch[2]) };
  }, [logs, chain]);

  return (
    <div className="flex flex-col gap-2 p-2.5 overflow-y-auto flex-1 bg-arb-bg">

      {/* DYOR Banner */}
      <DyorBanner />

      {/* Chain Tabs */}
      <ChainTabs active={chain} onSwitch={setChain} solanaCount={opps.length} bscCount={bscOpps.length} />

      {/* Filter Bar */}
      <div className="flex gap-1.5 items-center flex-wrap bg-arb-bg2 border border-arb-border rounded-md p-2 px-2.5 flex-shrink-0">
        <FilterChip label="Liq $">
          <input type="number" value={filters.dexMinLiq} step={500} min={0}
            onChange={e => updateFilter('dexMinLiq', parseFloat(e.target.value) || 0)}
            className="w-[62px] bg-arb-bg3 border border-arb-border2 text-arb-head px-1.5 py-0.5 font-mono text-[10px] rounded outline-none focus:border-arb-green" />
        </FilterChip>
        <Sep />
        <FilterChip label="Vol $">
          <input type="number" value={filters.dexMinVol} step={100} min={0}
            onChange={e => updateFilter('dexMinVol', parseFloat(e.target.value) || 0)}
            className="w-[62px] bg-arb-bg3 border border-arb-border2 text-arb-head px-1.5 py-0.5 font-mono text-[10px] rounded outline-none focus:border-arb-green" />
        </FilterChip>
        <Sep />
        <FilterChip label="Sprd">
          <input type="number" value={filters.dexMinSpread} step={0.05} min={0}
            onChange={e => updateFilter('dexMinSpread', parseFloat(e.target.value) || 0)}
            className="w-[52px] bg-arb-bg3 border border-arb-border2 text-arb-head px-1.5 py-0.5 font-mono text-[10px] rounded outline-none focus:border-arb-green" />
          <span className="text-[9px] text-arb-muted">%</span>
        </FilterChip>
        <Sep />
        <ToggleSmall label="Safe" checked={filters.dexSafeOnly} onChange={v => updateFilter('dexSafeOnly', v)} />
        <Sep />
        <ToggleSmall label="New" checked={filters.dexNewOnly} onChange={v => updateFilter('dexNewOnly', v)} />
        <Sep />
        <FilterChip label="Sort">
          <select value={filters.dexSort} onChange={e => updateFilter('dexSort', e.target.value)}
            className="bg-arb-bg3 border border-arb-border2 text-arb-head px-1 py-0.5 font-mono text-[10px] rounded cursor-pointer outline-none">
            <option value="spread">Spread</option>
            <option value="profit">Profit</option>
            <option value="liq">Liquidity</option>
            <option value="new">Newest</option>
          </select>
        </FilterChip>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="font-sans font-semibold text-[13px] text-arb-head flex items-center gap-1.5">
          {chain === 'solana' ? '🚀' : '🟡'} {chain === 'solana' ? 'Solana' : 'BSC'} DEX Arb
          <span className="text-[10px] text-arb-muted">{activeOpps.length} opps</span>
          {activeOpps.filter(o => o.lowLiquidity).length > 0 && (
            <span className="text-[9px] text-arb-amber ml-1">⚠ {activeOpps.filter(o => o.lowLiquidity).length} low liq</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button disabled={activeScanning} onClick={activeScan}
            className="bg-transparent border border-arb-cyan text-arb-cyan px-2.5 py-1 text-[9px] rounded-full cursor-pointer font-mono disabled:opacity-40 disabled:cursor-not-allowed hover:bg-arb-cyan/10 transition-colors">
            ⟳ SCAN
          </button>
          <span className="text-[9px] text-arb-muted">{activeStatus}</span>
        </div>
      </div>

      {/* Cards */}
      {activeScanning && !activeOpps.length ? (
        <div className="flex flex-col items-center gap-2.5 py-10 text-arb-muted text-[11px]">
          <div className="w-[18px] h-[18px] border-2 border-arb-border2 border-t-arb-green rounded-full animate-spin-loader" />
          Fetching live {chain === 'solana' ? 'Solana' : 'BNB Smart Chain'} DEX pairs…
        </div>
      ) : activeOpps.length === 0 ? (
        <div className="text-center py-6 text-arb-muted text-[11px] leading-relaxed px-4">
          {spreadInfo ? (
            // Real spread telemetry available — show actual market diagnosis
            <div className="flex flex-col gap-2">
              <div className="text-[13px] font-mono text-arb-amber">📉 Market is tight</div>
              <div className="bg-arb-bg2 border border-arb-border rounded-md p-3 text-left font-mono text-[10px] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-arb-muted">Best raw spread</span>
                  <span className={spreadInfo.raw < spreadInfo.threshold * 0.5 ? 'text-arb-red font-bold' : 'text-arb-amber font-bold'}>
                    {spreadInfo.raw.toFixed(3)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-arb-muted">Break-even (fees+slip)</span>
                  <span className="text-arb-muted">{spreadInfo.threshold.toFixed(2)}%</span>
                </div>
                <div className="h-[1px] bg-arb-border" />
                <div className="flex justify-between">
                  <span className="text-arb-muted">Gap to profitability</span>
                  <span className="text-arb-red font-bold">−{(spreadInfo.threshold - spreadInfo.raw).toFixed(3)}%</span>
                </div>
              </div>
              <div className="text-[9px] text-arb-muted mt-1">
                Market needs to widen <strong className="text-arb-amber">{(spreadInfo.threshold / spreadInfo.raw).toFixed(0)}×</strong> before any opp clears fees.
                {filters.dexNewOnly && <span className="block mt-1 text-arb-cyan">💡 "New only" is ON — turn it OFF to scan all tokens.</span>}
                {filters.dexMinVol > 10000 && <span className="block mt-1 text-arb-cyan">💡 Lower Vol filter to $5k to see more tokens.</span>}
              </div>
            </div>
          ) : (
            // No telemetry yet — generic hints
            <div className="flex flex-col gap-1">
              <div>🔍 No opportunities above filters.</div>
              <div className="text-arb-amber mt-2">Try:</div>
              <div>• Turn off "New only"</div>
              <div>• Lower Min Vol → $5,000</div>
              <div>• Lower Min Spread → 0.05%</div>
              <div>• Lower Min Profit → $0.50</div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 flex-1">
          {activeOpps.slice(0, 50).map((o, i) => (
            <DexCard key={o.id} opp={o} index={i} onLog={onLogOpp} onCalc={onCalc} />
          ))}
        </div>
      )}
    </div>
  );
});

/* ─── Chain Tabs ────────────────────────────────────────────────────────────── */
function ChainTabs({ active, onSwitch, solanaCount, bscCount }: {
  active: 'solana' | 'bsc';
  onSwitch: (c: 'solana' | 'bsc') => void;
  solanaCount: number;
  bscCount: number;
}) {
  return (
    <div className="flex gap-1.5 flex-shrink-0 bg-arb-bg2 border border-arb-border rounded-md p-1.5">
      <ChainTab
        active={active === 'solana'}
        onClick={() => onSwitch('solana')}
        icon="◎"
        label="Solana"
        count={solanaCount}
        color="text-arb-green"
        activeBg="bg-arb-green/10 border-arb-green/30"
      />
      <ChainTab
        active={active === 'bsc'}
        onClick={() => onSwitch('bsc')}
        icon="🟡"
        label="BNB Chain"
        count={bscCount}
        color="text-arb-amber"
        activeBg="bg-arb-amber/10 border-arb-amber/30"
        // badge removed — was hardcoded static value, misleading
      />
    </div>
  );
}

function ChainTab({ active, onClick, icon, label, count, color, activeBg, badge }: {
  active: boolean; onClick: () => void; icon: string; label: string; count: number;
  color: string; activeBg: string; badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${active ? `${activeBg} ${color}` : 'border-transparent text-arb-muted hover:text-arb-text'}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {count > 0 && (
        <span className={`text-[8px] px-1 py-0.5 rounded-full font-bold ${active ? 'bg-arb-bg3' : 'bg-arb-bg3'}`}>{count}</span>
      )}
      {/* badge prop removed — was static/fake volume figure */}
    </button>
  );
}

/* ─── DYOR Banner ───────────────────────────────────────────────────────────── */
function DyorBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="flex items-start gap-2 bg-arb-amber/[0.06] border border-arb-amber/30 rounded-md px-3 py-2 flex-shrink-0 relative">
      <span className="text-arb-amber text-[13px] mt-0.5 flex-shrink-0">⚠</span>
      <div className="flex-1 min-w-0">
        <span className="text-[9px] font-bold text-arb-amber uppercase tracking-wider">DO YOUR OWN RESEARCH (DYOR)</span>
        <p className="text-[9px] text-arb-muted mt-0.5 leading-relaxed">
          ArbPulse Pro displays real-time data for informational purposes only. Arbitrage involves significant risk including slippage, MEV bots, rug pulls and low-liquidity traps. Always verify pair addresses on-chain before executing trades. <strong className="text-arb-text">Not financial advice.</strong>
        </p>
      </div>
      <button onClick={() => setDismissed(true)} className="text-arb-muted text-[10px] hover:text-arb-amber transition-colors flex-shrink-0 ml-1">✕</button>
    </div>
  );
}

/* ─── DexCard ───────────────────────────────────────────────────────────────── */
function DexCard({ opp: o, index, onLog, onCalc }: { opp: DexOpp; index: number; onLog: (o: DexOpp) => void; onCalc: (o: DexOpp) => void }) {
  const sc = o.spreadPct > 2 ? 'text-arb-green' : o.spreadPct > 0.5 ? 'text-arb-amber' : 'text-arb-muted';
  const accentClass = o.hot ? 'bg-gradient-to-b from-arb-red to-arb-amber' : o.safety ? (o.safety.score < 300 ? 'bg-arb-green' : o.safety.score < 600 ? 'bg-arb-amber' : 'bg-arb-red') : 'bg-arb-amber';
  const borderClass = o.hot ? 'border-arb-red/30' : o.isNew ? 'border-arb-cyan/30' : o.lowLiquidity ? 'border-arb-amber/40' : 'border-arb-border';
  const minTvl = Math.min(o.buyTvl || o.buyLiq, o.sellTvl || o.sellLiq);
  const isBsc = o.chain === 'bsc';
  const explorerBase = isBsc ? 'https://bscscan.com/token/' : 'https://solscan.io/token/';
  const dsPath = isBsc ? `https://dexscreener.com/bsc/${o.buyPairAddr || o.mint}` : `https://dexscreener.com/solana/${o.buyPairAddr || o.mint}`;

  return (
    <div className={`bg-arb-bg2 border rounded-lg p-2.5 px-3 relative overflow-hidden animate-fade-in ${borderClass}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accentClass}`} />

      {/* Chain badge */}
      <div className={`absolute top-2 right-2 text-[7px] px-1.5 py-0.5 rounded font-bold border ${isBsc ? 'bg-arb-amber/10 border-arb-amber/30 text-arb-amber' : 'bg-arb-green/10 border-arb-green/30 text-arb-green'}`}>
        {isBsc ? '🟡 BSC' : '◎ SOL'}
      </div>

      {/* Low Liquidity Warning */}
      {o.lowLiquidity && (
        <div className="flex items-center gap-1.5 bg-arb-amber/[0.08] border border-arb-amber/25 rounded px-2 py-1 mb-2">
          <span className="text-arb-amber text-[12px]">⚠</span>
          <span className="text-[9px] text-arb-amber font-semibold">Low Liquidity Pair</span>
          <span className="text-[9px] text-arb-muted">— TVL below ${(LOW_LIQ_THRESHOLD / 1000).toFixed(0)}K · High price impact risk</span>
        </div>
      )}

      {/* Row 1: Token name + badges */}
      <div className="flex items-start justify-between mb-1.5 pr-12">
        <div className="flex-1 min-w-0 mr-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-sans font-bold text-[15px] text-arb-head">{o.symbol}</span>
            <PairAddressChip addr={o.buyPairAddr} dex={o.buyDex} label="buy pair" />
            {o.sellPairAddr && o.sellPairAddr !== o.buyPairAddr && (
              <PairAddressChip addr={o.sellPairAddr} dex={o.sellDex} label="sell pair" />
            )}
          </div>
          <div className="text-[9px] text-arb-muted mt-0.5">{o.name}</div>
          <MintAddressChip mint={o.mint} />
        </div>
        <div className="flex gap-1 flex-wrap justify-end">
          {o.isVNew && <Badge cls="bg-arb-cyan/10 border-arb-cyan/30 text-arb-cyan">🆕 NEW 6H</Badge>}
          {!o.isVNew && o.isNew && <Badge cls="bg-arb-cyan/10 border-arb-cyan/30 text-arb-cyan">NEW 24H</Badge>}
          {o.hot && <Badge cls="bg-gradient-to-br from-[#ff6b35] to-arb-red border-none text-white animate-hot-glow">🔥 HOT</Badge>}
          {o.lowLiquidity && <Badge cls="bg-arb-amber/10 border-arb-amber/30 text-arb-amber">⚠ LOW LIQ</Badge>}
          <SafetyBadge safety={o.safety} />
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center gap-1.5 mb-1.5 overflow-hidden">
        <DexPill dex={o.buyDex} chain={o.chain} />
        <span className="text-arb-muted text-[12px]">→</span>
        <DexPill dex={o.sellDex} chain={o.chain} />
        <span className="text-[9px] text-arb-muted ml-auto whitespace-nowrap">${fmtPrice(o.buyPrice)} → ${fmtPrice(o.sellPrice)}</span>
      </div>

      {/* Stats grid — 5 cells */}
      <div className="grid grid-cols-5 gap-1 mb-1.5">
        <StatBox label="Spread" value={`${o.spreadPct.toFixed(2)}%`} cls={sc} />
        <StatBox label="Net Profit" value={`$${o.net.toFixed(2)}`} cls="text-arb-green" />
        <StatBox label="Min Liq" value={fmtVol(o.minLiq)} cls="text-arb-head" />
        <StatBox
          label="Vol/MC"
          value={`${o.volMCRatio.toFixed(1)}×`}
          cls={o.volMCRatio >= 4.5 ? 'text-arb-green' : o.volMCRatio >= 2 ? 'text-arb-amber' : 'text-arb-muted'}
          icon={o.volMCRatio >= 4.5 ? '🔥' : undefined}
        />
        <StatBox label="Age" value={fmtAge(o.createdAt)} cls={o.isNew ? 'text-arb-amber' : 'text-arb-muted'} />
      </div>

      {/* Pair address rows */}
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <PairAddressRow label="Buy" addr={o.buyPairAddr} dex={o.buyDex} chain={o.chain} />
        {o.sellPairAddr && o.sellPairAddr !== o.buyPairAddr && (
          <>
            <span className="text-arb-border2 text-[9px]">|</span>
            <PairAddressRow label="Sell" addr={o.sellPairAddr} dex={o.sellDex} chain={o.chain} />
          </>
        )}
      </div>

      {/* Safety bar */}
      {o.safety && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="flex-1 h-[3px] bg-arb-border2 rounded overflow-hidden">
            <div className="h-full rounded" style={{ width: `${Math.min(100, o.safety.score / 10)}%`, background: o.safety.score < 300 ? 'hsl(var(--arb-green))' : o.safety.score < 600 ? 'hsl(var(--arb-amber))' : 'hsl(var(--arb-red))' }} />
          </div>
          <span className="text-[9px] text-arb-muted whitespace-nowrap truncate max-w-[65%]">
            {o.safety.score}/1000 {o.safety.risks.length ? '· ' + o.safety.risks[0] : '· OK'}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-1.5 mt-2">
        <button onClick={() => onLog(o)} className="px-2.5 py-1 bg-arb-green/[0.07] border border-arb-green/20 text-arb-green font-mono text-[9px] cursor-pointer rounded transition-all hover:bg-arb-green/15">
          📌 LOG
        </button>
        <button onClick={() => onCalc(o)} className="px-2.5 py-1 bg-arb-cyan/[0.07] border border-arb-cyan/20 text-arb-cyan font-mono text-[9px] cursor-pointer rounded transition-all hover:bg-arb-cyan/15">
          🧮 CALC
        </button>
        <a href={dsPath} target="_blank" rel="noopener noreferrer"
          className="px-2.5 py-1 bg-arb-purple/[0.07] border border-arb-purple/20 text-arb-purple font-mono text-[9px] rounded transition-all hover:bg-arb-purple/15 no-underline inline-flex items-center">
          📊 DS
        </a>
        <a href={`${explorerBase}${o.mint}`} target="_blank" rel="noopener noreferrer"
          className="px-2.5 py-1 bg-arb-blue/[0.07] border border-arb-border2 text-arb-muted font-mono text-[9px] rounded transition-all hover:bg-arb-blue/10 no-underline inline-flex items-center">
          🔍 {isBsc ? 'BSCscan' : 'Solscan'}
        </a>
      </div>
    </div>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
function PairAddressChip({ addr, dex, label }: { addr: string; dex: string; label: string }) {
  const [copied, setCopied] = useState(false);
  if (!addr) return null;
  const short = addr.slice(0, 4) + '…' + addr.slice(-4);
  const copy = () => { navigator.clipboard?.writeText(addr).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <button onClick={copy} title={`${label}: ${addr}`}
      className="text-[8px] font-mono text-arb-blue border border-arb-border2 bg-arb-bg3 px-1.5 py-0.5 rounded cursor-pointer hover:border-arb-blue/40 hover:text-arb-cyan transition-colors">
      {copied ? '✓ copied' : short}
    </button>
  );
}

function MintAddressChip({ mint }: { mint: string }) {
  const [copied, setCopied] = useState(false);
  if (!mint) return null;
  const short = 'mint: ' + mint.slice(0, 6) + '…' + mint.slice(-4);
  const copy = () => { navigator.clipboard?.writeText(mint).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <button onClick={copy} title={`Token mint: ${mint}`}
      className="text-[8px] font-mono text-arb-muted hover:text-arb-blue transition-colors mt-0.5 text-left">
      {copied ? '✓ copied' : short}
    </button>
  );
}

function PairAddressRow({ label, addr, dex, chain }: { label: string; addr: string; dex: string; chain: string }) {
  const [copied, setCopied] = useState(false);
  if (!addr) return <span className="text-[8px] text-arb-muted">{label}: —</span>;
  const short = addr.slice(0, 6) + '…' + addr.slice(-4);
  const copy = () => { navigator.clipboard?.writeText(addr).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const dsUrl = chain === 'bsc' ? `https://dexscreener.com/bsc/${addr}` : `https://dexscreener.com/solana/${addr}`;
  return (
    <div className="flex items-center gap-1">
      <span className="text-[8px] text-arb-muted">{label}:</span>
      <button onClick={copy} title={`${dex} pair: ${addr}`} className="text-[8px] font-mono text-arb-blue hover:text-arb-cyan transition-colors cursor-pointer">
        {copied ? '✓' : short}
      </button>
      <a href={dsUrl} target="_blank" rel="noopener noreferrer" className="text-[8px] text-arb-muted hover:text-arb-amber transition-colors" title="View on DexScreener">↗</a>
    </div>
  );
}

function DexPill({ dex, chain }: { dex: string; chain: string }) {
  const solNames: Record<string, string> = { raydium:'Raydium','pump-fun':'Pump.fun',meteora:'Meteora',orca:'Orca',jupiter:'Jupiter',lifinity:'Lifinity',openbook:'OpenBook' };
  const bscNames: Record<string, string> = { 'pancakeswap-v3':'PCS V3','pancakeswap-v2':'PCS V2','pancakeswap-infinity-clmm':'PCS∞','uniswap-v3-bsc':'UNI V3','uniswap-v4-bsc':'UNI V4','thena-v3':'THENA V3','thena-fusion':'THENA','biswap':'Biswap','biswap-v3':'Biswap V3',apeswap:'ApeSwap',babyswap:'BabySwap',sushiswap:'Sushi','dodo-bsc':'DODO',bakeryswap:'Bakery',curve:'Curve',openocean:'OpenOcean' };
  const solColors: Record<string, string> = { 'pump-fun':'bg-arb-pink/10 border-arb-pink/30 text-arb-pink',raydium:'bg-arb-green/[0.08] border-arb-green/25 text-arb-green',meteora:'bg-arb-purple/10 border-arb-purple/30 text-arb-purple',orca:'bg-arb-cyan/[0.08] border-arb-cyan/25 text-arb-cyan',jupiter:'bg-arb-amber/[0.08] border-arb-amber/25 text-arb-amber' };
  const bscColors: Record<string, string> = { 'pancakeswap-v3':'bg-arb-amber/10 border-arb-amber/30 text-arb-amber','pancakeswap-v2':'bg-arb-amber/[0.08] border-arb-amber/20 text-arb-amber','pancakeswap-infinity-clmm':'bg-arb-amber/10 border-arb-amber/30 text-arb-amber','uniswap-v3-bsc':'bg-arb-pink/10 border-arb-pink/30 text-arb-pink','uniswap-v4-bsc':'bg-arb-pink/10 border-arb-pink/30 text-arb-pink','thena-v3':'bg-arb-cyan/10 border-arb-cyan/30 text-arb-cyan','thena-fusion':'bg-arb-cyan/[0.08] border-arb-cyan/20 text-arb-cyan',biswap:'bg-arb-blue/10 border-arb-blue/30 text-arb-blue',apeswap:'bg-arb-purple/10 border-arb-purple/30 text-arb-purple' };
  const names = chain === 'bsc' ? bscNames : solNames;
  const colors = chain === 'bsc' ? bscColors : solColors;
  return <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap border ${colors[dex] || 'bg-arb-blue/[0.08] border-arb-border2 text-arb-muted'}`}>{names[dex] || dex}</span>;
}

function SafetyBadge({ safety }: { safety: SafetyResult | null }) {
  if (!safety) return <Badge cls="bg-arb-blue/[0.08] border-arb-border2 text-arb-muted">? UNK</Badge>;
  if (safety.score < 300) return <Badge cls="bg-arb-green/10 border-arb-green/30 text-arb-green">✓ SAFE</Badge>;
  if (safety.score < 600) return <Badge cls="bg-arb-amber/10 border-arb-amber/30 text-arb-amber">⚠ WARN</Badge>;
  return <Badge cls="bg-arb-red/10 border-arb-red/30 text-arb-red">✗ RISKY</Badge>;
}

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold inline-flex items-center gap-0.5 whitespace-nowrap border ${cls}`}>{children}</span>;
}

function StatBox({ label, value, cls, icon }: { label: string; value: string; cls: string; icon?: string }) {
  return (
    <div className="bg-arb-bg3 rounded p-1.5 px-2">
      <div className="text-[8px] text-arb-muted uppercase tracking-wider">{label}</div>
      <div className={`text-[11px] font-semibold mt-0.5 tabular-nums flex items-center gap-0.5 ${cls}`}>
        {icon && <span className="text-[10px]">{icon}</span>}
        {value}
      </div>
    </div>
  );
}

function FilterChip({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center gap-1 text-[9px] text-arb-muted"><span>{label}</span>{children}</div>;
}

function Sep() { return <div className="w-px h-5 bg-arb-border2 flex-shrink-0" />; }

function ToggleSmall({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1 text-[9px] text-arb-muted cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="hidden" />
      <div className={`w-[26px] h-[13px] rounded-full relative transition-colors ${checked ? 'bg-arb-green' : 'bg-arb-border2'}`}>
        <div className={`absolute w-[9px] h-[9px] bg-white rounded-full top-[2px] transition-all ${checked ? 'left-[15px]' : 'left-[2px]'}`} />
      </div>
      <span>{label}</span>
    </label>
  );
}
