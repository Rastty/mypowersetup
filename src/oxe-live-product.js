// OXE's country feeds can advertise stock, stale prices and discontinued URLs.
// Prove only the exact product page's purchase table, never unrelated cards.
const MARKETS = Object.freeze({
  ro: Object.freeze({ stock: /^(?:în|in) stoc$/i, outOfStock: /^nu este (?:în|in) stoc$/i, unit: /^(?:Lei|RON)$/i, decimals: 2 }),
  sk: Object.freeze({ stock: /^skladom$/i, outOfStock: /^nie je skladom$/i, unit: /^(?:€|EUR)$/i, decimals: 2 }),
  pl: Object.freeze({ stock: /^w magazynie$/i, outOfStock: /^brak na stanie$/i, unit: /^(?:zł|PLN)$/i, decimals: 2 }),
  hu: Object.freeze({ stock: /^raktáron$/i, outOfStock: /^nincs raktáron$/i, unit: /^(?:Ft|HUF)$/i, decimals: 0 }),
  si: Object.freeze({ stock: /^na zalogi$/i, outOfStock: /^ni na zalogi$/i, unit: /^(?:€|EUR)$/i, decimals: 2 }),
});

export function parseOxeLiveOffer(html, market) {
  const config = MARKETS[String(market || "").toLowerCase()];
  if (!config) throw new Error("OXE_LIVE_MARKET_UNSUPPORTED");
  const table = String(html || "").match(/<table\b[^>]*\bclass\s*=\s*["'][^"']*\bcislaTab\b[^"']*["'][^>]*>[\s\S]*?<\/table>/i)?.[0];
  if (!table) return Object.freeze({ available: false, price: null, evidence: "purchase_table_missing" });

  const stock = (table.match(/<span\b[^>]*>\s*([^<]+)\s*<\/span>/i)?.[1] || "").trim().replace(/\s+/g, " ");
  const available = config.stock.test(stock);
  const priceCell = table.match(/<tr\b[^>]*\bclass\s*=\s*["']cena["'][^>]*>\s*<td\b[^>]*>\s*([^<]+)<\/td>/i)?.[1] || "";
  const price = parseMarketPrice(priceCell, config);

  return Object.freeze({
    available,
    price,
    evidence: !config.stock.test(stock) && !config.outOfStock.test(stock)
      ? "stock_unverified"
      : price === null ? "price_unverified" : available ? "live_in_stock" : "live_out_of_stock",
  });
}

function parseMarketPrice(value, config) {
  const text = String(value || "").replace(/\u00a0/g, " ").trim();
  const match = text.match(/^([\d\s.,]+)\s*([^\d\s.,]+)$/u);
  if (!match || !config.unit.test(match[2])) return null;
  const raw = match[1].trim();
  let normalized;
  if (config.decimals === 2) {
    if (!/^\d{1,3}(?:[ .]\d{3})*,\d{2}$|^\d+,\d{2}$|^\d+\.\d{2}$/.test(raw)) return null;
    normalized = raw.includes(",") ? raw.replace(/[ .]/g, "").replace(",", ".") : raw;
  } else {
    if (!/^\d{1,3}(?:[ .]\d{3})*$|^\d+$/.test(raw)) return null;
    normalized = raw.replace(/[ .]/g, "");
  }
  const price = Number(normalized);
  return Number.isFinite(price) && price > 0 ? price : null;
}
