// Explicit manufacturer-reviewed evidence for EXACT approved local battery SKUs.
// Entries must be reviewed against a public manufacturer datasheet, including
// continuous discharge (not peak, surge, charge or generic BMS advertising).
// Never populate this map from product feeds or client-provided fields.
// A candidate record requires {id, merchant, name, productUrl, priceCurrency,
// affiliateUrl, model, manufacturerEvidenceUrl, continuousDischargeA}.
// At present no exact CZ/SK/PL battery has cleared that evidence gate.
// This deliberately downgrades feed-only BMS values rather than inventing proof.
const MANUFACTURER_REVIEWED_BATTERIES = Object.freeze({});

export function verifiedBatteryContinuousDischargeAmps(product) {
  if (product?.category !== "battery" || !product.verifiedAt || product.available !== true) return null;
  const record = Object.hasOwn(MANUFACTURER_REVIEWED_BATTERIES, product.id)
    ? MANUFACTURER_REVIEWED_BATTERIES[product.id] : null;
  if (!record || !["CZK", "EUR", "PLN"].includes(record.priceCurrency)) return null;
  // Every identity must match the reviewed exact SKU, current merchant campaign,
  // destination and territory before any technical rating is promoted.
  if (["id", "merchant", "name", "productUrl", "priceCurrency", "affiliateUrl"]
    .some(key => product[key] !== record[key])) return null;
  if (typeof record.model !== "string" || !record.model.trim()
    || typeof record.manufacturerEvidenceUrl !== "string"
    || !Number.isFinite(record.continuousDischargeA) || record.continuousDischargeA <= 0
    || product.specs?.bmsContinuousCurrentA !== record.continuousDischargeA) return null;
  try {
    const source = new URL(record.manufacturerEvidenceUrl);
    const affiliate = new URL(record.affiliateUrl);
    if (source.protocol !== "https:" || !source.hostname || affiliate.origin !== "https://ehub.cz"
      || affiliate.pathname !== "/system/scripts/click.php"
      || affiliate.searchParams.get("a_aid") !== "f34c86c8"
      || affiliate.searchParams.getAll("a_aid").length !== 1
      || affiliate.searchParams.getAll("a_bid").length !== 1
      || affiliate.searchParams.getAll("desturl").length !== 1
      || affiliate.searchParams.size !== 3
      || affiliate.searchParams.get("desturl") !== record.productUrl) return null;
  } catch { return null; }
  return record.continuousDischargeA;
}
