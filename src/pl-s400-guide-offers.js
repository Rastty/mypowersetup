import { createVerifiedGuideImpressionTracker } from "./guide-offer-impressions.js";
import { trackAffiliateClick } from "./affiliate-analytics.js";

// Only the two reviewed, *live-page-checked* Polish OXE products. The catalog
// is shared with Builder; this module is a PL editorial presentation adapter.
const SKUS = Object.freeze([
  Object.freeze({
    id: "oxe_pl:OXE8817",
    label: "S400 — sama stacja (z torbą)",
    path: "/oxe-powerstation-s400-wielofunkcyjny-generator-ladujacy-400w386wh-torba/",
  }),
  Object.freeze({
    id: "oxe_pl:OXE8821",
    label: "S400 + panel SP100W (z torbą)",
    path: "/oxe-powerstation-s400-i-panel-sloneczny-sp100w-torba/",
  }),
]);
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
const PL_PRICE = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

function observedAt(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return NaN;
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) && new Date(epoch).toISOString() === value ? epoch : NaN;
}

export function plS400CatalogFresh(catalog, now = Date.now()) {
  const source = catalog?.sources?.oxe_pl;
  const when = observedAt(catalog?.generatedAt);
  return source?.status === "ok"
    && source.merchant === "oxe_pl"
    && source.dognetChannel === "2mRVFbhJ"
    && source.feedUrl === "https://www.oxepower.pl/export/google-dognet-pl.xml"
    && Number.isInteger(source.liveOfferChecks) && source.liveOfferChecks >= 2
    && Number.isInteger(source.liveOfferVerified) && source.liveOfferVerified >= 2
    && source.liveOfferVerified <= source.liveOfferChecks
    && Array.isArray(catalog.products) && Number.isFinite(when)
    && when <= now && now - when <= MAX_AGE_MS;
}

export function eligiblePlS400(product) {
  const reviewed = SKUS.find((sku) => sku.id === product?.id);
  if (!reviewed || product.merchant !== "oxe_pl" || product.category !== "power_station"
    || product.available !== true || product.staleSource === true
    || product.priceCurrency !== "PLN" || !Number.isFinite(product.priceCzk)
    || product.priceCzk <= 0 || product.priceCzk > 100_000
    || product.brand !== "OXE") return false;
  const specs = product.specs;
  if (!specs || !(specs.capacityWh >= 385 && specs.capacityWh <= 387)
    || specs.powerW !== 400 || specs.solarInputW !== 90
    || specs.dcOutputA !== 8 || specs.pureSine !== true) return false;
  try {
    const merchant = new URL(product.productUrl);
    const referral = new URL(product.affiliateUrl);
    if (merchant.origin !== "https://www.oxepower.pl"
      || merchant.username || merchant.password || merchant.search || merchant.hash
      || merchant.pathname !== reviewed.path) return false;
    if (referral.origin !== "https://go.dognet.com" || referral.pathname !== "/"
      || referral.username || referral.password || referral.hash
      || referral.searchParams.getAll("chid").length !== 1
      || referral.searchParams.getAll("url").length !== 1
      || [...referral.searchParams.keys()].some((key) => !["chid", "url"].includes(key))) return false;
    return referral.searchParams.get("chid") === "2mRVFbhJ"
      && referral.searchParams.get("url") === merchant.href;
  } catch { return false; }
}

export function selectPlS400Comparison(catalog, now = Date.now()) {
  if (!plS400CatalogFresh(catalog, now)) return [];
  const result = [];
  for (const sku of SKUS) {
    const matches = catalog.products.filter((product) => product?.id === sku.id);
    // A true two-way buyer comparison requires both verified SKUs. A missing,
    // duplicated or invalid row must not become a misleading one-sided offer.
    if (matches.length !== 1 || !eligiblePlS400(matches[0])) return [];
    result.push({ ...sku, product: matches[0] });
  }
  return result;
}

function addText(parent, tag, value, className) {
  const element = document.createElement(tag);
  element.textContent = value;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

export function mountPlS400Comparison(root, catalog, now = Date.now(), clickNow = Date.now) {
  if (!root) return 0;
  const offers = selectPlS400Comparison(catalog, now);
  root.querySelector(".guide-offer-list")?.remove();
  const fallback = root.querySelector(".guide-offer-fallback");
  root.dataset.liveOffers = "0";
  if (fallback) fallback.hidden = false;
  if (!offers.length) return 0;

  const list = document.createElement("ul");
  list.className = "guide-offer-list";
  const expiry = observedAt(catalog.generatedAt) + MAX_AGE_MS;
  for (const { id, label, product } of offers) {
    const item = document.createElement("li");
    addText(item, "strong", label);
    addText(item, "span", `${PL_PRICE.format(product.priceCzk)} · cena i dostępność sprawdzone w ofercie sklepu`, "guide-offer-price");
    const link = addText(item, "a", "Sprawdź aktualną ofertę OXE →", "guide-offer-link");
    link.href = product.affiliateUrl;
    link.target = "_blank";
    link.rel = "sponsored noopener noreferrer";
    link.dataset.affiliateClick = "";
    link.dataset.source = "editorial-comparison";
    link.dataset.merchant = "oxe_pl";
    link.dataset.category = "power_station";
    link.dataset.productId = id;
    link.dataset.offerExpiresAt = String(expiry);
    const guard = (event) => {
      if (selectPlS400Comparison(catalog, clickNow()).length !== 2) {
        event.preventDefault();
        event.stopPropagation();
        mountPlS400Comparison(root, null, clickNow());
      }
    };
    link.addEventListener("click", guard);
    link.addEventListener("auxclick", guard);
    item.append(link);
    list.append(item);
  }
  root.append(list);
  if (fallback) fallback.hidden = true;
  root.dataset.liveOffers = "2";
  return 2;
}

export async function refreshPlS400Comparison(root, fetchImpl = fetch, now = Date.now) {
  const clock = () => typeof now === "function" ? now() : now;
  mountPlS400Comparison(root, null, clock());
  try {
    const response = await fetchImpl("/data/products-pl.json", {
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12_000),
    });
    if (!response?.ok || !/^application\/json\b/i.test(response.headers?.get?.("content-type") || "")) return null;
    const catalog = await response.json();
    mountPlS400Comparison(root, catalog, clock());
    return selectPlS400Comparison(catalog, clock()).length === 2 ? catalog : null;
  } catch { return null; }
}

export function trackPlS400Click(event, analytics, now = Date.now()) {
  if (event.defaultPrevented) return false;
  if (event.type === "auxclick" ? event.button !== 1
    : event.type !== "click" || (event.button !== 0 && event.button !== undefined)) return false;
  const link = event.target?.closest?.("[data-pl-s400-offers] a[data-affiliate-click]");
  if (!link || link.dataset.source !== "editorial-comparison"
    || link.dataset.merchant !== "oxe_pl" || link.dataset.category !== "power_station"
    || !SKUS.some((sku) => sku.id === link.dataset.productId)
    || !Number.isFinite(Number(link.dataset.offerExpiresAt))
    || now > Number(link.dataset.offerExpiresAt)) return false;
  return trackAffiliateClick(link, (name, parameters) => analytics?.track?.(name, parameters));
}

async function init() {
  const root = document.querySelector("[data-pl-s400-offers]");
  if (!root) return;
  const impressions = createVerifiedGuideImpressionTracker({
    documentRoot: document, sections: [root],
    getAnalytics: () => window.MyPowerSetupAnalytics,
    Observer: window.IntersectionObserver,
    allowedMerchants: ["oxe_pl"], allowedSources: ["editorial-comparison"],
  });
  let pending = null;
  let expiryTimer = null;
  const refresh = () => {
    if (pending) return pending;
    pending = refreshPlS400Comparison(root).then((catalog) => {
      impressions?.scan();
      if (expiryTimer !== null) window.clearTimeout(expiryTimer);
      expiryTimer = null;
      if (catalog) {
        const expiry = observedAt(catalog.generatedAt) + MAX_AGE_MS + 1;
        expiryTimer = window.setTimeout(() => {
          mountPlS400Comparison(root, null);
          void refresh();
        }, Math.max(1, expiry - Date.now()));
      }
    }).finally(() => { pending = null; });
    return pending;
  };
  document.addEventListener("click", (event) => trackPlS400Click(event, window.MyPowerSetupAnalytics));
  document.addEventListener("auxclick", (event) => trackPlS400Click(event, window.MyPowerSetupAnalytics));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) void refresh(); });
  window.addEventListener("focus", () => { void refresh(); });
  window.setInterval(() => { if (!document.hidden) void refresh(); }, 60 * 60 * 1000);
  await refresh();
}

if (typeof document !== "undefined" && typeof window !== "undefined") void init();
