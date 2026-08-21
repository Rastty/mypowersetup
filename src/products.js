const MERCHANTS = {
  reslshop: {
    hostname: "www.reslshop.cz",
    affiliateBaseUrl: "https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=c38e2d15"
  },
  svetkaravanu: {
    hostname: "www.svetkaravanu.cz",
    affiliateBaseUrl: "https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=38137ac4"
  }
};

export function normalizeProduct(raw, merchantKey) {
  const merchant = MERCHANTS[merchantKey];
  if (!merchant) throw new Error(`Neznámý obchod: ${merchantKey}`);

  const productUrl = validateProductUrl(raw.url, merchant.hostname);
  const name = cleanText(raw.name);
  const categoryPath = cleanText(raw.category);
  const description = cleanText(raw.description);
  const fallbackText = [categoryPath, description].filter(Boolean).join(" ");
  const specs = extractSpecs(name, fallbackText);
  if (/solární regulátory/i.test(categoryPath)) {
    specs.currentA = extractControllerCurrent(name, description);
  }

  return {
    id: `${merchantKey}:${String(raw.id || productUrl.pathname).trim()}`,
    merchant: merchantKey,
    name,
    description,
    categoryPath,
    category: classifyProduct({ name, categoryPath, specs }),
    brand: cleanText(raw.brand),
    priceCzk: parsePrice(raw.price),
    available: normalizeAvailability(raw.available),
    productUrl: productUrl.toString(),
    affiliateUrl: buildAffiliateUrl(merchantKey, productUrl.toString()),
    imageUrl: normalizeImageUrl(raw.imageUrl),
    specs
  };
}

export function buildAffiliateUrl(merchantKey, productUrl) {
  const merchant = MERCHANTS[merchantKey];
  if (!merchant) throw new Error(`Neznámý obchod: ${merchantKey}`);
  const destination = validateProductUrl(productUrl, merchant.hostname);
  const affiliateUrl = new URL(merchant.affiliateBaseUrl);
  affiliateUrl.searchParams.set("desturl", destination.toString());
  return affiliateUrl.toString();
}

export function extractSpecs(primaryText = "", fallbackText = "") {
  const primary = cleanText(primaryText);
  const fallback = cleanText(fallbackText);
  return {
    voltageV: extractNominalVoltage(primary) ?? extractNominalVoltage(fallback),
    capacityAh: matchNumber(primary, /(\d+(?:[.,]\d+)?)\s*ah\b/i)
      ?? matchNumber(fallback, /(\d+(?:[.,]\d+)?)\s*ah\b/i),
    powerW: extractContinuousPower(primary) ?? extractContinuousPower(fallback),
    currentA: matchNumber(primary, /(\d+(?:[.,]\d+)?)\s*a\b/i)
      ?? matchNumber(fallback, /(\d+(?:[.,]\d+)?)\s*a\b/i),
    batteryType: /lifepo4|lithium(?:-ion)?/i.test(`${primary} ${fallback}`)
      ? "lifepo4"
      : /\bagm\b|olov/i.test(`${primary} ${fallback}`)
        ? "lead"
        : null,
    pureSine: /čist(?:ý|á) sinus|pure sine/i.test(`${primary} ${fallback}`) ? true : null
  };
}

export function classifyProduct({ name = "", categoryPath = "", specs = {} } = {}) {
  const accessory = /\b(pouzdro|obal|box|držák|rámeček|kabel|konektor|svorka|displej|ukazatel|modul|adaptér|průchodka|spojler|ventil)\b/i;

  const isBattery =
    /\b(baterie|akumulátor|lifepo4|lithium|agm)\b/i.test(name) &&
    !/vodovod|sprch|spotřební baterie|příslušenství k bateriím/i.test(`${name} ${categoryPath}`) &&
    !accessory.test(name) &&
    specs.capacityAh > 0;
  if (isBattery) return "battery";

  const isSolarPanel =
    /\b(solární|fotovoltaický)\s+(?:skládací\s+|přenosný\s+)?panel\b/i.test(name) &&
    !accessory.test(name) &&
    specs.powerW > 0;
  if (isSolarPanel) return "solar_panel";

  const isInverter =
    /měniče napětí/i.test(categoryPath) &&
    /(měnič|invertor|inverter)/i.test(name) &&
    !accessory.test(name) &&
    specs.powerW > 0;
  if (isInverter) return "inverter";

  const isController =
    /solární regulátory/i.test(categoryPath) &&
    /\b(regulátor|mppt)\b/i.test(name) &&
    !accessory.test(name) &&
    specs.currentA > 0;
  if (isController) return "controller";

  return "other";
}

export function recommendProducts(products, setup, limitPerCategory = 3) {
  const candidates = products
    .filter((product) => product.available !== false)
    .map((product) => scoreProduct(product, setup))
    .filter(Boolean);

  return ["battery", "solar_panel", "inverter", "controller"].reduce((result, category) => {
    const ranked = candidates
      .filter((candidate) => candidate.product.category === category)
      .sort((a, b) => b.score - a.score || a.product.priceCzk - b.product.priceCzk);
    result[category] = uniqueProductPages(ranked).slice(0, limitPerCategory);
    return result;
  }, {});
}

function scoreProduct(product, setup) {
  const { specs } = product;
  if (!product.category || product.category === "other") return null;
  if (specs.voltageV && specs.voltageV !== setup.systemVoltage) return null;

  let fit = null;
  if (product.category === "battery") {
    if (!specs.voltageV) return null;
    if (!specs.capacityAh || specs.capacityAh < setup.batteryAh * 0.8) return null;
    if (specs.batteryType && setup.batteryType && specs.batteryType !== setup.batteryType) return null;
    fit = specs.capacityAh / setup.batteryAh;
  }
  if (product.category === "solar_panel") {
    if (!specs.powerW) return null;
    const quantity = Math.max(1, Math.ceil(setup.solarWatts / specs.powerW));
    fit = (specs.powerW * quantity) / setup.solarWatts;
    product = { ...product, recommendedQuantity: quantity };
  }
  if (product.category === "inverter") {
    if (!specs.voltageV) return null;
    if (!setup.inverterWatts || !specs.powerW || specs.powerW < setup.inverterWatts) return null;
    fit = specs.powerW / setup.inverterWatts;
  }
  if (product.category === "controller") {
    if (!specs.currentA || specs.currentA < setup.controllerAmps) return null;
    fit = specs.currentA / setup.controllerAmps;
  }

  if (!fit || fit > 3) return null;
  const completeness = Object.values(specs).filter((value) => value !== null).length;
  const fitScore = Math.max(0, 70 - Math.abs(1 - fit) * 35);
  const availabilityScore = product.available === true ? 15 : 5;
  const completenessScore = Math.min(15, completeness * 3);

  return {
    product,
    score: Math.round(fitScore + availabilityScore + completenessScore),
    reason: recommendationReason(product, setup)
  };
}

function uniqueProductPages(candidates) {
  const seen = new Set();
  return candidates.filter(({ product }) => {
    if (seen.has(product.productUrl)) return false;
    seen.add(product.productUrl);
    return true;
  });
}

function recommendationReason(product, setup) {
  if (product.category === "battery") return `${product.specs.capacityAh} Ah pro ${setup.systemVoltage}V systém`;
  if (product.category === "solar_panel") return `${product.recommendedQuantity}× ${product.specs.powerW} Wp`;
  if (product.category === "inverter") return `${product.specs.powerW} W pro požadavek ${setup.inverterWatts} W`;
  return `${product.specs.currentA} A pro požadavek ${setup.controllerAmps} A`;
}

function validateProductUrl(value, hostname) {
  const url = new URL(value);
  const allowedHosts = new Set([hostname, hostname.replace(/^www\./, "")]);
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname)) {
    throw new Error(`Neplatná produktová URL pro ${hostname}`);
  }
  if (url.pathname === "/" || url.pathname === "") {
    throw new Error("Affiliate odkaz nesmí směřovat na homepage.");
  }
  url.hash = "";
  return url;
}

function normalizeImageUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizeAvailability(value) {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined || value === "") return null;
  return /skladem|in stock|true|^0$|^1$/i.test(String(value));
}

function parsePrice(value) {
  const normalized = String(value ?? "").replace(/[^\d,.-]/g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function matchNumber(text, pattern) {
  const match = text.match(pattern);
  if (!match) return null;
  const parsed = parseLocalizedNumber(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractContinuousPower(text) {
  const continuousAndPeak = text.match(/(?:stálý|trvalý|jmenovitý)[^\d]{0,30}\b(\d+(?:[ \u00a0]\d{3})*(?:[.,]\d+)?)\s*\/\s*\d+(?:[ \u00a0]\d{3})*(?:[.,]\d+)?\s*w\b/i);
  if (continuousAndPeak) return parseLocalizedNumber(continuousAndPeak[1]);
  return matchNumber(text, /\b(\d+(?:[ \u00a0]\d{3})*(?:[.,]\d+)?)\s*(?:w|wp)\b/i)
    ?? matchNumber(text, /\bwp\)?\s*(\d+(?:[.,]\d+)?)/i);
}

function extractNominalVoltage(text) {
  const measured = matchNumber(text, /(\d+(?:[.,]\d+)?)\s*v\b/i);
  if (!measured) return null;
  if (measured >= 10 && measured < 16) return 12;
  if (measured >= 20 && measured < 32) return 24;
  if (measured >= 32 && measured < 44) return 36;
  if (measured >= 44 && measured < 58) return 48;
  return null;
}

function extractControllerCurrent(name, description) {
  const explicitInName = matchNumber(name, /(\d+(?:[.,]\d+)?)\s*a\b/i);
  if (explicitInName) return explicitInName;

  const model = name.match(/(?:mppt|smartsolar|bluesolar)[^\n]{0,80}?\b\d{2,3}\s*[\/-]\s*(\d{1,3})\b/i);
  if (model) return parseLocalizedNumber(model[1]);

  return matchNumber(
    description,
    /(?:nabíjecí|výstupní|max(?:imální)?\.?)[^\d]{0,24}(\d+(?:[.,]\d+)?)\s*a\b/i
  );
}

function parseLocalizedNumber(value) {
  return Number(String(value).replace(/[ \u00a0]/g, "").replace(",", "."));
}

function cleanText(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
