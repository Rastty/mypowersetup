const MERCHANTS = {
  reslshop: {
    hostname: "www.reslshop.cz",
    affiliateBaseUrl: "https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=c38e2d15"
  },
  svetkaravanu: {
    hostname: "www.svetkaravanu.cz",
    affiliateBaseUrl: "https://ehub.cz/system/scripts/click.php?a_aid=f34c86c8&a_bid=38137ac4"
  },
  padabo: {
    hostname: "www.padabo.sk",
    affiliateBaseUrl: null
  }
};

const PRODUCT_TEXT = {
  cs: {
    batteryReason: (setup) => `Kapacita splňuje požadovaných ${setup.batteryAh} Ah`,
    panelReason: (product, setup) => `${product.recommendedQuantity} ks pokryjí požadovaných ${setup.solarWatts} Wp`,
    inverterReason: (setup) => `Trvalý výkon splňuje požadovaných ${setup.inverterWatts} W`,
    controllerReason: (setup) => `Proud splňuje požadovaných ${setup.controllerAmps} A`,
    systemVoltage: "napětí sestavy",
    requirement: "Požadavek sestavy",
    batteryLead: "Olověná technologie",
    controllerFor: "Pro návrh panelů",
    verify: {
      battery: "Ověřte rozměry, BMS, nabíjecí proud a svorky.",
      solar_panel: "Ověřte rozměry, Voc, Isc a způsob zapojení panelů.",
      inverter: "Ověřte špičkový výkon, čistý sinus, kabeláž a vlastní spotřebu.",
      controller: "Ověřte maximální Voc, Isc, FV výkon a profil baterie v datasheetu."
    }
  },
  sk: {
    batteryReason: (setup) => `Kapacita spĺňa požadovaných ${setup.batteryAh} Ah`,
    panelReason: (product, setup) => `${product.recommendedQuantity} ks pokryje požadovaných ${setup.solarWatts} Wp`,
    inverterReason: (setup) => `Trvalý výkon spĺňa požadovaných ${setup.inverterWatts} W`,
    controllerReason: (setup) => `Prúd spĺňa požadovaných ${setup.controllerAmps} A`,
    systemVoltage: "napätie zostavy",
    requirement: "Požiadavka zostavy",
    batteryLead: "Olovená technológia",
    controllerFor: "Pre návrh panelov",
    verify: {
      battery: "Overte rozmery, BMS, nabíjací prúd a svorky.",
      solar_panel: "Overte rozmery, Voc, Isc a spôsob zapojenia panelov.",
      inverter: "Overte špičkový výkon, čistý sínus, kabeláž a vlastnú spotrebu.",
      controller: "Overte maximálne Voc, Isc, FV výkon a profil batérie v datasheete."
    }
  }
};

export function configureMerchantAffiliate(merchantKey, affiliateBaseUrl) {
  const merchant = MERCHANTS[merchantKey];
  if (!merchant) throw new Error(`Neznámý obchod: ${merchantKey}`);
  const url = new URL(affiliateBaseUrl);
  if (url.protocol !== "https:" || url.hostname !== "ehub.sk") {
    throw new Error("Affiliate odkaz musí být platná HTTPS adresa na eHub.sk.");
  }
  merchant.affiliateBaseUrl = url.toString();
}

export function normalizeProduct(raw, merchantKey) {
  const merchant = MERCHANTS[merchantKey];
  if (!merchant) throw new Error(`Neznámý obchod: ${merchantKey}`);

  const productUrl = validateProductUrl(raw.url, merchant.hostname);
  const name = cleanText(raw.name);
  const categoryPath = cleanText(raw.category);
  const description = cleanText(raw.description);
  const fallbackText = [categoryPath, description].filter(Boolean).join(" ");
  const specs = extractSpecs(name, fallbackText);
  if (/solární regulátory|solárne regulátory/i.test(categoryPath)) {
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
  if (!merchant.affiliateBaseUrl) {
    throw new Error(`Affiliate program pro ${merchantKey} ještě není nakonfigurován.`);
  }
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
    pureSine: /modifikovan(?:ý|á|ou) (?:sinus|sínus)/i.test(`${primary} ${fallback}`)
      ? false
      : /čist(?:ý|á) (?:sinus|sínus)|pure sine|(?:sinusov|sínusov)(?:ý|á) (?:měnič|menič)|sinepower/i.test(`${primary} ${fallback}`)
        ? true
        : null
  };
}

export function classifyProduct({ name = "", categoryPath = "", specs = {} } = {}) {
  const accessory = /\b(pouzdro|puzdro|obal|box|držák|držiak|rámeček|rámček|kabel|kábel|konektor|svorka|displej|ukazatel|modul|adaptér|průchodka|priechodka|spojler|ventil)\b/i;

  const isBattery =
    /\b(baterie|batéria|akumulátor|lifepo4|lithium|agm)\b/i.test(name) &&
    !/vodovod|sprch|spotřební baterie|vodovodná batéria|príslušenstvo k batériám|příslušenství k bateriím/i.test(`${name} ${categoryPath}`) &&
    !accessory.test(name) &&
    specs.capacityAh > 0;
  if (isBattery) return "battery";

  const isSolarPanel =
    /\b(solární|solárny|fotovoltaický|fotovoltický)\s+(?:skládací\s+|skladací\s+|přenosný\s+|prenosný\s+)?panel\b/i.test(name) &&
    !accessory.test(name) &&
    specs.powerW > 0;
  if (isSolarPanel) return "solar_panel";

  const isInverter =
    /měniče napětí|meniče napätia/i.test(categoryPath) &&
    /(měnič|menič|invertor|inverter)/i.test(name) &&
    !accessory.test(name) &&
    specs.powerW > 0;
  if (isInverter) return "inverter";

  const isController =
    /solární regulátory|solárne regulátory/i.test(categoryPath) &&
    /\bmppt\b/i.test(name) &&
    !accessory.test(name) &&
    specs.currentA > 0;
  if (isController) return "controller";

  return "other";
}

export function recommendProducts(products, setup, limitPerCategory = 3) {
  const candidates = products
    .map(refreshCatalogProduct)
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

// Older generated catalogs may contain specs produced by an earlier parser.
// Refresh them from the stored source text so parser fixes take effect immediately,
// without waiting for the next successful merchant feed download.
export function refreshCatalogProduct(product) {
  const fallbackText = [product.categoryPath, product.description].filter(Boolean).join(" ");
  const specs = extractSpecs(product.name, fallbackText);
  if (/solární regulátory|solárne regulátory/i.test(product.categoryPath)) {
    specs.currentA = extractControllerCurrent(product.name, product.description);
  }
  return {
    ...product,
    specs,
    category: classifyProduct({ name: product.name, categoryPath: product.categoryPath, specs })
  };
}

function scoreProduct(product, setup) {
  const { specs } = product;
  if (!product.category || product.category === "other") return null;

  let fit = null;
  if (product.category === "battery") {
    if (!specs.voltageV) return null;
    if (specs.voltageV !== setup.systemVoltage) return null;
    if (!specs.capacityAh || specs.capacityAh < setup.batteryAh) return null;
    if (specs.batteryType && setup.batteryType && specs.batteryType !== setup.batteryType) return null;
    fit = specs.capacityAh / setup.batteryAh;
  }
  if (product.category === "solar_panel") {
    if (!specs.powerW) return null;
    const quantity = Math.max(1, Math.ceil(setup.solarWatts / specs.powerW));
    if (quantity > 4) return null;
    fit = (specs.powerW * quantity) / setup.solarWatts;
    product = { ...product, recommendedQuantity: quantity };
  }
  if (product.category === "inverter") {
    if (!specs.voltageV) return null;
    if (specs.voltageV !== setup.systemVoltage) return null;
    if (!hasPureSineEvidence(product)) return null;
    if (!setup.inverterWatts || !specs.powerW || specs.powerW < setup.inverterWatts) return null;
    fit = specs.powerW / setup.inverterWatts;
  }
  if (product.category === "controller") {
    if (!/\bmppt\b/i.test(product.name)) return null;
    if (!specs.currentA || specs.currentA < setup.controllerAmps) return null;
    fit = specs.currentA / setup.controllerAmps;
  }

  if (!fit || fit > 3) return null;
  const completeness = relevantSpecValues(product).filter((value) => value !== null).length;
  const fitScore = Math.max(0, 70 - Math.abs(1 - fit) * 35);
  const availabilityScore = product.available === true ? 15 : 5;
  const completenessScore = Math.min(15, completeness * 3);
  const quantityPenalty = product.category === "solar_panel"
    ? Math.max(0, (product.recommendedQuantity - 1) * 4)
    : 0;

  return {
    product,
    score: Math.round(fitScore + availabilityScore + completenessScore - quantityPenalty),
    reason: recommendationReason(product, setup),
    checks: recommendationChecks(product, setup),
    verify: verificationNote(product.category, setup.locale)
  };
}

function relevantSpecValues(product) {
  if (product.category === "battery") {
    return [product.specs.voltageV, product.specs.capacityAh, product.specs.batteryType];
  }
  if (product.category === "solar_panel") return [product.specs.powerW];
  if (product.category === "inverter") {
    return [product.specs.voltageV, product.specs.powerW, product.specs.pureSine];
  }
  return [product.specs.currentA];
}

function hasPureSineEvidence(product) {
  if (product.specs.pureSine === false) return false;
  if (product.specs.pureSine === true) return true;
  return !/modifikovan(?:ý|á|ou) (?:sinus|sínus)/i.test(product.name)
    && /čist(?:ý|á) (?:sinus|sínus)|pure sine|(?:sinusov|sínusov)(?:ý|á) (?:měnič|menič)|sinepower/i.test(product.name);
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
  const text = PRODUCT_TEXT[setup.locale] || PRODUCT_TEXT.cs;
  if (product.category === "battery") return text.batteryReason(setup);
  if (product.category === "solar_panel") return text.panelReason(product, setup);
  if (product.category === "inverter") return text.inverterReason(setup);
  return text.controllerReason(setup);
}

function recommendationChecks(product, setup) {
  const text = PRODUCT_TEXT[setup.locale] || PRODUCT_TEXT.cs;
  if (product.category === "battery") return [
    `${product.specs.capacityAh} Ah ≥ ${setup.batteryAh} Ah`,
    `${product.specs.voltageV} V = ${text.systemVoltage}`,
    product.specs.batteryType === "lifepo4" ? "LiFePO₄" : text.batteryLead
  ];
  if (product.category === "solar_panel") return [
    `${product.recommendedQuantity} × ${product.specs.powerW} Wp = ${product.recommendedQuantity * product.specs.powerW} Wp`,
    `${text.requirement}: ${setup.solarWatts} Wp`
  ];
  if (product.category === "inverter") return [
    `${product.specs.powerW} W ≥ ${setup.inverterWatts} W`,
    `${product.specs.voltageV} V = ${text.systemVoltage}`
  ];
  return [
    `${product.specs.currentA} A ≥ ${setup.controllerAmps} A`,
    `${text.controllerFor} ${setup.solarWatts} Wp`
  ];
}

function verificationNote(category, locale) {
  const verify = (PRODUCT_TEXT[locale] || PRODUCT_TEXT.cs).verify;
  return verify[category] || verify.controller;
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
  const values = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*v\b/gi)]
    .map((match) => parseLocalizedNumber(match[1]))
    .filter(Number.isFinite);
  const exactNominals = values.filter((value) => [12, 24, 36, 48].includes(value));
  if (exactNominals.length) return exactNominals.at(-1);
  for (const measured of values) {
    if (measured >= 10 && measured < 16) return 12;
    if (measured >= 20 && measured < 32) return 24;
    if (measured >= 32 && measured < 44) return 36;
    if (measured >= 44 && measured < 58) return 48;
  }
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
