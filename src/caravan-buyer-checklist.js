import { isRecommendationEligible } from "./recommendation-coverage.js";

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
    const candidate = (recommendations[category] || []).find(isRecommendationEligible);
    // A package takes precedence only where it exists and remains eligible.
    const product = packageProduct
      ? ((recommendations[category] || []).some((item) =>
          item?.product?.id === packageProduct.id && isRecommendationEligible(item))
          ? packageProduct : null)
      : candidate?.product || null;
    return { category, product, ready: Boolean(product) };
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
