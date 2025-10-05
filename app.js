/* ---------- Helpers robustos ---------- */
const $  = (s,c=document)=>c.querySelector(s);
const $$ = (s,c=document)=>Array.from(c.querySelectorAll(s));
const fmt = (n, dmin=2, dmax=8) =>
  Number(n).toLocaleString("es-AR",{minimumFractionDigits:dmin, maximumFractionDigits:dmax});

async function fetchJSON(url, {timeout=10000} = {}){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), timeout);
  try{
    const r = await fetch(url, {signal: ctrl.signal, cache:"no-store"});
    clearTimeout(t);
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  }catch(e){
    clearTimeout(t);
    throw e;
  }
}

/* ---------- 1) DÓLAR: 6 cajas (DolarAPI) ---------- */
const DOLLARS = ["oficial","blue","tarjeta","mep","ccl","cripto"];

async function loadDollars(){
  await Promise.all(DOLLARS.map(async (k)=>{
    const el = document.querySelector(`.card[data-key="${k}"] .venta`);
    try{
      const j = await fetchJSON(`https://dolarapi.com/v1/dolares/${k}`);
      el.textContent = `$${fmt(j.venta,2,2)}`;
    }catch{
      el.textContent = "Error";
    }
  }));
}

/* ---------- 2) PARES /USDT (sin USDT/ARS) ---------- */
const PAIRS = [
  "BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT",
  "LTCUSDT","TRXUSDT","MATICUSDT","LINKUSDT","TONUSDT","OPUSDT","ARBUSDT"
];

function renderPairButtons(){
  const box = $("#pairButtons");
  box.innerHTML = PAIRS.map((p,i)=>`<button class="chip ${i===0?'active':''}" data-p="${p}">${p.replace("USDT","/USDT")}</button>`).join("");
  $$("#pairButtons .chip").forEach(b=>{
    b.addEventListener("click", ()=>{
      $$("#pairButtons .chip").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      loadSpot(b.dataset.p);
    });
  });
}

/* ---------- 3) EXCHANGES (adapters con CORS OK) ---------- */
/* Si alguno falla (CORS/ratelimit), lo ignoramos y mostramos los demás */
const EXS = [
  {
    name:"Binance",
    url: s => `https://api.binance.com/api/v3/ticker/bookTicker?symbol=${s}`,
    parse: j => ({ ask:+j.askPrice, bid:+j.bidPrice })
  },
  {
    name:"OKX",
    url: s => `https://www.okx.com/api/v5/market/ticker?instId=${s.replace("USDT","-USDT")}`,
    parse: j => {
      const d = j?.data?.[0] || {};
      return { ask:+d.askPx, bid:+d.bidPx };
    }
  },
  {
    name:"Bybit",
    url: s => `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${s}`,
    parse: j => {
      const d = j?.result?.list?.[0] || {};
      return { ask:+d.ask1Price, bid:+d.bid1Price };
    }
  },
  {
    name:"MEXC",
    url: s => `https://api.mexc.com/api/v3/ticker/bookTicker?symbol=${s}`,
    parse: j => ({ ask:+j.askPrice, bid:+j.bidPrice })
  },
  {
    name:"Bitget",
    url: s => `https://api.bitget.com/api/v2/spot/market/tickers?symbol=${s}`,
    parse: j => {
      const d = j?.data?.[0] || {};
      return { ask:+d.askPx, bid:+d.bidPx };
    }
  },
  {
    name:"KuCoin",
    url: s => `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${s.replace("USDT","-USDT")}`,
    parse: j => ({ ask:+j?.data?.bestAsk, bid:+j?.data?.bestBid })
  },
];

async function loadSpot(pair){
  const tbody = $("#tbl tbody");
  tbody.innerHTML = `<tr><td colspan="4">Cargando ${pair}…</td></tr>`;

  const rows = [];
  await Promise.all(EXS.map(async ex=>{
    try{
      const j = await fetchJSON(ex.url(pair), {timeout: 8000});
      const {ask, bid} = ex.parse(j) || {};
      if (Number.isFinite(ask) && Number.isFinite(bid)){
        rows.push({ ex: ex.name, pair, ask, bid });
      }
    }catch(_e){
      // ignore this exchange if it fails
    }
  }));

  if (!rows.length){
    tbody.innerHTML = `<tr><td colspan="4">Sin datos (posible CORS/ratelimit). Probá otro par.</td></tr>`;
    return;
  }

  // ordenar por mejor compra (ask más bajo)
  rows.sort((a,b)=>a.ask - b.ask);
  const bestAsk  = Math.min(...rows.map(r=>r.ask));
  const worstBid = Math.min(...rows.map(r=>r.bid)); // peor para vender

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.ex}</td>
      <td>${r.pair.replace("USDT","/USDT")}</td>
      <td class="${r.ask===bestAsk?'green':''}">$ ${fmt(r.ask,2,6)}</td>
      <td class="${r.bid===worstBid?'red':''}">$ ${fmt(r.bid,2,6)}</td>
    </tr>
  `).join("");
}

/* ---------- INIT ---------- */
(async function init(){
  renderPairButtons();
  await loadDollars();
  await loadSpot(PAIRS[0]);        // arranca en BTC/USDT
  setInterval(loadDollars, 60_000); // refresco dólares cada 60s
})();
