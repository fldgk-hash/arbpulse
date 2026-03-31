import { forwardRef, memo, useMemo, useState } from 'react';
import type { NewPairEntry } from '@/hooks/useArbScanner';
import { fmtAge, fmtPrice, fmtVol } from '@/hooks/useArbScanner';

interface NewTokensViewProps {
  newPairs: NewPairEntry[];
  onClear: () => void;
}

type AgeFilter = 'all' | '1h' | '6h' | '24h';
type ChainFilter = 'all' | 'solana' | 'bsc';

type MiniStatProps = {
  label: string;
  value: string;
  cls?: string;
};

const AGE_MS: Record<AgeFilter, number> = {
  all: Infinity,
  '1h': 3_600_000,
  '6h': 21_600_000,
  '24h': 86_400_000,
};

const CHAIN_LABELS: Record<Exclude<ChainFilter, 'all'>, string> = {
  solana: '◎ SOL',
  bsc: '🟡 BSC',
};

export const NewTokensView = memo(({ newPairs, onClear }: NewTokensViewProps) => {
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all');
  const [chainFilter, setChainFilter] = useState<ChainFilter>('all');
  const [arbOnly, setArbOnly] = useState(false);
  const [minLiq, setMinLiq] = useState(0);

  const filtered = useMemo(() => {
    const now = Date.now();

    return newPairs.filter((pair) => {
      if (chainFilter !== 'all' && pair.chain !== chainFilter) return false;
      if (arbOnly && !pair.hasMultiDex) return false;
      if (minLiq > 0 && pair.liq < minLiq) return false;

      const age = pair.createdAt !== null ? now - pair.createdAt : Infinity;
      return age <= AGE_MS[ageFilter];
    });
  }, [newPairs, chainFilter, arbOnly, minLiq, ageFilter]);

  const arbCount = filtered.filter((pair) => pair.hasMultiDex).length;
  const freshCount = filtered.filter((pair) => pair.createdAt && Date.now() - pair.createdAt < 3_600_000).length;

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-arb-bg p-2.5">
      <div className="flex flex-shrink-0 items-center justify-between">
        <div className="flex items-center gap-2 font-sans text-[13px] font-semibold text-arb-head">
          🆕 New Listings
          <span className="text-[10px] text-arb-muted">{filtered.length} pairs</span>
          {arbCount > 0 && (
            <span className="rounded border border-arb-green/30 bg-arb-green/10 px-1.5 py-0.5 text-[9px] font-bold text-arb-green">
              ⚡ {arbCount} ARB
            </span>
          )}
          {freshCount > 0 && (
            <span className="animate-pulse rounded border border-arb-red/30 bg-arb-red/10 px-1.5 py-0.5 text-[9px] font-bold text-arb-red">
              🔥 {freshCount} &lt;1h
            </span>
          )}
        </div>

        <button
          onClick={onClear}
          className="cursor-pointer border border-arb-border bg-transparent px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-arb-muted transition-colors hover:border-arb-red hover:text-arb-red"
        >
          CLEAR
        </button>
      </div>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5 rounded-md border border-arb-border bg-arb-bg2 p-2 px-2.5">
        <div className="flex items-center gap-1 text-[9px] text-arb-muted">
          <span>Age</span>
          {(['all', '1h', '6h', '24h'] as AgeFilter[]).map((age) => (
            <button
              key={age}
              onClick={() => setAgeFilter(age)}
              className={`cursor-pointer rounded border px-2 py-0.5 font-mono text-[9px] transition-colors ${
                ageFilter === age
                  ? 'border-arb-green/40 bg-arb-green/10 text-arb-green'
                  : 'border-arb-border2 bg-transparent text-arb-muted hover:text-arb-text'
              }`}
            >
              {age === 'all' ? 'ALL' : age}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-arb-border2" />

        <div className="flex items-center gap-1 text-[9px] text-arb-muted">
          <span>Chain</span>
          {(['all', 'solana', 'bsc'] as ChainFilter[]).map((chain) => (
            <button
              key={chain}
              onClick={() => setChainFilter(chain)}
              className={`cursor-pointer rounded border px-2 py-0.5 font-mono text-[9px] transition-colors ${
                chainFilter === chain
                  ? 'border-arb-green/40 bg-arb-green/10 text-arb-green'
                  : 'border-arb-border2 bg-transparent text-arb-muted hover:text-arb-text'
              }`}
            >
              {chain === 'all' ? 'ALL' : CHAIN_LABELS[chain]}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-arb-border2" />

        <label className="flex cursor-pointer select-none items-center gap-1 text-[9px] text-arb-muted">
          <input
            type="checkbox"
            checked={arbOnly}
            onChange={(event) => setArbOnly(event.target.checked)}
            className="hidden"
          />
          <div className={`relative h-[13px] w-[26px] rounded-full transition-colors ${arbOnly ? 'bg-arb-green' : 'bg-arb-border2'}`}>
            <div className={`absolute top-[2px] h-[9px] w-[9px] rounded-full bg-white transition-all ${arbOnly ? 'left-[15px]' : 'left-[2px]'}`} />
          </div>
          <span>⚡ Arb only</span>
        </label>

        <div className="h-4 w-px bg-arb-border2" />

        <div className="flex items-center gap-1 text-[9px] text-arb-muted">
          <span>Liq $</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={minLiq === 0 ? '' : minLiq.toString()}
            placeholder="0"
            onFocus={(event) => event.target.select()}
            onChange={(event) => {
              const value = event.target.value.replace(/[^0-9]/g, '');
              setMinLiq(value === '' ? 0 : parseInt(value, 10));
            }}
            className="w-[62px] rounded border border-arb-border2 bg-arb-bg3 px-1.5 py-0.5 font-mono text-[10px] text-arb-head outline-none focus:border-arb-green"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center text-[11px] leading-relaxed text-arb-muted">
          🔍 No new pairs yet.
          <br />
          <br />
          <span className="text-[10px] text-arb-amber">
            New listings appear here as scans run.
            <br />
            Pairs with the ⚡ ARB badge were spotted on 2+ DEXes.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.slice(0, 100).map((pair) => (
            <NewPairCard key={pair.id} pair={pair} />
          ))}
        </div>
      )}
    </div>
  );
});

function NewPairCard({ pair }: { pair: NewPairEntry }) {
  const [copied, setCopied] = useState(false);
  const now = Date.now();
  const ageMs = pair.createdAt !== null ? now - pair.createdAt : Infinity;
  const isFresh = ageMs < 3_600_000;
  const isVeryFresh = ageMs < 1_800_000;
  const isBsc = pair.chain === 'bsc';

  const dsUrl = isBsc
    ? `https://dexscreener.com/bsc/${pair.pairAddr}`
    : `https://dexscreener.com/solana/${pair.pairAddr}`;
  const explorerUrl = isBsc
    ? `https://bscscan.com/token/${pair.mint}`
    : `https://solscan.io/token/${pair.mint}`;

  const copyMint = () => {
    navigator.clipboard?.writeText(pair.mint).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const solNames: Record<string, string> = {
    raydium: 'Raydium',
    'pump-fun': 'Pump.fun',
    meteora: 'Meteora',
    orca: 'Orca',
    jupiter: 'Jupiter',
    'raydium-clmm': 'Raydium CLMM',
    'raydium-cp': 'Raydium CP',
    whirlpool: 'Whirlpool',
  };

  const bscNames: Record<string, string> = {
    'pancakeswap-v3': 'PCS V3',
    'pancakeswap-v2': 'PCS V2',
    pancakeswap: 'PancakeSwap',
    'uniswap-v3-bsc': 'UNI V3',
    'uniswap-v4-bsc': 'UNI V4',
    uniswap: 'Uniswap',
    'thena-v3': 'THENA V3',
    'thena-fusion': 'THENA',
    biswap: 'Biswap',
    'biswap-v3': 'Biswap V3',
    apeswap: 'ApeSwap',
    babyswap: 'BabySwap',
    sushiswap: 'SushiSwap',
    'sushiswap-v3': 'Sushi V3',
    squadswap: 'SquadSwap',
    'ellipsis-finance': 'Ellipsis',
  };

  const rawDex = pair.dex.startsWith('unknown:') ? pair.dex.slice(8) : pair.dex;
  const isContractAddr = /^0x[0-9a-fA-F]{8,}/.test(rawDex);
  const dexLabel = isContractAddr
    ? `${rawDex.slice(0, 6)}…${rawDex.slice(-4)}`
    : ((isBsc ? bscNames : solNames)[rawDex] || rawDex);

  return (
    <div
      className={`rounded-md border p-2.5 transition-all ${
        pair.hasMultiDex ? 'border-arb-green/20 bg-arb-green/[0.03]' : 'border-arb-border bg-arb-bg2'
      } ${isVeryFresh ? 'animate-pulse-border' : ''}`}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span
            className={`rounded border px-1.5 py-0.5 text-[8px] font-bold ${
              isBsc ? 'border-arb-amber/30 bg-arb-amber/10 text-arb-amber' : 'border-arb-green/30 bg-arb-green/10 text-arb-green'
            }`}
          >
            {isBsc ? '🟡 BSC' : '◎ SOL'}
          </span>

          <span className="truncate font-sans text-[13px] font-bold text-arb-head">{pair.symbol}</span>
          <span className="max-w-[120px] truncate text-[10px] text-arb-muted">{pair.name}</span>

          {pair.hasMultiDex && (
            <span className="whitespace-nowrap rounded border border-arb-green/30 bg-arb-green/10 px-1.5 py-0.5 text-[9px] font-bold text-arb-green">
              ⚡ ARB {pair.arbSpread ? `${pair.arbSpread.toFixed(2)}%` : ''}
            </span>
          )}

          {isFresh && (
            <span
              className={`whitespace-nowrap rounded border px-1.5 py-0.5 text-[8px] font-bold ${
                isVeryFresh ? 'border-arb-red/30 bg-arb-red/10 text-arb-red' : 'border-arb-amber/30 bg-arb-amber/10 text-arb-amber'
              }`}
            >
              {isVeryFresh ? '🔥 NEW' : '🟡 <1h'}
            </span>
          )}
        </div>

        <span className="flex-shrink-0 whitespace-nowrap text-[9px] text-arb-muted">
          {pair.createdAt ? fmtAge(pair.createdAt) : `seen ${fmtAge(pair.seenAt)}`}
        </span>
      </div>

      <div className="mb-2 grid grid-cols-4 gap-1">
        <MiniStat label="Price" value={`$${fmtPrice(pair.price)}`} />
        <MiniStat
          label="Liq"
          value={fmtVol(pair.liq)}
          cls={pair.liq < 5000 ? 'text-arb-red' : pair.liq < 25000 ? 'text-arb-amber' : 'text-arb-head'}
        />
        <MiniStat label="Vol 24h" value={fmtVol(pair.vol)} />
        <MiniStat label="DEX" value={dexLabel} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={copyMint}
          className="cursor-pointer rounded border border-arb-border2 bg-arb-bg3 px-1.5 py-0.5 font-mono text-[8px] text-arb-blue transition-colors hover:text-arb-cyan"
        >
          {copied ? '✓ copied' : `${pair.mint.slice(0, 6)}…${pair.mint.slice(-4)}`}
        </button>
        <a
          href={dsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-arb-border2 bg-arb-bg3 px-1.5 py-0.5 font-mono text-[8px] text-arb-purple no-underline transition-colors hover:text-arb-purple/80"
        >
          🔗 DS
        </a>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-arb-border2 bg-arb-bg3 px-1.5 py-0.5 font-mono text-[8px] text-arb-muted no-underline transition-colors hover:text-arb-blue"
        >
          🔍 {isBsc ? 'BSCscan' : 'Solscan'}
        </a>
      </div>
    </div>
  );
}

const MiniStat = forwardRef<HTMLDivElement, MiniStatProps>(({ label, value, cls = 'text-arb-head' }, ref) => {
  return (
    <div ref={ref} className="rounded bg-arb-bg3 p-1 px-1.5">
      <div className="text-[7px] uppercase tracking-wider text-arb-muted">{label}</div>
      <div className={`mt-0.5 truncate text-[10px] font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
});

MiniStat.displayName = 'MiniStat';
