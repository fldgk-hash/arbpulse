import { corsHeaders } from '@supabase/supabase-js/cors';

interface ReqBody {
  kind: 'liquidations' | 'wallets';
  symbol?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body: ReqBody = await req.json();
    if (body.kind === 'liquidations') {
      const key = Deno.env.get('COINGLASS_API_KEY');
      if (!key) return json({ missingKey: true, kind: 'COINGLASS_API_KEY' });
      const symbol = (body.symbol || 'BTC').toUpperCase();
      // Coinglass v2 liquidation orders endpoint
      const url = `https://open-api.coinglass.com/public/v2/liquidation_orders?symbol=${symbol}&time_type=h1`;
      const r = await fetch(url, { headers: { 'coinglassSecret': key } });
      if (!r.ok) return json({ entries: [], error: `coinglass ${r.status}` });
      const data = await r.json().catch(() => ({}));
      const list = data?.data || data?.list || [];
      const entries = (Array.isArray(list) ? list : []).slice(0, 50).map((e: any) => ({
        ts: e.createTime || e.time || Date.now(),
        side: (e.side || '').toLowerCase().includes('long') || e.side === 1 ? 'long' : 'short',
        amountUsd: Number(e.usdAmount || e.volUsd || e.amount || 0),
        symbol: e.symbol || symbol,
      })).filter((e: any) => e.amountUsd > 0);
      return json({ entries });
    }

    if (body.kind === 'wallets') {
      const key = Deno.env.get('ETHERSCAN_API_KEY');
      if (!key) return json({ missingKey: true, kind: 'ETHERSCAN_API_KEY' });
      // Pull recent token transfers for WBTC contract as a behavior signal source
      // Users can later supply their own watchlist; for v1 we surface large unique addresses
      const wbtc = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
      const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${wbtc}&page=1&offset=100&sort=desc&apikey=${key}`;
      const r = await fetch(url);
      const data = await r.json().catch(() => ({}));
      const txs: any[] = Array.isArray(data?.result) ? data.result : [];
      // group by address, sum movements, score by frequency * avg size
      const map = new Map<string, { score: number; trades: number; lastTs: number; lastKind: 'buy' | 'sell' }>();
      for (const t of txs) {
        const addr = (t.to || '').toLowerCase();
        if (!addr) continue;
        const value = Number(t.value || 0) / 1e8; // WBTC has 8 decimals
        if (value < 0.5) continue;
        const ts = Number(t.timeStamp || 0) * 1000;
        const cur = map.get(addr) || { score: 0, trades: 0, lastTs: 0, lastKind: 'buy' as const };
        cur.score += Math.log10(value + 1) * 2;
        cur.trades += 1;
        if (ts > cur.lastTs) { cur.lastTs = ts; cur.lastKind = 'buy'; }
        map.set(addr, cur);
      }
      const wallets = [...map.entries()]
        .map(([address, v]) => ({
          address,
          score: Number(v.score.toFixed(2)),
          trades: v.trades,
          label: v.score > 8 && v.trades >= 3 ? 'smart_money' : 'tracking',
          lastAction: v.lastTs ? { ts: v.lastTs, kind: v.lastKind, symbol: 'WBTC' } : undefined,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
      return json({ wallets });
    }

    return json({ error: 'unknown kind' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
