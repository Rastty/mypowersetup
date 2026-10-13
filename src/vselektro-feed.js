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
  "/solarni-regulator-victron-energy-mppt-smartsolar-100v-20a/": Object.freeze({
    id: "victron-smartsolar-100-20", category: "controller", brand: "victron",
    currentA: 20, maxPvVocV: 100, maxPvIscA: 20,
    systemVoltagesV: [12,24,48], maxPvWattsBySystemVoltage: {12:290,24:580,48:1160},
    model: /100\s*v\s*[/ -]\s*20\s*a|100\s*[/ -]\s*20\b/i,
  }),
  "/solarni-regulator-victron-energy-smartsolar-30a/": Object.freeze({
    id: "victron-smartsolar-100-30", category: "controller", brand: "victron",
    currentA: 30, maxPvVocV: 100, maxPvIscA: 35,
    systemVoltagesV: [12,24], maxPvWattsBySystemVoltage: {12:440,24:880},
    model: /100\s*v\s*[/ -]\s*30\s*a|100\s*[/ -]\s*30\b/i,
  }),
  "/solarni-regulator-victron-energy-mppt-smartsolar-100v-50a/": Object.freeze({
    id: "victron-smartsolar-100-50", category: "controller", brand: "victron",
    currentA: 50, maxPvVocV: 100, maxPvIscA: 35,
    systemVoltagesV: [12,24], maxPvWattsBySystemVoltage: {12:700,24:1400},
    model: /100\s*v\s*[/ -]\s*50\s*a|100\s*[/ -]\s*50\b/i,
  }),
  "/solarni-regulator-sr-ml2430-30a/": Object.freeze({
    id: "srne-ml2430-30a", category: "controller", brand: "srne",
    currentA: 30, maxPvVocV: 100,
    systemVoltagesV: [12,24], maxPvWattsBySystemVoltage: {12:400,24:800},
    model: /(?:sr[ -]?ml2430|ml2430)/i,
  }),
  "/nabijecka-dc-dc-orion-tr-smart-12-12-18a/": Object.freeze({
    id:"victron-orion-tr-12-12-18-isolated", category:"dc_charger",
    currentA:18, model:/orion[-\s]*tr\s*smart/i, isolated:true,
  }),
  "/nabijecka-dc-dc-orion-tr-smart-12-12-30a/": Object.freeze({
    id:"victron-orion-tr-12-12-30-isolated", category:"dc_charger",
    currentA:30, model:/orion[-\s]*tr\s*smart/i, isolated:true,
  }),
  "/nabijecka-dc-dc-orion-tr-smart-12-12-30a-neizolovana/": Object.freeze({
    id:"victron-orion-tr-12-12-30-nonisolated", category:"dc_charger",
    currentA:30, model:/orion[-\s]*tr\s*smart/i, isolated:false,
  }),
  "/nabijecka-dc-dc-orion-xs-smart-12-12-50a-neizolovana/": Object.freeze({
    id:"victron-orion-xs-12-12-50-nonisolated", category:"dc_charger",
    currentA:50, model:/orion[-\s]*xs\s*smart/i, isolated:false,
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
 * Fail closed: independently verified LiFePO4 batteries and MPPT controllers only.
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
    const title = item.name;
    if (/(?:startovac|autobateri|motobateri|ups|solar[nní]* sestava|hybrid|set|kit|souprav|sestav)/i.test(title)) continue;
    if (verified.category === "controller") {
      // SKU exact path and independent model/spec sheet must both agree.
      // A DC/DC converter is NOT a battery charger and may not enter here.
      if (!/\bmppt\b/i.test(title) || !/regulátor|regulator|controller/i.test(title)
        || !new RegExp(verified.brand, "i").test(title) || !verified.model.test(title)) continue;
      if (item.specs.currentA && item.specs.currentA !== verified.currentA) continue;
      result.push(Object.freeze({
        ...item,
        id: "vselektro:" + verified.id,
        category: "controller",
        verifiedAt: "2026-10-13",
        specs: Object.freeze({
          ...item.specs,
          currentA: verified.currentA,
          maxPvVocV: verified.maxPvVocV,
          ...(verified.maxPvIscA ? { maxPvIscA: verified.maxPvIscA } : {}),
          systemVoltagesV: [...verified.systemVoltagesV],
          maxPvWattsBySystemVoltage: { ...verified.maxPvWattsBySystemVoltage },
        }),
      }));
      continue;
    }
    if (verified.category === "dc_charger") {
      // DC/DC voltage converters are NOT chargers; require an exact Victron
      // Orion Smart charger model and matching 12V input/output plus isolation.
      const modelRating = new RegExp("12\\s*[-/]\\s*12\\s*[/]\\s*" + verified.currentA + "\\s*a\\b", "i");
      if (!/nabíječ|nabijec|nabijeck|charger/i.test(title)
        || !/dc\s*[-–]?\s*dc/i.test(title)
        || !/victron/i.test(title + " " + item.description + " " + item.brand)
        || !verified.model.test(title) || !modelRating.test(title)
        || !/izolovan/i.test(title)
        || /neizolovan/i.test(title) === verified.isolated) continue;
      if (item.specs.currentA && item.specs.currentA !== verified.currentA) continue;
      result.push(Object.freeze({
        ...item,
        id: "vselektro:" + verified.id,
        category: "dc_charger",
        verifiedAt: "2026-10-13",
        specs: Object.freeze({
          ...item.specs,
          currentA: verified.currentA,
          chargingVoltagesV: [12],
          chargingInputVoltagesV: [12],
          chargingBatteryTypes: ["lifepo4","lead"],
          smartAlternatorCompatible: true,
          isolated: verified.isolated,
        }),
      }));
      continue;
    }
    if (!/sunstone/i.test(title)
      || !/lifepo4|lithium[\s-]*iron/i.test(title + " " + item.description)
      || !/bateri|akumulátor|akumulator/i.test(title)) continue;
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
