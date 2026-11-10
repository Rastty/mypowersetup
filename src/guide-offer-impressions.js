import { buildAttributedAffiliateParameters } from "./affiliate-analytics.js?v=20261110-attributed-products1";

// A product_choice_impression means the *actual*, still-current commercial
// link crossed 50% viewport visibility. Merely rendering the article, or
// refreshing an offscreen catalog, must not inflate the impression denominator.
export function createVerifiedGuideImpressionTracker({
  documentRoot,
  sections,
  getAnalytics,
  Observer = globalThis.IntersectionObserver,
  now = Date.now,
  allowedSources = ["editorial-comparison"],
} = {}) {
  if (!documentRoot || typeof Observer !== "function" || !Array.isArray(sections)) return null;

  const counted = new Set();
  const observed = new Set();
  const visible = new Set();

  function flush() {
    if (documentRoot.hidden) return 0;
    const analytics = getAnalytics?.();
    if (typeof analytics?.track !== "function") return 0;
    let tracked = 0;
    for (const link of visible) {
      if (!observed.has(link) || link.isConnected === false || link.closest?.("[hidden], details:not([open])")) continue;
      const expiresAt = Number(link.dataset?.offerExpiresAt);
      if (!Number.isFinite(expiresAt) || expiresAt <= 0 || now() > expiresAt) continue;
      const params = buildAttributedAffiliateParameters(link);
      if (params.productId === "unknown" || params.merchant !== "vselektro"
        || !allowedSources.includes(params.source)) continue;
      const key = `${params.merchant}:${params.category}:${params.productId}`;
      if (counted.has(key)) continue;
      // The existing Analytics adapter owns consent and enriches market,
      // page_path and page_type. Never mark a declined event as recorded.
      if (analytics.track("product_choice_impression", params) === true) {
        counted.add(key);
        tracked += 1;
      }
    }
    return tracked;
  }

  const observer = new Observer((entries) => {
    for (const entry of entries) {
      if (!observed.has(entry.target)) continue;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    flush();
  }, { threshold: [0, 0.5] });

  function scan() {
    for (const link of observed) observer.unobserve(link);
    observed.clear();
    visible.clear();
    for (const section of sections) {
      if (section.hidden || section.dataset?.liveOffers === "0") continue;
      for (const link of section.querySelectorAll?.("a[data-affiliate-click][data-product-id][data-offer-expires-at]") || []) {
        if (link.isConnected === false || link.closest?.("[hidden], details:not([open])")) continue;
        observed.add(link);
        observer.observe(link);
      }
    }
    return observed.size;
  }

  documentRoot.addEventListener?.("mypowersetup:analytics-granted", flush);
  documentRoot.addEventListener?.("visibilitychange", flush);
  return { scan, flush };
}
