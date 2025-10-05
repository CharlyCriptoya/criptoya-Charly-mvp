const $ = (s,c=document)=>c.querySelector(s);
const $$ = (s,c=document)=>Array.from(c.querySelectorAll(s));
const fmt = n => Number(n).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2});

/* ===== DÓLAR ===== */
const DOLLARS = ["oficial","blue","tarjeta","mep","ccl","cripto"];
async function loadDollars(){
  for(const k of DOLLARS){
    try{
      const r = await fetch(`https://dolarapi.com/v1/dolares/${k}`,{cache:"no-store"});
      const j = await r.json();
      const el = document.querySelector(`.card[data-key="${k}"] .venta`);
      el.textContent = `$${fmt(j.venta)}`;
    }catch{
      document.querySelector(`.card[data-key="${k}"] .venta`).textContent="Error";
    }
  }
}

/* ===== EXCHANGES (pares /USDT) ===== */
const PAIRS = ["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","LTCUSDT","TRXUSDT","MATICUSDT","LINKUSDT","TONUSDT"];

function renderButtons(){
  const box=$("#pairButtons");
  box.innerHTML=PAIRS.map((p,i)=>`<button class="chip ${i==0?'active':''}" data-p="${p}">${p.replace("USDT","/USDT")}</button>`).join("");
  $$("#pairButtons .chip").forEach(b=>b.onclick=()=>{
    $$("#pairButtons .chip").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    loadSpot(b.dataset.p);
  });
}

/* APIs que no bloquean CORS */
const EXCHANGES=[
  {name:"Binance",url:s=>`https://api.binance.com/api/v3/ticker/bookTicker?symbol=${s}`,parse:d=>({ask:+d.askPrice,bid:+d.bidPrice})},
  {name:"OKX",url:s=>`https://www.okx.com/api/v5/market/ticker?instId=${s.replace("USDT","-USDT")}`,parse:d=>{const x=d.data?.[0];return{ask:+x.askPx,bid:+x.bidPx}}},
  {name:"Bybit",url:s=>`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${s}`,parse:d=>{const x=d.result?.list?.[0];return{ask:+x.ask1Price,bid:+x.bid1Price}}},
  {name:"KuCoin",url:s=>`https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${s.replace("USDT","-USDT")}`,parse:d=>({ask:+d.data.bestAsk,bid:+d.data.bestBid})},
  {name:"Bitget",url:s=>`https://api.bitget.com/api/v2/spot/market/tickers?symbol=${s}`,parse:d=>{const x=d.data?.[0];return{ask:+x.askPx,bid:+x.bidPx}}},
  {name:"MEXC",url:s=>`https://api.mexc.com/api/v3/ticker/bookTicker?symbol=${s}`,parse:d=>({ask:+d.askPrice,bid:+d.bidPrice})},
];

async function loadSpot(pair){
  const tbody=$("#tbl tbody");
  tbody.innerHTML=`<tr><td colspan="4">Cargando ${pair}...</td></tr>`;
  const rows=[];
  for(const ex of EXCHANGES){
    try{
      const r=await fetch(ex.url(pair),{cache:"no-store"});
      const j=await r.json();
      const {ask,bid}=ex.parse(j);
      if(ask&&bid)rows.push({ex:ex.name,pair,ask,bid});
    }catch{}
  }
  if(!rows.length){tbody.innerHTML=`<tr><td colspan="4">Sin datos.</td></tr>`;return;}
  rows.sort((a,b)=>a.ask-b.ask);
  const best=Math.min(...rows.map(r=>r.ask));
  const worst=Math.min(...rows.map(r=>r.bid));
  tbody.innerHTML=rows.map(r=>`
    <tr>
      <td>${r.ex}</td>
      <td>${r.pair.replace("USDT","/USDT")}</td>
      <td class="${r.ask===best?'green':''}">$${fmt(r.ask)}</td>
      <td class="${r.bid===worst?'red':''}">$${fmt(r.bid)}</td>
    </tr>`).join("");
}

/* ===== INIT ===== */
loadDollars();
renderButtons();
loadSpot(PAIRS[0]);
