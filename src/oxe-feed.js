import { buildOxeDognetDeeplink, getOxeMarket, validateOxeProductUrl } from "./oxe-affiliate.js";

const VERIFIED_POWER_STATIONS = Object.freeze([
  Object.freeze({
    pattern: /\bS200\b/i,
    specs: Object.freeze({ capacityWh: 193, powerW: 200, solarInputW: 50, dcOutputA: 8, pureSine: true }),
    evidenceUrl: "https://www.oxepower.eu/oxe-powerstation-s200-and-solar-panel-sp100w/",
  }),
  Object.freeze({
    pattern: /\bS400\b/i,
    specs: Object.freeze({ capacityWh: 385.56, powerW: 400, solarInputW: 90, dcOutputA: 8, pureSine: true }),
    evidenceUrl: "https://www.oxepower.pl/oxe-powerstation-s400-wielofunkcyjny-generator-ladujacy-400w386wh-torba/",
  }),
  Object.freeze({
    pattern: /\bP600\b/i,
    specs: Object.freeze({ capacityWh: 578, powerW: 600, solarInputW: 100, dcOutputA: 10, pureSine: true }),
    evidenceUrl: "https://www.oxepower.eu/oxe-powerstation-p600-and-solar-panel-sp100w-bag/",
  }),
  Object.freeze({
    pattern: /\bMP500S\b/i,
    specs: Object.freeze({ capacityWh: 519, powerW: 500, solarInputW: null, dcOutputA: 8, pureSine: true }),
    evidenceUrl: "https://www.oxepower.pl/oxe-powerstation-mp500s-wielofunkcyjna-stacja-ladowalna-500w519wh/",
  }),
  Object.freeze({
    pattern: /\bS1000\b/i,
    specs: Object.freeze({ capacityWh: 1028, powerW: 1000, solarInputW: null, dcOutputA: 10, pureSine: null }),
    evidenceUrl: "https://www.oxe.ro/oxe-powerstation-s1000-generator-de-incarcare-multifunctional/",
  }),
]);

export function parseOxeGoogleFeed(xml, market) {
  const config = getOxeMarket(market);
  const blocks = [...String(xml || "").matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
  return blocks.flatMap((block) => {
    const raw = {
      id: tag(block, "g:id") || tag(block, "id"),
      name: tag(block, "g:title") || tag(block, "title"),
      description: tag(block, "g:description") || tag(block, "description"),
      url: tag(block, "g:link") || tag(block, "link"),
      imageUrl: tag(block, "g:image_link"),
      price: tag(block, "g:price"),
      brand: tag(block, "g:brand"),
      productType: tag(block, "g:product_type"),
      availability: tag(block, "g:availability"),
    };
    if (!raw.name || !raw.url || !/\bOXE\b/i.test(`${raw.name} ${raw.brand}`)) return [];
    try {
      return [normalizeOxeProduct(raw, config, market)];
    } catch {
      return [];
    }
  });
}

export function isOxeTechnicallyCompletePowerStation(product) {
  const specs = product?.specs || {};
  return product?.category === "power_station"
    && Boolean(product.verifiedAt)
    && specs.capacityWh > 0
    && specs.powerW > 0
    && specs.solarInputW > 0
    && specs.dcOutputA > 0
    && specs.pureSine === true;
}

function normalizeOxeProduct(raw, config, market) {
  const productUrl = validateOxeProductUrl(market, raw.url);
  const name = cleanText(raw.name);
  const description = cleanText(raw.description);
  const station = /power\s*station|powerstation|elektrocentr|stacja\s+zasilania|generator\s+de\s+incarcare|polniln/i.test(`${name} ${raw.productType}`)
    ? VERIFIED_POWER_STATIONS.find((entry) => entry.pattern.test(name))
    : null;
  const solarWatts = extractSolarPanelWatts(name, raw.productType);
  const category = station ? "power_station" : solarWatts ? "solar_panel" : "other";
  const specs = station
    ? station.specs
    : solarWatts
      ? Object.freeze({ capacityWh: null, powerW: solarWatts, solarInputW: null, dcOutputA: null, pureSine: null })
      : Object.freeze({ capacityWh: null, powerW: null, solarInputW: null, dcOutputA: null, pureSine: null });
  const verifiedAt = station || solarWatts ? "2026-08-31" : null;

  return {
    id: `${config.merchant}:${String(raw.id || new URL(productUrl).pathname).trim()}`,
    merchant: config.merchant,
    name,
    description,
    categoryPath: cleanText(raw.productType),
    category,
    brand: cleanText(raw.brand) || "OXE",
    priceCzk: parsePrice(raw.price),
    priceCurrency: parseCurrency(raw.price) || config.currency,
    available: parseAvailability(raw.availability),
    productUrl,
    affiliateUrl: buildOxeDognetDeeplink(market, productUrl),
    imageUrl: normalizeImage(raw.imageUrl),
    verifiedAt,
    specEvidenceUrl: station?.evidenceUrl || null,
    specs: { ...specs },
  };
}

function extractSolarPanelWatts(name, categoryPath) {
  const text = `${name} ${categoryPath}`;
  if (!/solar|solarn|solár|słonecz|napelem|panou/i.test(text)) return null;
  const model = text.match(/\bSP\s*([1-9]\d{1,3})W?\b/i);
  if (model) return Number(model[1]);
  const watts = text.match(/\b([1-9]\d{1,3})\s*W\b/i);
  return watts ? Number(watts[1]) : null;
}

function tag(xml, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? decodeXml(stripCdata(match[1])).trim() : "";
}

function stripCdata(value) {
  return String(value || "").replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1");
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function cleanText(value) {
  return decodeXml(String(value || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function parsePrice(value) {
  const match = String(value || "").replace(/\s/g, "").match(/-?\d+(?:[.,]\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCurrency(value) {
  return String(value || "").toUpperCase().match(/\b(EUR|PLN|HUF)\b/)?.[1] || null;
}

function parseAvailability(value) {
  const normalized = String(value || "").toLowerCase().trim();
  if (/out[ _-]?of[ _-]?stock/.test(normalized)) return false;
  if (/in[ _-]?stock/.test(normalized)) return true;
  return null;
}

function normalizeImage(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}
