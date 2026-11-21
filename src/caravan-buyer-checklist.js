import { isRecommendationEligible } from "./recommendation-coverage.js";
import { selectRecommendedCategoryCandidate } from "./packages.js?v=20261121-partial-buyer1";

// The real buyer checklist is based only on existing technically vetted and
// currently eligible recommendations. It never invents a missing product.
export function buildCaravanBuyerChecklist({ coverage, packages = [], recommendations = {} } = {}) {
  if (!coverage || !Array.isArray(coverage.required)) return null;
  const recommended = packages.find((variant) => variant?.id === "recommended");
  const packageByCategory = new Map((recommended?.items || [])
    .filter(({ category, product }) => category && product)
    .map(({ category, product }) => [category, product]));
  const rows = coverage.required.map((category) => {
    const packageProduct = packageByCategory.get(category);
    // Match the canonical recommended package selection even if one required
    // category has no eligible SKU and full-package generation returns [].
    // Existing vetted package choice wins only if it is still eligible;
    // otherwise recalculate a safe category-specific fallback.
    const candidate = selectRecommendedCategoryCandidate(recommendations, category);
    const packageStillEligible = packageProduct && (recommendations[category] || []).some((item) =>
      item?.product?.id === packageProduct.id && isRecommendationEligible(item));
    const product = packageStillEligible ? packageProduct : candidate?.product || null;
    const quantity = product && Number.isSafeInteger(product.recommendedQuantity) && product.recommendedQuantity > 0
      ? product.recommendedQuantity : 1;
    return { category, product, ready: Boolean(product), quantity };
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
