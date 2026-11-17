import { isConfirmedDiscontinuedProduct } from "./products.js";

// Independently reviewed, still-purchasable Solar-Import 12 V nominal Victron panel SKUs.
// Wp alone does not establish array wiring, roof fit, Voc/Isc or MPPT suitability.
const REVIEWED = new Map([
  ["solarimport:E8722", {
    watts: 130,
    name: "Victron Energy 12V Fotovoltaický panel 130Wp SPP041301200",
    path: "/ramove-male/victron-energy-solarni-panel-130wp-12v--mono/",
  }],
  ["solarimport:E8934", {
    watts: 190,
    name: "Victron Energy Solární panel 190W/12V, monokrystalický",
    path: "/ramove-male/victron-energy-solarni-panel-190w-12v--monokrystalicky/",
  }],
]);
const MAX_AGE = 72 * 60 * 60 * 1000;

function evidenceDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value)) return NaN;
  const date = Date.parse(value);
  return Number.isFinite(date) && new Date(date).toISOString().slice(0, 19) === value.slice(0, 19) ? date : NaN;
}

export function solarCatalogFresh(payload, now = Date.now()) {
  const created = evidenceDate(payload?.generatedAt);
  return payload?.sources?.solarimport?.status === "ok" && Array.isArray(payload.products)
    && Number.isFinite(created) && created <= now && now - created <= MAX_AGE;
}

export function eligibleSolarPanel(product) {
  const reviewed = REVIEWED.get(product?.id);
  if (!reviewed || isConfirmedDiscontinuedProduct(product)
      || product.merchant !== "solarimport" || product.category !== "solar_panel"
      || product.available !== true || product.staleSource === true
      || product.name !== reviewed.name || product.specs?.powerW !== reviewed.watts
      || product.specs?.voltageV !== 12 || product.priceCurrency !== "CZK"
      || !Number.isFinite(product.priceCzk) || product.priceCzk <= 0) return false;
  try {
    const productUrl = new URL(product.productUrl);
    const affiliate = new URL(product.affiliateUrl);
    const destination = `https://www.solar-import.cz${reviewed.path}`;
    return productUrl.href === destination && !productUrl.username && !productUrl.password
      && affiliate.origin === "https://ehub.cz" && !affiliate.username && !affiliate.password
      && affiliate.pathname === "/system/scripts/click.php" && !affiliate.hash
      && [...affiliate.searchParams.keys()].every(key => ["a_aid", "a_bid", "desturl"].includes(key))
      && ["a_aid", "a_bid", "desturl"].every(key => affiliate.searchParams.getAll(key).length === 1)
      && affiliate.searchParams.get("a_aid") === "f34c86c8"
      && affiliate.searchParams.get("a_bid") === "35cb7fb0"
      && affiliate.searchParams.get("desturl") === destination;
  } catch { return false; }
}

export function reviewedSolarPanels(payload, now = Date.now()) {
  if (!solarCatalogFresh(payload, now)) return [];
  const counts = new Map();
  for (const p of payload.products) counts.set(p?.id, (counts.get(p?.id) || 0) + 1);
  return payload.products.filter(p => counts.get(p?.id) === 1 && eligibleSolarPanel(p));
}

// Comparison of nominal Wp totals, not a compatible multi-panel wiring design.
// At most four physical modules: very high-demand installations need Builder.
export function selectSolarCalculatorOffers(payload, result, now = Date.now()) {
  const required = result?.solarWatts;
  if (!Number.isSafeInteger(required) || required < 100 || required > 760
      || result?.systemVoltage !== 12) return [];
  return reviewedSolarPanels(payload, now)
    .map(panel => ({ ...panel, recommendedQuantity: Math.ceil(required / panel.specs.powerW) }))
    .filter(panel => panel.recommendedQuantity >= 1 && panel.recommendedQuantity <= 4)
    .sort((a, b) => a.priceCzk * a.recommendedQuantity - b.priceCzk * b.recommendedQuantity
      || a.recommendedQuantity - b.recommendedQuantity)
    .slice(0, 3);
}

export function solarOfferExpiresAt(payload) {
  const generated = evidenceDate(payload?.generatedAt);
  return Number.isFinite(generated) ? generated + MAX_AGE : null;
}

export function isSolarOfferStillEligible(payload, result, offer, now = Date.now()) {
  return selectSolarCalculatorOffers(payload, result, now)
    .some(p => p.id === offer?.id && p.recommendedQuantity === offer.recommendedQuantity);
}
