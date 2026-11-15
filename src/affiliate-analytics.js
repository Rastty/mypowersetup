import "./calculator-builder-context.js";
import { resolveCalculatorAttribution } from "./calculator-attribution.js";

const CALCULATOR_PLACEMENTS = new Set([
  "battery_calculator", "mppt_calculator", "inverter_calculator",
  "dcdc_calculator", "solar_calculator",
]);

// Mirror only the *effective* static sub-ID sent to the affiliate network.
// Scenario overrides, merchant-owned labels, unknown labels and any dynamic
// identifiers must never leak through to GA4 as a placement dimension.
export function readNetworkAffiliatePlacement(link) {
  let url;
  try { url = new URL(link?.href); } catch { return null; }
  if (url.protocol !== "https:") return null;

  const ehub = ["ehub.cz", "www.ehub.cz", "ehub.sk", "www.ehub.sk"].includes(url.hostname)
    && url.pathname === "/system/scripts/click.php"
    && url.searchParams.getAll("a_aid").length === 1
    && url.searchParams.getAll("a_bid").length === 1
    && Boolean(url.searchParams.get("a_aid") && url.searchParams.get("a_bid"));
  const awin = ["awin1.com", "www.awin1.com"].includes(url.hostname)
    && Boolean(url.searchParams.get("awinmid") && url.searchParams.get("awinaffid"));
  const marketCategory = ehub ? url.searchParams.getAll("data1") : awin ? url.searchParams.getAll("clickref") : [];
  if (marketCategory.length !== 1 || !/^mps_[a-z]{2}_[a-z0-9_]+$/.test(marketCategory[0])) return null;
  const refs = ehub ? url.searchParams.getAll("data2") : awin ? url.searchParams.getAll("clickref4") : [];
  if (refs.length !== 1 || !refs[0].startsWith("placement_")) return null;
  const placement = refs[0].slice("placement_".length);
  return CALCULATOR_PLACEMENTS.has(placement) ? placement : null;
}

function currentCalculatorAttribution() {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  // Accessing sessionStorage can throw in privacy-restricted browsers. Never
  // break an outbound purchase click because analytics storage is unavailable.
  try {
    const market = document.documentElement?.lang || null;
    return resolveCalculatorAttribution({ storage: window.sessionStorage, market });
  } catch { return null; }
}

// The same validated 30-minute, same-market calculator context must reach both
// in-Builder products and verified editorial guide offers. No new storage,
// fingerprinting or tracking event is introduced by this function.
export function buildAttributedAffiliateParameters(link) {
  return { ...buildAffiliateClickParameters(link), ...(currentCalculatorAttribution() || {}) };
}

export function buildAffiliateClickParameters(link) {
  const category = link?.dataset?.category || "unknown";
  const affiliatePlacement = readNetworkAffiliatePlacement(link);
  return {
    productId: link?.dataset?.productId || "unknown",
    merchant: link?.dataset?.merchant || "unknown",
    category,
    purchaseRoute: category === "power_station" ? "portable" : category === "unknown" ? "unknown" : "components",
    source: link?.dataset?.source || "unknown",
    packageId: link?.dataset?.packageId || undefined,
    recommendationRole: link?.dataset?.recommendationRole || undefined,
    ...(link?.dataset?.routePriority ? { routePriority: link.dataset.routePriority } : {}),
    ...(link?.dataset?.ctaVariant ? { ctaVariant: link.dataset.ctaVariant } : {}),
    ...(affiliatePlacement ? { affiliatePlacement } : {}),
  };
}

export function trackAffiliateClick(link, tracker) {
  if (typeof tracker !== "function") return false;
  return tracker("affiliate_click", buildAttributedAffiliateParameters(link));
}

export function buildAffiliateImpressionParameters(links) {
  const counts = {
    productCount: 0,
    componentCount: 0,
    portableCount: 0,
    recommendedCount: 0,
    budgetCount: 0,
    reserveCount: 0,
    alternativeCount: 0,
    unknownRoleCount: 0,
  };
  for (const link of links || []) {
    const category = link?.dataset?.category || "unknown";
    const role = link?.dataset?.recommendationRole || "unknown";
    counts.productCount += 1;
    if (category === "power_station") counts.portableCount += 1;
    else if (category !== "unknown") counts.componentCount += 1;
    const key = `${role}Count`;
    if (Object.hasOwn(counts, key)) counts[key] += 1;
    else counts.unknownRoleCount += 1;
  }
  return counts;
}

export function trackAffiliateImpressions(links, tracker) {
  if (typeof tracker !== "function") return false;
  const candidates = [...(links || [])].filter((link) => link?.dataset?.affiliateImpressionTracked !== "true");
  if ((links?.length || 0) > 0 && candidates.length === 0) return true;
  const attribution = currentCalculatorAttribution() || {};
  const choiceResults = candidates.map((link) => tracker("product_choice_impression", {
    ...buildAffiliateClickParameters(link),
    ...attribution,
  }));
  const summaryTracked = tracker("product_choices_rendered", {
    ...buildAffiliateImpressionParameters(candidates),
    ...attribution,
  });
  const tracked = summaryTracked && choiceResults.every(Boolean);
  if (tracked) {
    for (const link of candidates) link.dataset.affiliateImpressionTracked = "true";
  }
  return tracked;
}

export function trackVisibleAffiliateImpressions(root, tracker) {
  const links = [...(root?.querySelectorAll?.("[data-affiliate-click], [data-affiliate-product]") || [])]
    .filter((link) => !link.closest?.("[hidden], details:not([open])"));
  if (!links.length) return false;
  return trackAffiliateImpressions(links, tracker);
}

// Builder renders recommendations before its result step becomes visible.
// An impression must represent >=50% real viewport visibility, not DOM insertion.
export function bindAffiliateImpressionTracking(root, tracker, {
  Observer = globalThis.IntersectionObserver,
  documentRoot = root?.ownerDocument || root,
} = {}) {
  if (!root || typeof Observer !== "function") {
    // Fail closed on older clients rather than inventing observed impressions.
    return () => false;
  }

  const observed = new Set();
  const visible = new Set();
  const isExposed = (link) => link?.isConnected !== false
    && (!root.contains || root.contains(link))
    && !link.closest?.("[hidden], details:not([open])");

  const flush = () => {
    if (documentRoot?.hidden) return false;
    const candidates = [...visible].filter((link) => observed.has(link) && isExposed(link));
    return candidates.length ? trackAffiliateImpressions(candidates, tracker) : false;
  };

  const observer = new Observer((entries) => {
    for (const entry of entries) {
      if (!observed.has(entry.target)) continue;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    flush();
  }, { threshold: [0, 0.5, 1] });

  const scan = () => {
    const present = new Set(root.querySelectorAll?.("[data-affiliate-click], [data-affiliate-product]") || []);
    for (const link of observed) {
      if (present.has(link)) continue;
      observer.unobserve(link);
      observed.delete(link);
      visible.delete(link);
    }
    for (const link of present) {
      if (observed.has(link)) continue;
      observed.add(link);
      observer.observe(link);
    }
    return flush();
  };

  // Details expansions may expose previously hidden links; IO reports their
  // intersection and scan also registers dynamic links on each expansion.
  root.addEventListener?.("toggle", (event) => {
    if (event.target?.open) scan();
  }, true);
  // Consent and tab visibility can change without any new scroll event.
  documentRoot?.addEventListener?.("mypowersetup:analytics-granted", flush);
  documentRoot?.addEventListener?.("visibilitychange", flush);
  return scan;
}
