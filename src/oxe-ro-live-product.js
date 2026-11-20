// OXE Romania's Dognet feed can lag the live offer. Only the product's own
// purchase table proves availability and the public sale price; sidebar
// recommendations and a redirected shop homepage are not evidence.
export function parseOxeRomaniaLiveOffer(html) {
  const source = String(html || "");
  const table = source.match(/<table\b[^>]*\bclass\s*=\s*["'][^"']*\bcislaTab\b[^"']*["'][^>]*>[\s\S]*?<\/table>/i)?.[0];
  if (!table) return Object.freeze({ available: false, price: null, evidence: "purchase_table_missing" });

  const stock = table.match(/<span\b[^>]*>\s*(nu este\s+(?:în|in)\s+stoc|(?:în|in)\s+stoc)\s*<\/span>/i)?.[1] || "";
  const available = /^(?:în|in)\s+stoc$/i.test(stock.trim());
  const priceCell = table.match(/<tr\b[^>]*\bclass\s*=\s*["']cena["'][^>]*>\s*<td\b[^>]*>\s*([^<]+)<\/td>/i)?.[1] || "";
  const price = parseRomanianLei(priceCell);

  return Object.freeze({
    available,
    price,
    evidence: !stock ? "stock_unverified" : price === null ? "price_unverified" : available ? "live_in_stock" : "live_out_of_stock",
  });
}

function parseRomanianLei(value) {
  const text = String(value || "").replace(/\u00a0/g, " ").trim();
  const match = text.match(/^([1-9]\d{0,2}(?:[ .]\d{3})*|[1-9]\d*),(\d{2})\s*(?:Lei|RON)$/i);
  if (!match) return null;
  const price = Number(`${match[1].replace(/[ .]/g, "")}.${match[2]}`);
  return Number.isFinite(price) && price > 0 ? price : null;
}
