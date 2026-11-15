// Standalone merchant product pages manually checked for the exact 190 Wp,
// 12 V panel. Variant-parent URLs are deliberately not eligible.
const MARKETS = Object.freeze({
  pl: Object.freeze({
    merchant: "padabo_pl", market: "pl-PL", currency: "PLN", campaign: "95d61abf",
    id: "padabo_pl:109069",
    name: "Panel słoneczny Victron Energy BlueSolar 190 Wp Mono 12 V",
    destination: "https://www.padabo.pl/panel-sloneczny-victron-energy-bluesolar-190-wp-mono-12-v_z109069/",
  }),
  hu: Object.freeze({
    merchant: "padabo_hu", market: "hu-HU", currency: "HUF", campaign: "0f2a2252",
    id: "padabo_hu:109069",
    name: "Victron Energy BlueSolar 190 Wp Mono 12 V napelem",
    destination: "https://www.padabo.hu/victron-energy-bluesolar-190-wp-mono-12-v-napelem_z109069/",
  }),
});
const MAX_AGE = 72 * 60 * 60 * 1000;

function generatedDate(payload) {
  const stamp = payload?.generatedAt;
  if (typeof stamp !== "string" ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(stamp)) return NaN;
  const date = Date.parse(stamp);
  return Number.isFinite(date) && new Date(date).toISOString().slice(0, 19) === stamp.slice(0, 19)
    ? date : NaN;
}

export function marketSolarFresh(market, payload, now = Date.now()) {
  const config = MARKETS[market];
  const generated = generatedDate(payload);
  return Boolean(config && payload?.market === config.market &&
    payload?.sources?.[config.merchant]?.status === "ok" && Array.isArray(payload.products)
    && Number.isFinite(generated) && generated <= now && now - generated <= MAX_AGE);
}

export function eligibleMarketSolarPanel(market, panel) {
  const config = MARKETS[market];
  if (!config || panel?.id !== config.id || panel.name !== config.name ||
      panel.merchant !== config.merchant || panel.category !== "solar_panel" ||
      panel.available !== true || panel.staleSource === true ||
      panel.specs?.powerW !== 190 || panel.specs?.voltageV !== 12 ||
      panel.priceCurrency !== config.currency ||
      !Number.isFinite(panel.priceCzk) || panel.priceCzk <= 0) return false;
  try {
    const destination = new URL(panel.productUrl);
    const tracking = new URL(panel.affiliateUrl);
    return destination.href === config.destination && !destination.username && !destination.password &&
      tracking.origin === "https://ehub.cz" && tracking.pathname === "/system/scripts/click.php" &&
      !tracking.username && !tracking.password && !tracking.hash &&
      [...tracking.searchParams.keys()].every(k => ["a_aid", "a_bid", "desturl"].includes(k)) &&
      ["a_aid", "a_bid", "desturl"].every(k => tracking.searchParams.getAll(k).length === 1) &&
      tracking.searchParams.get("a_aid") === "f34c86c8" &&
      tracking.searchParams.get("a_bid") === config.campaign &&
      tracking.searchParams.get("desturl") === config.destination;
  } catch { return false; }
}

export function reviewedMarketSolarPanels(market, payload, now = Date.now()) {
  if (!marketSolarFresh(market, payload, now)) return [];
  const ids = payload.products.map(p => p?.id);
  return payload.products.filter(p => ids.filter(id => id === p?.id).length === 1 &&
    eligibleMarketSolarPanel(market, p));
}

// Nominal panel count only: this is not an electrical, MPPT or roof-fit claim.
export function selectMarketSolarCalculatorOffers(market, payload, result, now = Date.now()) {
  const watts = result?.solarWatts;
  if (!Number.isSafeInteger(watts) || watts < 100 || watts > 760 || result?.systemVoltage !== 12)
    return [];
  return reviewedMarketSolarPanels(market, payload, now)
    .map(p => ({ ...p, recommendedQuantity: Math.ceil(watts / p.specs.powerW) }))
    .filter(p => p.recommendedQuantity >= 1 && p.recommendedQuantity <= 4);
}

export function marketSolarExpiresAt(payload) {
  const date = generatedDate(payload);
  return Number.isFinite(date) ? date + MAX_AGE : null;
}

export function isMarketSolarOfferStillEligible(market, payload, result, offer, now = Date.now()) {
  return selectMarketSolarCalculatorOffers(market, payload, result, now)
    .some(p => p.id === offer?.id && p.recommendedQuantity === offer.recommendedQuantity);
}

export function projectMarketSolarCalculatorOffers(market, full, now = Date.now()) {
  const config = MARKETS[market];
  if (!config) throw new Error(`Unsupported solar offer market: ${market}`);
  return {
    schemaVersion: 1, projection: "solar_panel", market: config.market,
    generatedAt: full?.generatedAt ?? null,
    sources: { [config.merchant]: { status: marketSolarFresh(market, full, now) ? "ok" : "stale" } },
    products: reviewedMarketSolarPanels(market, full, now).map(p => ({
      id: p.id, name: p.name, merchant: p.merchant, category: p.category,
      available: p.available, staleSource: p.staleSource === true,
      priceCzk: p.priceCzk, priceCurrency: p.priceCurrency,
      productUrl: p.productUrl, affiliateUrl: p.affiliateUrl,
      specs: { powerW: p.specs.powerW, voltageV: p.specs.voltageV },
    })),
  };
}
