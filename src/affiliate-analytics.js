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
