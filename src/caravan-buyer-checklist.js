import { isRecommendationEligible } from "./recommendation-coverage.js";
import { selectRecommendedCategoryCandidate } from "./packages.js?v=20261121-partial-buyer1";
import { caravanComponentRequirement } from "./caravan-component-requirements.js?v=20261121-1";

// A technically compatible model is not a purchase-ready SKU without its
// actual approved product click URL. Keep the technical result, but mark the
// buying-plan category missing rather than render a dead checkout action.
function hasBuyableProductLink(product) {
  if (!product?.id || !product?.merchant || typeof product.affiliateUrl !== "string") return false;
  try {
    const uri = new URL(product.affiliateUrl);
    return uri.protocol === "https:" && Boolean(uri.hostname) && uri.pathname !== "/";
  } catch {
    return false;
  }
}

// The real buyer checklist is based only on existing technically vetted and
// currently eligible recommendations. It never invents a missing product.
export function buildCaravanBuyerChecklist({ coverage, packages = [], recommendations = {}, setup = null, locale = setup?.locale || "cs" } = {}) {
  if (!coverage || !Array.isArray(coverage.required)) return null;
  const recommended = packages.find((variant) => variant?.id === "recommended");
  const packageByCategory = new Map((recommended?.items || [])
    .filter(({ category, product }) => category && product)
    .map(({ category, product }) => [category, product]));
  const rows = coverage.required.map((category) => {
    const packageProduct = packageByCategory.get(category);
    const availableOffers = (recommendations[category] || []).filter((item) =>
      isRecommendationEligible(item) && hasBuyableProductLink(item.product));
    // Reuse the canonical best-value choice but only among actual purchasable
    // links; an unlinked technical recommendation must not block a valid SKU.
    const packageMatch = availableOffers.find((item) =>
      item.product.id === packageProduct?.id);
    const candidate = packageMatch || selectRecommendedCategoryCandidate(
      { [category]: availableOffers }, category);
    const product = candidate?.product || null;
    const quantity = product && Number.isSafeInteger(product.recommendedQuantity) && product.recommendedQuantity > 0
      ? product.recommendedQuantity : 1;
    return { category, product, ready: Boolean(product), quantity, requirement: caravanComponentRequirement(setup, category, locale) };
  });
  const available = rows.filter((row) => row.ready).length;
  const manualDesign = Boolean(coverage.manualDesignCharging?.length);
  const complete = rows.length > 0 && available === rows.length && !manualDesign;
  return {
    rows,
    readyCount: available,
    requiredCount: rows.length,
    complete,
    manualDesign,
    status: complete ? "complete" : available ? "partial" : "unavailable",
  };
}
