// === API para cotizaciones del dólar (CriptoYa) ===
const dolarEndpoints = {
  oficial: "https://criptoya.com/api/dolar/oficial",
  tarjeta: "https://criptoya.com/api/dolar/tarjeta",
  blue: "https://criptoya.com/api/dolar/blue",
  mep: "https://criptoya.com/api/dolar/mep",
  ccl: "https://criptoya.com/api/dolar/ccl",
  cripto: "https://criptoya.com/api/dolar/cripto"
};

async function loadDolares() {
  for (const [key, url] of Object.entries(dolarEndpoints)) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      const precio = `$${data.venta.toLocaleString("es-AR", {
        minimumFractionDigits: 2
      })}`;
      document.getElementById(key).textContent = precio;
    } catch {
      document.getElementById(key).textContent = "Error";
    }
  }
}
loadDolares();
setInterval(loadDolares, 60000);

// === API para criptomonedas (Binance) ===
async function loadCrypto(symbol) {
  const table = document.getElementById("crypto-table");
  table.innerHTML = "<tr><td colspan='3'>Cargando...</td></tr>";

  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`
    );
    const data = await res.json();
    const html = `
      <tr>
        <td>Binance</td>
        <td>${symbol}/USDT</td>
        <td>$${parseFloat(data.price).toFixed(2)}</td>
      </tr>`;
    table.innerHTML = html;
  } catch {
    table.innerHTML = "<tr><td colspan='3'>Error cargando datos</td></tr>";
  }
}
