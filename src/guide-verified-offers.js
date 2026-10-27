// Progressive enhancement for CZ editorial comparison pages. Actual prices,
// stock and destinations always come from the same guarded catalog as Builder.
// No evergreen HTML prices or fabricated "in stock" claims.
const APPROVED = Object.freeze({
  battery: new Set([
    "vselektro:sunstone-slpo12-100n",
    "vselektro:sunstone-slpo12-200n",
    "vselektro:sunstone-slpo12-200m-hc200a",
  ]),
  controller: new Set([
    "vselektro:victron-smartsolar-100-20",
    "vselektro:victron-smartsolar-100-30",
    "vselektro:victron-smartsolar-100-50",
  ]),
  dc_charger: new Set([
    "vselektro:victron-orion-tr-12-12-18-isolated",
    "vselektro:victron-orion-tr-12-12-30-isolated",
    "vselektro:victron-orion-tr-12-12-30-nonisolated",
    "vselektro:victron-orion-xs-12-12-50-nonisolated",
  ]),
});
const MAX_FEED_AGE_MS = 72 * 60 * 60 * 1000;
const ID_PREFIX = "vselektro:";

export function eligibleGuideOffer(product, category, now = Date.now()) {
  if (!APPROVED[category]?.has(product?.id)) return false;
  if (product.merchant !== "vselektro" || product.category !== category || product.staleSource || product.available !== true) return false;
  if (!Number.isFinite(product.priceCzk) || product.priceCzk <= 0 || product.priceCurrency !== "CZK") return false;
  if (!product.verifiedAt || !product.offerObservedAt || !product.productUrl || !product.affiliateUrl) return false;
  // The independent technical/SKU review date is not a live merchant price
  // observation. Only a successful fresh feed fetch can refresh an offer.
  const reviewedAt = Date.parse(product.verifiedAt);
  const observedAt = Date.parse(product.offerObservedAt);
  if (!Number.isFinite(reviewedAt) || reviewedAt > now
    || !Number.isFinite(observedAt) || observedAt > now
    || now - observedAt > MAX_FEED_AGE_MS) return false;
  try {
    const origin = new URL(product.productUrl);
    const outbound = new URL(product.affiliateUrl);
    const finalUrl = new URL(outbound.searchParams.get("desturl"));
    if (origin.protocol !== "https:" || !["www.vselektro.eu", "vselektro.eu"].includes(origin.hostname)
      || origin.search || origin.hash || !origin.pathname.endsWith("/")) return false;
    if (outbound.protocol !== "https:" || outbound.hostname !== "ehub.cz"
      || outbound.pathname !== "/system/scripts/click.php"
      || outbound.searchParams.get("a_aid") !== "f34c86c8"
      || outbound.searchParams.get("a_bid") !== "f897865f"
      || finalUrl.href !== origin.href) return false;
    return true;
  } catch {
    return false;
  }
}

export function guideCatalogFresh(payload, now = Date.now()) {
  if (payload?.sources?.vselektro?.status !== "ok") return false;
  const updated = Date.parse(payload.generatedAt);
  return Number.isFinite(updated) && updated <= now && now - updated <= MAX_FEED_AGE_MS
    && Array.isArray(payload.products);
}

export function selectGuideOffers(payload, category, now = Date.now()) {
  if (!guideCatalogFresh(payload, now) || !APPROVED[category]) return [];
  return payload.products.filter((p) => eligibleGuideOffer(p, category, now));
}

function displayPrice(price) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(price);
}
function appendText(parent, name, text, className) {
  const element = document.createElement(name);
  element.textContent = text;
  if (className) element.className = className;
  parent.append(element);
  return element;
}
export function mountGuideOffers(root, payload, now = Date.now()) {
  if (!root) return 0;
  const category = root.dataset.guideCategory;
  const offers = selectGuideOffers(payload, category, now);
  // A later failed/stale refresh must not leave an earlier price or tracked
  // purchase link visible. Keep the editorial Builder fallback reversible.
  const previous = root.querySelector(".guide-offer-list");
  const fallback = root.querySelector(".guide-offer-fallback");
  if (!offers.length) {
    previous?.remove();
    if (fallback) fallback.hidden = false;
    root.dataset.liveOffers = "0";
    return 0;
  }
  const list = document.createElement("ul");
  list.className = "guide-offer-list";
  for (const item of offers) {
    const row = document.createElement("li");
    appendText(row, "strong", item.name);
    appendText(row, "span", displayPrice(item.priceCzk) + " · poslední ověřená nabídka z feedu", "guide-offer-price");
    const link = appendText(row, "a", "Ověřit cenu a dostupnost na VšeElektro.eu →", "guide-offer-link");
    link.href = item.affiliateUrl;
    link.target = "_blank";
    link.rel = "sponsored noopener noreferrer";
    link.dataset.affiliateClick = "";
    link.dataset.source = "editorial-comparison";
    link.dataset.category = category;
    link.dataset.productId = item.id;
    link.dataset.merchant = "vselektro";
    row.append(link);
    list.append(row);
  }
  previous?.remove();
  root.append(list);
  if (fallback) fallback.hidden = true;
  root.dataset.liveOffers = String(offers.length);
  return offers.length;
}

async function init() {
  const roots = document.querySelectorAll("[data-guide-category]");
  if (!roots.length) return;
  let payload;
  try {
    const response = await fetch("/data/products.json", { cache: "no-store" });
    if (!response.ok) return;
    payload = await response.json();
  } catch { return; }
  for (const root of roots) mountGuideOffers(root, payload);
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("[data-guide-category] a[data-affiliate-click]");
    if (!link) return;
    // Shared analytics respects user consent; never store click identifiers locally.
    window.MyPowerSetupAnalytics?.track("affiliate_click", {
      productId: link.dataset.productId,
      merchant: "vselektro",
      category: link.dataset.category,
      source: "editorial-comparison",
      purchaseRoute: "components",
    });
  });
}

if (typeof window !== "undefined" && typeof document !== "undefined") init();
