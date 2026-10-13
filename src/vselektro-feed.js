import { parseProductFeed } from "./feed.js";

// Product identity and electrical safety were checked independently of the
// merchant feed. The feed is used only for live product URL, price and stock.
// Do not widen this list based solely on automated name/category classification.
const VERIFIED = Object.freeze({
  "/lifepo4-baterie-12v-100ah-sunstone-power-slpo12-100n/": Object.freeze({
    id: "sunstone-slpo12-100n", voltageV: 12, capacityAh: 100, bmsContinuousCurrentA: 100,
  }),
  "/lifepo4-baterie-12v-200ah-slpo12-200n-hc200a-sunstone-power/": Object.freeze({
    id: "sunstone-slpo12-200n", voltageV: 12, capacityAh: 200, bmsContinuousCurrentA: 200,
  }),
  "/lifepo4-baterie-12v-150ah-slpo12-150n-hc150a-sunstone-power/": Object.freeze({
    id: "sunstone-slpo12-150n-hc150a", voltageV: 12, capacityAh: 150, bmsContinuousCurrentA: 150,
  }),
  "/lifepo4-baterie-12v-200ah-slpo12-200m-hc200a-sunstone-power/": Object.freeze({
    id: "sunstone-slpo12-200m-hc200a", voltageV: 12, capacityAh: 200, bmsContinuousCurrentA: 200,
    formFactor: "under_seat",
  }),
  "/lifepo4-baterie-12v-300ah-slpo12-300n-hc200a-sunstone-power/": Object.freeze({
    id: "sunstone-slpo12-300n-hc200a", voltageV: 12, capacityAh: 300, bmsContinuousCurrentA: 200,
  }),
});
export const VSELEKTRO_VERIFIED_PATHS = Object.freeze(Object.keys(VERIFIED));

function canonicalProductPath(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !["www.vselektro.eu", "vselektro.eu"].includes(url.hostname)
      || url.username || url.password || url.hash || url.search) return null;
    const path = url.pathname.endsWith("/") ? url.pathname : url.pathname + "/";
    return Object.hasOwn(VERIFIED, path) ? path : null;
  } catch {
    return null;
  }
}

/**
 * Fail closed: only independently verified 12 V LiFePO4 battery SKUs.
 * A live Heureka XML offer must include an exact merchant product page,
 * positive CZK price and affirmative stock signal. Never infer stock.
 */

// Heureka SHOPITEM DELIVERY_DATE=0 means physically in stock; positive
// integers represent delivery lead time. The general feed parser intentionally
// treats both as orderable, so VSelektro must check the original XML value to
// avoid claiming that made-to-order batteries are in stock. Absent or ambiguous
// delivery tags fail closed.
function readInStockPaths(xml) {
  const stock = new Map();
  for (const match of xml.matchAll(/<SHOPITEM\b[^>]*>([\s\S]*?)<\/SHOPITEM>/gi)) {
    const item = match[1];
    const rawUrl = item.match(/<URL(?:\s[^>]*)?>([\s\S]*?)<\/URL>/i)?.[1];
    if (!rawUrl) continue;
    const url = rawUrl.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1").trim().replaceAll("&amp;", "&");
    const path = canonicalProductPath(url);
    if (!path) continue;
    const rawDelivery = item.match(/<DELIVERY_DATE(?:\s[^>]*)?>([\s\S]*?)<\/DELIVERY_DATE>/i)?.[1] ?? "";
    // Shoptet can place XML tag values inside CDATA; the generic XML reader
    // already unwraps those, so apply the same rule here. A 1–N delivery
    // lead time is NOT the same as immediately available stock.
    const delivery = rawDelivery.trim()
      .replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1")
      .trim();
    if (stock.has(path)) stock.set(path, false); // duplicate source SKU
    else stock.set(path, delivery === "0" || /^skladem$/i.test(delivery));
  }
  return stock;
}

export function parseVselektroVerifiedFeed(xml) {
  if (typeof xml !== "string" || !/<SHOPITEM\b/i.test(xml)) return Object.freeze([]);
  const inStockPaths = readInStockPaths(xml);
  const parsed = parseProductFeed(xml, "vselektro");
  const byPath = new Map();
  const duplicates = new Set();
  for (const product of parsed) {
    const path = canonicalProductPath(product.productUrl);
    if (!path) continue;
    if (byPath.has(path)) duplicates.add(path);
    else byPath.set(path, product);
  }
  const result = [];
  for (const [path, item] of byPath) {
    if (duplicates.has(path) || inStockPaths.get(path) !== true) continue;
    const verified = VERIFIED[path];
    // Some merchant XMLs contain out-of-stock SKUs or no stock field.
    // Both must be excluded from public recommendations.
    if (item.available !== true || item.priceCurrency !== "CZK"
      || !(Number.isFinite(item.priceCzk) && item.priceCzk > 0 && item.priceCzk < 200000)) continue;
    if (!/sunstone/i.test(item.name)
      || !/lifepo4|lithium[\s-]*iron/i.test(item.name + " " + item.description)
      || !/bateri|akumulátor|akumulator/i.test(item.name)
      || /(?:startovac|autobateri|motobateri|ups|solar[nní]* sestava|hybrid|set|kit|souprav|sestav)/i.test(item.name)) continue;
    if (item.specs.capacityAh && item.specs.capacityAh !== verified.capacityAh) continue;
    if (item.specs.voltageV && item.specs.voltageV !== verified.voltageV) continue;
    result.push(Object.freeze({
      ...item,
      id: "vselektro:" + verified.id,
      category: "battery",
      verifiedAt: "2026-10-13",
      specs: Object.freeze({
        ...item.specs,
        voltageV: verified.voltageV,
        capacityAh: verified.capacityAh,
        batteryType: "lifepo4",
        bmsContinuousCurrentA: verified.bmsContinuousCurrentA,
        ...(verified.formFactor ? { formFactor: verified.formFactor } : {}),
      }),
    }));
  }
  return Object.freeze(result);
}
