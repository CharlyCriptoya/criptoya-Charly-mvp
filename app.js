/* ===== util ===== */
const $ = (s, c=document)=>c.querySelector(s);
const $$ = (s, c=document)=>Array.from(c.querySelectorAll(s));
const fmtARS = n => new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(+n);
const fmtUSD = n => "$ " + Number(n).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2});
const ago = iso => {
  const d = (Date.now()-new Date(iso).getTime())/1000;
  if (d<60) return `act: ${Math.floor(d)}s`;
  if (d<3600) return `act: ${Math.floor(d/60)}m`;
  return `act: ${Math.floor(d/3600)}h`;
};

/* ===== dólares (dolarapi.com) ===== */
const DOLLARS = ["oficial","tarjeta","blue","mep","ccl","cripto"];
async function loadDollars(){
  await Promise.all(DOLLARS.map(async key=>{
    const card = document.querySelector(`.card[data-key="${key}"]`);
    if(!card) return;
    const ventaEl = card.querySelector(".venta");
    const compraEl = card.querySelector(".compra");
    const agoEl = card.querySelector(".ago");
    try{
      const r = await fetch(`https://dolarapi.com/v1/dolares/${key}`);
      if(!r.ok) throw 0;
      const j = await r.json();
      ventaEl.textContent  = fmtARS(j.venta);
      compraEl.textContent = fmtARS(j.compra);
      agoEl.textContent = ago(j.fechaActualizacion || Date.now());
    }catch(e){
      ventaEl.textContent = compraEl.textContent = "Error";
      agoEl.textContent = "act: —";
    }
  }));
}

/* ===== spot exchanges =====
   (CORS-friendly públicos)
================================ */
const SPOT = [
  // nombre, adaptador de símbolo, url y lectura
  {
    name:"OKX",
    map:s=>s.replace("USDT","-USDT"),
    fetch: async(sym)=>{
      const r=await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${sym}`);
      const j=await r.json(); const d=j?.data?.[0]||{};
      return {ask:+d.askPx, bid:+d.bidPx};
    }
  },
  {
    name:"Binance",
    map:s=>s,
    fetch: async(sym)=>{
      const r=await fetch(`https://api.binance.com/api/v3/ticker/bookTicker?symbol=${sym}`);
      const d=await r.json();
      return {ask:+d.askPrice, bid:+d.bidPrice};
    }
  },
  {
    name:"Bybit",
    map:s=>s,
    fetch: async(sym)=>{
      const r=await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${sym}`);
      const j=await r.json(); const d=j?.result?.list?.[0]||{};
      return {ask:+d.ask1Price, bid:+d.bid1Price};
    }
  },
  {
    name:"MEXC",
    map:s=>s,
    fetch: async(sym)=>{
      const r=await fetch(`https://api.mexc.com/api/v3/ticker/bookTicker?symbol=${sym}`);
      const d=await r.json();
      return {ask:+d.askPrice, bid:+d.bidPrice};
    }
  },
  {
    name:"Bitget",
    map:s=>s.replace("USDT","USDT"), // igual
    fetch: async(sym)=>{
      const r=await fetch(`https://api.bitget.com/api/v2/spot/market/tickers?symbol=${sym}`);
      const j=await r.json(); const d=(j?.data||[])[0]||{};
      return {ask:+d.askPx, bid:+d.bidPx};
    }
  },
  {
    name:"KuCoin",
    map:s=>s.replace("USDT","-USDT"),
    fetch: async(sym)=>{
      const r=await fetch(`https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${sym}`);
      const j=await r.json(); const d=j?.data||{};
      return {ask:+d.bestAsk, bid:+d.bestBid};
    }
  }
];

async function loadSpot(pair){
  const tbody = $("#tbl tbody");
  tbody.innerHTML = `<tr><td colspan="4">Cargando…</td></tr>`;
  const rows = [];
  for(const ex of SPOT){
    try{
      const q = await ex.fetch(ex.map(pair));
      if(q.ask && q.bid) rows.push({ex:ex.name,pair,ask:q.ask,bid:q.bid});
    }catch(e){}
  }
  if(!rows.length){ tbody.innerHTML = `<tr><td colspan="4">Sin datos.</td></tr>`; return; }
  rows.sort((a,b)=>a.ask-b.ask);
  const bestAsk = Math.min(...rows.map(r=>r.ask));
  const worstBid = Math.min(...rows.map(r=>r.bid));
  tbody.innerHTML = rows.map(r=>`
    <tr>
      <td>${r.ex}</td>
      <td>${r.pair}</td>
      <td class="${r.ask===bestAsk?'green':''}">${fmtUSD(r.ask)}</td>
      <td class="${r.bid===worstBid?'red':''}">${fmtUSD(r.bid)}</td>
    </tr>`).join("");
}

/* ===== P2P USDT/ARS (CriptoYa) =====
   Devuelve una lista amplia ordenada por precio.
   Endpoint consolidado pensado para front-ends.
   Si tu navegador bloquea CORS, ver “proxy” al final.
===================================== */
async function loadP2P(){
  const tbody = $("#tbl tbody");
  tbody.innerHTML = `<tr><td colspan="4">Cargando P2P…</td></tr>`;

  try{
    // Endpoint agregado para obtener ranking de compra en ARS
    // USDT/ARS. Si tu hosting bloquea CORS, ver proxy abajo.
    const url = `https://criptoya.com/api/p2p/usdt/ars/buy`;
    const r = await fetch(url, {cache:"no-store"});
    const list = await r.json();

    // list: [{name, price, source, method}, ...]
    // Normalizo a la tabla
    const rows = list.map(it=>({
      ex: it.name || it.source || "—",
      pair: "USDT/ARS",
      ask: +it.price,
      bid: +it.price   // para P2P mostramos una sola columna
    })).filter(x=>x.ask>0);

    rows.sort((a,b)=>a.ask-b.ask);
    const bestAsk = Math.min(...rows.map(r=>r.ask));
    const worstBid = Math.min(...rows.map(r=>r.bid));

    $("#tbl thead").innerHTML = `
      <tr>
        <th>EXCHANGE / P2P</th>
        <th>PAR</th>
        <th>COMPRAR<br><small>ARS</small></th>
        <th>—</th>
      </tr>`;

    tbody.innerHTML = rows.map(r=>`
      <tr>
        <td>${r.ex}</td>
        <td>${r.pair}</td>
        <td class="${r.ask===bestAsk?'green':''}">${fmtARS(r.ask)}</td>
        <td class="${r.bid===worstBid?'red':''}"></td>
      </tr>`).join("");

  }catch(e){
    tbody.innerHTML = `<tr><td colspan="4">No se pudo leer P2P. Si hay CORS, activá el proxy (abajo).</td></tr>`;
    console.error(e);
  }
}

/* ===== UI ===== */
async function refresh(pair){
  // encabezado de tabla estándar
  $("#tbl thead").innerHTML = `
    <tr>
      <th>EXCHANGE</th>
      <th>PAR</th>
      <th>COMPRA<br><small>(ASK)</small></th>
      <th>VENTA<br><small>(BID)</small></th>
    </tr>`;
  if (pair === "USDTARS") await loadP2P();
  else await loadSpot(pair);
}

function init(){
  loadDollars();
  const chips = $$(".chip");
  chips.forEach(b=>b.addEventListener("click",()=>{
    chips.forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    refresh(b.dataset.pair);
  }));
  refresh("BTCUSDT"); // por defecto
}
init();
