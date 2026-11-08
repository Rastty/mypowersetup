// Full Builder purchase offers are read-only snapshots of verified merchant
// feeds. A page left open for days must not keep an expired affiliate link live.
export const BUILDER_OFFER_MAX_AGE_MS = 72 * 60 * 60 * 1000;

// Timestamp must be an unambiguous, round-trippable UTC feed generation time.
// Source-only technical reviews are not fresh price/availability observations.
export function parseBuilderOfferTime(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return NaN;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 19) !== value.slice(0, 19)) return NaN;
  return ms;
}

// Duplicate SKU identities across payloads fail closed rather than allowing
// one conflicting stock/destination observation to win by array order.
export function buildBuilderOfferEvidence(payloads) {
  const offers = new Map();
  for (const payload of Array.isArray(payloads) ? payloads : []) {
    const observedAt = parseBuilderOfferTime(payload?.generatedAt ?? payload?.updatedAt);
    if (!Array.isArray(payload?.products)) continue;
    for (const product of payload.products) {
      const id = product?.id;
      const merchant = product?.merchant;
      if (typeof id !== "string" || !id || typeof merchant !== "string" || !merchant) continue;
      const prior = offers.get(id);
      if (prior) {
        offers.set(id, null);
        continue;
      }
      const source = payload?.sources?.[merchant];
      const record = typeof product.affiliateUrl === "string" && source?.status === "ok"
        && product.available === true && !product.staleSource
        ? Object.freeze({ id, merchant, affiliateUrl: product.affiliateUrl, observedAt })
        : null;
      offers.set(id, record);
    }
  }
  return offers;
}

// Merchant attribution may append permitted clickref/data1/data2 parameters.
// Every parameter of the original, independently verified affiliate URL must
// still be present and identical; no host, path or final destination swap.
export function builderAffiliateHrefMatches(expected, actual) {
  try {
    const original = new URL(expected);
    const outbound = new URL(actual);
    if (original.protocol !== "https:" || outbound.protocol !== "https:"
      || original.origin !== outbound.origin || original.pathname !== outbound.pathname
      || original.username || original.password || outbound.username || outbound.password) return false;
    for (const [name, value] of original.searchParams) {
      if (outbound.searchParams.getAll(name).filter((x) => x === value).length
        < original.searchParams.getAll(name).filter((x) => x === value).length) return false;
    }
    return true;
  } catch { return false; }
}

export function isCurrentBuilderOffer(link, evidence, now = Date.now()) {
  const id = link?.dataset?.productId;
  const merchant = link?.dataset?.merchant;
  const offer = id && evidence instanceof Map ? evidence.get(id) : null;
  if (!offer || offer.merchant !== merchant || !Number.isFinite(offer.observedAt)
    || !Number.isFinite(now) || now < offer.observedAt
    || now - offer.observedAt > BUILDER_OFFER_MAX_AGE_MS) return false;
  return builderAffiliateHrefMatches(offer.affiliateUrl, link?.href);
}

// Capture phase is intentional: an expired outbound click must not reach the
// document's consent-aware affiliate_click analytics listener in bubble phase.
// Right-click is also guarded, otherwise "open in new tab" evades the gate.
export function bindBuilderOfferClickGuard({
  documentRoot, getEvidence, now = Date.now, onBlocked = () => {},
} = {}) {
  const root = documentRoot?.querySelector?.("#product-recommendations");
  if (!root || typeof documentRoot?.addEventListener !== "function") return () => false;
  const guard = (event) => {
    if (event.defaultPrevented) return false;
    if (event.type === "click" && event.button !== 0 && event.button !== undefined) return false;
    if (event.type === "auxclick" && event.button !== 1) return false;
    const link = event.target?.closest?.("[data-affiliate-click]");
    if (!link || !root.contains?.(link)) return false;
    if (isCurrentBuilderOffer(link, getEvidence?.(), now())) return false;
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    event.stopPropagation?.();
    onBlocked(link);
    return true;
  };
  for (const type of ["click", "auxclick", "contextmenu"]) {
    documentRoot.addEventListener(type, guard, true);
  }
  return guard;
}

// Avoid a reload loop: block only the outdated outbound click and offer a
// deliberate reload to fetch the latest catalog. The calculation share query
// is preserved and can be restored by each existing Builder.
export function showExpiredBuilderOfferNotice({
  documentRoot, message, refreshLabel, reload,
} = {}) {
  const root = documentRoot?.querySelector?.("#product-recommendations");
  if (!root || typeof documentRoot?.createElement !== "function"
    || typeof message !== "string" || typeof refreshLabel !== "string") return false;
  if (root.querySelector?.("[data-builder-offer-expired]")) return true;
  const notice = documentRoot.createElement("p");
  notice.className = "catalog-source-note is-stale";
  notice.setAttribute("role", "alert");
  notice.setAttribute("data-builder-offer-expired", "");
  notice.append(documentRoot.createTextNode(message + " "));
  const button = documentRoot.createElement("button");
  button.type = "button";
  button.className = "button button-secondary";
  button.textContent = refreshLabel;
  button.addEventListener("click", () => reload?.());
  notice.append(button);
  root.prepend(notice);
  return true;
}
