/* ========= UTILIDADES ========= */
const $ = (id) => document.getElementById(id);
const fmt = (n, dMin = 2, dMax = 8) =>
  Number(n).toLocaleString("es-AR", { minimumFractionDigits: dMin, maximumFractionDigits: dMax });
const fmtARS = (n) => fmt(n, 2, 2);

/* ========= DÓLARES (DolarAPI: CORS OK) ========= */
const dolarEndpoints = {
  oficial: "https://dolarapi.com/v1/dolares/oficial",
  blue: "https://dolarapi.com/v1/dolares/blue",
  tarjeta: "https://dolarapi.com/v1/dolares/tarjeta",
  mep: "https://dolarapi.com/v1/dolares/bolsa",
  ccl: "https://dolarapi.com/v1/dolares/contadoconliqui",
  cripto: "https://dolarapi.com/v1/dolares/cripto",
};

async function loadDolares() {
  for (const [key, url] of Object.entries(dolarEndpoints)) {
    try {
      $(key).textContent = "Cargando…";
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      $(key).innerHTML = `
        <span class="good">venta $ ${fmtARS(d.venta)}</span><br>
        <small>compra $ ${fmtARS(d.compra)}</small>
      `;
    } catch {
      $(key).textContent = "Error";
    }
  }
}
loadDolares();
setInterval(loadDolares, 60_000);

/* ========= EXCHANGES =========
   - USDT/ARS: referencia usando Dólar Cripto (no hay orderbook ARS en los exchanges globales).
   - BTC/USDT, ETH/USDT, SOL/USDT: bookTicker/level1 de varios exchanges con CORS habilitado.
*/

/* Adaptadores por exchange */
const exch = {
  BINANCE: async (symbol) => {
    // BTCUSDT / ETHUSDT / SOLUSDT
    const u = `https://api.binance.com/api/v3/ticker/bookTicker?symbol=${symbol}`;
    const r = await fetch(u, { cache: "no-store" });
    const j = await r.json();
    return { exchange: "Binance", pair: symbol, ask: +j.askPrice, bid: +j.bidPrice };
  },
  BYBIT: async (symbol) => {
    // v5 spot
    const u = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`;
    const r = await fetch(u, { cache: "no-store" });
    const j = await r.json();
    const x = j?.result?.list?.[0];
    return { exchange: "Bybit", pair: symbol, ask: +x.ask1Price, bid: +x.bid1Price };
  },
  KUCOIN: async (symbol) => {
    // KuCoin usa guión: BTC-USDT
    const s = symbol.replace("USDT", "-USDT");
    const u = `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${s}`;
    const r = await fetch(u, { cache: "no-store" });
    const j = await r.json();
    const x = j?.data;
    return { exchange: "KuCoin", pair: symbol, ask: +x.bestAsk, bid: +x.bestBid };
  },
  // OKX suele bloquear CORS en algunos entornos. Si responde, suma:
  OKX: async (symbol) => {
    const s = symbol.replace("USDT", "-USDT");
    const u = `https://www.okx.com/api/v5/market/ticker?instId=${s}`;
    const r = await fetch(u, { cache: "no-store" });
    const j = await r.json();
    const x = j?.data?.[0];
    return { exchange: "OKX", pair: symbol, ask: +x.askPx, bid: +x.bidPx };
  },
};

/* UI: carga de tabla */
const tbody = $("tbody");
const buttons = document.querySelectorAll(".btn[data-pair]");
buttons.forEach((b) =>
  b.addEventListener("click", async () => {
    const pair = b.dataset.pair;
    await loadPair(pair);
    // marcar botón activo
    buttons.forEach((x) => (x.disabled = false));
    b.disabled = true;
  })
);

/* Cargar un par */
async function loadPair(pair) {
  tbody.innerHTML = `<tr><td colspan="4">Cargando ${pair}…</td></tr>`;

  try {
    let rows = [];

    if (pair === "USDTARS") {
      // Referencia con dólar cripto (ARS por USD)
      const r = await fetch(dolarEndpoints.cripto, { cache: "no-store" });
      const d = await r.json();
      rows = [
        {
          exchange: "Referencia ARS",
          pair: "USDT/ARS",
          ask: +d.venta, // comprar 1 USDT ~ 1 USD
          bid: +d.compra,
        },
      ];
    } else {
      // Spot en varios exchanges
      const fetchers = [exch.BINANCE, exch.BYBIT, exch.KUCOIN, exch.OKX];
      const settled = await Promise.allSettled(fetchers.map((f) => f(pair)));
      rows = settled
        .filter((s) => s.status === "fulfilled" && isFinite(s.value.ask) && isFinite(s.value.bid))
        .map((s) => s.value);
      if (!rows.length) throw new Error("Sin datos (CORS o red).");
    }

    // Orden: mejor compra (ask más bajo) → más caro
    rows.sort((a, b) => a.ask - b.ask);

    // Encontrar mejor y peor
    const minAsk = Math.min(...rows.map((r) => r.ask));
    const minBid = Math.min(...rows.map((r) => r.bid)); // peor venta = bid más bajo

    // Render
    tbody.innerHTML = rows
      .map((r) => {
        const askCls = r.ask === minAsk ? "good" : "";
        const bidCls = r.bid === minBid ? "bad" : "";
        return `<tr>
          <td>${r.exchange}</td>
          <td>${r.pair}</td>
          <td class="${askCls}">$ ${fmt(r.ask, 2, 6)}</td>
          <td class="${bidCls}">$ ${fmt(r.bid, 2, 6)}</td>
        </tr>`;
      })
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="4" class="muted">Error cargando ${pair}</td></tr>`;
  }
}
