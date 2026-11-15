// Exact standalone SK solar panel SKUs verified against Padabo's product pages.
// Variants sharing a destination URL are intentionally excluded because the
// landing page might not preselect the claimed wattage or price.
const REVIEWED = new Map([
  ["padabo_sk:109069", {
    name: "Solárny panel Victron Energy BlueSolar 190 Wp Mono 12 V",
    watts: 190,
    path: "/solarny-panel-victron-energy-bluesolar-190-wp-mono-12-v_z109069/",
  }],
  ["padabo_sk:104344", {
    name: "Solárny panel Dometic Büttner Solenergy PSM Slim",
    watts: 100,
    path: "/solarny-panel-dometic-buttner-solenergy-psm-slim_z104344/",
  }],
]);

const MAX_AGE = 72 * 60 * 60 * 1000;

function sourceDate(payload) {
  if (typeof payload?.generatedAt !== "string" ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(payload.generatedAt)) return NaN;
  const date = Date.parse(payload.generatedAt);
  return Number.isFinite(date) && new Date(date).toISOString().slice(0, 19) === payload.generatedAt.slice(0, 19)
    ? date : NaN;
}

export function skSolarFresh(payload, now = Date.now()) {
  const generated = sourceDate(payload);
  return payload?.sources?.padabo_sk?.status === "ok" && Array.isArray(payload.products)
    && Number.isFinite(generated) && generated <= now && now - generated <= MAX_AGE;
}

export function eligibleSkSolarPanel(p) {
  const reviewed = REVIEWED.get(p?.id);
  if (!reviewed || p.merchant !== "padabo_sk" || p.category !== "solar_panel"
      || p.available !== true || p.staleSource === true || p.name !== reviewed.name
      || p.specs?.powerW !== reviewed.watts || p.specs?.voltageV !== 12
      || p.priceCurrency !== "EUR" || !Number.isFinite(p.priceCzk) || p.priceCzk <= 0) return false;
  try {
    const dest = `https://www.padabo.sk${reviewed.path}`;
    const product = new URL(p.productUrl);
    const affiliate = new URL(p.affiliateUrl);
    return product.href === dest && !product.username && !product.password
      && affiliate.origin === "https://ehub.cz" && affiliate.pathname === "/system/scripts/click.php"
      && !affiliate.username && !affiliate.password && !affiliate.hash
      && [...affiliate.searchParams.keys()].every(k => ["a_aid", "a_bid", "desturl"].includes(k))
      && ["a_aid", "a_bid", "desturl"].every(k => affiliate.searchParams.getAll(k).length === 1)
      && affiliate.searchParams.get("a_aid") === "f34c86c8"
      && affiliate.searchParams.get("a_bid") === "7aed5c13"
      && affiliate.searchParams.get("desturl") === dest;
  } catch { return false; }
}

export function reviewedSkSolarPanels(payload, now = Date.now()) {
  if (!skSolarFresh(payload, now)) return [];
  const counts = new Map();
  for (const p of payload.products) counts.set(p?.id, (counts.get(p?.id) || 0) + 1);
  return payload.products.filter(p => counts.get(p?.id) === 1 && eligibleSkSolarPanel(p));
}

// A panel count is only a nominal Wp comparison; never infer wiring, footprint
// or the compatibility of a particular panel string with a selected MPPT.
export function selectSkSolarCalculatorOffers(payload, result, now = Date.now()) {
  const required = result?.solarWatts;
  if (!Number.isSafeInteger(required) || required < 100 || required > 760
      || result?.systemVoltage !== 12) return [];
  return reviewedSkSolarPanels(payload, now)
    .map(p => ({ ...p, recommendedQuantity: Math.ceil(required / p.specs.powerW) }))
    .filter(p => p.recommendedQuantity >= 1 && p.recommendedQuantity <= 4)
    .sort((a, b) => a.priceCzk * a.recommendedQuantity - b.priceCzk * b.recommendedQuantity
      || a.recommendedQuantity - b.recommendedQuantity)
    .slice(0, 2);
}

export function skSolarExpiresAt(payload) {
  const generated = sourceDate(payload);
  return Number.isFinite(generated) ? generated + MAX_AGE : null;
}

export function isSkSolarOfferStillEligible(payload, result, offer, now = Date.now()) {
  return selectSkSolarCalculatorOffers(payload, result, now)
    .some(p => p.id === offer?.id && p.recommendedQuantity === offer.recommendedQuantity);
}

export function projectSkSolarCalculatorOffers(full, now = Date.now()) {
  return {
    schemaVersion: 1,
    projection: "solar_panel",
    market: "sk-SK",
    generatedAt: full?.generatedAt ?? null,
    sources: { padabo_sk: { status: skSolarFresh(full, now) ? "ok" : "stale" } },
    products: reviewedSkSolarPanels(full, now).map(p => ({
      id: p.id, name: p.name, merchant: p.merchant, category: p.category,
      available: p.available, staleSource: p.staleSource === true,
      priceCzk: p.priceCzk, priceCurrency: p.priceCurrency,
      productUrl: p.productUrl, affiliateUrl: p.affiliateUrl,
      specs: { powerW: p.specs.powerW, voltageV: p.specs.voltageV },
    })),
  };
}
