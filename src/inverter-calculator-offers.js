// Reviewed, unambiguous ROGERELE REP variants from the Czech Solar-import feed.
// The model explicitly identifies nominal AC watts and 12/24 V DC input.
// Keep this deliberately narrow: inferred/generic inverter power or a
// merchant landing shared by multiple variants is NOT a buyer recommendation.
const REVIEWED_REP = Object.freeze(new Map([
  ["E7925", [300, 12]], ["E7926", [500, 12]],
  ["E7927", [1000, 12]], ["E7928", [1500, 12]],
  ["E7929", [2000, 12]], ["E7930", [3000, 12]],
  ["E7931", [300, 24]], ["E7932", [500, 24]],
  ["E7933", [1000, 24]], ["E7934", [1500, 24]],
  ["E7935", [2000, 24]], ["E7936", [3000, 24]],
  ["E7937", [5000, 24]],
]));
const MAX_AGE_MS = 72 * 60 * 60 * 1000;

function evidenceTime(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(date)) return NaN;
  const parsed = Date.parse(date);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 19) === date.slice(0, 19)
    ? parsed : NaN;
}

export function inverterCatalogFresh(payload, now = Date.now()) {
  const updated = evidenceTime(payload?.generatedAt);
  return payload?.sources?.solarimport?.status === "ok"
    && Array.isArray(payload.products)
    && Number.isFinite(updated) && updated <= now && now - updated <= MAX_AGE_MS;
}

export function eligibleInverterOffer(product) {
  const reviewed = REVIEWED_REP.get(product?.id?.replace?.(/^solarimport:/, ""));
  if (!reviewed || product.id !== `solarimport:${product.id.slice("solarimport:".length)}`) return false;
  const [watts, volts] = reviewed;
  if (product.merchant !== "solarimport" || product.category !== "inverter"
    || product.available !== true || product.staleSource === true
    || product.priceCurrency !== "CZK" || !Number.isFinite(product.priceCzk)
    || product.priceCzk <= 0 || product.specs?.pureSine !== true
    || product.specs?.powerW !== watts || product.specs?.voltageV !== volts
    || product.name !== `ROGERELE Sinusový měnič napětí REP${watts}-${volts} ${watts}W`) return false;
  const destination = `https://www.solar-import.cz/off-grid/rogerele-sinusovy-menic-napeti-rep${watts}-${volts}--${watts}w/`;
  try {
    const productUrl = new URL(product.productUrl);
    const affiliate = new URL(product.affiliateUrl);
    return productUrl.href === destination
      && affiliate.origin === "https://ehub.cz" && !affiliate.username && !affiliate.password
      && affiliate.pathname === "/system/scripts/click.php" && !affiliate.hash
      && [...affiliate.searchParams.keys()].every(key => ["a_aid", "a_bid", "desturl"].includes(key))
      && ["a_aid", "a_bid", "desturl"].every(key => affiliate.searchParams.getAll(key).length === 1)
      && affiliate.searchParams.get("a_aid") === "f34c86c8"
      && affiliate.searchParams.get("a_bid") === "35cb7fb0"
      && affiliate.searchParams.get("desturl") === destination;
  } catch { return false; }
}

export function reviewedInverterOffers(payload, now = Date.now()) {
  if (!inverterCatalogFresh(payload, now)) return [];
  const counts = new Map();
  for (const p of payload.products) counts.set(p?.id, (counts.get(p?.id) || 0) + 1);
  return payload.products.filter(p => counts.get(p?.id) === 1 && eligibleInverterOffer(p));
}

// Only nominal continuous AC watts and exact DC voltage can be matched here.
// Peak/surge capacity, BMS, wiring and fuse protection require a datasheet.
export function selectInverterCalculatorOffers(payload, result, now = Date.now()) {
  const required = result?.inverterWatts;
  const volts = result?.systemVoltage;
  if (!Number.isSafeInteger(required) || required < 100 || required > 5000
    || required % 100 !== 0 || ![12, 24].includes(volts)) return [];
  return reviewedInverterOffers(payload, now)
    .filter(p => p.specs.voltageV === volts && p.specs.powerW >= required)
    .sort((a, b) => a.specs.powerW - b.specs.powerW || a.priceCzk - b.priceCzk)
    .slice(0, 3);
}

export function inverterOfferExpiresAt(payload) {
  const generated = evidenceTime(payload?.generatedAt);
  return Number.isFinite(generated) ? generated + MAX_AGE_MS : null;
}

export function isInverterOfferStillEligible(payload, result, product, now = Date.now()) {
  return selectInverterCalculatorOffers(payload, result, now).some(candidate => candidate === product);
}
