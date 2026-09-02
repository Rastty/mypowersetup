export function buildAffiliateClickParameters(link) {
  const category = link?.dataset?.category || "unknown";
  return {
    productId: link?.dataset?.productId || "unknown",
    merchant: link?.dataset?.merchant || "unknown",
    category,
    purchaseRoute: category === "power_station" ? "portable" : category === "unknown" ? "unknown" : "components",
    source: link?.dataset?.source || "unknown",
    packageId: link?.dataset?.packageId || undefined,
    recommendationRole: link?.dataset?.recommendationRole || undefined,
  };
}

export function trackAffiliateClick(link, tracker) {
  if (typeof tracker !== "function") return false;
  return tracker("affiliate_click", buildAffiliateClickParameters(link));
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
  const choiceResults = candidates.map((link) => tracker("product_choice_impression", buildAffiliateClickParameters(link)));
  const summaryTracked = tracker("product_choices_rendered", buildAffiliateImpressionParameters(candidates));
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

export function bindAffiliateImpressionTracking(root, tracker) {
  const documentRoot = root?.ownerDocument || root;
  const scan = () => trackVisibleAffiliateImpressions(root, tracker);
  root?.addEventListener?.("toggle", (event) => {
    if (event.target?.open) trackVisibleAffiliateImpressions(event.target, tracker);
  }, true);
  documentRoot?.addEventListener?.("mypowersetup:analytics-granted", scan);
  return scan;
}
