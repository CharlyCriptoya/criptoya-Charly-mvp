// ===== CONFIG =====
const LOCALE = 'es-AR';
const CURRENCY = 'ARS';

// Endpoints: usá tu backend si lo tenés (recomendado por CORS y unificación).
// Fallbacks a servicios públicos (ajustá si tus endpoints son otros).
const ENDPOINTS = {
  dolares: '/api/dolares',                   // tu backend → {oficial, tarjeta, blue, mep, ccl, cripto}
  pares:    '/api/pares?symbol=',            // tu backend → devuelve array [{exchange, pair, buy, sell, ts}]
  // Ejemplos (si aún no tenés backend, reemplazá arriba por alguno público):
  // dolares: 'https://dolarapi.com/v1/dolares', // mapear en mapDolarapi()
  // pares:   'https://criptoya.com/api/p2p/usdt/ars/1' // (formato propio de CriptoYa)
};

const DOLAR_ORDER = [
  { key: 'oficial', label: 'DÓLAR OFICIAL' },
  { key: 'tarjeta', label: 'DÓLAR TARJETA' },
  { key: 'blue',    label: 'DÓLAR BLUE'    },
  { key: 'mep',     label: 'DÓLAR MEP'     },
  { key: 'ccl',     label: 'DÓLAR CCL'     },
  { key: 'cripto',  label: 'DÓLAR CRIPTO'  },
];

const REFRESH_MS = 30_000;

// ===== UTILS =====
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const fmtMoney = v =>
  new Intl.NumberFormat(LOCALE, { style:'currency', currency:CURRENCY, maximumFractionDigits:2 }).format(v);

const ago = ts => {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.round(diff/1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s/60);
  return `${m}m`;
};

async function fetchJSON(url, {timeout=10_000} = {}) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, {signal: ctrl.signal});
    clearTimeout(id);
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return await r.json();
  } catch (e) {
    throw new Error(`FetchError ${url}: ${e.message}`);
  }
}

// ===== DÓLARES =====
function renderDolarCards(data){
  const cont = $('#dolares');
  cont.innerHTML = '';
  DOLAR_ORDER.forEach(({key, label})=>{
    const d = data[key];
    const
